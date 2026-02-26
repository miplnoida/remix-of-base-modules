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

  it('levy penalty base includes employee levy + employer levy + severance', () => {
    const result = calculatePenalties(baseInputs);
    // Base = 200 + 300 + 100 = 600
    // 46 days late → additional30DayPeriods = ceil((46-30)/30) = 1
    // Penalty = 600 * 0.10 + 600 * 0.01 * 1 = 60 + 6 = 66
    expect(result.levyPenalty).toBe(66);
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
    expect(result.totalLateCharges).toBe(66 + 11 + 64);
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
    // Levy base = 100 + 200 + 0 = 300
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
    // Levy base = 0 + 0 + 500 = 500
    // Levy penalty = 500 * 0.10 + 500 * 0.01 * 1 = 50 + 5 = 55
    expect(result.levyPenalty).toBe(55);
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
    // Levy base = 600, penalty = 600 * 0.10 = 60
    expect(result.levyPenalty).toBe(60);
    expect(result.additional30DayPeriods).toBe(0);
  });
});

describe('calculateLevyPenaltyBase', () => {
  it('sums employee levy + employer levy + severance', () => {
    expect(calculateLevyPenaltyBase(100, 200, 50)).toBe(350);
  });

  it('handles zero values', () => {
    expect(calculateLevyPenaltyBase(0, 0, 0)).toBe(0);
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
