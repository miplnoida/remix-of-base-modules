/**
 * legalReferenceService — CRUD for the new structured BN Legal Reference master
 * (`bn_legal_reference`). Replaces the loose-text legacy `bn_country_legal_ref`
 * usage in the Country Pack screens. References here are selectable by Product
 * Catalog, Eligibility Rules, Formula Library, Rate Tables, Medical Tariffs,
 * Communication Templates and Decision Letters.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type LegalRefStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'REPEALED';

export interface BnLegalReference {
  id: string;
  country_code: string;
  ref_code: string;
  short_title: string;
  act_name: string | null;
  chapter: string | null;
  section: string | null;
  subsection: string | null;
  regulation: string | null;
  full_reference_text: string | null;
  ref_url: string | null;
  effective_from: string;
  effective_to: string | null;
  status: LegalRefStatus;
  version_number: number;
  supersedes_id: string | null;
  tags: string[] | null;
  applicable_products: string[] | null;
  notes: string | null;
  is_active: boolean;
  legacy_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export async function listLegalReferences(countryCode: string, opts?: { includeInactive?: boolean }) {
  let q = db
    .from('bn_legal_reference')
    .select('*')
    .eq('country_code', countryCode)
    .order('status')
    .order('ref_code')
    .order('version_number', { ascending: false });
  if (!opts?.includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as BnLegalReference[];
}

export async function getLegalReference(id: string) {
  const { data, error } = await db.from('bn_legal_reference').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as BnLegalReference | null;
}

export async function upsertLegalReference(ref: Partial<BnLegalReference> & { country_code: string; ref_code: string; short_title: string; effective_from: string }, userCode?: string) {
  const payload: any = {
    country_code: ref.country_code,
    ref_code: ref.ref_code,
    short_title: ref.short_title,
    act_name: ref.act_name ?? null,
    chapter: ref.chapter ?? null,
    section: ref.section ?? null,
    subsection: ref.subsection ?? null,
    regulation: ref.regulation ?? null,
    full_reference_text: ref.full_reference_text ?? null,
    ref_url: ref.ref_url ?? null,
    effective_from: ref.effective_from,
    effective_to: ref.effective_to ?? null,
    status: ref.status ?? 'DRAFT',
    version_number: ref.version_number ?? 1,
    supersedes_id: ref.supersedes_id ?? null,
    tags: ref.tags ?? null,
    applicable_products: ref.applicable_products ?? null,
    notes: ref.notes ?? null,
    is_active: ref.is_active ?? true,
    updated_by: userCode ?? null,
  };
  if (ref.id) {
    const { error } = await db.from('bn_legal_reference').update(payload).eq('id', ref.id);
    if (error) throw error;
    return ref.id;
  }
  payload.created_by = userCode ?? null;
  const { data, error } = await db.from('bn_legal_reference').insert(payload).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteLegalReference(id: string) {
  const { error } = await db.from('bn_legal_reference').delete().eq('id', id);
  if (error) throw error;
}

export async function setLegalReferenceStatus(id: string, status: LegalRefStatus, userCode?: string) {
  const { error } = await db
    .from('bn_legal_reference')
    .update({ status, is_active: status === 'ACTIVE' || status === 'DRAFT', updated_by: userCode ?? null })
    .eq('id', id);
  if (error) throw error;
}
