// Income Code Policy Types for C3 Configuration

export type DateEntryMode = 'dates_mandatory' | 'dates_optional' | 'no_dates';
export type CalculationMethod = 'merge' | 'separate';
export type ExceptionType = 'onetime' | 'recurring';
export type PolicyType = 'with_dates' | 'without_dates';

export interface BonusDistribution {
  weekly: { w1: boolean; w2: boolean; w3: boolean; w4: boolean; divide: boolean };
  biweekly: { b1: boolean; b2: boolean; divide: boolean };
  semimonthly: { s1: boolean; s2: boolean; divide: boolean };
  monthly: { m1: boolean };
}

export interface IncomeCode {
  id: string;
  code: string;
  description: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface IncomeCodePolicyDefault {
  id: string;
  income_code_id: string;
  date_entry_mode: DateEntryMode;
  date_from: string;
  date_to: string | null;

  // Holiday-style fields
  policy_type: PolicyType;
  distribution_enabled: boolean;
  levy_include: boolean;
  levy_calculation_method: CalculationMethod;
  levy_calc_flat_enabled: boolean;
  levy_calc_flat_percentage: number | null;
  levy_calc_slab_enabled: boolean;
  levy_distribution: BonusDistribution;
  ssc_include: boolean;
  ssc_contrib_employee: boolean;
  ssc_contrib_employer: boolean;
  ssc_contrib_eib: boolean;

  // Bonus-style fields
  contrib_employee: boolean;
  contrib_employer: boolean;
  contrib_eir: boolean;
  contrib_severance: boolean;
  include_in_levy: boolean;
  include_in_severance: boolean;
  calculation_method: CalculationMethod;
  calc_flat_enabled: boolean;
  calc_flat_percentage: number | null;
  calc_slab_enabled: boolean;
  distribution: BonusDistribution;

  min_amount: number | null;
  max_amount: number | null;
  is_active: boolean;
  created_by: string | null;
  created_on: string;
  modified_by: string | null;
  modified_on: string;
}

export interface IncomeCodePolicyException {
  id: string;
  income_code_id: string;
  date_entry_mode: DateEntryMode;
  date_from: string;
  date_to: string | null;
  exception_type: ExceptionType;
  exception_month: number;
  year_from: number;
  year_to: number | null;
  policy_type: PolicyType;
  override_default: boolean;

  // Holiday-style overrides
  distribution_enabled: boolean | null;
  levy_include: boolean | null;
  levy_calculation_method: CalculationMethod | null;
  levy_calc_flat_enabled: boolean | null;
  levy_calc_flat_percentage: number | null;
  levy_calc_slab_enabled: boolean | null;
  levy_distribution: BonusDistribution | null;
  ssc_include: boolean | null;
  ssc_contrib_employee: boolean | null;
  ssc_contrib_employer: boolean | null;
  ssc_contrib_eib: boolean | null;

  // Bonus-style overrides
  include_in_levy: boolean | null;
  include_in_severance: boolean | null;
  calculation_method: CalculationMethod | null;
  calc_flat_enabled: boolean | null;
  calc_flat_percentage: number | null;
  calc_slab_enabled: boolean | null;
  distribution: BonusDistribution | null;
  contrib_employee: boolean | null;
  contrib_employer: boolean | null;
  contrib_eir: boolean | null;
  contrib_severance: boolean | null;

  min_amount: number | null;
  max_amount: number | null;
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

export const DATE_ENTRY_MODE_LABELS: Record<DateEntryMode, string> = {
  dates_mandatory: 'Dates Mandatory',
  dates_optional: 'Dates Optional',
  no_dates: 'No Dates',
};
