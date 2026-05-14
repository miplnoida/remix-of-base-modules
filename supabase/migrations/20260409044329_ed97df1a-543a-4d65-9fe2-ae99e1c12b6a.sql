
ALTER TABLE public.ia_annual_plans
  ADD COLUMN IF NOT EXISTS auditor_count INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS monthly_working_hours NUMERIC(6,1) DEFAULT 160,
  ADD COLUMN IF NOT EXISTS utilization_pct NUMERIC(5,2) DEFAULT 85,
  ADD COLUMN IF NOT EXISTS buffer_pct NUMERIC(5,2) DEFAULT 10;

COMMENT ON COLUMN public.ia_annual_plans.auditor_count IS 'Number of auditors available for capacity planning';
COMMENT ON COLUMN public.ia_annual_plans.monthly_working_hours IS 'Working hours per auditor per month';
COMMENT ON COLUMN public.ia_annual_plans.utilization_pct IS 'Target utilization percentage (e.g. 85 = 85%)';
COMMENT ON COLUMN public.ia_annual_plans.buffer_pct IS 'Capacity buffer/contingency percentage (e.g. 10 = 10%)';
