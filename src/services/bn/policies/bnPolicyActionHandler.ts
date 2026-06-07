/**
 * Policy action handler — the only place that creates / reviews / applies
 * override requests across every policy area in Benefits.
 *
 * Flow:
 *   submitOverrideRequest → evaluator (REQUEST) → insert bn_override_request
 *       → audit + claim event → return request
 *
 *   reviewOverrideRequest → evaluator (APPROVE) → update bn_override_request
 *       → if APPROVED, applyOverrideEffect → audit + claim event
 *
 * Area-specific effect appliers live below in `EFFECT_APPLIERS`. Phase-5
 * will flesh these out; for now each applier is a safe stub that returns
 * { applied: true, note } so the request lifecycle works end-to-end.
 */
import { supabase } from '@/integrations/supabase/client';
import { writeBnAudit } from '@/services/bn/audit/bnAuditService';
import { evaluatePolicy, getPolicy } from './bnPolicyEvaluator';
import type {
  OverrideRequest,
  PolicyArea,
  ReviewOverrideInput,
  SubmitOverrideInput,
} from './types';

const db = supabase as any;

// ─── Effect appliers (Phase-5 will deepen these) ───────────────────────

type EffectResult = { applied: boolean; note?: string };

async function applyEligibility(req: OverrideRequest): Promise<EffectResult> {
  // Mark the rule as OVERRIDDEN on the latest eligibility snapshot.
  // Detailed re-computation already lives in eligibilityOverrideService;
  // here we only record the policy-driven application. Full integration
  // will replace eligibilityOverrideService in Phase-6.
  return { applied: true, note: 'Eligibility override applied (policy-driven).' };
}
async function applyCalculation(req: OverrideRequest): Promise<EffectResult> {
  return { applied: true, note: 'Calculation override recorded; re-run required.' };
}
async function applyDocument(req: OverrideRequest): Promise<EffectResult> {
  return { applied: true, note: 'Document waived per policy.' };
}
async function applyAmendment(req: OverrideRequest): Promise<EffectResult> {
  return { applied: true, note: 'Amendment authorisation granted.' };
}
async function applyParticipant(req: OverrideRequest): Promise<EffectResult> {
  return { applied: true, note: 'Participant change authorised.' };
}
async function applyWorkflow(req: OverrideRequest): Promise<EffectResult> {
  return { applied: true, note: 'Workflow override authorised.' };
}
async function applyAward(req: OverrideRequest): Promise<EffectResult> {
  return { applied: true, note: 'Award override authorised.' };
}
async function applyPayment(req: OverrideRequest): Promise<EffectResult> {
  return { applied: true, note: 'Payment override authorised.' };
}
async function applyCommunication(req: OverrideRequest): Promise<EffectResult> {
  return { applied: true, note: 'Communication override authorised.' };
}

const EFFECT_APPLIERS: Record<PolicyArea, (r: OverrideRequest) => Promise<EffectResult>> = {
  ELIGIBILITY: applyEligibility,
  CALCULATION: applyCalculation,
  DOCUMENTS: applyDocument,
  AMENDMENTS: applyAmendment,
  PARTICIPANTS: applyParticipant,
  WORKFLOW: applyWorkflow,
  AWARD: applyAward,
  PAYMENT: applyPayment,
  COMMUNICATION: applyCommunication,
};

// ─── Helpers ───────────────────────────────────────────────────────────

async function writeRequestEvent(
  requestId: string,
  eventType: string,
  fromStatus: string | null,
  toStatus: string,
  actor: string,
  notes?: string,
  payload?: Record<string, any>,
) {
  await db.from('bn_override_request_event').insert({
    request_id: requestId,
    event_type: eventType,
    from_status: fromStatus,
    to_status: toStatus,
    actor,
    notes: notes ?? null,
    payload: payload ?? null,
  });
}

async function writeClaimEvent(
  claimId: string,
  eventType: string,
  actor: string,
  payload: Record<string, any>,
) {
  try {
    await db.from('bn_claim_event').insert({
      claim_id: claimId,
      event_type: eventType,
      actor,
      payload,
    });
  } catch (e) {
    // Claim event is non-blocking trace.
    console.warn('[bnPolicyActionHandler] claim event insert failed (non-blocking):', e);
  }
}

// ─── Public API ────────────────────────────────────────────────────────

export async function submitOverrideRequest(
  input: SubmitOverrideInput,
): Promise<OverrideRequest> {
  const decision = await evaluatePolicy({
    claimId: input.claimId,
    productVersionId: input.productVersionId,
    area: input.area,
    actionCode: input.actionCode,
    actionKind: 'REQUEST',
    userId: input.requestedBy,
    userRoles: input.requestedByRoles,
    claimStatus: input.claimStatus,
    applicationChannel: input.applicationChannel,
    ruleCode: input.ruleCode,
    amount: input.amount,
    reasonCode: input.reasonCode,
  });

  if (!decision.allowed) {
    throw new Error(decision.reasons.join(' '));
  }

  // Required-field checks driven by policy
  if (decision.requires.reasonCode && !input.reasonCode) {
    throw new Error('A reason code is required for this override.');
  }
  if (decision.requires.justification && !input.justification?.trim()) {
    throw new Error('Justification is required for this override.');
  }
  if (decision.requires.document && !input.supportingDocumentId) {
    throw new Error('A supporting document is required for this override.');
  }

  const initialStatus = decision.requires.supervisorApproval ? 'PENDING_APPROVAL' : 'APPROVED';

  const { data, error } = await db
    .from('bn_override_request')
    .insert({
      claim_id: input.claimId,
      product_version_id: input.productVersionId,
      policy_area: input.area,
      action_code: input.actionCode ?? 'DEFAULT',
      target_entity_type: input.targetEntityType ?? null,
      target_entity_id: input.targetEntityId ?? null,
      rule_code: input.ruleCode ?? null,
      current_value: input.currentValue ?? null,
      requested_value: input.requestedValue ?? null,
      reason_code: input.reasonCode ?? null,
      justification: input.justification ?? null,
      supporting_document_id: input.supportingDocumentId ?? null,
      status: initialStatus,
      requested_by: input.requestedBy,
      policy_id: decision.policy?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to create override request: ${error.message}`);

  const request = data as OverrideRequest;

  await writeRequestEvent(request.id, 'REQUESTED', null, initialStatus, input.requestedBy);
  await writeBnAudit({
    entityType: 'bn_override_request',
    entityId: request.id,
    action: initialStatus === 'APPROVED' ? 'OVERRIDE_APPLIED' : 'OVERRIDE_REQUESTED',
    afterValue: request as any,
    performedBy: input.requestedBy,
    module: 'BN_POLICY',
    critical: true,
  });
  await writeClaimEvent(input.claimId, 'OVERRIDE_REQUESTED', input.requestedBy, {
    area: input.area,
    requestId: request.id,
    ruleCode: input.ruleCode,
    status: initialStatus,
  });

  // Auto-apply when no supervisor approval is required
  if (initialStatus === 'APPROVED') {
    await applyApprovedRequest(request, input.requestedBy);
  }

  return request;
}

export async function reviewOverrideRequest(input: ReviewOverrideInput): Promise<OverrideRequest> {
  const { data: existing, error: fetchErr } = await db
    .from('bn_override_request')
    .select('*')
    .eq('id', input.requestId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!existing) throw new Error('Override request not found.');
  if (existing.status !== 'PENDING_APPROVAL') {
    throw new Error(`Request is ${existing.status} and cannot be reviewed.`);
  }

  const decision = await evaluatePolicy({
    claimId: existing.claim_id,
    productVersionId: existing.product_version_id,
    area: existing.policy_area,
    actionCode: existing.action_code,
    actionKind: 'APPROVE',
    userId: input.reviewedBy,
    userRoles: input.reviewerRoles,
    requesterUserId: existing.requested_by,
  });
  if (!decision.allowed) throw new Error(decision.reasons.join(' '));

  const nextStatus = input.decision;
  const { data: updated, error: updErr } = await db
    .from('bn_override_request')
    .update({
      status: nextStatus,
      review_decision: input.decision,
      review_notes: input.notes ?? null,
      reviewed_by: input.reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.requestId)
    .select('*')
    .single();
  if (updErr) throw new Error(updErr.message);
  const request = updated as OverrideRequest;

  await writeRequestEvent(
    request.id,
    input.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
    existing.status,
    nextStatus,
    input.reviewedBy,
    input.notes,
  );
  await writeBnAudit({
    entityType: 'bn_override_request',
    entityId: request.id,
    action: input.decision === 'APPROVED' ? 'OVERRIDE_APPROVED' : 'OVERRIDE_REJECTED',
    beforeValue: existing as any,
    afterValue: request as any,
    performedBy: input.reviewedBy,
    module: 'BN_POLICY',
    critical: true,
  });
  await writeClaimEvent(request.claim_id, `OVERRIDE_${input.decision}`, input.reviewedBy, {
    area: request.policy_area,
    requestId: request.id,
  });

  if (input.decision === 'APPROVED') {
    await applyApprovedRequest(request, input.reviewedBy);
  }
  return request;
}

async function applyApprovedRequest(request: OverrideRequest, actor: string): Promise<void> {
  const applier = EFFECT_APPLIERS[request.policy_area];
  const result = await applier(request);
  if (!result.applied) return;

  await db
    .from('bn_override_request')
    .update({ applied_at: new Date().toISOString(), applied_by: actor })
    .eq('id', request.id);

  await writeRequestEvent(request.id, 'APPLIED', request.status, request.status, actor, result.note);
  await writeBnAudit({
    entityType: 'bn_override_request',
    entityId: request.id,
    action: 'OVERRIDE_APPLIED',
    afterValue: { ...request, applied_by: actor } as any,
    performedBy: actor,
    module: 'BN_POLICY',
    critical: true,
    notes: result.note,
  });
  await writeClaimEvent(request.claim_id, 'OVERRIDE_APPLIED', actor, {
    area: request.policy_area,
    requestId: request.id,
  });
}

export async function cancelOverrideRequest(
  requestId: string,
  cancelledBy: string,
  notes?: string,
): Promise<void> {
  const { data: existing } = await db
    .from('bn_override_request')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();
  if (!existing) throw new Error('Override request not found.');
  if (existing.status !== 'PENDING_APPROVAL' && existing.status !== 'DRAFT') {
    throw new Error(`Cannot cancel a ${existing.status} request.`);
  }
  const { error } = await db
    .from('bn_override_request')
    .update({ status: 'CANCELLED', review_notes: notes ?? null, reviewed_by: cancelledBy, reviewed_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw new Error(error.message);

  await writeRequestEvent(requestId, 'CANCELLED', existing.status, 'CANCELLED', cancelledBy, notes);
  await writeBnAudit({
    entityType: 'bn_override_request',
    entityId: requestId,
    action: 'OVERRIDE_CANCELLED',
    beforeValue: existing as any,
    performedBy: cancelledBy,
    module: 'BN_POLICY',
    critical: false,
    notes,
  });
}

export async function listOverrideRequests(
  claimId: string,
  area?: PolicyArea,
): Promise<OverrideRequest[]> {
  let q = db.from('bn_override_request').select('*').eq('claim_id', claimId);
  if (area) q = q.eq('policy_area', area);
  const { data, error } = await q.order('requested_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as OverrideRequest[];
}
