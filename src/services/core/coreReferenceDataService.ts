/**
 * coreReferenceDataService — central API for shared reference / enum master data.
 * Backed by core_reference_group / core_reference_value.
 *
 * Every dropdown that used to be a hardcoded TypeScript array should pull
 * its options from here via useReferenceValues(groupCode).
 *
 * Module ownership:
 *   - BENEFITS    — Benefit/product/formula/rate/matrix reference data
 *   - LEGAL       — Legal management
 *   - COMPLIANCE  — Compliance management
 *   - COMMON      — Cross-cutting (country, currency, timezone, language, yes/no, status)
 *
 * Module-scoped screens (Benefits/Legal/Compliance) should pass moduleCode so
 * users only see groups they own, plus COMMON groups as fallback.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface CoreReferenceGroup {
  id: string;
  group_code: string;
  group_name: string;
  module_code: string;
  module_name?: string | null;
  description?: string | null;
  is_system: boolean;
  is_active: boolean;
}

export interface CoreReferenceValue {
  id: string;
  group_id: string;
  module_code?: string | null;
  value_code: string;
  value_label: string;
  /** Preferred spec name. Mirrors `description` via DB trigger. */
  value_description?: string | null;
  description?: string | null;
  sort_order: number;
  is_default: boolean;
  is_system: boolean;
  is_active: boolean;
  status?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  metadata_json?: Record<string, unknown> | null;
}

/** Backward-compatible aliases (old code imported these). */
export type BnReferenceGroup = CoreReferenceGroup;
export type BnReferenceValue = CoreReferenceValue;

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

const MODULE_FALLBACK_KEY = 'COMMON';

function withCommonFallback(moduleCode: string | string[] | undefined): string[] | undefined {
  if (!moduleCode) return undefined;
  const list = Array.isArray(moduleCode) ? moduleCode.slice() : [moduleCode];
  if (!list.includes(MODULE_FALLBACK_KEY)) list.push(MODULE_FALLBACK_KEY);
  return list;
}

export async function listReferenceGroups(opts?: { moduleCode?: string | string[] }): Promise<CoreReferenceGroup[]> {
  let q = db.from('core_reference_group').select('*').order('sort_order').order('group_code');
  const modules = withCommonFallback(opts?.moduleCode);
  if (modules) q = q.in('module_code', modules);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listReferenceValues(
  groupCode: string,
  opts?: { includeInactive?: boolean; moduleCode?: string | string[] },
): Promise<CoreReferenceValue[]> {
  let gq = db.from('core_reference_group').select('id, module_code').eq('group_code', groupCode);
  const modules = withCommonFallback(opts?.moduleCode);
  if (modules) gq = gq.in('module_code', modules);
  const { data: g, error: gErr } = await gq.maybeSingle();
  if (gErr || !g) return [];
  let q = db.from('core_reference_value')
    .select('*').eq('group_id', g.id).order('sort_order').order('value_label');
  if (!opts?.includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listReferenceValuesByGroupId(
  groupId: string,
  opts?: { includeInactive?: boolean },
): Promise<CoreReferenceValue[]> {
  let q = db.from('core_reference_value').select('*').eq('group_id', groupId)
    .order('sort_order').order('value_label');
  if (!opts?.includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function upsertReferenceGroup(
  g: Partial<CoreReferenceGroup> & { group_code: string; group_name: string },
  userCode?: string,
) {
  const payload: any = {
    group_code: g.group_code,
    group_name: g.group_name,
    module_code: g.module_code ?? 'COMMON',
    module_name: g.module_name ?? null,
    description: g.description ?? null,
    is_active: g.is_active ?? true,
    updated_by: userCode,
  };
  if (g.id) {
    const { error } = await db.from('core_reference_group').update(payload).eq('id', g.id);
    if (error) throw error;
    return g.id;
  }
  payload.created_by = userCode;
  const { data, error } = await db.from('core_reference_group').insert(payload).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function upsertReferenceValue(
  v: Partial<CoreReferenceValue> & { group_id: string; value_code: string; value_label: string },
  userCode?: string,
) {
  const payload: any = {
    group_id: v.group_id,
    value_code: v.value_code,
    value_label: v.value_label,
    description: v.value_description ?? v.description ?? null,
    value_description: v.value_description ?? v.description ?? null,
    sort_order: v.sort_order ?? 0,
    is_default: v.is_default ?? false,
    is_active: v.is_active ?? true,
    status: v.status ?? (v.is_active === false ? 'RETIRED' : 'ACTIVE'),
    effective_from: v.effective_from ?? null,
    effective_to: v.effective_to ?? null,
    metadata_json: v.metadata_json ?? null,
    updated_by: userCode,
  };
  if (v.id) {
    const { error } = await db.from('core_reference_value').update(payload).eq('id', v.id);
    if (error) throw error;
    return v.id;
  }
  payload.created_by = userCode;
  const { data, error } = await db.from('core_reference_value').insert(payload).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteReferenceValue(id: string) {
  const { data: row } = await db.from('core_reference_value').select('is_system').eq('id', id).maybeSingle();
  if (row?.is_system) throw new Error('System-protected value cannot be deleted. Mark it inactive instead.');
  const { error } = await db.from('core_reference_value').delete().eq('id', id);
  if (error) throw error;
}

export async function setReferenceValueActive(id: string, isActive: boolean, userCode?: string) {
  const { error } = await db.from('core_reference_value')
    .update({ is_active: isActive, status: isActive ? 'ACTIVE' : 'RETIRED', updated_by: userCode })
    .eq('id', id);
  if (error) throw error;
}
