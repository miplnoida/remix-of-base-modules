/**
 * BN Calculation Engine v2 — sample-case tests.
 * Verifies the five canonical scenarios from the framework spec without
 * touching the database (uses injected rate-table provider).
 */
import { describe, it, expect } from 'vitest';
import { evaluateExpression, parseExpression } from '@/services/bn/calc/safeExpressionParser';
import { lookupRate, type RateTableBundle, type RateTableProvider } from '@/services/bn/calc/rateTableLookup';
import { runFormula, applyRounding, type FormulaVersionRow } from '@/services/bn/calc/formulaRunner';

/* ----- in-memory rate-table provider ----- */
const TABLES: Record<string, RateTableBundle> = {
  AGE_PENSION_RATE_TABLE: {
    header: { id: 't1', table_code: 'AGE_PENSION_RATE_TABLE', table_type: 'TIER', lookup_mode: 'RANGE_MATCH', country_code: 'SKN', version_no: 1, status: 'ACTIVE' },
    dimensions: [{ dimension_key: 'total_contribution_weeks', dimension_label: 'Weeks', dimension_type: 'NUMBER', match_type: 'RANGE', sequence_no: 1 }],
    rows: [
      { id: 'r1', row_order: 1, dimension_values_json: { total_contribution_weeks: { min: 500, max: 749 } },   output_key: 'pension_rate', output_value: 0.30, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
      { id: 'r2', row_order: 2, dimension_values_json: { total_contribution_weeks: { min: 750, max: 999 } },   output_key: 'pension_rate', output_value: 0.35, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
      { id: 'r3', row_order: 3, dimension_values_json: { total_contribution_weeks: { min: 1000, max: 1249 } }, output_key: 'pension_rate', output_value: 0.40, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
      { id: 'r4', row_order: 4, dimension_values_json: { total_contribution_weeks: { min: 1250, max: 1499 } }, output_key: 'pension_rate', output_value: 0.45, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
      { id: 'r5', row_order: 5, dimension_values_json: { total_contribution_weeks: { min: 1500, max: 1749 } }, output_key: 'pension_rate', output_value: 0.50, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
      { id: 'r6', row_order: 6, dimension_values_json: { total_contribution_weeks: { min: 1750, max: 1999 } }, output_key: 'pension_rate', output_value: 0.55, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
      { id: 'r7', row_order: 7, dimension_values_json: { total_contribution_weeks: { min: 2000 } },            output_key: 'pension_rate', output_value: 0.60, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
    ],
  },
  SURVIVOR_SHARE_MATRIX: {
    header: { id: 't2', table_code: 'SURVIVOR_SHARE_MATRIX', table_type: 'MATRIX', lookup_mode: 'MATRIX_MATCH', country_code: 'SKN', version_no: 1, status: 'ACTIVE' },
    dimensions: [
      { dimension_key: 'beneficiary_type',  dimension_label: 'Type',  dimension_type: 'ENUM',   match_type: 'EXACT', sequence_no: 1 },
      { dimension_key: 'beneficiary_count', dimension_label: 'Count', dimension_type: 'NUMBER', match_type: 'RANGE', sequence_no: 2 },
    ],
    rows: [
      { id: 's1', row_order: 1, dimension_values_json: { beneficiary_type: 'SPOUSE',           beneficiary_count: { min: 1, max: 1 } }, output_key: 'beneficiary_share_percent', output_value: 0.50, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
      { id: 's2', row_order: 2, dimension_values_json: { beneficiary_type: 'CHILD',            beneficiary_count: { min: 1, max: 3 } }, output_key: 'beneficiary_share_percent', output_value: 0.50, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
      { id: 's3', row_order: 3, dimension_values_json: { beneficiary_type: 'DEPENDENT_PARENT', beneficiary_count: { min: 1, max: 2 } }, output_key: 'beneficiary_share_percent', output_value: 0.25, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
    ],
  },
  MEDICAL_REIMBURSEMENT_CAP_TABLE: {
    header: { id: 't3', table_code: 'MEDICAL_REIMBURSEMENT_CAP_TABLE', table_type: 'CAP_TABLE', lookup_mode: 'EXACT_MATCH', country_code: 'SKN', version_no: 1, status: 'ACTIVE' },
    dimensions: [
      { dimension_key: 'expense_type',  dimension_label: 'Expense',  dimension_type: 'ENUM', match_type: 'EXACT', sequence_no: 1 },
      { dimension_key: 'provider_type', dimension_label: 'Provider', dimension_type: 'ENUM', match_type: 'EXACT', sequence_no: 2 },
    ],
    rows: [
      { id: 'm1', row_order: 1, dimension_values_json: { expense_type: 'CONSULTATION', provider_type: 'CLINIC' }, output_key: 'reimbursement_limit', output_value: 1000, output_text: null, output_type: 'AMOUNT', effective_from: null, effective_to: null },
    ],
  },
};
const provider: RateTableProvider = async (code) => TABLES[code] ?? null;

/* ----- parser sanity ----- */
describe('safeExpressionParser', () => {
  it('evaluates simple arithmetic', () => {
    expect(evaluateExpression('600 * 0.65', {})).toBeCloseTo(390);
  });
  it('reads variables and applies precedence', () => {
    expect(evaluateExpression('a + b * c', { a: 1, b: 2, c: 3 })).toBe(7);
  });
  it('supports min/max/floor and ternary', () => {
    expect(evaluateExpression('min(1200, 1000)', {})).toBe(1000);
    expect(evaluateExpression('floor(weeks / 50)', { weeks: 250 })).toBe(5);
    expect(evaluateExpression('age >= 65 ? 1 : 0', { age: 70 })).toBe(1);
  });
  it('rejects unknown functions', () => {
    expect(() => parseExpression('eval(x)').evaluate({})).toThrow();
  });
});

/* ----- sample cases ----- */
describe('BN Calc Engine v2 — sample cases', () => {
  it('Sickness: 600 * 0.65 = 390', () => {
    const f: FormulaVersionRow = {
      id: 'f1', formula_code: 'PCT_AVG_WEEKLY_WAGE', version_no: 1,
      expression_type: 'SIMPLE_EXPRESSION',
      expression: 'average_weekly_wage * replacement_rate',
      steps_json: [], output_variable: 'weekly_amount', rounding_rule: 'ROUND_HALF_UP',
    };
    return runFormula(f, { average_weekly_wage: 600, replacement_rate: 0.65 }, {}, provider)
      .then((r) => {
        expect(applyRounding(r.output, 'ROUND_HALF_UP')).toBeCloseTo(390);
      });
  });

  it('Age Grant: 500 * 6 * 5 = 15000', () => {
    const f: FormulaVersionRow = {
      id: 'f2', formula_code: 'AGE_GRANT', version_no: 1,
      expression_type: 'SIMPLE_EXPRESSION',
      expression: 'average_weekly_wage * grant_multiplier * contribution_units',
      steps_json: [], output_variable: 'grant_amount', rounding_rule: 'ROUND_HALF_UP',
    };
    return runFormula(f, { average_weekly_wage: 500, grant_multiplier: 6, contribution_units: 5 }, {}, provider)
      .then((r) => {
        expect(applyRounding(r.output, 'ROUND_HALF_UP')).toBeCloseTo(15000);
      });
  });

  it('Age Pension: lookup(1200) = 0.40 → 1000 * 0.40 = 400', async () => {
    const f: FormulaVersionRow = {
      id: 'f3', formula_code: 'AGE_PENSION_RATE_LOOKUP', version_no: 1,
      expression_type: 'MULTI_STEP',
      expression: null,
      steps_json: [
        { kind: 'LOOKUP', target: 'pension_rate', table_code: 'AGE_PENSION_RATE_TABLE',
          inputs: { total_contribution_weeks: 'total_contribution_weeks' } },
        { kind: 'EXPR', target: 'weekly_pension', expression: 'average_insurable_wage * pension_rate' },
      ],
      output_variable: 'weekly_pension', rounding_rule: 'ROUND_HALF_UP',
    };
    const r = await runFormula(f, { average_insurable_wage: 1000, total_contribution_weeks: 1200 }, {}, provider);
    expect(applyRounding(r.output, 'ROUND_HALF_UP')).toBeCloseTo(400);
    expect(r.lookupTrace[0].matched_row_order).toBe(3);
  });

  it('Survivor: matrix(SPOUSE,1) = 0.50 → 400 * 0.50 = 200', async () => {
    const f: FormulaVersionRow = {
      id: 'f4', formula_code: 'SURVIVOR_SPLIT', version_no: 1,
      expression_type: 'MULTI_STEP', expression: null,
      steps_json: [
        { kind: 'LOOKUP', target: 'beneficiary_share_percent', table_code: 'SURVIVOR_SHARE_MATRIX',
          inputs: { beneficiary_type: 'beneficiary_type', beneficiary_count: 'beneficiary_count' } },
        { kind: 'EXPR', target: 'beneficiary_amount', expression: 'base_pension * beneficiary_share_percent' },
      ],
      output_variable: 'beneficiary_amount', rounding_rule: 'ROUND_HALF_UP',
    };
    const r = await runFormula(f, { base_pension: 400, beneficiary_type: 'SPOUSE', beneficiary_count: 1 }, {}, provider);
    expect(applyRounding(r.output, 'ROUND_HALF_UP')).toBeCloseTo(200);
  });

  it('Medical: min(1200, 1000) = 1000', async () => {
    const f: FormulaVersionRow = {
      id: 'f5', formula_code: 'MEDICAL_REIMBURSEMENT', version_no: 1,
      expression_type: 'MULTI_STEP', expression: null,
      steps_json: [
        { kind: 'LOOKUP', target: 'reimbursement_limit', table_code: 'MEDICAL_REIMBURSEMENT_CAP_TABLE',
          inputs: { expense_type: 'expense_type', provider_type: 'provider_type' } },
        { kind: 'EXPR', target: 'reimbursable_amount', expression: 'min(approved_expense_amount, reimbursement_limit)' },
      ],
      output_variable: 'reimbursable_amount', rounding_rule: 'ROUND_HALF_UP',
    };
    const r = await runFormula(f,
      { approved_expense_amount: 1200, expense_type: 'CONSULTATION', provider_type: 'CLINIC' },
      {}, provider);
    expect(applyRounding(r.output, 'ROUND_HALF_UP')).toBeCloseTo(1000);
  });
});

describe('rateTableLookup edge cases', () => {
  it('returns NO_MATCH when input falls outside ranges', async () => {
    const r = await lookupRate('AGE_PENSION_RATE_TABLE', { total_contribution_weeks: 100 }, provider);
    expect(r.value).toBeNull();
    expect(r.trace.reason).toBe('NO_MATCH');
  });
  it('returns TABLE_NOT_FOUND for missing tables', async () => {
    const r = await lookupRate('DOES_NOT_EXIST', {}, provider);
    expect(r.trace.reason).toBe('TABLE_NOT_FOUND');
  });
});
