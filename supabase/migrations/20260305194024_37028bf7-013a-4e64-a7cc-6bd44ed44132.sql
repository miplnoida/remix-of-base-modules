CREATE OR REPLACE FUNCTION get_income_code_policy_for_period(
  p_income_code_id uuid,
  p_period_year integer,
  p_period_month integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_period_date date;
  v_policy record;
  v_exception record;
BEGIN
  v_period_date := make_date(p_period_year, p_period_month + 1, 1);
  
  SELECT * INTO v_policy
  FROM c3_income_code_policy_default
  WHERE income_code_id = p_income_code_id
    AND is_active = true
    AND date_from::date <= v_period_date
    AND (date_to IS NULL OR date_to::date >= v_period_date)
  ORDER BY date_from DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'error', 'No active policy configured for this income code and period');
  END IF;
  
  SELECT * INTO v_exception
  FROM c3_income_code_policy_exceptions
  WHERE income_code_id = p_income_code_id
    AND is_active = true
    AND date_from::date <= v_period_date
    AND (date_to IS NULL OR date_to::date >= v_period_date)
    AND exception_month = EXTRACT(MONTH FROM v_period_date)::int
    AND year_from <= EXTRACT(YEAR FROM v_period_date)::int
    AND (year_to IS NULL OR year_to >= EXTRACT(YEAR FROM v_period_date)::int)
  ORDER BY date_from DESC
  LIMIT 1;
  
  RETURN jsonb_build_object(
    'found', true,
    'policy_id', v_policy.id,
    'date_entry_mode', v_policy.date_entry_mode,
    'policy_type', v_policy.policy_type,
    'has_exception', v_exception.id IS NOT NULL,
    'exception_id', v_exception.id,
    'levy_include', CASE 
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default THEN 
        COALESCE(v_exception.levy_include, v_exception.include_in_levy, false)
      WHEN v_policy.date_entry_mode = 'no_dates' THEN COALESCE(v_policy.include_in_levy, false)
      ELSE COALESCE(v_policy.levy_include, false)
    END,
    'ssc_contrib_employee', CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default THEN
        COALESCE(v_exception.ssc_contrib_employee, v_exception.contrib_employee, false)
      WHEN v_policy.date_entry_mode = 'no_dates' THEN COALESCE(v_policy.contrib_employee, false)
      ELSE COALESCE(v_policy.ssc_contrib_employee, false)
    END,
    'ssc_contrib_employer', CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default THEN
        COALESCE(v_exception.ssc_contrib_employer, v_exception.contrib_employer, false)
      WHEN v_policy.date_entry_mode = 'no_dates' THEN COALESCE(v_policy.contrib_employer, false)
      ELSE COALESCE(v_policy.ssc_contrib_employer, false)
    END,
    'contrib_eib', CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default THEN
        COALESCE(v_exception.ssc_contrib_eib, v_exception.contrib_eir, false)
      WHEN v_policy.date_entry_mode = 'no_dates' THEN COALESCE(v_policy.contrib_eir, false)
      ELSE COALESCE(v_policy.ssc_contrib_eib, false)
    END,
    'include_in_severance', CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default THEN
        COALESCE(v_exception.include_in_severance, false)
      WHEN v_policy.date_entry_mode = 'no_dates' THEN COALESCE(v_policy.include_in_severance, false)
      ELSE false
    END
  );
END;
$$;