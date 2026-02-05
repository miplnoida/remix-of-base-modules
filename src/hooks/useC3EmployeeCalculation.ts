/**
 * Hook for real-time C3 employee calculations using database configuration
 * Fetches config from c3_config_periods/c3_config_details and levy slabs from tb_levy_slab_details
 * 
 * CALCULATION RULES:
 * - Total Wages = Week1 + Week2 + Week3 + Week4 + Week5 + Holiday + Bonus
 * - Taxable Wages = Week1 + Week2 + Week3 + Week4 + Week5 + Holiday (NO bonus)
 * - Employee Levy = (Taxable Wages × 3.5%) + (Bonus × bonusLevyRate from config)
 *   - bonusLevyRate is configured in c3_config_details.bonus_levy_rate
 *   - If bonus_exempt_from_levy is true, bonus levy is 0
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
 }
 
// Employee levy rate (flat 3.5% per week)
const EMPLOYEE_LEVY_RATE = 0.035;

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
 * Calculate employee levy:
 * - Levy on Taxable Wages = taxableWages × EMPLOYEE_LEVY_RATE (3.5%)
 * - Levy on Bonus = bonus × bonusLevyRate (from config, e.g., 8%)
 * - If bonus_exempt_from_levy is true, bonus levy = 0
  */
function calculateEmployeeLevy(
  taxableWages: number,
  bonus: number,
  bonusExemptFromLevy: boolean,
  bonusLevyRate: number
 ): number {
  // Levy on Taxable Wages = taxableWages × 3.5%
  const levyOnTaxableWages = taxableWages * EMPLOYEE_LEVY_RATE;
  
  // Levy on Bonus = bonus × bonusLevyRate (from config)
  // Only if bonus is not exempt
  let levyOnBonus = 0;
  if (!bonusExemptFromLevy && bonus > 0 && bonusLevyRate > 0) {
    levyOnBonus = bonus * bonusLevyRate;
  }
  
  return round2(levyOnTaxableWages + levyOnBonus);
 }
 
 /**
  * Perform calculations with config data
  */
 function performCalculation(
   inputs: EmployeeCalculationInputs,
  config: C3ConfigData
 ): EmployeeCalculationResult {
  const { weeklyWages, dateOfBirth } = inputs;
  
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
  let employeeSS = 0;
  if (!isAgeExemptSS) {
    employeeSS = round2(config.employeeSSRate * taxableWages);
   }
   
  // Employee Levy = (Taxable Wages × 3.5%) + (Bonus × bonusLevyRate)
  let employeeLevy = 0;
  if (!isAgeExemptLevy) {
    employeeLevy = calculateEmployeeLevy(
      taxableWages,
      bonus,
      config.bonusExemptFromLevy,
      config.bonusLevyRate
    );
  }
   
  // ========================================
  // Employer Contributions (all based on Taxable Wages)
  // ========================================
   
  // Employer SS = 5% of Taxable Wages (from config)
   let employerSS = 0;
  // Employer EIB = 1% of Taxable Wages (from config)
   let employerEIB = 0;
   
   if (!isAgeExemptSS) {
    employerSS = round2(config.employerSSRate * taxableWages);
    employerEIB = round2(config.employerEIBRate * taxableWages);
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
     isAgeExemptLevy
   };
 }
 
 /**
  * Hook for fetching C3 config and performing real-time calculations
  */
 export function useC3EmployeeCalculation(periodYear: number, periodMonth: number) {
   const [config, setConfig] = useState<C3ConfigData | null>(null);
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
          ssFineSubsequentRate: Number(cfg.ss_fine_subsequent_rate) || 0.05
         };
 
         setConfig(mappedConfig);
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
       if (!config) {
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
           isAgeExemptLevy: false
         };
       }
 
      return performCalculation(inputs, config);
     },
    [config]
   );
 
   return {
     config,
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