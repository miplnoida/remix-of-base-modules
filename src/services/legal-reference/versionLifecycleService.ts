/**
 * Lifecycle wrapper around DB functions that enforce immutability and audit:
 *   - core_legal_ref_create_version
 *   - core_legal_ref_transition
 */
import { supabase } from '@/integrations/supabase/client';
import type { LegalRefVersionStatus } from './versionService';

const db = supabase as any;

export async function createDraftVersion(args: {
  masterId: string;
  userCode: string;
  effectiveFrom: string;
  changeReason?: string;
}): Promise<string> {
  const { data, error } = await db.rpc('core_legal_ref_create_version', {
    p_master_id: args.masterId,
    p_user_code: args.userCode,
    p_effective_from: args.effectiveFrom,
    p_change_reason: args.changeReason ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function transitionVersion(args: {
  versionId: string;
  toStatus: LegalRefVersionStatus;
  userCode: string;
  reason?: string;
}): Promise<void> {
  const { error } = await db.rpc('core_legal_ref_transition', {
    p_version_id: args.versionId,
    p_to_status: args.toStatus,
    p_user_code: args.userCode,
    p_reason: args.reason ?? null,
  });
  if (error) throw error;
}

/** Allowed forward transitions surfaced for UI buttons. */
export function nextTransitions(current: LegalRefVersionStatus): LegalRefVersionStatus[] {
  switch (current) {
    case 'DRAFT':      return ['SUBMITTED'];
    case 'SUBMITTED':  return ['REVIEWED', 'DRAFT'];
    case 'REVIEWED':   return ['APPROVED', 'DRAFT'];
    case 'APPROVED':   return ['PUBLISHED'];
    case 'PUBLISHED':  return ['SUPERSEDED', 'ARCHIVED'];
    case 'SUPERSEDED': return ['ARCHIVED'];
    default:           return [];
  }
}
