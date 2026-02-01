// C3 Calculation Configuration Types

export type ConfigType = 'rate' | 'amount' | 'age' | 'days' | 'weeks' | 'months';
export type ConfigCategory = 'social_security' | 'levy' | 'severance' | 'penalty' | 'voluntary_contributor';

export interface C3CalculationConfig {
  id: string;
  config_key: string;
  config_value: number;
  config_type: ConfigType;
  category: ConfigCategory;
  display_name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface C3CalculationConfigAudit {
  id: string;
  config_id: string;
  config_key: string;
  old_value: number | null;
  new_value: number | null;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
  reason: string | null;
}

// Grouped configuration for display
export interface ConfigCategoryGroup {
  category: ConfigCategory;
  displayName: string;
  description: string;
  configs: C3CalculationConfig[];
}

// Category display info
export const CATEGORY_INFO: Record<ConfigCategory, { displayName: string; description: string; icon: string }> = {
  social_security: {
    displayName: 'Social Security',
    description: 'Configure age limits, contribution rates, and caps for Social Security calculations',
    icon: 'Shield'
  },
  levy: {
    displayName: 'Levy (Housing & Social Dev.)',
    description: 'Configure thresholds, brackets, and rates for Levy calculations',
    icon: 'Building2'
  },
  severance: {
    displayName: 'Severance Contributions',
    description: 'Configure employer severance contribution rates',
    icon: 'Briefcase'
  },
  penalty: {
    displayName: 'Late Payment Penalties',
    description: 'Configure penalty rates and calculation parameters for late payments',
    icon: 'AlertTriangle'
  },
  voluntary_contributor: {
    displayName: 'Voluntary Contributor',
    description: 'Configure eligibility rules, contribution rates, and grace periods for voluntary contributors',
    icon: 'UserPlus'
  }
};

// Config type display info
export const CONFIG_TYPE_INFO: Record<ConfigType, { suffix: string; multiplier: number; decimals: number }> = {
  rate: { suffix: '%', multiplier: 100, decimals: 2 },
  amount: { suffix: 'XCD', multiplier: 1, decimals: 2 },
  age: { suffix: 'years', multiplier: 1, decimals: 0 },
  days: { suffix: 'days', multiplier: 1, decimals: 0 },
  weeks: { suffix: 'weeks', multiplier: 1, decimals: 0 },
  months: { suffix: 'months', multiplier: 1, decimals: 0 }
};
