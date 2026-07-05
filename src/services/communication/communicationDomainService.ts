/**
 * Communication & Correspondence Domain Pack — canonical shared facade (Epic 2.7).
 *
 * All modules MUST consume communication/correspondence configuration via this
 * service (or the matching `useCommunication*` hooks) — NEVER via direct table
 * access and NEVER by rebuilding a parallel notification/template engine.
 *
 * Reuses:
 *   - existing `notification_templates` (template source of truth)
 *   - existing `comm_*` assets (letterheads, signatures, disclaimers, layouts)
 *   - Participant Domain Pack (recipient resolution via v_ssp_party_projection)
 *   - Identity Domain Pack (party identifier resolution)
 *   - Legal Reference Domain Pack (legal notice citation)
 *   - Enterprise Reference Framework
 *
 * Additive `ssp_*` tables only. Does NOT modify BN, Legal, Compliance, BEMA,
 * IA or legacy comm/notification tables.
 */
import { supabase } from '@/integrations/supabase/client';
import { partyProjectionService, type PartyProjection, type PartySourceSystem }
  from '@/services/participant/partyProjectionService';

const db: any = supabase;

export interface SspCommunicationChannel {
  id: string; code: string; name: string; category: string;
  is_two_way: boolean; supports_attachments: boolean;
  description?: string | null; is_active: boolean; sort_order: number;
}
export interface SspCorrespondenceType {
  id: string; code: string; name: string; category: string;
  legal_binding: boolean; description?: string | null;
  is_active: boolean; sort_order: number;
}
export interface SspRecipientPreference {
  id: string; party_kind: string; party_source: string; party_ref: string;
  channel_code: string; is_preferred: boolean; opt_in: boolean;
  opt_out_reason?: string | null; effective_from?: string | null;
  effective_to?: string | null; notes?: string | null; is_active: boolean;
}
export interface SspCorrespondenceTemplateBinding {
  id: string; correspondence_code: string; channel_code: string;
  template_source: string; template_ref: string;
  language_code: string; country_code?: string | null;
  is_default: boolean; is_active: boolean; notes?: string | null;
}
export interface SspCorrespondenceLegalRef {
  id: string; correspondence_code: string; legal_reference_code: string;
  country_code?: string | null; citation?: string | null;
  notes?: string | null; is_active: boolean;
}
export interface SspDeliveryStatusRef {
  id: string; code: string; name: string; category: string;
  is_terminal: boolean; is_success: boolean;
  description?: string | null; is_active: boolean; sort_order: number;
}
export interface SspExternalProviderCode {
  id: string; channel_code: string; provider_name: string;
  provider_code: string; internal_code: string; code_type: string;
  description?: string | null; is_active: boolean;
}

async function listAll<T>(table: string, orderBy: string[] = ['sort_order']): Promise<T[]> {
  let q = db.from(table).select('*');
  for (const c of orderBy) q = q.order(c);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as T[];
}

export interface ResolvedRecipient {
  party: PartyProjection | null;
  preferences: SspRecipientPreference[];
  preferredChannel: string | null;
}

export const communicationDomainService = {
  listCommunicationChannels: () =>
    listAll<SspCommunicationChannel>('ssp_communication_channel', ['sort_order', 'name']),

  listCorrespondenceTypes: () =>
    listAll<SspCorrespondenceType>('ssp_correspondence_type', ['sort_order', 'name']),

  listDeliveryStatuses: () =>
    listAll<SspDeliveryStatusRef>('ssp_delivery_status_ref', ['sort_order', 'name']),

  async listRecipientPreferences(partySource?: string, partyRef?: string): Promise<SspRecipientPreference[]> {
    let q = db.from('ssp_recipient_preference').select('*')
      .order('is_preferred', { ascending: false });
    if (partySource) q = q.eq('party_source', partySource);
    if (partyRef)    q = q.eq('party_ref',    partyRef);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspRecipientPreference[];
  },

  async listTemplateBindings(correspondenceCode?: string): Promise<SspCorrespondenceTemplateBinding[]> {
    let q = db.from('ssp_correspondence_template_binding').select('*')
      .order('correspondence_code').order('channel_code');
    if (correspondenceCode) q = q.eq('correspondence_code', correspondenceCode);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspCorrespondenceTemplateBinding[];
  },

  async listLegalNoticeMappings(): Promise<SspCorrespondenceLegalRef[]> {
    const { data, error } = await db.from('ssp_correspondence_legal_ref')
      .select('*').order('correspondence_code');
    if (error) throw error;
    return (data ?? []) as SspCorrespondenceLegalRef[];
  },

  async listProviderCodes(): Promise<SspExternalProviderCode[]> {
    const { data, error } = await db.from('ssp_external_provider_code')
      .select('*').order('channel_code').order('provider_name');
    if (error) throw error;
    return (data ?? []) as SspExternalProviderCode[];
  },

  /**
   * Recipient resolution: resolves any legacy party (ip_master / er_master)
   * via the Participant facade and returns its communication preferences +
   * preferred channel. NEVER touches legacy tables directly.
   */
  async resolveRecipient(
    partySource: PartySourceSystem,
    legacyId: string,
  ): Promise<ResolvedRecipient> {
    const party = await partyProjectionService.resolveByLegacyId(partySource, legacyId);
    const preferences = await this.listRecipientPreferences(partySource, legacyId);
    const preferred = preferences.find(p => p.is_preferred && p.opt_in && p.is_active);
    return {
      party,
      preferences,
      preferredChannel: preferred?.channel_code ?? null,
    };
  },
};
