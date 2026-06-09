/**
 * Formula Variable Registry — variables allowed inside calculation formulas.
 */
export type FormulaVarType = 'number' | 'percent' | 'money';

export interface FormulaVariableDef {
  key: string;
  label: string;
  type: FormulaVarType;
  /** Sample value used by the Test Formula button. */
  sample: number;
  description?: string;
}

export const FORMULA_VARIABLES: readonly FormulaVariableDef[] = [
  { key: 'avg_weekly_wage', label: 'Average weekly wage', type: 'money', sample: 850 },
  { key: 'avg_annual_wage', label: 'Average annual wage', type: 'money', sample: 44200 },
  { key: 'paid_weeks', label: 'Paid weeks', type: 'number', sample: 500 },
  { key: 'credited_weeks', label: 'Credited weeks', type: 'number', sample: 20 },
  { key: 'total_weeks', label: 'Total weeks (paid + credited)', type: 'number', sample: 520 },
  { key: 'rate_pct', label: 'Rate %', type: 'percent', sample: 30 },
  { key: 'base_rate_pct', label: 'Base rate %', type: 'percent', sample: 30 },
  { key: 'increment_rate_pct', label: 'Increment rate %', type: 'percent', sample: 1 },
  { key: 'disablement_pct', label: 'Disablement %', type: 'percent', sample: 35 },
  { key: 'flat_amount', label: 'Flat amount', type: 'money', sample: 600 },
  { key: 'monthly_rate', label: 'Monthly rate', type: 'money', sample: 1200 },
  { key: 'family_cap_pct', label: 'Family cap %', type: 'percent', sample: 100 },
  { key: 'beneficiary_share_pct', label: 'Beneficiary share %', type: 'percent', sample: 50 },
  // Variables referenced by seeded formula templates (PCT-AVG-WAGE,
  // TIERED-PENSION, SURVIVOR-SPLIT, NCP-FLAT-RATE, EI-DISABLEMENT,
  // FUNERAL-GRANT). Sourced from product_parameter / calculation_result.
  { key: 'rate', label: 'Replacement rate', type: 'percent', sample: 65, description: 'Product-parameter replacement rate (e.g. 0.65, 0.75).' },
  { key: 'base_rate', label: 'Base pension rate', type: 'percent', sample: 30, description: 'Base pension rate from product parameter or prior formula result.' },
  { key: 'base_pension', label: 'Base pension amount', type: 'money', sample: 1200, description: 'Computed base pension amount used by survivor split.' },
  { key: 'flat_weekly_rate', label: 'Flat weekly rate', type: 'money', sample: 250, description: 'Product-parameter flat weekly rate (NCP).' },
  { key: 'grant_amount', label: 'Grant amount', type: 'money', sample: 2500, description: 'Product-parameter grant amount (e.g. funeral grant).' },
] as const;


export type FormulaVariableKey = (typeof FORMULA_VARIABLES)[number]['key'];

const BY_KEY = new Map(FORMULA_VARIABLES.map((v) => [v.key, v]));

export function getFormulaVariable(key: string): FormulaVariableDef | undefined {
  return BY_KEY.get(key);
}

export function isValidFormulaVariableKey(key: string): boolean {
  return BY_KEY.has(key);
}
