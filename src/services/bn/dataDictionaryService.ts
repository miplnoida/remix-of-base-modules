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
