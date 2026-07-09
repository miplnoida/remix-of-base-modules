
ALTER TABLE public.communication_message
  ADD COLUMN IF NOT EXISTS bounced_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS complained_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS delivery_status text NULL,
  ADD COLUMN IF NOT EXISTS delivery_last_event_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS delivery_last_event_type text NULL;

CREATE TABLE IF NOT EXISTS public.communication_hub_delivery_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'resend',
  provider_event_id text NOT NULL,
  provider_message_id text NULL,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  message_id uuid NULL REFERENCES public.communication_message(id) ON DELETE SET NULL,
  payload_summary jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_hub_delivery_event_uniq UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS communication_hub_delivery_event_pmid_idx
  ON public.communication_hub_delivery_event (provider_message_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS communication_hub_delivery_event_type_idx
  ON public.communication_hub_delivery_event (event_type, occurred_at DESC);

GRANT SELECT ON public.communication_hub_delivery_event TO authenticated;
GRANT ALL ON public.communication_hub_delivery_event TO service_role;
ALTER TABLE public.communication_hub_delivery_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery events admin read"
  ON public.communication_hub_delivery_event FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));
