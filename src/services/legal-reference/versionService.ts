/**
 * Version-aware service for core_legal_reference_version.
 * Master CRUD remains in legalReferenceService.ts; this file owns versions.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type LegalRefVersionStatus =
  | 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED'
  | 'PUBLISHED' | 'SUPERSEDED' | 'ARCHIVED';

export interface LegalReferenceVersion {
  id: string;
  legal_reference_id: string;
  version_number: number;
  version_label: string | null;
  section: string | null;
  subsection: string | null;
  regulation: string | null;
  citation_text: string | null;
  full_reference_text: string | null;
  official_text: string | null;
  summary: string | null;
  source_url: string | null;
  gazette_number: string | null;
  official_document_id: string | null;
  effective_from: string;
  effective_to: string | null;
  version_status: LegalRefVersionStatus;
  change_reason: string | null;
  change_summary: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_by: string | null;
  published_at: string | null;
  supersedes_version_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export async function listVersionsForMaster(masterId: string): Promise<LegalReferenceVersion[]> {
  const { data, error } = await db
    .from('core_legal_reference_version')
    .select('*')
    .eq('legal_reference_id', masterId)
    .order('version_number', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LegalReferenceVersion[];
}

export async function getVersion(versionId: string): Promise<LegalReferenceVersion | null> {
  const { data, error } = await db
    .from('core_legal_reference_version')
    .select('*')
    .eq('id', versionId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as LegalReferenceVersion | null;
}

export async function updateDraftVersion(
  versionId: string,
  patch: Partial<LegalReferenceVersion>,
  userCode?: string,
): Promise<void> {
  const payload: any = { ...patch, updated_by: userCode ?? null };
  delete payload.id;
  delete payload.legal_reference_id;
  delete payload.version_status; // status only via lifecycle
  delete payload.created_at;
  delete payload.created_by;
  const { error } = await db
    .from('core_legal_reference_version')
    .update(payload)
    .eq('id', versionId);
  if (error) throw error;
}

/** Resolve the active PUBLISHED version for a (ref_code, country) on a given date. */
export async function getActiveVersion(
  refCode: string,
  countryCode: string,
  asOfDate: string = new Date().toISOString().slice(0, 10),
): Promise<LegalReferenceVersion | null> {
  const { data, error } = await db.rpc('get_active_legal_reference_version', {
    p_ref_code: refCode,
    p_country_code: countryCode,
    p_as_of: asOfDate,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) ?? null;
}

/** Field-by-field diff between two versions. */
export function diffVersions(a: LegalReferenceVersion, b: LegalReferenceVersion) {
  const fields: (keyof LegalReferenceVersion)[] = [
    'section', 'subsection', 'regulation',
    'citation_text', 'full_reference_text', 'official_text',
    'summary', 'source_url', 'gazette_number',
    'effective_from', 'effective_to', 'version_status',
  ];
  return fields
    .map((f) => ({ field: f, before: a[f] ?? null, after: b[f] ?? null }))
    .filter((d) => d.before !== d.after);
}
