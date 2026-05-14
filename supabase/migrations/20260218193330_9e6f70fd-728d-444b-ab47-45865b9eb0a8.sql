
-- ============================================================
-- Email Campaigns & Resend Integration
-- ============================================================

-- 1. Email campaigns table (for admin-triggered campaigns)
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  subject          TEXT NOT NULL,
  html_body        TEXT NOT NULL,
  plain_body       TEXT,
  from_name        TEXT NOT NULL DEFAULT 'SSBM Notifications',
  from_email       TEXT NOT NULL DEFAULT 'noreply@notifications.ssbm.gov.kn',
  recipient_filter TEXT NOT NULL DEFAULT 'all',
  recipient_emails TEXT[],
  status           TEXT NOT NULL DEFAULT 'draft',
  total_recipients INTEGER DEFAULT 0,
  sent_count       INTEGER DEFAULT 0,
  failed_count     INTEGER DEFAULT 0,
  triggered_by     UUID,
  triggered_at     TIMESTAMP WITH TIME ZONE,
  completed_at     TIMESTAMP WITH TIME ZONE,
  error_message    TEXT,
  metadata         JSONB,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Add Resend-specific columns to notification_logs (if not present)
ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS resend_message_id TEXT,
  ADD COLUMN IF NOT EXISTS retry_count        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at      TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS campaign_id        UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL;

-- 3. Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- 4. Admin-only access (read/write) — 'Admin' is the correct case for this enum
CREATE POLICY "Admins can manage email campaigns"
  ON public.email_campaigns
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::public.app_role));

-- 5. Auto-update updated_at on email_campaigns
CREATE OR REPLACE FUNCTION public.set_email_campaigns_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_campaigns_updated_at ON public.email_campaigns;
CREATE TRIGGER trg_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_email_campaigns_updated_at();

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status       ON public.email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_triggered_by ON public.email_campaigns(triggered_by);
CREATE INDEX IF NOT EXISTS idx_notification_logs_campaign   ON public.notification_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_resend     ON public.notification_logs(resend_message_id);
