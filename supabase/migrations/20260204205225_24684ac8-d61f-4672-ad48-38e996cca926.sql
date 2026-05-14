-- =============================================
-- C3 Period-Based Configuration System
-- =============================================

-- 1. Create period-based configuration master table
CREATE TABLE public.c3_config_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means open-ended (current/active)
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(5),
  created_on TIMESTAMPTZ DEFAULT NOW(),
  modified_by VARCHAR(5),
  modified_on TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create configuration details table with all parameters
CREATE TABLE public.c3_config_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_period_id UUID NOT NULL REFERENCES public.c3_config_periods(id) ON DELETE CASCADE,
  
  -- Age Limits for contributions
  min_age_ss INTEGER DEFAULT 16,           -- Minimum age for SS contributions
  max_age_ss INTEGER DEFAULT 62,           -- Maximum age for SS contributions
  min_age_levy INTEGER DEFAULT 16,         -- Minimum age for levy exemption
  max_age_levy INTEGER DEFAULT 62,         -- Maximum age for levy exemption
  
  -- Bonus Configuration
  bonus_exempt_from_levy BOOLEAN DEFAULT false,  -- Is bonus exempt from levy?
  bonus_levy_rate NUMERIC(10,5) DEFAULT 0.035,   -- Levy rate if bonus is not exempt (3.5%)
  
  -- Social Security Rates
  employee_ss_rate NUMERIC(10,5) DEFAULT 0.05,           -- Employee SS rate (5%)
  employee_ss_max_wage NUMERIC(18,2) DEFAULT 6500.00,    -- Max wage for employee SS calculation
  employer_ss_rate NUMERIC(10,5) DEFAULT 0.05,           -- Employer SS rate (5%)
  employer_eib_rate NUMERIC(10,5) DEFAULT 0.01,          -- Employer EIB rate (1%)
  employer_ss_max_wage NUMERIC(18,2) DEFAULT 6500.00,    -- Max wage for employer SS calculation
  
  -- Levy Rates
  employer_levy_rate NUMERIC(10,5) DEFAULT 0.03,         -- Employer levy rate (3%)
  
  -- Severance Rate
  employer_severance_rate NUMERIC(10,5) DEFAULT 0.01,    -- Employer severance rate (1%)
  
  -- Due Date Configuration
  submission_due_day INTEGER DEFAULT 0,                  -- 0 = last day of following month
  
  -- Levy Penalty Configuration
  levy_penalty_initial_rate NUMERIC(10,5) DEFAULT 0.10,       -- Initial penalty (10%)
  levy_penalty_subsequent_rate NUMERIC(10,5) DEFAULT 0.01,    -- Each additional 30-day period (1%)
  
  -- Severance Penalty Configuration
  severance_penalty_initial_rate NUMERIC(10,5) DEFAULT 0.10,  -- Initial penalty (10%)
  severance_penalty_subsequent_rate NUMERIC(10,5) DEFAULT 0.01, -- Each additional 30-day period (1%)
  
  -- Social Security Fine Configuration
  ss_fine_initial_rate NUMERIC(10,5) DEFAULT 0.05,            -- Initial fine per month (5%)
  ss_fine_subsequent_rate NUMERIC(10,5) DEFAULT 0.05,         -- Each additional month (5%)
  
  -- Interest Rates on Unpaid Amounts
  interest_rate_ss_principal NUMERIC(10,5) DEFAULT 0.00,      -- Interest on unpaid SS principal
  interest_rate_levy_principal NUMERIC(10,5) DEFAULT 0.00,    -- Interest on unpaid Levy principal
  interest_rate_severance_principal NUMERIC(10,5) DEFAULT 0.00, -- Interest on unpaid Severance
  interest_rate_penalties NUMERIC(10,5) DEFAULT 0.00,         -- Interest on unpaid penalties
  interest_rate_fines NUMERIC(10,5) DEFAULT 0.00,             -- Interest on unpaid fines
  
  -- Reference to levy slab for employee levy calculation
  levy_slab_id UUID REFERENCES public.tb_levy_slabs(id),
  
  created_by VARCHAR(5),
  created_on TIMESTAMPTZ DEFAULT NOW(),
  modified_by VARCHAR(5),
  modified_on TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(config_period_id)
);

-- 3. Create audit table for configuration changes
CREATE TABLE public.c3_config_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_period_id UUID REFERENCES public.c3_config_periods(id),
  action VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'CLONE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  changed_by VARCHAR(5),
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

-- 4. Indexes for performance
CREATE INDEX idx_c3_config_periods_dates ON public.c3_config_periods(start_date, end_date);
CREATE INDEX idx_c3_config_periods_active ON public.c3_config_periods(is_active);
CREATE INDEX idx_c3_config_details_period ON public.c3_config_details(config_period_id);
CREATE INDEX idx_c3_config_audit_period ON public.c3_config_audit(config_period_id);

-- 5. Enable RLS
ALTER TABLE public.c3_config_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c3_config_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.c3_config_audit ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Allow authenticated read on c3_config_periods"
  ON public.c3_config_periods FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on c3_config_periods"
  ON public.c3_config_periods FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on c3_config_periods"
  ON public.c3_config_periods FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on c3_config_details"
  ON public.c3_config_details FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on c3_config_details"
  ON public.c3_config_details FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on c3_config_details"
  ON public.c3_config_details FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on c3_config_audit"
  ON public.c3_config_audit FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on c3_config_audit"
  ON public.c3_config_audit FOR INSERT TO authenticated WITH CHECK (true);

-- 7. Insert default configuration (2025-01-01 to open-ended)
DO $$
DECLARE
  v_config_period_id UUID;
  v_levy_slab_id UUID;
BEGIN
  -- Get the existing levy slab
  SELECT id INTO v_levy_slab_id FROM public.tb_levy_slabs 
  WHERE is_active = true 
  ORDER BY start_date DESC LIMIT 1;
  
  -- Create the period
  INSERT INTO public.c3_config_periods (start_date, end_date, description, is_active)
  VALUES ('2025-01-01', NULL, 'Default configuration effective from January 2025', true)
  RETURNING id INTO v_config_period_id;
  
  -- Create the details
  INSERT INTO public.c3_config_details (
    config_period_id,
    min_age_ss, max_age_ss, min_age_levy, max_age_levy,
    bonus_exempt_from_levy, bonus_levy_rate,
    employee_ss_rate, employee_ss_max_wage,
    employer_ss_rate, employer_eib_rate, employer_ss_max_wage,
    employer_levy_rate, employer_severance_rate,
    submission_due_day,
    levy_penalty_initial_rate, levy_penalty_subsequent_rate,
    severance_penalty_initial_rate, severance_penalty_subsequent_rate,
    ss_fine_initial_rate, ss_fine_subsequent_rate,
    interest_rate_ss_principal, interest_rate_levy_principal,
    interest_rate_severance_principal, interest_rate_penalties, interest_rate_fines,
    levy_slab_id
  ) VALUES (
    v_config_period_id,
    16, 62, 16, 62,
    false, 0.035,
    0.05, 6500.00,
    0.05, 0.01, 6500.00,
    0.03, 0.01,
    0,
    0.10, 0.01,
    0.10, 0.01,
    0.05, 0.05,
    0.00, 0.00,
    0.00, 0.00, 0.00,
    v_levy_slab_id
  );
END $$;

-- 8. Create function to get active configuration for a period
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
  levy_slab_id UUID
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
    cd.levy_slab_id
  FROM public.c3_config_periods cp
  JOIN public.c3_config_details cd ON cd.config_period_id = cp.id
  WHERE cp.is_active = true
    AND cp.start_date <= p_period_date
    AND (cp.end_date IS NULL OR cp.end_date >= p_period_date)
  ORDER BY cp.start_date DESC
  LIMIT 1;
END;
$$;

-- 9. Create function to clone a configuration
CREATE OR REPLACE FUNCTION public.clone_c3_config(
  p_source_period_id UUID,
  p_new_start_date DATE,
  p_new_end_date DATE DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_user_code VARCHAR DEFAULT NULL
)
RETURNS UUID
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
  
  -- Clone details
  INSERT INTO public.c3_config_details (
    config_period_id, min_age_ss, max_age_ss, min_age_levy, max_age_levy,
    bonus_exempt_from_levy, bonus_levy_rate,
    employee_ss_rate, employee_ss_max_wage,
    employer_ss_rate, employer_eib_rate, employer_ss_max_wage,
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
    employer_ss_rate, employer_eib_rate, employer_ss_max_wage,
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_c3_config_for_period(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clone_c3_config(UUID, DATE, DATE, TEXT, VARCHAR) TO authenticated;