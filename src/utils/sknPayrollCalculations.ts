/**
 * Saint Kitts & Nevis Payroll Statutory Calculations
 * 
 * Implements SS contributions, Levy calculations, and Severance pay
 * based on pay period frequency and wage inputs.
 */

export type PayPeriodType = 'Weekly' | 'BiWeekly' | 'SemiMonthly' | 'Monthly';

export interface PayrollInputs {
  payPeriod: PayPeriodType;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  week5: number;
  bonusPay: number;
  holidayPay: number;
  termStartDate: string; // ISO date string
  employeeAge: number; // Based on DOB from ip_master
}

export interface PayrollCalculationResult {
  // Input summary
  periodGross: number;
  ssWageBase: number;
  ssInsurable: number;
  
  // Employee contributions
  employeeSS: number;
  employeeLevy: number;
  
  // Employer contributions
  employerSS: number;
  employerInjury: number;
  employerSS_Total: number;
  employerLevy: number;
  employerSeverance: number;
  
  // Output totals
  totalWagesPlusEmployeeLevyPlusSS: number;
  employersThreePercentLevyPlusSS: number;
  employersOnePercentSeverancePay: number;
  
  // Age-based exemption flags
  isAgeExempt: boolean;
}

// Constants by PayPeriod
const PERIODS_PER_MONTH: Record<PayPeriodType, number> = {
  Weekly: 52 / 12, // ~4.333
  BiWeekly: 26 / 12, // ~2.167
  SemiMonthly: 2,
  Monthly: 1
};

const LEVY_EXEMPT_THRESHOLD: Record<PayPeriodType, number> = {
  Weekly: 520.00,
  BiWeekly: 1040.00,
  SemiMonthly: 1126.67,
  Monthly: 2253.33
};

// Monthly caps and brackets
const SS_MONTHLY_CAP = 6500.00;
const LEVY_BRACKET1_MONTHLY = 6500.00;
const LEVY_BRACKET2_MONTHLY = 8000.00;

// SS rates
const SS_EMPLOYEE_RATE = 0.05; // 5%
const SS_EMPLOYER_RATE = 0.05; // 5%
const SS_EMPLOYER_INJURY_RATE = 0.01; // 1%

// Levy rates
const LEVY_EMPLOYEE_BRACKET1_RATE = 0.035; // 3.5%
const LEVY_EMPLOYEE_BRACKET2_RATE = 0.10; // 10%
const LEVY_EMPLOYEE_BRACKET3_RATE = 0.12; // 12%
const LEVY_EMPLOYER_RATE = 0.03; // 3%

// Severance rate
const SEVERANCE_RATE = 0.01; // 1%

// Age limits for SS contributions (16-62)
const SS_MIN_AGE = 16;
const SS_MAX_AGE = 62;

/**
 * Round to 2 decimal places
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Check if term start month is December (for bonus SS exclusion)
 */
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
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): number {
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
    return 30; // Default to eligible age if parsing fails
  }
}

/**
 * Check if employee is eligible for SS contributions based on age
 */
function isSSEligible(age: number): boolean {
  return age >= SS_MIN_AGE && age <= SS_MAX_AGE;
}

/**
 * Calculate Saint Kitts & Nevis payroll statutory contributions
 */
export function calculatePayrollContributions(inputs: PayrollInputs): PayrollCalculationResult {
  const {
    payPeriod,
    week1,
    week2,
    week3,
    week4,
    week5,
    bonusPay,
    holidayPay,
    termStartDate,
    employeeAge
  } = inputs;

  // Validate non-negative values
  const safeWeek1 = Math.max(0, week1 || 0);
  const safeWeek2 = Math.max(0, week2 || 0);
  const safeWeek3 = Math.max(0, week3 || 0);
  const safeWeek4 = Math.max(0, week4 || 0);
  const safeWeek5 = Math.max(0, week5 || 0);
  const safeBonusPay = Math.max(0, bonusPay || 0);
  const safeHolidayPay = Math.max(0, holidayPay || 0);

  // Step 1: Calculate Period Gross
  const periodGross = safeWeek1 + safeWeek2 + safeWeek3 + safeWeek4 + safeWeek5 + safeBonusPay + safeHolidayPay;

  // Step 2: Get period-specific constants
  const periodsPerMonth = PERIODS_PER_MONTH[payPeriod];
  const levyExemptThreshold = LEVY_EXEMPT_THRESHOLD[payPeriod];
  const ssPeriodCap = SS_MONTHLY_CAP / periodsPerMonth;
  const levyBracket1Period = LEVY_BRACKET1_MONTHLY / periodsPerMonth;
  const levyBracket2Period = LEVY_BRACKET2_MONTHLY / periodsPerMonth;

  // Step 3: Calculate SS Wage Base (exclude bonus if December term start)
  let ssWageBase = periodGross;
  if (isDecemberTermStart(termStartDate)) {
    ssWageBase = periodGross - safeBonusPay;
  }

  // Step 4: Calculate SS Insurable (capped)
  const ssInsurable = Math.min(ssWageBase, ssPeriodCap);

  // Step 5: Check age eligibility for SS
  const isAgeExempt = !isSSEligible(employeeAge);

  // Step 6: Calculate SS contributions (age 16-62 only)
  let employeeSS = 0;
  let employerSS = 0;
  let employerInjury = 0;

  if (!isAgeExempt) {
    employeeSS = round2(SS_EMPLOYEE_RATE * ssInsurable);
    employerSS = round2(SS_EMPLOYER_RATE * ssInsurable);
    employerInjury = round2(SS_EMPLOYER_INJURY_RATE * ssInsurable);
  }

  const employerSS_Total = employerSS + employerInjury;

  // Step 7: Calculate Employee Levy
  let employeeLevy = 0;
  if (periodGross > levyExemptThreshold) {
    const part1 = Math.min(periodGross, levyBracket1Period);
    const part2 = Math.max(0, Math.min(periodGross, levyBracket2Period) - levyBracket1Period);
    const part3 = Math.max(0, periodGross - levyBracket2Period);
    
    employeeLevy = round2(
      LEVY_EMPLOYEE_BRACKET1_RATE * part1 +
      LEVY_EMPLOYEE_BRACKET2_RATE * part2 +
      LEVY_EMPLOYEE_BRACKET3_RATE * part3
    );
  }

  // Step 8: Calculate Employer Levy
  const employerLevy = round2(LEVY_EMPLOYER_RATE * periodGross);

  // Step 9: Calculate Employer Severance
  const employerSeverance = round2(SEVERANCE_RATE * periodGross);

  // Step 10: Calculate Output Totals
  const totalWagesPlusEmployeeLevyPlusSS = round2(periodGross + employeeLevy + employeeSS);
  const employersThreePercentLevyPlusSS = round2(employerLevy + employerSS_Total);
  const employersOnePercentSeverancePay = employerSeverance;

  return {
    // Input summary
    periodGross: round2(periodGross),
    ssWageBase: round2(ssWageBase),
    ssInsurable: round2(ssInsurable),
    
    // Employee contributions
    employeeSS,
    employeeLevy,
    
    // Employer contributions
    employerSS,
    employerInjury,
    employerSS_Total,
    employerLevy,
    employerSeverance,
    
    // Output totals
    totalWagesPlusEmployeeLevyPlusSS,
    employersThreePercentLevyPlusSS,
    employersOnePercentSeverancePay,
    
    // Flags
    isAgeExempt
  };
}

/**
 * Map UI pay period names to calculation types
 */
export function mapPayPeriodToType(uiPayPeriod: string): PayPeriodType {
  switch (uiPayPeriod) {
    case 'Weekly':
      return 'Weekly';
    case 'Bi-Weekly':
    case 'BiWeekly':
      return 'BiWeekly';
    case '2 Monthly':
    case 'SemiMonthly':
      return 'SemiMonthly';
    case 'Monthly':
    default:
      return 'Monthly';
  }
}

/**
 * Format currency with 2 decimals
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
