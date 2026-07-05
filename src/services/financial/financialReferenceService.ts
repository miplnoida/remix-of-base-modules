/**
 * Financial Reference Domain Pack — canonical shared facade (Epic 2.4).
 * All Social Security modules consume financial reference data via this service
 * (or the matching `useFinancial*` hooks) — NOT by direct table access.
 *
 * Consumes Geography Domain Pack for country linkage. Additive `ssp_*` tables only.
 * Does NOT execute payments, post to GL, or mutate BN/Finance/Cashier legacy tables.
 */
import { supabase } from '@/integrations/supabase/client';

const db: any = supabase;

export interface SspCurrencyProfile {
  id: string;
  currency_code: string;
  currency_name: string;
  numeric_code?: string | null;
  symbol?: string | null;
  minor_unit: number;
  is_active: boolean;
  sort_order: number;
}

export interface SspExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  rate_date: string;
  source?: string | null;
  is_active: boolean;
}

export interface SspBank {
  id: string;
  bank_code: string;
  bank_name: string;
  short_name?: string | null;
  country_code?: string | null;
  swift_bic?: string | null;
  national_code?: string | null;
  legacy_ref?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface SspBankBranch {
  id: string;
  bank_id: string;
  branch_code: string;
  branch_name: string;
  address?: string | null;
  city?: string | null;
  geo_area_id?: string | null;
  country_code?: string | null;
  routing_number?: string | null;
  swift_bic?: string | null;
  is_active: boolean;
}

export interface SspPaymentChannel {
  id: string;
  channel_code: string;
  channel_name: string;
  category: string;
  direction: string;
  country_code?: string | null;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface SspSettlementMethod {
  id: string;
  method_code: string;
  method_name: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface SspAccountType {
  id: string;
  account_code: string;
  account_name: string;
  category: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface SspTaxReference {
  id: string;
  country_code: string;
  tax_code: string;
  tax_name: string;
  tax_authority?: string | null;
  description?: string | null;
  is_active: boolean;
}

export interface SspChartOfAccountRef {
  id: string;
  account_code: string;
  account_name: string;
  account_type?: string | null;
  parent_code?: string | null;
  country_code?: string | null;
  description?: string | null;
  is_active: boolean;
}

export interface SspFinancialExternalCode {
  id: string;
  system_code: string;
  entity_type: string;
  local_ref: string;
  external_code: string;
  external_metadata: Record<string, unknown>;
  is_active: boolean;
}

export interface SspCountryFinancialAvailability {
  id: string;
  country_code: string;
  entity_type: string;
  entity_ref: string;
  is_available: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
  notes?: string | null;
}

export const financialReferenceService = {
  async listCurrencies(): Promise<SspCurrencyProfile[]> {
    const { data, error } = await db.from('ssp_currency_profile').select('*').order('sort_order').order('currency_code');
    if (error) throw error;
    return (data ?? []) as SspCurrencyProfile[];
  },

  async listExchangeRates(from?: string, to?: string): Promise<SspExchangeRate[]> {
    let q = db.from('ssp_exchange_rate').select('*').order('rate_date', { ascending: false });
    if (from) q = q.eq('from_currency', from);
    if (to) q = q.eq('to_currency', to);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspExchangeRate[];
  },

  async listBanks(countryCode?: string | null): Promise<SspBank[]> {
    let q = db.from('ssp_bank').select('*').order('sort_order').order('bank_name');
    if (countryCode) q = q.eq('country_code', countryCode);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspBank[];
  },

  async listBankBranches(bankId?: string | null): Promise<SspBankBranch[]> {
    let q = db.from('ssp_bank_branch').select('*').order('branch_name');
    if (bankId) q = q.eq('bank_id', bankId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspBankBranch[];
  },

  async listPaymentChannels(countryCode?: string | null): Promise<SspPaymentChannel[]> {
    let q = db.from('ssp_payment_channel').select('*').order('sort_order').order('channel_name');
    if (countryCode) q = q.or(`country_code.eq.${countryCode},country_code.is.null`);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspPaymentChannel[];
  },

  async listSettlementMethods(): Promise<SspSettlementMethod[]> {
    const { data, error } = await db.from('ssp_settlement_method').select('*').order('sort_order').order('method_name');
    if (error) throw error;
    return (data ?? []) as SspSettlementMethod[];
  },

  async listAccountTypes(): Promise<SspAccountType[]> {
    const { data, error } = await db.from('ssp_account_type').select('*').order('sort_order').order('account_name');
    if (error) throw error;
    return (data ?? []) as SspAccountType[];
  },

  async listTaxReferences(countryCode?: string | null): Promise<SspTaxReference[]> {
    let q = db.from('ssp_tax_reference').select('*').order('tax_code');
    if (countryCode) q = q.eq('country_code', countryCode);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspTaxReference[];
  },

  async listChartOfAccountRefs(countryCode?: string | null): Promise<SspChartOfAccountRef[]> {
    let q = db.from('ssp_chart_of_account_ref').select('*').order('account_code');
    if (countryCode) q = q.eq('country_code', countryCode);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspChartOfAccountRef[];
  },

  async listFinancialExternalCodes(entityType?: string): Promise<SspFinancialExternalCode[]> {
    let q = db.from('ssp_financial_external_code').select('*').order('system_code');
    if (entityType) q = q.eq('entity_type', entityType);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspFinancialExternalCode[];
  },

  async listCountryAvailability(countryCode?: string | null): Promise<SspCountryFinancialAvailability[]> {
    let q = db.from('ssp_country_financial_availability').select('*').order('entity_type');
    if (countryCode) q = q.eq('country_code', countryCode);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SspCountryFinancialAvailability[];
  },

  /** Resolve a payment channel for a country by channel code — country-specific overrides global. */
  async resolvePaymentChannel(countryCode: string, channelCode: string): Promise<SspPaymentChannel | null> {
    const channels = await this.listPaymentChannels(countryCode);
    return (
      channels.find((c) => c.channel_code === channelCode && c.country_code === countryCode && c.is_active)
      ?? channels.find((c) => c.channel_code === channelCode && !c.country_code && c.is_active)
      ?? null
    );
  },

  /** Resolve a bank by external system code (e.g. legacy_bn, tb_bank_code). */
  async resolveBankByExternalCode(systemCode: string, externalCode: string): Promise<SspBank | null> {
    const { data: ext, error } = await db
      .from('ssp_financial_external_code')
      .select('local_ref')
      .eq('system_code', systemCode)
      .eq('entity_type', 'bank')
      .eq('external_code', externalCode)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    if (!ext?.local_ref) return null;
    const { data: bank, error: bErr } = await db.from('ssp_bank').select('*').eq('id', ext.local_ref).maybeSingle();
    if (bErr) throw bErr;
    return (bank ?? null) as SspBank | null;
  },
};
