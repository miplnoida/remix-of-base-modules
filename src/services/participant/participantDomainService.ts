/**
 * Participant / Party Domain Pack — canonical shared facade (Epic 2.6).
 * All Social Security modules consume participant / party classification via this
 * service (or the matching `useParticipant*` hooks) — NOT via direct table access.
 *
 * Consumes:
 *   - Geography Domain (country linkage)
 *   - Identity Domain (party identifier resolution)
 *   - Financial Reference Domain (bank / payment classification)
 *   - Legal Reference Domain (legal-representative citations)
 *   - Enterprise Reference Framework (classification codes)
 *
 * Additive `ssp_*` tables only. Does NOT modify legacy ip_*, er_*, BN, BEMA,
 * Compliance, IA or Legal tables.
 */
import { supabase } from '@/integrations/supabase/client';

const db: any = supabase;

export interface SspPartyType {
  id: string; code: string; name: string; category: string;
  description?: string | null; is_active: boolean; sort_order: number;
}
export interface SspParticipantRole {
  id: string; code: string; name: string; category: string;
  applies_to: string[]; description?: string | null;
  is_active: boolean; sort_order: number;
}
export interface SspRelationshipType {
  id: string; code: string; name: string; reciprocal_code?: string | null;
  category: string; description?: string | null; is_active: boolean; sort_order: number;
}
export interface SspMemberType {
  id: string; code: string; name: string; description?: string | null;
  is_active: boolean; sort_order: number;
}
export interface SspEmployerType {
  id: string; code: string; name: string; description?: string | null;
  is_active: boolean; sort_order: number;
}
export interface SspOccupationCategory {
  id: string; code: string; name: string; isco_code?: string | null;
  parent_code?: string | null; description?: string | null;
  is_active: boolean; sort_order: number;
}
export interface SspNationality {
  id: string; code: string; name: string; country_code?: string | null;
  is_default_domestic: boolean; description?: string | null;
  is_active: boolean; sort_order: number;
}
export interface SspDisabilityType {
  id: string; code: string; name: string; category: string;
  description?: string | null; is_active: boolean; sort_order: number;
}
export interface SspLifeStatus {
  id: string; code: string; name: string; description?: string | null;
  is_terminal: boolean; is_active: boolean; sort_order: number;
}
export interface SspPartyRoleBinding {
  id: string; party_kind: string; party_ref: string; role_code: string;
  scope_code?: string | null; effective_from?: string | null;
  effective_to?: string | null; is_primary: boolean; notes?: string | null;
  is_active: boolean;
}

async function listAll<T>(table: string, orderBy: string[] = ['sort_order']): Promise<T[]> {
  let q = db.from(table).select('*');
  for (const c of orderBy) q = q.order(c);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as T[];
}

export const participantDomainService = {
  listPartyTypes:            () => listAll<SspPartyType>('ssp_party_type', ['sort_order', 'name']),
  listParticipantRoles:      () => listAll<SspParticipantRole>('ssp_participant_role', ['sort_order', 'name']),
  listRelationshipTypes:     () => listAll<SspRelationshipType>('ssp_relationship_type', ['sort_order', 'name']),
  listMemberTypes:           () => listAll<SspMemberType>('ssp_member_type', ['sort_order', 'name']),
  listEmployerTypes:         () => listAll<SspEmployerType>('ssp_employer_type', ['sort_order', 'name']),
  listOccupationCategories:  () => listAll<SspOccupationCategory>('ssp_occupation_category', ['sort_order', 'name']),
  listNationalities:         () => listAll<SspNationality>('ssp_nationality', ['sort_order', 'name']),
  listDisabilityTypes:       () => listAll<SspDisabilityType>('ssp_disability_type', ['sort_order', 'name']),
  listLifeStatuses:          () => listAll<SspLifeStatus>('ssp_life_status', ['sort_order', 'name']),

  async listPartyRoleBindings(partyKind?: string, partyRef?: string): Promise<SspPartyRoleBinding[]> {
    let q = db.from('ssp_party_role_binding').select('*').order('is_primary', { ascending: false });
    if (partyKind) q = q.eq('party_kind', partyKind);
    if (partyRef)  q = q.eq('party_ref',  partyRef);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspPartyRoleBinding[];
  },

  async resolveRole(code: string): Promise<SspParticipantRole | null> {
    const { data, error } = await db
      .from('ssp_participant_role')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as SspParticipantRole | null;
  },
};
