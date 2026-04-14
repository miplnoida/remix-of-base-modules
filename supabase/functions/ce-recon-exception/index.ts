import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * EMP-RECON-EXCEPTION
 * Detects reconciliation exceptions between source data and compliance ledger.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { dry_run = false, force = false, triggered_by = 'system' } = await req.json();
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = dry_run ? `RECON-EXCEPTION-DRY-${Date.now()}` : `RECON-EXCEPTION-${today}`;

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

    const { data: jobRecord } = await supabase.from('ce_automation_jobs').select('id, parameters').eq('job_code', 'EMP-RECON-EXCEPTION').single();
    const jobId = jobRecord?.id;
    const toleranceAmount = jobRecord?.parameters?.tolerance_amount || 0.01;
    const startedAt = new Date().toISOString();
    const { data: runRecord } = await supabase.from('ce_automation_job_runs')
      .insert({ job_id: jobId, run_status: 'RUNNING', is_dry_run: dry_run, idempotency_key: idempotencyKey, triggered_by, started_at: startedAt } as any)
      .select('id').single();
    const runId = runRecord?.id;

    let processed = 0;
    let exceptionsFound = 0;
    const errors: string[] = [];

    // Check C3 unposted records
    const { data: c3Unposted } = await supabase.from('ce_v_c3_unposted_to_ledger').select('*');
    for (const row of (c3Unposted || [])) {
      const variance = Math.abs((row.source_amount || 0) - (row.ledger_amount || 0));
      if (variance > toleranceAmount) {
        const entry = {
          employer_id: row.employer_id || row.payer_id || row.regno,
          employer_name: row.employer_name || null,
          exception_type: 'C3_UNPOSTED',
          source_table: 'cn_c3_reported',
          source_period: row.period || null,
          source_amount: row.source_amount || 0,
          ledger_amount: row.ledger_amount || 0,
          variance_amount: variance,
          variance_pct: row.source_amount ? Math.round((variance / row.source_amount) * 10000) / 100 : 0,
          run_id: runId,
          created_by: triggered_by,
        };
        if (!dry_run) {
          await supabase.from('ce_reconciliation_exceptions').insert(entry as any);
        }
        exceptionsFound++;
      }
      processed++;
    }

    // Check payment unposted records
    const { data: payUnposted } = await supabase.from('ce_v_payments_unposted_to_ledger').select('*');
    for (const row of (payUnposted || [])) {
      const variance = Math.abs((row.source_amount || row.payment_amount || 0) - (row.ledger_amount || 0));
      if (variance > toleranceAmount) {
        const entry = {
          employer_id: row.employer_id || row.payer_id || row.regno,
          employer_name: row.employer_name || null,
          exception_type: 'PAYMENT_UNPOSTED',
          source_table: 'cn_payment',
          source_period: row.period || null,
          source_amount: row.source_amount || row.payment_amount || 0,
          ledger_amount: row.ledger_amount || 0,
          variance_amount: variance,
          run_id: runId,
          created_by: triggered_by,
        };
        if (!dry_run) {
          await supabase.from('ce_reconciliation_exceptions').insert(entry as any);
        }
        exceptionsFound++;
      }
      processed++;
    }

    const completedAt = new Date().toISOString();
    const summary = { records_checked: processed, exceptions_found: exceptionsFound, tolerance: toleranceAmount, dry_run };
    if (runId) {
      await supabase.from('ce_automation_job_runs')
        .update({ run_status: 'COMPLETED', completed_at: completedAt, duration_ms: Date.now() - new Date(startedAt).getTime(), records_processed: processed, records_affected: exceptionsFound, summary } as any)
        .eq('id', runId);
    }
    if (!dry_run && jobId) {
      await supabase.from('ce_automation_jobs').update({ last_run_at: completedAt, last_run_status: 'COMPLETED' } as any).eq('id', jobId);
    }

    return new Response(JSON.stringify({
      ok: true, run_id: runId, dry_run, records_checked: processed, exceptions_found: exceptionsFound,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
