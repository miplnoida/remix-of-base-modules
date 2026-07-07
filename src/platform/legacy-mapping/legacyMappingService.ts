import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/services/systemLoggerService';
import {
  validateLegacyColumnMap,
  validateLegacyRelationshipMap,
  validateLegacyTableMap,
  validateLegacyValueMap,
  type LegacyColumnMap,
  type LegacyColumnMapFormValues,
  type LegacyMappingFilters,
  type LegacyRelationshipMap,
  type LegacyRelationshipMapFormValues,
  type LegacyTableMap,
  type LegacyTableMapFormValues,
  type LegacyValueMap,
  type LegacyValueMapFormValues,
} from './legacyMappingTypes';

const TABLE_MAP = 'core_legacy_table_map';
const COLUMN_MAP = 'core_legacy_column_map';
const VALUE_MAP = 'core_legacy_value_map';
const REL_MAP = 'core_legacy_relationship_map';
const REGISTRY = 'core_table_registry';

const db = supabase as any;

async function safeAudit(action: string, entity_type: string, id: string, before: unknown, after: unknown) {
  try {
    await logAudit({
      action,
      module: 'CORE_ADMIN',
      entity_type,
      entity_id: id,
      before_value: (before ?? undefined) as any,
      after_value: (after ?? undefined) as any,
    });
  } catch {
    /* best-effort */
  }
}

/* ---------------- Table maps ---------------- */
export async function getLegacyTableMaps(filters: LegacyMappingFilters = {}): Promise<LegacyTableMap[]> {
  let q = db.from(TABLE_MAP).select('*').order('legacy_table_name');
  if (filters.domain_code) q = q.eq('domain_code', filters.domain_code);
  if (filters.module_code) q = q.eq('module_code', filters.module_code);
  if (filters.table_category) q = q.eq('table_category', filters.table_category);
  if (filters.use_strategy) q = q.eq('use_strategy', filters.use_strategy);
  if (filters.mapping_status) q = q.eq('mapping_status', filters.mapping_status);
  if (filters.is_master_table) q = q.eq('is_master_table', true);
  if (filters.is_transaction_table) q = q.eq('is_transaction_table', true);
  if (filters.is_reference_table) q = q.eq('is_reference_table', true);
  if (filters.is_security_table) q = q.eq('is_security_table', true);
  if (filters.contains_pii) q = q.eq('contains_pii', true);
  if (filters.is_read_only) q = q.eq('is_read_only', true);
  if (typeof filters.is_active === 'boolean') q = q.eq('is_active', filters.is_active);
  if (filters.missing_canonical_service) q = q.is('canonical_service_name', null);
  if (filters.missing_modern_table) q = q.is('modern_table_name', null);
  if (filters.search) {
    const s = `%${filters.search}%`;
    q = q.or(`legacy_table_name.ilike.${s},modern_entity_name.ilike.${s},modern_alias.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LegacyTableMap[];
}

export async function getLegacyTableMapById(id: string): Promise<LegacyTableMap | null> {
  const { data, error } = await db.from(TABLE_MAP).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as LegacyTableMap | null;
}

export async function createLegacyTableMap(payload: LegacyTableMapFormValues): Promise<LegacyTableMap> {
  const errs = validateLegacyTableMap(payload);
  if (errs.length) throw new Error(errs[0]);
  const { data, error } = await db.from(TABLE_MAP).insert(payload).select('*').single();
  if (error) throw error;
  await safeAudit('LEGACY_TABLE_MAP_CREATED', TABLE_MAP, data.id, null, data);
  return data as LegacyTableMap;
}

export async function updateLegacyTableMap(id: string, payload: Partial<LegacyTableMapFormValues>): Promise<LegacyTableMap> {
  const before = await getLegacyTableMapById(id);
  const { data, error } = await db.from(TABLE_MAP).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  const action = payload.mapping_status === 'APPROVED' && before?.mapping_status !== 'APPROVED'
    ? 'LEGACY_TABLE_MAP_APPROVED'
    : 'LEGACY_TABLE_MAP_UPDATED';
  await safeAudit(action, TABLE_MAP, id, before, data);
  return data as LegacyTableMap;
}

export async function deactivateLegacyTableMap(id: string): Promise<void> {
  const before = await getLegacyTableMapById(id);
  const { error } = await db.from(TABLE_MAP).update({ is_active: false }).eq('id', id);
  if (error) throw error;
  await safeAudit('LEGACY_TABLE_MAP_DEACTIVATED', TABLE_MAP, id, before, { is_active: false });
}

export async function reactivateLegacyTableMap(id: string): Promise<void> {
  const before = await getLegacyTableMapById(id);
  const { error } = await db.from(TABLE_MAP).update({ is_active: true }).eq('id', id);
  if (error) throw error;
  await safeAudit('LEGACY_TABLE_MAP_REACTIVATED', TABLE_MAP, id, before, { is_active: true });
}

/* ---------------- Column maps ---------------- */
export async function getLegacyColumnMaps(tableMapId: string): Promise<LegacyColumnMap[]> {
  const { data, error } = await db.from(COLUMN_MAP).select('*').eq('table_map_id', tableMapId).order('sort_order').order('legacy_column_name');
  if (error) throw error;
  return (data ?? []) as LegacyColumnMap[];
}

export async function createLegacyColumnMap(payload: LegacyColumnMapFormValues): Promise<LegacyColumnMap> {
  const errs = validateLegacyColumnMap(payload);
  if (errs.length) throw new Error(errs[0]);
  const { data, error } = await db.from(COLUMN_MAP).insert(payload).select('*').single();
  if (error) throw error;
  await safeAudit('LEGACY_COLUMN_MAP_CREATED', COLUMN_MAP, data.id, null, data);
  return data as LegacyColumnMap;
}

export async function updateLegacyColumnMap(id: string, payload: Partial<LegacyColumnMapFormValues>): Promise<LegacyColumnMap> {
  const { data: before } = await db.from(COLUMN_MAP).select('*').eq('id', id).maybeSingle();
  const { data, error } = await db.from(COLUMN_MAP).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await safeAudit('LEGACY_COLUMN_MAP_UPDATED', COLUMN_MAP, id, before, data);
  return data as LegacyColumnMap;
}

export async function deactivateLegacyColumnMap(id: string): Promise<void> {
  const { data: before } = await db.from(COLUMN_MAP).select('*').eq('id', id).maybeSingle();
  const { error } = await db.from(COLUMN_MAP).update({ is_active: false }).eq('id', id);
  if (error) throw error;
  await safeAudit('LEGACY_COLUMN_MAP_DEACTIVATED', COLUMN_MAP, id, before, { is_active: false });
}

/* ---------------- Value maps ---------------- */
export async function getLegacyValueMaps(tableMapId: string, columnMapId?: string): Promise<LegacyValueMap[]> {
  let q = db.from(VALUE_MAP).select('*').eq('table_map_id', tableMapId).order('legacy_code');
  if (columnMapId) q = q.eq('column_map_id', columnMapId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LegacyValueMap[];
}

export async function createLegacyValueMap(payload: LegacyValueMapFormValues): Promise<LegacyValueMap> {
  const errs = validateLegacyValueMap(payload);
  if (errs.length) throw new Error(errs[0]);
  const { data, error } = await db.from(VALUE_MAP).insert(payload).select('*').single();
  if (error) throw error;
  await safeAudit('LEGACY_VALUE_MAP_CREATED', VALUE_MAP, data.id, null, data);
  return data as LegacyValueMap;
}

export async function updateLegacyValueMap(id: string, payload: Partial<LegacyValueMapFormValues>): Promise<LegacyValueMap> {
  const { data: before } = await db.from(VALUE_MAP).select('*').eq('id', id).maybeSingle();
  const { data, error } = await db.from(VALUE_MAP).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await safeAudit('LEGACY_VALUE_MAP_UPDATED', VALUE_MAP, id, before, data);
  return data as LegacyValueMap;
}

export async function deactivateLegacyValueMap(id: string): Promise<void> {
  const { data: before } = await db.from(VALUE_MAP).select('*').eq('id', id).maybeSingle();
  const { error } = await db.from(VALUE_MAP).update({ is_active: false }).eq('id', id);
  if (error) throw error;
  await safeAudit('LEGACY_VALUE_MAP_DEACTIVATED', VALUE_MAP, id, before, { is_active: false });
}

/* ---------------- Relationship maps ---------------- */
export async function getLegacyRelationshipMaps(tableMapId: string): Promise<LegacyRelationshipMap[]> {
  const { data, error } = await db.from(REL_MAP).select('*').eq('source_table_map_id', tableMapId).order('relationship_name');
  if (error) throw error;
  return (data ?? []) as LegacyRelationshipMap[];
}

export async function createLegacyRelationshipMap(payload: LegacyRelationshipMapFormValues): Promise<LegacyRelationshipMap> {
  const errs = validateLegacyRelationshipMap(payload);
  if (errs.length) throw new Error(errs[0]);
  const { data, error } = await db.from(REL_MAP).insert(payload).select('*').single();
  if (error) throw error;
  await safeAudit('LEGACY_RELATIONSHIP_MAP_CREATED', REL_MAP, data.id, null, data);
  return data as LegacyRelationshipMap;
}

export async function updateLegacyRelationshipMap(id: string, payload: Partial<LegacyRelationshipMapFormValues>): Promise<LegacyRelationshipMap> {
  const { data: before } = await db.from(REL_MAP).select('*').eq('id', id).maybeSingle();
  const { data, error } = await db.from(REL_MAP).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await safeAudit('LEGACY_RELATIONSHIP_MAP_UPDATED', REL_MAP, id, before, data);
  return data as LegacyRelationshipMap;
}

export async function deactivateLegacyRelationshipMap(id: string): Promise<void> {
  const { data: before } = await db.from(REL_MAP).select('*').eq('id', id).maybeSingle();
  const { error } = await db.from(REL_MAP).update({ is_active: false }).eq('id', id);
  if (error) throw error;
  await safeAudit('LEGACY_RELATIONSHIP_MAP_DEACTIVATED', REL_MAP, id, before, { is_active: false });
}

/* ---------------- Registry integration ---------------- */
export interface EligibleLegacyTable {
  id: string;
  table_name: string;
  modern_alias: string | null;
  domain_code: string;
  module_code: string | null;
  table_category: string;
  is_legacy_table: boolean;
  legacy_table_name: string | null;
  canonical_service: string | null;
  canonical_admin_route: string | null;
}

export async function getEligibleLegacyTablesFromTableRegistry(): Promise<EligibleLegacyTable[]> {
  const { data, error } = await db
    .from(REGISTRY)
    .select('id, table_name, modern_alias, domain_code, module_code, table_category, is_legacy_table, legacy_table_name, canonical_service, canonical_admin_route')
    .eq('is_legacy_table', true)
    .eq('is_active', true)
    .order('table_name');
  if (error) throw error;
  return (data ?? []) as EligibleLegacyTable[];
}

export {
  validateLegacyTableMap,
  validateLegacyColumnMap,
  validateLegacyValueMap,
  validateLegacyRelationshipMap,
};
