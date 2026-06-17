/**
 * Formula runner — executes a single bn_formula_version against a scope.
 *
 * Supports all expression_type values:
 *   - SIMPLE_EXPRESSION       expression evaluated in scope → output_variable
 *   - RATE_TABLE_LOOKUP       single lookup; dim inputs come from steps_json
 *   - MATRIX_LOOKUP           same as RATE_TABLE_LOOKUP
 *   - MULTI_STEP              steps_json = [{kind, ...}]
 *   - CONDITIONAL             steps_json = [{kind:'IF', condition, then, else}]
 *
 * Step shapes inside steps_json:
 *   {kind: 'EXPR', target: 'name', expression: '...'}
 *   {kind: 'LOOKUP', target: 'name', table_code: 'X',
 *      inputs: { dim_key: '<scope var name or literal>' }}
 *   {kind: 'IF', condition: 'expr', then: [...steps], else: [...steps]}
 */

import { evaluateExpression } from './safeExpressionParser';
import { lookupRate, type RateTableProvider, type LookupTraceEntry } from './rateTableLookup';
import {
  resolveReimbursement as lookupMedicalTariff,
  type MedicalPolicyProvider,
  type MedicalPolicyTrace,
} from './medicalPolicyResolver';

export interface FormulaVersionRow {
  id: string;
  formula_code: string;
  version_no: number;
  expression_type:
    | 'SIMPLE_EXPRESSION' | 'RATE_TABLE_LOOKUP' | 'MATRIX_LOOKUP'
    | 'MEDICAL_TARIFF_LOOKUP' | 'MULTI_STEP' | 'CONDITIONAL';
  expression: string | null;
  steps_json: unknown;
  output_variable: string | null;
  rounding_rule: string | null;
}

export interface ExpressionTraceEntry {
  step: number;
  kind: string;
  target?: string;
  expression?: string;
  table_code?: string;
  inputs?: Record<string, unknown>;
  output?: unknown;
  medical_trace?: MedicalPolicyTrace;
}

export interface FormulaRunResult {
  output: unknown;
  scope: Record<string, unknown>;
  lookupTrace: LookupTraceEntry[];
  expressionTrace: ExpressionTraceEntry[];
  medicalTrace: MedicalPolicyTrace[];
}

interface StepExpr { kind: 'EXPR'; target?: string; expression: string }
interface StepLookup { kind: 'LOOKUP'; target: string; table_code: string; inputs: Record<string, string> }
interface StepMedical { kind: 'MEDICAL_TARIFF'; target: string; inputs: Record<string, string> }
interface StepIf { kind: 'IF'; condition: string; then: Step[]; else?: Step[] }
type Step = StepExpr | StepLookup | StepMedical | StepIf;

export async function runFormula(
  formula: FormulaVersionRow,
  scope: Record<string, unknown>,
  rateTableRefs: Record<string, string>,
  provider?: RateTableProvider,
  medicalProvider?: MedicalPolicyProvider,
): Promise<FormulaRunResult> {
  const workScope: Record<string, unknown> = { ...scope };
  const lookupTrace: LookupTraceEntry[] = [];
  const expressionTrace: ExpressionTraceEntry[] = [];
  const medicalTrace: MedicalPolicyTrace[] = [];

  // Resolve any rate-table variables that appear in mappings into callable values
  // by pre-running their lookup if the formula uses them directly via output_variable name.
  // For SIMPLE_EXPRESSION/MULTI_STEP we rely on explicit LOOKUP steps.

  const runStepList = async (steps: Step[]): Promise<unknown> => {
    let last: unknown = null;
    let i = 0;
    for (const step of steps) {
      i++;
      if (step.kind === 'EXPR') {
        const val = evaluateExpression(step.expression, workScope);
        last = val;
        if (step.target) workScope[step.target] = val;
        expressionTrace.push({ step: i, kind: 'EXPR', target: step.target, expression: step.expression, output: val });
      } else if (step.kind === 'LOOKUP') {
        const resolvedInputs: Record<string, unknown> = {};
        for (const [dimKey, src] of Object.entries(step.inputs)) {
          // src is a scope variable name OR a literal
          if (src in workScope) resolvedInputs[dimKey] = workScope[src];
          else {
            const n = Number(src);
            resolvedInputs[dimKey] = Number.isFinite(n) && String(n) === String(src).trim() ? n : src;
          }
        }
        const res = await lookupRate(step.table_code, resolvedInputs, provider);
        lookupTrace.push(res.trace);
        workScope[step.target] = res.value;
        last = res.value;
        expressionTrace.push({ step: i, kind: 'LOOKUP', target: step.target, table_code: step.table_code, inputs: resolvedInputs, output: res.value });
      } else if (step.kind === 'MEDICAL_TARIFF') {
        const resolvedInputs: Record<string, unknown> = {};
        for (const [k, src] of Object.entries(step.inputs)) {
          if (src in workScope) resolvedInputs[k] = workScope[src];
          else resolvedInputs[k] = src;
        }
        const trace = await lookupMedicalTariff({
          procedure_code: String(resolvedInputs.procedure_code ?? ''),
          treatment_type: (resolvedInputs.treatment_type as string) ?? null,
          location_code: String(resolvedInputs.location_code ?? ''),
          provider_type_code: String(resolvedInputs.provider_type_code ?? ''),
          beneficiary_type: (resolvedInputs.beneficiary_type as string) ?? null,
          approved_expense_amount: Number(resolvedInputs.approved_expense_amount ?? 0),
          emergency_flag: !!resolvedInputs.emergency_flag,
          referral_status: !!resolvedInputs.referral_status,
          pre_authorization_status: !!resolvedInputs.pre_authorization_status,
        }, medicalProvider);
        medicalTrace.push(trace);
        workScope[step.target] = trace.payable_amount;
        last = trace.payable_amount;
        expressionTrace.push({ step: i, kind: 'MEDICAL_TARIFF', target: step.target, inputs: resolvedInputs, output: trace.payable_amount, medical_trace: trace });
      } else if (step.kind === 'IF') {
        const cond = evaluateExpression(step.condition, workScope);
        expressionTrace.push({ step: i, kind: 'IF', expression: step.condition, output: cond });
        if (cond) last = await runStepList(step.then);
        else if (step.else) last = await runStepList(step.else);
      }
    }
    return last;
  };

  let output: unknown = null;

  if (formula.expression_type === 'SIMPLE_EXPRESSION') {
    if (!formula.expression) throw new Error(`Formula ${formula.formula_code}: missing expression`);
    output = evaluateExpression(formula.expression, workScope);
    expressionTrace.push({ step: 1, kind: 'EXPR', expression: formula.expression, output });
    if (formula.output_variable) workScope[formula.output_variable] = output;
  } else if (formula.expression_type === 'RATE_TABLE_LOOKUP' || formula.expression_type === 'MATRIX_LOOKUP') {
    const steps = Array.isArray(formula.steps_json) ? (formula.steps_json as Step[]) : [];
    output = await runStepList(steps);
  } else if (formula.expression_type === 'MEDICAL_TARIFF_LOOKUP') {
    const steps = Array.isArray(formula.steps_json) ? (formula.steps_json as Step[]) : [];
    output = await runStepList(steps);
    if (formula.output_variable && formula.output_variable in workScope) {
      output = workScope[formula.output_variable];
    }
  } else if (formula.expression_type === 'MULTI_STEP' || formula.expression_type === 'CONDITIONAL') {
    const steps = Array.isArray(formula.steps_json) ? (formula.steps_json as Step[]) : [];
    output = await runStepList(steps);
    if (formula.output_variable && formula.output_variable in workScope) {
      output = workScope[formula.output_variable];
    }
  }

  return { output, scope: workScope, lookupTrace, expressionTrace, medicalTrace };
}

export function applyRounding(value: unknown, rule: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  switch (rule) {
    case 'ROUND_HALF_UP': return Math.round(n * 100) / 100;
    case 'ROUND_DOWN':    return Math.floor(n * 100) / 100;
    case 'ROUND_UP':      return Math.ceil(n * 100) / 100;
    case 'TRUNCATE':      return Math.trunc(n * 100) / 100;
    case 'NEAREST_DOLLAR': return Math.round(n);
    default: return Math.round(n * 100) / 100;
  }
}
