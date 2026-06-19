/**
 * BN Payment Configuration Hierarchy — save-time validator proofs (V1–V9).
 *
 * Uses the supabase mock to inject deterministic country/product state per
 * test case. Each case proves exactly one validator rule triggers — and that
 * a fully-aligned config produces ok=true.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetSupabaseMock,
  registerTable,
  supabase,
} from '@/test/mocks/supabaseClientMock';
import { vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase }));

import {
  validateProductPaymentSetup,
  type ProductPaymentSetupInput,
} from '@/services/bn/payment/productPaymentValidationService';

const baseInput: ProductPaymentSetupInput = {
  channel_config_id: 'cc-1',
  product_id: 'prod-1',
  channel_code: 'INTERNAL',
  allowed_payment_methods: ['EFT'],
  default_payment_method: 'EFT',
  payment_frequency: 'MONTHLY',
  payment_pattern: 'RECURRING',
  currency_code: 'XCD',
  allow_payee: false,
  allow_provider_direct_pay: false,
  payment_hold_rules: [],
};

function seedHappyPath() {
  registerTable('bn_product', {
    selectMaybeSingle: { id: 'prod-1', country_code: 'SKN', benefit_code: 'P1' },
  });
  registerTable('bn_country', {
    selectMaybeSingle: {
      country_code: 'SKN',
      currency_code: 'XCD',
      allow_foreign_currency_products: false,
      allowed_alt_currencies: [],
    },
  });
  registerTable('bn_country_payment_config', {
    selectList: [
      {
        payment_method: 'EFT',
        is_active: true,
        is_method_enabled: true,
        allow_third_party_payee: true,
        allow_provider_direct_pay: true,
        bank_file_format: 'CSV',
        header_record_format: 'H',
        detail_record_format: 'D',
        trailer_record_format: 'T',
        cheque_stock_required: false,
        cheque_format_template_id: null,
      },
      {
        payment_method: 'CHEQUE',
        is_active: true,
        is_method_enabled: true,
        allow_third_party_payee: true,
        allow_provider_direct_pay: false,
        bank_file_format: null,
        header_record_format: null,
        detail_record_format: null,
        trailer_record_format: null,
        cheque_stock_required: true,
        cheque_format_template_id: 'tmpl-1',
      },
    ],
  });
  registerTable('bn_reason_code', { selectList: [{ reason_code: 'HOLD_FRAUD' }] });
}

beforeEach(() => resetSupabaseMock());

describe('Payment Hierarchy Validators V1–V9', () => {
  it('happy path: aligned product passes', async () => {
    seedHappyPath();
    const r = await validateProductPaymentSetup(baseInput);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('V1 — method disabled at country level', async () => {
    seedHappyPath();
    const r = await validateProductPaymentSetup({ ...baseInput, allowed_payment_methods: ['CASH'], default_payment_method: 'CASH' });
    expect(r.errors.some((e) => e.rule === 'V1')).toBe(true);
  });

  it('V2 — default method not in allowed', async () => {
    seedHappyPath();
    const r = await validateProductPaymentSetup({ ...baseInput, default_payment_method: 'CHEQUE', allowed_payment_methods: ['EFT'] });
    expect(r.errors.some((e) => e.rule === 'V2')).toBe(true);
  });

  it('V3 — currency mismatch without foreign allowance', async () => {
    seedHappyPath();
    const r = await validateProductPaymentSetup({ ...baseInput, currency_code: 'USD' });
    expect(r.errors.some((e) => e.rule === 'V3')).toBe(true);
  });

  it('V4 — EFT without complete country format', async () => {
    seedHappyPath();
    registerTable('bn_country_payment_config', {
      selectList: [
        {
          payment_method: 'EFT',
          is_active: true,
          is_method_enabled: true,
          allow_third_party_payee: true,
          allow_provider_direct_pay: true,
          bank_file_format: 'CSV',
          header_record_format: null, // missing
          detail_record_format: 'D',
          trailer_record_format: 'T',
          cheque_stock_required: false,
          cheque_format_template_id: null,
        },
      ],
    });
    const r = await validateProductPaymentSetup(baseInput);
    expect(r.errors.some((e) => e.rule === 'V4')).toBe(true);
  });

  it('V5 — CHEQUE requires stock template', async () => {
    seedHappyPath();
    registerTable('bn_country_payment_config', {
      selectList: [
        {
          payment_method: 'CHEQUE',
          is_active: true,
          is_method_enabled: true,
          allow_third_party_payee: true,
          allow_provider_direct_pay: false,
          bank_file_format: null,
          header_record_format: null,
          detail_record_format: null,
          trailer_record_format: null,
          cheque_stock_required: true,
          cheque_format_template_id: null, // missing
        },
      ],
    });
    const r = await validateProductPaymentSetup({
      ...baseInput,
      allowed_payment_methods: ['CHEQUE'],
      default_payment_method: 'CHEQUE',
    });
    expect(r.errors.some((e) => e.rule === 'V5')).toBe(true);
  });

  it('V6 — payee allowed by product but blocked by country method', async () => {
    seedHappyPath();
    registerTable('bn_country_payment_config', {
      selectList: [
        {
          payment_method: 'EFT',
          is_active: true,
          is_method_enabled: true,
          allow_third_party_payee: false,
          allow_provider_direct_pay: true,
          bank_file_format: 'CSV',
          header_record_format: 'H',
          detail_record_format: 'D',
          trailer_record_format: 'T',
          cheque_stock_required: false,
          cheque_format_template_id: null,
        },
      ],
    });
    const r = await validateProductPaymentSetup({ ...baseInput, allow_payee: true });
    expect(r.errors.some((e) => e.rule === 'V6')).toBe(true);
  });

  it('V7 — provider direct-pay blocked by country method', async () => {
    seedHappyPath();
    registerTable('bn_country_payment_config', {
      selectList: [
        {
          payment_method: 'EFT',
          is_active: true,
          is_method_enabled: true,
          allow_third_party_payee: true,
          allow_provider_direct_pay: false,
          bank_file_format: 'CSV',
          header_record_format: 'H',
          detail_record_format: 'D',
          trailer_record_format: 'T',
          cheque_stock_required: false,
          cheque_format_template_id: null,
        },
      ],
    });
    const r = await validateProductPaymentSetup({ ...baseInput, allow_provider_direct_pay: true });
    expect(r.errors.some((e) => e.rule === 'V7')).toBe(true);
  });

  it('V8 — approval threshold currency mismatch', async () => {
    seedHappyPath();
    const r = await validateProductPaymentSetup({
      ...baseInput,
      approval_threshold_amount: 1000,
      approval_threshold_currency: 'USD',
    });
    expect(r.errors.some((e) => e.rule === 'V8')).toBe(true);
  });

  it('V9 — unknown reason code in hold rules', async () => {
    seedHappyPath();
    const r = await validateProductPaymentSetup({
      ...baseInput,
      payment_hold_rules: [{ rule_code: 'NOT_A_REAL_CODE' }],
    });
    expect(r.errors.some((e) => e.rule === 'V9')).toBe(true);
  });
});
