/**
 * Product binding acceptance tests — exercises the formula engine end-to-end
 * for every active benefit product, using in-memory providers for rate/matrix
 * tables (the DB-seeded values are mirrored here so the tests stay
 * hermetic but still represent the live configuration).
 */
import { describe, it, expect } from 'vitest';
import { runFormula, applyRounding, type FormulaVersionRow } from '@/services/bn/calc/formulaRunner';
import type { RateTableProvider, RateTableBundle } from '@/services/bn/calc/rateTableLookup';

const ratesProvider = (bundles: Record<string, RateTableBundle>): RateTableProvider =>
  async (code) => bundles[code] ?? null;

const agePensionTable: RateTableBundle = {
  header: { id: 't-age', table_code: 'AGE_PENSION_RATE_TABLE', table_type: 'TIER', lookup_mode: 'RANGE_MATCH', country_code: 'SKN', version_no: 1, status: 'ACTIVE' },
  dimensions: [{ dimension_key: 'total_contribution_weeks', dimension_label: 'Weeks', dimension_type: 'NUMBER', match_type: 'RANGE', sequence_no: 1 }],
  rows: [
    { id: 'r1', row_order: 1, dimension_values_json: { total_contribution_weeks: { min: 500, max: 749 } }, output_key: 'pension_rate', output_value: 0.30, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
    { id: 'r2', row_order: 2, dimension_values_json: { total_contribution_weeks: { min: 750, max: 999 } }, output_key: 'pension_rate', output_value: 0.35, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
    { id: 'r3', row_order: 3, dimension_values_json: { total_contribution_weeks: { min: 1000, max: 1249 } }, output_key: 'pension_rate', output_value: 0.40, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
    { id: 'r4', row_order: 4, dimension_values_json: { total_contribution_weeks: { min: 1250, max: 1499 } }, output_key: 'pension_rate', output_value: 0.45, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
    { id: 'r5', row_order: 5, dimension_values_json: { total_contribution_weeks: { min: 2000 } }, output_key: 'pension_rate', output_value: 0.60, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
  ],
};

const survivorMatrix: RateTableBundle = {
  header: { id: 't-sur', table_code: 'SURVIVOR_SHARE_MATRIX', table_type: 'MATRIX', lookup_mode: 'MATRIX_MATCH', country_code: 'SKN', version_no: 1, status: 'ACTIVE' },
  dimensions: [
    { dimension_key: 'beneficiary_type', dimension_label: 'Type', dimension_type: 'ENUM', match_type: 'EXACT', sequence_no: 1 },
    { dimension_key: 'beneficiary_count', dimension_label: 'Count', dimension_type: 'NUMBER', match_type: 'RANGE', sequence_no: 2 },
  ],
  rows: [
    { id: 's1', row_order: 1, dimension_values_json: { beneficiary_type: 'SPOUSE', beneficiary_count: { min: 1, max: 1 } }, output_key: 'beneficiary_share_percent', output_value: 0.50, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
    { id: 's2', row_order: 2, dimension_values_json: { beneficiary_type: 'CHILD', beneficiary_count: { min: 1, max: 3 } }, output_key: 'beneficiary_share_percent', output_value: 0.50, output_text: null, output_type: 'PERCENTAGE', effective_from: null, effective_to: null },
  ],
};

const provider = ratesProvider({
  AGE_PENSION_RATE_TABLE: agePensionTable,
  SURVIVOR_SHARE_MATRIX: survivorMatrix,
});

const simpleFormula = (code: string, expression: string, output: string): FormulaVersionRow => ({
  id: code, formula_code: code, version_no: 1, expression_type: 'SIMPLE_EXPRESSION',
  expression, steps_json: [], output_variable: output, rounding_rule: 'ROUND_HALF_UP',
});

const stepFormula = (code: string, steps: unknown, output: string): FormulaVersionRow => ({
  id: code, formula_code: code, version_no: 1, expression_type: 'MULTI_STEP',
  expression: null, steps_json: steps, output_variable: output, rounding_rule: 'ROUND_HALF_UP',
});

describe('Sickness — PCT_AVG_WEEKLY_WAGE', () => {
  it('AWW 600 × 0.65 → 390', async () => {
    const res = await runFormula(
      simpleFormula('PCT_AVG_WEEKLY_WAGE', 'average_weekly_wage * replacement_rate', 'weekly_amount'),
      { average_weekly_wage: 600, replacement_rate: 0.65 }, {}, provider);
    expect(applyRounding(res.output, 'ROUND_HALF_UP')).toBe(390);
  });
});

describe('Age Pension — TIERED_PENSION_V1', () => {
  it('AIW 1000 × weeks 1200 → 400 weekly', async () => {
    const res = await runFormula(
      stepFormula('TIERED_PENSION_V1', [
        { kind: 'LOOKUP', target: 'pension_rate', table_code: 'AGE_PENSION_RATE_TABLE',
          inputs: { total_contribution_weeks: 'total_contribution_weeks' } },
        { kind: 'EXPR', target: 'weekly_amount', expression: 'average_insurable_wage * pension_rate' },
      ], 'weekly_amount'),
      { average_insurable_wage: 1000, total_contribution_weeks: 1200 }, {}, provider);
    expect(applyRounding(res.output, 'ROUND_HALF_UP')).toBe(400);
  });
});

describe('Age Grant — AGE_GRANT', () => {
  it('AWW 500, weeks 250, size 50, multiplier 6 → 15 000', async () => {
    const res = await runFormula(
      simpleFormula('AGE_GRANT', 'average_weekly_wage * grant_multiplier * contribution_units', 'grant_amount'),
      { average_weekly_wage: 500, grant_multiplier: 6, contribution_units: Math.floor(250 / 50) }, {}, provider);
    expect(applyRounding(res.output, 'ROUND_HALF_UP')).toBe(15000);
  });
});

describe('Funeral Grant — FUNERAL_GRANT_V1', () => {
  it('grant_amount 2500 → 2500', async () => {
    const res = await runFormula(
      simpleFormula('FUNERAL_GRANT_V1', 'grant_amount', 'grant_amount'),
      { grant_amount: 2500 }, {}, provider);
    expect(applyRounding(res.output, 'ROUND_HALF_UP')).toBe(2500);
  });
});

describe('Survivor — SURVIVOR_SPLIT_V1', () => {
  it('base 400, spouse count 1 → 200', async () => {
    const res = await runFormula(
      stepFormula('SURVIVOR_SPLIT_V1', [
        { kind: 'LOOKUP', target: 'beneficiary_share_percent', table_code: 'SURVIVOR_SHARE_MATRIX',
          inputs: { beneficiary_type: 'beneficiary_type', beneficiary_count: 'beneficiary_count' } },
        { kind: 'EXPR', target: 'beneficiary_amount', expression: 'base_pension * beneficiary_share_percent' },
      ], 'beneficiary_amount'),
      { base_pension: 400, beneficiary_type: 'SPOUSE', beneficiary_count: 1 }, {}, provider);
    expect(applyRounding(res.output, 'ROUND_HALF_UP')).toBe(200);
  });
});

describe('NCP — NCP_FLAT_RATE_V1', () => {
  it('flat_weekly_rate 62.50 → 62.50', async () => {
    const res = await runFormula(
      simpleFormula('NCP_FLAT_RATE_V1', 'flat_weekly_rate', 'weekly_amount'),
      { flat_weekly_rate: 62.5 }, {}, provider);
    expect(applyRounding(res.output, 'ROUND_HALF_UP')).toBe(62.5);
  });
});
