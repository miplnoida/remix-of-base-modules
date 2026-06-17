
-- =========================================================
-- 1) Retire legacy duplicate templates (no useful versions)
-- =========================================================
UPDATE public.bn_formula_template
SET governance_status = 'RETIRED', is_active = false, modified_by = 'SEED-CLEANUP'
WHERE template_code IN ('PCT-AVG-WAGE','FLAT-GRANT','MEDICAL_PERCENT_REIMBURSEMENT');

-- =========================================================
-- 2) Seed ACTIVE v1 versions for 17 substantive SKN formulas
-- =========================================================
-- Helper: insert version + flip template to ACTIVE in one block per formula.
DO $$
DECLARE
  r RECORD;
  v_tid uuid;
  rows jsonb := '[
    {"code":"ARREARS_CALCULATION",          "type":"SIMPLE_EXPRESSION", "expr":"periodic_amount * number_of_periods_due",                   "out":"calculated_amount"},
    {"code":"CHILD_SURVIVOR_AMOUNT",        "type":"SIMPLE_EXPRESSION", "expr":"base_pension * child_share_percent",                        "out":"calculated_amount"},
    {"code":"CONTRIBUTION_BASED_GRANT",     "type":"SIMPLE_EXPRESSION", "expr":"average_weekly_wage * grant_multiplier * contribution_units","out":"grant_amount"},
    {"code":"CONTRIBUTION_BASED_PENSION",   "type":"SIMPLE_EXPRESSION", "expr":"average_insurable_wage * pension_rate",                     "out":"calculated_amount"},
    {"code":"DAILY_FROM_WEEKLY_RATE",       "type":"SIMPLE_EXPRESSION", "expr":"average_weekly_wage / payable_days_per_week",               "out":"daily_rate"},
    {"code":"FIXED_GRANT_AMOUNT",           "type":"SIMPLE_EXPRESSION", "expr":"grant_amount",                                              "out":"grant_amount"},
    {"code":"MONTHLY_FROM_WEEKLY",          "type":"SIMPLE_EXPRESSION", "expr":"average_weekly_wage * 52 / 12",                             "out":"monthly_amount"},
    {"code":"NCP_MONTHLY_RATE",             "type":"SIMPLE_EXPRESSION", "expr":"flat_weekly_rate * 52 / 12",                                "out":"monthly_amount"},
    {"code":"PARTIAL_PERIOD_PRORATION",     "type":"SIMPLE_EXPRESSION", "expr":"periodic_amount * payable_days / total_period_days",        "out":"calculated_amount"},
    {"code":"PENSION_WITH_MIN_MAX_CAP",     "type":"SIMPLE_EXPRESSION", "expr":"base_amount",                                               "out":"calculated_amount"},
    {"code":"PERMANENT_DISABLEMENT_PENSION","type":"SIMPLE_EXPRESSION", "expr":"average_weekly_wage * disablement_percentage",              "out":"calculated_amount"},
    {"code":"RETROACTIVE_PAYMENT",          "type":"SIMPLE_EXPRESSION", "expr":"monthly_amount * retroactive_months",                       "out":"calculated_amount"},
    {"code":"SHORT_TERM_PERIOD_AMOUNT",     "type":"SIMPLE_EXPRESSION", "expr":"daily_rate * payable_days",                                 "out":"period_amount"},
    {"code":"SHORT_TERM_WEEKLY_CAP",        "type":"SIMPLE_EXPRESSION", "expr":"average_weekly_wage * replacement_rate",                    "out":"calculated_amount"},
    {"code":"SHORT_TERM_WITH_WAITING_DAYS", "type":"SIMPLE_EXPRESSION", "expr":"daily_rate * (approved_days - 3)",                          "out":"period_amount"},
    {"code":"SPOUSE_SURVIVOR_AMOUNT",       "type":"SIMPLE_EXPRESSION", "expr":"base_pension * spouse_share_percent",                       "out":"calculated_amount"},
    {"code":"SURVIVOR_TOTAL_CAP",           "type":"SIMPLE_EXPRESSION", "expr":"total_survivor_amount",                                     "out":"calculated_amount"}
  ]'::jsonb;
BEGIN
  FOR r IN SELECT * FROM jsonb_to_recordset(rows) AS x(code text, type text, expr text, out text)
  LOOP
    SELECT id INTO v_tid FROM public.bn_formula_template WHERE template_code = r.code;
    IF v_tid IS NULL THEN CONTINUE; END IF;

    -- Skip if a version already exists
    IF EXISTS (SELECT 1 FROM public.bn_formula_version WHERE formula_template_id = v_tid) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.bn_formula_version (
      formula_template_id, formula_code, version_no, expression_type,
      expression, output_variable, governance_status, is_active,
      effective_from, entered_by, notes
    ) VALUES (
      v_tid, r.code, 1, r.type, r.expr, r.out, 'ACTIVE', true,
      CURRENT_DATE, 'SEED-SKN', 'Seeded St Kitts & Nevis benefit formula (v1).'
    );

    UPDATE public.bn_formula_template
       SET governance_status = 'ACTIVE', is_active = true, modified_by = 'SEED-SKN'
     WHERE id = v_tid;
  END LOOP;
END$$;

-- =========================================================
-- 3) Activation guard RPC for Product Catalog
-- =========================================================
CREATE OR REPLACE FUNCTION public.bn_product_can_activate(_product_id uuid)
RETURNS TABLE (can_activate boolean, blocker_code text, blocker_message text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_binding_count   int;
  v_inactive_count  int;
  v_unmapped_count  int;
BEGIN
  -- Must have at least one formula binding
  SELECT COUNT(*) INTO v_binding_count
  FROM public.bn_product_formula_binding
  WHERE product_id = _product_id;

  IF v_binding_count = 0 THEN
    RETURN QUERY SELECT false, 'NO_FORMULA_BOUND',
      'Product has no formula binding. Bind an ACTIVE formula version before activating.';
    RETURN;
  END IF;

  -- Every binding must point at an ACTIVE formula version
  SELECT COUNT(*) INTO v_inactive_count
  FROM public.bn_product_formula_binding b
  LEFT JOIN public.bn_formula_version v ON v.id = b.formula_version_id
  WHERE b.product_id = _product_id
    AND (v.id IS NULL OR v.governance_status <> 'ACTIVE');

  IF v_inactive_count > 0 THEN
    RETURN QUERY SELECT false, 'FORMULA_NOT_ACTIVE',
      format('%s formula binding(s) reference a non-ACTIVE version. Activate the formula first or rebind to an ACTIVE version.', v_inactive_count);
    RETURN;
  END IF;

  -- Variables declared on the version must all have a mapping row
  SELECT COUNT(*) INTO v_unmapped_count
  FROM public.bn_product_formula_binding b
  JOIN public.bn_formula_version v ON v.id = b.formula_version_id
  LEFT JOIN public.bn_product_formula_variable_mapping m
    ON m.product_formula_binding_id = b.id
  WHERE b.product_id = _product_id
    AND v.expression IS NOT NULL
    AND v.expression <> ''
    AND m.id IS NULL;

  IF v_unmapped_count > 0 THEN
    RETURN QUERY SELECT false, 'VARIABLES_UNMAPPED',
      'One or more formula bindings have no variable mappings. Map every formula variable to a product parameter or data source.';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text, NULL::text;
END$$;

GRANT EXECUTE ON FUNCTION public.bn_product_can_activate(uuid) TO authenticated, service_role;
