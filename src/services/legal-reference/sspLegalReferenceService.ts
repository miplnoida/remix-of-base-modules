/**
 * Legal Reference Domain Pack — canonical shared facade (Epic 2.5).
 * All Social Security modules consume shared legal reference data via this
 * service (or the matching `useLegal*` hooks) — NOT by direct table access.
 *
 * Consumes Geography Domain Pack for country linkage. Additive `ssp_legal_*`
 * tables only. Does NOT modify legacy Legal/BN/Compliance/BEMA/IA/Finance tables.
 */
import { supabase } from '@/integrations/supabase/client';

const db: any = supabase;

export interface SspLegalReferenceType {
  id: string;
  type_code: string;
  type_name: string;
  category?: string | null;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface SspLegalAct {
  id: string;
  country_code: string;
  act_code: string;
  act_name: string;
  short_title?: string | null;
  category?: string | null;
  chapter?: string | null;
  year?: number | null;
  effective_from?: string | null;
  effective_to?: string | null;
  status: string;
  source_url?: string | null;
  notes?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface SspLegalSection {
  id: string;
  act_id: string;
  section_code: string;
  section_title: string;
  subsection: string;
  section_text?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface SspRegulation {
  id: string;
  country_code: string;
  regulation_code: string;
  regulation_name: string;
  parent_act_id?: string | null;
  category?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  status: string;
  is_active: boolean;
  sort_order: number;
}

export interface SspCourtReference {
  id: string;
  country_code: string;
  court_code: string;
  court_name: string;
  court_level?: string | null;
  jurisdiction_id?: string | null;
  parent_court_id?: string | null;
  legacy_court_ref?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface SspLegalReferenceRow {
  id: string;
  country_code: string;
  ref_code: string;
  ref_type_code?: string | null;
  short_title: string;
  full_citation?: string | null;
  act_id?: string | null;
  section_id?: string | null;
  regulation_id?: string | null;
  jurisdiction_id?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  status: string;
  penalty_scale?: Record<string, unknown> | null;
  tags?: string[] | null;
  source_url?: string | null;
  notes?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface SspLegalExternalCode {
  id: string;
  system_code: string;
  entity_type: string; // act | section | regulation | court | legal_reference
  local_ref: string;
  external_code: string;
  external_metadata: Record<string, unknown>;
  is_active: boolean;
}

export interface SspCountryLegalApplicability {
  id: string;
  country_code: string;
  entity_type: string;
  entity_ref: string;
  is_available: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
  notes?: string | null;
}

export interface SspJurisdiction {
  id: string;
  country_code?: string | null;
  jurisdiction_code?: string | null;
  jurisdiction_name?: string | null;
  [k: string]: unknown;
}

export const legalReferenceService = {
  async listReferenceTypes(): Promise<SspLegalReferenceType[]> {
    const { data, error } = await db
      .from('ssp_legal_reference_type')
      .select('*')
      .order('sort_order')
      .order('type_code');
    if (error) throw error;
    return (data ?? []) as SspLegalReferenceType[];
  },

  async listActs(countryCode?: string | null): Promise<SspLegalAct[]> {
    let q = db.from('ssp_legal_act').select('*').order('sort_order').order('act_code');
    if (countryCode) q = q.eq('country_code', countryCode);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspLegalAct[];
  },

  async listSections(actId?: string | null): Promise<SspLegalSection[]> {
    let q = db.from('ssp_legal_section').select('*').order('sort_order').order('section_code');
    if (actId) q = q.eq('act_id', actId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspLegalSection[];
  },

  async listRegulations(countryCode?: string | null): Promise<SspRegulation[]> {
    let q = db.from('ssp_regulation').select('*').order('sort_order').order('regulation_code');
    if (countryCode) q = q.eq('country_code', countryCode);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspRegulation[];
  },

  async listJurisdictions(countryCode?: string | null): Promise<SspJurisdiction[]> {
    let q = db.from('ssp_jurisdiction').select('*');
    if (countryCode) q = q.eq('country_code', countryCode);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspJurisdiction[];
  },

  async listCourts(countryCode?: string | null): Promise<SspCourtReference[]> {
    let q = db.from('ssp_court_reference').select('*').order('sort_order').order('court_code');
    if (countryCode) q = q.eq('country_code', countryCode);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspCourtReference[];
  },

  async listLegalReferences(countryCode?: string | null): Promise<SspLegalReferenceRow[]> {
    let q = db.from('ssp_legal_reference').select('*').order('sort_order').order('ref_code');
    if (countryCode) q = q.eq('country_code', countryCode);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspLegalReferenceRow[];
  },

  async listExternalCodes(entityType?: string): Promise<SspLegalExternalCode[]> {
    let q = db.from('ssp_legal_external_code').select('*').order('system_code');
    if (entityType) q = q.eq('entity_type', entityType);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspLegalExternalCode[];
  },

  async listCountryApplicability(countryCode?: string | null): Promise<SspCountryLegalApplicability[]> {
    let q = db.from('ssp_country_legal_applicability').select('*').order('entity_type');
    if (countryCode) q = q.eq('country_code', countryCode);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspCountryLegalApplicability[];
  },

  /** Resolve a legal reference by ref_code within a country. */
  async resolveLegalReference(countryCode: string, refCode: string): Promise<SspLegalReferenceRow | null> {
    const { data, error } = await db
      .from('ssp_legal_reference')
      .select('*')
      .eq('country_code', countryCode)
      .eq('ref_code', refCode)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as SspLegalReferenceRow | null;
  },

  /** All active legal references applicable to a country. */
  async resolveLegalReferencesForCountry(countryCode: string): Promise<SspLegalReferenceRow[]> {
    const { data, error } = await db
      .from('ssp_legal_reference')
      .select('*')
      .eq('country_code', countryCode)
      .eq('is_active', true)
      .order('sort_order')
      .order('ref_code');
    if (error) throw error;
    return (data ?? []) as SspLegalReferenceRow[];
  },
};
