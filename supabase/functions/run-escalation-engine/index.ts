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
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { dry_run = false } = await req.json().catch(() => ({}));
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = `ESCALATION-${today}`;

    console.log(`[Escalation Engine] Starting. dry_run=${dry_run}, key=${idempotencyKey}`);

    // Fetch enabled escalation rules
    const { data: rules, error: rulesErr } = await supabase
      .from("ce_escalation_rules")
      .select("*")
      .eq("is_enabled", true)
      .order("rule_code");
    if (rulesErr) throw rulesErr;
    if (!rules?.length) {
      return new Response(JSON.stringify({ ok: true, message: "No enabled escalation rules", escalated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active violations
    const { data: violations, error: vErr } = await supabase
      .from("ce_violations")
      .select("id, violation_number, employer_id, employer_name, status, total_amount, created_at, due_date, violation_type_id")
      .eq("is_deleted", false)
      .in("status", ["OPEN", "UNDER_REVIEW", "ESCALATED", "WARNING_NOTICE", "DEMAND_NOTICE", "FINAL_DEMAND", "WARNING_ISSUED"])
      .limit(1000);
    if (vErr) throw vErr;

    const now = new Date();
    const escalations: any[] = [];

    for (const violation of violations || []) {
      const ageDays = Math.floor((now.getTime() - new Date(violation.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const totalAmount = Number(violation.total_amount) || 0;

      for (const rule of rules) {
        // Check from_status match
        if (rule.from_status && rule.from_status !== violation.status) continue;

        // Check violation_type_id match if rule is type-specific
        if (rule.violation_type_id && rule.violation_type_id !== violation.violation_type_id) continue;

        // Check days threshold
        if (rule.days_threshold && ageDays < rule.days_threshold) continue;

        // Check amount threshold
        if (rule.amount_threshold && totalAmount < Number(rule.amount_threshold)) continue;

        // Passed all conditions → eligible for escalation
        escalations.push({
          violation_id: violation.id,
          violation_number: violation.violation_number,
          employer_id: violation.employer_id,
          from_status: violation.status,
          to_status: rule.to_status,
          rule_code: rule.rule_code,
          rule_name: rule.name,
          auto_escalate: rule.auto_escalate,
          requires_approval: rule.requires_approval,
          age_days: ageDays,
          total_amount: totalAmount,
        });
        break; // Only apply first matching rule per violation
      }
    }

    if (dry_run) {
      return new Response(JSON.stringify({
        ok: true,
        dry_run: true,
        eligible_count: escalations.length,
        escalations: escalations.slice(0, 50),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Execute escalations
    let executed = 0;
    let pendingApproval = 0;

    for (const esc of escalations) {
      if (esc.auto_escalate && !esc.requires_approval) {
        // Auto-escalate: update violation status
        const { error: updErr } = await supabase
          .from("ce_violations")
          .update({
            status: esc.to_status,
            escalated_at: now.toISOString(),
            escalated_to: "SYSTEM",
            updated_by: "SYS-ESCALATION",
            updated_at: now.toISOString(),
          })
          .eq("id", esc.violation_id);

        if (!updErr) {
          // Record history
          await supabase.from("ce_violation_history").insert({
            violation_id: esc.violation_id,
            field_changed: "status",
            from_value: esc.from_status,
            to_value: esc.to_status,
            performed_by: "SYS-ESCALATION",
            performed_at: now.toISOString(),
            notes: `Auto-escalated by rule ${esc.rule_code}: ${esc.rule_name}. Age: ${esc.age_days} days, Amount: ${esc.total_amount}`,
          });
          executed++;
        }
      } else {
        // Create a follow-up action for manual approval
        await supabase.from("ce_follow_up_actions").insert({
          violation_id: esc.violation_id,
          employer_id: esc.employer_id,
          action_type: "ESCALATION_REVIEW",
          description: `Escalation pending approval: ${esc.rule_name} (${esc.rule_code}). Recommends ${esc.from_status} → ${esc.to_status}. Age: ${esc.age_days} days.`,
          status: "PLANNED",
          priority: "HIGH",
          due_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          created_by: "SYS-ESCALATION",
        });
        pendingApproval++;
      }
    }

    console.log(`[Escalation Engine] Complete. auto_escalated=${executed}, pending_approval=${pendingApproval}`);

    return new Response(JSON.stringify({
      ok: true,
      evaluated: violations?.length || 0,
      eligible: escalations.length,
      auto_escalated: executed,
      pending_approval: pendingApproval,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[Escalation Engine] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
