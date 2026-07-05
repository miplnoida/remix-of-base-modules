/**
 * Geography Domain Pack — canonical shared facade.
 * Epic 2.2. All Social Security modules consume geography via this service (or the
 * matching `useGeography*` hooks) — NOT by direct table access.
 *
 * Tables (additive, ssp_*):
 *  - ssp_country_profile
 *  - ssp_admin_level
 *  - ssp_geo_area
 *  - ssp_address_format
 *  - ssp_postal_rule
 *  - ssp_jurisdiction
 *  - ssp_country_policy
 *  - ssp_geo_external_code
 */
import { supabase } from '@/integrations/supabase/client';

const db: any = supabase;

export interface SspCountryProfile {
  id: string;
  country_code: string;
  country_name: string;
  iso_alpha2?: string | null;
  iso_alpha3?: string | null;
  iso_numeric?: string | null;
  default_timezone?: string | null;
  default_locale?: string | null;
  default_currency?: string | null;
  is_active: boolean;
  notes?: string | null;
}

export interface SspAdminLevel {
  id: string;
  country_code: string;
  level_no: number;
  code: string;
  name: string;
  plural_name?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface SspGeoArea {
  id: string;
  country_code: string;
  level_no: number;
  parent_id?: string | null;
  code: string;
  name: string;
  geo_codes: Record<string, unknown>;
  external_codes: Record<string, unknown>;
  timezone?: string | null;
  is_active: boolean;
}

export interface SspAddressFormat {
  id: string;
  country_code: string;
  format_name: string;
  fields: Array<Record<string, unknown>>;
  display_template?: string | null;
  sample?: string | null;
  is_default: boolean;
  is_active: boolean;
}

export interface SspJurisdiction {
  id: string;
  country_code: string;
  code: string;
  name: string;
  kind: string;
  parent_id?: string | null;
  geo_area_id?: string | null;
  is_active: boolean;
}

export interface SspCountryPolicy {
  id: string;
  country_code: string;
  policy_key: string;
  policy_value: Record<string, unknown>;
  description?: string | null;
  is_active: boolean;
}

export interface SspGeoExternalCode {
  id: string;
  country_code: string;
  system_code: string;
  entity_kind: string;
  entity_ref: string;
  external_code: string;
  notes?: string | null;
  is_active: boolean;
}

export const geographyService = {
  async listCountries(): Promise<SspCountryProfile[]> {
    const { data, error } = await db
      .from('ssp_country_profile')
      .select('*')
      .order('country_name');
    if (error) throw error;
    return (data ?? []) as SspCountryProfile[];
  },

  async listAdminLevels(countryCode: string): Promise<SspAdminLevel[]> {
    const { data, error } = await db
      .from('ssp_admin_level')
      .select('*')
      .eq('country_code', countryCode)
      .order('level_no');
    if (error) throw error;
    return (data ?? []) as SspAdminLevel[];
  },

  async listGeoAreas(countryCode: string, levelNo?: number): Promise<SspGeoArea[]> {
    let q = db.from('ssp_geo_area').select('*').eq('country_code', countryCode);
    if (typeof levelNo === 'number') q = q.eq('level_no', levelNo);
    const { data, error } = await q.order('level_no').order('name');
    if (error) throw error;
    return (data ?? []) as SspGeoArea[];
  },

  async listAddressFormats(countryCode: string): Promise<SspAddressFormat[]> {
    const { data, error } = await db
      .from('ssp_address_format')
      .select('*')
      .eq('country_code', countryCode)
      .order('format_name');
    if (error) throw error;
    return (data ?? []) as SspAddressFormat[];
  },

  async listJurisdictions(countryCode: string): Promise<SspJurisdiction[]> {
    const { data, error } = await db
      .from('ssp_jurisdiction')
      .select('*')
      .eq('country_code', countryCode)
      .order('code');
    if (error) throw error;
    return (data ?? []) as SspJurisdiction[];
  },

  async listPolicies(countryCode: string): Promise<SspCountryPolicy[]> {
    const { data, error } = await db
      .from('ssp_country_policy')
      .select('*')
      .eq('country_code', countryCode)
      .order('policy_key');
    if (error) throw error;
    return (data ?? []) as SspCountryPolicy[];
  },

  async listExternalCodes(countryCode: string): Promise<SspGeoExternalCode[]> {
    const { data, error } = await db
      .from('ssp_geo_external_code')
      .select('*')
      .eq('country_code', countryCode)
      .order('system_code');
    if (error) throw error;
    return (data ?? []) as SspGeoExternalCode[];
  },
};
