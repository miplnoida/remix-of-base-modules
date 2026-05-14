-- Update the check_vc_eligibility function to use tb_vc_eligibility_config
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
  -- Get VC configuration from renamed table
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
$function$;

-- Update the calculate_vc_avg_weekly_wage function to use tb_vc_eligibility_config
CREATE OR REPLACE FUNCTION public.calculate_vc_avg_weekly_wage(p_ssn character varying, p_date_registered date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_config RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_total_wages NUMERIC(15,2) := 0;
  v_avg_earnings NUMERIC(15,2);
  v_weekly_avg NUMERIC(15,2);
BEGIN
  -- Get VC configuration from renamed table
  SELECT * INTO v_config
  FROM public.tb_vc_eligibility_config
  WHERE is_active = true
    AND effstart <= p_date_registered
    AND (effend IS NULL OR effend >= p_date_registered)
  ORDER BY effstart DESC
  LIMIT 1;
  
  IF v_config IS NULL THEN
    RETURN jsonb_build_object('error', 'Configuration not found');
  END IF;

  v_end_date := p_date_registered;
  v_start_date := p_date_registered - (v_config.wage_history_months || ' months')::INTERVAL;

  SELECT COALESCE(SUM(
    COALESCE(wages_paid1, 0) + COALESCE(wages_paid2, 0) + COALESCE(wages_paid3, 0) + 
    COALESCE(wages_paid4, 0) + COALESCE(wages_paid5, 0) + COALESCE(wages_paid6, 0) + COALESCE(wages_paid7, 0)
  ), 0)
  INTO v_total_wages
  FROM public.ip_wages
  WHERE ssn = p_ssn
    AND period >= v_start_date
    AND period < v_end_date
    AND posting_status = 'VAC';

  v_avg_earnings := ROUND(v_total_wages / 2, 2);
  v_weekly_avg := ROUND(v_avg_earnings / v_config.weeks_per_year, 2);

  RETURN jsonb_build_object(
    'total_wages', v_total_wages,
    'avg_earnings', v_avg_earnings,
    'weekly_avg', v_weekly_avg,
    'start_date', v_start_date,
    'end_date', v_end_date,
    'months_covered', v_config.wage_history_months
  );
END;
$function$;

-- Update the register_voluntary_contributor function to use tb_vc_eligibility_config
CREATE OR REPLACE FUNCTION public.register_voluntary_contributor(p_ssn character varying, p_date_registered date, p_date_commenced date, p_payment_interval character varying, p_due_date date, p_user_code character varying DEFAULT NULL::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_eligibility JSONB;
  v_wage_calc JSONB;
  v_config RECORD;
  v_avg_weekly_wage NUMERIC(15,2);
  v_contrib_amt NUMERIC(15,2);
BEGIN
  v_eligibility := public.check_vc_eligibility(p_ssn);
  
  IF NOT (v_eligibility->>'eligible')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Eligibility check failed',
      'details', v_eligibility->'errors'
    );
  END IF;

  -- Get VC configuration from renamed table
  SELECT * INTO v_config
  FROM public.tb_vc_eligibility_config
  WHERE is_active = true
    AND effstart <= p_date_registered
    AND (effend IS NULL OR effend >= p_date_registered)
  ORDER BY effstart DESC
  LIMIT 1;

  v_wage_calc := public.calculate_vc_avg_weekly_wage(p_ssn, p_date_registered);
  v_avg_weekly_wage := (v_wage_calc->>'weekly_avg')::NUMERIC;
  
  v_contrib_amt := ROUND(v_avg_weekly_wage * v_config.vc_contrib_pct / 100, 2);

  UPDATE public.ip_master
  SET vol_contrib = 'Y',
      updated_at = NOW()
  WHERE ssn = p_ssn;

  INSERT INTO public.ip_vol_contrib (
    ssn,
    date_registered,
    date_commenced,
    date_ceased,
    contrib_amt,
    payment_interval,
    due_date,
    avg_weekly_wage
  ) VALUES (
    p_ssn,
    p_date_registered,
    p_date_commenced,
    NULL,
    v_contrib_amt,
    p_payment_interval,
    p_due_date,
    v_avg_weekly_wage
  )
  ON CONFLICT (ssn, date_registered) DO UPDATE SET
    date_commenced = EXCLUDED.date_commenced,
    contrib_amt = EXCLUDED.contrib_amt,
    payment_interval = EXCLUDED.payment_interval,
    due_date = EXCLUDED.due_date,
    avg_weekly_wage = EXCLUDED.avg_weekly_wage;

  RETURN jsonb_build_object(
    'success', true,
    'ssn', p_ssn,
    'date_registered', p_date_registered,
    'date_commenced', p_date_commenced,
    'payment_interval', p_payment_interval,
    'avg_weekly_wage', v_avg_weekly_wage,
    'contrib_amt', v_contrib_amt,
    'wage_calculation', v_wage_calc
  );
END;
$function$;