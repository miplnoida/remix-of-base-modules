/**
 * Party Projection Service — Epic 2.6A (Member/Employer Read-Only Adoption Wave).
 *
 * Read-only facade over legacy `ip_master` and `er_master` via
 * `v_ssp_party_projection`. Downstream modules MUST consume legacy party data
 * through this service or the matching hooks — never via direct legacy table
 * access. No writes, no dual-write, no migration.
 */
import { supabase } from '@/integrations/supabase/client';

const db: any = supabase;

export type PartyKind = 'PERSON' | 'ORGANISATION';
export type PartySourceSystem = 'ip_master' | 'er_master';

export interface PartyProjection {
  source_system: PartySourceSystem;
  source_id: string;
  legacy_ref: string;
  party_kind: PartyKind;
  display_name: string | null;
  primary_identifier: string | null;
  primary_identifier_type: string | null;
  gender: string | null;
  date_of_birth: string | null;
  nationality_code: string | null;
  legacy_status: string | null;
  geo_area_code: string | null;
  mobile: string | null;
  phone: string | null;
  email: string | null;
  created_at: string | null;
  updated_at: string | null;
  projected_roles: string[];
}

export interface PartySearchParams {
  q?: string;
  kind?: PartyKind;
  sourceSystem?: PartySourceSystem;
  limit?: number;
}

const VIEW = 'v_ssp_party_projection';

export const partyProjectionService = {
  async search(params: PartySearchParams = {}): Promise<PartyProjection[]> {
    const { q, kind, sourceSystem, limit = 100 } = params;
    let query = db.from(VIEW).select('*').limit(limit);
    if (kind)         query = query.eq('party_kind', kind);
    if (sourceSystem) query = query.eq('source_system', sourceSystem);
    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      query = query.or(
        `display_name.ilike.${term},primary_identifier.ilike.${term},legacy_ref.ilike.${term}`
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as PartyProjection[];
  },

  async listMembers(limit = 100): Promise<PartyProjection[]> {
    return this.search({ sourceSystem: 'ip_master', limit });
  },

  async listEmployers(limit = 100): Promise<PartyProjection[]> {
    return this.search({ sourceSystem: 'er_master', limit });
  },

  async resolveByLegacyId(
    sourceSystem: PartySourceSystem,
    legacyId: string,
  ): Promise<PartyProjection | null> {
    const { data, error } = await db
      .from(VIEW)
      .select('*')
      .eq('source_system', sourceSystem)
      .eq('legacy_ref', legacyId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as PartyProjection | null;
  },

  /**
   * Roles projected from the legacy source system. Read-only — until a real
   * adoption wave writes to `ssp_party_role_binding`, roles come from the view.
   */
  async listRoles(
    sourceSystem: PartySourceSystem,
    legacyId: string,
  ): Promise<string[]> {
    const p = await this.resolveByLegacyId(sourceSystem, legacyId);
    return p?.projected_roles ?? [];
  },
};
