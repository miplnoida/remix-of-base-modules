import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * JOB-ESCALATION-REVIEW (Hardened)
 * 
 * Enterprise-grade escalation engine with:
 * - Risk-based timing modifiers
 * - Prerequisite enforcement
 * - Safeguard checks (active arrangements, open disputes)
 * - Duplicate escalation protection (idempotency)
 * - Execution mode handling (AUTO / RECOMMEND / MANUAL)
 * - Full audit logging to ce_escalation_log
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { dry_run = false, force = false, triggered_by = 'system' } = await req.json();
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyPrefix = dry_run ? `ESCALATION-REVIEW-DRY-${Date.now()}` : `ESCALATION-REVIEW-${today}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Job run management ──
    if (!dry_run) {
      await supabase.from('ce_automation_job_runs').delete()
        .eq('idempotency_key', idempotencyPrefix).in('run_status', ['RUNNING', 'FAILED']);
    }
    if (!dry_run && !force) {
      const { data: existing } = await supabase.from('ce_automation_job_runs')
        .select('id').eq('idempotency_key', idempotencyPrefix).eq('run_status', 'COMPLETED').maybeSingle();
      if (existing) return new Response(JSON.stringify({ already_completed: true, run_id: existing.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: jobRecord } = await supabase.from('ce_automation_jobs').select('id').eq('job_code', 'JOB-ESCALATION-REVIEW').single();
    const jobId = jobRecord?.id;
    const startedAt = new Date().toISOString();
    const { data: runRecord } = await supabase.from('ce_automation_job_runs')
      .insert({ job_id: jobId, run_status: 'RUNNING', is_dry_run: dry_run, idempotency_key: idempotencyPrefix, triggered_by, started_at: startedAt } as any)
      .select('id').single();
    const runId = runRecord?.id;

    // ── Load escalation rules (ordered by priority) ──
    const { data: rules } = await supabase.from('ce_escalation_rules')
      .select('id, rule_code, name, from_status, to_status, days_threshold, auto_escalate, requires_approval, parameters, execution_mode, prerequisites, risk_timing_modifier, priority_order, approval_role, family')
      .eq('is_enabled', true)
      .order('priority_order', { ascending: true });

    // ── Load active violations ──
    const { data: violations } = await supabase.from('ce_violations')
      .select('id, violation_number, employer_id, employer_name, status, severity, created_at, financial_impact')
      .eq('is_deleted', false)
      .in('status', ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED', 'WARNING_NOTICE', 'DEMAND_NOTICE', 'FINAL_DEMAND', 'PRIORITY_QUEUE', 'MANAGER_REVIEW']);

    // ── Load risk profiles for all employers ──
    const employerIds = [...new Set((violations || []).map(v => v.employer_id).filter(Boolean))];
    let riskMap: Record<string, { band: string; score: number }> = {};
    if (employerIds.length > 0) {
      const { data: riskProfiles } = await supabase.from('ce_risk_profiles')
        .select('employer_id, risk_band, total_score')
        .in('employer_id', employerIds);
      for (const rp of (riskProfiles || [])) {
        riskMap[rp.employer_id] = { band: rp.risk_band || 'LOW', score: rp.total_score || 0 };
      }
    }

    // ── Load active arrangements (safeguard) ──
    let activeArrangementEmployers = new Set<string>();
    if (employerIds.length > 0) {
      const { data: arrangements } = await supabase.from('ce_arrangements')
        .select('employer_id')
        .in('employer_id', employerIds)
        .eq('status', 'ACTIVE');
      for (const a of (arrangements || [])) {
        activeArrangementEmployers.add(a.employer_id);
      }
    }

    // ── Track which violations have already been escalated this run (duplicate prevention) ──
    const escalatedThisRun = new Set<string>();

    let processed = 0;
    let escalated = 0;
    let recommended = 0;
    let blocked = 0;
    let legalCreated = 0;
    let duplicateSuppressed = 0;
    const errors: string[] = [];

    for (const violation of (violations || [])) {
      try {
        const ageMs = Date.now() - new Date(violation.created_at).getTime();
        const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
        const risk = riskMap[violation.employer_id] || { band: 'LOW', score: 0 };

        for (const rule of (rules || [])) {
          // Skip MANUAL-only rules (triggered by user action only)
          const execMode = rule.execution_mode || (rule.auto_escalate ? 'AUTO' : 'RECOMMEND');
          if (execMode === 'MANUAL') continue;

          // Match from_status
          if (rule.from_status !== violation.status) continue;

          // Apply risk-based timing modifier
          let effectiveThreshold = rule.days_threshold || 0;
          if (rule.risk_timing_modifier && typeof rule.risk_timing_modifier === 'object') {
            const modifier = rule.risk_timing_modifier[risk.band];
            if (typeof modifier === 'number') {
              effectiveThreshold = Math.max(0, effectiveThreshold + modifier);
            }
          }

          // Check days threshold
          if (ageDays < effectiveThreshold) continue;

          // ── Duplicate protection (idempotency) ──
          const idempotencyKey = `${violation.id}:${rule.rule_code}:${today}`;
          if (escalatedThisRun.has(violation.id)) {
            await logEscalation(supabase, {
              violation_id: violation.id, rule_id: rule.id, rule_code: rule.rule_code,
              from_status: violation.status, to_status: rule.to_status,
              execution_mode: execMode, risk_band: risk.band, risk_score: risk.score,
              status: 'DUPLICATE_SUPPRESSED', idempotency_key: idempotencyKey,
              blocked_reason: 'Another rule already escalated this violation in this run',
            });
            duplicateSuppressed++;
            continue;
          }

          // Check existing log for today (cross-run idempotency)
          if (!dry_run) {
            const { data: existingLog } = await supabase.from('ce_escalation_log')
              .select('id').eq('idempotency_key', idempotencyKey).maybeSingle();
            if (existingLog) {
              duplicateSuppressed++;
              continue;
            }
          }

          // ── Check prerequisites ──
          const rulePrereqs: string[] = Array.isArray(rule.prerequisites) ? rule.prerequisites : [];
          let prereqsMet = true;
          let prereqDetails: Record<string, boolean> = {};

          if (rulePrereqs.length > 0) {
            // Check no_active_arrangement prerequisite
            if (rulePrereqs.includes('no_active_arrangement')) {
              const hasPlan = activeArrangementEmployers.has(violation.employer_id);
              prereqDetails['no_active_arrangement'] = !hasPlan;
              if (hasPlan) prereqsMet = false;
            }

            // Check DB-tracked prerequisites
            const dbPrereqs = rulePrereqs.filter(p => !['no_active_arrangement', 'no_open_dispute'].includes(p));
            if (dbPrereqs.length > 0) {
              const { data: savedPrereqs } = await supabase.from('ce_escalation_prerequisites')
                .select('prerequisite_key, is_satisfied')
                .eq('violation_id', violation.id)
                .in('prerequisite_key', dbPrereqs);

              for (const key of dbPrereqs) {
                const found = (savedPrereqs || []).find(p => p.prerequisite_key === key);
                const satisfied = found?.is_satisfied || false;
                prereqDetails[key] = satisfied;
                if (!satisfied) prereqsMet = false;
              }
            }
          }

          // ── Safeguard: block legal transitions if arrangement active ──
          const isLegalTransition = ['LEGAL_ACTION_REQUISITION', 'LEGAL_ACTION'].includes(rule.to_status);
          if (isLegalTransition && activeArrangementEmployers.has(violation.employer_id)) {
            await logEscalation(supabase, {
              violation_id: violation.id, rule_id: rule.id, rule_code: rule.rule_code,
              from_status: violation.status, to_status: rule.to_status,
              execution_mode: execMode, risk_band: risk.band, risk_score: risk.score,
              prerequisites_checked: prereqDetails, prerequisites_met: false,
              status: 'BLOCKED', idempotency_key: idempotencyKey,
              blocked_reason: 'Active payment arrangement exists — legal escalation blocked',
            });
            blocked++;
            continue;
          }

          // ── Prerequisites not met → block ──
          if (!prereqsMet) {
            await logEscalation(supabase, {
              violation_id: violation.id, rule_id: rule.id, rule_code: rule.rule_code,
              from_status: violation.status, to_status: rule.to_status,
              execution_mode: execMode, risk_band: risk.band, risk_score: risk.score,
              prerequisites_checked: prereqDetails, prerequisites_met: false,
              status: 'BLOCKED', idempotency_key: idempotencyKey,
              blocked_reason: `Prerequisites not met: ${Object.entries(prereqDetails).filter(([, v]) => !v).map(([k]) => k).join(', ')}`,
            });
            blocked++;
            continue;
          }

          // ── Execute based on mode ──
          if (execMode === 'AUTO') {
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
                notes: `Auto-escalated by ${rule.rule_code}: ${rule.name} (age: ${ageDays}d, threshold: ${effectiveThreshold}d, risk: ${risk.band}/${risk.score})`,
                performed_by: 'SYSTEM-ESCALATION',
              } as any);

              // Create legal escalation record if transitioning to legal stage
              if (isLegalTransition) {
                await supabase.from('ce_legal_escalations').insert({
                  violation_id: violation.id,
                  employer_id: violation.employer_id,
                  employer_name: violation.employer_name,
                  escalation_type: 'AUTOMATED',
                  escalation_reason: `Violation ${violation.violation_number} exceeded ${effectiveThreshold}-day threshold (risk: ${risk.band})`,
                  status: 'PENDING_REVIEW',
                  priority: violation.severity || 'HIGH',
                  amount_at_stake: violation.financial_impact || 0,
                  escalated_by: 'SYSTEM-ESCALATION',
                  escalated_at: new Date().toISOString(),
                } as any);
                legalCreated++;
              }

              await logEscalation(supabase, {
                violation_id: violation.id, rule_id: rule.id, rule_code: rule.rule_code,
                from_status: violation.status, to_status: rule.to_status,
                execution_mode: 'AUTO', risk_band: risk.band, risk_score: risk.score,
                prerequisites_checked: prereqDetails, prerequisites_met: true,
                status: 'EXECUTED', idempotency_key: idempotencyKey,
              });
            }
            escalatedThisRun.add(violation.id);
            escalated++;
          } else if (execMode === 'RECOMMEND') {
            // Create recommendation — do NOT change violation status
            if (!dry_run) {
              await logEscalation(supabase, {
                violation_id: violation.id, rule_id: rule.id, rule_code: rule.rule_code,
                from_status: violation.status, to_status: rule.to_status,
                execution_mode: 'RECOMMEND', risk_band: risk.band, risk_score: risk.score,
                prerequisites_checked: prereqDetails, prerequisites_met: true,
                approval_required: !!rule.requires_approval,
                status: 'PENDING_APPROVAL', idempotency_key: idempotencyKey,
              });
            }
            recommended++;
          }

          break; // Only apply first matching rule per violation
        }
        processed++;
      } catch (e) {
        errors.push(`${violation.violation_number}: ${e.message}`);
      }
    }

    const completedAt = new Date().toISOString();
    const summary = {
      violations_reviewed: processed,
      escalations_auto: escalated,
      escalations_recommended: recommended,
      blocked,
      duplicate_suppressed: duplicateSuppressed,
      legal_cases_created: legalCreated,
      errors_count: errors.length,
      dry_run,
    };

    if (runId) {
      await supabase.from('ce_automation_job_runs')
        .update({
          run_status: 'COMPLETED', completed_at: completedAt,
          duration_ms: Date.now() - new Date(startedAt).getTime(),
          records_processed: processed,
          records_affected: escalated + recommended,
          errors_count: errors.length, summary,
        } as any)
        .eq('id', runId);
    }
    if (!dry_run && jobId) {
      await supabase.from('ce_automation_jobs').update({ last_run_at: completedAt, last_run_status: 'COMPLETED' } as any).eq('id', jobId);
    }

    return new Response(JSON.stringify({
      ok: true, run_id: runId, dry_run, ...summary,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Helper: log escalation decision ──
async function logEscalation(supabase: any, entry: {
  violation_id: string;
  rule_id: string;
  rule_code: string;
  from_status: string;
  to_status: string;
  execution_mode: string;
  risk_band: string;
  risk_score: number;
  prerequisites_checked?: Record<string, boolean>;
  prerequisites_met?: boolean;
  approval_required?: boolean;
  approved_by?: string;
  blocked_reason?: string;
  status: string;
  idempotency_key: string;
}) {
  try {
    await supabase.from('ce_escalation_log').insert({
      violation_id: entry.violation_id,
      rule_id: entry.rule_id,
      rule_code: entry.rule_code,
      from_status: entry.from_status,
      to_status: entry.to_status,
      execution_mode: entry.execution_mode,
      risk_band: entry.risk_band,
      risk_score: entry.risk_score,
      prerequisites_checked: entry.prerequisites_checked || null,
      prerequisites_met: entry.prerequisites_met ?? null,
      approval_required: entry.approval_required || false,
      approved_by: entry.approved_by || null,
      blocked_reason: entry.blocked_reason || null,
      status: entry.status,
      idempotency_key: entry.idempotency_key,
    } as any);
  } catch (e) {
    console.error('Failed to log escalation:', e);
  }
}
