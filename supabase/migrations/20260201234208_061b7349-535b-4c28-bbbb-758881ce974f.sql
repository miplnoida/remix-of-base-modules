-- Create table for voluntary contributor contribution rates
CREATE TABLE IF NOT EXISTS public.tb_vc_contrib_rate (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vc_contrib_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  vc_duration INTEGER NOT NULL DEFAULT 260,
  min_contrib_weeks INTEGER NOT NULL DEFAULT 52,
  min_age INTEGER NOT NULL DEFAULT 16,
  max_age INTEGER NOT NULL DEFAULT 62,
  residency_grace_weeks INTEGER NOT NULL DEFAULT 13,
  termination_grace_weeks INTEGER NOT NULL DEFAULT 13,
  wage_history_months INTEGER NOT NULL DEFAULT 24,
  weeks_per_year INTEGER NOT NULL DEFAULT 52,
  effstart DATE NOT NULL DEFAULT CURRENT_DATE,
  effend DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(10),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(10)
);

-- Insert default configuration
INSERT INTO public.tb_vc_contrib_rate (
  vc_contrib_pct, vc_duration, min_contrib_weeks, min_age, max_age, 
  residency_grace_weeks, termination_grace_weeks, wage_history_months, weeks_per_year,
  effstart, is_active
) VALUES (
  10.00, 260, 52, 16, 62, 13, 13, 24, 52,
  '2000-01-01', true
);

-- Enable RLS
ALTER TABLE public.tb_vc_contrib_rate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tb_vc_contrib_rate_select" ON public.tb_vc_contrib_rate 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tb_vc_contrib_rate_modify" ON public.tb_vc_contrib_rate 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add primary key constraint to ip_vol_contrib if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'ip_vol_contrib' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.ip_vol_contrib ADD PRIMARY KEY (ssn, date_registered);
  END IF;
END $$;

-- Create function to check voluntary contributor eligibility
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
  v_age := EXTRACT(YEAR FROM AGE(v_today, COALESCE(v_ip_record.dob, v_ip_record.date_of_birth)));
  
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
    v_termination_date := GREATEST(COALESCE(v_last_employment_end, '1900-01-01'), COALESCE(v_last_self_emp_end, '1900-01-01'));
    
    -- If there was prior employment or self-employment, check grace period
    IF v_termination_date > '1900-01-01' THEN
      v_weeks_since_termination := FLOOR(EXTRACT(DAY FROM (v_today - v_termination_date)) / 7);
      
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

-- Create function to calculate average weekly wage for VC registration
CREATE OR REPLACE FUNCTION public.calculate_vc_avg_weekly_wage(p_ssn VARCHAR, p_date_registered DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_config RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_total_wages NUMERIC(15,2) := 0;
  v_avg_earnings NUMERIC(15,2);
  v_weekly_avg NUMERIC(15,2);
BEGIN
  -- Get VC configuration
  SELECT * INTO v_config
  FROM public.tb_vc_contrib_rate
  WHERE is_active = true
    AND effstart <= p_date_registered
    AND (effend IS NULL OR effend >= p_date_registered)
  ORDER BY effstart DESC
  LIMIT 1;
  
  IF v_config IS NULL THEN
    RETURN jsonb_build_object('error', 'Configuration not found');
  END IF;

  -- Calculate date range (24 months prior)
  v_end_date := p_date_registered;
  v_start_date := p_date_registered - (v_config.wage_history_months || ' months')::INTERVAL;

  -- Calculate total wages from ip_wages for the period
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

  -- Average earnings = Total wages / 2 (split between two years)
  v_avg_earnings := ROUND(v_total_wages / 2, 2);
  
  -- Weekly average = Average earnings / 52
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
$$;

-- Create function to register voluntary contributor
CREATE OR REPLACE FUNCTION public.register_voluntary_contributor(
  p_ssn VARCHAR,
  p_date_registered DATE,
  p_date_commenced DATE,
  p_payment_interval VARCHAR,
  p_due_date DATE,
  p_user_code VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_eligibility JSONB;
  v_wage_calc JSONB;
  v_config RECORD;
  v_avg_weekly_wage NUMERIC(15,2);
  v_contrib_amt NUMERIC(15,2);
BEGIN
  -- Check eligibility first
  v_eligibility := public.check_vc_eligibility(p_ssn);
  
  IF NOT (v_eligibility->>'eligible')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Eligibility check failed',
      'details', v_eligibility->'errors'
    );
  END IF;

  -- Get VC configuration
  SELECT * INTO v_config
  FROM public.tb_vc_contrib_rate
  WHERE is_active = true
    AND effstart <= p_date_registered
    AND (effend IS NULL OR effend >= p_date_registered)
  ORDER BY effstart DESC
  LIMIT 1;

  -- Calculate average weekly wage
  v_wage_calc := public.calculate_vc_avg_weekly_wage(p_ssn, p_date_registered);
  v_avg_weekly_wage := (v_wage_calc->>'weekly_avg')::NUMERIC;
  
  -- Calculate contribution amount
  v_contrib_amt := ROUND(v_avg_weekly_wage * v_config.vc_contrib_pct / 100, 2);

  -- Update ip_master to set vol_contrib = 'Y'
  UPDATE public.ip_master
  SET vol_contrib = 'Y',
      updated_at = NOW()
  WHERE ssn = p_ssn;

  -- Insert into ip_vol_contrib
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
$$;

-- Create function to cease voluntary contributor (called by trigger or manually)
CREATE OR REPLACE FUNCTION public.cease_voluntary_contributor(
  p_ssn VARCHAR,
  p_reason VARCHAR DEFAULT 'MANUAL'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_active_record RECORD;
BEGIN
  -- Find active VC record
  SELECT * INTO v_active_record
  FROM public.ip_vol_contrib
  WHERE ssn = p_ssn AND date_ceased IS NULL;
  
  IF v_active_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active voluntary contributor record found'
    );
  END IF;

  -- Update ip_vol_contrib - set date_ceased
  UPDATE public.ip_vol_contrib
  SET date_ceased = NOW()
  WHERE ssn = p_ssn AND date_ceased IS NULL;

  -- Update ip_master - set vol_contrib = 'N'
  UPDATE public.ip_master
  SET vol_contrib = 'N',
      updated_at = NOW()
  WHERE ssn = p_ssn;

  RETURN jsonb_build_object(
    'success', true,
    'ssn', p_ssn,
    'date_ceased', CURRENT_DATE,
    'reason', p_reason
  );
END;
$$;

-- Create trigger function to auto-cease VC when residency changes
CREATE OR REPLACE FUNCTION public.check_vc_residency_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_residence VARCHAR;
  v_new_residence VARCHAR;
  v_has_active_vc BOOLEAN;
BEGIN
  -- Get old and new residence values
  v_old_residence := COALESCE(OLD.place_of_residence_code, OLD.place_of_residence);
  v_new_residence := COALESCE(NEW.place_of_residence_code, NEW.place_of_residence);

  -- Only proceed if residence changed
  IF v_old_residence IS DISTINCT FROM v_new_residence THEN
    -- Check if the new residence is NOT STK or NEV
    IF v_new_residence NOT IN ('STK', 'NEV') THEN
      -- Check if person has active VC status
      SELECT EXISTS (
        SELECT 1 FROM public.ip_vol_contrib 
        WHERE ssn = NEW.ssn AND date_ceased IS NULL
      ) INTO v_has_active_vc;
      
      IF v_has_active_vc THEN
        -- Automatically cease voluntary contributor status
        PERFORM public.cease_voluntary_contributor(NEW.ssn, 'RESIDENCY_CHANGE');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on ip_master for residency changes
DROP TRIGGER IF EXISTS trigger_check_vc_residency ON public.ip_master;
CREATE TRIGGER trigger_check_vc_residency
  AFTER UPDATE ON public.ip_master
  FOR EACH ROW
  EXECUTE FUNCTION public.check_vc_residency_change();

-- Add VC configuration entries to c3_calculation_config for UI management
INSERT INTO public.c3_calculation_config (
  config_key, config_value, config_type, category, display_name, description, display_order, is_active
) VALUES 
  ('vc_contrib_pct', 0.10, 'rate', 'voluntary_contributor', 'Contribution Rate', 'Percentage of average weekly wage for VC contributions', 1, true),
  ('vc_min_age', 16, 'age', 'voluntary_contributor', 'Minimum Age', 'Minimum age for voluntary contributor registration', 2, true),
  ('vc_max_age', 62, 'age', 'voluntary_contributor', 'Maximum Age', 'Maximum age for voluntary contributor registration', 3, true),
  ('vc_termination_grace_weeks', 13, 'weeks', 'voluntary_contributor', 'Termination Grace Period', 'Weeks allowed after employment termination to register as VC', 4, true),
  ('vc_wage_history_months', 24, 'months', 'voluntary_contributor', 'Wage History Period', 'Number of months to calculate average wage from', 5, true),
  ('vc_weeks_per_year', 52, 'weeks', 'voluntary_contributor', 'Weeks Per Year', 'Number of weeks used for annual wage calculation', 6, true),
  ('vc_duration_weeks', 260, 'weeks', 'voluntary_contributor', 'Maximum Duration', 'Maximum weeks of voluntary contributions allowed', 7, true),
  ('vc_min_contrib_weeks', 52, 'weeks', 'voluntary_contributor', 'Minimum Contribution Weeks', 'Minimum weeks required for contribution eligibility', 8, true)
ON CONFLICT (config_key) DO NOTHING;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.check_vc_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_vc_avg_weekly_wage TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_voluntary_contributor TO authenticated;
GRANT EXECUTE ON FUNCTION public.cease_voluntary_contributor TO authenticated;