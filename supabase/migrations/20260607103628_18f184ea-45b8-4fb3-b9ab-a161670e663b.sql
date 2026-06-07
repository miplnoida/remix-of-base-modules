
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT,
  template_id UUID,
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_name TEXT,
  recipient_user_id UUID,
  channel TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  template_data JSONB DEFAULT '{}'::jsonb,
  module TEXT,
  entity_type TEXT,
  entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  provider TEXT,
  provider_message_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_module_entity ON public.notification_queue(module, entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_at ON public.notification_queue(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_queue TO authenticated;
GRANT ALL ON public.notification_queue TO service_role;
GRANT SELECT, INSERT ON public.notification_queue TO anon;

CREATE OR REPLACE FUNCTION public.notification_queue_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_notification_queue_updated_at ON public.notification_queue;
CREATE TRIGGER trg_notification_queue_updated_at
BEFORE UPDATE ON public.notification_queue
FOR EACH ROW EXECUTE FUNCTION public.notification_queue_set_updated_at();
