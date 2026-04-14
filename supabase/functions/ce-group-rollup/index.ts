import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * EMP-GROUP-ROLLUP
 * Aggregates compliance metrics at the group/hierarchy level.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { dry_run = false, force = false, triggered_by = 'system' } = await req.json();
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = dry_run ? `GROUP-ROLLUP-DRY-${Date.now()}` : `GROUP-ROLLUP-${today}`;

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

    const { data: jobRecord } = await supabase.from('ce_automation_jobs').select('id').eq('job_code', 'EMP-GROUP-ROLLUP').single();
    const jobId = jobRecord?.id;
    const startedAt = new Date().toISOString();
    const { data: runRecord } = await supabase.from('ce_automation_job_runs')
      .insert({ job_id: jobId, run_status: 'RUNNING', is_dry_run: dry_run, idempotency_key: idempotencyKey, triggered_by, started_at: startedAt } as any)
      .select('id').single();
    const runId = runRecord?.id;

    // Find parent employers (groups)
    const { data: parents } = await supabase.from('er_master')
      .select('regno, name')
      .not('status', 'eq', 'C');

    // Find all parent_regno relationships
    const { data: children } = await supabase.from('er_master')
      .select('regno, parent_regno, name')
      .not('parent_regno', 'is', null);

    // Group children by parent
    const groupMap = new Map<string, string[]>();
    for (const child of (children || [])) {
      if (!child.parent_regno) continue;
      const arr = groupMap.get(child.parent_regno) || [];
      arr.push(child.regno);
      groupMap.set(child.parent_regno, arr);
    }

    let processed = 0;
    let rollups = 0;

    for (const [parentRegno, memberRegnos] of groupMap) {
      const allMembers = [parentRegno, ...memberRegnos];

      // Fetch compliance status for all members
      const { data: statuses } = await supabase.from('ce_employer_compliance_status')
        .select('employer_id, overall_compliance_status, current_arrears_amount, current_penalty_amount, active_violation_count')
        .in('employer_id', allMembers);

      const members = statuses || [];
      const compliant = members.filter(m => m.overall_compliance_status === 'COMPLIANT').length;

      // Fetch risk
      const { data: risks } = await supabase.from('ce_risk_profiles')
        .select('employer_id, overall_score, risk_band')
        .in('employer_id', allMembers);

      const riskScores = (risks || []).map(r => r.overall_score || 0);
      const avgRisk = riskScores.length ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length : 0;
      const bandOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const highestBand = (risks || []).reduce((max, r) => {
        return (bandOrder[r.risk_band as keyof typeof bandOrder] || 0) > (bandOrder[max as keyof typeof bandOrder] || 0) ? r.risk_band : max;
      }, 'LOW');

      const parent = (parents || []).find(p => p.regno === parentRegno);

      const rollupRow = {
        group_id: parentRegno,
        group_name: parent?.name || parentRegno,
        parent_regno: parentRegno,
        member_count: allMembers.length,
        compliant_count: compliant,
        non_compliant_count: allMembers.length - compliant,
        compliant_pct: allMembers.length > 0 ? Math.round((compliant / allMembers.length) * 10000) / 100 : 0,
        total_arrears: members.reduce((s, m) => s + (m.current_arrears_amount || 0), 0),
        total_penalties: members.reduce((s, m) => s + (m.current_penalty_amount || 0), 0),
        total_violations: members.reduce((s, m) => s + (m.active_violation_count || 0), 0),
        avg_risk_score: Math.round(avgRisk * 100) / 100,
        highest_risk_band: highestBand,
        computed_at: new Date().toISOString(),
        run_id: runId,
        created_by: triggered_by,
      };

      if (!dry_run) {
        // Delete old rollup for this group and insert fresh
        await supabase.from('ce_group_compliance_rollup').delete().eq('group_id', parentRegno);
        await supabase.from('ce_group_compliance_rollup').insert(rollupRow as any);
        rollups++;
      } else {
        rollups++;
      }
      processed++;
    }

    const completedAt = new Date().toISOString();
    const summary = { groups_processed: processed, rollups_created: rollups, dry_run };
    if (runId) {
      await supabase.from('ce_automation_job_runs')
        .update({ run_status: 'COMPLETED', completed_at: completedAt, duration_ms: Date.now() - new Date(startedAt).getTime(), records_processed: processed, records_affected: rollups, summary } as any)
        .eq('id', runId);
    }
    if (!dry_run && jobId) {
      await supabase.from('ce_automation_jobs').update({ last_run_at: completedAt, last_run_status: 'COMPLETED' } as any).eq('id', jobId);
    }

    return new Response(JSON.stringify({ ok: true, run_id: runId, dry_run, groups_processed: processed, rollups_created: rollups }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
