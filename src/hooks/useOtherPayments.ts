/**
 * Hook for Other Payments CRUD, policy validation, and contribution calculation.
 * Uses the ip_other_payments table and get_income_code_policy_for_period RPC.
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { OtherPaymentRow } from '@/types/otherPayments';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface PolicyLookupResult {
  found: boolean;
  error?: string;
  policy_id?: string;
  date_entry_mode?: string;
  policy_type?: string;
  has_exception?: boolean;
  exception_id?: string;
  levy_include?: boolean;
  ssc_contrib_employee?: boolean;
  ssc_contrib_employer?: boolean;
  contrib_eib?: boolean;
  include_in_severance?: boolean;
  calculation_method?: string;
  affects_last_week_payment?: boolean;
}

export interface C3ConfigRates {
  employeeSSRate: number;
  employerSSRate: number;
  employerEIBRate: number;
  employerLevyRate: number;
  employerSeveranceRate: number;
}

export interface OtherPaymentCalculationResult extends PolicyLookupResult {
  success: boolean;
  amount: number;
  employee_ss: number;
  employee_levy: number;
  employer_ss: number;
  employer_eib: number;
  employer_levy: number;
  employer_severance: number;
}

/**
 * Calculate contributions for an other payment based on policy flags and C3 config rates.
 * Employee levy uses the employer levy rate as a flat-rate approximation
 * (actual slab-based calculation is handled by the full RPC for regular wages).
 */
export function calculateOtherPaymentContributions(
  amount: number,
  policy: PolicyLookupResult,
  rates: C3ConfigRates
): Partial<OtherPaymentRow> {
  if (!policy.found || amount <= 0) {
    return {
      employee_ss: 0,
      employee_levy: 0,
      employer_ss: 0,
      employer_eib: 0,
      employer_levy: 0,
      employer_severance: 0,
    };
  }

  return {
    employee_ss: policy.ssc_contrib_employee ? round2(amount * rates.employeeSSRate) : 0,
    employee_levy: policy.levy_include ? round2(amount * rates.employerLevyRate) : 0,
    employer_ss: policy.ssc_contrib_employer ? round2(amount * rates.employerSSRate) : 0,
    employer_eib: policy.contrib_eib ? round2(amount * rates.employerEIBRate) : 0,
    employer_levy: policy.levy_include ? round2(amount * rates.employerLevyRate) : 0,
    employer_severance: policy.include_in_severance ? round2(amount * rates.employerSeveranceRate) : 0,
    policy_id: policy.policy_id,
    policy_type: policy.policy_type,
    date_entry_mode: policy.date_entry_mode,
    policy_error: undefined,
  };
}

/**
 * Backend-driven calculation for one Other Payment row.
 * Uses policy + C3 period config from RPC (authoritative source).
 */
export function useOtherPaymentCalculation(periodYear: number, periodMonth: number) {
  const calculatePayment = useCallback(async (
    incomeCodeId: string,
    amount: number
  ): Promise<OtherPaymentCalculationResult> => {
    if (!incomeCodeId) {
      return {
        success: false,
        found: false,
        error: 'No income code selected',
        amount: 0,
        employee_ss: 0,
        employee_levy: 0,
        employer_ss: 0,
        employer_eib: 0,
        employer_levy: 0,
        employer_severance: 0,
      };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        found: false,
        error: 'Amount must be greater than zero',
        amount: 0,
        employee_ss: 0,
        employee_levy: 0,
        employer_ss: 0,
        employer_eib: 0,
        employer_levy: 0,
        employer_severance: 0,
      };
    }

    try {
      const { data, error } = await supabase.rpc('calculate_other_payment_components', {
        p_income_code_id: incomeCodeId,
        p_period_year: periodYear,
        p_period_month: periodMonth,
        p_amount: amount,
      });

      if (error) {
        return {
          success: false,
          found: false,
          error: error.message,
          amount: 0,
          employee_ss: 0,
          employee_levy: 0,
          employer_ss: 0,
          employer_eib: 0,
          employer_levy: 0,
          employer_severance: 0,
        };
      }

      const result = (typeof data === 'string' ? JSON.parse(data) : data) as OtherPaymentCalculationResult;
      return {
        ...result,
        success: !!result.success,
        found: !!result.found,
        amount: Number(result.amount) || 0,
        employee_ss: Number(result.employee_ss) || 0,
        employee_levy: Number(result.employee_levy) || 0,
        employer_ss: Number(result.employer_ss) || 0,
        employer_eib: Number(result.employer_eib) || 0,
        employer_levy: Number(result.employer_levy) || 0,
        employer_severance: Number(result.employer_severance) || 0,
      };
    } catch (err) {
      return {
        success: false,
        found: false,
        error: err instanceof Error ? err.message : 'Other payment calculation failed',
        amount: 0,
        employee_ss: 0,
        employee_levy: 0,
        employer_ss: 0,
        employer_eib: 0,
        employer_levy: 0,
        employer_severance: 0,
      };
    }
  }, [periodYear, periodMonth]);

  return { calculatePayment };
}

/**
 * Hook for looking up income code policies for a given period.
 * Caches results per income_code_id to avoid redundant queries.
 */
export function useIncomeCodePolicyLookup(periodYear: number, periodMonth: number) {
  const cache = useRef<Map<string, PolicyLookupResult>>(new Map());

  const lookupPolicy = useCallback(async (incomeCodeId: string): Promise<PolicyLookupResult> => {
    if (!incomeCodeId) return { found: false, error: 'No income code selected' };

    const cached = cache.current.get(incomeCodeId);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_income_code_policy_for_period', {
        p_income_code_id: incomeCodeId,
        p_period_year: periodYear,
        p_period_month: periodMonth,
      });

      if (error) {
        const result: PolicyLookupResult = { found: false, error: error.message };
        return result;
      }

      const result = (typeof data === 'string' ? JSON.parse(data) : data) as PolicyLookupResult;
      cache.current.set(incomeCodeId, result);
      return result;
    } catch (err) {
      return { found: false, error: err instanceof Error ? err.message : 'Policy lookup failed' };
    }
  }, [periodYear, periodMonth]);

  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  return { lookupPolicy, clearCache };
}

/**
 * Hook for loading and saving other payments for a C3 employee.
 */
export function useOtherPaymentsCRUD() {
  const [isLoading, setIsLoading] = useState(false);

  const loadOtherPayments = useCallback(async (c3Id: string, ssn?: string): Promise<OtherPaymentRow[]> => {
    if (!c3Id) return [];
    setIsLoading(true);
    try {
      let query = (supabase as any)
        .from('ip_other_payments')
        .select('*, tb_income_codes(code, description)')
        .eq('c3_id', c3Id);
      if (ssn) query = query.eq('ssn', ssn);
      query = query.order('created_at');

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        income_code_id: row.income_code_id,
        income_code: row.tb_income_codes?.code || '',
        income_description: row.tb_income_codes?.description || '',
        amount: Number(row.amount) || 0,
        employee_ss: Number(row.employee_ss) || 0,
        employee_levy: Number(row.employee_levy) || 0,
        employer_ss: Number(row.employer_ss) || 0,
        employer_eib: Number(row.employer_eib) || 0,
        employer_levy: Number(row.employer_levy) || 0,
        employer_severance: Number(row.employer_severance) || 0,
        policy_id: row.policy_id,
        policy_type: row.policy_type,
        date_entry_mode: row.date_entry_mode,
      }));
    } catch (err) {
      console.error('Error loading other payments:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveOtherPayments = useCallback(async (
    c3Id: string,
    ssn: string,
    payments: OtherPaymentRow[],
    userCode?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!c3Id || !ssn) return { success: false, error: 'Missing c3_id or ssn' };

    try {
      // Delete existing
      await (supabase as any).from('ip_other_payments').delete()
        .eq('c3_id', c3Id)
        .eq('ssn', ssn);

      // Insert new
      if (payments.length > 0) {
        const records = payments
          .filter(p => p.income_code_id && p.amount > 0)
          .map(p => ({
            c3_id: c3Id,
            ssn,
            income_code_id: p.income_code_id,
            amount: p.amount,
            employee_ss: p.employee_ss || 0,
            employee_levy: p.employee_levy || 0,
            employer_ss: p.employer_ss || 0,
            employer_eib: p.employer_eib || 0,
            employer_levy: p.employer_levy || 0,
            employer_severance: p.employer_severance || 0,
            policy_id: p.policy_id || null,
            policy_type: p.policy_type || null,
            date_entry_mode: p.date_entry_mode || null,
            created_by: userCode || null,
            updated_by: userCode || null,
          }));

        if (records.length > 0) {
          const { error } = await (supabase as any).from('ip_other_payments').insert(records);
          if (error) throw error;
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error saving other payments:', err);
      return { success: false, error: err.message };
    }
  }, []);

  return { loadOtherPayments, saveOtherPayments, isLoading };
}

/**
 * Validate that all income codes in the other payments have active policies for the period.
 * Returns an array of validation errors (empty if all valid).
 */
export async function validateOtherPaymentPolicies(
  payments: OtherPaymentRow[],
  periodYear: number,
  periodMonth: number
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const validPayments = payments.filter(p => p.income_code_id && p.amount > 0);

  for (const payment of validPayments) {
    try {
      const { data, error } = await supabase.rpc('get_income_code_policy_for_period', {
        p_income_code_id: payment.income_code_id,
        p_period_year: periodYear,
        p_period_month: periodMonth,
      });

      if (error) {
        errors.push(`Policy validation failed for income code "${payment.income_code || payment.income_code_id}": ${error.message}`);
        continue;
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result.found) {
        const codeName = payment.income_code || payment.income_description || payment.income_code_id;
        errors.push(`No active policy configured for income code "${codeName}" for the selected C3 period.`);
      }
    } catch (err) {
      errors.push(`Policy validation error for income code "${payment.income_code || payment.income_code_id}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}
