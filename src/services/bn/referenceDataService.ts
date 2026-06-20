/**
 * referenceDataService — central API for BN reference / enum master data.
 * Backed by bn_reference_group / bn_reference_value.
 *
 * Every BN dropdown that used to be a hardcoded TypeScript array should pull
 * its options from here via useReferenceValues(groupCode).
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface BnReferenceGroup {
  id: string;
  group_code: string;
  group_name: string;
  module_code: string;
  description?: string | null;
  is_system: boolean;
  is_active: boolean;
}

export interface BnReferenceValue {
  id: string;
  group_id: string;
  value_code: string;
  value_label: string;
  description?: string | null;
  sort_order: number;
  is_default: boolean;
  is_system: boolean;
  is_active: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
  metadata_json?: Record<string, unknown> | null;
}

/** Well-known group codes used across the app. */
export const BN_REF_GROUPS = {
  RATE_TABLE_TYPE: 'BN_RATE_TABLE_TYPE',
  LOOKUP_MODE: 'BN_LOOKUP_MODE',
  DIMENSION_TYPE: 'BN_DIMENSION_TYPE',
  MATCH_TYPE: 'BN_MATCH_TYPE',
  FORMULA_EXPRESSION_TYPE: 'BN_FORMULA_EXPRESSION_TYPE',
  FORMULA_STATUS: 'BN_FORMULA_STATUS',
  OUTPUT_TYPE: 'BN_OUTPUT_TYPE',
  REIMBURSEMENT_METHOD: 'BN_REIMBURSEMENT_METHOD',
  MEDICAL_LOCATION_TYPE: 'BN_MEDICAL_LOCATION_TYPE',
  MEDICAL_PROVIDER_TYPE: 'BN_MEDICAL_PROVIDER_TYPE',
  // Country Pack groups
  ID_TYPE: 'BN_ID_TYPE',
  ID_VERIFICATION_METHOD: 'BN_ID_VERIFICATION_METHOD',
  PARTICIPANT_TYPE: 'BN_PARTICIPANT_TYPE',
  PARTICIPANT_ROLE_CATEGORY: 'BN_PARTICIPANT_ROLE_CATEGORY',
  PROOF_REQUIREMENT_CATEGORY: 'BN_PROOF_REQUIREMENT_CATEGORY',
  ONLINE_ACCESS_RULE: 'BN_ONLINE_ACCESS_RULE',
  RELATIONSHIP_CATEGORY: 'BN_RELATIONSHIP_CATEGORY',
  AUTHORITY_CATEGORY: 'BN_AUTHORITY_CATEGORY',
  VERIFICATION_METHOD: 'BN_VERIFICATION_METHOD',
  COMMUNICATION_ELIGIBILITY: 'BN_COMMUNICATION_ELIGIBILITY',
  PAYMENT_ELIGIBILITY: 'BN_PAYMENT_ELIGIBILITY',
  ADDRESS_FIELD_TYPE: 'BN_ADDRESS_FIELD_TYPE',
  PAYMENT_METHOD_TYPE: 'BN_PAYMENT_METHOD_TYPE',
  LEGAL_REF_STATUS: 'BN_LEGAL_REF_STATUS',
  ESCALATION_TRIGGER_TYPE: 'BN_ESCALATION_TRIGGER_TYPE',
  ESCALATION_SEVERITY: 'BN_ESCALATION_SEVERITY',
  ESCALATION_ACTION_TYPE: 'BN_ESCALATION_ACTION_TYPE',
} as const;

export async function listReferenceGroups(): Promise<BnReferenceGroup[]> {
  const { data, error } = await db.from('bn_reference_group')
    .select('*').order('group_code');
  if (error) throw error;
  return data ?? [];
}

export async function listReferenceValues(groupCode: string, opts?: { includeInactive?: boolean }): Promise<BnReferenceValue[]> {
  const { data: g, error: gErr } = await db.from('bn_reference_group')
    .select('id').eq('group_code', groupCode).maybeSingle();
  if (gErr || !g) return [];
  let q = db.from('bn_reference_value')
    .select('*').eq('group_id', g.id).order('sort_order').order('value_label');
  if (!opts?.includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listReferenceValuesByGroupId(groupId: string, opts?: { includeInactive?: boolean }): Promise<BnReferenceValue[]> {
  let q = db.from('bn_reference_value').select('*').eq('group_id', groupId)
    .order('sort_order').order('value_label');
  if (!opts?.includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function upsertReferenceGroup(g: Partial<BnReferenceGroup> & { group_code: string; group_name: string }, userCode?: string) {
  const payload: any = {
    group_code: g.group_code,
    group_name: g.group_name,
    module_code: g.module_code ?? 'BN',
    description: g.description ?? null,
    is_active: g.is_active ?? true,
    updated_by: userCode,
  };
  if (g.id) {
    const { error } = await db.from('bn_reference_group').update(payload).eq('id', g.id);
    if (error) throw error;
    return g.id;
  } else {
    payload.created_by = userCode;
    const { data, error } = await db.from('bn_reference_group').insert(payload).select('id').single();
    if (error) throw error;
    return data.id as string;
  }
}

export async function upsertReferenceValue(v: Partial<BnReferenceValue> & { group_id: string; value_code: string; value_label: string }, userCode?: string) {
  const payload: any = {
    group_id: v.group_id,
    value_code: v.value_code,
    value_label: v.value_label,
    description: v.description ?? null,
    sort_order: v.sort_order ?? 0,
    is_default: v.is_default ?? false,
    is_active: v.is_active ?? true,
    effective_from: v.effective_from ?? null,
    effective_to: v.effective_to ?? null,
    metadata_json: v.metadata_json ?? null,
    updated_by: userCode,
  };
  if (v.id) {
    const { error } = await db.from('bn_reference_value').update(payload).eq('id', v.id);
    if (error) throw error;
    return v.id;
  } else {
    payload.created_by = userCode;
    const { data, error } = await db.from('bn_reference_value').insert(payload).select('id').single();
    if (error) throw error;
    return data.id as string;
  }
}

export async function deleteReferenceValue(id: string) {
  // Refuse to delete system-protected
  const { data: row } = await db.from('bn_reference_value').select('is_system').eq('id', id).maybeSingle();
  if (row?.is_system) throw new Error('System-protected value cannot be deleted. Mark it inactive instead.');
  const { error } = await db.from('bn_reference_value').delete().eq('id', id);
  if (error) throw error;
}

export async function setReferenceValueActive(id: string, isActive: boolean, userCode?: string) {
  const { error } = await db.from('bn_reference_value')
    .update({ is_active: isActive, updated_by: userCode }).eq('id', id);
  if (error) throw error;
}
