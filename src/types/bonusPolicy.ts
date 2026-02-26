// Bonus Policy Types for C3 Configuration

export type CalculationMethod = 'merge' | 'separate';


export interface BonusDistribution {
  weekly: { w1: boolean; w2: boolean; w3: boolean; w4: boolean; divide: boolean };
  biweekly: { b1: boolean; b2: boolean; divide: boolean };
  semimonthly: { s1: boolean; s2: boolean; divide: boolean };
  monthly: { m1: boolean };
}

export interface BonusPolicyDefault {
  id: string;
  date_from: string;
  date_to: string | null;
  include_in_levy: boolean;
  include_in_severance: boolean;
  calculation_method: CalculationMethod;
  calc_flat_enabled: boolean;
  calc_flat_percentage: number | null;
  calc_slab_enabled: boolean;
  distribution: BonusDistribution;
  min_bonus_amount: number | null;
  max_bonus_amount: number | null;
  contrib_employee: boolean;
  contrib_employer: boolean;
  contrib_eir: boolean;
  contrib_severance: boolean;
  is_active: boolean;
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
