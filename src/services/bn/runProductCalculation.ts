/**
 * runProductCalculation
 *
 * Phase B of the Formula Library cutover. Every runtime consumer that needs
 * to evaluate a product's formula MUST go through this helper:
 *
 *   workbench / entitlement / award / payment / simulation
 *        ↓
 *   runProductCalculation(productVersionId, claimContext)
 *        ↓
 *   loadProductCalculationConfig  (Formula Library + product overrides)
 *   loadResolverMap               (Fact / Derived Fact / Parameter / Prior)
 *   parseFormula + evaluateFormula
 *   applyCapsAndRounding
 *
 * No other path may read formula expressions or evaluate them directly.
 */
import {
  loadProductCalculationConfig,
  applyCapsAndRounding,
  type ProductCalculationConfig,
} from './productCalculationLoader';
import {
  loadResolverMap,
  classifyVariables,
  type ResolverMap,
  type ResolvedVariable,
  type UnresolvedVariable,
} from './variableResolverService';
import { parseFormula, evaluateFormula } from '@/lib/bn/formulaParser';

export interface ProductCalculationContext {
  /** Values the resolver could not infer (claim-supplied, prior result, etc.). */
  inputs?: Record<string, number>;
  /** When true, missing variables are auto-filled with 0 / sample. Used by the simulator. */
  useSamples?: boolean;
}

export interface ProductCalculationTraceEntry {
  variable: string;
  source: ResolvedVariable['source'] | 'INPUT' | 'PARAMETER' | 'UNRESOLVED';
  value: number | null;
  resolverPath: string;
}

export interface ProductCalculationResult {
  productVersionId: string;
  template: ProductCalculationConfig['template'];
  rawValue: number;
  finalValue: number;
  variablesUsed: string[];
  unresolved: UnresolvedVariable[];
  trace: ProductCalculationTraceEntry[];
  warnings: string[];
  errors: string[];
}

export async function runProductCalculation(
  productVersionId: string,
  ctx: ProductCalculationContext = {},
): Promise<ProductCalculationResult> {
  const config = await loadProductCalculationConfig(productVersionId);
  const resolver: ResolverMap = await loadResolverMap();

  const parsed = parseFormula(config.template.formula_expression, resolver);
  const variablesUsed = parsed.variablesUsed;

  const { unresolved } = classifyVariables(variablesUsed, resolver);

  // Build evaluation context: parameter values > caller inputs > resolver sample.
  const evalCtx: Record<string, number> = {};
  const trace: ProductCalculationTraceEntry[] = [];
  const warnings: string[] = [];

  for (const v of variablesUsed) {
    const fromParam = config.parameters[v];
    if (fromParam !== undefined && fromParam !== null) {
      const n = Number(fromParam);
      evalCtx[v] = n;
      trace.push({ variable: v, source: 'PARAMETER', value: n, resolverPath: `bn_product_version.formula_parameter_values.${v}` });
      continue;
    }
    const fromInput = ctx.inputs?.[v];
    if (typeof fromInput === 'number' && Number.isFinite(fromInput)) {
      evalCtx[v] = fromInput;
      trace.push({ variable: v, source: 'INPUT', value: fromInput, resolverPath: `context.inputs.${v}` });
      continue;
    }
    const resolved = resolver.get(v);
    if (resolved) {
      const n = resolved.sampleValue !== null && resolved.sampleValue !== undefined ? Number(resolved.sampleValue) : NaN;
      if (Number.isFinite(n)) {
        evalCtx[v] = n;
        trace.push({ variable: v, source: resolved.source, value: n, resolverPath: `${resolved.source}:${resolved.code}` });
        continue;
      }
      if (ctx.useSamples) {
        evalCtx[v] = 0;
        trace.push({ variable: v, source: resolved.source, value: 0, resolverPath: `${resolved.source}:${resolved.code} (no sample, filled 0)` });
        warnings.push(`Variable "${v}" has no sample value; defaulted to 0.`);
        continue;
      }
    }
    trace.push({ variable: v, source: 'UNRESOLVED', value: null, resolverPath: 'unresolved' });
    if (!ctx.useSamples) {
      // record but don't blow up — let caller decide whether to proceed
    }
  }

  const errors: string[] = [];
  if (parsed.errors.length) errors.push(...parsed.errors);
  if (unresolved.length) errors.push(`Unresolved variables: ${unresolved.map((u) => u.variable).join(', ')}`);

  let rawValue = NaN;
  if (parsed.ast) {
    try {
      rawValue = evaluateFormula(parsed.ast, evalCtx);
    } catch (e: any) {
      errors.push(`evaluateFormula failed: ${e?.message ?? 'unknown'}`);
    }
  }

  const finalValue = Number.isFinite(rawValue)
    ? applyCapsAndRounding(rawValue, config.capRules, config.rounding)
    : rawValue;

  return {
    productVersionId,
    template: config.template,
    rawValue,
    finalValue,
    variablesUsed,
    unresolved,
    trace,
    warnings,
    errors,
  };
}
