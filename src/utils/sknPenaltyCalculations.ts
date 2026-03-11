/**
 * Saint Kitts & Nevis Statutory Late-Payment Penalty Calculations
 * 
 * Implements penalty calculations for:
 * 1. Levy Penalty (Housing & Social Development Levy)
 * 2. Severance Penalty (Severance Payments Fund contribution)
 * 3. Social Security late fine (Fines due for the month)
 * 
 * Filing deadline is computed directly from the period using the configured
 * filing window (in months). This avoids double-counting the due-date offset.
 * 
 * Example: Period = Feb 2025, Filing Window = 1 month
 *   → Filing Deadline = last day of March 2025 (March 31)
 *   → April 2025 = 1 month late (Initial Penalty)
 *   → March 2026 = 12 months late
 */

export interface PenaltyInputs {
  employeeLevyDue: number;       // Employee levy amount
  employerLevyDue: number;       // Employer levy amount
  severanceAmountDue: number;    // Total severance contribution due for the month
  employeeSSDue: number;         // Employee social security amount
  employerSSDue: number;         // Employer social security amount (includes EIB)
  dueDate: Date;                 // Legacy due date (kept for display)
  paymentDate: Date | null;      // Date-received - actual remittance date
  today: Date;                   // System date (used if paymentDate is null)
  // Period info for filing deadline calculation
  periodYear?: number;           // e.g. 2025
  periodMonth?: number;          // 0-indexed (0=Jan, 1=Feb, ...)
  filingWindowMonths?: number;   // Filing window in months (default 1)
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
  filingDeadline: Date;            // The actual filing deadline used for calculation
  daysLate: number;
  monthsLateCalendar: number;      // Calendar months between payment month and filing deadline month
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
 * This is the legacy due date kept for display purposes.
 */
export function calculateDueDate(periodYear: number, periodMonth: number): Date {
  const nextMonth = periodMonth + 1;
  const year = nextMonth > 11 ? periodYear + 1 : periodYear;
  const month = nextMonth > 11 ? 0 : nextMonth;
  const lastDay = new Date(year, month + 1, 0);
  return lastDay;
}

/**
 * Calculate the filing deadline directly from the period and filing window.
 * Filing deadline = last day of (period_month + filingWindowMonths).
 * 
 * Example: Period = Feb 2025 (month=1), filingWindowMonths=1
 *   Target month index = 1 + 1 = 2 → March
 *   Filing deadline = last day of March 2025 = March 31, 2025
 */
export function calculateFilingDeadline(periodYear: number, periodMonth: number, filingWindowMonths: number = 1): Date {
  // periodMonth is 0-indexed (0=Jan, 1=Feb, ...)
  // Target month (0-indexed) = periodMonth + filingWindowMonths
  let targetMonth = periodMonth + filingWindowMonths;
  let targetYear = periodYear;
  
  while (targetMonth > 11) {
    targetMonth -= 12;
    targetYear++;
  }
  
  // Last day of target month: day 0 of the next month
  return new Date(targetYear, targetMonth + 1, 0);
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
    periodYear,
    periodMonth,
    filingWindowMonths = 1,
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

  // 2. Filing deadline - compute from period if available, else fall back to dueDate
  let filingDeadline: Date;
  if (periodYear !== undefined && periodMonth !== undefined) {
    filingDeadline = calculateFilingDeadline(periodYear, periodMonth, filingWindowMonths);
  } else {
    // Legacy fallback: use dueDate directly (for backward compat)
    filingDeadline = dueDate;
  }

  // 3. Days Late
  const timeDiff = effectivePaymentDate.getTime() - filingDeadline.getTime();
  const daysLate = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));

  // 4. Legacy 30-day periods (kept for display compatibility)
  let additional30DayPeriods = 0;
  if (daysLate > 30) {
    additional30DayPeriods = Math.ceil((daysLate - 30) / 30);
  }
  const monthsLateForSS = daysLate > 0 ? Math.ceil(daysLate / 30) : 0;

  // 5. Calendar-month-based lateness (used for penalty calculation)
  const deadlineYear = filingDeadline.getFullYear();
  const deadlineMonth = filingDeadline.getMonth();
  const recYear = effectivePaymentDate.getFullYear();
  const recMonth = effectivePaymentDate.getMonth();
  const monthsLateCalendar = Math.max(0, (recYear * 12 + recMonth) - (deadlineYear * 12 + deadlineMonth));

  // A) Levy Penalty: initial rate for first late month, subsequent rate per additional month
  let levyPenalty = 0;
  if (levyPenaltyBase > 0 && monthsLateCalendar > 0) {
    levyPenalty = round2(
      levyPenaltyBase * levyPenaltyInitialRate +
      levyPenaltyBase * levyPenaltySubsequentRate * Math.max(monthsLateCalendar - 1, 0)
    );
  }

  // B) Severance Penalty
  let severancePenalty = 0;
  if (severancePenaltyBase > 0 && monthsLateCalendar > 0) {
    severancePenalty = round2(
      severancePenaltyBase * severancePenaltyInitialRate +
      severancePenaltyBase * severancePenaltySubsequentRate * Math.max(monthsLateCalendar - 1, 0)
    );
  }

  // C) Social Security Fine
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
    filingDeadline,
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
 */
export function calculateLevyPenaltyBase(
  employeeLevy: number, 
  employerLevy: number
): number {
  return round2((employeeLevy || 0) + (employerLevy || 0));
}

/**
 * Calculate social security fine base amount
 */
export function calculateSocialSecurityFineBase(
  employeeSS: number,
  employerSSTotal: number
): number {
  return round2((employeeSS || 0) + (employerSSTotal || 0));
}
