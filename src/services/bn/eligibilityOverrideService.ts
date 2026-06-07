/**
 * Eligibility Override Service
 *
 * Controlled maker-checker workflow for overriding failed eligibility rules
 * on a benefit claim. Failures are never silently flipped to passes — an
 * Officer requests an override, a Supervisor (or Admin) reviews it, and only
 * an APPROVED request causes the eligibility result to be recomputed as
 * "Passed with Override".
 *
 * Reads/Writes:
 *   - bn_eligibility_override_request (this module's ledger)
 *   - bn_claim_eligibility            (applies the override on approval)
 *   - bn_claim_event                  (claim-level domain audit)
 *   - system_audit_trail              (system-wide audit)
 *
 * Reason codes come from bn_reason_code (category = 'ELIGIBILITY_OVERRIDE').
 * Product-version policy lives on bn_product_version.* override_* columns.
 */
import { supabase } from '@/integrations/supabase/client';

export type OverrideScope = 'THIS_RULE_ONLY' | 'RULE_GROUP' | 'FULL_ELIGIBILITY';
export type OverrideStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type OverrideDecision = 'APPROVED' | 'REJECTED';

export interface RequestOverrideInput {
  claimId: string;
  eligibilityResultId?: string | null;
  ruleCode: string;
  ruleGroupCode?: string | null;
  fieldKey?: string | null;
  sourceTable?: string | null;
  sourceRecordId?: string | null;
  actualValue?: unknown;
  expectedValue?: unknown;
  operator?: string | null;
  overrideScope: OverrideScope;
  reasonCode: string;
  justification: string;
  supportingDocumentId?: string | null;
  requestedBy: string;
}

export interface EligibilityOverrideRow {
  id: string;
  claim_id: string;
  eligibility_result_id: string | null;
  rule_code: string;
  rule_group_code: string | null;
  field_key: string | null;
  source_table: string | null;
  source_record_id: string | null;
  actual_value: unknown;
  expected_value: unknown;
  operator: string | null;
  override_scope: OverrideScope;
  reason_code: string;
  justification: string;
  supporting_document_id: string | null;
  status: OverrideStatus;
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_decision: OverrideDecision | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = 'bn_eligibility_override_request' as const;
const db = supabase as any;

// --- Audit helpers --------------------------------------------------------
async function writeClaimEvent(
  claimId: string,
  eventType: string,
  performedBy: string,
  notes: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await db.from('bn_claim_event').insert({
    claim_id: claimId,
    event_type: eventType,
    performed_by: performedBy,
    notes,
    metadata,
  });
}

async function writeAudit(
  entityId: string,
  action: string,
  userName: string,
  severity: 'info' | 'warn' | 'error',
  payload: Record<string, unknown>,
  before?: unknown,
  after?: unknown,
): Promise<void> {
  await db.from('system_audit_trail').insert({
    entity_type: 'bn_eligibility_override_request',
    entity_id: entityId,
    module: 'BN',
    action,
    severity,
    user_name: userName,
    payload_json: payload,
    before_value: before ?? null,
    after_value: after ?? null,
  });
}

// --- Reads ----------------------------------------------------------------
export async function listClaimOverrides(claimId: string): Promise<EligibilityOverrideRow[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('claim_id', claimId)
    .order('requested_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as EligibilityOverrideRow[];
}

export interface ProductOverridePolicy {
  allow_eligibility_override: boolean;
  override_requires_supervisor: boolean;
  override_requires_document: boolean;
  override_allowed_rule_codes: string[];
  override_blocked_rule_codes: string[];
}

export async function loadOverridePolicy(productVersionId: string): Promise<ProductOverridePolicy | null> {
  const { data, error } = await db
    .from('bn_product_version')
    .select(
      'allow_eligibility_override, override_requires_supervisor, override_requires_document, override_allowed_rule_codes, override_blocked_rule_codes',
    )
    .eq('id', productVersionId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProductOverridePolicy;
}

export function isRuleOverrideable(policy: ProductOverridePolicy | null, ruleCode: string): boolean {
  if (!policy) return true; // default permissive when no policy row
  if (!policy.allow_eligibility_override) return false;
  if (policy.override_blocked_rule_codes?.includes(ruleCode)) return false;
  if (policy.override_allowed_rule_codes?.length > 0) {
    return policy.override_allowed_rule_codes.includes(ruleCode);
  }
  return true;
}

export async function listOverrideReasonCodes(): Promise<Array<{ code: string; label: string }>> {
  const { data, error } = await db
    .from('bn_reason_code')
    .select('reason_code, reason_label, is_active')
    .eq('reason_category', 'ELIGIBILITY_OVERRIDE')
    .eq('is_active', true)
    .order('reason_label');
  if (error) return [];
  return (data ?? []).map((r: any) => ({ code: r.reason_code, label: r.reason_label }));
}

// --- Writes ---------------------------------------------------------------
export async function requestOverride(input: RequestOverrideInput): Promise<string> {
  if (!input.reasonCode) throw new Error('Reason code is required.');
  if (!input.justification || input.justification.trim().length < 10) {
    throw new Error('Please provide a justification of at least 10 characters.');
  }

  const row = {
    claim_id: input.claimId,
    eligibility_result_id: input.eligibilityResultId ?? null,
    rule_code: input.ruleCode,
    rule_group_code: input.ruleGroupCode ?? null,
    field_key: input.fieldKey ?? null,
    source_table: input.sourceTable ?? null,
    source_record_id: input.sourceRecordId ?? null,
    actual_value: input.actualValue ?? null,
    expected_value: input.expectedValue ?? null,
    operator: input.operator ?? null,
    override_scope: input.overrideScope,
    reason_code: input.reasonCode,
    justification: input.justification.trim(),
    supporting_document_id: input.supportingDocumentId ?? null,
    status: 'PENDING' as const,
    requested_by: input.requestedBy,
  };

  const { data, error } = await db.from(TABLE).insert(row).select('id').single();
  if (error) throw error;
  const id = (data as any).id as string;

  await Promise.all([
    writeClaimEvent(
      input.claimId,
      'ELIGIBILITY_OVERRIDE_REQUESTED',
      input.requestedBy,
      `Override requested for rule ${input.ruleCode} (scope: ${input.overrideScope})`,
      { override_request_id: id, rule_code: input.ruleCode, reason_code: input.reasonCode, scope: input.overrideScope },
    ),
    writeAudit(id, 'ELIGIBILITY_OVERRIDE_REQUESTED', input.requestedBy, 'info', {
      claim_id: input.claimId,
      rule_code: input.ruleCode,
      reason_code: input.reasonCode,
      scope: input.overrideScope,
      justification: input.justification,
    }, null, row),
  ]);

  return id;
}

export async function cancelOverride(requestId: string, userCode: string, note?: string): Promise<void> {
  const { data: before, error: be } = await db.from(TABLE).select('*').eq('id', requestId).maybeSingle();
  if (be || !before) throw be ?? new Error('Override request not found.');
  if (before.status !== 'PENDING') throw new Error('Only pending requests can be cancelled.');
  if (before.requested_by !== userCode) throw new Error('Only the original requester can cancel this request.');

  const { error } = await db
    .from(TABLE)
    .update({ status: 'CANCELLED', review_notes: note ?? null })
    .eq('id', requestId);
  if (error) throw error;

  await Promise.all([
    writeClaimEvent(before.claim_id, 'ELIGIBILITY_OVERRIDE_CANCELLED', userCode, note ?? 'Override request cancelled.', {
      override_request_id: requestId,
      rule_code: before.rule_code,
    }),
    writeAudit(requestId, 'ELIGIBILITY_OVERRIDE_CANCELLED', userCode, 'info', { note }, before, { ...before, status: 'CANCELLED' }),
  ]);
}

export async function reviewOverride(
  requestId: string,
  decision: OverrideDecision,
  reviewedBy: string,
  reviewNotes?: string,
  reviewerRoles: string[] = [],
): Promise<void> {
  const { data: before, error: be } = await db.from(TABLE).select('*').eq('id', requestId).maybeSingle();
  if (be || !before) throw be ?? new Error('Override request not found.');
  if (before.status !== 'PENDING') throw new Error('This request has already been reviewed.');
  if (before.requested_by === reviewedBy) {
    // Self-approval is controlled by the product's ELIGIBILITY approval policy
    // (bn_approval_policy.self_approval_allowed) — never by a hardcoded role.
    let selfApprovalAllowed = false;
    try {
      const { data: pv } = await db
        .from('bn_claim')
        .select('product_version_id')
        .eq('id', before.claim_id)
        .maybeSingle();
      const productVersionId = pv?.product_version_id;
      if (productVersionId) {
        const { data: pol } = await db
          .from('bn_approval_policy')
          .select('self_approval_allowed,is_enabled')
          .eq('product_version_id', productVersionId)
          .eq('policy_area', 'ELIGIBILITY')
          .eq('action_code', 'DEFAULT')
          .maybeSingle();
        selfApprovalAllowed = !!pol?.is_enabled && !!pol?.self_approval_allowed;
      }
    } catch {
      // fall through — selfApprovalAllowed stays false
    }
    if (!selfApprovalAllowed) {
      throw new Error('Maker-checker: a different reviewer must approve this override (self-approval is disabled for this product).');
    }
  }

  const newStatus: OverrideStatus = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
  const { error } = await db
    .from(TABLE)
    .update({
      status: newStatus,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_decision: decision,
      review_notes: reviewNotes ?? null,
    })
    .eq('id', requestId);
  if (error) throw error;

  if (decision === 'APPROVED') {
    await applyOverrideToEligibility(before, reviewedBy, reviewNotes);
  }

  const eventType =
    decision === 'APPROVED' ? 'ELIGIBILITY_OVERRIDE_APPROVED' : 'ELIGIBILITY_OVERRIDE_REJECTED';
  await Promise.all([
    writeClaimEvent(
      before.claim_id,
      eventType,
      reviewedBy,
      reviewNotes ?? `Override ${decision.toLowerCase()} for rule ${before.rule_code}.`,
      { override_request_id: requestId, rule_code: before.rule_code, decision },
    ),
    writeAudit(
      requestId,
      eventType,
      reviewedBy,
      decision === 'APPROVED' ? 'warn' : 'info',
      { decision, notes: reviewNotes, rule_code: before.rule_code, claim_id: before.claim_id },
      before,
      { ...before, status: newStatus, reviewed_by: reviewedBy, review_decision: decision },
    ),
  ]);
}

// --- Apply override -------------------------------------------------------
async function applyOverrideToEligibility(
  req: EligibilityOverrideRow,
  reviewedBy: string,
  reviewNotes?: string,
): Promise<void> {
  // Find target eligibility row: explicit id, else latest for the claim.
  let resultId = req.eligibility_result_id;
  let resultRow: any = null;
  if (resultId) {
    const { data } = await db.from('bn_claim_eligibility').select('*').eq('id', resultId).maybeSingle();
    resultRow = data;
  }
  if (!resultRow) {
    const { data } = await db
      .from('bn_claim_eligibility')
      .select('*')
      .eq('claim_id', req.claim_id)
      .order('check_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    resultRow = data;
    resultId = data?.id ?? null;
  }
  if (!resultRow) return; // nothing to amend

  const rules: any[] = Array.isArray(resultRow.rule_results) ? resultRow.rule_results : [];
  let anyChange = false;
  const nextRules = rules.map((r: any) => {
    const match =
      req.override_scope === 'FULL_ELIGIBILITY' ||
      (req.override_scope === 'RULE_GROUP' && req.rule_group_code && r.rule_group_code === req.rule_group_code) ||
      (req.override_scope === 'THIS_RULE_ONLY' && r.rule_code === req.rule_code);
    if (!match || r.passed) return r;
    anyChange = true;
    return {
      ...r,
      passed: true,
      result_state: 'OVERRIDDEN',
      override_request_id: req.id,
      override_reason_code: req.reason_code,
      override_by: reviewedBy,
      override_at: new Date().toISOString(),
      message: (r.message ?? '') + ` [OVERRIDDEN — ${req.reason_code}]`,
    };
  });

  const remainingBlockingFailure = nextRules.some(
    (r: any) => !r.passed && r.fail_action !== 'WARN' && r.result_state !== 'WAIVED',
  );
  const newOverall = !remainingBlockingFailure;

  const noteSuffix = reviewNotes ? ` — ${reviewNotes}` : '';
  await db
    .from('bn_claim_eligibility')
    .update({
      rule_results: nextRules,
      overall_result: newOverall,
      override_applied: true,
      override_by: reviewedBy,
      override_reason: `${req.reason_code}: ${req.justification}${noteSuffix}`,
    })
    .eq('id', resultId as string);

  if (anyChange) {
    await db
      .from('bn_claim')
      .update({ calculation_stale: true })
      .eq('id', req.claim_id);
  }
}
