/**
 * Manages prior-matter links: connect a previously-existing employer
 * matter (case, violation, arrangement, legal proceeding, follow-up,
 * past inspection, past report, dispute) to either an audit visit
 * (inspection) or a specific finding.
 *
 * Stored in `ce_audit_prior_matter_links` (created in Phase A).
 */
import { supabase } from '@/integrations/supabase/client';
import type { PriorMatterLink, PriorMatterType } from '@/types/employerHistory';

type LinkTarget =
  | { inspectionId: string; findingId?: undefined }
  | { findingId: string; inspectionId?: undefined };

export interface CreateLinkInput {
  target: LinkTarget;
  employerId: string;
  matterType: PriorMatterType;
  matterId: string;
  matterLabel?: string | null;
  relevanceNote?: string | null;
  linkedBy?: string | null;
}

export async function createPriorMatterLink(input: CreateLinkInput): Promise<PriorMatterLink> {
  const row = {
    inspection_id: input.target.inspectionId ?? null,
    finding_id: input.target.findingId ?? null,
    employer_id: input.employerId,
    matter_type: input.matterType,
    matter_id: input.matterId,
    matter_label: input.matterLabel ?? null,
    relevance_note: input.relevanceNote ?? null,
    linked_by: input.linkedBy ?? null,
    is_active: true,
  };
  const { data, error } = await supabase
    .from('ce_audit_prior_matter_links')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as PriorMatterLink;
}

export async function listPriorMatterLinksForVisit(inspectionId: string): Promise<PriorMatterLink[]> {
  const { data, error } = await supabase
    .from('ce_audit_prior_matter_links')
    .select('*')
    .eq('inspection_id', inspectionId)
    .eq('is_active', true)
    .order('linked_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PriorMatterLink[];
}

export async function listPriorMatterLinksForFinding(findingId: string): Promise<PriorMatterLink[]> {
  const { data, error } = await supabase
    .from('ce_audit_prior_matter_links')
    .select('*')
    .eq('finding_id', findingId)
    .eq('is_active', true)
    .order('linked_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PriorMatterLink[];
}

/**
 * Returns all links for an inspection — both visit-level and the union of
 * its findings — so report sections can render everything attached to a visit.
 */
export async function listAllLinksForInspection(inspectionId: string): Promise<PriorMatterLink[]> {
  const visitLinks = await listPriorMatterLinksForVisit(inspectionId);

  const { data: findings, error: fErr } = await supabase
    .from('ce_inspection_findings')
    .select('id')
    .eq('inspection_id', inspectionId);
  if (fErr) throw fErr;
  const findingIds = (findings ?? []).map((f: any) => f.id);
  if (findingIds.length === 0) return visitLinks;

  const { data: findingLinks, error } = await supabase
    .from('ce_audit_prior_matter_links')
    .select('*')
    .in('finding_id', findingIds)
    .eq('is_active', true);
  if (error) throw error;

  return [...visitLinks, ...((findingLinks ?? []) as unknown as PriorMatterLink[])];
}

export async function deactivatePriorMatterLink(id: string): Promise<void> {
  const { error } = await supabase
    .from('ce_audit_prior_matter_links')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}
