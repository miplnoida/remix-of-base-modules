ALTER TABLE public.ia_annual_plans ADD COLUMN IF NOT EXISTS closed_by TEXT;
ALTER TABLE public.ia_annual_plans ADD COLUMN IF NOT EXISTS closed_date DATE;