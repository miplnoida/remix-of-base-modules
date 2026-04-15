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

// ── Multi-Factor Formula Builder Types ──

export type FactorType = 'base_metric' | 'rate_source' | 'derived_metric' | 'constant' | 'function';
export type TermOperator = 'add' | 'subtract';
export type FactorJoinOp = 'multiply' | 'divide';

export interface FormulaFactor {
  id: string;
  type: FactorType;
  value: string;       // key from catalog, or numeric string for constants
  label?: string;      // display label (resolved from catalog)
  joinOp: FactorJoinOp;
}

export interface FormulaTerm {
  id: string;
  operator: TermOperator | null; // null for the first term
  factors: FormulaFactor[];
  functionWrapper?: string; // e.g. 'MIN', 'MAX', 'AVG', 'SUM'
}

// Derived Metrics (usable as factors in formulas)
export interface DerivedMetricDef {
  value: string;
  label: string;
  description: string;
  sourceHint: string;
}

export const DERIVED_METRICS: DerivedMetricDef[] = [
  { value: 'additional_months', label: 'Additional Months', description: 'Months beyond first month of lateness', sourceHint: 'Computed from due date vs current date' },
  { value: 'days_late', label: 'Days Late', description: 'Calendar days past the due date', sourceHint: 'Computed from due date vs current/payment date' },
  { value: 'periods_missing', label: 'Periods Missing', description: 'Count of unfiled C3 periods', sourceHint: 'Gap analysis on cn_c3_reported' },
  { value: 'case_age_days', label: 'Case Age (Days)', description: 'Days since the case was opened', sourceHint: 'ce_cases.created_at' },
  { value: 'active_violation_count', label: 'Active Violation Count', description: 'Number of open violations for the employer', sourceHint: 'ce_violations (status=OPEN)' },
  { value: 'repeat_offender_score', label: 'Repeat Offender Score', description: 'Weighted score based on past violation history', sourceHint: 'Derived from ce_violations history' },
  { value: 'arrangement_missed_count', label: 'Arrangement Missed Count', description: 'Number of missed installment payments', sourceHint: 'ce_arrangement_installments' },
  { value: 'notice_wait_days', label: 'Notice Wait Days', description: 'Days since last notice was sent', sourceHint: 'ce_notices.sent_at' },
  { value: 'is_defaulted', label: 'Is Defaulted', description: 'Whether the arrangement is in default status', sourceHint: 'ce_arrangements.status' },
  { value: 'risk_score', label: 'Risk Score', description: 'Composite employer risk score', sourceHint: 'ce_employer_risk_profiles' },
  { value: 'employee_count', label: 'Employee Count', description: 'Number of employees reported', sourceHint: 'cn_c3_reported.number_employed' },
];

export const FUNCTION_WRAPPERS = [
  { value: 'none', label: 'None', description: 'No function wrapper' },
  { value: 'MIN', label: 'MIN()', description: 'Take the minimum (used for caps)' },
  { value: 'MAX', label: 'MAX()', description: 'Take the maximum (used for floors)' },
  { value: 'AVG', label: 'AVG()', description: 'Average across records' },
  { value: 'SUM', label: 'SUM()', description: 'Sum across records' },
  { value: 'ABS', label: 'ABS()', description: 'Absolute value' },
];

// ── Factor type display helpers ──
export const FACTOR_TYPE_CONFIG: Record<FactorType, { label: string; color: string; bgClass: string }> = {
  base_metric: { label: 'Base', color: 'text-emerald-700 dark:text-emerald-400', bgClass: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700' },
  rate_source: { label: 'Rate', color: 'text-blue-700 dark:text-blue-400', bgClass: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700' },
  derived_metric: { label: 'Derived', color: 'text-amber-700 dark:text-amber-400', bgClass: 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700' },
  constant: { label: 'Const', color: 'text-slate-700 dark:text-slate-300', bgClass: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600' },
  function: { label: 'Fn', color: 'text-purple-700 dark:text-purple-400', bgClass: 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700' },
};

// Resolve a factor's display label
export function resolveFactorLabel(factor: FormulaFactor): string {
  if (factor.label) return factor.label;
  switch (factor.type) {
    case 'base_metric':
      return BASE_METRICS.find(m => m.value === factor.value)?.label || factor.value;
    case 'rate_source':
      return RATE_SOURCES.find(r => r.value === factor.value)?.label || factor.value;
    case 'derived_metric':
      return DERIVED_METRICS.find(d => d.value === factor.value)?.label || factor.value;
    case 'constant':
      return factor.value;
    default:
      return factor.value;
  }
}

// Generate formula preview string from terms
export function generateFormulaFromTerms(terms: FormulaTerm[]): string {
  if (!terms.length) return '';
  return terms.map((term, idx) => {
    const prefix = idx === 0 ? '' : term.operator === 'subtract' ? ' − ' : ' + ';
    const factorsStr = term.factors.map((f, fi) => {
      const joinSymbol = fi === 0 ? '' : f.joinOp === 'divide' ? ' ÷ ' : ' × ';
      return joinSymbol + resolveFactorLabel(f);
    }).join('');
    const inner = factorsStr;
    if (term.functionWrapper && term.functionWrapper !== 'none') {
      return `${prefix}${term.functionWrapper}(${inner})`;
    }
    return `${prefix}${inner}`;
  }).join('');
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Create a blank term
export function createBlankTerm(operator: TermOperator | null): FormulaTerm {
  return {
    id: generateId(),
    operator,
    factors: [],
  };
}

// Create a factor
export function createFactor(type: FactorType, value: string, joinOp: FactorJoinOp = 'multiply'): FormulaFactor {
  return { id: generateId(), type, value, joinOp };
}

// ── Family Templates ──
// Pre-built term structures for common calculation families

export function getFamilyTemplate(family: string): FormulaTerm[] | null {
  switch (family) {
    case 'ss_fine':
      return [
        {
          id: generateId(), operator: null,
          factors: [
            createFactor('base_metric', 'shortfall'),
            createFactor('rate_source', 'ss_fine_initial_rate'),
          ],
        },
        {
          id: generateId(), operator: 'add',
          factors: [
            createFactor('base_metric', 'shortfall'),
            createFactor('rate_source', 'ss_fine_subsequent_rate'),
            createFactor('derived_metric', 'additional_months'),
          ],
        },
      ];
    case 'levy_penalty':
      return [
        {
          id: generateId(), operator: null,
          factors: [
            createFactor('base_metric', 'levy_amount'),
            createFactor('rate_source', 'levy_penalty_initial_rate'),
          ],
        },
        {
          id: generateId(), operator: 'add',
          factors: [
            createFactor('base_metric', 'levy_amount'),
            createFactor('rate_source', 'levy_penalty_subsequent_rate'),
            createFactor('derived_metric', 'additional_months'),
          ],
        },
      ];
    case 'severance_penalty':
      return [
        {
          id: generateId(), operator: null,
          factors: [
            createFactor('base_metric', 'severance_amount'),
            createFactor('rate_source', 'severance_penalty_initial_rate'),
          ],
        },
        {
          id: generateId(), operator: 'add',
          factors: [
            createFactor('base_metric', 'severance_amount'),
            createFactor('rate_source', 'severance_penalty_subsequent_rate'),
            createFactor('derived_metric', 'additional_months'),
          ],
        },
      ];
    case 'interest':
      return [
        {
          id: generateId(), operator: null,
          factors: [
            createFactor('base_metric', 'outstanding_balance'),
            createFactor('rate_source', 'interest_rate_percent'),
            createFactor('derived_metric', 'days_late'),
            createFactor('constant', '365', 'divide'),
          ],
        },
      ];
    case 'estimated_assessment':
      return [
        {
          id: generateId(), operator: null,
          functionWrapper: 'AVG',
          factors: [
            createFactor('base_metric', 'avg_last_3_periods'),
            createFactor('rate_source', 'estimated_assessment_multiplier'),
          ],
        },
      ];
    case 'debt_base':
    case 'case_rollup':
      return [
        {
          id: generateId(), operator: null,
          functionWrapper: 'SUM',
          factors: [
            createFactor('base_metric', 'total_exposure'),
          ],
        },
      ];
    default:
      return null;
  }
}

// Backward compatibility: convert old single base_metric/rate_source to terms
export function convertLegacyToTerms(params: Record<string, any>): FormulaTerm[] | null {
  if (params?.terms) return params.terms as FormulaTerm[];
  if (params?.base_metric && params?.rate_source) {
    return [
      {
        id: generateId(),
        operator: null,
        factors: [
          createFactor('base_metric', params.base_metric),
          createFactor('rate_source', params.rate_source),
        ],
      },
    ];
  }
  return null;
}

// Legacy compat: generate simple formula preview (kept for non-builder contexts)
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
