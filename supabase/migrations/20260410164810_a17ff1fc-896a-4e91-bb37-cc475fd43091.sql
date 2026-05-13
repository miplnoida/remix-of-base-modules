
ALTER TABLE public.notification_providers
  ADD COLUMN IF NOT EXISTS sms_provider_type TEXT,
  ADD COLUMN IF NOT EXISTS push_provider_type TEXT;

CREATE TABLE IF NOT EXISTS public.notification_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.notification_types (code, display_name, description, display_order, is_active)
VALUES
  ('Email', 'Email', 'Email notifications via configured provider', 1, true),
  ('SMS', 'SMS', 'SMS text message notifications', 2, true),
  ('Push', 'Push', 'Push notifications to devices', 3, true),
  ('In-App', 'In-App', 'In-application notifications', 4, true)
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_sms_provider_default(provider_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notification_providers
  SET is_active = false, updated_at = now()
  WHERE channel = 'sms' AND is_active = true AND id != provider_id;

  UPDATE public.notification_providers
  SET is_active = true, updated_at = now()
  WHERE id = provider_id AND channel = 'sms';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_push_provider_default(provider_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notification_providers
  SET is_active = false, updated_at = now()
  WHERE channel = 'push' AND is_active = true AND id != provider_id;

  UPDATE public.notification_providers
  SET is_active = true, updated_at = now()
  WHERE id = provider_id AND channel = 'push';
END;
$$;
