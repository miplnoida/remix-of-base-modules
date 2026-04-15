// ── Calculation Engine Constants ──
// Shared catalogs for the policy-driven Calculation Rule model.

export interface CalculationFamilyDef {
  value: string;
  label: string;
  description: string;
  defaultPattern: string;
  defaultFundType: string;
  defaultAppliesTo: string;
}

export const CALCULATION_FAMILIES: CalculationFamilyDef[] = [
  { value: 'ss_fine', label: 'SS Fine', description: 'Social Security fine based on C3 config initial + subsequent rates', defaultPattern: 'initial_subsequent', defaultFundType: 'SS', defaultAppliesTo: 'fine' },
  { value: 'levy_penalty', label: 'Levy Penalty', description: 'Employment Levy penalty with initial + subsequent rates from C3 config', defaultPattern: 'initial_subsequent', defaultFundType: 'LV', defaultAppliesTo: 'penalty' },
  { value: 'severance_penalty', label: 'Severance Penalty', description: 'Severance Fund penalty based on C3 configured rates', defaultPattern: 'initial_subsequent', defaultFundType: 'SV', defaultAppliesTo: 'penalty' },
  { value: 'late_payment', label: 'Late Payment Penalty', description: 'General penalty for payments received after the due date', defaultPattern: 'initial_subsequent', defaultFundType: '', defaultAppliesTo: 'penalty' },
  { value: 'interest', label: 'Interest Accrual', description: 'Simple interest on outstanding balances over time', defaultPattern: 'fixed', defaultFundType: '', defaultAppliesTo: 'interest' },
  { value: 'estimated_assessment', label: 'Estimated Assessment', description: 'Assessment when employer fails to file — uses historical averages', defaultPattern: 'estimate', defaultFundType: '', defaultAppliesTo: 'estimate' },
  { value: 'debt_base', label: 'Debt Base', description: 'Total outstanding debt calculation from ledger balances', defaultPattern: 'rollup', defaultFundType: '', defaultAppliesTo: 'penalty' },
  { value: 'under_declaration', label: 'Under-Declaration Surcharge', description: 'Charges for confirmed wage under-reporting during audits', defaultPattern: 'fixed_variable', defaultFundType: '', defaultAppliesTo: 'surcharge' },
  { value: 'arrangement_breach', label: 'Arrangement Breach', description: 'Penalties for defaulted payment arrangements', defaultPattern: 'fixed', defaultFundType: '', defaultAppliesTo: 'penalty' },
  { value: 'case_rollup', label: 'Case Roll-Up', description: 'Aggregate total exposure across all violations in a case', defaultPattern: 'rollup', defaultFundType: '', defaultAppliesTo: 'penalty' },
  { value: 'custom', label: 'Custom', description: 'Custom calculation not covered by standard families', defaultPattern: 'fixed', defaultFundType: '', defaultAppliesTo: 'penalty' },
];

export interface CalcPatternDef {
  value: string;
  label: string;
  description: string;
  templateFormula: string;
}

export const CALCULATION_PATTERNS: CalcPatternDef[] = [
  { value: 'fixed', label: 'Fixed Rate', description: 'Base × Rate', templateFormula: '{base} × {rate}' },
  { value: 'fixed_variable', label: 'Fixed + Variable', description: 'Base × Rate + Additional Component', templateFormula: '{base} × {rate} + {variable}' },
  { value: 'initial_subsequent', label: 'Initial + Subsequent', description: 'Month 1 rate, then subsequent rate × additional months', templateFormula: '{base} × {initial_rate} + {base} × {subsequent_rate} × {additional_months}' },
  { value: 'tiered', label: 'Tiered', description: 'Different rates applied at defined breakpoints', templateFormula: 'Tier 1: {base} × {rate_1}, Tier 2: {base} × {rate_2}' },
  { value: 'capped', label: 'Capped', description: 'Calculation with a maximum cap applied', templateFormula: 'MIN({base} × {rate}, {cap})' },
  { value: 'estimate', label: 'Estimate', description: 'Average of historical data multiplied by an assessment factor', templateFormula: 'AVG({last_periods}) × {factor}' },
  { value: 'rollup', label: 'Roll-Up', description: 'Summation across multiple related records', templateFormula: 'SUM({component_totals})' },
];

export interface BaseMetricDef {
  value: string;
  label: string;
  group: string;
  description: string;
  sourceHint: string;
}

export const BASE_METRICS: BaseMetricDef[] = [
  { value: 'shortfall', label: 'Shortfall', group: 'Financial', description: 'Difference between expected and actual contribution', sourceHint: 'Derived from C3 reported vs calculated' },
  { value: 'outstanding_balance', label: 'Outstanding Balance', group: 'Financial', description: 'Current unpaid amount on the ledger', sourceHint: 'ce_employer_financial_ledger' },
  { value: 'ss_contribution', label: 'SS Contribution', group: 'Financial', description: 'Social Security contribution amount', sourceHint: 'cn_c3_reported.emp_ss_amt_calc' },
  { value: 'levy_amount', label: 'Levy Amount', group: 'Financial', description: 'Employment Levy amount', sourceHint: 'cn_c3_reported.emp_levy_amt_calc' },
  { value: 'severance_amount', label: 'Severance Amount', group: 'Financial', description: 'Severance Fund amount', sourceHint: 'cn_c3_reported.emp_pe_amt_calc' },
  { value: 'total_wages', label: 'Total Wages', group: 'Financial', description: 'Total reported wages for the period', sourceHint: 'cn_c3_reported.total_wages' },
  { value: 'wage_difference', label: 'Wage Difference', group: 'Financial', description: 'Difference between reported and audited wages', sourceHint: 'Derived from audit findings' },
  { value: 'total_exposure', label: 'Total Exposure', group: 'Derived', description: 'Sum of all outstanding amounts including penalties', sourceHint: 'Derived aggregation' },
  { value: 'avg_last_3_periods', label: 'Avg Last 3 Periods', group: 'Derived', description: 'Average of last 3 known C3 totals', sourceHint: 'cn_c3_reported (last 3)' },
];

export interface RateSourceDef {
  value: string;
  label: string;
  type: 'c3_config' | 'compliance' | 'fixed' | 'derived';
  description: string;
  configKey?: string;
}

export const RATE_SOURCES: RateSourceDef[] = [
  { value: 'ss_fine_initial_rate', label: 'SS Fine Initial Rate', type: 'c3_config', description: 'First month penalty rate from C3 config', configKey: 'ss_fine_initial_rate' },
  { value: 'ss_fine_subsequent_rate', label: 'SS Fine Subsequent Rate', type: 'c3_config', description: 'Additional month penalty rate from C3 config', configKey: 'ss_fine_subsequent_rate' },
  { value: 'levy_penalty_initial_rate', label: 'Levy Penalty Initial Rate', type: 'c3_config', description: 'First month levy penalty rate', configKey: 'levy_penalty_initial_rate' },
  { value: 'levy_penalty_subsequent_rate', label: 'Levy Penalty Subsequent Rate', type: 'c3_config', description: 'Additional levy penalty rate', configKey: 'levy_penalty_subsequent_rate' },
  { value: 'severance_penalty_initial_rate', label: 'Severance Penalty Initial Rate', type: 'c3_config', description: 'First month severance penalty rate', configKey: 'severance_penalty_initial_rate' },
  { value: 'severance_penalty_subsequent_rate', label: 'Severance Penalty Subsequent Rate', type: 'c3_config', description: 'Additional severance penalty rate', configKey: 'severance_penalty_subsequent_rate' },
  { value: 'interest_rate_percent', label: 'Interest Rate', type: 'compliance', description: 'Annual interest rate configured in compliance policies' },
  { value: 'penalty_rate_percent', label: 'General Penalty Rate', type: 'compliance', description: 'General penalty rate from compliance policies' },
  { value: 'estimated_assessment_multiplier', label: 'Est. Assessment Factor', type: 'compliance', description: 'Multiplier for estimated assessments (e.g. 1.5x)', configKey: 'estimated_assessment_multiplier' },
  { value: 'custom_fixed_rate', label: 'Fixed Override Rate', type: 'fixed', description: 'Manually entered fixed rate for this rule only' },
];

export const APPLIES_TO_OPTIONS = [
  { value: 'penalty', label: 'Penalty' },
  { value: 'interest', label: 'Interest' },
  { value: 'fine', label: 'Fine' },
  { value: 'estimate', label: 'Estimated Assessment' },
  { value: 'surcharge', label: 'Surcharge' },
  { value: 'waiver', label: 'Waiver' },
];

export const FUND_TYPES = [
  { value: '', label: 'All Funds' },
  { value: 'SS', label: 'Social Security (SS)' },
  { value: 'LV', label: 'Employment Levy (LV)' },
  { value: 'SV', label: 'Severance Fund (SV)' },
  { value: 'EI', label: 'Employment Injury (EI)' },
];

export const SOURCE_CONFIG_OPTIONS = [
  { value: 'c3_config_details', label: 'C3 Configuration', description: 'Central rates from C3 Config' },
  { value: 'ce_compliance_policies', label: 'Compliance Policies', description: 'Enforcement-specific thresholds' },
  { value: 'cn_c3_reported', label: 'C3 Reported Data', description: 'Actual submission data' },
  { value: 'manual', label: 'Manual Entry', description: 'Manually specified values' },
];

// Generate a formula preview from family + pattern + selected base/rate
export function generateFormulaPreview(
  family: string,
  pattern: string,
  baseMetric: string,
  rateSource: string,
): string {
  const base = BASE_METRICS.find(m => m.value === baseMetric)?.label || baseMetric || '{base}';
  const rate = RATE_SOURCES.find(r => r.value === rateSource)?.label || rateSource || '{rate}';

  switch (pattern) {
    case 'fixed':
      return `${base} × ${rate}`;
    case 'fixed_variable':
      return `${base} × ${rate} + {variable}`;
    case 'initial_subsequent': {
      const subRate = rateSource.replace('initial', 'subsequent');
      const subLabel = RATE_SOURCES.find(r => r.value === subRate)?.label || 'Subsequent Rate';
      return `${base} × ${rate} (month 1) + ${base} × ${subLabel} × additional_months`;
    }
    case 'tiered':
      return `Tiered: ${base} × rate_per_tier`;
    case 'capped':
      return `MIN(${base} × ${rate}, cap)`;
    case 'estimate':
      return `AVG(last_3_periods) × ${rate}`;
    case 'rollup':
      return `SUM(all ${base} across linked records)`;
    default:
      return `${base} × ${rate}`;
  }
}
