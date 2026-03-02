// Holiday Pay Policy Types for C3 Configuration

export type HolidayPolicyType = 'with_dates' | 'without_dates';
export type CalculationMethod = 'merge' | 'separate';
export type ExceptionType = 'onetime' | 'recurring';

export interface BonusDistribution {
  weekly: { w1: boolean; w2: boolean; w3: boolean; w4: boolean; divide: boolean };
  biweekly: { b1: boolean; b2: boolean; divide: boolean };
  semimonthly: { s1: boolean; s2: boolean; divide: boolean };
  monthly: { m1: boolean };
}

export interface HolidayPayPolicyDefault {
  id: string;
  date_from: string;
  date_to: string | null;
  policy_type: HolidayPolicyType;
  distribution_enabled: boolean;

  // Levy rules
  levy_include: boolean;
  levy_calculation_method: CalculationMethod;
  levy_calc_flat_enabled: boolean;
  levy_calc_flat_percentage: number | null;
  levy_calc_slab_enabled: boolean;
  levy_distribution: BonusDistribution;

  // SSC rules
  ssc_include: boolean;
  ssc_contrib_employee: boolean;
  ssc_contrib_employer: boolean;
  ssc_contrib_eib: boolean;

  // Common
  include_in_severance: boolean;
  min_holiday_amount: number | null;
  max_holiday_amount: number | null;
  is_active: boolean;
  created_by: string | null;
  created_on: string;
  modified_by: string | null;
  modified_on: string;
}

export interface HolidayPayPolicyException {
  id: string;
  date_from: string;
  date_to: string | null;
  exception_type: ExceptionType;
  exception_month: number;
  year_from: number;
  year_to: number | null;
  policy_type: HolidayPolicyType;
  override_default: boolean;

  // Levy rules (nullable for non-override)
  levy_include: boolean | null;
  levy_calculation_method: CalculationMethod | null;
  levy_calc_flat_enabled: boolean | null;
  levy_calc_flat_percentage: number | null;
  levy_calc_slab_enabled: boolean | null;
  levy_distribution: BonusDistribution | null;

  // SSC rules (nullable for non-override)
  ssc_include: boolean | null;
  ssc_contrib_employee: boolean | null;
  ssc_contrib_employer: boolean | null;
  ssc_contrib_eib: boolean | null;

  // Common
  distribution_enabled: boolean | null;
  include_in_severance: boolean | null;
  min_holiday_amount: number | null;
  max_holiday_amount: number | null;
  is_active: boolean;
  description: string | null;
  created_by: string | null;
  created_on: string;
  modified_by: string | null;
  modified_on: string;
}

export const DEFAULT_DISTRIBUTION: BonusDistribution = {
  weekly: { w1: false, w2: false, w3: false, w4: false, divide: false },
  biweekly: { b1: false, b2: false, divide: true },
  semimonthly: { s1: false, s2: false, divide: false },
  monthly: { m1: true },
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
