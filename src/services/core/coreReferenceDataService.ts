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

/* ------------------------------------------------------------------ *
 * Epic 1.1.1 — Enterprise Reference Framework read-first extensions.
 * Additive: existing APIs above are unchanged. Everything below is
 * safe to call after the 1.1.1 migration; older consumers keep working.
 * ------------------------------------------------------------------ */

export interface CoreReferenceCategory {
  id: string;
  category_code: string;
  category_name: string;
  description?: string | null;
  owner_module_code?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CoreReferenceValueI18n {
  id: string;
  value_id: string;
  locale: string;
  label: string;
  description?: string | null;
}

export interface CoreReferenceValueExternalCode {
  id: string;
  value_id: string;
  system_code: string;
  external_code: string;
  external_label?: string | null;
  notes?: string | null;
  is_active: boolean;
}

export interface CoreReferenceValueAlias {
  id: string;
  value_id: string;
  alias: string;
  alias_type?: string | null;
  locale?: string | null;
  is_active: boolean;
}

/** List all reference categories. */
export async function listCategories(opts?: { includeInactive?: boolean }): Promise<CoreReferenceCategory[]> {
  let q = db.from('core_reference_category').select('*').order('sort_order').order('category_code');
  if (!opts?.includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Preferred read API — thin alias over listReferenceGroups with category filter. */
export async function listGroups(opts?: {
  moduleCode?: string | string[];
  categoryCode?: string;
  includeInactive?: boolean;
}): Promise<CoreReferenceGroup[]> {
  let q = db.from('core_reference_group').select('*').order('sort_order').order('group_code');
  const modules = withCommonFallback(opts?.moduleCode);
  if (modules) q = q.in('module_code', modules);
  if (opts?.categoryCode) q = q.eq('category_code', opts.categoryCode);
  if (!opts?.includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Fetch a single group by code. */
export async function getGroup(groupCode: string): Promise<CoreReferenceGroup | null> {
  const { data, error } = await db
    .from('core_reference_group').select('*').eq('group_code', groupCode).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Preferred read API for values. Adds scope + soft-delete + parent filters. */
export async function listItems(
  groupCode: string,
  opts?: {
    includeInactive?: boolean;
    includeDeleted?: boolean;
    moduleCode?: string | string[];
    parentValueId?: string | null;
    scopeType?: string;
    scopeOrgId?: string | null;
  },
): Promise<CoreReferenceValue[]> {
  const g = await getGroup(groupCode);
  if (!g) return [];
  let q = db.from('core_reference_value').select('*').eq('group_id', g.id)
    .order('sort_order').order('value_label');
  if (!opts?.includeInactive) q = q.eq('is_active', true);
  if (!opts?.includeDeleted) q = q.is('deleted_at', null);
  if (opts?.parentValueId !== undefined) {
    if (opts.parentValueId === null) q = q.is('parent_value_id', null);
    else q = q.eq('parent_value_id', opts.parentValueId);
  }
  if (opts?.scopeType) q = q.eq('scope_type', opts.scopeType);
  if (opts?.scopeOrgId !== undefined) {
    if (opts.scopeOrgId === null) q = q.is('scope_org_id', null);
    else q = q.eq('scope_org_id', opts.scopeOrgId);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Fetch a single value by (groupCode, valueCode). */
export async function getItem(groupCode: string, valueCode: string): Promise<CoreReferenceValue | null> {
  const g = await getGroup(groupCode);
  if (!g) return null;
  const { data, error } = await db.from('core_reference_value')
    .select('*').eq('group_id', g.id).eq('value_code', valueCode).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Walk parents from the given value up to the root. */
export async function resolveHierarchy(valueId: string): Promise<CoreReferenceValue[]> {
  const chain: CoreReferenceValue[] = [];
  let currentId: string | null = valueId;
  const seen = new Set<string>();
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const { data, error } = await db.from('core_reference_value')
      .select('*').eq('id', currentId).maybeSingle();
    if (error) throw error;
    if (!data) break;
    chain.unshift(data);
    currentId = (data as CoreReferenceValue).parent_value_id ?? null as any;
  }
  return chain;
}

/** Add a search alias for a reference value. */
export async function addAlias(
  input: { valueId: string; alias: string; aliasType?: string; locale?: string },
  userCode?: string,
): Promise<string> {
  const { data, error } = await db.from('core_reference_value_alias').insert({
    value_id: input.valueId,
    alias: input.alias,
    alias_type: input.aliasType ?? null,
    locale: input.locale ?? null,
    created_by: userCode,
    updated_by: userCode,
  }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

/** Attach an external-system code to a reference value. */
export async function addExternalCode(
  input: {
    valueId: string;
    systemCode: string;
    externalCode: string;
    externalLabel?: string;
    notes?: string;
  },
  userCode?: string,
): Promise<string> {
  const { data, error } = await db.from('core_reference_value_external_code').insert({
    value_id: input.valueId,
    system_code: input.systemCode,
    external_code: input.externalCode,
    external_label: input.externalLabel ?? null,
    notes: input.notes ?? null,
    created_by: userCode,
    updated_by: userCode,
  }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Return the localized label for a value in the requested locale.
 * Falls back to the base value_label when no translation is registered.
 */
export async function translate(
  valueId: string,
  locale: string,
): Promise<{ label: string; description?: string | null; locale: string; fallback: boolean }> {
  const { data: i18n } = await db.from('core_reference_value_i18n')
    .select('*').eq('value_id', valueId).eq('locale', locale).maybeSingle();
  if (i18n) {
    return { label: i18n.label, description: i18n.description, locale, fallback: false };
  }
  const { data: base, error } = await db.from('core_reference_value')
    .select('value_label, value_description, description').eq('id', valueId).maybeSingle();
  if (error) throw error;
  return {
    label: base?.value_label ?? '',
    description: base?.value_description ?? base?.description ?? null,
    locale,
    fallback: true,
  };
}

