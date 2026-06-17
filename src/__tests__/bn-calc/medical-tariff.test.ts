/**
 * Medical Tariff Engine — simulation tests
 *
 * Mirrors the acceptance scenarios in the BN Calculation Engine spec.
 */
import { describe, it, expect } from 'vitest';
import {
  lookupMedicalTariff,
  computePayable,
  pickBestRow,
  type MedicalTariffProvider,
  type MedicalTariffRow,
  type MedicalAuthorizationRule,
} from '@/services/bn/calc/medicalTariffLookup';

const baseRow = (overrides: Partial<MedicalTariffRow>): MedicalTariffRow => ({
  id: 'r1',
  tariff_table_id: 't1',
  procedure_code: 'MRI_BRAIN',
  treatment_type: 'DIAGNOSTIC',
  location_code: 'LOCAL_SK',
  provider_type_code: 'PRIVATE',
  beneficiary_type: null,
  referral_required: false,
  emergency_allowed: true,
  pre_authorization_required: false,
  reimbursement_method: 'PERCENTAGE_UP_TO_CEILING',
  percentage_rate: 0.8,
  fixed_amount: null,
  ceiling_amount: 2000,
  currency_code: 'XCD',
  approval_level: 'NONE',
  effective_from: '2020-01-01',
  effective_to: null,
  ...overrides,
});

const provider = (rows: MedicalTariffRow[], rule: MedicalAuthorizationRule | null = null): MedicalTariffProvider => ({
  async fetchRows() { return rows; },
  async fetchAuthRule() { return rule; },
});

describe('computePayable — reimbursement methods', () => {
  it('FIXED_AMOUNT returns fixed_amount', () => {
    expect(computePayable(baseRow({ reimbursement_method: 'FIXED_AMOUNT', fixed_amount: 450 }), 9999)).toBe(450);
  });
  it('PERCENTAGE_UP_TO_CEILING caps at ceiling', () => {
    expect(computePayable(baseRow({}), 3000)).toBe(2000); // 80% of 3000 = 2400, capped at 2000
  });
  it('PERCENTAGE_UP_TO_CEILING returns percentage below ceiling', () => {
    expect(computePayable(baseRow({}), 1000)).toBe(800);
  });
  it('ACTUAL_UP_TO_CEILING caps at ceiling', () => {
    expect(computePayable(baseRow({ reimbursement_method: 'ACTUAL_UP_TO_CEILING', percentage_rate: null, ceiling_amount: 75000 }), 90000)).toBe(75000);
  });
  it('ACTUAL_UP_TO_CEILING returns actual below ceiling', () => {
    expect(computePayable(baseRow({ reimbursement_method: 'ACTUAL_UP_TO_CEILING', percentage_rate: null, ceiling_amount: 75000 }), 50000)).toBe(50000);
  });
  it('FULL_REIMBURSEMENT returns the full amount', () => {
    expect(computePayable(baseRow({ reimbursement_method: 'FULL_REIMBURSEMENT' }), 1234)).toBe(1234);
  });
  it('NOT_COVERED returns 0', () => {
    expect(computePayable(baseRow({ reimbursement_method: 'NOT_COVERED' }), 5000)).toBe(0);
  });
});

describe('pickBestRow — match selection', () => {
  it('prefers exact treatment_type match', () => {
    const rows = [
      baseRow({ id: 'a', treatment_type: null }),
      baseRow({ id: 'b', treatment_type: 'DIAGNOSTIC' }),
    ];
    const picked = pickBestRow(rows, {
      procedure_code: 'MRI_BRAIN', location_code: 'LOCAL_SK', provider_type_code: 'PRIVATE',
      treatment_type: 'DIAGNOSTIC', approved_expense_amount: 1000,
    });
    expect(picked?.id).toBe('b');
  });
  it('respects effective window', () => {
    const rows = [baseRow({ effective_from: '2099-01-01' })];
    const picked = pickBestRow(rows, {
      procedure_code: 'MRI_BRAIN', location_code: 'LOCAL_SK', provider_type_code: 'PRIVATE',
      approved_expense_amount: 1000, asOfDate: '2020-01-01',
    });
    expect(picked).toBeNull();
  });
});

describe('lookupMedicalTariff — acceptance scenarios', () => {
  it('Medical MRI Local — 3000 @ 80% capped 2000 → 2000', async () => {
    const trace = await lookupMedicalTariff(
      { procedure_code: 'MRI_BRAIN', treatment_type: 'DIAGNOSTIC',
        location_code: 'LOCAL_SK', provider_type_code: 'PRIVATE', approved_expense_amount: 3000 },
      provider([baseRow({})]),
    );
    expect(trace.payable_amount).toBe(2000);
    expect(trace.status).toBe('PAID');
  });

  it('Medical Cardiac Caribbean — 90000 capped 75000 → 75000, HOLD due to medical board', async () => {
    const cardiacRow = baseRow({
      procedure_code: 'CARDIAC_SURGERY', treatment_type: 'SURGICAL',
      location_code: 'CARIBBEAN', provider_type_code: 'OVERSEAS',
      referral_required: true, pre_authorization_required: true,
      reimbursement_method: 'ACTUAL_UP_TO_CEILING',
      percentage_rate: null, ceiling_amount: 75000, approval_level: 'MEDICAL_BOARD',
    });
    const rule: MedicalAuthorizationRule = {
      id: 'auth1', procedure_code: 'CARDIAC_SURGERY', location_code: 'CARIBBEAN', provider_type_code: 'OVERSEAS',
      requires_referral: true, requires_medical_board: true,
      requires_overseas_approval: false, requires_ceo_or_director_approval: false,
      emergency_exception_allowed: true, required_documents_json: [],
      effective_from: '2020-01-01', effective_to: null, status: 'ACTIVE',
    };
    const trace = await lookupMedicalTariff(
      { procedure_code: 'CARDIAC_SURGERY', treatment_type: 'SURGICAL',
        location_code: 'CARIBBEAN', provider_type_code: 'OVERSEAS',
        approved_expense_amount: 90000, referral_status: true, pre_authorization_status: true },
      provider([cardiacRow], rule),
    );
    expect(trace.payable_amount).toBe(75000);
    expect(trace.status).toBe('HOLD');
    expect(trace.validation_errors).toContain('MEDICAL_BOARD_REVIEW_REQUIRED');
  });

  it('No matching tariff row → NOT_COVERED', async () => {
    const trace = await lookupMedicalTariff(
      { procedure_code: 'UNKNOWN', location_code: 'LOCAL_SK', provider_type_code: 'PRIVATE', approved_expense_amount: 100 },
      provider([]),
    );
    expect(trace.status).toBe('NOT_COVERED');
    expect(trace.payable_amount).toBe(0);
  });

  it('Missing referral → HOLD when not emergency', async () => {
    const row = baseRow({ referral_required: true, pre_authorization_required: true });
    const trace = await lookupMedicalTariff(
      { procedure_code: 'MRI_BRAIN', treatment_type: 'DIAGNOSTIC',
        location_code: 'LOCAL_SK', provider_type_code: 'PRIVATE',
        approved_expense_amount: 1000, referral_status: false, pre_authorization_status: false },
      provider([row]),
    );
    expect(trace.status).toBe('HOLD');
    expect(trace.validation_errors).toContain('REFERRAL_REQUIRED');
    expect(trace.validation_errors).toContain('PRE_AUTHORIZATION_REQUIRED');
  });

  it('Emergency overrides missing referral', async () => {
    const row = baseRow({ referral_required: true, pre_authorization_required: true, emergency_allowed: true });
    const trace = await lookupMedicalTariff(
      { procedure_code: 'MRI_BRAIN', treatment_type: 'DIAGNOSTIC',
        location_code: 'LOCAL_SK', provider_type_code: 'PRIVATE',
        approved_expense_amount: 1000, emergency_flag: true,
        referral_status: false, pre_authorization_status: false },
      provider([row]),
    );
    expect(trace.status).toBe('PAID');
    expect(trace.payable_amount).toBe(800);
  });
});
