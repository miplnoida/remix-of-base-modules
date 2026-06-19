/**
 * Product Payment Setup Service
 * ----------------------------------------------------------------------------
 * Owns the *usage* layer of the BN Payment Configuration Hierarchy:
 *
 *   Product Catalog (per product version × channel)
 *     • allowed methods (must be a subset of country-enabled methods)
 *     • default method (must be in allowed methods)
 *     • payment frequency  (ONE_OFF | WEEKLY | FORTNIGHTLY | MONTHLY | QUARTERLY | ANNUAL | AD_HOC)
 *     • payment pattern    (LUMP_SUM | RECURRING | ARREARS | MIXED)
 *     • currency (defaults to country currency)
 *     • whether a payee is allowed
 *     • whether provider direct-pay is allowed
 *     • approval threshold (amount + currency)
 *     • payment hold rules (jsonb array)
 *
 * Save-time validation runs through productPaymentValidationService before
 * the row is written. All writes are audited.
 */
import { supabase } from '@/integrations/supabase/client';
import { auditConfigChange } from '@/services/bn/audit/bnAuditService';
import {
  validateProductPaymentSetup,
  type ProductPaymentValidationResult,
  type ProductPaymentSetupInput,
} from './productPaymentValidationService';

const db = supabase as any;

export type { ProductPaymentSetupInput, ProductPaymentValidationResult };

export interface SaveOptions {
  /** If true, validation warnings are surfaced but do not block the save. */
  ignoreWarnings?: boolean;
  /** If true, save proceeds even when validation reports errors (use only for migration tooling). */
  forceUnsafe?: boolean;
}

export async function getProductPaymentSetup(channelConfigId: string) {
  const { data, error } = await db
    .from('bn_product_channel_config')
    .select(
      'id,product_id,product_version_id,channel_code,allowed_payment_methods,default_payment_method,' +
        'payment_frequency,payment_pattern,currency_code,allow_payee,allow_provider_direct_pay,' +
        'approval_threshold_amount,approval_threshold_currency,payment_hold_rules,' +
        'allow_third_party_payee,allow_guardian_payee,require_bank_verification,cheque_address_required',
    )
    .eq('id', channelConfigId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function getEffectivePaymentConfig(channelConfigId: string) {
  const { data, error } = await db
    .from('v_bn_product_effective_payment_config')
    .select('*')
    .eq('channel_config_id', channelConfigId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function saveProductPaymentSetup(
  input: ProductPaymentSetupInput,
  performedBy: string,
  opts: SaveOptions = {},
): Promise<{ result: ProductPaymentValidationResult; saved: boolean }> {
  const result = await validateProductPaymentSetup(input);
  if (!result.ok && !opts.forceUnsafe) {
    return { result, saved: false };
  }
  if (result.warnings.length && !opts.ignoreWarnings && !result.ok) {
    return { result, saved: false };
  }

  const { data: before } = await db
    .from('bn_product_channel_config')
    .select('*')
    .eq('id', input.channel_config_id)
    .maybeSingle();

  const { data, error } = await db
    .from('bn_product_channel_config')
    .update({
      allowed_payment_methods: input.allowed_payment_methods,
      default_payment_method: input.default_payment_method,
      payment_frequency: input.payment_frequency,
      payment_pattern: input.payment_pattern,
      currency_code: input.currency_code,
      allow_payee: input.allow_payee,
      allow_provider_direct_pay: input.allow_provider_direct_pay,
      approval_threshold_amount: input.approval_threshold_amount,
      approval_threshold_currency: input.approval_threshold_currency ?? input.currency_code,
      payment_hold_rules: input.payment_hold_rules ?? [],
      modified_by: performedBy,
    })
    .eq('id', input.channel_config_id)
    .select('*')
    .single();
  if (error) throw error;

  await auditConfigChange({
    entityType: 'bn_product_channel_config',
    entityId: input.channel_config_id,
    action: 'CHANNEL_CONFIG_CHANGED',
    beforeValue: before ?? null,
    afterValue: data,
    performedBy,
    severity: result.warnings.length ? 'warning' : 'info',
    notes: `Product payment setup updated (${input.channel_code ?? 'channel'}); ` +
      `errors=${result.errors.length} warnings=${result.warnings.length}`,
    payload: { validation: result },
  });

  return { result, saved: true };
}
