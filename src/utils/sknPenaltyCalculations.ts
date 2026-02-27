/**
 * Saint Kitts & Nevis Statutory Late-Payment Penalty Calculations
 * 
 * Implements penalty calculations for:
 * 1. Levy Penalty (Housing & Social Development Levy)
 * 2. Severance Penalty (Severance Payments Fund contribution)
 * 3. Social Security late fine (Fines due for the month)
 */

export interface PenaltyInputs {
  employeeLevyDue: number;       // Employee levy amount
  employerLevyDue: number;       // Employer levy amount
  severanceAmountDue: number;    // Total severance contribution due for the month
  employeeSSDue: number;         // Employee social security amount
  employerSSDue: number;         // Employer social security amount (includes EIB)
  dueDate: Date;                 // Last-due-date is last-date of next month of selected Period
  paymentDate: Date | null;      // Date-received - actual remittance date
  today: Date;                   // System date (used if paymentDate is null)
  // Penalty rates (from config, defaults match SKN policy)
  levyPenaltyInitialRate?: number;      // default 0.10
  levyPenaltySubsequentRate?: number;   // default 0.01
  severancePenaltyInitialRate?: number; // default 0.10
  severancePenaltySubsequentRate?: number; // default 0.01
  ssFineInitialRate?: number;           // default 0.05
  ssFineSubsequentRate?: number;        // default 0.05
}

export interface PenaltyResult {
  // Derived values
  effectivePaymentDate: Date;
  daysLate: number;
  monthsLateCalendar: number;      // Calendar months between submission month and due month
  additional30DayPeriods: number;   // Legacy, kept for display
  monthsLateForSS: number;         // Legacy, kept for display
  
  // Calculated penalties
  levyPenalty: number;
  severancePenalty: number;
  socialSecurityFine: number;  // Fines due for the month
  
  // Total
  totalLateCharges: number;
}

/**
 * Round to 2 decimal places
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate the due date (last day of the next month after the period)
 */
export function calculateDueDate(periodYear: number, periodMonth: number): Date {
  // Period is 0-indexed month, due date is last day of the following month
  const nextMonth = periodMonth + 1;
  const year = nextMonth > 11 ? periodYear + 1 : periodYear;
  const month = nextMonth > 11 ? 0 : nextMonth;
  
  // Get last day of the next month
  // Create date for first day of month after next, then subtract 1 day
  const lastDay = new Date(year, month + 1, 0);
  return lastDay;
}

/**
 * Calculate statutory late-payment penalties
 */
export function calculatePenalties(inputs: PenaltyInputs): PenaltyResult {
  const {
    employeeLevyDue,
    employerLevyDue,
    severanceAmountDue,
    employeeSSDue,
    employerSSDue,
    dueDate,
    paymentDate,
    today,
    levyPenaltyInitialRate = 0.10,
    levyPenaltySubsequentRate = 0.01,
    severancePenaltyInitialRate = 0.10,
    severancePenaltySubsequentRate = 0.01,
    ssFineInitialRate = 0.05,
    ssFineSubsequentRate = 0.05
  } = inputs;

  // Base amounts
  const levyPenaltyBase = (employeeLevyDue || 0) + (employerLevyDue || 0);
  const severancePenaltyBase = severanceAmountDue || 0;
  const ssFineBase = (employeeSSDue || 0) + (employerSSDue || 0);

  // 1. Effective Payment Date
  const effectivePaymentDate = paymentDate || today;

  // 2. Days Late (kept for display)
  const timeDiff = effectivePaymentDate.getTime() - dueDate.getTime();
  const daysLate = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));

  // 3. Legacy 30-day periods (kept for display compatibility)
  let additional30DayPeriods = 0;
  if (daysLate > 30) {
    additional30DayPeriods = Math.ceil((daysLate - 30) / 30);
  }
  const monthsLateForSS = daysLate > 0 ? Math.ceil(daysLate / 30) : 0;

  // 4. Calendar-month-based lateness (used for penalty calculation)
  // Compare submission month to due month
  const dueYear = dueDate.getFullYear();
  const dueMonth = dueDate.getMonth(); // 0-indexed
  const recYear = effectivePaymentDate.getFullYear();
  const recMonth = effectivePaymentDate.getMonth();
  const monthsLateCalendar = Math.max(0, (recYear * 12 + recMonth) - (dueYear * 12 + dueMonth));

  // A) Levy Penalty: initial rate for first late month, subsequent rate per additional month
  let levyPenalty = 0;
  if (levyPenaltyBase > 0 && monthsLateCalendar > 0) {
    levyPenalty = round2(
      levyPenaltyBase * levyPenaltyInitialRate +
      levyPenaltyBase * levyPenaltySubsequentRate * Math.max(monthsLateCalendar - 1, 0)
    );
  }

  // B) Severance Penalty: same timeline, severance-specific rates
  let severancePenalty = 0;
  if (severancePenaltyBase > 0 && monthsLateCalendar > 0) {
    severancePenalty = round2(
      severancePenaltyBase * severancePenaltyInitialRate +
      severancePenaltyBase * severancePenaltySubsequentRate * Math.max(monthsLateCalendar - 1, 0)
    );
  }

  // C) Social Security Fine: same timeline, SS-specific rates
  let socialSecurityFine = 0;
  if (ssFineBase > 0 && monthsLateCalendar > 0) {
    socialSecurityFine = round2(
      ssFineBase * ssFineInitialRate +
      ssFineBase * ssFineSubsequentRate * Math.max(monthsLateCalendar - 1, 0)
    );
  }

  const totalLateCharges = round2(levyPenalty + severancePenalty + socialSecurityFine);

  return {
    effectivePaymentDate,
    daysLate,
    monthsLateCalendar,
    additional30DayPeriods,
    monthsLateForSS,
    levyPenalty,
    severancePenalty,
    socialSecurityFine,
    totalLateCharges
  };
}

/**
 * Calculate levy penalty base amount
 * Levy penalty base = Employee Levy + Employer Levy ONLY (severance excluded)
 */
export function calculateLevyPenaltyBase(
  employeeLevy: number, 
  employerLevy: number
): number {
  return round2((employeeLevy || 0) + (employerLevy || 0));
}

/**
 * Calculate social security fine base amount
 * SS fine base = Employee SS + Employer SS (including EIB)
 */
export function calculateSocialSecurityFineBase(
  employeeSS: number,
  employerSSTotal: number // includes employer SS + employer injury/EIB
): number {
  return round2((employeeSS || 0) + (employerSSTotal || 0));
}
