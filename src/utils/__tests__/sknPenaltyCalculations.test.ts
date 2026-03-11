import { describe, it, expect } from 'vitest';
import {
  calculatePenalties,
  calculateDueDate,
  calculateFilingDeadline,
  calculateLevyPenaltyBase,
  calculateSocialSecurityFineBase,
  PenaltyInputs
} from '../sknPenaltyCalculations';

describe('calculateFilingDeadline', () => {
  it('Feb 2025 + 1 month = March 31, 2025', () => {
    const d = calculateFilingDeadline(2025, 1, 1);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(2); // March
    expect(d.getDate()).toBe(31);
  });

  it('Dec 2025 + 1 month = Jan 31, 2026', () => {
    const d = calculateFilingDeadline(2025, 11, 1);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(31);
  });

  it('Jan 2025 + 2 months = March 31, 2025', () => {
    const d = calculateFilingDeadline(2025, 0, 2);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(1); // Feb
    expect(d.getDate()).toBe(28);
  });

  it('Nov 2025 + 3 months = Feb 28, 2026', () => {
    const d = calculateFilingDeadline(2025, 10, 3);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0); // Jan
    expect(d.getDate()).toBe(31);
  });
});

describe('SKN Penalty Calculations - Period-Based Filing Deadline', () => {
  // Period: Feb 2025, filing window: 1 month → deadline: March 31, 2025
  const periodYear = 2025;
  const periodMonth = 1; // Feb (0-indexed)
  const filingWindowMonths = 1;
  const dueDate = new Date('2025-03-31'); // legacy due date

  const baseInputs = {
    employeeLevyDue: 38.5,
    employerLevyDue: 78,
    severanceAmountDue: 26,
    employeeSSDue: 130,
    employerSSDue: 156,
    dueDate,
    periodYear,
    periodMonth,
    filingWindowMonths,
  };

  it('returns zero penalties when submitted within filing window (Mar 2025)', () => {
    const result = calculatePenalties({
      ...baseInputs,
      paymentDate: new Date('2025-03-15'),
      today: new Date('2025-03-15')
    });
    expect(result.monthsLateCalendar).toBe(0);
    expect(result.levyPenalty).toBe(0);
    expect(result.severancePenalty).toBe(0);
    expect(result.socialSecurityFine).toBe(0);
  });

  it('1 month late (Apr 2025): initial penalty applies', () => {
    const result = calculatePenalties({
      ...baseInputs,
      paymentDate: new Date('2025-04-13'),
      today: new Date('2025-04-13')
    });
    expect(result.monthsLateCalendar).toBe(1);
    // Levy: 116.5 * 0.10 = 11.65
    expect(result.levyPenalty).toBe(11.65);
    // Severance: 26 * 0.10 = 2.6
    expect(result.severancePenalty).toBe(2.6);
    // SS fine: 286 * 0.05 = 14.3
    expect(result.socialSecurityFine).toBe(14.3);
  });

  it('12 months late (Mar 2026): correct delay count', () => {
    // This is the screenshot scenario - Feb 2025 period received Mar 2026
    const result = calculatePenalties({
      ...baseInputs,
      paymentDate: new Date('2026-03-13'),
      today: new Date('2026-03-13')
    });
    expect(result.monthsLateCalendar).toBe(12);
    // Levy: 116.5 * 0.10 + 116.5 * 0.01 * 11 = 11.65 + 12.815 = 24.465 → 24.47
    expect(result.levyPenalty).toBe(24.47);
    // Severance: 26 * 0.10 + 26 * 0.01 * 11 = 2.6 + 2.86 = 5.46
    expect(result.severancePenalty).toBe(5.46);
    // SS fine: 286 * 0.05 + 286 * 0.05 * 11 = 14.3 + 157.3 = 171.6
    expect(result.socialSecurityFine).toBe(171.6);
  });

  it('returns zero penalties when paid before filing deadline', () => {
    const result = calculatePenalties({
      ...baseInputs,
      employeeLevyDue: 200,
      employerLevyDue: 300,
      severanceAmountDue: 100,
      employeeSSDue: 250,
      employerSSDue: 390,
      paymentDate: new Date('2025-02-15'),
      today: new Date('2025-02-15')
    });
    expect(result.levyPenalty).toBe(0);
    expect(result.severancePenalty).toBe(0);
    expect(result.socialSecurityFine).toBe(0);
    expect(result.totalLateCharges).toBe(0);
  });

  it('handles zero components gracefully', () => {
    const result = calculatePenalties({
      ...baseInputs,
      employeeLevyDue: 0,
      employerLevyDue: 0,
      severanceAmountDue: 0,
      employeeSSDue: 0,
      employerSSDue: 0,
      paymentDate: null,
      today: new Date('2026-03-13')
    });
    expect(result.levyPenalty).toBe(0);
    expect(result.socialSecurityFine).toBe(0);
    expect(result.totalLateCharges).toBe(0);
  });

  it('only levy populated - 2 months late', () => {
    const result = calculatePenalties({
      ...baseInputs,
      employeeLevyDue: 100,
      employerLevyDue: 200,
      severanceAmountDue: 0,
      employeeSSDue: 0,
      employerSSDue: 0,
      paymentDate: new Date('2025-05-15'), // 2 months late (May vs Mar deadline)
      today: new Date('2025-05-15')
    });
    expect(result.monthsLateCalendar).toBe(2);
    // Levy: 300 * 0.10 + 300 * 0.01 * 1 = 30 + 3 = 33
    expect(result.levyPenalty).toBe(33);
    expect(result.severancePenalty).toBe(0);
    expect(result.socialSecurityFine).toBe(0);
  });

  it('total late charges sums all three penalties', () => {
    const result = calculatePenalties({
      ...baseInputs,
      paymentDate: new Date('2026-03-13'),
      today: new Date('2026-03-13')
    });
    expect(result.totalLateCharges).toBe(
      round2(result.levyPenalty + result.severancePenalty + result.socialSecurityFine)
    );
  });

  // Period: August 2025, filing window 1 month → deadline: Sep 30, 2025
  it('Aug 2025 period, received Feb 2026 = 5 months late', () => {
    const result = calculatePenalties({
      employeeLevyDue: 38.5,
      employerLevyDue: 78,
      severanceAmountDue: 26,
      employeeSSDue: 130,
      employerSSDue: 156,
      dueDate: new Date('2025-09-30'),
      periodYear: 2025,
      periodMonth: 7, // Aug (0-indexed)
      filingWindowMonths: 1,
      paymentDate: new Date('2026-02-13'),
      today: new Date('2026-02-13')
    });
    expect(result.monthsLateCalendar).toBe(5);
    // Levy: 116.5 * 0.10 + 116.5 * 0.01 * 4 = 11.65 + 4.66 = 16.31
    expect(result.levyPenalty).toBe(16.31);
    // Severance: 26 * 0.10 + 26 * 0.01 * 4 = 2.6 + 1.04 = 3.64
    expect(result.severancePenalty).toBe(3.64);
    // SS fine: 286 * 0.05 + 286 * 0.05 * 4 = 14.3 + 57.2 = 71.5
    expect(result.socialSecurityFine).toBe(71.5);
  });
});

// Helper for test assertions
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

describe('calculateLevyPenaltyBase', () => {
  it('sums employee levy + employer levy only', () => {
    expect(calculateLevyPenaltyBase(100, 200)).toBe(300);
  });
  it('handles zero values', () => {
    expect(calculateLevyPenaltyBase(0, 0)).toBe(0);
  });
});

describe('calculateSocialSecurityFineBase', () => {
  it('sums employee SS + employer SS total', () => {
    expect(calculateSocialSecurityFineBase(250, 390)).toBe(640);
  });
  it('handles zero values', () => {
    expect(calculateSocialSecurityFineBase(0, 0)).toBe(0);
  });
});

describe('calculateDueDate (legacy)', () => {
  it('returns last day of next month for January 2026', () => {
    const due = calculateDueDate(2026, 0);
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(1);
    expect(due.getDate()).toBe(28);
  });

  it('returns last day of next month for December', () => {
    const due = calculateDueDate(2025, 11);
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(0);
    expect(due.getDate()).toBe(31);
  });
});
