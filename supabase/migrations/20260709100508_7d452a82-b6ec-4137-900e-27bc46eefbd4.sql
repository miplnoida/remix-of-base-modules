
-- 1. Settings table (singleton)
CREATE TABLE public.communication_hub_control_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_enabled boolean NOT NULL DEFAULT true,
  dry_run_only boolean NOT NULL DEFAULT true,
  email_live_enabled boolean NOT NULL DEFAULT false,
  sms_live_enabled boolean NOT NULL DEFAULT false,
  whatsapp_live_enabled boolean NOT NULL DEFAULT false,
  print_enabled boolean NOT NULL DEFAULT false,
  letter_enabled boolean NOT NULL DEFAULT false,
  allowed_email_addresses text[] NOT NULL DEFAULT ARRAY['rohit@mishainfotech.com']::text[],
  allowed_email_domains text[] NOT NULL DEFAULT '{}'::text[],
  batch_size int NOT NULL DEFAULT 10,
  cron_desired_enabled boolean NOT NULL DEFAULT false,
  max_attempts int NOT NULL DEFAULT 3,
  retry_base_seconds int NOT NULL DEFAULT 60,
  retry_max_seconds int NOT NULL DEFAULT 3600,
  notes text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_batch_size CHECK (batch_size BETWEEN 1 AND 50),
  CONSTRAINT chk_max_attempts CHECK (max_attempts BETWEEN 1 AND 20),
  CONSTRAINT chk_retry_base CHECK (retry_base_seconds > 0),
  CONSTRAINT chk_retry_max CHECK (retry_max_seconds >= retry_base_seconds)
);

GRANT SELECT, INSERT, UPDATE ON public.communication_hub_control_settings TO authenticated;
GRANT ALL ON public.communication_hub_control_settings TO service_role;

ALTER TABLE public.communication_hub_control_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read control settings"
  ON public.communication_hub_control_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Admins update control settings"
  ON public.communication_hub_control_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Admins insert control settings"
  ON public.communication_hub_control_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

-- Enforce non-empty allowlist when email live is enabled
CREATE OR REPLACE FUNCTION public.chk_comm_hub_control_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.email_live_enabled = true
     AND (NEW.allowed_email_addresses IS NULL OR array_length(NEW.allowed_email_addresses, 1) IS NULL)
     AND (NEW.allowed_email_domains IS NULL OR array_length(NEW.allowed_email_domains, 1) IS NULL)
  THEN
    RAISE EXCEPTION 'email_live_enabled requires at least one allowed_email_addresses or allowed_email_domains entry';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chk_comm_hub_control_settings
  BEFORE INSERT OR UPDATE ON public.communication_hub_control_settings
  FOR EACH ROW EXECUTE FUNCTION public.chk_comm_hub_control_settings();

-- 2. Seed singleton row (safe defaults)
INSERT INTO public.communication_hub_control_settings (
  dispatch_enabled, dry_run_only, email_live_enabled,
  allowed_email_addresses, allowed_email_domains,
  batch_size, cron_desired_enabled
) VALUES (
  true, true, false,
  ARRAY['rohit@mishainfotech.com']::text[], '{}'::text[],
  10, false
);

-- 3. Audit table
CREATE TABLE public.communication_hub_control_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  reason text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  source text DEFAULT 'communication-hub-control-center'
);

CREATE INDEX idx_chc_audit_changed_at ON public.communication_hub_control_audit (changed_at DESC);
CREATE INDEX idx_chc_audit_setting_key ON public.communication_hub_control_audit (setting_key);

GRANT SELECT, INSERT ON public.communication_hub_control_audit TO authenticated;
GRANT ALL ON public.communication_hub_control_audit TO service_role;

ALTER TABLE public.communication_hub_control_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read control audit"
  ON public.communication_hub_control_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Admins insert control audit"
  ON public.communication_hub_control_audit FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role) AND changed_by = auth.uid());
