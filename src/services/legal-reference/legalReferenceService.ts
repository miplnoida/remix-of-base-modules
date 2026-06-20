/**
 * Shared Legal Reference service — module-agnostic CRUD over `legal_reference`.
 * Replaces the Benefits-only service. Any module can consume this directly.
 */
import { supabase } from '@/integrations/supabase/client';
import type { LegalReference, LegalRefStatus, LegalReferenceType } from './types';

const db = supabase as any;

export async function listLegalReferences(
  countryCode: string,
  opts?: { includeInactive?: boolean; tags?: string[]; statuses?: LegalRefStatus[] },
): Promise<LegalReference[]> {
  let q = db.from('core_legal_reference').select('*').eq('country_code', countryCode);
  if (!opts?.includeInactive) q = q.eq('is_active', true);
  if (opts?.statuses?.length) q = q.in('status', opts.statuses);
  q = q.order('status').order('ref_code').order('version_number', { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as LegalReference[];
  if (opts?.tags?.length) {
    const wanted = new Set(opts.tags);
    rows = rows.filter((r) => (r.tags ?? []).some((t) => wanted.has(t)));
  }
  return rows;
}

export async function getLegalReference(id: string): Promise<LegalReference | null> {
  const { data, error } = await db.from('core_legal_reference').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as LegalReference | null;
}

export async function upsertLegalReference(
  ref: Partial<LegalReference> & {
    country_code: string;
    ref_code: string;
    short_title: string;
    effective_from: string;
  },
  userCode?: string,
): Promise<string> {
  const payload: any = {
    country_code: ref.country_code,
    ref_code: ref.ref_code,
    ref_type: ref.ref_type ?? null,
    short_title: ref.short_title,
    act_name: ref.act_name ?? null,
    chapter: ref.chapter ?? null,
    section: ref.section ?? null,
    subsection: ref.subsection ?? null,
    regulation: ref.regulation ?? null,
    full_reference_text: ref.full_reference_text ?? null,
    ref_url: ref.ref_url ?? null,
    jurisdiction: ref.jurisdiction ?? null,
    source: ref.source ?? null,
    effective_from: ref.effective_from,
    effective_to: ref.effective_to ?? null,
    status: ref.status ?? 'DRAFT',
    version_number: ref.version_number ?? 1,
    supersedes_id: ref.supersedes_id ?? null,
    tags: ref.tags ?? null,
    notes: ref.notes ?? null,
    is_active: ref.is_active ?? true,
    updated_by: userCode ?? null,
  };
  if (ref.id) {
    const { error } = await db.from('core_legal_reference').update(payload).eq('id', ref.id);
    if (error) throw error;
    return ref.id;
  }
  payload.created_by = userCode ?? null;
  const { data, error } = await db.from('core_legal_reference').insert(payload).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteLegalReference(id: string): Promise<void> {
  const { error } = await db.from('core_legal_reference').delete().eq('id', id);
  if (error) throw error;
}

export async function setLegalReferenceStatus(
  id: string,
  status: LegalRefStatus,
  userCode?: string,
): Promise<void> {
  const { error } = await db
    .from('core_legal_reference')
    .update({
      status,
      is_active: status === 'ACTIVE' || status === 'DRAFT',
      updated_by: userCode ?? null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function listLegalReferenceTypes(): Promise<LegalReferenceType[]> {
  const { data, error } = await db
    .from('legal_reference_type')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as LegalReferenceType[];
}
