-- ─────────────────────────────────────────────────────────────────────────────
-- EMAIL PROVIDERS: extend notification_providers for SMTP + Resend
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add email_provider_type column (smtp | resend)
ALTER TABLE public.notification_providers
  ADD COLUMN IF NOT EXISTS email_provider_type TEXT DEFAULT 'smtp',
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- 2. Back-fill existing email providers with a type
UPDATE public.notification_providers
SET email_provider_type = 'smtp'
WHERE channel = 'email' AND email_provider_type IS NULL;

-- 3. Add a CHECK constraint for valid provider types
ALTER TABLE public.notification_providers
  DROP CONSTRAINT IF EXISTS chk_email_provider_type;

ALTER TABLE public.notification_providers
  ADD CONSTRAINT chk_email_provider_type
    CHECK (
      channel != 'email' OR email_provider_type IN ('smtp', 'resend')
    );

-- 4. Ensure only one default email provider at a time via a partial unique index
-- (allows multiple non-default providers but only one default per channel)
DROP INDEX IF EXISTS idx_one_default_email_provider;
CREATE UNIQUE INDEX idx_one_default_email_provider
  ON public.notification_providers (channel, is_default)
  WHERE is_default = TRUE;

-- 5. Create a helper function to safely set exactly one default
CREATE OR REPLACE FUNCTION public.set_email_provider_default(provider_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel TEXT;
BEGIN
  SELECT channel INTO v_channel FROM notification_providers WHERE id = provider_id;
  IF v_channel IS NULL THEN
    RAISE EXCEPTION 'Provider not found: %', provider_id;
  END IF;
  -- Unset all existing defaults for this channel
  UPDATE notification_providers SET is_default = FALSE WHERE channel = v_channel;
  -- Set the target as default
  UPDATE notification_providers SET is_default = TRUE, is_active = TRUE WHERE id = provider_id;
END;
$$;

-- 6. Create email_provider_test_logs for tracking test send results
CREATE TABLE IF NOT EXISTS public.email_provider_test_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.notification_providers(id) ON DELETE CASCADE,
  test_to TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | sent | failed
  response_data JSONB,
  error_message TEXT,
  tested_by TEXT,
  tested_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_provider_test_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage email provider test logs"
  ON public.email_provider_test_logs
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);