import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * JOB-ESCALATION-REVIEW
 * Automated escalation stage progression for violations that exceed rule thresholds.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { dry_run = false, force = false, triggered_by = 'system' } = await req.json();
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = dry_run ? `ESCALATION-REVIEW-DRY-${Date.now()}` : `ESCALATION-REVIEW-${today}`;

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
      if (existing) return new Response(JSON.stringify({ already_completed: true, run_id: existing.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: jobRecord } = await supabase.from('ce_automation_jobs').select('id').eq('job_code', 'JOB-ESCALATION-REVIEW').single();
    const jobId = jobRecord?.id;
    const startedAt = new Date().toISOString();
    const { data: runRecord } = await supabase.from('ce_automation_job_runs')
      .insert({ job_id: jobId, run_status: 'RUNNING', is_dry_run: dry_run, idempotency_key: idempotencyKey, triggered_by, started_at: startedAt } as any)
      .select('id').single();
    const runId = runRecord?.id;

    // Load escalation rules
    const { data: rules } = await supabase.from('ce_escalation_rules')
      .select('id, rule_code, name, from_status, to_status, days_threshold, auto_escalate, parameters')
      .eq('is_enabled', true)
      .eq('auto_escalate', true);

    // Load active violations
    const { data: violations } = await supabase.from('ce_violations')
      .select('id, violation_number, employer_id, employer_name, status, severity, created_at, financial_impact')
      .eq('is_deleted', false)
      .in('status', ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED']);

    let processed = 0;
    let escalated = 0;
    let legalCreated = 0;
    const errors: string[] = [];

    for (const violation of (violations || [])) {
      try {
        const ageMs = Date.now() - new Date(violation.created_at).getTime();
        const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

        // Find applicable rules
        for (const rule of (rules || [])) {
          if (rule.from_status !== violation.status) continue;
          if (ageDays < (rule.days_threshold || 0)) continue;

          // Check if already escalated to this level
          const { data: existingHistory } = await supabase.from('ce_violation_history')
            .select('id')
            .eq('violation_id', violation.id)
            .eq('new_status', rule.to_status)
            .maybeSingle();
          if (existingHistory) continue;

          if (!dry_run) {
            // Update violation status
            await supabase.from('ce_violations')
              .update({ status: rule.to_status, updated_at: new Date().toISOString(), updated_by: 'SYSTEM-ESCALATION' } as any)
              .eq('id', violation.id);

            // Add history
            await supabase.from('ce_violation_history').insert({
              violation_id: violation.id,
              action: 'STATUS_CHANGE',
              old_status: violation.status,
              new_status: rule.to_status,
              notes: `Auto-escalated by rule ${rule.rule_code}: ${rule.name} (age: ${ageDays} days, threshold: ${rule.days_threshold} days)`,
              performed_by: 'SYSTEM-ESCALATION',
            } as any);

            // Create legal escalation if transitioning to ESCALATED
            if (rule.to_status === 'ESCALATED') {
              await supabase.from('ce_legal_escalations').insert({
                violation_id: violation.id,
                employer_id: violation.employer_id,
                employer_name: violation.employer_name,
                escalation_type: 'AUTOMATED',
                escalation_reason: `Violation ${violation.violation_number} exceeded ${rule.days_threshold}-day threshold`,
                status: 'PENDING_REVIEW',
                priority: violation.severity || 'HIGH',
                amount_at_stake: violation.financial_impact || 0,
                escalated_by: 'SYSTEM-ESCALATION',
                escalated_at: new Date().toISOString(),
              } as any);
              legalCreated++;
            }
          }
          escalated++;
          break; // Only apply first matching rule per violation
        }
        processed++;
      } catch (e) {
        errors.push(`${violation.violation_number}: ${e.message}`);
      }
    }

    const completedAt = new Date().toISOString();
    const summary = { violations_reviewed: processed, escalations: escalated, legal_cases_created: legalCreated, errors_count: errors.length, dry_run };
    if (runId) {
      await supabase.from('ce_automation_job_runs')
        .update({ run_status: 'COMPLETED', completed_at: completedAt, duration_ms: Date.now() - new Date(startedAt).getTime(), records_processed: processed, records_affected: escalated, errors_count: errors.length, summary } as any)
        .eq('id', runId);
    }
    if (!dry_run && jobId) {
      await supabase.from('ce_automation_jobs').update({ last_run_at: completedAt, last_run_status: 'COMPLETED' } as any).eq('id', jobId);
    }

    return new Response(JSON.stringify({
      ok: true, run_id: runId, dry_run, violations_reviewed: processed, escalations: escalated, legal_cases_created: legalCreated,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
