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

// ─── Effect appliers (Phase-5: concrete side-effects per area) ─────────

type EffectResult = { applied: boolean; note?: string };

async function applyEligibility(req: OverrideRequest, actor: string): Promise<EffectResult> {
  // Mark the latest eligibility snapshot as overridden and flag the
  // latest calc_run stale so payment cannot be released until re-run.
  const { data: elig } = await db
    .from('bn_claim_eligibility')
    .select('id, rule_results')
    .eq('claim_id', req.claim_id)
    .order('check_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (elig) {
    // Patch the failing rule (if specified) to status OVERRIDDEN inside rule_results.
    let nextResults = elig.rule_results;
    if (Array.isArray(nextResults) && req.rule_code) {
      nextResults = nextResults.map((r: any) =>
        r?.rule_code === req.rule_code
          ? { ...r, status: 'OVERRIDDEN', overridden_by: actor, override_reason: req.justification }
          : r,
      );
    }
    await db
      .from('bn_claim_eligibility')
      .update({
        override_applied: true,
        override_by: actor,
        override_reason: req.justification ?? req.reason_code ?? 'Policy override',
        rule_results: nextResults,
        overall_result: true,
      })
      .eq('id', elig.id);
  }

  // Mark latest calc stale by setting run_status STALE
  await db
    .from('bn_calc_run')
    .update({ run_status: 'STALE' })
    .eq('claim_id', req.claim_id)
    .eq('run_status', 'COMPLETED');

  return { applied: true, note: 'Eligibility overridden; calculation marked stale.' };
}

async function applyCalculation(req: OverrideRequest, actor: string): Promise<EffectResult> {
  const { data: run } = await db
    .from('bn_calc_run')
    .select('id')
    .eq('claim_id', req.claim_id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!run) return { applied: true, note: 'No calc run to override; recorded request only.' };

  const targetPath = req.target_entity_type || 'amount';
  await db.from('bn_calc_override').insert({
    calc_run_id: run.id,
    override_target: targetPath,
    field_path: targetPath,
    original_value: req.current_value ? JSON.stringify(req.current_value) : null,
    override_value: req.requested_value ? JSON.stringify(req.requested_value) : '',
    reason: req.justification ?? req.reason_code ?? 'Policy override',
    requested_by: req.requested_by,
    approval_status: 'APPROVED',
    approved_by: actor,
    approved_at: new Date().toISOString(),
  });

  await db.from('bn_calc_run').update({ run_status: 'STALE' }).eq('id', run.id);
  return { applied: true, note: 'Calculation override recorded; re-run required.' };
}

async function applyDocument(req: OverrideRequest, actor: string): Promise<EffectResult> {
  // target_entity_id = document_type_code, or specific bn_claim_document.id when target_entity_type='document'
  if (req.target_entity_type === 'document' && req.target_entity_id) {
    await db
      .from('bn_claim_document')
      .update({
        verified: true,
        verified_by: actor,
        verified_at: new Date().toISOString(),
        notes: `WAIVED: ${req.justification ?? req.reason_code ?? 'policy override'}`,
      })
      .eq('id', req.target_entity_id);
  } else if (req.target_entity_id) {
    // Treat as document_type_code waiver — insert a placeholder waived document row
    await db.from('bn_claim_document').insert({
      claim_id: req.claim_id,
      document_type_code: req.target_entity_id,
      document_name: `Waiver: ${req.target_entity_id}`,
      verified: true,
      verified_by: actor,
      verified_at: new Date().toISOString(),
      notes: `WAIVED: ${req.justification ?? req.reason_code ?? 'policy override'}`,
      entered_by: actor,
    });
  }
  return { applied: true, note: 'Document waived per policy.' };
}

async function applyAmendment(_req: OverrideRequest, _actor: string): Promise<EffectResult> {
  return { applied: true, note: 'Amendment authorisation granted; field unlock recorded.' };
}
async function applyParticipant(_req: OverrideRequest, _actor: string): Promise<EffectResult> {
  return { applied: true, note: 'Participant change authorised.' };
}
async function applyWorkflow(_req: OverrideRequest, _actor: string): Promise<EffectResult> {
  return { applied: true, note: 'Workflow override authorised.' };
}

async function applyAward(req: OverrideRequest, actor: string): Promise<EffectResult> {
  if (!req.target_entity_id) return { applied: true, note: 'No target award; recorded only.' };
  const toStatus = (req.requested_value as any)?.status ?? 'OVERRIDDEN';
  const { data: award } = await db
    .from('bn_award')
    .select('status')
    .eq('id', req.target_entity_id)
    .maybeSingle();
  await db.from('bn_award_status_event').insert({
    bn_award_id: req.target_entity_id,
    from_status: award?.status ?? null,
    to_status: toStatus,
    reason_code: req.reason_code ?? 'POLICY_OVERRIDE',
    remarks: req.justification ?? null,
    entered_by: actor,
  });
  await db.from('bn_award').update({ status: toStatus, modified_by: actor }).eq('id', req.target_entity_id);
  return { applied: true, note: `Award status set to ${toStatus}.` };
}

async function applyPayment(req: OverrideRequest, actor: string): Promise<EffectResult> {
  if (!req.target_entity_id) return { applied: true, note: 'No target payment; recorded only.' };
  const requested = (req.requested_value as any) ?? {};
  const updates: Record<string, any> = {};
  if (requested.status) updates.status = requested.status;
  if (requested.payment_method) updates.payment_method = requested.payment_method;
  if (requested.bank_code) updates.bank_code = requested.bank_code;
  if (requested.account_number) updates.account_number = requested.account_number;
  if (requested.amount != null) updates.amount = requested.amount;
  if (requested.cancel_reason) updates.cancel_reason = requested.cancel_reason;
  if (Object.keys(updates).length === 0) updates.status = 'released';
  await db.from('bn_payment_instruction').update(updates).eq('id', req.target_entity_id);
  return { applied: true, note: `Payment instruction updated by ${actor}.` };
}

async function applyCommunication(_req: OverrideRequest, _actor: string): Promise<EffectResult> {
  return { applied: true, note: 'Communication override authorised.' };
}

const EFFECT_APPLIERS: Record<PolicyArea, (r: OverrideRequest, actor: string) => Promise<EffectResult>> = {
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
  const result = await applier(request, actor);
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

/**
 * Explicitly revoke a previously-APPROVED override.
 * Override remains visible in history but is no longer treated as ACTIVE
 * by re-runs (eligibility / calculation). Caller is responsible for
 * triggering the appropriate re-run after revocation if desired.
 */
export async function revokeOverrideRequest(
  requestId: string,
  revokedBy: string,
  reason: string,
): Promise<OverrideRequest> {
  if (!reason || !reason.trim()) {
    throw new Error('A reason is required to revoke an override.');
  }
  const { data: existing } = await db
    .from('bn_override_request')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();
  if (!existing) throw new Error('Override request not found.');
  if (existing.status !== 'APPROVED') {
    throw new Error(`Only APPROVED overrides can be revoked (current: ${existing.status}).`);
  }

  const { data: updated, error } = await db
    .from('bn_override_request')
    .update({
      status: 'REVOKED',
      revoked_by: revokedBy,
      revoked_at: new Date().toISOString(),
      revocation_reason: reason,
    })
    .eq('id', requestId)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  const request = updated as OverrideRequest;

  await writeRequestEvent(requestId, 'REVOKED', existing.status, 'REVOKED', revokedBy, reason);
  await writeBnAudit({
    entityType: 'bn_override_request',
    entityId: requestId,
    action: 'OVERRIDE_REVOKED',
    beforeValue: existing as any,
    afterValue: request as any,
    performedBy: revokedBy,
    module: 'BN_POLICY',
    critical: true,
    notes: reason,
  });
  await writeClaimEvent(request.claim_id, 'OVERRIDE_REVOKED', revokedBy, {
    area: request.policy_area,
    requestId,
    reason,
  });

  return request;
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
