/**
 * Saint Kitts & Nevis Statutory Late-Payment Penalty Calculations
 * 
 * Implements penalty calculations for:
 * 1. Levy Penalty (Housing & Social Development Levy)
 * 2. Severance Penalty (Severance Payments Fund contribution)
 * 3. Social Security late fine (Fines due for the month)
 */

export interface PenaltyInputs {
  levyAmountDue: number;        // Total levy due (employee + employer combined)
  severanceAmountDue: number;   // Total severance contribution due for the month
  socialSecurityAmountDue: number; // Total SS due (employee SS + employer SS + employer injury)
  dueDate: Date;                // Last-due-date is last-date of next month of selected Period
  paymentDate: Date | null;     // Date-received - actual remittance date
  today: Date;                  // System date (used if paymentDate is null)
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
    levyAmountDue,
    severanceAmountDue,
    socialSecurityAmountDue,
    dueDate,
    paymentDate,
    today
  } = inputs;

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

  // A) Levy Penalty
  // 10% + 1% for each additional 30-day period after first 30 days
  let levyPenalty = 0;
  if (levyAmountDue > 0 && daysLate > 0) {
    levyPenalty = round2(
      levyAmountDue * 0.10 + 
      levyAmountDue * 0.01 * additional30DayPeriods
    );
  }

  // B) Severance Penalty
  // Same structure as Levy: 10% + 1% for each additional 30-day period
  let severancePenalty = 0;
  if (severanceAmountDue > 0 && daysLate > 0) {
    severancePenalty = round2(
      severanceAmountDue * 0.10 + 
      severanceAmountDue * 0.01 * additional30DayPeriods
    );
  }

  // C) Social Security Fine
  // 5% of unpaid amount for each month or part of a month
  let socialSecurityFine = 0;
  if (socialSecurityAmountDue > 0 && daysLate > 0) {
    socialSecurityFine = round2(
      socialSecurityAmountDue * 0.05 * monthsLateForSS
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
 * Calculate levy amount due from employee totals
 * Levy due = Employee Levy + Employer Levy
 */
export function calculateLevyAmountDue(
  employeeLevy: number, 
  employerLevy: number
): number {
  return round2(employeeLevy + employerLevy);
}

/**
 * Calculate social security amount due from employee totals
 * SS due = Employee SS + Employer SS (including injury)
 */
export function calculateSocialSecurityAmountDue(
  employeeSS: number,
  employerSSTotal: number // includes employer SS + employer injury
): number {
  return round2(employeeSS + employerSSTotal);
}
