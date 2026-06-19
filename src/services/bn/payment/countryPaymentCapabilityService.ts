/**
 * Country Payment Capability Service
 * ----------------------------------------------------------------------------
 * Owns the *capability* layer of the BN Payment Configuration Hierarchy:
 *
 *   Country Pack  →  defines what is POSSIBLE in this country
 *     • allowed payment methods (rows where is_method_enabled = true)
 *     • default currency (bn_country.currency_code)
 *     • bank validation rule set (bank_validation_rule_set jsonb)
 *     • EFT file format (bank_file_format + header/detail/trailer)
 *     • cheque format (cheque_format_template_id) and cheque stock requirement
 *     • account validation rules (account_number_rule, routing_number_rule)
 *     • third-party payee / provider direct-pay allowance per method
 *     • default method priority (default_priority)
 *
 * Product Catalog narrows from this — it can never widen.
 *
 * Reads/writes are routed through the BN audit pipeline so every mutation
 * is captured in system_audit_trail with full request context.
 */
import { supabase } from '@/integrations/supabase/client';
import { auditConfigChange } from '@/services/bn/audit/bnAuditService';

const db = supabase as any;

export type BnPaymentMethodCode = 'EFT' | 'CHEQUE' | 'CASH' | 'WALLET' | 'INTERNAL_TRANSFER' | string;

export interface CountryPaymentMethodCapability {
  id: string;
  country_code: string;
  payment_method: BnPaymentMethodCode;
  method_label: string | null;
  is_active: boolean;
  is_method_enabled: boolean;
  is_default: boolean;
  default_priority: number | null;
  requires_bank_account: boolean;
  requires_mobile_number: boolean;
  allow_third_party_payee: boolean;
  allow_provider_direct_pay: boolean;

  // EFT format
  bank_file_format: string | null;
  header_record_format: string | null;
  detail_record_format: string | null;
  trailer_record_format: string | null;
  file_date_format: string | null;
  file_naming_convention: string | null;
  bank_code: string | null;
  account_number_rule: string | null;
  routing_number_rule: string | null;

  // Cheque
  cheque_stock_required: boolean;
  cheque_format_template_id: string | null;

  // Bank validation
  bank_validation_rule_set: Record<string, any>;

  // Cycle
  processing_days: number | null;
  cut_off_day: number | null;
  payment_cycle: string | null;
  calendar_config: Record<string, any> | null;
}

export interface CountryCurrencyPolicy {
  country_code: string;
  currency_code: string;
  allow_foreign_currency_products: boolean;
  allowed_alt_currencies: string[];
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export async function listCountryPaymentCapabilities(
  countryCode: string,
): Promise<CountryPaymentMethodCapability[]> {
  const { data, error } = await db
    .from('bn_country_payment_config')
    .select('*')
    .eq('country_code', countryCode)
    .order('default_priority', { ascending: true, nullsFirst: false })
    .order('payment_method');
  if (error) throw error;
  return (data ?? []) as CountryPaymentMethodCapability[];
}

export async function getEnabledMethodsForCountry(countryCode: string): Promise<BnPaymentMethodCode[]> {
  const { data, error } = await db
    .from('bn_country_payment_config')
    .select('payment_method')
    .eq('country_code', countryCode)
    .eq('is_active', true)
    .eq('is_method_enabled', true);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.payment_method as BnPaymentMethodCode);
}

export async function getCountryCurrencyPolicy(countryCode: string): Promise<CountryCurrencyPolicy | null> {
  const { data, error } = await db
    .from('bn_country')
    .select('country_code,currency_code,allow_foreign_currency_products,allowed_alt_currencies')
    .eq('country_code', countryCode)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as CountryCurrencyPolicy | null;
}

// ---------------------------------------------------------------------------
// Writes — every mutation is audited
// ---------------------------------------------------------------------------
export interface UpsertCountryMethodInput extends Partial<CountryPaymentMethodCapability> {
  country_code: string;
  payment_method: BnPaymentMethodCode;
}

export async function upsertCountryPaymentMethod(
  input: UpsertCountryMethodInput,
  performedBy: string,
): Promise<CountryPaymentMethodCapability> {
  const { data: before } = await db
    .from('bn_country_payment_config')
    .select('*')
    .eq('country_code', input.country_code)
    .eq('payment_method', input.payment_method)
    .maybeSingle();

  const { data, error } = await db
    .from('bn_country_payment_config')
    .upsert(
      { ...input, modified_by: performedBy },
      { onConflict: 'country_code,payment_method' },
    )
    .select('*')
    .single();
  if (error) throw error;

  await auditConfigChange({
    entityType: 'bn_country_payment_config',
    entityId: data.id,
    action: before ? 'UPDATE' : 'CREATE',
    beforeValue: before ?? null,
    afterValue: data,
    performedBy,
    notes: `Country payment capability for ${input.country_code}/${input.payment_method}`,
  });
  return data as CountryPaymentMethodCapability;
}

export async function setMethodEnabled(
  countryCode: string,
  paymentMethod: BnPaymentMethodCode,
  enabled: boolean,
  performedBy: string,
): Promise<void> {
  const { data: before } = await db
    .from('bn_country_payment_config')
    .select('*')
    .eq('country_code', countryCode)
    .eq('payment_method', paymentMethod)
    .maybeSingle();
  if (!before) throw new Error(`No country payment row for ${countryCode}/${paymentMethod}`);

  const { data, error } = await db
    .from('bn_country_payment_config')
    .update({ is_method_enabled: enabled, modified_by: performedBy })
    .eq('id', before.id)
    .select('*')
    .single();
  if (error) throw error;

  await auditConfigChange({
    entityType: 'bn_country_payment_config',
    entityId: before.id,
    action: enabled ? 'CONFIG_ENABLE' : 'CONFIG_DISABLE',
    beforeValue: before,
    afterValue: data,
    performedBy,
    severity: 'warning',
    critical: true,
    notes: `Country method capability ${enabled ? 'ENABLED' : 'DISABLED'} for ${countryCode}/${paymentMethod}`,
  });
}

export async function updateCountryCurrencyPolicy(
  input: CountryCurrencyPolicy,
  performedBy: string,
): Promise<void> {
  const { data: before } = await db
    .from('bn_country')
    .select('country_code,currency_code,allow_foreign_currency_products,allowed_alt_currencies')
    .eq('country_code', input.country_code)
    .maybeSingle();

  const { error } = await db
    .from('bn_country')
    .update({
      allow_foreign_currency_products: input.allow_foreign_currency_products,
      allowed_alt_currencies: input.allowed_alt_currencies,
      modified_by: performedBy,
    })
    .eq('country_code', input.country_code);
  if (error) throw error;

  await auditConfigChange({
    entityType: 'bn_country',
    entityId: input.country_code,
    action: 'UPDATE',
    beforeValue: before ?? null,
    afterValue: input,
    performedBy,
    notes: `Country currency policy updated for ${input.country_code}`,
  });
}
