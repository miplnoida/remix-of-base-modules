import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * JOB-NOTICE-GEN (canonical)
 * Automated notice generation for violations exceeding age thresholds.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { dry_run = false, force = false, triggered_by = 'system' } = await req.json();
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = dry_run ? `NOTICE-GEN-DRY-${Date.now()}` : `NOTICE-GEN-${today}`;

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

    const { data: jobRecord } = await supabase.from('ce_automation_jobs').select('id, parameters').eq('job_code', 'JOB-NOTICE-GEN').single();
    const jobId = jobRecord?.id;
    const noticeRules = jobRecord?.parameters?.notice_rules || [
      { days_open: 7, label: '1st Notice', template_code: 'TPL-VN-001' },
      { days_open: 21, label: '2nd Notice', template_code: 'TPL-VN-002' },
      { days_open: 45, label: 'Final Warning', template_code: 'TPL-VN-003' },
    ];

    const startedAt = new Date().toISOString();
    const { data: runRecord } = await supabase.from('ce_automation_job_runs')
      .insert({ job_id: jobId, run_status: 'RUNNING', is_dry_run: dry_run, idempotency_key: idempotencyKey, triggered_by, started_at: startedAt } as any)
      .select('id').single();
    const runId = runRecord?.id;

    // Load templates
    const templateCodes = noticeRules.map((r: any) => r.template_code);
    const { data: templates } = await supabase.from('ce_notice_templates')
      .select('id, template_code, name, subject_template, body_template')
      .in('template_code', templateCodes);
    const templateMap = new Map((templates || []).map((t: any) => [t.template_code, t]));

    // Load open violations
    const { data: violations } = await supabase.from('ce_violations')
      .select('id, violation_number, employer_id, employer_name, status, created_at, financial_impact, violation_type_code')
      .eq('is_deleted', false)
      .in('status', ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED']);

    // Load existing notices to avoid duplicates
    const violationIds = (violations || []).map(v => v.id);

    let processed = 0;
    let noticesCreated = 0;
    const errors: string[] = [];

    for (const violation of (violations || [])) {
      try {
        const ageDays = Math.floor((Date.now() - new Date(violation.created_at).getTime()) / (24 * 60 * 60 * 1000));

        // Check existing notices for this violation
        const { data: existingNotices } = await supabase.from('ce_comm_notices')
          .select('id, notice_type').eq('reference_id', violation.id);
        const existingTypes = new Set((existingNotices || []).map(n => n.notice_type));

        for (const rule of noticeRules) {
          if (ageDays < rule.days_open) continue;
          if (existingTypes.has(rule.label)) continue;

          const template = templateMap.get(rule.template_code);

          if (!dry_run) {
            // Get employer contact
            const { data: emp } = await supabase.from('er_master')
              .select('email, phone, maddr1').eq('regno', violation.employer_id).maybeSingle();

            await supabase.from('ce_comm_notices').insert({
              reference_type: 'VIOLATION',
              reference_id: violation.id,
              employer_id: violation.employer_id,
              employer_name: violation.employer_name,
              notice_type: rule.label,
              notice_category: ageDays >= 45 ? 'LEGAL' : 'FORMAL',
              subject: template ? template.subject_template?.replace('{{violation_number}}', violation.violation_number) : `${rule.label} - ${violation.violation_number}`,
              body: template?.body_template || `This is a ${rule.label} regarding violation ${violation.violation_number}.`,
              template_id: template?.id || null,
              status: 'DRAFT',
              priority: ageDays >= 45 ? 'HIGH' : 'MEDIUM',
              channel: emp?.email ? 'EMAIL' : 'PRINT',
              recipient_email: emp?.email || null,
              recipient_phone: emp?.phone || null,
              recipient_address: emp?.maddr1 || null,
              generated_by: 'SYSTEM-NOTICE-GEN',
              generated_at: new Date().toISOString(),
            } as any);
          }
          noticesCreated++;
        }
        processed++;
      } catch (e) {
        errors.push(`${violation.violation_number}: ${e.message}`);
      }
    }

    const completedAt = new Date().toISOString();
    const summary = { violations_processed: processed, notices_created: noticesCreated, rules_applied: noticeRules.length, errors_count: errors.length, dry_run };
    if (runId) {
      await supabase.from('ce_automation_job_runs')
        .update({ run_status: 'COMPLETED', completed_at: completedAt, duration_ms: Date.now() - new Date(startedAt).getTime(), records_processed: processed, records_affected: noticesCreated, errors_count: errors.length, summary } as any)
        .eq('id', runId);
    }
    if (!dry_run && jobId) {
      await supabase.from('ce_automation_jobs').update({ last_run_at: completedAt, last_run_status: 'COMPLETED' } as any).eq('id', jobId);
    }

    return new Response(JSON.stringify({
      ok: true, run_id: runId, dry_run, violations_processed: processed, notices_created: noticesCreated,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
