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
  // Get tables that belong to this module (primary or mapped)
  const { data: mappings, error: mapErr } = await supabase
    .from('db_diagram_table_module_map' as any)
    .select('table_id')
    .eq('module_id', moduleId);
  
  if (mapErr || !mappings?.length) {
    // Fallback: get tables directly linked
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

// Table categories for display
export const TABLE_CATEGORIES: Record<string, { label: string; color: string }> = {
  core_master: { label: 'Core / Master', color: '#6366f1' },
  module_primary: { label: 'Module Primary', color: '#3b82f6' },
  module_secondary: { label: 'Module Secondary', color: '#60a5fa' },
  shared_transaction: { label: 'Shared Transaction', color: '#f59e0b' },
  reference_lookup: { label: 'Reference / Lookup', color: '#10b981' },
  audit_log: { label: 'Audit / Log', color: '#8b5cf6' },
  bridge_junction: { label: 'Bridge / Junction', color: '#ec4899' },
  reporting_view: { label: 'Reporting View', color: '#14b8a6' },
  temporary_work: { label: 'Temporary / Work', color: '#94a3b8' },
  integration_staging: { label: 'Integration / Staging', color: '#f97316' },
};
