/**
 * Entity Resolution Service
 * 
 * Centralized, database-backed logic for identifying entity types:
 * - ER (Employer): er_master.regno
 * - IP (Insured Person): ip_master.ssn
 * - SE (Self-Employed): ip_self_employ.self_ref_no
 * - VC (Voluntary Contributor): ip_master.ssn where vol_contrib = 'Y'
 * 
 * All lookups go through Supabase RPC functions for server-side resolution.
 */

import { supabase } from '@/integrations/supabase/client';

export type EntityType = 'ER' | 'IP' | 'SE' | 'VC';

export interface ResolvedEntity {
  entityType: EntityType | 'IP_VC';
  entityId: string;
  entityName: string;
  entityStatus: string;
}

export interface EntityValidationResult {
  isValid: boolean;
  entityName: string;
  entityStatus: string;
  errorMessage: string | null;
}

/**
 * Resolve all entity types that match a given identifier.
 * An identifier may match multiple types (e.g., an SSN could be both IP and VC).
 */
export async function resolveEntityType(identifier: string): Promise<ResolvedEntity[]> {
  if (!identifier?.trim()) return [];

  const { data, error } = await supabase.rpc('resolve_entity_type', {
    p_identifier: identifier.trim(),
  });

  if (error) {
    console.error('Error resolving entity type:', error);
    throw new Error(`Entity resolution failed: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    entityType: row.entity_type as EntityType | 'IP_VC',
    entityId: row.entity_id,
    entityName: row.entity_name,
    entityStatus: row.entity_status,
  }));
}

/**
 * Validate that an identifier belongs to the expected entity type.
 * Returns validation result with name, status, and error if not found.
 */
export async function validateEntity(
  identifier: string,
  expectedType: EntityType
): Promise<EntityValidationResult> {
  if (!identifier?.trim()) {
    return { isValid: false, entityName: '', entityStatus: '', errorMessage: 'Identifier is required' };
  }

  const { data, error } = await supabase.rpc('validate_entity', {
    p_identifier: identifier.trim(),
    p_expected_type: expectedType,
  });

  if (error) {
    console.error('Error validating entity:', error);
    return { isValid: false, entityName: '', entityStatus: '', errorMessage: error.message };
  }

  const row = data?.[0];
  if (!row) {
    return { isValid: false, entityName: '', entityStatus: '', errorMessage: 'Validation returned no result' };
  }

  return {
    isValid: row.is_valid,
    entityName: row.entity_name || '',
    entityStatus: row.entity_status || '',
    errorMessage: row.error_message || null,
  };
}

/**
 * Quick boolean checks for specific entity types.
 */
export async function isEmployer(regno: string): Promise<boolean> {
  if (!regno?.trim()) return false;
  const { data, error } = await supabase.rpc('is_employer', { p_regno: regno.trim() });
  if (error) { console.error('isEmployer error:', error); return false; }
  return !!data;
}

export async function isInsuredPerson(ssn: string): Promise<boolean> {
  if (!ssn?.trim()) return false;
  const { data, error } = await supabase.rpc('is_insured_person', { p_ssn: ssn.trim() });
  if (error) { console.error('isInsuredPerson error:', error); return false; }
  return !!data;
}

export async function isSelfEmployed(ssn: string): Promise<boolean> {
  if (!ssn?.trim()) return false;
  const { data, error } = await supabase.rpc('is_self_employed', { p_ssn: ssn.trim() });
  if (error) { console.error('isSelfEmployed error:', error); return false; }
  return !!data;
}

export async function isVoluntaryContributor(ssn: string): Promise<boolean> {
  if (!ssn?.trim()) return false;
  const { data, error } = await supabase.rpc('is_voluntary_contributor', { p_ssn: ssn.trim() });
  if (error) { console.error('isVoluntaryContributor error:', error); return false; }
  return !!data;
}

/**
 * Entity type metadata for display purposes.
 */
export const ENTITY_TYPE_LABELS: Record<EntityType | 'IP_VC', string> = {
  ER: 'Employer',
  IP: 'Insured Person',
  SE: 'Self-Employed',
  VC: 'Voluntary Contributor',
  IP_VC: 'Insured Person (Voluntary Contributor)',
};

export const ENTITY_TYPE_TABLE_MAP: Record<EntityType, { table: string; idColumn: string }> = {
  ER: { table: 'er_master', idColumn: 'regno' },
  IP: { table: 'ip_master', idColumn: 'ssn' },
  SE: { table: 'ip_self_employ', idColumn: 'ssn' },
  VC: { table: 'ip_master', idColumn: 'ssn' },
};
