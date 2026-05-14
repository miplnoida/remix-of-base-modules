
-- Rule Variable Mappings: maps visual builder variables to actual DB fields
CREATE TABLE public.ce_rule_variable_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  data_type TEXT NOT NULL DEFAULT 'number', -- number, boolean, string
  variable_category TEXT NOT NULL, -- condition, formula, both
  group_name TEXT NOT NULL, -- Financial, Rate, Time, Status, Boolean
  source_table TEXT, -- actual DB table reference
  source_column TEXT, -- actual DB column reference
  source_schema TEXT DEFAULT 'public',
  c3_config_key TEXT, -- maps to c3_calculation_config.config_key if applicable
  computation_logic TEXT, -- how to derive value if not a direct column
  applies_to_rule_type TEXT NOT NULL DEFAULT 'all', -- detection, calculation, escalation, all
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed condition variables with actual DB mappings
INSERT INTO public.ce_rule_variable_mappings (variable_key, display_name, description, data_type, variable_category, group_name, source_table, source_column, c3_config_key, computation_logic, applies_to_rule_type, sort_order) VALUES
-- Condition variables (for detection & escalation rules)
('days_overdue', 'Days Overdue', 'Number of days past the payment/filing due date', 'number', 'condition', 'Time', 'bema_arrears_ledger', 'due_date', NULL, 'EXTRACT(DAY FROM now() - due_date)', 'all', 1),
('months_overdue', 'Months Overdue', 'Number of calendar months past due', 'number', 'both', 'Time', 'bema_arrears_ledger', 'due_date', NULL, 'EXTRACT(MONTH FROM age(now(), due_date))', 'all', 2),
('grace_period', 'Grace Period (days)', 'Configured grace period for C3 submissions', 'number', 'condition', 'Time', 'c3_calculation_config', 'config_value', 'c3_grace_period_days', NULL, 'detection', 3),
('total_owed', 'Total Amount Owed ($)', 'Sum of outstanding balance across all periods', 'number', 'condition', 'Financial', 'bema_arrears_ledger', 'outstanding_balance', NULL, 'SUM(outstanding_balance) for employer', 'all', 4),
('outstanding_balance', 'Outstanding Balance ($)', 'Current outstanding balance for a specific period', 'number', 'both', 'Financial', 'bema_arrears_ledger', 'outstanding_balance', NULL, NULL, 'all', 5),
('violations_count', 'Active Violation Count', 'Number of active (open) violations for the employer', 'number', 'condition', 'Status', 'ce_violations', 'id', NULL, 'COUNT(*) WHERE status IN (Open, Under Review)', 'all', 6),
('missed_filings_count', 'Missed Filings Count', 'Number of missing C3 submissions in recent periods', 'number', 'condition', 'Status', 'bema_c3_submissions', 'id', NULL, 'COUNT missing periods for employer', 'detection', 7),
('employee_count', 'Employee Count', 'Number of employees reported on latest C3', 'number', 'condition', 'Status', 'bema_c3_submissions', 'total_employees', NULL, NULL, 'detection', 8),
('reported_wages', 'Reported Wages ($)', 'Total wages declared on C3 submission', 'number', 'condition', 'Financial', 'bema_c3_submissions', 'total_wages', NULL, NULL, 'detection', 9),
('expected_wages', 'Expected Wages ($)', 'Expected wages based on industry/employee count', 'number', 'condition', 'Financial', NULL, NULL, NULL, 'Derived from industry benchmarks', 'detection', 10),
('payment_plan_missed', 'Missed Installments', 'Number of missed installments on active payment plan', 'number', 'condition', 'Status', 'bema_installments', 'overdue', NULL, 'COUNT(*) WHERE overdue = true', 'detection', 11),
('months_in_status', 'Months in Current Status', 'How long the case has been in its current status', 'number', 'condition', 'Time', 'ce_violations', 'updated_at', NULL, 'EXTRACT(MONTH FROM age(now(), status_changed_at))', 'escalation', 12),
('risk_score', 'Risk Score', 'Calculated risk score from risk profile', 'number', 'condition', 'Status', 'ce_risk_profiles', 'overall_score', NULL, NULL, 'all', 13),
('is_registered', 'Is Registered', 'Whether the employer has an active SSB registration', 'boolean', 'condition', 'Boolean', 'bema_registrations', 'status', NULL, 'status = approved', 'detection', 14),
('has_active_plan', 'Has Active Payment Plan', 'Whether employer has an active payment arrangement', 'boolean', 'condition', 'Boolean', 'bema_payment_plans', 'status', NULL, 'EXISTS WHERE status = Active', 'all', 15),
('is_repeat_offender', 'Is Repeat Offender', 'Employer has prior closed violations within 12 months', 'boolean', 'condition', 'Boolean', 'ce_violations', 'id', NULL, 'COUNT closed violations in last 12 months >= 2', 'all', 16),
('days_late', 'Days Late', 'Days past the C3 submission or payment deadline', 'number', 'both', 'Time', 'bema_c3_submissions', 'submitted_at', NULL, 'EXTRACT(DAY FROM submitted_at - deadline)', 'all', 17),

-- Formula operands (for calculation rules)
('outstanding_amount', 'Outstanding Amount', 'Total outstanding amount for penalty/fine base', 'number', 'formula', 'Financial', 'bema_arrears_ledger', 'outstanding_balance', NULL, NULL, 'calculation', 20),
('total_wages', 'Total Wages', 'Total wages from C3 submission', 'number', 'formula', 'Financial', 'bema_c3_submissions', 'total_wages', NULL, NULL, 'calculation', 21),
('amount_owed', 'Amount Owed', 'Specific contribution amount owed', 'number', 'formula', 'Financial', 'bema_arrears_ledger', 'outstanding_balance', NULL, NULL, 'calculation', 22),
('ss_contribution', 'SS Contribution', 'Social Security contribution amount from C3', 'number', 'formula', 'Financial', 'bema_c3_submissions', 'total_ss_contribution', NULL, NULL, 'calculation', 23),
('ei_contribution', 'EI Contribution', 'Employment Injury contribution from C3', 'number', 'formula', 'Financial', 'bema_c3_submissions', 'total_ei_contribution', NULL, NULL, 'calculation', 24),
('levy_amount', 'Levy Amount', 'Levy contribution amount from C3', 'number', 'formula', 'Financial', 'bema_c3_submissions', 'total_levy_contribution', NULL, NULL, 'calculation', 25),
('severance_amount', 'Severance Amount', 'Severance contribution from employer', 'number', 'formula', 'Financial', 'bema_c3_line_items', 'levy_contribution', NULL, 'Derived from employer severance line', 'calculation', 26),

-- Rate variables mapped to C3 calculation config
('ss_fine_initial_rate', 'SS Fine Rate', 'Social Security fine rate from C3 Config', 'number', 'formula', 'Rate', 'c3_calculation_config', 'config_value', 'ss_fine_initial_rate', NULL, 'calculation', 30),
('levy_penalty_initial_rate', 'Levy Penalty Rate', 'Initial levy penalty rate from C3 Config', 'number', 'formula', 'Rate', 'c3_calculation_config', 'config_value', 'levy_penalty_initial_rate', NULL, 'calculation', 31),
('severance_penalty_rate', 'Severance Penalty Rate', 'Severance penalty rate from C3 Config', 'number', 'formula', 'Rate', 'c3_calculation_config', 'config_value', 'severance_penalty_rate', NULL, 'calculation', 32),
('interest_rate', 'Interest Rate', 'Interest rate for arrears calculation from C3 Config', 'number', 'formula', 'Rate', 'c3_calculation_config', 'config_value', 'interest_rate_annual', NULL, 'calculation', 33),
('penalty_rate', 'Penalty Rate', 'General penalty rate', 'number', 'formula', 'Rate', 'c3_calculation_config', 'config_value', 'penalty_rate_percent', NULL, 'calculation', 34),
('additional_rate_per_month', 'Additional % Per Month', 'Additional penalty rate charged per month late from C3 Config', 'number', 'formula', 'Rate', 'c3_calculation_config', 'config_value', 'levy_penalty_additional_rate_per_month', NULL, 'calculation', 35);
