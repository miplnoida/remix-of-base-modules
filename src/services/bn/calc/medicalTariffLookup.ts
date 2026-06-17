/**
 * Medical Tariff Lookup Engine — BN Calculation Engine
 *
 * Resolves a single medical claim line against bn_medical_tariff_row and
 * bn_medical_authorization_rule, then computes the payable amount per the
 * reimbursement method on the matched row.
 *
 * Step 1 — Match tariff row by procedure × treatment × location × provider ×
 *          beneficiary type, restricted to the active effective window.
 * Step 2 — Validate authorization (referral / medical board / overseas /
 *          emergency exception).
 * Step 3 — Apply reimbursement_method:
 *            FIXED_AMOUNT, PERCENTAGE_UP_TO_CEILING, ACTUAL_UP_TO_CEILING,
 *            FULL_REIMBURSEMENT, NOT_COVERED.
 * Step 4 — Return a structured trace for audit and UI.
 */

import { supabase } from '@/integrations/supabase/client';

export type ReimbursementMethod =
  | 'FIXED_AMOUNT'
  | 'PERCENTAGE_UP_TO_CEILING'
  | 'ACTUAL_UP_TO_CEILING'
  | 'FULL_REIMBURSEMENT'
  | 'NOT_COVERED';

export interface MedicalTariffRow {
  id: string;
  tariff_table_id: string;
  procedure_code: string;
  treatment_type: string | null;
  location_code: string;
  provider_type_code: string;
  beneficiary_type: string | null;
  referral_required: boolean;
  emergency_allowed: boolean;
  pre_authorization_required: boolean;
  reimbursement_method: ReimbursementMethod;
  percentage_rate: number | null;
  fixed_amount: number | null;
  ceiling_amount: number | null;
  currency_code: string;
  approval_level: string;
  effective_from: string;
  effective_to: string | null;
}

export interface MedicalAuthorizationRule {
  id: string;
  procedure_code: string;
  location_code: string;
  provider_type_code: string | null;
  requires_referral: boolean;
  requires_medical_board: boolean;
  requires_overseas_approval: boolean;
  requires_ceo_or_director_approval: boolean;
  emergency_exception_allowed: boolean;
  required_documents_json: unknown;
  effective_from: string;
  effective_to: string | null;
  status: string;
}

export interface MedicalTariffLookupInput {
  procedure_code: string;
  treatment_type?: string | null;
  location_code: string;
  provider_type_code: string;
  beneficiary_type?: string | null;
  approved_expense_amount: number;
  emergency_flag?: boolean;
  referral_status?: boolean;
  pre_authorization_status?: boolean;
  asOfDate?: string;
}

export interface MedicalTariffTrace {
  tariff_table_id: string | null;
  tariff_row_id: string | null;
  reimbursement_method: ReimbursementMethod | null;
  percentage_rate: number | null;
  ceiling_amount: number | null;
  fixed_amount: number | null;
  currency_code: string | null;
  authorization_rule_id: string | null;
  approval_level: string | null;
  approved_expense_amount: number;
  payable_amount: number;
  status: 'PAID' | 'NOT_COVERED' | 'HOLD' | 'REJECTED';
  reason?: string;
  validation_errors: string[];
}

export interface MedicalTariffProvider {
  fetchRows(input: MedicalTariffLookupInput): Promise<MedicalTariffRow[]>;
  fetchAuthRule(input: MedicalTariffLookupInput): Promise<MedicalAuthorizationRule | null>;
}

const inWindow = (asOf: string, from: string, to: string | null): boolean => {
  if (asOf < from) return false;
  if (to && asOf > to) return false;
  return true;
};

/* ----------------------------- Default DB provider ----------------------------- */

export const defaultMedicalTariffProvider: MedicalTariffProvider = {
  async fetchRows(input) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data, error } = await sb
      .from('bn_medical_tariff_row')
      .select('*')
      .eq('procedure_code', input.procedure_code)
      .eq('location_code', input.location_code)
      .eq('provider_type_code', input.provider_type_code);
    if (error) throw error;
    return (data ?? []) as MedicalTariffRow[];
  },
  async fetchAuthRule(input) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data, error } = await sb
      .from('bn_medical_authorization_rule')
      .select('*')
      .eq('procedure_code', input.procedure_code)
      .eq('location_code', input.location_code)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    const today = (input.asOfDate ?? new Date().toISOString().slice(0, 10));
    const rows = (data ?? []) as MedicalAuthorizationRule[];
    const exact = rows.find(
      (r) =>
        (!r.provider_type_code || r.provider_type_code === input.provider_type_code) &&
        inWindow(today, r.effective_from, r.effective_to),
    );
    return exact ?? null;
  },
};

/* ------------------------------------ Match ------------------------------------ */

export function pickBestRow(
  rows: MedicalTariffRow[],
  input: MedicalTariffLookupInput,
): MedicalTariffRow | null {
  const today = input.asOfDate ?? new Date().toISOString().slice(0, 10);
  const candidates = rows.filter((r) => inWindow(today, r.effective_from, r.effective_to));
  if (candidates.length === 0) return null;

  // Score: exact treatment_type + exact beneficiary_type rank higher
  const scored = candidates.map((r) => {
    let score = 0;
    if (r.treatment_type && input.treatment_type && r.treatment_type === input.treatment_type) score += 4;
    if (!r.treatment_type) score += 1; // generic row still acceptable
    if (r.beneficiary_type && input.beneficiary_type && r.beneficiary_type === input.beneficiary_type) score += 2;
    if (!r.beneficiary_type) score += 1;
    return { r, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].r;
}

/* ----------------------------------- Compute ----------------------------------- */

export function computePayable(row: MedicalTariffRow, approved: number): number {
  const amount = Number(approved) || 0;
  switch (row.reimbursement_method) {
    case 'FIXED_AMOUNT':
      return Number(row.fixed_amount ?? 0);
    case 'PERCENTAGE_UP_TO_CEILING': {
      const pct = Number(row.percentage_rate ?? 0);
      const ceiling = row.ceiling_amount != null ? Number(row.ceiling_amount) : Infinity;
      return Math.min(amount * pct, ceiling);
    }
    case 'ACTUAL_UP_TO_CEILING': {
      const ceiling = row.ceiling_amount != null ? Number(row.ceiling_amount) : Infinity;
      return Math.min(amount, ceiling);
    }
    case 'FULL_REIMBURSEMENT':
      return amount;
    case 'NOT_COVERED':
    default:
      return 0;
  }
}

function validateAuthorization(
  row: MedicalTariffRow,
  rule: MedicalAuthorizationRule | null,
  input: MedicalTariffLookupInput,
): string[] {
  const errs: string[] = [];
  const isEmergency = !!input.emergency_flag;

  const referralReq = !!(rule?.requires_referral ?? row.referral_required);
  const preAuthReq = !!row.pre_authorization_required;
  const medBoardReq = !!rule?.requires_medical_board;
  const overseasReq = !!rule?.requires_overseas_approval;
  const directorReq = !!rule?.requires_ceo_or_director_approval;
  const emergencyAllowed = (rule?.emergency_exception_allowed ?? row.emergency_allowed) === true;

  if (referralReq && !input.referral_status) {
    if (!(isEmergency && emergencyAllowed)) errs.push('REFERRAL_REQUIRED');
  }
  if (preAuthReq && !input.pre_authorization_status) {
    if (!(isEmergency && emergencyAllowed)) errs.push('PRE_AUTHORIZATION_REQUIRED');
  }
  if (medBoardReq) errs.push('MEDICAL_BOARD_REVIEW_REQUIRED');
  if (overseasReq) errs.push('OVERSEAS_APPROVAL_REQUIRED');
  if (directorReq) errs.push('DIRECTOR_APPROVAL_REQUIRED');
  return errs;
}

/* ----------------------------------- Lookup ----------------------------------- */

export async function lookupMedicalTariff(
  input: MedicalTariffLookupInput,
  provider: MedicalTariffProvider = defaultMedicalTariffProvider,
): Promise<MedicalTariffTrace> {
  const rows = await provider.fetchRows(input);
  const row = pickBestRow(rows, input);
  if (!row) {
    return {
      tariff_table_id: null, tariff_row_id: null, reimbursement_method: null,
      percentage_rate: null, ceiling_amount: null, fixed_amount: null, currency_code: null,
      authorization_rule_id: null, approval_level: null,
      approved_expense_amount: input.approved_expense_amount,
      payable_amount: 0, status: 'NOT_COVERED', reason: 'NO_MATCHING_TARIFF_ROW',
      validation_errors: ['NO_MATCHING_TARIFF_ROW'],
    };
  }

  const rule = await provider.fetchAuthRule(input);
  const authErrors = validateAuthorization(row, rule, input);

  let payable = 0;
  let status: MedicalTariffTrace['status'] = 'PAID';
  let reason: string | undefined;

  if (row.reimbursement_method === 'NOT_COVERED') {
    status = 'NOT_COVERED';
    reason = 'METHOD_NOT_COVERED';
  } else {
    payable = computePayable(row, input.approved_expense_amount);
    // Approvals don't block payment computation, but flag HOLD
    const blocking = authErrors.filter((e) => e === 'REFERRAL_REQUIRED' || e === 'PRE_AUTHORIZATION_REQUIRED');
    if (blocking.length > 0) {
      status = 'HOLD';
      reason = blocking.join(',');
    } else if (authErrors.length > 0) {
      status = 'HOLD';
      reason = 'PENDING_APPROVAL';
    }
  }

  return {
    tariff_table_id: row.tariff_table_id,
    tariff_row_id: row.id,
    reimbursement_method: row.reimbursement_method,
    percentage_rate: row.percentage_rate,
    ceiling_amount: row.ceiling_amount,
    fixed_amount: row.fixed_amount,
    currency_code: row.currency_code,
    authorization_rule_id: rule?.id ?? null,
    approval_level: row.approval_level,
    approved_expense_amount: input.approved_expense_amount,
    payable_amount: payable,
    status,
    reason,
    validation_errors: authErrors,
  };
}
