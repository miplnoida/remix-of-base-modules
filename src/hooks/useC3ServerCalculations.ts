/**
 * Hook for server-side C3 calculations
 * Calls the calculate_c3_contributions RPC function for config-driven calculations
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeData } from '@/components/c3/EmployeeModal';

export interface C3CalculationConfig {
  periodId: string;
  startDate: string;
  endDate: string | null;
  minAgeSS: number;
  maxAgeSS: number;
  minAgeLevy: number;
  maxAgeLevy: number;
  employeeSSRate: number;
  employeeSSMaxWage: number;
  employerSSRate: number;
  employerEIBRate: number;
  employerEIBMaxWage: number;
  employerLevyRate: number;
  employerSeveranceRate: number;
}

export interface HolidayDistribution {
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  week5: number;
  totalDistributed: number;
  overlapDays: number[];
  distributed: boolean;
}

export interface EmployeeCalculationResult {
  ssn: string;
  name: string;
  totalWages: number;
  taxableWages: number;
  employeeAge: number;
  isAgeExemptSS: boolean;
  isAgeExemptLevy: boolean;
  ssWageBase: number;
  ssInsurable: number;
  employeeSS: number;
  employerSS: number;
  employerEIB: number;
  employerSSTotal: number;
  employeeLevy: number;
  bonusLevy: number;
  employerLevy: number;
  employerSeverance: number;
  periodGross: number;
  totalWagesPlusEmployeeLevyPlusSS: number;
  employersThreePercentLevyPlusSS: number;
  employersOnePercentSeverancePay: number;
  holidayDistribution?: HolidayDistribution;
  holidayLevy?: number;
  holidayPolicyApplied?: string;
  holidayPolicyType?: string;
}

export interface C3CalculationTotals {
  periodGross: number;
  taxableWages: number;
  employeeSS: number;
  employerSS: number;
  employeeLevy: number;
  employerLevy: number;
  employerSeverance: number;
  totalWagesPlusEmployeeLevyPlusSS: number;
  employersThreePercentLevyPlusSS: number;
  employersOnePercentSeverancePay: number;
  dueDate: string;
  daysLate: number;
  additional30DayPeriods: number;
  monthsLate: number;
  levyPenaltyBase: number;
  severancePenaltyBase: number;
  ssFinBase: number;
  levyPenalty: number;
  severancePenalty: number;
  ssFine: number;
  totalLateCharges: number;
}

export interface C3CalculationResult {
  success: boolean;
  error?: string;
  config?: C3CalculationConfig;
  employees?: EmployeeCalculationResult[];
  totals?: C3CalculationTotals;
}

// Transform EmployeeData to the format expected by the RPC
function transformEmployeeData(employees: EmployeeData[]) {
  return employees.map(emp => ({
    ssn: emp.ssn,
    name: emp.name,
    week1: emp.weeklyWages?.[0] || 0,
    week2: emp.weeklyWages?.[1] || 0,
    week3: emp.weeklyWages?.[2] || 0,
    week4: emp.weeklyWages?.[3] || 0,
    week5: emp.weeklyWages?.[4] || 0,
    bonus: emp.weeklyWages?.[5] || 0,
    holiday: emp.weeklyWages?.[6] || 0,
    payPeriod: emp.payPeriod || 'Monthly',
    termStartDate: emp.termStartDate || null,
    dateOfBirth: emp.dateOfBirth || null,
    holidayStartDate: emp.holidayNoDates ? null : (emp.holidayStartDate || null),
    holidayEndDate: emp.holidayNoDates ? null : (emp.holidayEndDate || null),
    holidayNoDates: emp.holidayNoDates ? 'true' : 'false'
  }));
}

export function useC3ServerCalculations() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<C3CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (
    periodYear: number,
    periodMonth: number, // 0-indexed
    receivedDate: string, // ISO date string
    employees: EmployeeData[]
  ): Promise<C3CalculationResult> => {
    setIsCalculating(true);
    setError(null);

    try {
      const employeeData = transformEmployeeData(employees);
      
      const { data, error: rpcError } = await supabase.rpc('calculate_c3_contributions', {
        p_period_year: periodYear,
        p_period_month: periodMonth,
        p_received_date: receivedDate,
        p_employee_data: employeeData
      });

      if (rpcError) {
        const errorResult: C3CalculationResult = {
          success: false,
          error: rpcError.message
        };
        setError(rpcError.message);
        setCalculationResult(errorResult);
        return errorResult;
      }

      // Parse the JSONB result - handle both string and object responses
      const result: C3CalculationResult = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!result.success) {
        setError(result.error || 'Calculation failed');
      }
      
      setCalculationResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      const errorResult: C3CalculationResult = {
        success: false,
        error: errorMessage
      };
      setError(errorMessage);
      setCalculationResult(errorResult);
      return errorResult;
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const clearCalculation = useCallback(() => {
    setCalculationResult(null);
    setError(null);
  }, []);

  return {
    calculate,
    isCalculating,
    calculationResult,
    error,
    clearCalculation
  };
}

// Hook to fetch configuration for a specific period
export function useC3Config() {
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<C3CalculationConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async (periodDate: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_c3_config_for_period', {
        p_period_date: periodDate
      });

      if (rpcError) {
        setError(rpcError.message);
        return null;
      }

      if (data && data.length > 0) {
        const configData = data[0];
        const mappedConfig: C3CalculationConfig = {
          periodId: configData.config_period_id,
          startDate: configData.start_date,
          endDate: configData.end_date,
          minAgeSS: configData.min_age_ss,
          maxAgeSS: configData.max_age_ss,
          minAgeLevy: configData.min_age_levy,
          maxAgeLevy: configData.max_age_levy,
          employeeSSRate: configData.employee_ss_rate,
          employeeSSMaxWage: configData.employee_ss_max_wage,
          employerSSRate: configData.employer_ss_rate,
           employerEIBRate: configData.employer_eib_rate,
           employerEIBMaxWage: configData.employer_eib_max_wage,
          employerLevyRate: configData.employer_levy_rate,
          employerSeveranceRate: configData.employer_severance_rate
        };
        setConfig(mappedConfig);
        return mappedConfig;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    fetchConfig,
    isLoading,
    config,
    error
  };
}
