
-- Phase 1A Migration 1/3

CREATE TABLE public.communication_retry_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  provider_id uuid REFERENCES public.notification_providers(id) ON DELETE SET NULL,
  max_attempts int NOT NULL DEFAULT 3,
  initial_delay_seconds int NOT NULL DEFAULT 60,
  backoff_strategy text NOT NULL DEFAULT 'exponential',
  backoff_multiplier numeric NOT NULL DEFAULT 2.0,
  max_delay_seconds int NOT NULL DEFAULT 3600,
  retryable_error_codes text[],
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_retry_policy_channel_chk
    CHECK (channel IN ('email','sms','push','in_app','letter','print','whatsapp')),
  CONSTRAINT communication_retry_policy_strategy_chk
    CHECK (backoff_strategy IN ('fixed','linear','exponential'))
);

CREATE UNIQUE INDEX communication_retry_policy_channel_provider_uidx
  ON public.communication_retry_policy (channel, COALESCE(provider_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_retry_policy TO authenticated;
GRANT ALL ON public.communication_retry_policy TO service_role;
ALTER TABLE public.communication_retry_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retry_policy read authenticated"
  ON public.communication_retry_policy FOR SELECT TO authenticated USING (true);

CREATE POLICY "retry_policy write system admin"
  ON public.communication_retry_policy FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())
         OR public.has_permission(auth.uid(), 'system_administration', 'view'))
  WITH CHECK (public.is_admin(auth.uid())
              OR public.has_permission(auth.uid(), 'system_administration', 'view'));

CREATE TRIGGER trg_communication_retry_policy_updated
  BEFORE UPDATE ON public.communication_retry_policy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.communication_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no text NOT NULL UNIQUE,
  module_code text NOT NULL,
  department_code text,
  event_code text NOT NULL,
  entity_type text,
  entity_id text,
  reference_no text,
  template_id uuid REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  core_template_id uuid REFERENCES public.core_template(id) ON DELETE SET NULL,
  country_code text,
  language_code text,
  channels text[] NOT NULL DEFAULT ARRAY[]::text[],
  priority text NOT NULL DEFAULT 'normal',
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text UNIQUE,
  requested_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_request_priority_chk
    CHECK (priority IN ('low','normal','high','urgent')),
  CONSTRAINT communication_request_status_chk
    CHECK (status IN ('pending','approved','dispatching','completed','partial','failed','cancelled'))
);

CREATE INDEX communication_request_module_event_idx ON public.communication_request (module_code, event_code);
CREATE INDEX communication_request_entity_idx ON public.communication_request (entity_type, entity_id);
CREATE INDEX communication_request_status_scheduled_idx ON public.communication_request (status, scheduled_at);
CREATE INDEX communication_request_created_at_idx ON public.communication_request (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_request TO authenticated;
GRANT ALL ON public.communication_request TO service_role;
ALTER TABLE public.communication_request ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comm_request read authenticated"
  ON public.communication_request FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'notification_logs', 'view-logs')
    OR public.has_permission(auth.uid(), 'system_administration', 'view')
    OR requested_by = auth.uid()
  );

CREATE POLICY "comm_request insert admin"
  ON public.communication_request FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'system_administration', 'view')
  );

CREATE POLICY "comm_request update admin"
  ON public.communication_request FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'system_administration', 'view')
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'system_administration', 'view')
  );

CREATE TRIGGER trg_communication_request_updated
  BEFORE UPDATE ON public.communication_request
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE OR REPLACE FUNCTION public.can_access_communication_request(_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.communication_request r
    WHERE r.id = _request_id
      AND (
        public.is_admin(auth.uid())
        OR public.has_permission(auth.uid(), 'notification_logs', 'view-logs')
        OR public.has_permission(auth.uid(), 'system_administration', 'view')
        OR r.requested_by = auth.uid()
      )
  );
$$;


CREATE TABLE public.communication_recipient (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.communication_request(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'to',
  recipient_type text,
  recipient_user_id uuid,
  recipient_person_id uuid,
  recipient_employer_id uuid,
  name text,
  email text,
  phone text,
  postal_address jsonb,
  channel_hint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_recipient_role_chk
    CHECK (role IN ('to','cc','bcc','reply_to'))
);

CREATE INDEX communication_recipient_request_idx ON public.communication_recipient (request_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_recipient TO authenticated;
GRANT ALL ON public.communication_recipient TO service_role;
ALTER TABLE public.communication_recipient ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comm_recipient read via request"
  ON public.communication_recipient FOR SELECT TO authenticated
  USING (public.can_access_communication_request(request_id));

CREATE POLICY "comm_recipient write admin"
  ON public.communication_recipient FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'system_administration', 'view')
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'system_administration', 'view')
  );

CREATE TRIGGER trg_communication_recipient_updated
  BEFORE UPDATE ON public.communication_recipient
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


INSERT INTO public.communication_retry_policy
  (channel, provider_id, max_attempts, initial_delay_seconds, backoff_strategy, backoff_multiplier, max_delay_seconds, retryable_error_codes, is_active, notes)
VALUES
  ('email',   NULL, 5, 60,   'exponential', 2.0, 3600, ARRAY['timeout','429','500','502','503','504'], true, 'Default email retry policy'),
  ('sms',     NULL, 3, 30,   'exponential', 2.0, 1800, ARRAY['timeout','429','500','503'],             true, 'Default SMS retry policy'),
  ('push',    NULL, 3, 15,   'exponential', 2.0, 900,  ARRAY['timeout','429','503'],                    true, 'Default push retry policy'),
  ('in_app',  NULL, 1, 0,    'fixed',       1.0, 0,    ARRAY[]::text[],                                 true, 'In-app messages are not retried'),
  ('letter',  NULL, 3, 300,  'linear',      1.0, 3600, ARRAY['print_failure','queue_error'],           true, 'Default letter/print-queue policy'),
  ('print',   NULL, 3, 300,  'linear',      1.0, 3600, ARRAY['print_failure','queue_error'],           true, 'Default print job policy');
