
DROP FUNCTION IF EXISTS public.resolve_holiday_pay_policy(date, integer, integer, text);

CREATE FUNCTION public.resolve_holiday_pay_policy(
  p_period_date DATE,
  p_month INTEGER,
  p_year INTEGER,
  p_policy_type TEXT
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_exception RECORD;
  v_default RECORD;
  v_distribution_enabled BOOLEAN;
BEGIN
  SELECT * INTO v_exception
  FROM c3_holiday_pay_policy_exceptions
  WHERE is_active = true AND policy_type = p_policy_type
    AND exception_month = p_month AND year_from <= p_year
    AND (year_to IS NULL OR year_to >= p_year) AND override_default = true
  ORDER BY exception_type = 'onetime' DESC, year_from DESC LIMIT 1;

  IF FOUND THEN
    v_distribution_enabled := COALESCE(v_exception.distribution_enabled, false);
    IF v_distribution_enabled AND p_policy_type = 'with_dates' THEN
      v_result := jsonb_build_object(
        'source', 'exception', 'id', v_exception.id, 'policy_type', v_exception.policy_type,
        'distribution_enabled', true, 'levy_include', false, 'levy_calculation_method', 'merge',
        'levy_calc_flat_enabled', false, 'levy_calc_flat_percentage', NULL, 'levy_calc_slab_enabled', false,
        'levy_distribution', v_exception.levy_distribution,
        'ssc_include', false, 'ssc_contrib_employee', false, 'ssc_contrib_employer', false,
        'ssc_contrib_eib', false, 'include_in_severance', false);
    ELSE
      v_result := jsonb_build_object(
        'source', 'exception', 'id', v_exception.id, 'policy_type', v_exception.policy_type,
        'distribution_enabled', v_distribution_enabled,
        'levy_include', COALESCE(v_exception.levy_include, true),
        'levy_calculation_method', COALESCE(v_exception.levy_calculation_method, 'merge'),
        'levy_calc_flat_enabled', COALESCE(v_exception.levy_calc_flat_enabled, false),
        'levy_calc_flat_percentage', v_exception.levy_calc_flat_percentage,
        'levy_calc_slab_enabled', COALESCE(v_exception.levy_calc_slab_enabled, false),
        'levy_distribution', v_exception.levy_distribution,
        'ssc_include', COALESCE(v_exception.ssc_include, true),
        'ssc_contrib_employee', COALESCE(v_exception.ssc_contrib_employee, true),
        'ssc_contrib_employer', COALESCE(v_exception.ssc_contrib_employer, true),
        'ssc_contrib_eib', COALESCE(v_exception.ssc_contrib_eib, false),
        'include_in_severance', COALESCE(v_exception.include_in_severance, false));
    END IF;
    RETURN v_result;
  END IF;

  SELECT * INTO v_default
  FROM c3_holiday_pay_policy_default
  WHERE is_active = true AND policy_type = p_policy_type
    AND date_from <= p_period_date AND (date_to IS NULL OR date_to >= p_period_date)
  ORDER BY date_from DESC LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  v_distribution_enabled := COALESCE(v_default.distribution_enabled, false);
  IF v_distribution_enabled AND p_policy_type = 'with_dates' THEN
    v_result := jsonb_build_object(
      'source', 'default', 'id', v_default.id, 'policy_type', v_default.policy_type,
      'distribution_enabled', true, 'levy_include', false, 'levy_calculation_method', 'merge',
      'levy_calc_flat_enabled', false, 'levy_calc_flat_percentage', NULL, 'levy_calc_slab_enabled', false,
      'levy_distribution', v_default.levy_distribution,
      'ssc_include', false, 'ssc_contrib_employee', false, 'ssc_contrib_employer', false,
      'ssc_contrib_eib', false, 'include_in_severance', false);
  ELSE
    v_result := jsonb_build_object(
      'source', 'default', 'id', v_default.id, 'policy_type', v_default.policy_type,
      'distribution_enabled', v_distribution_enabled,
      'levy_include', v_default.levy_include, 'levy_calculation_method', v_default.levy_calculation_method,
      'levy_calc_flat_enabled', v_default.levy_calc_flat_enabled,
      'levy_calc_flat_percentage', v_default.levy_calc_flat_percentage,
      'levy_calc_slab_enabled', v_default.levy_calc_slab_enabled,
      'levy_distribution', v_default.levy_distribution,
      'ssc_include', v_default.ssc_include, 'ssc_contrib_employee', v_default.ssc_contrib_employee,
      'ssc_contrib_employer', v_default.ssc_contrib_employer, 'ssc_contrib_eib', v_default.ssc_contrib_eib,
      'include_in_severance', v_default.include_in_severance);
  END IF;
  RETURN v_result;
END;
$$;
