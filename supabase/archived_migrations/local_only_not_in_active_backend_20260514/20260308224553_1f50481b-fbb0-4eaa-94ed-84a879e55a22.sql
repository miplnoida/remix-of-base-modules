-- Resolve RPC ambiguity by keeping a single canonical signature
DROP FUNCTION IF EXISTS public.check_vc_eligibility(p_ssn text);

-- Keep the varchar signature used by existing callers/config and correct residency rule to SKN
CREATE OR REPLACE FUNCTION public.check_vc_eligibility(p_ssn character varying)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  SELECT * INTO v_config
  FROM public.tb_vc_eligibility_config
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

  SELECT * INTO v_ip_record
  FROM public.ip_master
  WHERE ssn = p_ssn;
  
  IF v_ip_record IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'errors', '[{"code": "SSN_NOT_FOUND", "message": "Insured person not found with the given SSN"}]'::JSONB
    );
  END IF;

  SELECT * INTO v_active_vc
  FROM public.ip_vol_contrib
  WHERE ssn = p_ssn AND date_ceased IS NULL;
  
  IF v_active_vc IS NOT NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'errors', '[{"code": "ALREADY_VC", "message": "This person is already registered as an active voluntary contributor"}]'::JSONB
    );
  END IF;

  -- Check 1: Residency (canonical: place_of_residence)
  IF COALESCE(v_ip_record.place_of_residence, '') <> 'SKN' THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'INVALID_RESIDENCY',
      'message', 'Place of residence must be St. Kitts & Nevis (SKN). Current: ' || COALESCE(v_ip_record.place_of_residence, 'Not Set')
    ));
  END IF;

  -- Check 2: Age (canonical: dob)
  v_age := EXTRACT(YEAR FROM AGE(v_today, v_ip_record.dob));
  
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

  IF COALESCE(v_ip_record.asp_num, 'N') = 'Y' THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'ASSISTANCE_PENSIONER',
      'message', 'Assistance pensioners are not eligible for voluntary contribution'
    ));
  END IF;

  IF v_active_employment IS NULL THEN
    SELECT MAX(term_end_date) INTO v_last_employment_end
    FROM public.ip_employer
    WHERE ssn = p_ssn 
      AND term_end_date IS NOT NULL
      AND posting_status = 'VAC';
    
    SELECT MAX(effective_end_date::DATE) INTO v_last_self_emp_end
    FROM public.ip_self_category
    WHERE ssn = p_ssn 
      AND effective_end_date IS NOT NULL;
    
    v_termination_date := GREATEST(COALESCE(v_last_employment_end, '1900-01-01'::DATE), COALESCE(v_last_self_emp_end, '1900-01-01'::DATE));
    
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
      'name', v_ip_record.surname || ', ' || v_ip_record.firstname,
      'dob', v_ip_record.dob,
      'age', v_age,
      'place_of_residence', v_ip_record.place_of_residence,
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
$function$;

GRANT EXECUTE ON FUNCTION public.check_vc_eligibility(p_ssn character varying) TO anon, authenticated, service_role;