/**
 * productActivationValidator
 *
 * Single gate that decides whether a bn_product_version can move out of DRAFT.
 * Used by:
 *   • CalculationBuilder (disable Save/Activate, show blocker list)
 *   • productApprovalService.activate (server-side guard)
 *
 * A product version may activate IFF:
 *   1. formula_template_id is set
 *   2. the referenced formula is governance_status READY_FOR_PRODUCT_USE | ACTIVE
 *   3. every variable in the formula resolves through the resolver map
 *   4. every entry in formula_template.required_parameters has a value
 *      (either in formula_parameter_values or in the parameter default)
 *   5. a sample simulation evaluates to a finite numeric result
 */
import { supabase } from '@/integrations/supabase/client';
import { parseFormula } from '@/lib/bn/formulaParser';

const extractVariables = (expr: string): string[] => {
  try {
    const p = parseFormula(expr);
    return Array.from(new Set(p.variablesUsed));
  } catch {
    return [];
  }
};
import { loadResolverMap } from './variableResolverService';

const db = supabase as any;

export type ActivationBlocker =
  | { kind: 'NO_FORMULA'; message: string }
  | { kind: 'FORMULA_NOT_READY'; message: string; status: string }
  | { kind: 'UNRESOLVED_VARIABLE'; message: string; variable: string }
  | { kind: 'MISSING_PARAMETER'; message: string; parameter: string }
  | { kind: 'SIMULATION_FAILED'; message: string };

export interface ActivationResult {
  canActivate: boolean;
  blockers: ActivationBlocker[];
  // What we discovered along the way — useful for the Usage Analysis panel
  formulaTemplate?: {
    id: string;
    template_code: string;
    template_name: string;
    formula_expression: string;
    governance_status: string;
    required_parameters: string[];
    output_variable: string | null;
  };
  variablesRequired: string[];
  variablesMapped: string[];
  variablesMissing: string[];
  parametersRequired: string[];
  parametersMapped: string[];
  parametersMissing: string[];
}

const READY_STATUSES = new Set(['READY_FOR_PRODUCT_USE', 'ACTIVE']);

export async function validateProductActivation(
  versionId: string
): Promise<ActivationResult> {
  const blockers: ActivationBlocker[] = [];

  const { data: version, error: vErr } = await db
    .from('bn_product_version')
    .select(
      'id, formula_template_id, formula_parameter_values, cap_rules, rounding_rule'
    )
    .eq('id', versionId)
    .maybeSingle();

  if (vErr) throw vErr;
  if (!version) throw new Error('Product version not found');

  if (!version.formula_template_id) {
    blockers.push({
      kind: 'NO_FORMULA',
      message: 'Select a formula from the Formula Library.',
    });
    return {
      canActivate: false,
      blockers,
      variablesRequired: [],
      variablesMapped: [],
      variablesMissing: [],
      parametersRequired: [],
      parametersMapped: [],
      parametersMissing: [],
    };
  }

  const { data: tmpl, error: tErr } = await db
    .from('bn_formula_template')
    .select(
      'id, template_code, template_name, formula_expression, governance_status, required_parameters, output_variable'
    )
    .eq('id', version.formula_template_id)
    .single();
  if (tErr) throw tErr;

  if (!READY_STATUSES.has(tmpl.governance_status)) {
    blockers.push({
      kind: 'FORMULA_NOT_READY',
      message: `Formula "${tmpl.template_name}" is ${tmpl.governance_status}. Only READY_FOR_PRODUCT_USE or ACTIVE formulas can be used in production.`,
      status: tmpl.governance_status,
    });
  }

  const variablesRequired = extractVariables(tmpl.formula_expression);
  const requiredParams: string[] = Array.isArray(tmpl.required_parameters)
    ? (tmpl.required_parameters as string[])
    : [];

  // --- Parameter coverage --------------------------------------------------
  const overrideValues: Record<string, unknown> =
    (version.formula_parameter_values as Record<string, unknown>) || {};

  const { data: paramDefaults } = await db
    .from('bn_product_parameter')
    .select('code, default_value, status')
    .in('code', requiredParams.length ? requiredParams : ['__none__']);

  const defaultByCode = new Map<string, unknown>();
  for (const row of paramDefaults || []) {
    defaultByCode.set(row.code, row.default_value);
  }

  const parametersMapped: string[] = [];
  const parametersMissing: string[] = [];
  for (const p of requiredParams) {
    const has =
      overrideValues[p] !== undefined && overrideValues[p] !== null
        ? true
        : defaultByCode.get(p) !== undefined && defaultByCode.get(p) !== null;
    if (has) parametersMapped.push(p);
    else {
      parametersMissing.push(p);
      blockers.push({
        kind: 'MISSING_PARAMETER',
        message: `Parameter "${p}" has no value. Set it on this product or as a default in the Product Parameter Registry.`,
        parameter: p,
      });
    }
  }

  // --- Variable coverage ---------------------------------------------------
  const resolver = await loadResolverMap();
  const variablesMapped: string[] = [];
  const variablesMissing: string[] = [];
  for (const v of variablesRequired) {
    // a variable counts as mapped if the resolver knows it OR it's a product
    // parameter that we've already confirmed has a value
    const inResolver = resolver.has(v);
    const inParams = requiredParams.includes(v) && !parametersMissing.includes(v);
    if (inResolver || inParams) variablesMapped.push(v);
    else {
      variablesMissing.push(v);
      blockers.push({
        kind: 'UNRESOLVED_VARIABLE',
        message: `Variable "${v}" is not registered. Add it to the Fact, Derived Fact, or Product Parameter registry.`,
        variable: v,
      });
    }
  }

  // --- Sample simulation ---------------------------------------------------
  if (
    parametersMissing.length === 0 &&
    variablesMissing.length === 0 &&
    READY_STATUSES.has(tmpl.governance_status)
  ) {
    try {
      const ctx: Record<string, number> = {};
      for (const v of variablesRequired) {
        const resolved = resolver.get(v);
        if (resolved?.sampleValue !== null && resolved?.sampleValue !== undefined) {
          ctx[v] = Number(resolved.sampleValue);
        }
        const override = overrideValues[v];
        if (typeof override === 'number') ctx[v] = override;
        else if (defaultByCode.has(v) && typeof defaultByCode.get(v) === 'number') {
          ctx[v] = Number(defaultByCode.get(v));
        }
        if (ctx[v] === undefined) ctx[v] = 1; // safe sample fallback
      }
      const result = safeEval(tmpl.formula_expression, ctx);
      if (!Number.isFinite(result)) {
        blockers.push({
          kind: 'SIMULATION_FAILED',
          message: 'Sample simulation did not produce a finite number.',
        });
      }
    } catch (err: any) {
      blockers.push({
        kind: 'SIMULATION_FAILED',
        message: `Sample simulation threw: ${err?.message || 'unknown error'}`,
      });
    }
  }

  return {
    canActivate: blockers.length === 0,
    blockers,
    formulaTemplate: tmpl,
    variablesRequired,
    variablesMapped,
    variablesMissing,
    parametersRequired: requiredParams,
    parametersMapped,
    parametersMissing,
  };
}

// Lightweight expression evaluator used only for the smoke test in this
// validator. Whitelists arithmetic + min/max only.
function safeEval(expression: string, ctx: Record<string, number>): number {
  const replaced = expression.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (id) => {
    if (id === 'min' || id === 'max') return `Math.${id}`;
    const v = ctx[id];
    return Number.isFinite(v) ? String(v) : 'NaN';
  });
  if (!/^[\d+\-*/().,%\s]|Math\.(min|max)/.test(replaced)) return NaN;
  // eslint-disable-next-line no-new-func
  const out = Function(`"use strict"; return (${replaced});`)();
  return Number(out);
}
