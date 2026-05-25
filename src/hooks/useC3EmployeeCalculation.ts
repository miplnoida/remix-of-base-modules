/**
 * Hook for real-time C3 employee calculations using database configuration
 * Fetches config from c3_config_periods/c3_config_details and levy slabs from tb_levy_slab_details
 * 
 * CALCULATION RULES:
 * - Total Wages = Week1 + Week2 + Week3 + Week4 + Week5 + Holiday + Bonus
 * - Taxable Wages = Week1 + Week2 + Week3 + Week4 + Week5 + Holiday (NO bonus)
 * - Employee Levy = Slab-based calculation for each weekly amount (Week1-5, Holiday)
 *   - For each week: Find matching slab where amount > over_amt
 *   - Calculate: base_amt + ((amount - over_amt + 0.01) * tax_rate)
 *   - Plus: Bonus levy (handled by bonus policy engine)
 * - Employee SS = 5% of Taxable Wages
 * - Employer Levy = 3% of Taxable Wages
 * - Employer SS = 5% of Taxable Wages + 1% EIB of Taxable Wages = 6% total
 * - Employer Severance = 1% of Taxable Wages
 */

import { useState, useEffect, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 
export interface C3ConfigData {
  configPeriodId: string;
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
  employerSSMaxWage: number;
  employerLevyRate: number;
  employerSeveranceRate: number;
  levySlabId: string | null;
  // Penalty rates from config
  levyPenaltyInitialRate: number;
  levyPenaltySubsequentRate: number;
  severancePenaltyInitialRate: number;
  severancePenaltySubsequentRate: number;
  ssFineInitialRate: number;
  ssFineSubsequentRate: number;
  // Monthly levy switching parameters
  levyMonthlyThreshold: number;
  levyUseMonthlyWhenExceeded: boolean;
}
 
 export interface LevySlabDetail {
   id: string;
   slabId: string;
   payPeriod: string;
   orderNo: number;
   overAmt: number;
   baseAmt: number;
   taxRate: number;
 }

 export interface BonusPolicyData {
   id: string;
   includeInLevy: boolean;
   calculationMethod: 'merge' | 'separate';
   calcFlatEnabled: boolean;
   calcFlatPercentage: number | null;
   calcSlabEnabled: boolean;
   distribution: any;
   minBonusAmount: number | null;
   maxBonusAmount: number | null;
   contribEmployee: boolean;
   contribEmployer: boolean;
   contribEIR: boolean;
   contribSeverance: boolean;
 }

 export interface EmployeeCalculationInputs {
   weeklyWages: number[];
   payPeriod: string;
   dateOfBirth: string;
   termStartDate: string;
  receivedDate?: string; // For penalty calculations
 }
 
export interface EmployeeCalculationResult {
  // Wage totals
  totalWages: number;      // Week1-5 + Holiday + Bonus
  taxableWages: number;    // Week1-5 + Holiday (NO bonus)
  
  // Employee contributions
  employeeSS: number;
  employeeLevy: number;
  
  // Employer contributions
  employerSS: number;
  employerEIB: number;
  employerSSTotal: number;
  employerLevy: number;
  employerSeverance: number;
  
  // Legacy fields for compatibility
  periodGross: number;
  ssWageBase: number;
  ssInsurable: number;
  totalWagesPlusEmployeeLevyPlusSS: number;
  employersThreePercentLevyPlusSS: number;
  employersOnePercentSeverancePay: number;
  
  // Age-based exemption flags
  isAgeExemptSS: boolean;
  isAgeExemptLevy: boolean;
  
  // Monthly levy switching flag
  usedMonthlyLevyLogic: boolean;
}
 
 // Calculate age from date of birth
 function calculateAge(dateOfBirth: string): number {
   if (!dateOfBirth) return 30; // Default to eligible age if unknown
   
   try {
     const dob = new Date(dateOfBirth);
     const today = new Date();
     let age = today.getFullYear() - dob.getFullYear();
     const monthDiff = today.getMonth() - dob.getMonth();
     
     if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
       age--;
     }
     
     return age;
   } catch {
     return 30;
   }
 }
 
 // Round to 2 decimal places
 function round2(value: number): number {
   return Math.round(value * 100) / 100;
 }
 
 /**
  * Map UI pay period to database pay period code
  */
 function mapPayPeriodToCode(uiPayPeriod: string): string {
   switch (uiPayPeriod) {
     case 'Weekly':
       return 'W';
     case 'Bi-Weekly':
     case 'BiWeekly':
       return 'E2W';
     case '2 Monthly':
     case 'SemiMonthly':
       return '2M';
     case 'Monthly':
     default:
       return 'M';
   }
 }
 
 /**
  * Calculate levy for a single weekly amount using slab details
  * @param amount - The weekly wage amount
  * @param slabDetails - Slab details ordered by over_amt DESC
  * @returns Levy amount for this week
  */
 function calculateSlabLevy(amount: number, slabDetails: LevySlabDetail[]): number {
   if (amount <= 0 || slabDetails.length === 0) {
     return 0;
  }
   
   // Find the first slab where amount > over_amt
   // Slab details should be ordered by over_amt DESC
   for (const slab of slabDetails) {
     if (amount > slab.overAmt) {
       // Calculate: base_amt + ((amount - over_amt + 0.01) * tax_rate)
       const levy = slab.baseAmt + ((amount - slab.overAmt + 0.01) * slab.taxRate);
       return round2(levy);
     }
   }
   
   // No matching slab found - no levy
   return 0;
 }
 
/**
 * Determine if bonus is eligible based on min/max gating in the policy.
 */
function isBonusEligible(bonus: number, policy: BonusPolicyData | null): boolean {
  if (bonus <= 0) return false;
  if (!policy) return false;
  if (policy.minBonusAmount != null && bonus < policy.minBonusAmount) return false;
  if (policy.maxBonusAmount != null && bonus > policy.maxBonusAmount) return false;
  return true;
}

/**
 * Apply the bonus policy distribution to the weekly slots and return
 * a new merged array [W1, W2, W3, W4, W5, Holiday(W6)].
 * Mirrors the merge logic in calculate_c3_contributions (PL/pgSQL) and
 * the calculate-bonus-policy edge function.
 */
function mergeBonusIntoWeeks(
  weeklyWages: number[],
  bonus: number,
  payPeriod: string,
  policy: BonusPolicyData
): number[] {
  // index map: 0=W1 1=W2 2=W3 3=W4 4=W5 5=Holiday(W6)
  const merged = [
    weeklyWages[0] || 0,
    weeklyWages[1] || 0,
    weeklyWages[2] || 0,
    weeklyWages[3] || 0,
    weeklyWages[4] || 0,
    weeklyWages[6] || 0,
  ];
  const dist = policy.distribution;

  if (payPeriod === 'Weekly') {
    const wk = dist?.weekly;
    const selected: number[] = [];
    if (wk?.w1) selected.push(0);
    if (wk?.w2) selected.push(1);
    if (wk?.w3) selected.push(2);
    if (wk?.w4) selected.push(3);

    if (wk?.divide || selected.length === 0) {
      // Divide equally across W1..W5
      const per = round2(bonus / 5);
      for (let i = 0; i < 5; i++) merged[i] += per;
    } else if (selected.length === 1) {
      merged[selected[0]] += bonus;
    } else {
      const per = round2(bonus / selected.length);
      for (const idx of selected) merged[idx] += per;
    }
  } else if (payPeriod === 'Bi-Weekly' || payPeriod === 'BiWeekly') {
    const bw = dist?.biweekly;
    if (bw?.divide) {
      merged[0] += round2(bonus / 2);
      merged[2] += round2(bonus / 2);
    } else if (bw?.b1) {
      merged[0] += bonus;
    } else if (bw?.b2) {
      merged[2] += bonus;
    } else {
      merged[0] += bonus;
    }
  } else {
    // Monthly / 2 Monthly / SemiMonthly default → W1
    merged[0] += bonus;
  }
  return merged;
}

/**
 * Calculate employee levy honoring the bonus policy (merge / separate / no inclusion).
 *
 * Week indices in input: 0=W1, 1=W2, 2=W3, 3=W4, 4=W5, 5=Bonus, 6=Holiday(W6)
 */
function calculateEmployeeLevy(
  weeklyWages: number[],
  payPeriod: string,
  slabDetails: LevySlabDetail[],
  levyMonthlyThreshold: number,
  levyUseMonthlyWhenExceeded: boolean,
  bonusPolicy: BonusPolicyData | null
): { totalLevy: number; usedMonthlyLogic: boolean } {
  const week1 = weeklyWages[0] || 0;
  const week2 = weeklyWages[1] || 0;
  const week3 = weeklyWages[2] || 0;
  const week4 = weeklyWages[3] || 0;
  const week5 = weeklyWages[4] || 0;
  const bonus = weeklyWages[5] || 0;
  const week6Holiday = weeklyWages[6] || 0;

  const bonusEligible = isBonusEligible(bonus, bonusPolicy);
  const includeBonusInLevy = bonusEligible && (bonusPolicy?.includeInLevy ?? false);
  const method = bonusPolicy?.calculationMethod ?? 'merge';

  const payPeriodCode = mapPayPeriodToCode(payPeriod);
  const matchingSlabs = slabDetails
    .filter(s => s.payPeriod === payPeriodCode)
    .sort((a, b) => b.overAmt - a.overAmt);
  const monthlySlabs = slabDetails
    .filter(s => s.payPeriod === 'M')
    .sort((a, b) => b.overAmt - a.overAmt);

  // Build the per-week array used for levy.
  // For MERGE + includeInLevy: bonus folded into the configured slot(s).
  // Otherwise: bonus left out of weekly slots (separate bonus added later if applicable).
  let weeksForLevy: number[];
  if (includeBonusInLevy && method === 'merge') {
    weeksForLevy = mergeBonusIntoWeeks(weeklyWages, bonus, payPeriod, bonusPolicy!);
  } else {
    weeksForLevy = [week1, week2, week3, week4, week5, week6Holiday];
  }

  const totalWeek1To6 = weeksForLevy.reduce((a, b) => a + b, 0);

  let totalLevy = 0;
  let usedMonthlyLogic = false;

  if (levyUseMonthlyWhenExceeded && totalWeek1To6 > levyMonthlyThreshold && monthlySlabs.length > 0) {
    totalLevy = calculateSlabLevy(totalWeek1To6, monthlySlabs);
    usedMonthlyLogic = true;
  } else {
    for (const amt of weeksForLevy) {
      if (amt > 0) totalLevy += calculateSlabLevy(amt, matchingSlabs);
    }
  }

  // Separate-method bonus contribution (charged on top of regular weekly levy)
  if (includeBonusInLevy && method === 'separate' && bonus > 0) {
    if (bonusPolicy?.calcFlatEnabled && bonusPolicy.calcFlatPercentage) {
      totalLevy += round2(bonus * (bonusPolicy.calcFlatPercentage / 100));
    } else if (bonusPolicy?.calcSlabEnabled) {
      totalLevy += calculateSlabLevy(bonus, matchingSlabs);
    }
  }

  return { totalLevy: round2(totalLevy), usedMonthlyLogic };
}
 
 /**
  * Perform calculations with config data
  */
 function performCalculation(
   inputs: EmployeeCalculationInputs,
   config: C3ConfigData,
   slabDetails: LevySlabDetail[],
   bonusPolicy: BonusPolicyData | null
 ): EmployeeCalculationResult {
   const { weeklyWages, dateOfBirth, payPeriod } = inputs;
  
  // Safely get wage values
  const week1 = weeklyWages[0] || 0;
  const week2 = weeklyWages[1] || 0;
  const week3 = weeklyWages[2] || 0;
  const week4 = weeklyWages[3] || 0;
  const week5 = weeklyWages[4] || 0;
  const bonus = weeklyWages[5] || 0;
  const holiday = weeklyWages[6] || 0;
  
  // Calculate Total Wages = Week1-5 + Holiday + Bonus
  const totalWages = round2(week1 + week2 + week3 + week4 + week5 + holiday + bonus);
   
  // Taxable Wages = Week1-5 + Holiday (excludes bonus by definition)
  const taxableWages = round2(week1 + week2 + week3 + week4 + week5 + holiday);
   
  // Check age eligibility
  const employeeAge = calculateAge(dateOfBirth);
  const isAgeExemptSS = employeeAge < config.minAgeSS || employeeAge > config.maxAgeSS;
  const isAgeExemptLevy = employeeAge < config.minAgeLevy || employeeAge > config.maxAgeLevy;

  // Bonus eligibility per active policy (min/max gating)
  const bonusEligible = isBonusEligible(bonus, bonusPolicy);
   
  // ========================================
  // Employee Contributions
  // ========================================

  // Employee SS — base = taxable wages (+ bonus if policy.contribEmployee)
  let employeeSS = 0;
  if (!isAgeExemptSS) {
    let employeeSSBase = taxableWages;
    if (bonusEligible && bonusPolicy?.contribEmployee) employeeSSBase += bonus;
    const cappedTaxableForEmployeeSS = Math.min(employeeSSBase, config.employeeSSMaxWage);
    employeeSS = round2(config.employeeSSRate * cappedTaxableForEmployeeSS);
   }
   
  // Employee Levy — honors bonus policy (merge / separate / none)
  let employeeLevy = 0;
  let usedMonthlyLevyLogic = false;
  if (!isAgeExemptLevy) {
    const levyResult = calculateEmployeeLevy(
      weeklyWages,
      payPeriod,
      slabDetails,
      config.levyMonthlyThreshold,
      config.levyUseMonthlyWhenExceeded,
      bonusPolicy
    );
    employeeLevy = levyResult.totalLevy;
    usedMonthlyLevyLogic = levyResult.usedMonthlyLogic;
  }
   
  // ========================================
  // Employer Contributions
  // ========================================
   
   let employerSS = 0;
   let employerEIB = 0;
   
   if (!isAgeExemptSS) {
    let employerSSBase = taxableWages;
    if (bonusEligible && bonusPolicy?.contribEmployer) employerSSBase += bonus;
    let employerEIBBase = taxableWages;
    if (bonusEligible && bonusPolicy?.contribEIR) employerEIBBase += bonus;
    employerSS = round2(config.employerSSRate * Math.min(employerSSBase, config.employerSSMaxWage));
    employerEIB = round2(config.employerEIBRate * Math.min(employerEIBBase, config.employerSSMaxWage));
   }
   
   const employerSSTotal = round2(employerSS + employerEIB);
   
  // Employer Levy base = taxable wages (+ bonus if includeInLevy)
  let employerLevyBase = taxableWages;
  if (bonusEligible && bonusPolicy?.includeInLevy) employerLevyBase += bonus;
  const employerLevy = round2(config.employerLevyRate * employerLevyBase);
   
  // Employer Severance base = taxable wages (+ bonus if contribSeverance)
  let severanceBase = taxableWages;
  if (bonusEligible && bonusPolicy?.contribSeverance) severanceBase += bonus;
  const employerSeverance = round2(config.employerSeveranceRate * severanceBase);
   
  // ========================================
  // Output Totals (for display and compatibility)
  // ========================================
  const totalWagesPlusEmployeeLevyPlusSS = round2(totalWages + employeeLevy + employeeSS);
   const employersThreePercentLevyPlusSS = round2(employerLevy + employerSSTotal);
   const employersOnePercentSeverancePay = employerSeverance;
   
   return {
    // Primary wage calculations
    totalWages,
    taxableWages,
    
    // Employee contributions
     employeeSS,
     employeeLevy,
    
    // Employer contributions
     employerSS,
     employerEIB,
     employerSSTotal,
     employerLevy,
     employerSeverance,
    
    // Legacy compatibility fields
    periodGross: totalWages,
    ssWageBase: taxableWages,
    ssInsurable: taxableWages,
     totalWagesPlusEmployeeLevyPlusSS,
     employersThreePercentLevyPlusSS,
     employersOnePercentSeverancePay,
    
    // Age exemption flags
     isAgeExemptSS,
     isAgeExemptLevy,
     
     // Monthly levy switching flag
     usedMonthlyLevyLogic
   };
 }
 
 /**
  * Hook for fetching C3 config and performing real-time calculations
  */
 export function useC3EmployeeCalculation(periodYear: number, periodMonth: number) {
   const [config, setConfig] = useState<C3ConfigData | null>(null);
   const [slabDetails, setSlabDetails] = useState<LevySlabDetail[]>([]);
   const [bonusPolicy, setBonusPolicy] = useState<BonusPolicyData | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
 
  // Fetch config on mount or period change
   useEffect(() => {
    const fetchConfig = async () => {
       setIsLoading(true);
       setError(null);
 
       try {
         // Build period date (first day of month)
         const periodDate = `${periodYear}-${String(periodMonth + 1).padStart(2, '0')}-01`;
         
        // Fetch config using RPC - includes all rates from c3_config_details
         const { data: configData, error: configError } = await supabase.rpc(
           'get_c3_config_for_period',
           { p_period_date: periodDate }
         );
 
         if (configError) {
           throw new Error(configError.message);
         }
 
         if (!configData || configData.length === 0) {
           throw new Error('No C3 configuration found for this period');
         }
 
         const cfg = configData[0];
          const mappedConfig: C3ConfigData = {
            configPeriodId: cfg.config_period_id,
            startDate: cfg.start_date,
            endDate: cfg.end_date,
            minAgeSS: cfg.min_age_ss,
            maxAgeSS: cfg.max_age_ss,
            minAgeLevy: cfg.min_age_levy,
            maxAgeLevy: cfg.max_age_levy,
           employeeSSRate: Number(cfg.employee_ss_rate) || 0.05,
           employeeSSMaxWage: Number(cfg.employee_ss_max_wage) || 6500,
           employerSSRate: Number(cfg.employer_ss_rate) || 0.05,
            employerEIBRate: Number(cfg.employer_eib_rate) || 0.01,
            employerEIBMaxWage: Number(cfg.employer_eib_max_wage) || 6500,
            employerSSMaxWage: Number(cfg.employer_ss_max_wage) || 6500,
           employerLevyRate: Number(cfg.employer_levy_rate) || 0.03,
           employerSeveranceRate: Number(cfg.employer_severance_rate) || 0.01,
           levySlabId: cfg.levy_slab_id,
           // Penalty rates
           levyPenaltyInitialRate: Number(cfg.levy_penalty_initial_rate) || 0.10,
           levyPenaltySubsequentRate: Number(cfg.levy_penalty_subsequent_rate) || 0.01,
           severancePenaltyInitialRate: Number(cfg.severance_penalty_initial_rate) || 0.10,
           severancePenaltySubsequentRate: Number(cfg.severance_penalty_subsequent_rate) || 0.01,
           ssFineInitialRate: Number(cfg.ss_fine_initial_rate) || 0.05,
           ssFineSubsequentRate: Number(cfg.ss_fine_subsequent_rate) || 0.05,
           // Monthly levy switching parameters
           levyMonthlyThreshold: Number(cfg.levy_monthly_threshold) || 6500,
           levyUseMonthlyWhenExceeded: cfg.levy_use_monthly_when_exceeded || false
          };
 
         setConfig(mappedConfig);
 
         // Fetch levy slab details for the period
         // Find the active levy slab where period falls between start_date and end_date
         const { data: slabData, error: slabError } = await supabase
           .from('tb_levy_slabs')
           .select('id')
           .eq('is_active', true)
           .lte('start_date', periodDate)
           .or(`end_date.gte.${periodDate},end_date.is.null`)
           .limit(1);
 
         if (slabError) {
           console.error('Error fetching levy slab:', slabError);
         } else if (slabData && slabData.length > 0) {
           const slabId = slabData[0].id;
           
           // Fetch slab details for this slab
           const { data: detailsData, error: detailsError } = await supabase
             .from('tb_levy_slab_details')
             .select('*')
             .eq('slab_id', slabId)
             .eq('is_active', true)
             .order('over_amt', { ascending: false });
 
           if (detailsError) {
             console.error('Error fetching levy slab details:', detailsError);
           } else if (detailsData) {
             const mappedSlabs: LevySlabDetail[] = detailsData.map(d => ({
               id: d.id,
               slabId: d.slab_id,
               payPeriod: d.pay_period,
               orderNo: d.order_no,
               overAmt: Number(d.over_amt),
               baseAmt: Number(d.base_amt),
               taxRate: Number(d.tax_rate)
             }));
              setSlabDetails(mappedSlabs);
            }
          }

          // Fetch active bonus policy for this period (exception first, then default)
          let resolvedPolicy: BonusPolicyData | null = null;
          const { data: excData } = await supabase
            .from('c3_bonus_policy_exceptions')
            .select('*')
            .eq('is_active', true)
            .eq('override_default', true)
            .lte('date_from', periodDate)
            .or(`date_to.gte.${periodDate},date_to.is.null`)
            .order('date_from', { ascending: false })
            .limit(1);

          if (excData && excData.length > 0) {
            const exc = excData[0];
            const matchesMonth = exc.exception_month === (periodMonth + 1);
            const matchesYear = exc.year_from <= periodYear &&
              (exc.year_to === null || exc.year_to >= periodYear);
            if (matchesMonth && matchesYear) {
              resolvedPolicy = {
                id: exc.id,
                includeInLevy: exc.include_in_levy ?? false,
                calculationMethod: (exc.calculation_method ?? 'merge') as 'merge' | 'separate',
                calcFlatEnabled: exc.calc_flat_enabled ?? false,
                calcFlatPercentage: exc.calc_flat_percentage,
                calcSlabEnabled: exc.calc_slab_enabled ?? false,
                distribution: exc.distribution,
                minBonusAmount: exc.min_bonus_amount,
                maxBonusAmount: exc.max_bonus_amount,
                contribEmployee: exc.contrib_employee ?? false,
                contribEmployer: exc.contrib_employer ?? false,
                contribEIR: exc.contrib_eir ?? false,
                contribSeverance: exc.contrib_severance ?? false,
              };
            }
          }

          if (!resolvedPolicy) {
            const { data: defData } = await supabase
              .from('c3_bonus_policy_default')
              .select('*')
              .eq('is_active', true)
              .lte('date_from', periodDate)
              .or(`date_to.gte.${periodDate},date_to.is.null`)
              .order('date_from', { ascending: false })
              .limit(1);
            if (defData && defData.length > 0) {
              const def = defData[0];
              resolvedPolicy = {
                id: def.id,
                includeInLevy: def.include_in_levy,
                calculationMethod: (def.calculation_method ?? 'merge') as 'merge' | 'separate',
                calcFlatEnabled: def.calc_flat_enabled,
                calcFlatPercentage: def.calc_flat_percentage,
                calcSlabEnabled: def.calc_slab_enabled,
                distribution: def.distribution,
                minBonusAmount: def.min_bonus_amount,
                maxBonusAmount: def.max_bonus_amount,
                contribEmployee: def.contrib_employee,
                contribEmployer: def.contrib_employer,
                contribEIR: def.contrib_eir,
                contribSeverance: def.contrib_severance ?? false,
              };
            }
          }
          setBonusPolicy(resolvedPolicy);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load C3 configuration';
          setError(errorMessage);
          console.error('Error loading C3 config:', err);
       } finally {
         setIsLoading(false);
       }
     };
 
    fetchConfig();
   }, [periodYear, periodMonth]);
 
   // Calculate function that can be called with employee inputs
   const calculate = useCallback(
     (inputs: EmployeeCalculationInputs): EmployeeCalculationResult => {
       if (!config || slabDetails.length === 0) {
         // Return zero values if config not loaded
         return {
           totalWages: 0,
           taxableWages: 0,
            periodGross: 0,
            ssWageBase: 0,
            ssInsurable: 0,
            employeeSS: 0,
            employeeLevy: 0,
            employerSS: 0,
            employerEIB: 0,
            employerSSTotal: 0,
            employerLevy: 0,
            employerSeverance: 0,
            totalWagesPlusEmployeeLevyPlusSS: 0,
            employersThreePercentLevyPlusSS: 0,
            employersOnePercentSeverancePay: 0,
            isAgeExemptSS: false,
            isAgeExemptLevy: false,
            usedMonthlyLevyLogic: false
          };
       }
 
       return performCalculation(inputs, config, slabDetails, bonusPolicy);
     },
     [config, slabDetails, bonusPolicy]
   );
 
   return {
     config,
     slabDetails,
     isLoading,
     error,
     calculate
   };
 }
 
 /**
  * Format currency with 2 decimals
  */
 export function formatCurrency(amount: number): string {
   return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
 }