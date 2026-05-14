-- C3 Calculation Configuration Table
-- Stores all configurable parameters for C3 form calculations

CREATE TABLE public.c3_calculation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value DECIMAL(15,4) NOT NULL,
  config_type VARCHAR(50) NOT NULL DEFAULT 'rate', -- 'rate', 'amount', 'age', 'days'
  category VARCHAR(50) NOT NULL, -- 'social_security', 'levy', 'severance', 'penalty'
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.c3_calculation_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read active configs
CREATE POLICY "Authenticated users can read active configs"
ON public.c3_calculation_config
FOR SELECT
TO authenticated
USING (is_active = true);

-- Allow admins to manage configs
CREATE POLICY "Admins can manage configs"
ON public.c3_calculation_config
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Insert default configuration values
INSERT INTO public.c3_calculation_config (config_key, config_value, config_type, category, display_name, description, display_order) VALUES
-- Social Security Parameters
('ss_min_age', 16, 'age', 'social_security', 'Minimum Age for SS Contributions', 'Employees below this age are exempt from Social Security contributions', 1),
('ss_max_age', 62, 'age', 'social_security', 'Maximum Age for SS Contributions', 'Employees above this age are exempt from Social Security contributions', 2),
('ss_employee_rate', 0.05, 'rate', 'social_security', 'Employee SS Rate', 'Social Security contribution rate for employees (5% = 0.05)', 3),
('ss_employer_rate', 0.05, 'rate', 'social_security', 'Employer SS Rate', 'Social Security contribution rate for employers (5% = 0.05)', 4),
('ss_employer_injury_rate', 0.01, 'rate', 'social_security', 'Employer Injury Rate', 'Employer injury contribution rate (1% = 0.01)', 5),
('ss_monthly_cap', 6500.00, 'amount', 'social_security', 'Monthly SS Cap', 'Maximum monthly insurable earnings for Social Security', 6),

-- Levy Parameters - Thresholds
('levy_exempt_weekly', 520.00, 'amount', 'levy', 'Weekly Levy Exempt Threshold', 'Earnings below this amount are exempt from employee levy (weekly)', 10),
('levy_exempt_biweekly', 1040.00, 'amount', 'levy', 'Bi-Weekly Levy Exempt Threshold', 'Earnings below this amount are exempt from employee levy (bi-weekly)', 11),
('levy_exempt_semimonthly', 1126.67, 'amount', 'levy', 'Semi-Monthly Levy Exempt Threshold', 'Earnings below this amount are exempt from employee levy (semi-monthly)', 12),
('levy_exempt_monthly', 2253.33, 'amount', 'levy', 'Monthly Levy Exempt Threshold', 'Earnings below this amount are exempt from employee levy (monthly)', 13),

-- Levy Parameters - Brackets
('levy_bracket1_monthly', 6500.00, 'amount', 'levy', 'Levy Bracket 1 Ceiling (Monthly)', 'First bracket ceiling for levy calculation', 20),
('levy_bracket2_monthly', 8000.00, 'amount', 'levy', 'Levy Bracket 2 Ceiling (Monthly)', 'Second bracket ceiling for levy calculation', 21),

-- Levy Parameters - Rates
('levy_rate_bracket1', 0.035, 'rate', 'levy', 'Levy Rate - Bracket 1', 'Levy rate for first bracket (3.5% = 0.035)', 30),
('levy_rate_bracket2', 0.10, 'rate', 'levy', 'Levy Rate - Bracket 2', 'Levy rate for second bracket (10% = 0.10)', 31),
('levy_rate_bracket3', 0.12, 'rate', 'levy', 'Levy Rate - Bracket 3', 'Levy rate for third bracket (12% = 0.12)', 32),
('levy_employer_rate', 0.03, 'rate', 'levy', 'Employer Levy Rate', 'Employer levy rate applied to period gross (3% = 0.03)', 33),

-- Severance Parameters
('severance_employer_rate', 0.01, 'rate', 'severance', 'Employer Severance Rate', 'Employer severance contribution rate (1% = 0.01)', 40),

-- Penalty Parameters
('penalty_levy_initial_rate', 0.10, 'rate', 'penalty', 'Levy Penalty Initial Rate', 'Initial penalty rate for late levy payment (10% = 0.10)', 50),
('penalty_levy_additional_rate', 0.01, 'rate', 'penalty', 'Levy Penalty Additional Rate', 'Additional penalty rate per 30-day period (1% = 0.01)', 51),
('penalty_severance_initial_rate', 0.10, 'rate', 'penalty', 'Severance Penalty Initial Rate', 'Initial penalty rate for late severance payment (10% = 0.10)', 52),
('penalty_severance_additional_rate', 0.01, 'rate', 'penalty', 'Severance Penalty Additional Rate', 'Additional penalty rate per 30-day period (1% = 0.01)', 53),
('penalty_ss_monthly_rate', 0.05, 'rate', 'penalty', 'SS Fine Monthly Rate', 'Social Security fine rate per month or part thereof (5% = 0.05)', 54),
('penalty_period_days', 30, 'days', 'penalty', 'Penalty Period Days', 'Number of days per penalty period', 55);

-- Create trigger for updated_at
CREATE TRIGGER update_c3_calculation_config_updated_at
  BEFORE UPDATE ON public.c3_calculation_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit log for config changes
CREATE TABLE public.c3_calculation_config_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES public.c3_calculation_config(id),
  config_key VARCHAR(100) NOT NULL,
  old_value DECIMAL(15,4),
  new_value DECIMAL(15,4),
  changed_by UUID REFERENCES auth.users(id),
  changed_by_name VARCHAR(200),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

-- Enable RLS on audit table
ALTER TABLE public.c3_calculation_config_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view config audit"
ON public.c3_calculation_config_audit
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));