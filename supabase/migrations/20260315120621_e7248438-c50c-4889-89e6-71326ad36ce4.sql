-- Add modification tracking columns to tables that lack them
ALTER TABLE public.tb_income_cat 
  ADD COLUMN IF NOT EXISTS modified_on timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS modified_by text;

ALTER TABLE public.tb_self_emp_contrib_rate
  ADD COLUMN IF NOT EXISTS modified_on timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS modified_by text;

-- Update existing rows so they show as "already synced" (set modified_on to past)
UPDATE public.tb_income_cat SET modified_on = '2025-01-01T00:00:00Z' WHERE modified_on IS NULL OR modified_on >= now() - interval '1 minute';
UPDATE public.tb_self_emp_contrib_rate SET modified_on = '2025-01-01T00:00:00Z' WHERE modified_on IS NULL OR modified_on >= now() - interval '1 minute';