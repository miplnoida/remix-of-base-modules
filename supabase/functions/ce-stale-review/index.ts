import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * EMP-STALE-REVIEW
 * Identifies stale employers (no filing activity for X months) and queues for review.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { dry_run = false, force = false, triggered_by = 'system' } = await req.json();
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = dry_run ? `STALE-REVIEW-DRY-${Date.now()}` : `STALE-REVIEW-${today}`;

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

    const { data: jobRecord } = await supabase.from('ce_automation_jobs').select('id, parameters').eq('job_code', 'EMP-STALE-REVIEW').single();
    const jobId = jobRecord?.id;
    const staleMonths = jobRecord?.parameters?.stale_months || 6;
    const startedAt = new Date().toISOString();
    const { data: runRecord } = await supabase.from('ce_automation_job_runs')
      .insert({ job_id: jobId, run_status: 'RUNNING', is_dry_run: dry_run, idempotency_key: idempotencyKey, triggered_by, started_at: startedAt } as any)
      .select('id').single();
    const runId = runRecord?.id;

    // Calculate cutoff date
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - staleMonths);
    const cutoffStr = cutoff.toISOString();

    // Fetch employers with filing status
    const { data: filingStatuses } = await supabase.from('ce_v_employer_filing_status').select('*');

    let processed = 0;
    let queued = 0;
    const errors: string[] = [];

    for (const filing of (filingStatuses || [])) {
      try {
        const empId = filing.employer_id || filing.regno;
        const lastFiled = filing.last_filed_date || filing.last_filing_date;

        // Check if stale
        const isStale = !lastFiled || new Date(lastFiled) < cutoff;
        if (!isStale) { processed++; continue; }

        // Check if already in queue
        const { data: existingEntry } = await supabase.from('ce_review_queue')
          .select('id').eq('employer_id', empId).eq('status', 'PENDING').eq('review_type', 'STALE').maybeSingle();

        if (existingEntry) { processed++; continue; }

        const monthsSinceFiling = lastFiled
          ? Math.round((Date.now() - new Date(lastFiled).getTime()) / (30 * 24 * 60 * 60 * 1000))
          : staleMonths + 12;
        const priority = monthsSinceFiling > 12 ? 'HIGH' : monthsSinceFiling > 9 ? 'MEDIUM' : 'LOW';

        const entry = {
          employer_id: empId,
          employer_name: filing.employer_name || null,
          review_type: 'STALE',
          reason: `No filing activity for ${monthsSinceFiling} months (cutoff: ${staleMonths} months)`,
          priority,
          stale_since: lastFiled || cutoffStr,
          last_activity_at: lastFiled || null,
          run_id: runId,
          created_by: triggered_by,
        };

        if (!dry_run) {
          await supabase.from('ce_review_queue').insert(entry as any);
          queued++;
        } else {
          queued++;
        }
        processed++;
      } catch (e) {
        errors.push(`${filing.employer_id || filing.regno}: ${e.message}`);
      }
    }

    const completedAt = new Date().toISOString();
    const summary = { employers_checked: processed, queued_for_review: queued, stale_months: staleMonths, errors_count: errors.length, dry_run };
    if (runId) {
      await supabase.from('ce_automation_job_runs')
        .update({ run_status: 'COMPLETED', completed_at: completedAt, duration_ms: Date.now() - new Date(startedAt).getTime(), records_processed: processed, records_affected: queued, errors_count: errors.length, summary } as any)
        .eq('id', runId);
    }
    if (!dry_run && jobId) {
      await supabase.from('ce_automation_jobs').update({ last_run_at: completedAt, last_run_status: 'COMPLETED' } as any).eq('id', jobId);
    }

    return new Response(JSON.stringify({
      ok: true, run_id: runId, dry_run, employers_checked: processed, queued_for_review: queued,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
