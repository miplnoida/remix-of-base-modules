import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/services/systemLoggerService';
import {
  validateTableNaming,
  type TableRegistryEntry,
  type TableRegistryFilters,
  type TableRegistryFormValues,
} from './tableRegistryTypes';

const TABLE = 'core_table_registry';
const db = supabase as any;

export async function getTableRegistryEntries(
  filters: TableRegistryFilters = {},
): Promise<TableRegistryEntry[]> {
  let q = db.from(TABLE).select('*').order('table_name');

  if (filters.table_prefix) q = q.eq('table_prefix', filters.table_prefix);
  if (filters.domain_code) q = q.eq('domain_code', filters.domain_code);
  if (filters.module_code) q = q.eq('module_code', filters.module_code);
  if (filters.ownership_type) q = q.eq('ownership_type', filters.ownership_type);
  if (filters.table_category) q = q.eq('table_category', filters.table_category);
  if (filters.lifecycle_status) q = q.eq('lifecycle_status', filters.lifecycle_status);
  if (typeof filters.is_active === 'boolean') q = q.eq('is_active', filters.is_active);
  if (filters.legacy_only) q = q.eq('is_legacy_table', true);
  if (filters.contains_pii) q = q.eq('contains_pii', true);
  if (filters.contains_financial_data) q = q.eq('contains_financial_data', true);
  if (filters.contains_health_data) q = q.eq('contains_health_data', true);
  if (filters.missing_modern_alias) q = q.is('modern_alias', null);
  if (filters.search) {
    const s = `%${filters.search}%`;
    q = q.or(`table_name.ilike.${s},modern_alias.ilike.${s}`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TableRegistryEntry[];
}

export async function getTableRegistryEntryById(id: string): Promise<TableRegistryEntry | null> {
  const { data, error } = await db.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as TableRegistryEntry | null;
}

export async function createTableRegistryEntry(
  payload: TableRegistryFormValues,
): Promise<TableRegistryEntry> {
  const errors = validateTableNaming(payload);
  if (errors.length) throw new Error(errors[0]);
  const { data, error } = await db.from(TABLE).insert(payload).select('*').single();
  if (error) throw error;
  await safeAudit('TABLE_REGISTRY_CREATED', data.id, null, data);
  return data as TableRegistryEntry;
}

export async function updateTableRegistryEntry(
  id: string,
  payload: Partial<TableRegistryFormValues>,
): Promise<TableRegistryEntry> {
  const before = await getTableRegistryEntryById(id);
  const { data, error } = await db.from(TABLE).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  await safeAudit('TABLE_REGISTRY_UPDATED', id, before, data);
  return data as TableRegistryEntry;
}

export async function deactivateTableRegistryEntry(id: string): Promise<void> {
  const before = await getTableRegistryEntryById(id);
  const { error } = await db.from(TABLE).update({ is_active: false }).eq('id', id);
  if (error) throw error;
  await safeAudit('TABLE_REGISTRY_DEACTIVATED', id, before, { is_active: false });
}

export async function reactivateTableRegistryEntry(id: string): Promise<void> {
  const before = await getTableRegistryEntryById(id);
  const { error } = await db.from(TABLE).update({ is_active: true }).eq('id', id);
  if (error) throw error;
  await safeAudit('TABLE_REGISTRY_REACTIVATED', id, before, { is_active: true });
}

export { validateTableNaming };

async function safeAudit(action: string, id: string, before: unknown, after: unknown) {
  try {
    await logAudit({
      action,
      module: 'CORE_ADMIN',
      entity_type: 'core_table_registry',
      entity_id: id,
      before_value: (before ?? undefined) as any,
      after_value: (after ?? undefined) as any,
    });
  } catch {
    // best-effort
  }
}
