import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { dry_run = false } = await req.json().catch(() => ({}));
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    console.log(`[Overdue Detection] Starting. dry_run=${dry_run}`);

    // 1. Flag overdue follow-up actions
    const { data: overdueFollowUps, error: fuErr } = await supabase
      .from("ce_follow_up_actions")
      .select("id, violation_id, employer_id, action_type, due_date, status, priority")
      .in("status", ["PLANNED", "IN_PROGRESS"])
      .lt("due_date", today)
      .eq("is_deleted", false)
      .limit(1000);
    if (fuErr) throw fuErr;

    // 2. Flag overdue violations (past due_date, still active)
    const { data: overdueViolations, error: vErr } = await supabase
      .from("ce_violations")
      .select("id, violation_number, employer_id, employer_name, status, due_date, total_amount, created_at")
      .eq("is_deleted", false)
      .in("status", ["OPEN", "UNDER_REVIEW", "ESCALATED"])
      .lt("due_date", today)
      .not("due_date", "is", null)
      .limit(1000);
    if (vErr) throw vErr;

    // 3. Find severely overdue violations (>90 days old, still OPEN)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: severeViolations, error: svErr } = await supabase
      .from("ce_violations")
      .select("id, violation_number, employer_id, status, created_at")
      .eq("is_deleted", false)
      .eq("status", "OPEN")
      .lt("created_at", ninetyDaysAgo)
      .limit(500);
    if (svErr) throw svErr;

    if (dry_run) {
      return new Response(JSON.stringify({
        ok: true,
        dry_run: true,
        overdue_follow_ups: overdueFollowUps?.length || 0,
        overdue_violations: overdueViolations?.length || 0,
        severe_violations_90d: severeViolations?.length || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update follow-up actions: mark overdue
    let followUpsUpdated = 0;
    for (const fa of overdueFollowUps || []) {
      const { error } = await supabase
        .from("ce_follow_up_actions")
        .update({ is_overdue: true, updated_by: "SYS-OVERDUE", updated_at: now.toISOString() })
        .eq("id", fa.id)
        .eq("is_overdue", false);
      if (!error) followUpsUpdated++;
    }

    // Create escalation follow-ups for severely overdue violations
    // (only if no existing ESCALATION_REVIEW follow-up exists)
    let severeEscalationsCreated = 0;
    for (const sv of severeViolations || []) {
      const { data: existing } = await supabase
        .from("ce_follow_up_actions")
        .select("id")
        .eq("violation_id", sv.id)
        .eq("action_type", "ESCALATION_REVIEW")
        .in("status", ["PLANNED", "IN_PROGRESS"])
        .limit(1);

      if (!existing?.length) {
        await supabase.from("ce_follow_up_actions").insert({
          violation_id: sv.id,
          employer_id: sv.employer_id,
          action_type: "ESCALATION_REVIEW",
          description: `Violation ${sv.violation_number} has been OPEN for >90 days. Requires management review for escalation or resolution.`,
          status: "PLANNED",
          priority: "CRITICAL",
          due_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          is_overdue: false,
          created_by: "SYS-OVERDUE",
        });
        severeEscalationsCreated++;
      }
    }

    console.log(`[Overdue Detection] Complete. follow_ups_flagged=${followUpsUpdated}, severe_escalations=${severeEscalationsCreated}`);

    return new Response(JSON.stringify({
      ok: true,
      follow_ups_flagged: followUpsUpdated,
      overdue_violations_found: overdueViolations?.length || 0,
      severe_escalations_created: severeEscalationsCreated,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[Overdue Detection] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
