import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * EMP-FLAG-GEN
 * Generates compliance flags from employer profiles and compliance status.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { dry_run = false, force = false, triggered_by = 'system' } = await req.json();
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = dry_run ? `FLAG-GEN-DRY-${Date.now()}` : `FLAG-GEN-${today}`;

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

    const { data: jobRecord } = await supabase.from('ce_automation_jobs').select('id').eq('job_code', 'EMP-FLAG-GEN').single();
    const jobId = jobRecord?.id;
    const startedAt = new Date().toISOString();
    const { data: runRecord } = await supabase.from('ce_automation_job_runs')
      .insert({ job_id: jobId, run_status: 'RUNNING', is_dry_run: dry_run, idempotency_key: idempotencyKey, triggered_by, started_at: startedAt } as any)
      .select('id').single();
    const runId = runRecord?.id;

    // Fetch compliance statuses
    const { data: statuses } = await supabase.from('ce_employer_compliance_status')
      .select('employer_id, filing_status, payment_status, overall_compliance_status, current_arrears_amount, active_violation_count');

    let processed = 0;
    let flagsCreated = 0;
    const errors: string[] = [];

    const FLAG_RULES = [
      { code: 'NON_FILER', label: 'Non-Filer', category: 'FILING', severity: 'HIGH', check: (s: any) => s.filing_status === 'NON_COMPLIANT' },
      { code: 'NON_PAYER', label: 'Non-Payer', category: 'PAYMENT', severity: 'HIGH', check: (s: any) => s.payment_status === 'NON_COMPLIANT' },
      { code: 'HIGH_ARREARS', label: 'High Arrears (>$10K)', category: 'FINANCIAL', severity: 'CRITICAL', check: (s: any) => (s.current_arrears_amount || 0) > 10000 },
      { code: 'MULTI_VIOLATION', label: 'Multiple Active Violations', category: 'ENFORCEMENT', severity: 'MEDIUM', check: (s: any) => (s.active_violation_count || 0) >= 3 },
    ];

    for (const status of (statuses || [])) {
      try {
        for (const rule of FLAG_RULES) {
          const shouldFlag = rule.check(status);

          // Check existing active flag
          const { data: existingFlag } = await supabase.from('ce_employer_compliance_flags')
            .select('id, is_active').eq('employer_id', status.employer_id).eq('flag_code', rule.code).maybeSingle();

          if (shouldFlag && (!existingFlag || !existingFlag.is_active)) {
            if (!dry_run) {
              if (existingFlag) {
                await supabase.from('ce_employer_compliance_flags')
                  .update({ is_active: true, raised_at: new Date().toISOString(), raised_by: triggered_by, resolved_at: null, resolved_by: null } as any)
                  .eq('id', existingFlag.id);
              } else {
                await supabase.from('ce_employer_compliance_flags')
                  .insert({
                    employer_id: status.employer_id, flag_code: rule.code, flag_label: rule.label,
                    flag_category: rule.category, severity: rule.severity, is_active: true,
                    raised_at: new Date().toISOString(), raised_by: triggered_by,
                    source_type: 'AUTOMATION', source_reference: `FLAG-GEN-${today}`,
                  } as any);
              }
              flagsCreated++;
            } else {
              flagsCreated++;
            }
          } else if (!shouldFlag && existingFlag?.is_active) {
            // Auto-resolve
            if (!dry_run) {
              await supabase.from('ce_employer_compliance_flags')
                .update({ is_active: false, resolved_at: new Date().toISOString(), resolved_by: 'SYSTEM-AUTO', resolution_notes: 'Auto-resolved by flag generation' } as any)
                .eq('id', existingFlag.id);
            }
          }
        }
        processed++;
      } catch (e) {
        errors.push(`${status.employer_id}: ${e.message}`);
      }
    }

    const completedAt = new Date().toISOString();
    const summary = { total_employers: processed, flags_created: flagsCreated, errors_count: errors.length, dry_run };
    if (runId) {
      await supabase.from('ce_automation_job_runs')
        .update({ run_status: 'COMPLETED', completed_at: completedAt, duration_ms: Date.now() - new Date(startedAt).getTime(), records_processed: processed, records_affected: flagsCreated, errors_count: errors.length, summary } as any)
        .eq('id', runId);
    }
    if (!dry_run && jobId) {
      await supabase.from('ce_automation_jobs').update({ last_run_at: completedAt, last_run_status: 'COMPLETED' } as any).eq('id', jobId);
    }

    return new Response(JSON.stringify({
      ok: true, run_id: runId, dry_run, total_employers_scanned: processed, flags_created: flagsCreated, errors_count: errors.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
