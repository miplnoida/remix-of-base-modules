/**
 * Amendment policy resolver + correction workflow service.
 * Reads:  bn_product_amendment_policy, bn_claim_field_ownership
 * Writes: bn_claim_correction_request/_field, system_audit_trail
 *         (amendments go through RPC bn_record_claim_amendment for atomic audit)
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  AmendmentPolicy,
  AmendmentLogRow,
  ApplicationChannel,
  AreaEditability,
  ClaimEditability,
  CorrectionFieldRow,
  CorrectionRequestRow,
  FieldArea,
  FieldOwnership,
} from '@/types/bn/amendment';

const VALID_CHANNELS: ApplicationChannel[] = [
  'PUBLIC_ONLINE',
  'STAFF_OFFLINE',
  'ASSISTED_COUNTER',
  'BACK_OFFICE_ENTRY',
  'MIGRATED_LEGACY',
];

export function normalizeChannel(value: unknown): ApplicationChannel {
  if (typeof value === 'string') {
    const up = value.toUpperCase().replace(/-/g, '_');
    if ((VALID_CHANNELS as string[]).includes(up)) return up as ApplicationChannel;
  }
  // Legacy / missing channel → treat as staff offline for officers' UX,
  // but flagged in banner.
  return 'STAFF_OFFLINE';
}

const TERMINAL_STATUSES = new Set(['APPROVED', 'PAID', 'CLOSED', 'REJECTED']);

/**
 * Decide whether the given area is still editable given the policy +
 * channel + status. The rules below intentionally err on the side of
 * "show a correction request" for public-online channels.
 */
function computeAreaEditability(
  area: FieldArea,
  channel: ApplicationChannel,
  status: string,
  policy: AmendmentPolicy | null,
): AreaEditability {
  if (!policy) {
    return { editable: false, lockedReason: 'No amendment policy configured for this product version.' };
  }

  const stageMap: Record<FieldArea, string> = {
    PARTICIPANTS: policy.participant_details_editable_until,
    BENEFIT_FACTS: policy.benefit_facts_editable_until,
    DOCUMENTS: policy.document_details_editable_until,
    PAYMENT: policy.payment_details_editable_until,
    CALC_INPUTS: policy.calculation_inputs_editable_until,
    DECISION: policy.editable_until_status,
  };
  const editableUntil = stageMap[area];

  // Hard locks
  if (status === 'PAID' && policy.lock_after_payment) {
    return { editable: false, lockedReason: 'Locked after payment.' };
  }
  if (status === 'APPROVED' && policy.lock_after_approval && area !== 'PAYMENT') {
    return { editable: false, lockedReason: 'Locked after approval.' };
  }
  if (status === 'DECISION_DONE' && policy.lock_after_decision) {
    return { editable: false, lockedReason: 'Locked after decision.' };
  }
  if (TERMINAL_STATUSES.has(status) && status !== 'PAID') {
    return { editable: false, lockedReason: `Claim is ${status}; only formal reopen can amend.` };
  }

  // Channel rules
  if (channel === 'PUBLIC_ONLINE') {
    // applicant facts in BENEFIT_FACTS / PARTICIPANTS require correction workflow
    if (area === 'BENEFIT_FACTS' || area === 'PARTICIPANTS') {
      return {
        editable: false,
        requiresCorrection: true,
        lockedReason: 'Public online claim — applicant-submitted fields require a correction request.',
      };
    }
  }
  if (channel === 'MIGRATED_LEGACY') {
    return {
      editable: false,
      lockedReason: 'Migrated/legacy claim — supervisor-only amendments with mandatory reason.',
    };
  }
  if (!policy.allow_officer_amendments && area !== 'DOCUMENTS') {
    return { editable: false, lockedReason: 'Officer amendments disabled by policy.' };
  }

  // Editable-until-status gate (best-effort string compare)
  if (editableUntil && status && status !== editableUntil && TERMINAL_STATUSES.has(status)) {
    return { editable: false, lockedReason: `Editable only until ${editableUntil}.` };
  }

  return { editable: true };
}

export async function getAmendmentPolicy(productVersionId: string | null | undefined): Promise<AmendmentPolicy | null> {
  if (!productVersionId) return null;
  const { data, error } = await supabase
    .from('bn_product_amendment_policy')
    .select('*')
    .eq('product_version_id', productVersionId)
    .maybeSingle();
  if (error) return null;
  return (data as AmendmentPolicy) ?? null;
}

export async function getFieldOwnership(productVersionId: string | null | undefined): Promise<FieldOwnership[]> {
  if (!productVersionId) return [];
  const { data, error } = await supabase
    .from('bn_claim_field_ownership')
    .select('*')
    .eq('product_version_id', productVersionId);
  if (error) return [];
  return (data ?? []) as FieldOwnership[];
}

export async function resolveClaimEditability(
  claimId: string | null | undefined,
): Promise<ClaimEditability | null> {
  if (!claimId) return null;
  const { data: claim, error } = await supabase
    .from('bn_claim')
    .select('id, status, application_channel, product_version_id')
    .eq('id', claimId)
    .maybeSingle();
  if (error || !claim) return null;

  const channel = normalizeChannel((claim as any).application_channel);
  const status = (claim as any).status ?? 'DRAFT';
  const policy = await getAmendmentPolicy((claim as any).product_version_id);

  const areas: FieldArea[] = ['PARTICIPANTS', 'BENEFIT_FACTS', 'DOCUMENTS', 'PAYMENT', 'CALC_INPUTS', 'DECISION'];
  const areaMap: Record<FieldArea, AreaEditability> = {} as any;
  const lockedReasons: string[] = [];
  for (const a of areas) {
    const r = computeAreaEditability(a, channel, status, policy);
    areaMap[a] = r;
    if (!r.editable && r.lockedReason) lockedReasons.push(`${a}: ${r.lockedReason}`);
  }

  return {
    channel,
    status,
    policy,
    areas: areaMap,
    lockedReasons,
    canRequestCorrection: channel === 'PUBLIC_ONLINE' && !!policy?.allow_public_corrections,
    canSupervisorOverride: !!policy?.requires_supervisor_approval_for_locked_changes,
    anyEditable: Object.values(areaMap).some((a) => a.editable),
  };
}

// ─── Amendment write (atomic via RPC) ────────────────────────────────

export interface RecordAmendmentInput {
  claimId: string;
  fieldKey: string;
  fieldArea: FieldArea;
  before: unknown;
  after: unknown;
  reason?: string;
  userCode: string;
  channel: ApplicationChannel;
  statusAtChange: string;
  approvalStatus?: 'APPLIED' | 'PENDING_APPROVAL';
  affectsEligibility?: boolean;
  affectsCalculation?: boolean;
}

export async function recordAmendment(input: RecordAmendmentInput): Promise<string> {
  const { data, error } = await supabase.rpc('bn_record_claim_amendment' as any, {
    p_claim_id: input.claimId,
    p_field_key: input.fieldKey,
    p_field_area: input.fieldArea,
    p_before: input.before as any,
    p_after: input.after as any,
    p_reason: input.reason ?? null,
    p_user_code: input.userCode,
    p_channel: input.channel,
    p_status_at_change: input.statusAtChange,
    p_approval_status: input.approvalStatus ?? 'APPLIED',
    p_affects_eligibility: !!input.affectsEligibility,
    p_affects_calculation: !!input.affectsCalculation,
  });
  if (error) throw error;
  return data as unknown as string;
}

export async function listAmendmentLog(claimId: string): Promise<AmendmentLogRow[]> {
  const { data, error } = await supabase
    .from('bn_claim_amendment_log')
    .select('*')
    .eq('claim_id', claimId)
    .order('amended_at', { ascending: false })
    .limit(500);
  if (error) return [];
  return (data ?? []) as AmendmentLogRow[];
}

// ─── Correction workflow ────────────────────────────────────────────

export interface CreateCorrectionInput {
  claimId: string;
  requestedBy: string;
  message: string;
  fields: { field_key: string; field_label?: string; current_value?: unknown }[];
  channel: ApplicationChannel;
}

export async function createCorrectionRequest(input: CreateCorrectionInput): Promise<string> {
  const { data: req, error: e1 } = await supabase
    .from('bn_claim_correction_request')
    .insert({
      claim_id: input.claimId,
      requested_by: input.requestedBy,
      message: input.message,
      source_channel: input.channel,
      status: 'PENDING',
    })
    .select('id')
    .single();
  if (e1) throw e1;

  if (input.fields.length > 0) {
    const rows = input.fields.map((f) => ({
      request_id: (req as any).id,
      field_key: f.field_key,
      field_label: f.field_label ?? null,
      current_value: (f.current_value ?? null) as any,
      field_status: 'PENDING' as const,
    }));
    const { error: e2 } = await supabase.from('bn_claim_correction_field').insert(rows);
    if (e2) throw e2;
  }

  // audit (non-blocking — best-effort)
  await supabase.from('system_audit_trail').insert({
    entity_type: 'bn_claim',
    entity_id: input.claimId,
    action: 'REQUEST_CORRECTION',
    severity: 'info',
    user_code: input.requestedBy,
    details: { request_id: (req as any).id, message: input.message, fields: input.fields.map((f) => f.field_key) },
  } as any);

  return (req as any).id as string;
}

export async function listCorrectionRequests(claimId: string): Promise<CorrectionRequestRow[]> {
  const { data, error } = await supabase
    .from('bn_claim_correction_request')
    .select('*')
    .eq('claim_id', claimId)
    .order('requested_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as CorrectionRequestRow[];
}

export async function listCorrectionFields(requestId: string): Promise<CorrectionFieldRow[]> {
  const { data, error } = await supabase
    .from('bn_claim_correction_field')
    .select('*')
    .eq('request_id', requestId);
  if (error) return [];
  return (data ?? []) as CorrectionFieldRow[];
}

export async function reviewCorrection(
  requestId: string,
  decision: 'ACCEPTED' | 'REJECTED',
  reviewedBy: string,
  notes?: string,
): Promise<void> {
  const { error } = await supabase
    .from('bn_claim_correction_request')
    .update({
      status: decision,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: notes ?? null,
    })
    .eq('id', requestId);
  if (error) throw error;
  await supabase.from('system_audit_trail').insert({
    entity_type: 'bn_claim_correction_request',
    entity_id: requestId,
    action: decision === 'ACCEPTED' ? 'ACCEPT_CORRECTION' : 'REJECT_CORRECTION',
    severity: 'info',
    user_code: reviewedBy,
    details: { notes },
  } as any);
}
