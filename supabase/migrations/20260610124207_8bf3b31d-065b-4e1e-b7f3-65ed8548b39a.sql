
-- Add parameters_snapshot to ce_violations for frozen config values at detection/save time
ALTER TABLE public.ce_violations
  ADD COLUMN IF NOT EXISTS parameters_snapshot jsonb;

COMMENT ON COLUMN public.ce_violations.parameters_snapshot IS
  'Frozen snapshot of compliance policy parameters (grace period, penalty %, etc.) resolved via ce_rule_variable_mappings at violation creation time. Never re-resolved on edit. Source: c3_calculation_config.';

-- Mark duplicate columns on ce_compliance_policies as deprecated (do NOT drop yet)
COMMENT ON COLUMN public.ce_compliance_policies.c3_grace_period_days IS
  'DEPRECATED — read from c3_calculation_config.filing_window_value via ce_rule_variable_mappings (variable_key=grace_period). Kept for backward compatibility only.';
COMMENT ON COLUMN public.ce_compliance_policies.penalty_rate_percent IS
  'DEPRECATED — read from c3_calculation_config.penalty_levy_initial_rate via ce_rule_variable_mappings (variable_key=levy_penalty_initial_rate).';
COMMENT ON COLUMN public.ce_compliance_policies.interest_rate_percent IS
  'DEPRECATED — read from c3_calculation_config.interest_rate_annual via ce_rule_variable_mappings (variable_key=interest_rate).';
COMMENT ON COLUMN public.ce_compliance_policies.c3_submission_deadline_day IS
  'DEPRECATED — sourced via c3 filing configuration (filing_window_value/unit).';
COMMENT ON COLUMN public.ce_compliance_policies.payment_due_date_day IS
  'DEPRECATED — sourced via c3 filing configuration.';
COMMENT ON COLUMN public.ce_compliance_policies.penalty_calc_frequency IS
  'DEPRECATED — sourced via c3_calculation_config (penalty_period_days).';
