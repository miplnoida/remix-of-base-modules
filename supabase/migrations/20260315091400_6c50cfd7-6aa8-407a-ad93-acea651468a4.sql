ALTER TABLE public.c3_config_sync_log 
  ADD COLUMN IF NOT EXISTS calculation_configs_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_codes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_categories_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS self_emp_rates_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_code_policies_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_code_exceptions_count integer DEFAULT 0;