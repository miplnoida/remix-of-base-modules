-- Fix the check_vc_eligibility function - type issue with date subtraction
CREATE OR REPLACE FUNCTION public.check_vc_eligibility(p_ssn VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ip_record RECORD;
  v_age INTEGER;
  v_config RECORD;
  v_active_employment RECORD;
  v_last_employment_end DATE;
  v_last_self_emp_end DATE;
  v_termination_date DATE;
  v_weeks_since_termination INTEGER;
  v_today DATE := CURRENT_DATE;
  v_errors JSONB := '[]'::JSONB;
  v_is_eligible BOOLEAN := true;
  v_active_vc RECORD;
BEGIN
  -- Get VC configuration
  SELECT * INTO v_config
  FROM public.tb_vc_contrib_rate
  WHERE is_active = true
    AND effstart <= v_today
    AND (effend IS NULL OR effend >= v_today)
  ORDER BY effstart DESC
  LIMIT 1;
  
  IF v_config IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'errors', '[{"code": "NO_CONFIG", "message": "Voluntary contributor configuration not found"}]'::JSONB
    );
  END IF;

  -- Get IP master record
  SELECT * INTO v_ip_record
  FROM public.ip_master
  WHERE ssn = p_ssn;
  
  IF v_ip_record IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'errors', '[{"code": "SSN_NOT_FOUND", "message": "Insured person not found with the given SSN"}]'::JSONB
    );
  END IF;

  -- Check if already an active voluntary contributor
  SELECT * INTO v_active_vc
  FROM public.ip_vol_contrib
  WHERE ssn = p_ssn AND date_ceased IS NULL;
  
  IF v_active_vc IS NOT NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'errors', '[{"code": "ALREADY_VC", "message": "This person is already registered as an active voluntary contributor"}]'::JSONB
    );
  END IF;

  -- Check 1: Residency (place_of_residence_code must be STK or NEV)
  IF COALESCE(v_ip_record.place_of_residence_code, v_ip_record.place_of_residence, '') NOT IN ('STK', 'NEV') THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'INVALID_RESIDENCY',
      'message', 'Place of residence must be St. Kitts (STK) or Nevis (NEV). Current: ' || COALESCE(v_ip_record.place_of_residence_code, v_ip_record.place_of_residence, 'Not Set')
    ));
  END IF;

  -- Check 2: Age (between min_age and max_age inclusive)
  v_age := EXTRACT(YEAR FROM AGE(v_today, COALESCE(v_ip_record.dob, v_ip_record.date_of_birth)::DATE));
  
  IF v_age IS NULL THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'NO_DOB',
      'message', 'Date of birth is required to verify age eligibility'
    ));
  ELSIF v_age < v_config.min_age OR v_age > v_config.max_age THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'AGE_OUT_OF_RANGE',
      'message', format('Age must be between %s and %s years. Current age: %s', v_config.min_age, v_config.max_age, v_age)
    ));
  END IF;

  -- Check 3: Not actively employed (no record with term_end_date IS NULL)
  SELECT * INTO v_active_employment
  FROM public.ip_employer
  WHERE ssn = p_ssn 
    AND term_end_date IS NULL
    AND posting_status = 'VAC'
  LIMIT 1;
  
  IF v_active_employment IS NOT NULL THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'ACTIVELY_EMPLOYED',
      'message', 'Cannot register as voluntary contributor while actively employed. Current employer: ' || v_active_employment.employer_id
    ));
  END IF;

  -- Check 4: Not an assistance pensioner (asp_num != 'Y')
  IF COALESCE(v_ip_record.asp_num, 'N') = 'Y' THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'ASSISTANCE_PENSIONER',
      'message', 'Assistance pensioners are not eligible for voluntary contribution'
    ));
  END IF;

  -- Check 5: Termination timeline (within termination_grace_weeks of last employment/self-employment)
  -- Only check if not actively employed
  IF v_active_employment IS NULL THEN
    -- Get last employment end date
    SELECT MAX(term_end_date) INTO v_last_employment_end
    FROM public.ip_employer
    WHERE ssn = p_ssn 
      AND term_end_date IS NOT NULL
      AND posting_status = 'VAC';
    
    -- Get last self-employment cessation date
    SELECT MAX(effective_end_date::DATE) INTO v_last_self_emp_end
    FROM public.ip_self_category
    WHERE ssn = p_ssn 
      AND effective_end_date IS NOT NULL;
    
    -- Determine the most recent termination date
    v_termination_date := GREATEST(COALESCE(v_last_employment_end, '1900-01-01'::DATE), COALESCE(v_last_self_emp_end, '1900-01-01'::DATE));
    
    -- If there was prior employment or self-employment, check grace period
    IF v_termination_date > '1900-01-01'::DATE THEN
      v_weeks_since_termination := FLOOR((v_today - v_termination_date)::INTEGER / 7)::INTEGER;
      
      IF v_weeks_since_termination > v_config.termination_grace_weeks THEN
        v_is_eligible := false;
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'code', 'GRACE_PERIOD_EXPIRED',
          'message', format('Registration must occur within %s weeks of employment termination. Last termination: %s (%s weeks ago)', 
            v_config.termination_grace_weeks, v_termination_date::TEXT, v_weeks_since_termination)
        ));
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'eligible', v_is_eligible,
    'errors', v_errors,
    'ip_details', jsonb_build_object(
      'ssn', p_ssn,
      'name', COALESCE(v_ip_record.surname || ', ' || v_ip_record.firstname, v_ip_record.last_name || ', ' || v_ip_record.first_name),
      'dob', COALESCE(v_ip_record.dob, v_ip_record.date_of_birth),
      'age', v_age,
      'place_of_residence', COALESCE(v_ip_record.place_of_residence_code, v_ip_record.place_of_residence),
      'vol_contrib', v_ip_record.vol_contrib
    ),
    'config', jsonb_build_object(
      'min_age', v_config.min_age,
      'max_age', v_config.max_age,
      'contrib_pct', v_config.vc_contrib_pct,
      'termination_grace_weeks', v_config.termination_grace_weeks,
      'wage_history_months', v_config.wage_history_months
    )
  );
END;
$$;