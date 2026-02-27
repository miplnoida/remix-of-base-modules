import { describe, it, expect } from 'vitest';
import {
  calculatePenalties,
  calculateDueDate,
  calculateLevyPenaltyBase,
  calculateSocialSecurityFineBase,
  PenaltyInputs
} from '../sknPenaltyCalculations';

describe('SKN Penalty Calculations - Calendar Month Based', () => {
  // C3 period: August 2025 → due month: September 2025
  const dueDate = new Date('2025-09-30'); // last day of Sep 2025

  it('returns zero penalties when submitted in due month (Sep 2025)', () => {
    const result = calculatePenalties({
      employeeLevyDue: 38.5,
      employerLevyDue: 78,
      severanceAmountDue: 26,
      employeeSSDue: 130,
      employerSSDue: 156, // 130 SS + 26 EIB
      dueDate,
      paymentDate: new Date('2025-09-15'),
      today: new Date('2025-09-15')
    });
    expect(result.monthsLateCalendar).toBe(0);
    expect(result.levyPenalty).toBe(0);
    expect(result.severancePenalty).toBe(0);
    expect(result.socialSecurityFine).toBe(0);
  });

  it('1 month late (Oct 2025): levy penalty = 10% of total levy', () => {
    const result = calculatePenalties({
      employeeLevyDue: 38.5,
      employerLevyDue: 78,
      severanceAmountDue: 26,
      employeeSSDue: 130,
      employerSSDue: 156,
      dueDate,
      paymentDate: new Date('2025-10-13'),
      today: new Date('2025-10-13')
    });
    expect(result.monthsLateCalendar).toBe(1);
    // Levy: 116.5 * 0.10 = 11.65
    expect(result.levyPenalty).toBe(11.65);
    // Severance: 26 * 0.10 = 2.6
    expect(result.severancePenalty).toBe(2.6);
    // SS fine: 286 * 0.05 = 14.3
    expect(result.socialSecurityFine).toBe(14.3);
  });

  it('5 months late (Feb 2026): levy penalty = 10% + 4*1% = 16.31', () => {
    // This is the user's exact validation case
    const result = calculatePenalties({
      employeeLevyDue: 38.5,
      employerLevyDue: 78,
      severanceAmountDue: 26,
      employeeSSDue: 130,
      employerSSDue: 156,
      dueDate,
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

  it('returns zero penalties when not late (paid before due date)', () => {
    const result = calculatePenalties({
      employeeLevyDue: 200,
      employerLevyDue: 300,
      severanceAmountDue: 100,
      employeeSSDue: 250,
      employerSSDue: 390,
      dueDate,
      paymentDate: new Date('2025-08-15'),
      today: new Date('2025-08-15')
    });
    expect(result.levyPenalty).toBe(0);
    expect(result.severancePenalty).toBe(0);
    expect(result.socialSecurityFine).toBe(0);
    expect(result.totalLateCharges).toBe(0);
  });

  it('handles zero components gracefully', () => {
    const result = calculatePenalties({
      employeeLevyDue: 0,
      employerLevyDue: 0,
      severanceAmountDue: 0,
      employeeSSDue: 0,
      employerSSDue: 0,
      dueDate,
      paymentDate: null,
      today: new Date('2026-02-13')
    });
    expect(result.levyPenalty).toBe(0);
    expect(result.severancePenalty).toBe(0);
    expect(result.socialSecurityFine).toBe(0);
    expect(result.totalLateCharges).toBe(0);
  });

  it('only levy populated - partial zero components', () => {
    const result = calculatePenalties({
      employeeLevyDue: 100,
      employerLevyDue: 200,
      severanceAmountDue: 0,
      employeeSSDue: 0,
      employerSSDue: 0,
      dueDate,
      paymentDate: new Date('2025-11-15'), // 2 months late
      today: new Date('2025-11-15')
    });
    expect(result.monthsLateCalendar).toBe(2);
    // Levy: 300 * 0.10 + 300 * 0.01 * 1 = 30 + 3 = 33
    expect(result.levyPenalty).toBe(33);
    expect(result.severancePenalty).toBe(0);
    expect(result.socialSecurityFine).toBe(0);
  });

  it('total late charges sums all three penalties', () => {
    const result = calculatePenalties({
      employeeLevyDue: 38.5,
      employerLevyDue: 78,
      severanceAmountDue: 26,
      employeeSSDue: 130,
      employerSSDue: 156,
      dueDate,
      paymentDate: new Date('2026-02-13'),
      today: new Date('2026-02-13')
    });
    expect(result.totalLateCharges).toBe(
      result.levyPenalty + result.severancePenalty + result.socialSecurityFine
    );
  });

  it('screenshot scenario: levy=38.5+78, sev=26, ss=130+156, Feb 2026', () => {
    const screenshotResult = calculatePenalties({
      employeeLevyDue: 38.5,
      employerLevyDue: 78,
      severanceAmountDue: 26,
      employeeSSDue: 130,
      employerSSDue: 156,
      dueDate: new Date('2025-09-30'),
      paymentDate: new Date('2026-02-13'),
      today: new Date('2026-02-13')
    });
    expect(screenshotResult.monthsLateCalendar).toBe(5);
    expect(screenshotResult.levyPenalty).toBe(16.31);
    expect(screenshotResult.severancePenalty).toBe(3.64);
    expect(screenshotResult.socialSecurityFine).toBe(71.5);
    expect(screenshotResult.totalLateCharges).toBe(91.45);
  });
});

describe('calculateLevyPenaltyBase', () => {
  it('sums employee levy + employer levy only (no severance)', () => {
    expect(calculateLevyPenaltyBase(100, 200)).toBe(300);
  });

  it('handles zero values', () => {
    expect(calculateLevyPenaltyBase(0, 0)).toBe(0);
  });
});

describe('calculateSocialSecurityFineBase', () => {
  it('sums employee SS + employer SS total (includes EIB)', () => {
    expect(calculateSocialSecurityFineBase(250, 390)).toBe(640);
  });

  it('handles zero values', () => {
    expect(calculateSocialSecurityFineBase(0, 0)).toBe(0);
  });
});

describe('calculateDueDate', () => {
  it('returns last day of next month for January 2026', () => {
    const due = calculateDueDate(2026, 0); // January
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(1); // February
    expect(due.getDate()).toBe(28);
  });

  it('returns last day of next month for December', () => {
    const due = calculateDueDate(2025, 11); // December
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(0); // January
    expect(due.getDate()).toBe(31);
  });
});
