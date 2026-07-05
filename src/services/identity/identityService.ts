/**
 * Identity Domain Pack — canonical shared facade (Epic 2.3).
 * All Social Security modules consume identity via this service (or the matching
 * `useIdentity*` hooks) — NOT by direct table access.
 *
 * Consumes Geography Domain Pack for country linkage (`ssp_country_profile`).
 * Tables (additive, ssp_identity_*):
 *  - ssp_identity_type
 *  - ssp_identity_validation_pattern
 *  - ssp_country_identity_rule
 *  - ssp_party_identity
 *  - ssp_external_identity_ref
 *  - ssp_identity_verification_event
 *  - ssp_identity_match_key
 */
import { supabase } from '@/integrations/supabase/client';

const db: any = supabase;

export type PartyKind =
  | 'member' | 'employer' | 'dependant' | 'nominee'
  | 'representative' | 'staff' | 'portal_user' | 'other';

export type VerificationStatus =
  | 'unverified' | 'verified' | 'failed' | 'expired' | 'manually_reviewed';

export interface SspIdentityType {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface SspIdentityValidationPattern {
  id: string;
  code: string;
  name: string;
  regex: string;
  checksum_algorithm?: string | null;
  sample?: string | null;
  description?: string | null;
  is_active: boolean;
}

export interface SspCountryIdentityRule {
  id: string;
  country_code: string;
  identity_type_code: string;
  is_primary: boolean;
  is_mandatory: boolean;
  format_hint?: string | null;
  min_length?: number | null;
  max_length?: number | null;
  regex?: string | null;
  checksum_algorithm?: string | null;
  validation_pattern_code?: string | null;
  expiry_required: boolean;
  issuing_authority?: string | null;
  notes?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface SspPartyIdentity {
  id: string;
  party_kind: PartyKind;
  party_ref: string;
  country_code: string;
  identity_type_code: string;
  identity_value: string;
  normalised_value?: string | null;
  issued_on?: string | null;
  expires_on?: string | null;
  issuing_authority?: string | null;
  is_primary: boolean;
  verification_status: VerificationStatus;
  last_verified_at?: string | null;
  notes?: string | null;
  is_active: boolean;
}

export interface SspExternalIdentityRef {
  id: string;
  party_kind: PartyKind;
  party_ref: string;
  system_code: string;
  external_ref: string;
  external_metadata: Record<string, unknown>;
  is_active: boolean;
}

export interface SspIdentityVerificationEvent {
  id: string;
  party_identity_id: string;
  event_type: string;
  status: VerificationStatus;
  verified_by?: string | null;
  verification_source?: string | null;
  evidence_ref?: string | null;
  reason?: string | null;
  event_metadata: Record<string, unknown>;
  created_at: string;
}

export interface SspIdentityMatchKey {
  id: string;
  party_kind: PartyKind;
  party_ref: string;
  key_type: string;
  key_value: string;
  key_metadata: Record<string, unknown>;
  is_active: boolean;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  ruleApplied?: SspCountryIdentityRule;
}

/** Normalise an identity value — currently upper-case + strip non-alphanumerics. */
export function normaliseIdentity(_identityTypeCode: string, value: string): string {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export const identityService = {
  async listIdentityTypes(): Promise<SspIdentityType[]> {
    const { data, error } = await db.from('ssp_identity_type').select('*').order('sort_order').order('name');
    if (error) throw error;
    return (data ?? []) as SspIdentityType[];
  },

  async listValidationPatterns(): Promise<SspIdentityValidationPattern[]> {
    const { data, error } = await db.from('ssp_identity_validation_pattern').select('*').order('code');
    if (error) throw error;
    return (data ?? []) as SspIdentityValidationPattern[];
  },

  async listCountryRules(countryCode: string): Promise<SspCountryIdentityRule[]> {
    const { data, error } = await db
      .from('ssp_country_identity_rule')
      .select('*')
      .eq('country_code', countryCode)
      .order('is_primary', { ascending: false })
      .order('sort_order');
    if (error) throw error;
    return (data ?? []) as SspCountryIdentityRule[];
  },

  async listPartyIdentities(partyKind: PartyKind, partyRef: string): Promise<SspPartyIdentity[]> {
    const { data, error } = await db
      .from('ssp_party_identity')
      .select('*')
      .eq('party_kind', partyKind)
      .eq('party_ref', partyRef)
      .order('is_primary', { ascending: false });
    if (error) throw error;
    return (data ?? []) as SspPartyIdentity[];
  },

  async listExternalRefs(partyKind: PartyKind, partyRef: string): Promise<SspExternalIdentityRef[]> {
    const { data, error } = await db
      .from('ssp_external_identity_ref')
      .select('*')
      .eq('party_kind', partyKind)
      .eq('party_ref', partyRef)
      .order('system_code');
    if (error) throw error;
    return (data ?? []) as SspExternalIdentityRef[];
  },

  async listVerificationEvents(partyIdentityId: string): Promise<SspIdentityVerificationEvent[]> {
    const { data, error } = await db
      .from('ssp_identity_verification_event')
      .select('*')
      .eq('party_identity_id', partyIdentityId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as SspIdentityVerificationEvent[];
  },

  async listMatchKeys(partyKind: PartyKind, partyRef: string): Promise<SspIdentityMatchKey[]> {
    const { data, error } = await db
      .from('ssp_identity_match_key')
      .select('*')
      .eq('party_kind', partyKind)
      .eq('party_ref', partyRef);
    if (error) throw error;
    return (data ?? []) as SspIdentityMatchKey[];
  },

  /**
   * Validate an identity value against the effective country rule. Pure client-side
   * check — server-side re-validation MUST happen at write time (see edge functions
   * added in later waves).
   */
  async validateIdentity(
    countryCode: string,
    identityTypeCode: string,
    value: string,
  ): Promise<ValidationResult> {
    const rules = await this.listCountryRules(countryCode);
    const rule = rules.find((r) => r.identity_type_code === identityTypeCode && r.is_active);
    if (!rule) {
      return { valid: false, reason: `No active rule for ${identityTypeCode} in ${countryCode}` };
    }
    const raw = (value ?? '').trim();
    if (!raw) return { valid: false, reason: 'Value is empty', ruleApplied: rule };
    if (rule.min_length && raw.length < rule.min_length) {
      return { valid: false, reason: `Value shorter than ${rule.min_length}`, ruleApplied: rule };
    }
    if (rule.max_length && raw.length > rule.max_length) {
      return { valid: false, reason: `Value longer than ${rule.max_length}`, ruleApplied: rule };
    }
    if (rule.regex) {
      try {
        const re = new RegExp(rule.regex);
        if (!re.test(raw)) return { valid: false, reason: 'Value does not match pattern', ruleApplied: rule };
      } catch {
        return { valid: false, reason: 'Invalid regex configured on rule', ruleApplied: rule };
      }
    }
    return { valid: true, ruleApplied: rule };
  },
};
