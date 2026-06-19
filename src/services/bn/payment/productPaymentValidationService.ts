/**
 * Product Payment Validation Service — save-time gate.
 * ----------------------------------------------------------------------------
 * Enforces the BN Payment Configuration Hierarchy (V1–V9) when a product's
 * payment setup is saved. Mirrors the runtime checks in payableValidationService
 * so drift is caught before it reaches payment issue.
 *
 *   V1  Product allowed methods ⊆ Country enabled methods
 *   V2  Product default method ∈ product allowed
 *   V3  Product currency = country currency OR in country.allowed_alt_currencies
 *   V4  EFT in product methods ⇒ country EFT row fully configured
 *   V5  CHEQUE in product methods ⇒ country CHEQUE row has stock/format resolved
 *   V6  Product allow_payee=true ⇒ country method allow_third_party_payee=true
 *   V7  Product allow_provider_direct_pay=true ⇒ country method allows it
 *   V8  Approval-threshold currency = product currency
 *   V9  Payment hold rules reference valid bn_reason_code
 */
import { supabase } from '@/integrations/supabase/client';
import type { BnPaymentMethodCode } from './countryPaymentCapabilityService';

const db = supabase as any;

export interface ProductPaymentSetupInput {
  channel_config_id: string;
  product_id: string;
  channel_code?: string;
  allowed_payment_methods: BnPaymentMethodCode[];
  default_payment_method: BnPaymentMethodCode | null;
  payment_frequency: 'ONE_OFF' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'AD_HOC';
  payment_pattern: 'LUMP_SUM' | 'RECURRING' | 'ARREARS' | 'MIXED';
  currency_code: string;
  allow_payee: boolean;
  allow_provider_direct_pay: boolean;
  approval_threshold_amount?: number | null;
  approval_threshold_currency?: string | null;
  payment_hold_rules?: Array<{ rule_code: string; condition?: any; hold_state?: string }>;
}

export interface ProductPaymentValidationIssue {
  rule: 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'V7' | 'V8' | 'V9';
  severity: 'error' | 'warning';
  message: string;
  context?: Record<string, any>;
}

export interface ProductPaymentValidationResult {
  ok: boolean;
  errors: ProductPaymentValidationIssue[];
  warnings: ProductPaymentValidationIssue[];
}

const FORMAT_FIELDS = ['bank_file_format', 'header_record_format', 'detail_record_format', 'trailer_record_format'];

export async function validateProductPaymentSetup(
  input: ProductPaymentSetupInput,
): Promise<ProductPaymentValidationResult> {
  const issues: ProductPaymentValidationIssue[] = [];

  // Product → Country resolution
  const { data: product } = await db
    .from('bn_product')
    .select('id,country_code,benefit_code')
    .eq('id', input.product_id)
    .maybeSingle();
  if (!product) {
    return {
      ok: false,
      errors: [{ rule: 'V1', severity: 'error', message: 'Product not found' }],
      warnings: [],
    };
  }

  const { data: country } = await db
    .from('bn_country')
    .select('country_code,currency_code,allow_foreign_currency_products,allowed_alt_currencies')
    .eq('country_code', product.country_code)
    .maybeSingle();
  if (!country) {
    return {
      ok: false,
      errors: [{ rule: 'V3', severity: 'error', message: `Country ${product.country_code} not configured` }],
      warnings: [],
    };
  }

  const { data: countryMethods = [] } = await db
    .from('bn_country_payment_config')
    .select('*')
    .eq('country_code', product.country_code);

  const enabledMap = new Map<string, any>();
  for (const m of countryMethods as any[]) {
    if (m.is_active && m.is_method_enabled) enabledMap.set(m.payment_method, m);
  }

  // V1 — subset
  const disallowed = (input.allowed_payment_methods ?? []).filter((m) => !enabledMap.has(m));
  for (const m of disallowed) {
    issues.push({
      rule: 'V1',
      severity: 'error',
      message: `Method "${m}" is not enabled at country level for ${product.country_code}`,
      context: { method: m },
    });
  }

  // V2 — default ∈ allowed
  if (input.default_payment_method && !input.allowed_payment_methods.includes(input.default_payment_method)) {
    issues.push({
      rule: 'V2',
      severity: 'error',
      message: `Default method "${input.default_payment_method}" is not in product allowed methods`,
    });
  }

  // V3 — currency
  if (input.currency_code !== country.currency_code) {
    if (!country.allow_foreign_currency_products) {
      issues.push({
        rule: 'V3',
        severity: 'error',
        message: `Currency ${input.currency_code} differs from country currency ${country.currency_code}, and country disallows foreign-currency products`,
      });
    } else if (!(country.allowed_alt_currencies ?? []).includes(input.currency_code)) {
      issues.push({
        rule: 'V3',
        severity: 'error',
        message: `Currency ${input.currency_code} not in allowed_alt_currencies for ${country.country_code}`,
      });
    }
  }

  // V4 — EFT requires country EFT format
  if (input.allowed_payment_methods.includes('EFT')) {
    const eft = enabledMap.get('EFT');
    if (!eft) {
      issues.push({ rule: 'V4', severity: 'error', message: 'EFT requested but no enabled EFT row at country level' });
    } else {
      const missing = FORMAT_FIELDS.filter((f) => !eft[f]);
      if (missing.length) {
        issues.push({
          rule: 'V4',
          severity: 'error',
          message: `Country EFT configuration incomplete (missing: ${missing.join(', ')})`,
          context: { missing },
        });
      }
    }
  }

  // V5 — CHEQUE requires stock + format resolution
  if (input.allowed_payment_methods.includes('CHEQUE')) {
    const cheque = enabledMap.get('CHEQUE');
    if (!cheque) {
      issues.push({ rule: 'V5', severity: 'error', message: 'CHEQUE requested but no enabled CHEQUE row at country level' });
    } else if (cheque.cheque_stock_required && !cheque.cheque_format_template_id) {
      issues.push({
        rule: 'V5',
        severity: 'error',
        message: 'Country CHEQUE config requires stock but cheque_format_template_id is not set',
      });
    }
  }

  // V6 — payee allowance
  if (input.allow_payee) {
    const methodsWithoutPayee = (input.allowed_payment_methods ?? []).filter((m) => {
      const row = enabledMap.get(m);
      return row && !row.allow_third_party_payee;
    });
    for (const m of methodsWithoutPayee) {
      issues.push({
        rule: 'V6',
        severity: 'error',
        message: `Product allows payee but country method "${m}" does not allow third-party payee`,
        context: { method: m },
      });
    }
  }

  // V7 — provider direct-pay
  if (input.allow_provider_direct_pay) {
    const methodsBlocking = (input.allowed_payment_methods ?? []).filter((m) => {
      const row = enabledMap.get(m);
      return row && !row.allow_provider_direct_pay;
    });
    for (const m of methodsBlocking) {
      issues.push({
        rule: 'V7',
        severity: 'error',
        message: `Product allows provider direct-pay but country method "${m}" does not`,
        context: { method: m },
      });
    }
  }

  // V8 — threshold currency
  if (
    input.approval_threshold_amount != null &&
    input.approval_threshold_currency &&
    input.approval_threshold_currency !== input.currency_code
  ) {
    issues.push({
      rule: 'V8',
      severity: 'error',
      message: `Approval-threshold currency ${input.approval_threshold_currency} must match product currency ${input.currency_code}`,
    });
  }

  // V9 — hold-rule reason codes
  const holdRules = input.payment_hold_rules ?? [];
  if (holdRules.length) {
    const ruleCodes = Array.from(new Set(holdRules.map((r) => r.rule_code).filter(Boolean)));
    if (ruleCodes.length) {
      const { data: known = [] } = await db
        .from('bn_reason_code')
        .select('reason_code')
        .in('reason_code', ruleCodes);
      const knownSet = new Set((known as any[]).map((r: any) => r.reason_code));
      for (const code of ruleCodes) {
        if (!knownSet.has(code)) {
          issues.push({
            rule: 'V9',
            severity: 'error',
            message: `Payment hold rule references unknown reason code "${code}"`,
            context: { reason_code: code },
          });
        }
      }
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  return { ok: errors.length === 0, errors, warnings };
}
