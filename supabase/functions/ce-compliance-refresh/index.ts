import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * EMP-COMPLIANCE-REFRESH
 * Refreshes ce_employer_compliance_status from source data views.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { dry_run = false, force = false, triggered_by = 'system' } = await req.json();
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = dry_run ? `COMPLIANCE-REFRESH-DRY-${Date.now()}` : `COMPLIANCE-REFRESH-${today}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auto-heal stale runs
    if (!dry_run) {
      await supabase.from('ce_automation_job_runs').delete()
        .eq('idempotency_key', idempotencyKey).in('run_status', ['RUNNING', 'FAILED']);
    }

    // Idempotency
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
      .select('id').eq('job_code', 'EMP-COMPLIANCE-REFRESH').single();
    const jobId = jobRecord?.id;

    const startedAt = new Date().toISOString();
    const { data: runRecord } = await supabase.from('ce_automation_job_runs')
      .insert({ job_id: jobId, run_status: 'RUNNING', is_dry_run: dry_run, idempotency_key: idempotencyKey, triggered_by, started_at: startedAt } as any)
      .select('id').single();
    const runId = runRecord?.id;

    // Fetch source views
    const [filingRes, paymentRes, arrearsRes] = await Promise.all([
      supabase.from('ce_v_employer_filing_status').select('*'),
      supabase.from('ce_v_employer_payment_status').select('*'),
      supabase.from('ce_v_employer_arrears_summary').select('*'),
    ]);

    const filingMap = new Map((filingRes.data || []).map((r: any) => [r.employer_id || r.regno, r]));
    const paymentMap = new Map((paymentRes.data || []).map((r: any) => [r.employer_id || r.regno, r]));
    const arrearsMap = new Map((arrearsRes.data || []).map((r: any) => [r.employer_id || r.regno, r]));

    // Get all active employers
    const { data: employers } = await supabase.from('er_master')
      .select('regno, name, status')
      .not('status', 'eq', 'C');

    let processed = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const emp of (employers || [])) {
      try {
        const filing = filingMap.get(emp.regno) || {};
        const payment = paymentMap.get(emp.regno) || {};
        const arrears = arrearsMap.get(emp.regno) || {};

        const filingStatus = filing.filing_status || 'UNKNOWN';
        const paymentStatus = payment.payment_status || 'UNKNOWN';
        const overallStatus = (filingStatus === 'COMPLIANT' && paymentStatus === 'COMPLIANT')
          ? 'COMPLIANT' : 'NON_COMPLIANT';

        // Count active violations/cases
        const { count: violCount } = await supabase.from('ce_violations')
          .select('id', { count: 'exact', head: true })
          .eq('employer_id', emp.regno).eq('is_deleted', false)
          .in('status', ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED']);

        const statusRow = {
          employer_id: emp.regno,
          filing_status: filingStatus,
          payment_status: paymentStatus,
          overall_compliance_status: overallStatus,
          current_arrears_amount: arrears.total_arrears || 0,
          current_penalty_amount: arrears.total_penalties || 0,
          last_filing_period: filing.last_filed_period || null,
          last_payment_date: payment.last_payment_date || null,
          active_violation_count: violCount || 0,
          last_computed_at: new Date().toISOString(),
          computed_by: triggered_by,
          updated_by: triggered_by,
          updated_at: new Date().toISOString(),
        };

        if (!dry_run) {
          // Upsert
          const { data: existing } = await supabase.from('ce_employer_compliance_status')
            .select('id').eq('employer_id', emp.regno).maybeSingle();
          if (existing) {
            await supabase.from('ce_employer_compliance_status')
              .update(statusRow as any).eq('id', existing.id);
          } else {
            await supabase.from('ce_employer_compliance_status')
              .insert({ ...statusRow, created_by: triggered_by } as any);
          }
          updated++;
        }
        processed++;
      } catch (e) {
        errors.push(`${emp.regno}: ${e.message}`);
      }
    }

    const completedAt = new Date().toISOString();
    const summary = { total_employers: processed, updated, errors_count: errors.length, dry_run, errors: errors.slice(0, 10) };

    if (runId) {
      await supabase.from('ce_automation_job_runs')
        .update({ run_status: 'COMPLETED', completed_at: completedAt, duration_ms: Date.now() - new Date(startedAt).getTime(), records_processed: processed, records_affected: updated, errors_count: errors.length, summary } as any)
        .eq('id', runId);
    }

    if (!dry_run && jobId) {
      await supabase.from('ce_automation_jobs')
        .update({ last_run_at: completedAt, last_run_status: 'COMPLETED' } as any)
        .eq('id', jobId);
    }

    return new Response(JSON.stringify({
      ok: true, run_id: runId, dry_run,
      total_employers_scanned: processed,
      records_updated: updated, errors_count: errors.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
