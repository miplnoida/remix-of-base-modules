/**
 * productCalculationLoader
 *
 * Single read path that translates a `bn_product_version` row into the
 * canonical calculation configuration used by every runtime consumer
 * (workbench, entitlement, award, payment, simulation).
 *
 * Strictly modern columns only — `calculation_config` / `calculation_config_legacy`
 * are intentionally NOT read. See docs/bn/formula-cutover-audit.md.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface CapRules {
  min?: number | null;
  max?: number | null;
  // arbitrary additional keys (per-product) are preserved
  [key: string]: unknown;
}

export interface RoundingRule {
  mode?: 'NONE' | 'NEAREST' | 'UP' | 'DOWN' | 'BANKERS';
  precision?: number;
  [key: string]: unknown;
}

export interface ProductCalculationConfig {
  productVersionId: string;
  template: {
    id: string;
    template_code: string;
    template_name: string;
    formula_expression: string;
    governance_status: string;
    required_parameters: string[];
    output_variable: string | null;
    output_type: string | null;
  };
  parameters: Record<string, unknown>;
  capRules: CapRules;
  rounding: RoundingRule;
  effectiveDateRule: Record<string, unknown> | null;
}

export async function loadProductCalculationConfig(
  productVersionId: string,
): Promise<ProductCalculationConfig> {
  const { data: v, error: vErr } = await db
    .from('bn_product_version')
    .select(
      'id, formula_template_id, formula_parameter_values, cap_rules, rounding_rule, effective_date_rule',
    )
    .eq('id', productVersionId)
    .single();
  if (vErr) throw vErr;
  if (!v) throw new Error(`Product version ${productVersionId} not found`);
  if (!v.formula_template_id) {
    throw new Error(
      `Product version ${productVersionId} has no formula_template_id — pick a formula from the Formula Library.`,
    );
  }

  const { data: t, error: tErr } = await db
    .from('bn_formula_template')
    .select(
      'id, template_code, template_name, formula_expression, governance_status, required_parameters, output_variable, output_type',
    )
    .eq('id', v.formula_template_id)
    .single();
  if (tErr) throw tErr;
  if (!t) throw new Error(`Formula template ${v.formula_template_id} not found`);

  return {
    productVersionId: v.id,
    template: {
      ...t,
      required_parameters: Array.isArray(t.required_parameters)
        ? (t.required_parameters as string[])
        : [],
    },
    parameters: (v.formula_parameter_values as Record<string, unknown>) ?? {},
    capRules: (v.cap_rules as CapRules) ?? {},
    rounding: (v.rounding_rule as RoundingRule) ?? {},
    effectiveDateRule:
      (v.effective_date_rule as Record<string, unknown>) ?? null,
  };
}

export function applyCapsAndRounding(
  value: number,
  caps: CapRules,
  rounding: RoundingRule,
): number {
  let v = value;
  if (typeof caps.min === 'number') v = Math.max(v, caps.min);
  if (typeof caps.max === 'number') v = Math.min(v, caps.max);
  const precision = Number.isFinite(rounding.precision)
    ? Number(rounding.precision)
    : 2;
  const factor = Math.pow(10, precision);
  switch (rounding.mode) {
    case 'UP':
      return Math.ceil(v * factor) / factor;
    case 'DOWN':
      return Math.floor(v * factor) / factor;
    case 'NEAREST':
    case 'BANKERS':
      return Math.round(v * factor) / factor;
    case 'NONE':
    default:
      return v;
  }
}
