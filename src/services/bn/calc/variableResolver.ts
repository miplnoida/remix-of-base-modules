/**
 * Variable resolver for BN Calculation Engine v2.
 *
 * Given a list of variable mappings (from bn_product_formula_variable_mapping),
 * resolves each one per its `source_type` against the calculation context.
 *
 * Source types:
 *   FACT                  - claim.facts[source_key]
 *   DERIVED_FACT          - claim.derivedFacts[source_key] (precomputed)
 *   PRODUCT_PARAMETER     - context.productParameters[source_key]
 *   RATE_TABLE / MATRIX_TABLE - not resolved here; runner calls lookup when needed
 *   PRIOR_FORMULA_RESULT  - context.priorResults[source_key]
 *   CLAIM_FIELD           - claim[source_key] (top-level)
 *   MANUAL_INPUT          - context.manualInputs[source_key]
 *   CONSTANT              - default_value parsed as number/string
 */

export interface VariableMapping {
  variable_name: string;
  source_type:
    | 'FACT'
    | 'DERIVED_FACT'
    | 'PRODUCT_PARAMETER'
    | 'RATE_TABLE'
    | 'MATRIX_TABLE'
    | 'PRIOR_FORMULA_RESULT'
    | 'CLAIM_FIELD'
    | 'MANUAL_INPUT'
    | 'CONSTANT';
  source_key: string | null;
  rate_table_code: string | null;
  required: boolean;
  default_value: string | null;
}

export interface CalculationContext {
  facts: Record<string, unknown>;
  derivedFacts: Record<string, unknown>;
  productParameters: Record<string, unknown>;
  priorResults: Record<string, unknown>;
  manualInputs: Record<string, unknown>;
  claimFields: Record<string, unknown>;
}

export function emptyContext(): CalculationContext {
  return {
    facts: {}, derivedFacts: {}, productParameters: {},
    priorResults: {}, manualInputs: {}, claimFields: {},
  };
}

export interface ResolvedVariables {
  scope: Record<string, unknown>;
  rateTableRefs: Record<string, string>; // variable_name -> table_code
  missing: string[];
}

function parseConst(raw: string | null): unknown {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (Number.isFinite(n) && String(n) === raw.trim()) return n;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw;
}

export function resolveVariables(
  mappings: VariableMapping[],
  ctx: CalculationContext,
): ResolvedVariables {
  const scope: Record<string, unknown> = {};
  const rateTableRefs: Record<string, string> = {};
  const missing: string[] = [];

  for (const m of mappings) {
    const key = m.source_key ?? m.variable_name;
    let val: unknown = undefined;
    switch (m.source_type) {
      case 'FACT':                 val = ctx.facts[key]; break;
      case 'DERIVED_FACT':         val = ctx.derivedFacts[key]; break;
      case 'PRODUCT_PARAMETER':    val = ctx.productParameters[key]; break;
      case 'PRIOR_FORMULA_RESULT': val = ctx.priorResults[key]; break;
      case 'CLAIM_FIELD':          val = ctx.claimFields[key]; break;
      case 'MANUAL_INPUT':         val = ctx.manualInputs[key]; break;
      case 'CONSTANT':             val = parseConst(m.default_value); break;
      case 'RATE_TABLE':
      case 'MATRIX_TABLE':
        if (m.rate_table_code) rateTableRefs[m.variable_name] = m.rate_table_code;
        continue; // resolved on demand in runner
    }
    if (val === undefined || val === null) {
      if (m.default_value != null && m.default_value !== '') {
        val = parseConst(m.default_value);
      } else if (m.required) {
        missing.push(m.variable_name);
        continue;
      } else {
        val = null;
      }
    }
    scope[m.variable_name] = val;
  }
  return { scope, rateTableRefs, missing };
}
