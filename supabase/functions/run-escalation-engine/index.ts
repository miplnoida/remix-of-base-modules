import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Statuses that are valid lifecycle targets for direct violation mutation
const LIFECYCLE_STATUSES = new Set([
  'OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED', 'CANCELLED',
]);

// Transition matrix — must match client-side violationLifecycleService
const TRANSITION_MATRIX: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
  IN_PROGRESS: ['UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
  UNDER_REVIEW: ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
  ESCALATED: ['UNDER_REVIEW', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'OPEN'],
  CLOSED: ['OPEN'],
  CANCELLED: ['OPEN'],
};

function isTransitionAllowed(from: string, to: string): boolean {
  return (TRANSITION_MATRIX[from] || []).includes(to);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { dry_run = false, force = false, triggered_by = 'system' } = await req.json();
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = dry_run
      ? `ESCALATION-DRY-${Date.now()}`
      : `ESCALATION-${today}`;

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
          message: `Escalation engine already completed for ${today}`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ── Get job record ──
    const { data: jobRecord } = await supabase
      .from('ce_automation_jobs')
      .select('id, parameters')
      .eq('job_code', 'JOB-ESCALATION-ENGINE')
      .single();

    const jobId = jobRecord?.id;

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

    // ── Load enabled escalation rules ──
    const { data: rules } = await supabase
      .from('ce_escalation_rules')
      .select('id, rule_code, name, from_status, to_status, days_threshold, amount_threshold, auto_escalate, condition_expression')
      .eq('is_enabled', true);

    // ── Load violations in escalation-eligible statuses ──
    const { data: violations } = await supabase
      .from('ce_violations')
      .select('id, violation_number, employer_id, employer_name, status, created_at, due_date')
      .in('status', ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW'])
      .eq('is_deleted', false);

    const now = Date.now();
    const results = {
      violations_scanned: violations?.length || 0,
      rules_evaluated: rules?.length || 0,
      escalations_executed: 0,
      escalations_skipped_not_auto: 0,
      escalations_skipped_invalid_transition: 0,
      followups_created: 0,
      by_rule: {} as Record<string, { matched: number; executed: number; skipped: number }>,
      sample_escalations: [] as any[],
      dry_run,
    };

    for (const rule of (rules || [])) {
      results.by_rule[rule.rule_code] = { matched: 0, executed: 0, skipped: 0 };
    }

    for (const v of (violations || [])) {
      const ageMs = now - new Date(v.created_at).getTime();
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

      for (const rule of (rules || [])) {
        // Match: violation status must equal rule's from_status
        if (v.status !== rule.from_status) continue;

        // Check days threshold
        if (rule.days_threshold && ageDays < rule.days_threshold) continue;

        results.by_rule[rule.rule_code].matched++;

        const targetStatus = rule.to_status;
        const isLifecycleTarget = LIFECYCLE_STATUSES.has(targetStatus);
        const canTransition = isLifecycleTarget && isTransitionAllowed(v.status, targetStatus);

        if (isLifecycleTarget && canTransition && rule.auto_escalate) {
          // ── Direct lifecycle transition ──
          if (!dry_run) {
            const transitionTime = new Date().toISOString();

            // Update violation status
            const updatePayload: Record<string, unknown> = {
              status: targetStatus,
              updated_by: `AUTO:${triggered_by}`,
            };
            if (targetStatus === 'ESCALATED') {
              updatePayload.escalated_at = transitionTime;
              updatePayload.escalated_to = `AUTO:RULE:${rule.rule_code}`;
            }

            await supabase
              .from('ce_violations')
              .update(updatePayload)
              .eq('id', v.id);

            // Write audit history
            await supabase
              .from('ce_violation_history')
              .insert({
                violation_id: v.id,
                action: `Auto-Escalated by ${rule.rule_code}`,
                from_value: v.status,
                to_value: targetStatus,
                notes: `Rule: ${rule.name}. Violation aged ${ageDays} days (threshold: ${rule.days_threshold}).`,
                performed_by: `AUTO:${triggered_by}`,
                performed_at: transitionTime,
              } as any);
          }

          results.escalations_executed++;
          results.by_rule[rule.rule_code].executed++;

          if (results.sample_escalations.length < 10) {
            results.sample_escalations.push({
              violation: v.violation_number,
              employer: v.employer_name,
              rule: rule.rule_code,
              from: v.status,
              to: targetStatus,
              age_days: ageDays,
            });
          }

          // Break after first matching rule per violation to avoid double-transition
          break;
        } else if (!isLifecycleTarget || !canTransition) {
          // ── Non-lifecycle target or invalid transition → create follow-up action ──
          if (!dry_run && rule.auto_escalate) {
            // Check for existing active follow-up of same type
            const { data: existingFu } = await supabase
              .from('ce_follow_up_actions')
              .select('id')
              .eq('violation_id', v.id)
              .eq('action_type', 'REVIEW')
              .eq('source', `RULE:${rule.rule_code}`)
              .in('status', ['PLANNED', 'SCHEDULED', 'IN_PROGRESS'])
              .maybeSingle();

            if (!existingFu) {
              await supabase.from('ce_follow_up_actions').insert({
                violation_id: v.id,
                employer_id: v.employer_id,
                employer_name: v.employer_name,
                action_type: 'REVIEW',
                description: `Escalation rule ${rule.rule_code}: ${rule.name}. Target: ${targetStatus}. Age: ${ageDays} days.`,
                priority: 'HIGH',
                status: 'PLANNED',
                source: `RULE:${rule.rule_code}`,
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                created_by: `AUTO:${triggered_by}`,
              } as any);

              results.followups_created++;
            }
          }

          if (!rule.auto_escalate) {
            results.escalations_skipped_not_auto++;
          } else {
            results.escalations_skipped_invalid_transition++;
          }
          results.by_rule[rule.rule_code].skipped++;
        } else {
          results.escalations_skipped_not_auto++;
          results.by_rule[rule.rule_code].skipped++;
        }
      }
    }

    // ── Finalize run ──
    const completedAt = new Date().toISOString();
    if (runId) {
      await supabase
        .from('ce_automation_job_runs')
        .update({
          run_status: 'COMPLETED',
          completed_at: completedAt,
          records_processed: results.violations_scanned,
          records_affected: results.escalations_executed,
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
