
-- Add employer_eib_max_wage column to c3_config_details
ALTER TABLE public.c3_config_details
  ADD COLUMN IF NOT EXISTS employer_eib_max_wage NUMERIC NOT NULL DEFAULT 6500.00;

-- Update clone_c3_config to include the new column
CREATE OR REPLACE FUNCTION public.clone_c3_config(
  p_source_period_id UUID,
  p_new_start_date DATE,
  p_new_end_date DATE DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_user_code VARCHAR DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_period_id UUID;
  v_old_values JSONB;
BEGIN
  -- Get source config values for audit
  SELECT jsonb_build_object(
    'start_date', cp.start_date,
    'end_date', cp.end_date,
    'config', row_to_json(cd)
  ) INTO v_old_values
  FROM public.c3_config_periods cp
  JOIN public.c3_config_details cd ON cd.config_period_id = cp.id
  WHERE cp.id = p_source_period_id;
  
  IF v_old_values IS NULL THEN
    RAISE EXCEPTION 'Source configuration not found';
  END IF;
  
  -- Create new period
  INSERT INTO public.c3_config_periods (start_date, end_date, description, is_active, created_by)
  VALUES (p_new_start_date, p_new_end_date, COALESCE(p_description, 'Cloned from existing configuration'), true, p_user_code)
  RETURNING id INTO v_new_period_id;
  
  -- Clone details (including employer_eib_max_wage)
  INSERT INTO public.c3_config_details (
    config_period_id, min_age_ss, max_age_ss, min_age_levy, max_age_levy,
    bonus_exempt_from_levy, bonus_levy_rate,
    employee_ss_rate, employee_ss_max_wage,
    employer_ss_rate, employer_eib_rate, employer_eib_max_wage, employer_ss_max_wage,
    employer_levy_rate, employer_severance_rate,
    submission_due_day,
    levy_penalty_initial_rate, levy_penalty_subsequent_rate,
    severance_penalty_initial_rate, severance_penalty_subsequent_rate,
    ss_fine_initial_rate, ss_fine_subsequent_rate,
    interest_rate_ss_principal, interest_rate_levy_principal,
    interest_rate_severance_principal, interest_rate_penalties, interest_rate_fines,
    levy_slab_id, created_by
  )
  SELECT 
    v_new_period_id, min_age_ss, max_age_ss, min_age_levy, max_age_levy,
    bonus_exempt_from_levy, bonus_levy_rate,
    employee_ss_rate, employee_ss_max_wage,
    employer_ss_rate, employer_eib_rate, employer_eib_max_wage, employer_ss_max_wage,
    employer_levy_rate, employer_severance_rate,
    submission_due_day,
    levy_penalty_initial_rate, levy_penalty_subsequent_rate,
    severance_penalty_initial_rate, severance_penalty_subsequent_rate,
    ss_fine_initial_rate, ss_fine_subsequent_rate,
    interest_rate_ss_principal, interest_rate_levy_principal,
    interest_rate_severance_principal, interest_rate_penalties, interest_rate_fines,
    levy_slab_id, p_user_code
  FROM public.c3_config_details
  WHERE config_period_id = p_source_period_id;
  
  -- Log audit
  INSERT INTO public.c3_config_audit (config_period_id, action, old_values, new_values, changed_by, reason)
  VALUES (v_new_period_id, 'CLONE', v_old_values, 
    jsonb_build_object('source_id', p_source_period_id, 'new_start_date', p_new_start_date, 'new_end_date', p_new_end_date),
    p_user_code, 'Configuration cloned from period ' || p_source_period_id::text);
  
  RETURN v_new_period_id;
END;
$$;

-- Update get_c3_config_for_period to return the new column
DROP FUNCTION IF EXISTS public.get_c3_config_for_period(DATE);

CREATE OR REPLACE FUNCTION public.get_c3_config_for_period(p_period_date DATE)
RETURNS TABLE (
  config_period_id UUID,
  start_date DATE,
  end_date DATE,
  min_age_ss INTEGER,
  max_age_ss INTEGER,
  min_age_levy INTEGER,
  max_age_levy INTEGER,
  employee_ss_rate NUMERIC,
  employee_ss_max_wage NUMERIC,
  employer_ss_rate NUMERIC,
  employer_eib_rate NUMERIC,
  employer_eib_max_wage NUMERIC,
  employer_ss_max_wage NUMERIC,
  employer_levy_rate NUMERIC,
  employer_severance_rate NUMERIC,
  submission_due_day INTEGER,
  levy_penalty_initial_rate NUMERIC,
  levy_penalty_subsequent_rate NUMERIC,
  severance_penalty_initial_rate NUMERIC,
  severance_penalty_subsequent_rate NUMERIC,
  ss_fine_initial_rate NUMERIC,
  ss_fine_subsequent_rate NUMERIC,
  levy_slab_id UUID,
  levy_monthly_threshold NUMERIC,
  levy_use_monthly_when_exceeded BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id as config_period_id,
    cp.start_date,
    cp.end_date,
    cd.min_age_ss,
    cd.max_age_ss,
    cd.min_age_levy,
    cd.max_age_levy,
    cd.employee_ss_rate,
    cd.employee_ss_max_wage,
    cd.employer_ss_rate,
    cd.employer_eib_rate,
    cd.employer_eib_max_wage,
    cd.employer_ss_max_wage,
    cd.employer_levy_rate,
    cd.employer_severance_rate,
    cd.submission_due_day,
    cd.levy_penalty_initial_rate,
    cd.levy_penalty_subsequent_rate,
    cd.severance_penalty_initial_rate,
    cd.severance_penalty_subsequent_rate,
    cd.ss_fine_initial_rate,
    cd.ss_fine_subsequent_rate,
    cd.levy_slab_id,
    cd.levy_monthly_threshold,
    cd.levy_use_monthly_when_exceeded
  FROM public.c3_config_periods cp
  JOIN public.c3_config_details cd ON cd.config_period_id = cp.id
  WHERE cp.is_active = true
    AND cp.start_date <= p_period_date
    AND (cp.end_date IS NULL OR cp.end_date >= p_period_date)
  ORDER BY cp.start_date DESC
  LIMIT 1;
END;
$$;
