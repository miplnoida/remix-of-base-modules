
-- Fix check_vc_eligibility: accept 'SKN' instead of 'STK'/'NEV'
CREATE OR REPLACE FUNCTION public.check_vc_eligibility(p_ssn text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  -- Get IP record
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

  -- Get VC config
  SELECT * INTO v_config
  FROM tb_vc_contrib_rate
  WHERE is_active = true
  ORDER BY effstart DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'errors', jsonb_build_array(jsonb_build_object(
        'code', 'NO_CONFIG',
        'message', 'No active voluntary contributor configuration found'
      ))
    );
  END IF;

  -- Check 1: Residency - accept SKN as valid
  IF COALESCE(v_ip_record.place_of_residence_code, v_ip_record.place_of_residence, '') NOT IN ('SKN') THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'INVALID_RESIDENCY',
      'message', 'Place of residence must be St. Kitts & Nevis (SKN). Current: ' || COALESCE(v_ip_record.place_of_residence_code, v_ip_record.place_of_residence, 'Not Set')
    ));
  END IF;

  -- Check 2: Age
  v_age := EXTRACT(YEAR FROM age(CURRENT_DATE, v_ip_record.dob));
  IF v_age < COALESCE(v_config.min_age, 16) OR v_age > COALESCE(v_config.max_age, 62) THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'AGE_OUT_OF_RANGE',
      'message', 'Age must be between ' || COALESCE(v_config.min_age, 16) || ' and ' || COALESCE(v_config.max_age, 62) || '. Current age: ' || v_age
    ));
  END IF;

  -- Check 3: No active employment
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

  -- Check 4: Not an assistance pensioner
  IF COALESCE(v_ip_record.asp_num, '') = 'Y' THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'ASSISTANCE_PENSIONER',
      'message', 'Assistance pensioners are not eligible for voluntary contributions'
    ));
  END IF;

  -- Check 5: Termination grace period
  SELECT MAX(term_end_date) INTO v_last_term_date
  FROM ip_employer
  WHERE ssn = p_ssn AND term_end_date IS NOT NULL;

  IF v_last_term_date IS NOT NULL THEN
    v_grace_deadline := v_last_term_date + (COALESCE(v_config.termination_grace_weeks, 13) * 7);
    IF CURRENT_DATE > v_grace_deadline THEN
      v_is_eligible := false;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'code', 'GRACE_PERIOD_EXPIRED',
        'message', 'Registration must occur within ' || COALESCE(v_config.termination_grace_weeks, 13) || ' weeks of employment termination. Last termination: ' || v_last_term_date::text || ', Deadline: ' || v_grace_deadline::text
      ));
    END IF;
  END IF;

  -- Check 6: No active VC record
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
      'place_of_residence', COALESCE(v_ip_record.place_of_residence_code, v_ip_record.place_of_residence, ''),
      'vol_contrib', COALESCE(v_ip_record.vol_contrib, 'N')
    ),
    'config', jsonb_build_object(
      'min_age', COALESCE(v_config.min_age, 16),
      'max_age', COALESCE(v_config.max_age, 62),
      'contrib_pct', COALESCE(v_config.vc_contrib_pct, 10),
      'termination_grace_weeks', COALESCE(v_config.termination_grace_weeks, 13),
      'wage_history_months', COALESCE(v_config.wage_history_months, 24)
    )
  );
END;
$$;

-- Fix residency trigger to also use SKN
CREATE OR REPLACE FUNCTION public.check_vc_residency_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_residence text;
  v_new_residence text;
  v_has_active_vc boolean;
BEGIN
  v_old_residence := COALESCE(OLD.place_of_residence_code, OLD.place_of_residence, '');
  v_new_residence := COALESCE(NEW.place_of_residence_code, NEW.place_of_residence, '');

  IF v_old_residence IS DISTINCT FROM v_new_residence THEN
    IF v_new_residence NOT IN ('SKN') THEN
      SELECT EXISTS (
        SELECT 1 FROM ip_vol_contrib
        WHERE ssn = NEW.ssn AND date_ceased IS NULL
      ) INTO v_has_active_vc;

      IF v_has_active_vc THEN
        UPDATE ip_vol_contrib
        SET date_ceased = CURRENT_DATE
        WHERE ssn = NEW.ssn AND date_ceased IS NULL;

        UPDATE ip_master
        SET vol_contrib = 'N'
        WHERE ssn = NEW.ssn;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
