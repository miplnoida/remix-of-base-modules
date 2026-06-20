/**
 * Shared Legal Reference domain types — module-agnostic.
 * Used by Benefits, Legal and any future module that needs to attach
 * acts / sections / regulations to its records.
 */
export type LegalRefStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'REPEALED';

/** Short stable module codes used in module_legal_reference_mapping.module_code */
export type ModuleCode = 'BN' | 'LG' | 'CE' | 'IA' | 'CN' | 'CL' | string;

export interface LegalReference {
  id: string;
  country_code: string;
  ref_code: string;
  ref_type: string | null;
  short_title: string;
  act_name: string | null;
  chapter: string | null;
  section: string | null;
  subsection: string | null;
  regulation: string | null;
  full_reference_text: string | null;
  ref_url: string | null;
  jurisdiction: string | null;
  source: string | null;
  effective_from: string;
  effective_to: string | null;
  status: LegalRefStatus;
  version_number: number;
  supersedes_id: string | null;
  tags: string[] | null;
  notes: string | null;
  is_active: boolean;
  legacy_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface LegalReferenceType {
  code: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ModuleLegalReferenceMapping {
  id: string;
  module_code: ModuleCode;
  entity_table: string;
  entity_id: string;
  legal_reference_id: string;
  role: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  /** Hydrated on list endpoints */
  legal_reference?: LegalReference | null;
}
