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
 *   - Plus: Bonus × bonusLevyRate (if bonus not exempt)
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
  bonusExemptFromLevy: boolean;
  bonusLevyRate: number;
  employeeSSRate: number;
  employeeSSMaxWage: number;
  employerSSRate: number;
  employerEIBRate: number;
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
 * Calculate employee levy using slab-based calculation:
 * - Check if monthly levy switching should apply based on config threshold
 * - If total of Week1-6 (excluding bonus) > threshold AND flag enabled:
 *   Calculate monthly levy on sum of Week1-6 using monthly slabs
 * - Otherwise: For each weekly amount (Week1-5, Holiday), find matching slab and calculate levy
 * - If bonus is not exempt, add bonus × bonusLevyRate
 * 
 * Week indices: 0=Week1, 1=Week2, 2=Week3, 3=Week4, 4=Week5, 5=Bonus, 6=Holiday(Week6)
 */
function calculateEmployeeLevy(
  weeklyWages: number[],
  payPeriod: string,
  slabDetails: LevySlabDetail[],
  bonusExemptFromLevy: boolean,
  bonusLevyRate: number,
  levyMonthlyThreshold: number,
  levyUseMonthlyWhenExceeded: boolean
): { totalLevy: number; usedMonthlyLogic: boolean } {
  // Week1-5 = indices 0-4, Bonus = index 5, Holiday(Week6) = index 6
  const week1 = weeklyWages[0] || 0;
  const week2 = weeklyWages[1] || 0;
  const week3 = weeklyWages[2] || 0;
  const week4 = weeklyWages[3] || 0;
  const week5 = weeklyWages[4] || 0;
  const bonus = weeklyWages[5] || 0;
  const week6Holiday = weeklyWages[6] || 0;
  
  // Total wages for threshold check and monthly calculation (Week1-6, excluding bonus)
  const totalWeek1To6 = week1 + week2 + week3 + week4 + week5 + week6Holiday;
  
  let totalLevy = 0;
  let usedMonthlyLogic = false;
  
  // Check if monthly levy switching should apply:
  // If flag is enabled AND total of Week1-6 > threshold, use monthly slab calculation
  if (levyUseMonthlyWhenExceeded && totalWeek1To6 > levyMonthlyThreshold) {
    // Use monthly slabs on the combined Week1-6 total
    const monthlySlabs = slabDetails
      .filter(s => s.payPeriod === 'M') // Monthly slabs
      .sort((a, b) => b.overAmt - a.overAmt);
    
    if (monthlySlabs.length > 0) {
      // Calculate levy as monthly payment on sum of Week1-6
      totalLevy = calculateSlabLevy(totalWeek1To6, monthlySlabs);
      usedMonthlyLogic = true;
    }
  }
  
  // If not using monthly logic, calculate per-week using employee's pay period
  if (!usedMonthlyLogic) {
    const payPeriodCode = mapPayPeriodToCode(payPeriod);
    
    // Filter slabs for the matching pay period
    const matchingSlabs = slabDetails
      .filter(s => s.payPeriod === payPeriodCode)
      .sort((a, b) => b.overAmt - a.overAmt);
    
    // Calculate levy for Week1-5 (indices 0-4) and Holiday/Week6 (index 6)
    const weekIndices = [0, 1, 2, 3, 4, 6];
    for (const idx of weekIndices) {
      const weekAmount = weeklyWages[idx] || 0;
      if (weekAmount > 0) {
        const weekLevy = calculateSlabLevy(weekAmount, matchingSlabs);
        totalLevy += weekLevy;
      }
    }
  }
  
  // Add bonus levy if not exempt (applies in both cases)
  if (!bonusExemptFromLevy && bonus > 0 && bonusLevyRate > 0) {
    const bonusLevy = round2(bonus * bonusLevyRate);
    totalLevy += bonusLevy;
  }
  
  return { totalLevy: round2(totalLevy), usedMonthlyLogic };
}
 
 /**
  * Perform calculations with config data
  */
 function performCalculation(
   inputs: EmployeeCalculationInputs,
   config: C3ConfigData,
   slabDetails: LevySlabDetail[]
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
   
  // Calculate Taxable Wages = Week1-5 + Holiday (NO bonus)
  const taxableWages = round2(week1 + week2 + week3 + week4 + week5 + holiday);
   
  // Check age eligibility
  const employeeAge = calculateAge(dateOfBirth);
  const isAgeExemptSS = employeeAge < config.minAgeSS || employeeAge > config.maxAgeSS;
  const isAgeExemptLevy = employeeAge < config.minAgeLevy || employeeAge > config.maxAgeLevy;
   
  // ========================================
  // Employee Contributions
  // ========================================
  
  // Employee SS = 5% of Taxable Wages (from config)
  // CAPPED by employeeSSMaxWage from configuration
  let employeeSS = 0;
  if (!isAgeExemptSS) {
    const cappedTaxableForEmployeeSS = Math.min(taxableWages, config.employeeSSMaxWage);
    employeeSS = round2(config.employeeSSRate * cappedTaxableForEmployeeSS);
   }
   
  // Employee Levy = Slab-based calculation for each week + bonus levy
  // Uses monthly switching logic when enabled and threshold exceeded
  let employeeLevy = 0;
  let usedMonthlyLevyLogic = false;
  if (!isAgeExemptLevy) {
    const levyResult = calculateEmployeeLevy(
      weeklyWages,
      payPeriod,
      slabDetails,
      config.bonusExemptFromLevy,
      config.bonusLevyRate,
      config.levyMonthlyThreshold,
      config.levyUseMonthlyWhenExceeded
    );
    employeeLevy = levyResult.totalLevy;
    usedMonthlyLevyLogic = levyResult.usedMonthlyLogic;
  }
   
  // ========================================
  // Employer Contributions (all based on Taxable Wages)
  // ========================================
   
  // Employer SS = 5% of Taxable Wages (from config)
   let employerSS = 0;
  // Employer EIB = 1% of Taxable Wages (from config)
   let employerEIB = 0;
   
   if (!isAgeExemptSS) {
    // CAPPED by employerSSMaxWage from configuration
    const cappedTaxableForEmployerSS = Math.min(taxableWages, config.employerSSMaxWage);
    employerSS = round2(config.employerSSRate * cappedTaxableForEmployerSS);
    employerEIB = round2(config.employerEIBRate * cappedTaxableForEmployerSS);
   }
   
  // Total Employer SS = Employer SS + EIB (5% + 1% = 6%)
   const employerSSTotal = round2(employerSS + employerEIB);
   
  // Employer Levy = 3% of Taxable Wages (from config)
  const employerLevy = round2(config.employerLevyRate * taxableWages);
   
  // Employer Severance = 1% of Taxable Wages (from config)
  const employerSeverance = round2(config.employerSeveranceRate * taxableWages);
   
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
            bonusExemptFromLevy: cfg.bonus_exempt_from_levy,
           bonusLevyRate: Number(cfg.bonus_levy_rate) || 0,
           employeeSSRate: Number(cfg.employee_ss_rate) || 0.05,
           employeeSSMaxWage: Number(cfg.employee_ss_max_wage) || 6500,
           employerSSRate: Number(cfg.employer_ss_rate) || 0.05,
           employerEIBRate: Number(cfg.employer_eib_rate) || 0.01,
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
 
       return performCalculation(inputs, config, slabDetails);
     },
     [config, slabDetails]
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