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
}

export interface PenaltyResult {
  // Derived values
  effectivePaymentDate: Date;
  daysLate: number;
  additional30DayPeriods: number;
  monthsLateForSS: number;
  
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
    today
  } = inputs;

  // Corrected base amounts:
  // Levy penalty base = employee_levy + employer_levy + severance
  const levyPenaltyBase = (employeeLevyDue || 0) + (employerLevyDue || 0) + (severanceAmountDue || 0);
  // Severance penalty base = severance only
  const severancePenaltyBase = severanceAmountDue || 0;
  // SS fine base = employee_ss + employer_ss (employer_ss includes EIB)
  const ssFineBase = (employeeSSDue || 0) + (employerSSDue || 0);

  // 1. Effective Payment Date
  const effectivePaymentDate = paymentDate || today;

  // 2. Days Late
  const timeDiff = effectivePaymentDate.getTime() - dueDate.getTime();
  const daysLate = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));

  // 3. Additional 30-day periods after first 30 days
  // If DaysLate <= 30 => 0
  // Else ceil((DaysLate - 30) / 30)
  let additional30DayPeriods = 0;
  if (daysLate > 30) {
    additional30DayPeriods = Math.ceil((daysLate - 30) / 30);
  }

  // 4. Months late for SS (each 30-day period or part thereof)
  // MonthsLateForSS = ceil(DaysLate / 30)
  const monthsLateForSS = daysLate > 0 ? Math.ceil(daysLate / 30) : 0;

  // A) Levy Penalty: base = employee_levy + employer_levy + severance
  // 10% + 1% for each additional 30-day period after first 30 days
  let levyPenalty = 0;
  if (levyPenaltyBase > 0 && daysLate > 0) {
    levyPenalty = round2(
      levyPenaltyBase * 0.10 + 
      levyPenaltyBase * 0.01 * additional30DayPeriods
    );
  }

  // B) Severance Penalty: base = severance only
  // Same structure as Levy: 10% + 1% for each additional 30-day period
  let severancePenalty = 0;
  if (severancePenaltyBase > 0 && daysLate > 0) {
    severancePenalty = round2(
      severancePenaltyBase * 0.10 + 
      severancePenaltyBase * 0.01 * additional30DayPeriods
    );
  }

  // C) Social Security Fine: base = employee_ss + employer_ss (includes EIB)
  // 5% of unpaid amount for each month or part of a month
  let socialSecurityFine = 0;
  if (ssFineBase > 0 && daysLate > 0) {
    socialSecurityFine = round2(
      ssFineBase * 0.05 * monthsLateForSS
    );
  }

  // Total Late Charges
  const totalLateCharges = round2(levyPenalty + severancePenalty + socialSecurityFine);

  return {
    effectivePaymentDate,
    daysLate,
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
 * Levy penalty base = Employee Levy + Employer Levy + Severance
 */
export function calculateLevyPenaltyBase(
  employeeLevy: number, 
  employerLevy: number,
  severance: number
): number {
  return round2((employeeLevy || 0) + (employerLevy || 0) + (severance || 0));
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
