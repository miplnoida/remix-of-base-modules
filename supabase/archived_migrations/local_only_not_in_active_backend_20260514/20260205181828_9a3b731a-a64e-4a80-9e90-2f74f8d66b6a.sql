-- Drop and recreate the get_c3_config_for_period function to include new levy threshold columns
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
  bonus_exempt_from_levy BOOLEAN,
  bonus_levy_rate NUMERIC,
  employee_ss_rate NUMERIC,
  employee_ss_max_wage NUMERIC,
  employer_ss_rate NUMERIC,
  employer_eib_rate NUMERIC,
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
  interest_rate_ss_principal NUMERIC,
  interest_rate_levy_principal NUMERIC,
  interest_rate_severance_principal NUMERIC,
  interest_rate_penalties NUMERIC,
  interest_rate_fines NUMERIC,
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
    cd.bonus_exempt_from_levy,
    cd.bonus_levy_rate,
    cd.employee_ss_rate,
    cd.employee_ss_max_wage,
    cd.employer_ss_rate,
    cd.employer_eib_rate,
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
    cd.interest_rate_ss_principal,
    cd.interest_rate_levy_principal,
    cd.interest_rate_severance_principal,
    cd.interest_rate_penalties,
    cd.interest_rate_fines,
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