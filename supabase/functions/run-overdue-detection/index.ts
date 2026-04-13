import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { dry_run = false, force = false, triggered_by = 'system' } = await req.json();
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = dry_run
      ? `OVERDUE-DRY-${Date.now()}`
      : `OVERDUE-${today}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Auto-heal stale runs ──
    if (!dry_run) {
      await supabase
        .from('ce_automation_job_runs')
        .delete()
        .eq('idempotency_key', idempotencyKey)
        .in('run_status', ['RUNNING', 'FAILED']);
    }

    // ── Idempotency check ──
    if (!dry_run && !force) {
      const { data: existing } = await supabase
        .from('ce_automation_job_runs')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .eq('run_status', 'COMPLETED')
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({
          already_completed: true,
          run_id: existing.id,
          message: `Overdue detection already completed for ${today}`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ── Get job record ──
    const { data: jobRecord } = await supabase
      .from('ce_automation_jobs')
      .select('id, parameters')
      .eq('job_code', 'JOB-OVERDUE-DETECTION')
      .single();

    const jobId = jobRecord?.id;
    const params = jobRecord?.parameters || {};
    const severeThresholdDays = params.severe_threshold_days || 90;

    // ── Create run record ──
    const startedAt = new Date().toISOString();
    const { data: runRecord } = await supabase
      .from('ce_automation_job_runs')
      .insert({
        job_id: jobId,
        run_status: 'RUNNING',
        is_dry_run: dry_run,
        idempotency_key: idempotencyKey,
        triggered_by,
        started_at: startedAt,
      } as any)
      .select('id')
      .single();

    const runId = runRecord?.id;
    const nowMs = Date.now();

    const results = {
      // Violations
      violations_scanned: 0,
      violations_overdue: 0,
      violations_severely_overdue: 0,
      // Follow-up actions
      followups_scanned: 0,
      followups_flagged_overdue: 0,
      // Management reviews created
      management_reviews_created: 0,
      sample_overdue: [] as any[],
      dry_run,
    };

    // ═══════════════════════════════════════════════════════
    // PART 1: Violation Overdue Detection
    // ═══════════════════════════════════════════════════════
    const { data: violations } = await supabase
      .from('ce_violations')
      .select('id, violation_number, employer_id, employer_name, status, created_at, due_date')
      .in('status', ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED'])
      .eq('is_deleted', false);

    results.violations_scanned = violations?.length || 0;

    for (const v of (violations || [])) {
      const hasDueDate = v.due_date && new Date(v.due_date) < new Date(today);
      const ageMs = nowMs - new Date(v.created_at).getTime();
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      const isSevere = ageDays > severeThresholdDays;

      if (!hasDueDate && !isSevere) continue;

      if (hasDueDate) results.violations_overdue++;
      if (isSevere) {
        results.violations_severely_overdue++;

        // Create management review follow-up for severely overdue
        if (!dry_run) {
          const { data: existingReview } = await supabase
            .from('ce_follow_up_actions')
            .select('id')
            .eq('violation_id', v.id)
            .eq('action_type', 'REVIEW')
            .eq('source', 'OVERDUE-SEVERE')
            .in('status', ['PLANNED', 'SCHEDULED', 'IN_PROGRESS'])
            .maybeSingle();

          if (!existingReview) {
            await supabase.from('ce_follow_up_actions').insert({
              violation_id: v.id,
              employer_id: v.employer_id,
              employer_name: v.employer_name,
              action_type: 'REVIEW',
              description: `SEVERE OVERDUE: Violation ${v.violation_number} has been open for ${ageDays} days (>${severeThresholdDays} day threshold). Requires management intervention.`,
              priority: 'CRITICAL',
              status: 'PLANNED',
              source: 'OVERDUE-SEVERE',
              due_date: new Date(nowMs + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              created_by: `AUTO:${triggered_by}`,
            } as any);

            results.management_reviews_created++;
          }
        }
      }

      if (results.sample_overdue.length < 10) {
        results.sample_overdue.push({
          violation: v.violation_number,
          employer: v.employer_name,
          status: v.status,
          age_days: ageDays,
          due_date: v.due_date,
          is_severe: isSevere,
        });
      }
    }

    // ═══════════════════════════════════════════════════════
    // PART 2: Follow-Up Action Overdue Auto-Flagging
    // ═══════════════════════════════════════════════════════
    const { data: overdueFollowups } = await supabase
      .from('ce_follow_up_actions')
      .select('id, violation_id, action_type, description, due_date, status, assigned_to_name')
      .in('status', ['PLANNED', 'SCHEDULED', 'IN_PROGRESS'])
      .lt('due_date', today)
      .eq('is_deleted', false);

    results.followups_scanned = overdueFollowups?.length || 0;

    for (const fu of (overdueFollowups || [])) {
      if (!dry_run) {
        // Update status to OVERDUE
        await supabase
          .from('ce_follow_up_actions')
          .update({
            status: 'OVERDUE',
            updated_by: `AUTO:${triggered_by}`,
          })
          .eq('id', fu.id);

        // Write audit history
        await supabase
          .from('ce_follow_up_action_history')
          .insert({
            follow_up_action_id: fu.id,
            action: 'Status changed to OVERDUE',
            from_value: fu.status,
            to_value: 'OVERDUE',
            notes: `Auto-flagged: due date ${fu.due_date} has passed.`,
            performed_by: `AUTO:${triggered_by}`,
            performed_at: new Date().toISOString(),
          } as any);
      }

      results.followups_flagged_overdue++;
    }

    // ── Finalize run ──
    const completedAt = new Date().toISOString();
    if (runId) {
      await supabase
        .from('ce_automation_job_runs')
        .update({
          run_status: 'COMPLETED',
          completed_at: completedAt,
          records_processed: results.violations_scanned + results.followups_scanned,
          records_affected: results.violations_overdue + results.followups_flagged_overdue + results.management_reviews_created,
          duration_ms: Date.now() - new Date(startedAt).getTime(),
          execution_log: { scan_details: results },
        } as any)
        .eq('id', runId);
    }

    if (jobId) {
      await supabase
        .from('ce_automation_jobs')
        .update({
          last_run_at: completedAt,
          last_run_status: 'COMPLETED',
        } as any)
        .eq('id', jobId);
    }

    return new Response(JSON.stringify({
      run_id: runId,
      ...results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
