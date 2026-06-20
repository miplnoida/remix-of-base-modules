/**
 * Module ↔ Legal Reference mapping service.
 * Lets any module attach legal references to any of its records without
 * changing the database schema.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ModuleCode, ModuleLegalReferenceMapping } from './types';

const db = supabase as any;

export interface EntityKey {
  moduleCode: ModuleCode;
  entityTable: string;
  entityId: string;
}

export async function listEntityLegalReferences(
  key: EntityKey,
): Promise<ModuleLegalReferenceMapping[]> {
  const { data, error } = await db
    .from('module_legal_reference_mapping')
    .select('*, legal_reference:legal_reference_id(*)')
    .eq('module_code', key.moduleCode)
    .eq('entity_table', key.entityTable)
    .eq('entity_id', key.entityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ModuleLegalReferenceMapping[];
}

export async function attachLegalReference(
  key: EntityKey,
  legalReferenceId: string,
  opts?: { role?: string; notes?: string; userCode?: string },
): Promise<string> {
  const { data, error } = await db
    .from('module_legal_reference_mapping')
    .insert({
      module_code: key.moduleCode,
      entity_table: key.entityTable,
      entity_id: key.entityId,
      legal_reference_id: legalReferenceId,
      role: opts?.role ?? 'PRIMARY',
      notes: opts?.notes ?? null,
      created_by: opts?.userCode ?? null,
      updated_by: opts?.userCode ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function detachLegalReference(mappingId: string): Promise<void> {
  const { error } = await db
    .from('module_legal_reference_mapping')
    .delete()
    .eq('id', mappingId);
  if (error) throw error;
}

export async function listEntitiesForReference(
  legalReferenceId: string,
): Promise<ModuleLegalReferenceMapping[]> {
  const { data, error } = await db
    .from('module_legal_reference_mapping')
    .select('*')
    .eq('legal_reference_id', legalReferenceId)
    .order('module_code')
    .order('entity_table');
  if (error) throw error;
  return (data ?? []) as ModuleLegalReferenceMapping[];
}

/**
 * List all reference mappings for a module, optionally filtered by country
 * (via the joined legal_reference) and entity type.
 * Used by Legal Admin to display references grouped by usage category.
 */
export async function listModuleLegalReferences(opts: {
  moduleCode: ModuleCode;
  countryCode?: string;
  entityType?: string;
}): Promise<ModuleLegalReferenceMapping[]> {
  let q = db
    .from('module_legal_reference_mapping')
    .select('*, legal_reference:legal_reference_id(*)')
    .eq('module_code', opts.moduleCode);
  if (opts.entityType) q = q.eq('entity_type', opts.entityType);
  q = q.order('entity_type').order('entity_id');
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as ModuleLegalReferenceMapping[];
  if (opts.countryCode) {
    rows = rows.filter((r) => r.legal_reference?.country_code === opts.countryCode);
  }
  return rows;
}
