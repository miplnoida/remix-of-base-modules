
DO $$
DECLARE v_template_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.bn_formula_template WHERE template_code = 'SICKNESS_RATE_V1') THEN
    INSERT INTO public.bn_formula_template (
      template_code, template_name, description, category, output_type,
      output_variable, rounding_rule, governance_status, is_active,
      formula_expression, required_variables
    ) VALUES (
      'SICKNESS_RATE_V1', 'Sickness Benefit Rate',
      'Weekly sickness benefit = average insurable weekly wage × replacement rate',
      'SHORT_TERM', 'CURRENCY', 'weekly_amount', 'ROUND_HALF_UP', 'ACTIVE', true,
      'average_weekly_wage * replacement_rate',
      '["average_weekly_wage","replacement_rate"]'::jsonb
    ) RETURNING id INTO v_template_id;

    INSERT INTO public.bn_formula_version (
      formula_template_id, formula_code, version_no, expression_type,
      expression, steps_json, output_variable, rounding_rule,
      governance_status, is_active, effective_from
    ) VALUES (
      v_template_id, 'SICKNESS_RATE_V1', 1, 'SIMPLE_EXPRESSION',
      'average_weekly_wage * replacement_rate', '[]'::jsonb,
      'weekly_amount', 'ROUND_HALF_UP', 'ACTIVE', true, CURRENT_DATE
    );
  END IF;
END $$;
