/**
 * Data Dictionary Service — registries that constrain what tables and
 * columns Facts may reference. Keeps business users from typing arbitrary
 * physical column names that don't exist or are unsafe.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface DataSource {
  id: string;
  source_system: 'BEMA' | 'BN' | 'SHARED';
  table_name: string;
  display_name: string;
  description: string | null;
  active: boolean;
  seed_tag: string | null;
}

export interface DataField {
  id: string;
  table_name: string;
  column_name: string;
  display_name: string;
  data_type: string;
  is_date: boolean;
  is_amount: boolean;
  is_code: boolean;
  active: boolean;
  seed_tag: string | null;
}

export async function listDataSources(): Promise<DataSource[]> {
  const { data, error } = await db
    .from('bn_data_source_registry')
    .select('*')
    .eq('active', true)
    .order('source_system')
    .order('table_name');
  if (error) throw error;
  return (data ?? []) as DataSource[];
}

export async function listDataFields(): Promise<DataField[]> {
  const { data, error } = await db
    .from('bn_data_field_registry')
    .select('*')
    .eq('active', true)
    .order('table_name')
    .order('column_name');
  if (error) throw error;
  return (data ?? []) as DataField[];
}

export function fieldsForTable(fields: DataField[], table: string | null | undefined): DataField[] {
  if (!table) return [];
  return fields.filter(f => f.table_name === table);
}

export function dateFieldsForTable(fields: DataField[], table: string | null | undefined): DataField[] {
  return fieldsForTable(fields, table).filter(f => f.is_date);
}

export function amountFieldsForTable(fields: DataField[], table: string | null | undefined): DataField[] {
  return fieldsForTable(fields, table).filter(f => f.is_amount);
}

export function codeFieldsForTable(fields: DataField[], table: string | null | undefined): DataField[] {
  return fieldsForTable(fields, table).filter(f => f.is_code);
}

// ---------------- Registry-aware metadata validation ----------------

import type { EligibilityFactInput } from './eligibilityFactService';
import { getRegisteredSnapshotBuilderNames } from './eligibility/snapshotBuilderRegistry';

export interface RegistryValidationIssue {
  severity: 'FAIL' | 'WARNING';
  code: string;
  message: string;
}

/**
 * Verifies that every table/column referenced by a Fact exists in the data
 * dictionary, and that the snapshot builder is registered. Returns all
 * issues — caller decides how strictly to block.
 */
export function validateFactAgainstRegistry(
  input: Partial<EligibilityFactInput>,
  sources: DataSource[],
  fields: DataField[],
): RegistryValidationIssue[] {
  const issues: RegistryValidationIssue[] = [];
  const tableSet = new Set(sources.filter(s => s.active).map(s => s.table_name));
  const fieldKey = (t: string, c: string) => `${t}.${c}`;
  const fieldSet = new Set(fields.filter(f => f.active).map(f => fieldKey(f.table_name, f.column_name)));

  const checkTable = (name: string | null | undefined, label: string) => {
    if (!name) return;
    if (!tableSet.has(name)) {
      issues.push({ severity: 'FAIL', code: 'UNKNOWN_TABLE',
        message: `${label} "${name}" is not in the data dictionary. Add it to bn_data_source_registry first.` });
    }
  };
  const checkColumn = (table: string | null | undefined, column: string | null | undefined, label: string) => {
    if (!table || !column) return;
    if (tableSet.has(table) && !fieldSet.has(fieldKey(table, column))) {
      issues.push({ severity: 'FAIL', code: 'UNKNOWN_COLUMN',
        message: `${label} "${table}.${column}" is not in the data dictionary.` });
    }
  };

  // For RESOLVER_ONLY / DERIVED_AGGREGATE, source_column may be null or '*'
  // (the value is derived by the resolver, not a physical column).
  const skipSourceColumnCheck =
    input.source_type === 'RESOLVER_ONLY' ||
    input.source_type === 'DERIVED_AGGREGATE' ||
    input.source_column === '*';

  checkTable(input.source_table, 'Source table');
  if (!skipSourceColumnCheck) checkColumn(input.source_table, input.source_column, 'Source column');
  checkTable(input.base_table, 'Base table');
  checkColumn(input.base_table, input.base_date_column, 'Base date column');
  for (const c of input.base_value_columns ?? []) checkColumn(input.base_table, c, 'Base value column');
  for (const c of input.base_code_columns ?? []) checkColumn(input.base_table, c, 'Base code column');
  checkTable(input.output_table, 'Output table');
  // output_column refers to a real (often JSONB) column on the snapshot table; output_json_key is NEVER a physical column.
  checkColumn(input.output_table, input.output_column, 'Output column');

  if (input.source_type === 'DERIVED_AGGREGATE') {
    const builders = new Set(getRegisteredSnapshotBuilderNames());
    if (input.snapshot_builder && !builders.has(input.snapshot_builder)) {
      issues.push({ severity: 'FAIL', code: 'UNKNOWN_SNAPSHOT_BUILDER',
        message: `Snapshot builder "${input.snapshot_builder}" is not registered in code.` });
    }
    if (input.output_json_key && input.window_size && input.window_type === 'WEEKS') {
      const expected = `window_${input.window_size}`;
      if (input.output_json_key !== expected && !input.output_json_key.startsWith('deceased_')) {
        issues.push({ severity: 'WARNING', code: 'JSON_KEY_MISMATCH',
          message: `Output JSON key "${input.output_json_key}" does not match expected pattern "${expected}".` });
      }
    }
  }
  return issues;
}

