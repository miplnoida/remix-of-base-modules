import { describe, it, expect } from 'vitest';
import {
  calculatePenalties,
  calculateDueDate,
  calculateLevyPenaltyBase,
  calculateSocialSecurityFineBase,
  PenaltyInputs
} from '../sknPenaltyCalculations';

describe('SKN Penalty Calculations - Corrected Base Amounts', () => {
  const dueDate = new Date('2026-02-28');
  const today = new Date('2026-04-15'); // 46 days late

  const baseInputs: PenaltyInputs = {
    employeeLevyDue: 200,
    employerLevyDue: 300,
    severanceAmountDue: 100,
    employeeSSDue: 250,
    employerSSDue: 390, // includes EIB
    dueDate,
    paymentDate: null,
    today
  };

  it('levy penalty base uses employee levy + employer levy ONLY (no severance)', () => {
    const result = calculatePenalties(baseInputs);
    // Base = 200 + 300 = 500 (severance excluded)
    // 46 days late → additional30DayPeriods = ceil((46-30)/30) = 1
    // Penalty = 500 * 0.10 + 500 * 0.01 * 1 = 50 + 5 = 55
    expect(result.levyPenalty).toBe(55);
  });

  it('severance penalty base uses severance amount only', () => {
    const result = calculatePenalties(baseInputs);
    // Base = 100
    // Penalty = 100 * 0.10 + 100 * 0.01 * 1 = 10 + 1 = 11
    expect(result.severancePenalty).toBe(11);
  });

  it('social security fine base includes employee SS + employer SS (with EIB)', () => {
    const result = calculatePenalties(baseInputs);
    // Base = 250 + 390 = 640
    // 46 days late → monthsLate = ceil(46/30) = 2
    // Fine = 640 * 0.05 * 2 = 64
    expect(result.socialSecurityFine).toBe(64);
  });

  it('total late charges sums all three penalties', () => {
    const result = calculatePenalties(baseInputs);
    // 55 + 11 + 64 = 130
    expect(result.totalLateCharges).toBe(55 + 11 + 64);
  });

  it('returns zero penalties when not late', () => {
    const result = calculatePenalties({
      ...baseInputs,
      paymentDate: new Date('2026-02-15') // before due date
    });
    expect(result.levyPenalty).toBe(0);
    expect(result.severancePenalty).toBe(0);
    expect(result.socialSecurityFine).toBe(0);
    expect(result.totalLateCharges).toBe(0);
  });

  it('handles null/zero components gracefully', () => {
    const result = calculatePenalties({
      employeeLevyDue: 0,
      employerLevyDue: 0,
      severanceAmountDue: 0,
      employeeSSDue: 0,
      employerSSDue: 0,
      dueDate,
      paymentDate: null,
      today
    });
    expect(result.levyPenalty).toBe(0);
    expect(result.severancePenalty).toBe(0);
    expect(result.socialSecurityFine).toBe(0);
    expect(result.totalLateCharges).toBe(0);
  });

  it('handles partial zero components - only levy populated', () => {
    const result = calculatePenalties({
      employeeLevyDue: 100,
      employerLevyDue: 200,
      severanceAmountDue: 0,
      employeeSSDue: 0,
      employerSSDue: 0,
      dueDate,
      paymentDate: null,
      today
    });
    // Levy base = 100 + 200 = 300 (no severance)
    // Penalty = 300 * 0.10 + 300 * 0.01 * 1 = 30 + 3 = 33
    expect(result.levyPenalty).toBe(33);
    expect(result.severancePenalty).toBe(0);
    expect(result.socialSecurityFine).toBe(0);
  });

  it('handles partial zero - only severance populated', () => {
    const result = calculatePenalties({
      employeeLevyDue: 0,
      employerLevyDue: 0,
      severanceAmountDue: 500,
      employeeSSDue: 0,
      employerSSDue: 0,
      dueDate,
      paymentDate: null,
      today
    });
    // Levy base = 0 + 0 = 0 (severance NOT included in levy penalty)
    expect(result.levyPenalty).toBe(0);
    // Severance penalty base = 500
    // Severance penalty = 500 * 0.10 + 500 * 0.01 * 1 = 50 + 5 = 55
    expect(result.severancePenalty).toBe(55);
  });

  it('handles exactly 30 days late (no additional periods)', () => {
    const lateDate = new Date(dueDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const result = calculatePenalties({
      ...baseInputs,
      paymentDate: lateDate
    });
    // 30 days late → additional30DayPeriods = 0
    // Levy base = 200 + 300 = 500, penalty = 500 * 0.10 = 50
    expect(result.levyPenalty).toBe(50);
    expect(result.additional30DayPeriods).toBe(0);
  });

  it('screenshot scenario: levy=143.5+123, sev=41, ss=205+246', () => {
    // Matches the user's screenshot data
    const screenshotResult = calculatePenalties({
      employeeLevyDue: 143.5,
      employerLevyDue: 123,
      severanceAmountDue: 41,
      employeeSSDue: 205,
      employerSSDue: 246, // employer_ss(205) + eib(41)
      dueDate: new Date('2025-10-31'),
      paymentDate: new Date('2026-03-13'), // 133 days late
      today: new Date('2026-03-13')
    });
    // Verify bases are correct (no severance in levy base)
    expect(screenshotResult.daysLate).toBe(133);
    // additional30DayPeriods = ceil((133-30)/30) = ceil(3.43) = 4
    expect(screenshotResult.additional30DayPeriods).toBe(4);
    // monthsLate = ceil(133/30) = 5
    expect(screenshotResult.monthsLateForSS).toBe(5);
    
    // Levy penalty base = 143.5 + 123 = 266.5
    // Levy penalty = 266.5 * 0.10 + 266.5 * 0.01 * 4 = 26.65 + 10.66 = 37.31
    expect(screenshotResult.levyPenalty).toBe(37.31);
    
    // Severance penalty base = 41
    // Severance penalty = 41 * 0.10 + 41 * 0.01 * 4 = 4.1 + 1.64 = 5.74
    expect(screenshotResult.severancePenalty).toBe(5.74);
    
    // SS fine base = 205 + 246 = 451
    // SS fine = 451 * 0.05 * 5 = 112.75
    expect(screenshotResult.socialSecurityFine).toBe(112.75);
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
