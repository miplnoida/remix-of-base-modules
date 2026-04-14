import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * EMP-NOTICE-VALIDATE
 * Validates notice recipient contact information before notice generation.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { dry_run = false, force = false, triggered_by = 'system' } = await req.json();
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = dry_run ? `NOTICE-VALIDATE-DRY-${Date.now()}` : `NOTICE-VALIDATE-${today}`;

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

    const { data: jobRecord } = await supabase.from('ce_automation_jobs').select('id').eq('job_code', 'EMP-NOTICE-VALIDATE').single();
    const jobId = jobRecord?.id;
    const startedAt = new Date().toISOString();
    const { data: runRecord } = await supabase.from('ce_automation_job_runs')
      .insert({ job_id: jobId, run_status: 'RUNNING', is_dry_run: dry_run, idempotency_key: idempotencyKey, triggered_by, started_at: startedAt } as any)
      .select('id').single();
    const runId = runRecord?.id;

    // Get employers with active violations that may need notices
    const { data: violations } = await supabase.from('ce_violations')
      .select('employer_id, employer_name')
      .eq('is_deleted', false)
      .in('status', ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED']);

    // Deduplicate employer IDs
    const employerIds = [...new Set((violations || []).map(v => v.employer_id))];

    let processed = 0;
    let validCount = 0;
    let invalidCount = 0;
    const logEntries: any[] = [];

    for (const empId of employerIds) {
      const { data: emp } = await supabase.from('er_master')
        .select('regno, name, email, phone, mobile, maddr1, maddr2')
        .eq('regno', empId).maybeSingle();

      if (!emp) continue;

      const checks = [
        { field: 'email', value: emp.email, valid: !!(emp.email && emp.email.includes('@')) },
        { field: 'phone', value: emp.phone || emp.mobile, valid: !!(emp.phone || emp.mobile) },
        { field: 'mailing_address', value: emp.maddr1, valid: !!(emp.maddr1 && emp.maddr1.trim().length > 3) },
      ];

      for (const check of checks) {
        const entry = {
          employer_id: empId,
          employer_name: emp.name,
          validation_type: 'CONTACT_INFO',
          contact_field: check.field,
          contact_value: check.value || null,
          is_valid: check.valid,
          failure_reason: check.valid ? null : `Missing or invalid ${check.field}`,
          run_id: runId,
          created_by: triggered_by,
        };
        logEntries.push(entry);
        if (check.valid) validCount++; else invalidCount++;
      }
      processed++;
    }

    if (!dry_run && logEntries.length > 0) {
      // Batch insert in chunks of 100
      for (let i = 0; i < logEntries.length; i += 100) {
        await supabase.from('ce_notice_validation_log').insert(logEntries.slice(i, i + 100) as any);
      }
    }

    const completedAt = new Date().toISOString();
    const summary = { employers_checked: processed, valid_contacts: validCount, invalid_contacts: invalidCount, dry_run };
    if (runId) {
      await supabase.from('ce_automation_job_runs')
        .update({ run_status: 'COMPLETED', completed_at: completedAt, duration_ms: Date.now() - new Date(startedAt).getTime(), records_processed: processed, records_affected: logEntries.length, errors_count: invalidCount, summary } as any)
        .eq('id', runId);
    }
    if (!dry_run && jobId) {
      await supabase.from('ce_automation_jobs').update({ last_run_at: completedAt, last_run_status: 'COMPLETED' } as any).eq('id', jobId);
    }

    return new Response(JSON.stringify({
      ok: true, run_id: runId, dry_run, employers_checked: processed, valid_contacts: validCount, invalid_contacts: invalidCount,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
