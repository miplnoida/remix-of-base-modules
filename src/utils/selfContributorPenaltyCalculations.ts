/**
 * Saint Kitts & Nevis Self-Employed/Self-Contributor Late-Payment Penalty Calculations
 * 
 * Per Social Security (Self Employment) Regulations:
 * - Contributions are due at the end of the contribution month OR within one month thereafter
 * - Monthly fine of 5% of the outstanding amount for each month or part of a month late
 */

export interface SelfContributorPenaltyInputs {
  contributionMonth: { year: number; month: number }; // The period being filed/paid for
  socialSecurityDue: number;                          // The contribution amount due for that month
  paymentDate: Date | null;                           // Actual payment date; if null, calculate "accrued to date"
  today: Date;                                        // System date, used if paymentDate is null
}

export interface SelfContributorPenaltyResult {
  dueDate: Date;                // Last day of the month following the contribution month
  effectivePaymentDate: Date;   // PaymentDate or Today
  isLate: boolean;              // Whether payment is late
  monthsLate: number;           // Number of months (or parts) late
  lateFine: number;             // The calculated penalty
}

/**
 * Round to 2 decimal places
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Get the last day of a month
 */
function getLastDayOfMonth(year: number, month: number): Date {
  // Month is 0-indexed, so we go to the first day of next month and subtract 1 day
  return new Date(year, month + 1, 0);
}

/**
 * Calculate the due date for self-employed contributions
 * Due date = End of the month following the contribution month
 * 
 * Example: For contribution month January 2026 (2026-01),
 *          EndOfMonth = 2026-01-31
 *          DueDate = Last day of February 2026 = 2026-02-28
 */
export function calculateSelfContributorDueDate(contributionYear: number, contributionMonth: number): Date {
  // Get the month following the contribution month
  let dueYear = contributionYear;
  let dueMonth = contributionMonth + 1;
  
  if (dueMonth > 11) {
    dueMonth = 0;
    dueYear++;
  }
  
  // Return the last day of that month
  return getLastDayOfMonth(dueYear, dueMonth);
}

/**
 * Calculate calendar months late using month boundaries
 * MonthsLate = (Year(EffPay)-Year(DueDate))*12 + (Month(EffPay)-Month(DueDate))
 * If Day(EffPay) > Day(DueDate) then MonthsLate += 1
 * Minimum is 1 when late
 */
function calculateMonthsLate(dueDate: Date, effectivePaymentDate: Date): number {
  if (effectivePaymentDate <= dueDate) {
    return 0;
  }
  
  const dueYear = dueDate.getFullYear();
  const dueMonth = dueDate.getMonth();
  const dueDay = dueDate.getDate();
  
  const payYear = effectivePaymentDate.getFullYear();
  const payMonth = effectivePaymentDate.getMonth();
  const payDay = effectivePaymentDate.getDate();
  
  let monthsLate = (payYear - dueYear) * 12 + (payMonth - dueMonth);
  
  // If payment is on a later day within the month, add 1 for partial month
  if (payDay > dueDay) {
    monthsLate += 1;
  }
  
  // Ensure minimum of 1 when late
  return Math.max(1, monthsLate);
}

/**
 * Calculate self-employed/self-contributor late payment penalty
 */
export function calculateSelfContributorPenalty(inputs: SelfContributorPenaltyInputs): SelfContributorPenaltyResult {
  const {
    contributionMonth,
    socialSecurityDue,
    paymentDate,
    today
  } = inputs;
  
  // 1. Calculate due date
  const dueDate = calculateSelfContributorDueDate(contributionMonth.year, contributionMonth.month);
  
  // 2. Effective payment date
  const effectivePaymentDate = paymentDate || today;
  
  // 3. Is payment late?
  const isLate = effectivePaymentDate > dueDate;
  
  // 4. Months late (calendar-month logic)
  const monthsLate = calculateMonthsLate(dueDate, effectivePaymentDate);
  
  // 5. Calculate fine
  // Fine = 5% of outstanding amount for each month or part of a month late
  let lateFine = 0;
  if (socialSecurityDue > 0 && monthsLate > 0) {
    lateFine = round2(socialSecurityDue * 0.05 * monthsLate);
  }
  
  return {
    dueDate,
    effectivePaymentDate,
    isLate,
    monthsLate,
    lateFine
  };
}

/**
 * Get the number of Mondays in a given month
 */
export function getMondaysInMonth(year: number, month: number): number {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (date.getDay() === 1) { // Monday = 1
      count++;
    }
  }
  
  return count;
}

/**
 * Calculate weekly wage contribution (10% of weekly wage)
 */
export function calculateWeeklyContribution(weeklyWage: number): number {
  return round2(weeklyWage * 0.10);
}

/**
 * Calculate total wages based on selected weeks and weekly wage
 */
export function calculateTotalWagesFromWeeks(weeklyWage: number, selectedWeeks: boolean[]): number {
  const weeksSelected = selectedWeeks.filter(Boolean).length;
  return round2(weeklyWage * weeksSelected);
}

/**
 * Calculate social security contribution (10% of total wages)
 */
export function calculateSSContribution(totalWages: number): number {
  return round2(totalWages * 0.10);
}
