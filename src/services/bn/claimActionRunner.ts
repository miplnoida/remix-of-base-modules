/**
 * Claim Action Runner
 *
 * Bridges workbench actions to the underlying business engines.
 * Phase 2 makes these actions actually DO something instead of
 * only updating bn_claim.status.
 *
 *  - runClaimEligibility  → loads product-version rules, resolves each
 *    rule's field, evaluates the operator, persists a row in
 *    bn_claim_eligibility with a full rule trace and contribution summary.
 *
 *  - runClaimCalculation  → invokes the existing 10-layer calculation
 *    engine, then mirrors the relevant outputs into bn_claim_calculation
 *    so the workbench Calculation tab and downstream entitlement logic
 *    have a typed, query-friendly record.
 *
 *  - createClaimDecision  → drafts/finalises a bn_claim_decision row for
 *    SUBMIT_DECISION / APPROVE / DENY actions.
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveField } from '@/services/bn/eligibility/fieldResolver';
import { evaluateOperator } from '@/services/bn/eligibility/operatorEvaluator';
import { getFieldDef } from '@/services/bn/eligibility/fieldRegistry';
import { runCalculationEngine } from '@/services/bn/calculationEngine';

const db = supabase as any;

export interface ClaimContext {
  id: string;
  ssn: string;
  claim_date: string;
  product_id: string | null;
  product_version_id: string | null;
  employer_regno: string | null;
  status: string | null;
}

async function loadClaimContext(claimId: string): Promise<ClaimContext> {
  const { data, error } = await db
    .from('bn_claim')
    .select('id, ssn, claim_date, product_id, product_version_id, employer_regno, status')
    .eq('id', claimId)
    .single();
  if (error) throw error;
  if (!data) throw new Error('Claim not found');
  return data as ClaimContext;
}

/**
 * For pre-decision claims, auto-rebind to the currently ACTIVE product version
 * so newly added rules take effect. Decided claims stay pinned for audit.
 */
const PRE_DECISION_STATUSES = new Set([
  'DRAFT', 'INTAKE', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_DOCS', 'PENDING_REVIEW',
]);

async function resolveEvaluationVersionId(claim: ClaimContext): Promise<string> {
  if (!claim.product_id) {
    if (!claim.product_version_id) throw new Error('Claim has no product/version.');
    return claim.product_version_id;
  }
  const isPreDecision = !claim.status || PRE_DECISION_STATUSES.has(String(claim.status).toUpperCase());
  if (!isPreDecision) {
    if (!claim.product_version_id) throw new Error('Decided claim missing product_version_id.');
    return claim.product_version_id;
  }
  const { data: active } = await db
    .from('bn_product_version')
    .select('id')
    .eq('product_id', claim.product_id)
    .eq('status', 'ACTIVE')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const targetId = active?.id || claim.product_version_id;
  if (!targetId) throw new Error('No ACTIVE product version found for this product.');
  if (targetId !== claim.product_version_id) {
    await db.from('bn_claim').update({ product_version_id: targetId }).eq('id', claim.id);
    claim.product_version_id = targetId;
  }
  return targetId;
}

// ─── Eligibility ────────────────────────────────────────────────────

export interface EligibilityRuleTrace {
  rule_code: string;
  rule_name: string;
  rule_group: string | null;
  field_key: string | null;
  operator: string | null;
  expected_value: unknown;
  actual_value: unknown;
  passed: boolean;
  fail_action: 'REJECT' | 'WARN' | string;
  source: string | null;
  message: string;
}

export interface EligibilityRunResult {
  eligibilityId: string;
  overallResult: boolean;
  rules: EligibilityRuleTrace[];
}

/**
 * Extract the expected value from a rule.rule_definition for a known field_key.
 * Old/legacy rules use a wide variety of property names (employer_status,
 * person_status, min_age, max_age, min_weeks, max_report_days, required_value, ...).
 * Returns { value, operator, hint } — `hint` is set when the rule only carries
 * intent flags (no comparable value) so the runner can mark it INFO instead of FAIL.
 */
function extractExpected(
  fieldKey: string,
  def: Record<string, any>,
  defaultOp: string,
): { value: unknown; operator: string; hint?: string } {
  const op = def.operator || defaultOp;
  // Direct value first
  const direct = def.value ?? def.required_value ?? def.expected_value;
  if (direct !== undefined && direct !== null) return { value: direct, operator: op };

  switch (fieldKey) {
    case 'employer.status': {
      const v = def.employer_status ?? def.status ?? def.required_status;
      if (v != null) return { value: v, operator: op || '==' };
      if (def.requires_active_employer || def.requires_employer_verification) {
        return { value: 'A', operator: '==' };
      }
      return { value: null, operator: op, hint: 'No expected employer status provided' };
    }
    case 'person.status': {
      const v = def.person_status ?? def.status ?? def.required_status;
      if (v != null) return { value: v, operator: op || '==' };
      if (def.requires_active_employment || def.exclude_self_employed) {
        return { value: null, operator: op, hint: 'Rule expresses intent only — no comparable value (treat as INFO).' };
      }
      return { value: null, operator: op, hint: 'No expected person status provided' };
    }
    case 'person.age_at_claim_date': {
      if (def.min_age != null) return { value: def.min_age, operator: '>=' };
      if (def.max_age != null) return { value: def.max_age, operator: '<=' };
      return { value: null, operator: op, hint: 'No age threshold defined' };
    }
    case 'contribution.total_weeks':
    case 'contribution.total_wages':
    case 'contribution.avg_weekly_wage': {
      const v = def.min_weeks ?? def.min_contributions_weeks ?? def.recent_contributions_weeks
        ?? def.min_wages ?? def.min_value ?? def.threshold;
      if (v != null) return { value: v, operator: op || '>=' };
      return { value: null, operator: op, hint: 'No contribution threshold defined' };
    }
    case 'claim.claim_date': {
      // Intent-only; date threshold checks (max_report_days etc.) need an incident date
      // which isn't available on bn_claim today — surface as INFO rather than fail.
      if (def.max_report_days != null || def.min_report_days != null) {
        return { value: null, operator: op, hint: `Reporting window (${def.max_report_days ?? def.min_report_days} days) — incident date not yet captured; skipped.` };
      }
      return { value: null, operator: op, hint: 'No date threshold defined' };
    }
    case 'evidence.required_docs_complete':
    case 'evidence.document_verified': {
      return { value: true, operator: '==' };
    }
    case 'claim.has_duplicate_active_claim': {
      return { value: false, operator: '==' };
    }
    default:
      return { value: null, operator: op, hint: 'No expected value extracted' };
  }
}

async function resolveEmployerForClaim(claim: ClaimContext): Promise<string | null> {
  if (claim.employer_regno) return claim.employer_regno;
  // Latest wage row gives us the most recent employer (payer_id) for this SSN.
  const { data } = await db
    .from('ip_wages')
    .select('payer_id, period')
    .eq('ssn', claim.ssn)
    .order('period', { ascending: false })
    .limit(1);
  return data?.[0]?.payer_id ?? null;
}

export async function runClaimEligibility(
  claimId: string,
  userCode: string,
): Promise<EligibilityRunResult> {
  const claim = await loadClaimContext(claimId);
  const versionId = await resolveEvaluationVersionId(claim);

  const { data: rules, error: rulesErr } = await db
    .from('bn_eligibility_rule')
    .select('*')
    .eq('product_version_id', versionId)
    .eq('is_active', true)
    .order('sort_order');
  if (rulesErr) throw rulesErr;

  const resolvedEmployer = await resolveEmployerForClaim(claim);

  const ctx = {
    ssn: claim.ssn,
    claimId: claim.id,
    claimDate: claim.claim_date,
    employerRegNo: resolvedEmployer ?? undefined,
  };

  const traces: EligibilityRuleTrace[] = [];

  for (const rule of rules ?? []) {
    const def = (rule.rule_definition || {}) as Record<string, any>;
    const fieldKey: string | null = def.field_key ?? null;

    let actual: unknown = null;
    let passed = false;
    let message = '';
    let source: string | null = null;
    let operator: string = def.operator || '==';
    let expected: unknown = null;

    if (!fieldKey) {
      traces.push({
        rule_code: rule.rule_code,
        rule_name: rule.rule_name,
        rule_group: rule.rule_group,
        field_key: null,
        operator,
        expected_value: null,
        actual_value: null,
        passed: true, // INFO — legacy definition, do not block
        fail_action: 'INFO',
        source: rule.data_source ?? null,
        message: 'Legacy rule — no field_key; treated as INFO.',
      });
      continue;
    }

    try {
      const fieldDef = getFieldDef(fieldKey);
      if (!fieldDef) {
        // Unknown field — INFO, do not block
        traces.push({
          rule_code: rule.rule_code, rule_name: rule.rule_name, rule_group: rule.rule_group,
          field_key: fieldKey, operator, expected_value: null, actual_value: null,
          passed: true, fail_action: 'INFO', source: null,
          message: `Unknown field_key: ${fieldKey} (treated as INFO).`,
        });
        continue;
      }

      const ex = extractExpected(fieldKey, def, fieldDef.operators[0] ?? '==');
      operator = ex.operator;
      expected = ex.value;

      const resolved = await resolveField(fieldKey, ctx, {
        windowType: def.window_type,
        windowFrom: def.window_from,
        windowTo: def.window_to,
        documentTypeCode: def.document_type_code,
      });
      actual = resolved.value;
      source = resolved.sourceLabel;

      if (ex.hint && (expected === null || expected === undefined)) {
        // Intent-only or non-comparable rule — INFO, do not block
        traces.push({
          rule_code: rule.rule_code, rule_name: rule.rule_name, rule_group: rule.rule_group,
          field_key: fieldKey, operator, expected_value: null, actual_value: actual,
          passed: true, fail_action: 'INFO', source,
          message: `${fieldDef.label}: ${ex.hint}`,
        });
        continue;
      }

      // Case-insensitive string normalisation for equality on enumerated codes
      let actualForEval = actual;
      let expectedForEval = expected;
      if (fieldDef.valueType === 'string' && (operator === '==' || operator === '!=' || operator === 'IN')) {
        if (typeof actual === 'string') actualForEval = actual.trim().toUpperCase();
        if (typeof expected === 'string') expectedForEval = expected.trim().toUpperCase();
      }

      const evalRes = evaluateOperator(actualForEval, operator as any, expectedForEval, fieldDef.valueType, {
        rangeFrom: def.range_from,
        rangeTo: def.range_to,
      });
      passed = evalRes.passed;
      message = passed
        ? `${fieldDef.label}: ${evalRes.reason}`
        : rule.fail_message || `${fieldDef.label}: ${evalRes.reason}`;
    } catch (err: any) {
      message = `Evaluation error: ${err?.message || err}`;
      passed = false;
    }

    traces.push({
      rule_code: rule.rule_code,
      rule_name: rule.rule_name,
      rule_group: rule.rule_group,
      field_key: fieldKey,
      operator,
      expected_value: expected,
      actual_value: actual,
      passed,
      fail_action: rule.fail_action,
      source,
      message,
    });
  }

  // ─── Apply ACTIVE APPROVED eligibility overrides ───────────────────
  // Rule per spec: re-run evaluates every rule, but any failure that has an
  // ACTIVE approved override is downgraded to OVERRIDDEN (passed=true) so
  // the claim does not regress. Only explicit revoke removes an override.
  const { data: activeOverrides } = await db
    .from('bn_override_request')
    .select('id, rule_code, reason_code, justification, reviewed_by, reviewed_at, requested_by, current_value, requested_value')
    .eq('claim_id', claim.id)
    .eq('policy_area', 'ELIGIBILITY')
    .eq('status', 'APPROVED');

  const overrideByRule = new Map<string, any>();
  for (const ov of (activeOverrides ?? [])) {
    if (ov.rule_code && !overrideByRule.has(ov.rule_code)) overrideByRule.set(ov.rule_code, ov);
  }

  let anyOverrideApplied = false;
  const overrideReasons: string[] = [];
  let firstOverrideBy: string | null = null;

  for (const t of traces) {
    if (!t.passed && overrideByRule.has(t.rule_code)) {
      const ov = overrideByRule.get(t.rule_code);
      anyOverrideApplied = true;
      firstOverrideBy = firstOverrideBy || ov.reviewed_by || ov.requested_by;
      if (ov.justification || ov.reason_code) {
        overrideReasons.push(`${t.rule_code}: ${ov.justification || ov.reason_code}`);
      }
      (t as any).original_actual_value = t.actual_value;
      (t as any).original_passed = false;
      t.passed = true;
      (t as any).result_state = 'OVERRIDDEN';
      (t as any).status = 'OVERRIDDEN';
      (t as any).override_request_id = ov.id;
      (t as any).overridden_by = ov.reviewed_by || ov.requested_by;
      (t as any).override_approved_by = ov.reviewed_by;
      (t as any).override_approved_at = ov.reviewed_at;
      (t as any).override_reason_code = ov.reason_code;
      (t as any).override_justification = ov.justification;
      t.message = `${t.message} — OVERRIDDEN by ${ov.reviewed_by || ov.requested_by} (${ov.reason_code || 'policy override'})`;
    }
  }

  const overall = !traces.some((t) => !t.passed && t.fail_action === 'REJECT');

  const { data: inserted, error: insErr } = await db
    .from('bn_claim_eligibility')
    .insert({
      claim_id: claim.id,
      product_version_id: claim.product_version_id,
      overall_result: overall,
      rule_results: traces,
      contribution_summary: {},
      entered_by: userCode,
      override_applied: anyOverrideApplied,
      override_by: anyOverrideApplied ? firstOverrideBy : null,
      override_reason: anyOverrideApplied ? overrideReasons.join(' | ') || 'Active approved override applied' : null,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;

  return {
    eligibilityId: inserted.id,
    overallResult: overall,
    rules: traces,
  };
}

// ─── Calculation ────────────────────────────────────────────────────

export interface CalculationRunResult {
  calculationId: string;
  weeklyRate: number | null;
  monthlyRate: number | null;
  lumpSum: number | null;
  averageWeeklyWage: number | null;
}

export async function runClaimCalculation(
  claimId: string,
  userCode: string,
  options: { allowWithoutPassingEligibility?: boolean } = {},
): Promise<CalculationRunResult> {
  const claim = await loadClaimContext(claimId);
  if (!claim.product_id) {
    throw new Error('Claim is missing product — cannot run calculation.');
  }
  await resolveEvaluationVersionId(claim);
  if (!claim.product_version_id) {
    throw new Error('Claim is missing product_version — cannot run calculation.');
  }

  // Precondition: latest eligibility must have passed (or override).
  if (!options.allowWithoutPassingEligibility) {
    const { data: latest } = await db
      .from('bn_claim_eligibility')
      .select('overall_result, override_applied')
      .eq('claim_id', claimId)
      .order('check_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) throw new Error('Run eligibility check before calculation.');
    if (!latest.overall_result && !latest.override_applied) {
      throw new Error('Eligibility did not pass — supervisor override required before calculation.');
    }
  }

  const out = await runCalculationEngine({
    claimId: claim.id,
    ssn: claim.ssn,
    productId: claim.product_id,
    productVersionId: claim.product_version_id,
    claimDate: claim.claim_date,
    countryCode: 'SKN',
    mode: 'LIVE',
    triggeredBy: userCode,
  });

  const formula = out.formulaResult;
  const wage = out.wageAggregation;

  const { data: inserted, error: insErr } = await db
    .from('bn_claim_calculation')
    .insert({
      claim_id: claim.id,
      product_version_id: claim.product_version_id,
      weekly_rate: formula?.finalWeeklyRate ?? null,
      monthly_rate: formula?.finalMonthlyRate ?? null,
      lump_sum: formula?.finalLumpSum ?? null,
      annual_rate: formula?.finalAnnualAmount ?? null,
      average_weekly_wage: (wage as any)?.averageWeeklyWage ?? null,
      total_contributions: (out.contributionWindow as any)?.totalWeeks ?? null,
      qualifying_weeks: (out.contributionWindow as any)?.qualifyingWeeks ?? null,
      formula_code: (formula as any)?.formulaCode ?? null,
      formula_version: (formula as any)?.formulaVersion ?? null,
      inputs: { wageAggregation: wage, contributionWindow: out.contributionWindow },
      outputs: { formulaResult: formula, paymentSchedule: out.paymentSchedule, trace: out.trace.slice(0, 200) },
      entered_by: userCode,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;

  return {
    calculationId: inserted.id,
    weeklyRate: formula?.finalWeeklyRate ?? null,
    monthlyRate: formula?.finalMonthlyRate ?? null,
    lumpSum: formula?.finalLumpSum ?? null,
    averageWeeklyWage: (wage as any)?.averageWeeklyWage ?? null,
  };
}

// ─── Decisions ──────────────────────────────────────────────────────

export type DecisionType = 'RECOMMENDATION' | 'APPROVED' | 'DENIED';

export async function createClaimDecision(args: {
  claimId: string;
  decisionType: DecisionType;
  userCode: string;
  narrative?: string;
  reasonCode?: string;
}): Promise<{ id: string }> {
  // Find latest calculation for amount snapshot (best effort).
  const { data: latestCalc } = await db
    .from('bn_claim_calculation')
    .select('id, weekly_rate, monthly_rate, lump_sum')
    .eq('claim_id', args.claimId)
    .order('calc_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await db
    .from('bn_claim_decision')
    .insert({
      claim_id: args.claimId,
      decision_type: args.decisionType,
      decision_date: new Date().toISOString(),
      decision_narrative: args.narrative ?? null,
      reason_code: args.reasonCode ?? null,
      calculation_id: latestCalc?.id ?? null,
      decided_by: args.userCode,
      entered_by: args.userCode,
    })
    .select('id')
    .single();
  if (error) throw error;

  // Mandatory audit: decision creation is a critical claim action.
  const { auditClaimAction } = await import('@/services/bn/audit/bnAuditService');
  await auditClaimAction({
    action:
      args.decisionType === 'APPROVED'
        ? 'APPROVE_CLAIM'
        : args.decisionType === 'DENIED'
          ? 'DENY_CLAIM'
          : 'SUBMIT_DECISION',
    entityType: 'bn_claim_decision',
    entityId: data.id,
    performedBy: args.userCode,
    afterValue: {
      claim_id: args.claimId,
      decision_type: args.decisionType,
      reason_code: args.reasonCode ?? null,
      calculation_id: latestCalc?.id ?? null,
    },
    notes: args.narrative ?? null,
    critical: true,
  });

  return { id: data.id };
}
