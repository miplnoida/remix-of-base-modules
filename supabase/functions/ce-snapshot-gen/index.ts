import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * EMP-SNAPSHOT-GEN
 * Generates point-in-time employer profile snapshots.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { dry_run = false, force = false, triggered_by = 'system' } = await req.json();
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = dry_run ? `SNAPSHOT-DRY-${Date.now()}` : `SNAPSHOT-${today}`;

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

    const { data: jobRecord } = await supabase.from('ce_automation_jobs').select('id').eq('job_code', 'EMP-SNAPSHOT-GEN').single();
    const jobId = jobRecord?.id;
    const startedAt = new Date().toISOString();
    const { data: runRecord } = await supabase.from('ce_automation_job_runs')
      .insert({ job_id: jobId, run_status: 'RUNNING', is_dry_run: dry_run, idempotency_key: idempotencyKey, triggered_by, started_at: startedAt } as any)
      .select('id').single();
    const runId = runRecord?.id;

    // Get employers with active violations (snapshot targets)
    const { data: violations } = await supabase.from('ce_violations')
      .select('employer_id').eq('is_deleted', false).in('status', ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED']);
    const empIds = [...new Set((violations || []).map(v => v.employer_id))];

    let processed = 0;
    let snapshots = 0;
    const errors: string[] = [];

    for (const empId of empIds) {
      try {
        // Fetch master data
        const { data: emp } = await supabase.from('er_master')
          .select('*').eq('regno', empId).maybeSingle();
        if (!emp) continue;

        // Fetch compliance status
        const { data: compStatus } = await supabase.from('ce_employer_compliance_status')
          .select('*').eq('employer_id', empId).maybeSingle();

        // Fetch risk
        const { data: risk } = await supabase.from('ce_risk_profiles')
          .select('overall_score, risk_band, filing_risk_score, payment_risk_score, enforcement_risk_score')
          .eq('employer_id', empId).maybeSingle();

        // Count active items
        const { count: violCount } = await supabase.from('ce_violations')
          .select('id', { count: 'exact', head: true }).eq('employer_id', empId).eq('is_deleted', false).in('status', ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED']);
        const { count: caseCount } = await supabase.from('ce_compliance_cases')
          .select('id', { count: 'exact', head: true }).eq('employer_id', empId).in('status', ['OPEN', 'INVESTIGATION', 'REVIEW']);
        const { count: arrCount } = await supabase.from('ce_payment_arrangements')
          .select('id', { count: 'exact', head: true }).eq('employer_id', empId).eq('status', 'ACTIVE');

        // Fetch active flags
        const { data: flags } = await supabase.from('ce_employer_compliance_flags')
          .select('flag_code, flag_label').eq('employer_id', empId).eq('is_active', true);

        const snapshot = {
          employer_id: empId,
          snapshot_trigger: 'AUTOMATION',
          snapshot_trigger_type: 'DAILY_SNAPSHOT',
          snapshot_at: new Date().toISOString(),
          snapshot_by: triggered_by,
          employer_name: emp.name,
          employer_status: emp.status,
          trade_name: emp.trade_name,
          registration_date: emp.registration_date,
          sector_code: emp.sector_code,
          industrial_code: emp.industrial_code,
          ownership_code: emp.ownership_code,
          office_code: emp.office_code,
          village_code: emp.village_code,
          parent_regno: emp.parent_regno,
          regno: emp.regno,
          phone: emp.phone,
          email: emp.email,
          mobile: emp.mobile,
          mailing_address_1: emp.maddr1,
          mailing_address_2: emp.maddr2,
          hq_address_1: emp.hq_addr1,
          hq_address_2: emp.hq_addr2,
          compliance_status: compStatus?.overall_compliance_status || 'UNKNOWN',
          filing_status: compStatus?.filing_status || 'UNKNOWN',
          payment_status: compStatus?.payment_status || 'UNKNOWN',
          current_arrears: compStatus?.current_arrears_amount || 0,
          current_penalties: compStatus?.current_penalty_amount || 0,
          active_violations: violCount || 0,
          active_cases: caseCount || 0,
          active_arrangements: arrCount || 0,
          last_filing_period: compStatus?.last_filing_period || null,
          last_payment_date: compStatus?.last_payment_date || null,
          risk_score: risk?.overall_score || null,
          risk_band: risk?.risk_band || null,
          filing_risk_score: risk?.filing_risk_score || null,
          payment_risk_score: risk?.payment_risk_score || null,
          enforcement_risk_score: risk?.enforcement_risk_score || null,
          active_flags: flags || [],
          raw_master_data: emp,
          raw_compliance_data: compStatus || {},
          raw_risk_data: risk || {},
          created_by: triggered_by,
        };

        if (!dry_run) {
          await supabase.from('ce_employer_snapshots').insert(snapshot as any);
          snapshots++;
        } else {
          snapshots++;
        }
        processed++;
      } catch (e) {
        errors.push(`${empId}: ${e.message}`);
      }
    }

    const completedAt = new Date().toISOString();
    const summary = { employers_processed: processed, snapshots_created: snapshots, errors_count: errors.length, dry_run };
    if (runId) {
      await supabase.from('ce_automation_job_runs')
        .update({ run_status: 'COMPLETED', completed_at: completedAt, duration_ms: Date.now() - new Date(startedAt).getTime(), records_processed: processed, records_affected: snapshots, errors_count: errors.length, summary } as any)
        .eq('id', runId);
    }
    if (!dry_run && jobId) {
      await supabase.from('ce_automation_jobs').update({ last_run_at: completedAt, last_run_status: 'COMPLETED' } as any).eq('id', jobId);
    }

    return new Response(JSON.stringify({
      ok: true, run_id: runId, dry_run, employers_processed: processed, snapshots_created: snapshots, errors_count: errors.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
