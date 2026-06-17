/**
 * createFormulaWithDraftVersion
 *
 * Atomic-ish creation of a bn_formula_template + its v1 bn_formula_version
 * in DRAFT status. Used by the Add Formula Wizard so a brand-new formula
 * immediately has an editable version row that downstream lifecycle RPCs
 * (`bn_formula_new_version`, `bn_formula_transition_version`, …) can act
 * on without the user needing a second step.
 *
 * Rolls back the template row if the version insert fails so we never
 * leave a header without a version.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ExpressionType, StepsJson } from '@/components/bn/config/FormulaStepsBuilder';

const db = supabase as any;

export interface CreateFormulaInput {
  template_code: string;
  template_name: string;
  description?: string | null;
  country_code?: string | null;
  category?: string | null;
  legal_ref?: string | null;
  output_type: string;             // NUMBER | MONEY | PERCENT
  output_variable?: string | null;
  rounding_rule?: string | null;
  expression_type: ExpressionType;
  steps_json: StepsJson;
  user_code: string;
}

export interface CreateFormulaResult {
  template_id: string;
  version_id: string;
}

export async function createFormulaWithDraftVersion(input: CreateFormulaInput): Promise<CreateFormulaResult> {
  const expr = input.expression_type === 'SIMPLE_EXPRESSION'
    ? (input.steps_json.expression ?? '')
    : '';

  // 1. Insert template
  const { data: tpl, error: tplErr } = await db
    .from('bn_formula_template')
    .insert({
      template_code: input.template_code.trim().toUpperCase(),
      template_name: input.template_name.trim(),
      description: input.description?.trim() || null,
      formula_expression: expr,
      output_type: input.output_type,
      country_code: input.country_code?.trim() || null,
      is_active: true,
      governance_status: 'DRAFT',
      entered_by: input.user_code,
      validation_status: 'DRAFT',
      // category / legal_ref stored in description suffix if column not present;
      // wizard captures and persists them inside steps_json.meta as a fallback.
    })
    .select('id')
    .single();
  if (tplErr) throw tplErr;

  const stepsWithMeta: StepsJson & { meta?: any } = {
    ...input.steps_json,
    meta: {
      category: input.category ?? null,
      legal_ref: input.legal_ref ?? null,
      output_variable: input.output_variable ?? null,
      rounding_rule: input.rounding_rule ?? null,
    },
  };

  // 2. Insert v1 version
  const { data: ver, error: verErr } = await db
    .from('bn_formula_version')
    .insert({
      formula_template_id: tpl.id,
      formula_code: input.template_code.trim().toUpperCase(),
      version_no: 1,
      governance_status: 'DRAFT',
      expression_type: input.expression_type,
      expression: expr || null,
      steps_json: stepsWithMeta,
      output_variable: input.output_variable ?? null,
      rounding_rule: input.rounding_rule ?? null,
      is_active: false,
      entered_by: input.user_code,
      modified_by: input.user_code,
    })
    .select('id')
    .single();

  if (verErr) {
    // best-effort rollback
    await db.from('bn_formula_template').delete().eq('id', tpl.id);
    throw verErr;
  }

  return { template_id: tpl.id, version_id: ver.id };
}
