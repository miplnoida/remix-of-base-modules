/**
 * Medical Policy Resolver — the single Medical engine for BN calculations.
 *
 * This is the only medical reimbursement resolver in the system. It reads from
 * the Medical Policy Library (`bn_medical_reimbursement_limit` +
 * `bn_medical_authorization_rule`). The legacy `bn_medical_tariff_*` tables
 * are deprecated and access has been revoked.
 *
 * Public API:
 *   resolveReimbursement(input)  → MedicalPolicyTrace
 *
 * The previous symbol names (`lookupMedicalTariff`, `MedicalTariff*`) are kept
 * as deprecated aliases so older imports compile during the cutover.
 */

import { supabase } from '@/integrations/supabase/client';

export type ReimbursementMethod =
  | 'FIXED_AMOUNT'
  | 'PERCENTAGE_UP_TO_CEILING'
  | 'ACTUAL_UP_TO_CEILING'
  | 'FULL_REIMBURSEMENT'
  | 'NOT_COVERED';

export type LocationRegion =
  | 'LOCAL_ST_KITTS'
  | 'NEVIS'
  | 'CARIBBEAN'
  | 'INTERNATIONAL'
  | 'ANY';

export interface MedicalPolicyRow {
  id: string;
  source_table: string;
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
  legal_reference: string | null;
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

export interface MedicalPolicyInput {
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

export interface MedicalPolicyTrace {
  resolver: 'medicalPolicyResolver';
  source_table: string | null;
  policy_row_id: string | null;
  reimbursement_method: ReimbursementMethod | null;
  percentage_rate: number | null;
  ceiling_amount: number | null;
  fixed_amount: number | null;
  currency_code: string | null;
  authorization_rule_id: string | null;
  approval_level: string | null;
  legal_reference: string | null;
  approved_expense_amount: number;
  payable_amount: number;
  status: 'PAID' | 'NOT_COVERED' | 'HOLD' | 'REJECTED';
  reason?: string;
  validation_errors: string[];
}

export interface MedicalPolicyProvider {
  fetchRows(input: MedicalPolicyInput): Promise<MedicalPolicyRow[]>;
  fetchAuthRule(input: MedicalPolicyInput): Promise<MedicalAuthorizationRule | null>;
}

const inWindow = (asOf: string, from: string, to: string | null): boolean => {
  if (asOf < from) return false;
  if (to && asOf > to) return false;
  return true;
};

/* ----------------------------- Default DB provider ----------------------------- */

export const defaultMedicalPolicyProvider: MedicalPolicyProvider = {
  async fetchRows(input) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data, error } = await sb
      .from('bn_medical_reimbursement_limit')
      .select(
        'id, procedure_code, location_code, provider_type_code, beneficiary_type, ' +
        'referral_required, emergency_allowed, pre_authorization_required, ' +
        'reimbursement_method, reimbursement_percent, fixed_amount, ceiling_amount, ' +
        'currency_code, approval_level, legal_reference, effective_from, effective_to, is_active',
      )
      .eq('procedure_code', input.procedure_code)
      .eq('location_code', input.location_code)
      .eq('provider_type_code', input.provider_type_code)
      .eq('is_active', true);
    if (error) throw error;
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      source_table: 'bn_medical_reimbursement_limit',
      procedure_code: String(r.procedure_code ?? ''),
      treatment_type: null,
      location_code: String(r.location_code ?? ''),
      provider_type_code: String(r.provider_type_code ?? ''),
      beneficiary_type: (r.beneficiary_type as string | null) ?? null,
      referral_required: !!r.referral_required,
      emergency_allowed: r.emergency_allowed !== false,
      pre_authorization_required: !!r.pre_authorization_required,
      reimbursement_method: (r.reimbursement_method as ReimbursementMethod) ?? 'NOT_COVERED',
      percentage_rate: r.reimbursement_percent != null ? Number(r.reimbursement_percent) : null,
      fixed_amount: r.fixed_amount != null ? Number(r.fixed_amount) : null,
      ceiling_amount: r.ceiling_amount != null ? Number(r.ceiling_amount) : null,
      currency_code: String(r.currency_code ?? 'XCD'),
      approval_level: String(r.approval_level ?? 'NONE'),
      legal_reference: (r.legal_reference as string | null) ?? null,
      effective_from: String(r.effective_from ?? '1900-01-01'),
      effective_to: (r.effective_to as string | null) ?? null,
    }));
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
    return rows.find(
      (r) =>
        (!r.provider_type_code || r.provider_type_code === input.provider_type_code) &&
        inWindow(today, r.effective_from, r.effective_to),
    ) ?? null;
  },
};

/* ------------------------------------ Match ------------------------------------ */

export function pickBestRow(
  rows: MedicalPolicyRow[],
  input: MedicalPolicyInput,
): MedicalPolicyRow | null {
  const today = input.asOfDate ?? new Date().toISOString().slice(0, 10);
  const candidates = rows.filter((r) => inWindow(today, r.effective_from, r.effective_to));
  if (candidates.length === 0) return null;
  const scored = candidates.map((r) => {
    let score = 0;
    if (r.treatment_type && input.treatment_type && r.treatment_type === input.treatment_type) score += 4;
    if (!r.treatment_type) score += 1;
    if (r.beneficiary_type && input.beneficiary_type && r.beneficiary_type === input.beneficiary_type) score += 2;
    if (!r.beneficiary_type) score += 1;
    return { r, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].r;
}

/* ----------------------------------- Compute ----------------------------------- */

export function computePayable(row: MedicalPolicyRow, approved: number): number {
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
  row: MedicalPolicyRow,
  rule: MedicalAuthorizationRule | null,
  input: MedicalPolicyInput,
): string[] {
  const errs: string[] = [];
  const isEmergency = !!input.emergency_flag;
  const referralReq = !!(rule?.requires_referral ?? row.referral_required);
  const preAuthReq = !!row.pre_authorization_required;
  const medBoardReq = !!rule?.requires_medical_board;
  const overseasReq = !!rule?.requires_overseas_approval;
  const directorReq = !!rule?.requires_ceo_or_director_approval;
  const emergencyAllowed = (rule?.emergency_exception_allowed ?? row.emergency_allowed) === true;
  if (referralReq && !input.referral_status && !(isEmergency && emergencyAllowed)) errs.push('REFERRAL_REQUIRED');
  if (preAuthReq && !input.pre_authorization_status && !(isEmergency && emergencyAllowed)) errs.push('PRE_AUTHORIZATION_REQUIRED');
  if (medBoardReq) errs.push('MEDICAL_BOARD_REVIEW_REQUIRED');
  if (overseasReq) errs.push('OVERSEAS_APPROVAL_REQUIRED');
  if (directorReq) errs.push('DIRECTOR_APPROVAL_REQUIRED');
  return errs;
}

/* ----------------------------------- Resolve ----------------------------------- */

export async function resolveReimbursement(
  input: MedicalPolicyInput,
  provider: MedicalPolicyProvider = defaultMedicalPolicyProvider,
): Promise<MedicalPolicyTrace> {
  const rows = await provider.fetchRows(input);
  const row = pickBestRow(rows, input);
  if (!row) {
    return {
      resolver: 'medicalPolicyResolver',
      source_table: null, policy_row_id: null, reimbursement_method: null,
      percentage_rate: null, ceiling_amount: null, fixed_amount: null, currency_code: null,
      authorization_rule_id: null, approval_level: null, legal_reference: null,
      approved_expense_amount: input.approved_expense_amount,
      payable_amount: 0, status: 'NOT_COVERED', reason: 'NO_MATCHING_POLICY_ROW',
      validation_errors: ['NO_MATCHING_POLICY_ROW'],
    };
  }

  const rule = await provider.fetchAuthRule(input);
  const authErrors = validateAuthorization(row, rule, input);

  let payable = 0;
  let status: MedicalPolicyTrace['status'] = 'PAID';
  let reason: string | undefined;

  if (row.reimbursement_method === 'NOT_COVERED') {
    status = 'NOT_COVERED';
    reason = 'METHOD_NOT_COVERED';
  } else {
    payable = computePayable(row, input.approved_expense_amount);
    const blocking = authErrors.filter((e) => e === 'REFERRAL_REQUIRED' || e === 'PRE_AUTHORIZATION_REQUIRED');
    if (blocking.length > 0) { status = 'HOLD'; reason = blocking.join(','); }
    else if (authErrors.length > 0) { status = 'HOLD'; reason = 'PENDING_APPROVAL'; }
  }

  return {
    resolver: 'medicalPolicyResolver',
    source_table: row.source_table,
    policy_row_id: row.id,
    reimbursement_method: row.reimbursement_method,
    percentage_rate: row.percentage_rate,
    ceiling_amount: row.ceiling_amount,
    fixed_amount: row.fixed_amount,
    currency_code: row.currency_code,
    authorization_rule_id: rule?.id ?? null,
    approval_level: row.approval_level,
    legal_reference: row.legal_reference,
    approved_expense_amount: input.approved_expense_amount,
    payable_amount: payable,
    status,
    reason,
    validation_errors: authErrors,
  };
}

/* ----------------------------- Deprecated aliases ----------------------------- */
/**
 * @deprecated use `resolveReimbursement`. Kept temporarily for older imports.
 */
export const lookupMedicalTariff = resolveReimbursement;
/** @deprecated use MedicalPolicyRow */ export type MedicalTariffRow = MedicalPolicyRow;
/** @deprecated use MedicalPolicyInput */ export type MedicalTariffLookupInput = MedicalPolicyInput;
/** @deprecated use MedicalPolicyTrace */ export type MedicalTariffTrace = MedicalPolicyTrace;
/** @deprecated use MedicalPolicyProvider */ export type MedicalTariffProvider = MedicalPolicyProvider;
/** @deprecated */ export const defaultMedicalTariffProvider = defaultMedicalPolicyProvider;
