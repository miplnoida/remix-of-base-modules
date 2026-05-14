CREATE OR REPLACE FUNCTION public.check_vc_eligibility(p_ssn text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_ip_record RECORD;
  v_is_eligible boolean := true;
  v_errors jsonb := '[]'::jsonb;
  v_config RECORD;
  v_age integer;
  v_active_employment boolean;
  v_active_vc boolean;
  v_last_term_date date;
  v_grace_deadline date;
  v_min_age integer := 16;
  v_max_age integer := 62;
  v_termination_grace_weeks integer := 13;
  v_wage_history_months integer := 24;
  v_contrib_pct numeric := 10;
BEGIN
  SELECT * INTO v_ip_record
  FROM ip_master
  WHERE ssn = p_ssn;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'errors', jsonb_build_array(jsonb_build_object(
        'code', 'SSN_NOT_FOUND',
        'message', 'No insured person found with SSN: ' || p_ssn
      ))
    );
  END IF;

  SELECT * INTO v_config
  FROM tb_vc_contrib_rate
  WHERE CURRENT_TIMESTAMP BETWEEN effstart AND COALESCE(effend, '2099-12-31'::timestamp)
  ORDER BY effstart DESC
  LIMIT 1;

  IF FOUND THEN
    v_contrib_pct := COALESCE(v_config.vc_contrib_pct, v_contrib_pct);
    v_termination_grace_weeks := COALESCE(v_config.min_contrib_weeks, v_termination_grace_weeks);
  END IF;

  IF COALESCE(v_ip_record.place_of_residence, '') NOT IN ('SKN') THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'INVALID_RESIDENCY',
      'message', 'Place of residence must be St. Kitts & Nevis (SKN). Current: ' || COALESCE(v_ip_record.place_of_residence, 'Not Set')
    ));
  END IF;

  v_age := EXTRACT(YEAR FROM age(CURRENT_DATE, v_ip_record.dob));
  IF v_age < v_min_age OR v_age > v_max_age THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'AGE_OUT_OF_RANGE',
      'message', 'Age must be between ' || v_min_age || ' and ' || v_max_age || '. Current age: ' || v_age
    ));
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM ip_employer
    WHERE ssn = p_ssn AND term_end_date IS NULL
  ) INTO v_active_employment;

  IF v_active_employment THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'ACTIVE_EMPLOYMENT',
      'message', 'Cannot register as voluntary contributor while actively employed'
    ));
  END IF;

  IF COALESCE(v_ip_record.asp_num, '') = 'Y' THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'ASSISTANCE_PENSIONER',
      'message', 'Assistance pensioners are not eligible for voluntary contributions'
    ));
  END IF;

  SELECT MAX(term_end_date) INTO v_last_term_date
  FROM ip_employer
  WHERE ssn = p_ssn AND term_end_date IS NOT NULL;

  IF v_last_term_date IS NOT NULL THEN
    v_grace_deadline := v_last_term_date + (v_termination_grace_weeks * 7);
    IF CURRENT_DATE > v_grace_deadline THEN
      v_is_eligible := false;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'code', 'GRACE_PERIOD_EXPIRED',
        'message', 'Registration must occur within ' || v_termination_grace_weeks || ' weeks of employment termination. Last termination: ' || v_last_term_date::text || ', Deadline: ' || v_grace_deadline::text
      ));
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM ip_vol_contrib
    WHERE ssn = p_ssn AND date_ceased IS NULL
  ) INTO v_active_vc;

  IF v_active_vc THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'ALREADY_VC',
      'message', 'Already registered as an active voluntary contributor'
    ));
  END IF;

  RETURN jsonb_build_object(
    'eligible', v_is_eligible,
    'errors', v_errors,
    'ip_details', jsonb_build_object(
      'ssn', v_ip_record.ssn,
      'name', COALESCE(v_ip_record.firstname, '') || ' ' || COALESCE(v_ip_record.surname, ''),
      'dob', v_ip_record.dob,
      'age', v_age,
      'place_of_residence', COALESCE(v_ip_record.place_of_residence, ''),
      'vol_contrib', COALESCE(v_ip_record.vol_contrib, 'N')
    ),
    'config', jsonb_build_object(
      'min_age', v_min_age,
      'max_age', v_max_age,
      'contrib_pct', v_contrib_pct,
      'termination_grace_weeks', v_termination_grace_weeks,
      'wage_history_months', v_wage_history_months
    )
  );
END;
$function$;