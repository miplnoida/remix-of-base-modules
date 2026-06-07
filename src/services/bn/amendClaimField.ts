/**
 * Unified claim field amendment entry point.
 *
 * Wraps:
 *   - resolveClaimEditability   (channel + status + policy gate)
 *   - bn_record_claim_amendment RPC (atomic audit + amendment_log + stale flags)
 *   - bn_claim_detail.detail_json (persist new value for BENEFIT_FACTS)
 *
 * All Workbench amend actions MUST go through this function so reason,
 * channel, status, and stale-flag enforcement is consistent.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  resolveClaimEditability,
  recordAmendment,
  normalizeChannel,
} from './amendmentPolicyService';
import type { FieldArea, ApplicationChannel } from '@/types/bn/amendment';

const db = supabase as any;

export interface AmendClaimFieldInput {
  claimId: string;
  fieldKey: string;
  fieldLabel?: string;
  fieldArea: FieldArea;
  before: unknown;
  after: unknown;
  reason: string;
  userCode: string;
  /** When true, also persists `after` into bn_claim_detail.detail_json[fieldKey] */
  persistToDetailJson?: boolean;
  /** Optional overrides — when omitted, derived from RPC defaults / policy */
  affectsEligibility?: boolean;
  affectsCalculation?: boolean;
  channelOverride?: ApplicationChannel;
  statusOverride?: string;
}

export interface AmendClaimFieldResult {
  amendmentId: string;
  eligibilityStale: boolean;
  calculationStale: boolean;
}

export async function amendClaimField(input: AmendClaimFieldInput): Promise<AmendClaimFieldResult> {
  if (!input.reason || input.reason.trim().length < 3) {
    throw new Error('A reason (min 3 chars) is required to amend a claim field.');
  }
  if (!input.userCode) {
    throw new Error('User code missing — cannot record amendment.');
  }

  // Editability gate
  const editability = await resolveClaimEditability(input.claimId);
  if (!editability) throw new Error('Claim not found or not amendable.');
  const area = editability.areas[input.fieldArea];
  if (!area?.editable) {
    throw new Error(area?.lockedReason || `Area ${input.fieldArea} is locked for this claim.`);
  }

  const channel = input.channelOverride ?? normalizeChannel(editability.channel);
  const status = input.statusOverride ?? editability.status;

  // Persist new value to bn_claim_detail.detail_json when requested
  if (input.persistToDetailJson) {
    const { data: existing } = await db
      .from('bn_claim_detail')
      .select('id, detail_json')
      .eq('claim_id', input.claimId)
      .maybeSingle();
    const nextJson = { ...(existing?.detail_json ?? {}), [input.fieldKey]: input.after };
    if (existing?.id) {
      await db.from('bn_claim_detail')
        .update({ detail_json: nextJson, updated_by: input.userCode })
        .eq('id', existing.id);
    } else {
      await db.from('bn_claim_detail')
        .insert({ claim_id: input.claimId, detail_json: nextJson, created_by: input.userCode });
    }
  }

  // Record amendment atomically via RPC (also flips stale flags)
  const amendmentId = await recordAmendment({
    claimId: input.claimId,
    fieldKey: input.fieldKey,
    fieldArea: input.fieldArea,
    before: input.before,
    after: input.after,
    reason: input.reason.trim(),
    userCode: input.userCode,
    channel,
    statusAtChange: status,
    approvalStatus: 'APPLIED',
    affectsEligibility: input.affectsEligibility ?? (input.fieldArea === 'BENEFIT_FACTS' || input.fieldArea === 'PARTICIPANTS'),
    affectsCalculation: input.affectsCalculation ?? (input.fieldArea === 'BENEFIT_FACTS' || input.fieldArea === 'CALC_INPUTS'),
  });

  const { data: claim } = await db.from('bn_claim')
    .select('eligibility_stale, calculation_stale')
    .eq('id', input.claimId)
    .maybeSingle();

  return {
    amendmentId,
    eligibilityStale: !!claim?.eligibility_stale,
    calculationStale: !!claim?.calculation_stale,
  };
}
