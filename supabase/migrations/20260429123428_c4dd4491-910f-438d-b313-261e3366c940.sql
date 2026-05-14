ALTER TABLE public.c3_config_audit
  DROP CONSTRAINT IF EXISTS c3_config_audit_config_period_id_fkey;

ALTER TABLE public.c3_config_audit
  ALTER COLUMN config_period_id DROP NOT NULL;

ALTER TABLE public.c3_config_audit
  ADD CONSTRAINT c3_config_audit_config_period_id_fkey
  FOREIGN KEY (config_period_id)
  REFERENCES public.c3_config_periods(id)
  ON DELETE SET NULL;