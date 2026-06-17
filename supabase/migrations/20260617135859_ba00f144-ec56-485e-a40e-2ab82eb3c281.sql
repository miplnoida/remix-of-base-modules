
-- 1. Usage check
CREATE OR REPLACE FUNCTION public.bn_formula_check_usage(_template_id uuid)
RETURNS TABLE(binding_count integer, active_version_count integer, total_versions integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*)::int FROM bn_product_formula_binding b
       JOIN bn_formula_version v ON v.id = b.formula_version_id
       WHERE v.formula_template_id = _template_id),
    (SELECT COUNT(*)::int FROM bn_formula_version
       WHERE formula_template_id = _template_id AND governance_status = 'ACTIVE'),
    (SELECT COUNT(*)::int FROM bn_formula_version
       WHERE formula_template_id = _template_id);
$$;

-- 2. Clone template (creates new template + DRAFT v1)
CREATE OR REPLACE FUNCTION public.bn_formula_clone_template(
  _template_id uuid, _new_code text, _new_name text, _user_code text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _new_id uuid;
  _src record;
BEGIN
  SELECT * INTO _src FROM bn_formula_template WHERE id = _template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source formula % not found', _template_id; END IF;
  IF EXISTS (SELECT 1 FROM bn_formula_template WHERE UPPER(template_code) = UPPER(_new_code)) THEN
    RAISE EXCEPTION 'Code % already exists', _new_code;
  END IF;

  INSERT INTO bn_formula_template (
    template_code, template_name, description, formula_expression, input_variables,
    output_type, country_code, is_active, entered_by, category, output_variable,
    required_variables, variable_source_map, default_sample_values, rounding_rule,
    frequency, governance_status, legal_reference, variable_bindings,
    validation_status, validation_errors, required_parameters
  ) VALUES (
    _new_code, _new_name, _src.description, _src.formula_expression, _src.input_variables,
    _src.output_type, _src.country_code, true, _user_code, _src.category, _src.output_variable,
    _src.required_variables, _src.variable_source_map, _src.default_sample_values, _src.rounding_rule,
    _src.frequency, 'DRAFT', _src.legal_reference, _src.variable_bindings,
    'PENDING', '[]'::jsonb, _src.required_parameters
  ) RETURNING id INTO _new_id;

  -- Seed v1 DRAFT for the clone
  INSERT INTO bn_formula_version (
    formula_template_id, formula_code, version_no, expression_type, expression,
    output_variable, rounding_rule, governance_status, is_active, entered_by, notes
  ) VALUES (
    _new_id, _new_code, 1, 'EXPRESSION', _src.formula_expression,
    _src.output_variable, _src.rounding_rule, 'DRAFT', false, _user_code,
    'Cloned from ' || _src.template_code
  );
  RETURN _new_id;
END $$;

-- 3. Create new version from latest
CREATE OR REPLACE FUNCTION public.bn_formula_new_version(_template_id uuid, _user_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _next_no integer;
  _new_id uuid;
  _tpl record;
  _src record;
BEGIN
  SELECT * INTO _tpl FROM bn_formula_template WHERE id = _template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Template % not found', _template_id; END IF;

  IF EXISTS (
    SELECT 1 FROM bn_formula_version
    WHERE formula_template_id = _template_id AND governance_status = 'DRAFT'
  ) THEN
    RAISE EXCEPTION 'A DRAFT version already exists. Edit or submit it first.';
  END IF;

  SELECT COALESCE(MAX(version_no), 0) + 1 INTO _next_no
    FROM bn_formula_version WHERE formula_template_id = _template_id;

  SELECT * INTO _src FROM bn_formula_version
    WHERE formula_template_id = _template_id
    ORDER BY version_no DESC LIMIT 1;

  INSERT INTO bn_formula_version (
    formula_template_id, formula_code, version_no, expression_type, expression,
    output_variable, rounding_rule, governance_status, is_active, entered_by, notes, steps_json
  ) VALUES (
    _template_id, _tpl.template_code, _next_no,
    COALESCE(_src.expression_type, 'EXPRESSION'),
    COALESCE(_src.expression, _tpl.formula_expression),
    COALESCE(_src.output_variable, _tpl.output_variable),
    COALESCE(_src.rounding_rule, _tpl.rounding_rule),
    'DRAFT', false, _user_code,
    'New version from v' || COALESCE(_src.version_no::text, '0'),
    COALESCE(_src.steps_json, '{}'::jsonb)
  ) RETURNING id INTO _new_id;
  RETURN _new_id;
END $$;

-- 4. Status transition guard
CREATE OR REPLACE FUNCTION public.bn_formula_transition_version(
  _version_id uuid, _new_status text, _user_code text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cur record;
  _allowed boolean := false;
BEGIN
  SELECT * INTO _cur FROM bn_formula_version WHERE id = _version_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Version % not found', _version_id; END IF;

  _allowed := (
    (_cur.governance_status = 'DRAFT'     AND _new_status = 'IN_REVIEW') OR
    (_cur.governance_status = 'IN_REVIEW' AND _new_status IN ('ACTIVE','DRAFT')) OR
    (_cur.governance_status = 'ACTIVE'    AND _new_status = 'RETIRED')
  );
  IF NOT _allowed THEN
    RAISE EXCEPTION 'Illegal transition % → %', _cur.governance_status, _new_status;
  END IF;

  IF _new_status = 'ACTIVE' THEN
    -- Retire any other active version of the same template
    UPDATE bn_formula_version
       SET governance_status = 'RETIRED', is_active = false,
           modified_by = _user_code, updated_at = now(),
           effective_to = COALESCE(effective_to, CURRENT_DATE)
     WHERE formula_template_id = _cur.formula_template_id
       AND governance_status = 'ACTIVE'
       AND id <> _version_id;
    UPDATE bn_formula_version
       SET governance_status = 'ACTIVE', is_active = true,
           modified_by = _user_code, updated_at = now(),
           effective_from = COALESCE(effective_from, CURRENT_DATE)
     WHERE id = _version_id;
  ELSIF _new_status = 'RETIRED' THEN
    UPDATE bn_formula_version
       SET governance_status = 'RETIRED', is_active = false,
           modified_by = _user_code, updated_at = now(),
           effective_to = COALESCE(effective_to, CURRENT_DATE)
     WHERE id = _version_id;
  ELSE
    UPDATE bn_formula_version
       SET governance_status = _new_status, modified_by = _user_code, updated_at = now()
     WHERE id = _version_id;
  END IF;
END $$;

-- 5. Safe delete (refuse if bound or has ACTIVE versions)
CREATE OR REPLACE FUNCTION public.bn_formula_safe_delete_template(_template_id uuid, _user_code text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bindings int; _active int;
BEGIN
  SELECT COUNT(*) INTO _bindings FROM bn_product_formula_binding b
    JOIN bn_formula_version v ON v.id = b.formula_version_id
    WHERE v.formula_template_id = _template_id;
  IF _bindings > 0 THEN
    RAISE EXCEPTION 'Cannot delete: formula is used by % product binding(s). Retire it instead.', _bindings;
  END IF;
  SELECT COUNT(*) INTO _active FROM bn_formula_version
    WHERE formula_template_id = _template_id AND governance_status = 'ACTIVE';
  IF _active > 0 THEN
    RAISE EXCEPTION 'Cannot delete: template has ACTIVE versions. Retire them first.';
  END IF;
  DELETE FROM bn_formula_version WHERE formula_template_id = _template_id;
  DELETE FROM bn_formula_template WHERE id = _template_id;
END $$;

GRANT EXECUTE ON FUNCTION public.bn_formula_check_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bn_formula_clone_template(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bn_formula_new_version(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bn_formula_transition_version(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bn_formula_safe_delete_template(uuid, text) TO authenticated;
