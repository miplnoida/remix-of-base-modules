import { supabase } from '@/integrations/supabase/client';

export interface DbModule {
  id: string;
  module_code: string;
  module_name: string;
  description: string | null;
  is_active: boolean;
  last_analyzed_at: string | null;
  last_analyzed_by: string | null;
  current_version_no: number;
}

export interface DbTable {
  id: string;
  module_id: string | null;
  schema_name: string;
  table_name: string;
  table_category: string;
  description: string | null;
  is_physical_table: boolean;
  is_view: boolean;
  is_shared: boolean;
  primary_key_summary: string | null;
  foreign_key_summary: string | null;
  index_summary: string | null;
  estimated_row_count: number | null;
}

export interface DbColumn {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  is_primary_key?: boolean;
  is_foreign_key?: boolean;
}

export interface DbRelationship {
  id: string;
  source_table_id: string;
  source_column: string;
  target_table_id: string;
  target_column: string;
  relationship_type: string;
  is_physical_fk: boolean;
  is_inferred: boolean;
  cardinality: string | null;
  dependency_strength: string;
  description: string | null;
}

export interface DbModuleDependency {
  id: string;
  source_module_id: string;
  target_module_id: string;
  dependency_type: string;
  criticality: string;
  tables_involved: string | null;
  description: string | null;
}

export async function fetchModules(): Promise<DbModule[]> {
  const { data, error } = await supabase
    .from('db_diagram_modules' as any)
    .select('*')
    .eq('is_active', true)
    .order('module_name');
  if (error) throw error;
  return (data || []) as any;
}

export async function fetchModuleByCode(code: string): Promise<DbModule | null> {
  const { data, error } = await supabase
    .from('db_diagram_modules' as any)
    .select('*')
    .eq('module_code', code)
    .single();
  if (error) return null;
  return data as any;
}

export async function fetchTablesForModule(moduleId: string): Promise<DbTable[]> {
  const { data: mappings, error: mapErr } = await supabase
    .from('db_diagram_table_module_map' as any)
    .select('table_id')
    .eq('module_id', moduleId);
  
  if (mapErr || !mappings?.length) {
    const { data, error } = await supabase
      .from('db_diagram_tables' as any)
      .select('*')
      .eq('module_id', moduleId)
      .order('table_name');
    if (error) throw error;
    return (data || []) as any;
  }

  const tableIds = (mappings as any[]).map(m => m.table_id);
  const { data, error } = await supabase
    .from('db_diagram_tables' as any)
    .select('*')
    .in('id', tableIds)
    .order('table_name');
  if (error) throw error;
  return (data || []) as any;
}

export async function fetchAllTables(): Promise<DbTable[]> {
  const { data, error } = await supabase
    .from('db_diagram_tables' as any)
    .select('*')
    .order('table_name');
  if (error) throw error;
  return (data || []) as any;
}

export async function fetchTableColumns(tableName: string): Promise<DbColumn[]> {
  const { data, error } = await supabase.rpc('get_table_columns' as any, {
    p_table_name: tableName
  });
  if (error || !data) {
    return [];
  }
  return (data as any[]).map(c => ({
    column_name: c.column_name,
    data_type: c.data_type,
    is_nullable: c.is_nullable === 'YES' || c.is_nullable === true,
    is_primary_key: c.column_name === 'id',
    is_foreign_key: c.column_name.endsWith('_id') && c.column_name !== 'id',
  }));
}

export async function fetchColumnsForMultipleTables(tableNames: string[]): Promise<Record<string, DbColumn[]>> {
  const result: Record<string, DbColumn[]> = {};
  // Batch fetch in parallel groups of 10
  const batches: string[][] = [];
  for (let i = 0; i < tableNames.length; i += 10) {
    batches.push(tableNames.slice(i, i + 10));
  }
  for (const batch of batches) {
    const promises = batch.map(async (name) => {
      const cols = await fetchTableColumns(name);
      result[name] = cols;
    });
    await Promise.all(promises);
  }
  return result;
}

export async function fetchRelationships(tableIds?: string[]): Promise<DbRelationship[]> {
  let query = supabase.from('db_diagram_relationships' as any).select('*');
  if (tableIds?.length) {
    query = query.or(`source_table_id.in.(${tableIds.join(',')}),target_table_id.in.(${tableIds.join(',')})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as any;
}

export async function fetchModuleDependencies(moduleId?: string): Promise<DbModuleDependency[]> {
  let query = supabase.from('db_diagram_module_dependencies' as any).select('*');
  if (moduleId) {
    query = query.or(`source_module_id.eq.${moduleId},target_module_id.eq.${moduleId}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as any;
}

export async function triggerReanalysis(moduleCode: string, userEmail: string, scope: 'module' | 'enterprise' = 'module') {
  const { data, error } = await supabase.functions.invoke('analyze-db-diagram', {
    body: { moduleCode, userEmail, scope }
  });
  if (error) throw error;
  return data;
}

export async function logAccess(moduleId: string | null, userId: string, userEmail: string, action: string, details?: string) {
  await supabase.from('db_diagram_access_log' as any).insert({
    module_id: moduleId,
    user_id: userId,
    user_email: userEmail,
    action,
    details,
  } as any);
}

export const TABLE_CATEGORIES: Record<string, { label: string; color: string }> = {
  core_master: { label: 'Core / Master', color: '#6366f1' },
  module_primary: { label: 'Primary', color: '#3b82f6' },
  module_secondary: { label: 'Secondary', color: '#60a5fa' },
  shared_transaction: { label: 'Shared', color: '#f59e0b' },
  reference_lookup: { label: 'Lookup', color: '#10b981' },
  audit_log: { label: 'Audit', color: '#8b5cf6' },
  bridge_junction: { label: 'Bridge', color: '#ec4899' },
  reporting_view: { label: 'View', color: '#14b8a6' },
  temporary_work: { label: 'Temp', color: '#94a3b8' },
  integration_staging: { label: 'Staging', color: '#f97316' },
};

// Shortened data type labels for display
export function shortDataType(dt: string): string {
  if (!dt) return '?';
  const t = dt.toLowerCase();
  if (t.includes('uuid')) return 'uuid';
  if (t.includes('timestamp')) return 'timestamp';
  if (t.includes('boolean') || t === 'bool') return 'bool';
  if (t.includes('integer') || t === 'int4' || t === 'int8') return 'int';
  if (t.includes('bigint')) return 'bigint';
  if (t.includes('numeric') || t.includes('decimal')) return 'numeric';
  if (t.includes('double') || t.includes('float') || t === 'real') return 'float';
  if (t.includes('json')) return 'json';
  if (t.includes('text')) return 'text';
  if (t.includes('character varying') || t.includes('varchar')) return 'varchar';
  if (t.includes('date')) return 'date';
  if (t.includes('array')) return 'array';
  if (t.includes('user-defined') || t.includes('enum')) return 'enum';
  return dt.slice(0, 10);
}
