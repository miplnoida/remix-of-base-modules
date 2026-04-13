import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LIFECYCLE_STATUSES = new Set([
  'OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED', 'CANCELLED',
]);

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
    const idempotencyKey = dry_run ? `ESCALATION-DRY-${Date.now()}` : `ESCALATION-${today}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!dry_run) {
      await supabase.from('ce_automation_job_runs').delete()
        .eq('idempotency_key', idempotencyKey).in('run_status', ['RUNNING', 'FAILED']);
    }

    if (!dry_run && !force) {
      const { data: existing } = await supabase.from('ce_automation_job_runs')
        .select('id').eq('idempotency_key', idempotencyKey).eq('run_status', 'COMPLETED').maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ already_completed: true, run_id: existing.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: jobRecord } = await supabase.from('ce_automation_jobs')
      .select('id').eq('job_code', 'JOB-ESCALATION-ENGINE').single();
    const jobId = jobRecord?.id;

    const startedAt = new Date().toISOString();
    const { data: runRecord } = await supabase.from('ce_automation_job_runs')
      .insert({ job_id: jobId, run_status: 'RUNNING', is_dry_run: dry_run, idempotency_key: idempotencyKey, triggered_by, started_at: startedAt } as any)
      .select('id').single();
    const runId = runRecord?.id;

    // Load rules — only process auto_escalate rules with lifecycle targets
    const { data: allRules } = await supabase.from('ce_escalation_rules')
      .select('id, rule_code, name, from_status, to_status, days_threshold, auto_escalate')
      .eq('is_enabled', true);

    // Filter to actionable rules: auto_escalate AND lifecycle target
    const actionableRules = (allRules || []).filter(r =>
      r.auto_escalate && LIFECYCLE_STATUSES.has(r.to_status)
    );

    // Load violations
    const { data: violations } = await supabase.from('ce_violations')
      .select('id, violation_number, employer_id, employer_name, status, created_at')
      .in('status', ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW'])
      .eq('is_deleted', false);

    const now = Date.now();
    const results = {
      violations_scanned: violations?.length || 0,
      rules_total: allRules?.length || 0,
      rules_actionable: actionableRules.length,
      escalations_executed: 0,
      escalations_skipped: 0,
      by_rule: {} as Record<string, { matched: number; executed: number }>,
      sample_escalations: [] as any[],
      dry_run,
    };

    for (const rule of actionableRules) {
      results.by_rule[rule.rule_code] = { matched: 0, executed: 0 };
    }

    // Batch collections for live runs
    const violationUpdates: { id: string; payload: Record<string, unknown> }[] = [];
    const historyInserts: any[] = [];

    for (const v of (violations || [])) {
      const ageDays = Math.floor((now - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24));

      for (const rule of actionableRules) {
        if (v.status !== rule.from_status) continue;
        if (rule.days_threshold && ageDays < rule.days_threshold) continue;
        if (!isTransitionAllowed(v.status, rule.to_status)) {
          results.escalations_skipped++;
          continue;
        }

        results.by_rule[rule.rule_code].matched++;
        results.by_rule[rule.rule_code].executed++;
        results.escalations_executed++;

        const transitionTime = new Date().toISOString();
        const payload: Record<string, unknown> = {
          status: rule.to_status,
          updated_by: `AUTO:${triggered_by}`,
        };
        if (rule.to_status === 'ESCALATED') {
          payload.escalated_at = transitionTime;
          payload.escalated_to = `AUTO:RULE:${rule.rule_code}`;
        }

        violationUpdates.push({ id: v.id, payload });
        historyInserts.push({
          violation_id: v.id,
          action: `Auto-Escalated by ${rule.rule_code}`,
          from_value: v.status,
          to_value: rule.to_status,
          notes: `Rule: ${rule.name}. Aged ${ageDays}d (threshold: ${rule.days_threshold}d).`,
          performed_by: `AUTO:${triggered_by}`,
          performed_at: transitionTime,
        });

        if (results.sample_escalations.length < 10) {
          results.sample_escalations.push({
            violation: v.violation_number, employer: v.employer_name,
            rule: rule.rule_code, from: v.status, to: rule.to_status, age_days: ageDays,
          });
        }
        break; // One rule per violation
      }
    }

    // ── Execute batched writes ──
    if (!dry_run && violationUpdates.length > 0) {
      // Update violations in batches of 50
      for (let i = 0; i < violationUpdates.length; i += 50) {
        const batch = violationUpdates.slice(i, i + 50);
        await Promise.all(batch.map(u =>
          supabase.from('ce_violations').update(u.payload).eq('id', u.id)
        ));
      }

      // Insert history in batches of 200
      for (let i = 0; i < historyInserts.length; i += 200) {
        await supabase.from('ce_violation_history').insert(historyInserts.slice(i, i + 200) as any);
      }
    }

    // ── Finalize ──
    const completedAt = new Date().toISOString();
    if (runId) {
      await supabase.from('ce_automation_job_runs').update({
        run_status: 'COMPLETED', completed_at: completedAt,
        records_processed: results.violations_scanned,
        records_affected: results.escalations_executed,
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        execution_log: { scan_details: results },
      } as any).eq('id', runId);
    }
    if (jobId) {
      await supabase.from('ce_automation_jobs').update({
        last_run_at: completedAt, last_run_status: 'COMPLETED',
      } as any).eq('id', jobId);
    }

    return new Response(JSON.stringify({ run_id: runId, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
