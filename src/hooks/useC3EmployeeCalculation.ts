 /**
  * Hook for real-time C3 employee calculations using database configuration
  * Fetches config from c3_config_periods/c3_config_details and levy slabs from tb_levy_slab_details
  */
 
 import { useState, useEffect, useCallback, useMemo } from 'react';
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
 }
 
 export interface EmployeeCalculationResult {
   // Input summary
   periodGross: number;
   ssWageBase: number;
   ssInsurable: number;
   
   // Employee contributions
   employeeSS: number;
   employeeLevy: number;
   
   // Employer contributions
   employerSS: number;
   employerEIB: number;
   employerSSTotal: number;
   employerLevy: number;
   employerSeverance: number;
   
   // Output totals
   totalWagesPlusEmployeeLevyPlusSS: number;
   employersThreePercentLevyPlusSS: number;
   employersOnePercentSeverancePay: number;
   
   // Age-based exemption flags
   isAgeExemptSS: boolean;
   isAgeExemptLevy: boolean;
 }
 
 // Map UI pay period to database pay period code
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
 
 // Periods per month for SS wage cap calculation
 const PERIODS_PER_MONTH: Record<string, number> = {
   'W': 52 / 12, // ~4.333
   'E2W': 26 / 12, // ~2.167
   '2M': 2,
   'M': 1
 };
 
 // Check if term start month is December (for bonus SS exclusion)
 function isDecemberTermStart(termStartDate: string): boolean {
   if (!termStartDate) return false;
   try {
     const date = new Date(termStartDate);
     return date.getMonth() === 11; // December is month 11 (0-indexed)
   } catch {
     return false;
   }
 }
 
 /**
  * Calculate employee levy using slab-based configuration
  */
 function calculateEmployeeLevyFromSlabs(
   periodGross: number,
   slabs: LevySlabDetail[],
   payPeriodCode: string
 ): number {
   // Filter slabs for this pay period, sorted by order
   const periodSlabs = slabs
     .filter(s => s.payPeriod === payPeriodCode)
     .sort((a, b) => a.orderNo - b.orderNo);
   
   if (periodSlabs.length === 0) {
     console.warn('No levy slabs found for pay period:', payPeriodCode);
     return 0;
   }
   
   // Find the applicable slab (the highest threshold that the gross exceeds)
   let applicableSlab: LevySlabDetail | null = null;
   let previousThreshold = 0;
   
   for (const slab of periodSlabs) {
     if (periodGross > slab.overAmt) {
       applicableSlab = slab;
       previousThreshold = slab.overAmt;
     } else {
       break;
     }
   }
   
   if (!applicableSlab) {
     // Below first threshold - no levy
     return 0;
   }
   
   // Calculate: base amount + (excess over threshold * rate)
   const excess = periodGross - applicableSlab.overAmt;
   const levy = applicableSlab.baseAmt + (excess * applicableSlab.taxRate);
   
   return round2(levy);
 }
 
 /**
  * Perform calculations with config data
  */
 function performCalculation(
   inputs: EmployeeCalculationInputs,
   config: C3ConfigData,
   levySlabs: LevySlabDetail[]
 ): EmployeeCalculationResult {
   const { weeklyWages, payPeriod, dateOfBirth, termStartDate } = inputs;
   
   // Calculate Period Gross
   const safeWages = weeklyWages.map(w => Math.max(0, w || 0));
   const periodGross = safeWages.reduce((sum, w) => sum + w, 0);
   const bonusPay = safeWages[5] || 0;
   
   // Map pay period to code
   const payPeriodCode = mapPayPeriodToCode(payPeriod);
   const periodsPerMonth = PERIODS_PER_MONTH[payPeriodCode] || 1;
   
   // Calculate SS Wage Base (exclude bonus if December term start)
   let ssWageBase = periodGross;
   if (isDecemberTermStart(termStartDate)) {
     ssWageBase = periodGross - bonusPay;
   }
   
   // Calculate SS Insurable (capped per period)
   const ssPeriodCap = config.employeeSSMaxWage / periodsPerMonth;
   const ssInsurable = Math.min(ssWageBase, ssPeriodCap);
   
   // Check age eligibility
   const employeeAge = calculateAge(dateOfBirth);
   const isAgeExemptSS = employeeAge < config.minAgeSS || employeeAge > config.maxAgeSS;
   const isAgeExemptLevy = employeeAge < config.minAgeLevy || employeeAge > config.maxAgeLevy;
   
   // Calculate SS contributions (only if age eligible)
   let employeeSS = 0;
   let employerSS = 0;
   let employerEIB = 0;
   
   if (!isAgeExemptSS) {
     employeeSS = round2(config.employeeSSRate * ssInsurable);
     employerSS = round2(config.employerSSRate * ssInsurable);
     employerEIB = round2(config.employerEIBRate * ssInsurable);
   }
   
   const employerSSTotal = round2(employerSS + employerEIB);
   
   // Calculate Employee Levy using slabs
   let employeeLevy = 0;
   if (!isAgeExemptLevy && levySlabs.length > 0) {
     employeeLevy = calculateEmployeeLevyFromSlabs(periodGross, levySlabs, payPeriodCode);
   }
   
   // Calculate Employer Levy
   const employerLevy = round2(config.employerLevyRate * periodGross);
   
   // Calculate Employer Severance
   const employerSeverance = round2(config.employerSeveranceRate * periodGross);
   
   // Calculate Output Totals
   const totalWagesPlusEmployeeLevyPlusSS = round2(periodGross + employeeLevy + employeeSS);
   const employersThreePercentLevyPlusSS = round2(employerLevy + employerSSTotal);
   const employersOnePercentSeverancePay = employerSeverance;
   
   return {
     periodGross: round2(periodGross),
     ssWageBase: round2(ssWageBase),
     ssInsurable: round2(ssInsurable),
     employeeSS,
     employeeLevy,
     employerSS,
     employerEIB,
     employerSSTotal,
     employerLevy,
     employerSeverance,
     totalWagesPlusEmployeeLevyPlusSS,
     employersThreePercentLevyPlusSS,
     employersOnePercentSeverancePay,
     isAgeExemptSS,
     isAgeExemptLevy
   };
 }
 
 /**
  * Hook for fetching C3 config and performing real-time calculations
  */
 export function useC3EmployeeCalculation(periodYear: number, periodMonth: number) {
   const [config, setConfig] = useState<C3ConfigData | null>(null);
   const [levySlabs, setLevySlabs] = useState<LevySlabDetail[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
 
   // Fetch config and levy slabs on mount or period change
   useEffect(() => {
     const fetchConfigAndSlabs = async () => {
       setIsLoading(true);
       setError(null);
 
       try {
         // Build period date (first day of month)
         const periodDate = `${periodYear}-${String(periodMonth + 1).padStart(2, '0')}-01`;
         
         // Fetch config using RPC
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
           levySlabId: cfg.levy_slab_id
         };
 
         setConfig(mappedConfig);
 
         // Fetch levy slabs if configured
         if (cfg.levy_slab_id) {
           const { data: slabData, error: slabError } = await supabase
             .from('tb_levy_slab_details')
             .select('*')
             .eq('slab_id', cfg.levy_slab_id)
             .eq('is_active', true)
             .order('pay_period')
             .order('order_no');
 
           if (slabError) {
             console.warn('Error fetching levy slabs:', slabError);
           } else if (slabData) {
             const mappedSlabs: LevySlabDetail[] = slabData.map(s => ({
               id: s.id,
               slabId: s.slab_id,
               payPeriod: s.pay_period,
               orderNo: s.order_no,
              overAmt: Number(s.over_amt) || 0,
              baseAmt: Number(s.base_amt) || 0,
              taxRate: Number(s.tax_rate) || 0
             }));
             setLevySlabs(mappedSlabs);
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
 
     fetchConfigAndSlabs();
   }, [periodYear, periodMonth]);
 
   // Calculate function that can be called with employee inputs
   const calculate = useCallback(
     (inputs: EmployeeCalculationInputs): EmployeeCalculationResult => {
       if (!config) {
         // Return zero values if config not loaded
         return {
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
 
       return performCalculation(inputs, config, levySlabs);
     },
     [config, levySlabs]
   );
 
   return {
     config,
     levySlabs,
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