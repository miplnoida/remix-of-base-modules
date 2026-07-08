
-- Phase 1A Migration 2/3

CREATE TABLE public.communication_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.communication_request(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.communication_recipient(id) ON DELETE SET NULL,
  channel text NOT NULL,
  provider_id uuid REFERENCES public.notification_providers(id) ON DELETE SET NULL,
  template_version_id uuid REFERENCES public.core_template_version(id) ON DELETE SET NULL,
  subject text,
  body_text text,
  body_html text,
  rendered_at timestamptz,
  generated_document_id uuid REFERENCES public.core_generated_document(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued',
  attempt_count int NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  provider_message_id text,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_message_channel_chk
    CHECK (channel IN ('email','sms','push','in_app','letter','print','whatsapp')),
  CONSTRAINT communication_message_status_chk
    CHECK (status IN ('queued','sending','sent','delivered','failed','bounced','cancelled','suppressed'))
);

CREATE INDEX communication_message_request_idx ON public.communication_message (request_id);
CREATE INDEX communication_message_recipient_idx ON public.communication_message (recipient_id);
CREATE INDEX communication_message_status_next_idx ON public.communication_message (status, next_attempt_at);
CREATE INDEX communication_message_provider_msg_idx ON public.communication_message (provider_message_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_message TO authenticated;
GRANT ALL ON public.communication_message TO service_role;
ALTER TABLE public.communication_message ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comm_message read via request"
  ON public.communication_message FOR SELECT TO authenticated
  USING (public.can_access_communication_request(request_id));

CREATE POLICY "comm_message write admin"
  ON public.communication_message FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())
         OR public.has_permission(auth.uid(), 'system_administration', 'view'))
  WITH CHECK (public.is_admin(auth.uid())
              OR public.has_permission(auth.uid(), 'system_administration', 'view'));

CREATE TRIGGER trg_communication_message_updated
  BEFORE UPDATE ON public.communication_message
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.communication_delivery_attempt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.communication_message(id) ON DELETE CASCADE,
  attempt_no int NOT NULL,
  provider_id uuid REFERENCES public.notification_providers(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL,
  provider_message_id text,
  provider_response jsonb,
  error_code text,
  error_message text,
  retry_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_delivery_attempt_status_chk
    CHECK (status IN ('success','failure','timeout','throttled','skipped')),
  CONSTRAINT communication_delivery_attempt_msg_no_uk UNIQUE (message_id, attempt_no)
);

CREATE INDEX communication_delivery_attempt_msg_idx
  ON public.communication_delivery_attempt (message_id, attempt_no);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_delivery_attempt TO authenticated;
GRANT ALL ON public.communication_delivery_attempt TO service_role;
ALTER TABLE public.communication_delivery_attempt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comm_attempt read via request"
  ON public.communication_delivery_attempt FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.communication_message m
    WHERE m.id = communication_delivery_attempt.message_id
      AND public.can_access_communication_request(m.request_id)
  ));

CREATE POLICY "comm_attempt write admin"
  ON public.communication_delivery_attempt FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())
         OR public.has_permission(auth.uid(), 'system_administration', 'view'))
  WITH CHECK (public.is_admin(auth.uid())
              OR public.has_permission(auth.uid(), 'system_administration', 'view'));

CREATE TRIGGER trg_communication_delivery_attempt_updated
  BEFORE UPDATE ON public.communication_delivery_attempt
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.communication_attachment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.communication_message(id) ON DELETE CASCADE,
  generated_document_id uuid REFERENCES public.core_generated_document(id) ON DELETE SET NULL,
  storage_ref text,
  filename text,
  mime_type text,
  size_bytes bigint,
  role text NOT NULL DEFAULT 'primary',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_attachment_role_chk
    CHECK (role IN ('primary','supporting','legal_reference'))
);

CREATE INDEX communication_attachment_msg_idx ON public.communication_attachment (message_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_attachment TO authenticated;
GRANT ALL ON public.communication_attachment TO service_role;
ALTER TABLE public.communication_attachment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comm_attachment read via request"
  ON public.communication_attachment FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.communication_message m
    WHERE m.id = communication_attachment.message_id
      AND public.can_access_communication_request(m.request_id)
  ));

CREATE POLICY "comm_attachment write admin"
  ON public.communication_attachment FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())
         OR public.has_permission(auth.uid(), 'system_administration', 'view'))
  WITH CHECK (public.is_admin(auth.uid())
              OR public.has_permission(auth.uid(), 'system_administration', 'view'));

CREATE TRIGGER trg_communication_attachment_updated
  BEFORE UPDATE ON public.communication_attachment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.communication_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.communication_message(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.communication_request(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text,
  payload jsonb,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_event_log_type_chk
    CHECK (event_type IN ('created','approved','queued','sent','delivered','opened','clicked','bounced','complained','failed','retried','cancelled','suppressed')),
  CONSTRAINT communication_event_log_scope_chk
    CHECK (message_id IS NOT NULL OR request_id IS NOT NULL)
);

CREATE INDEX communication_event_log_msg_idx ON public.communication_event_log (message_id, occurred_at DESC);
CREATE INDEX communication_event_log_req_idx ON public.communication_event_log (request_id, occurred_at DESC);
CREATE INDEX communication_event_log_type_idx ON public.communication_event_log (event_type, occurred_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_event_log TO authenticated;
GRANT ALL ON public.communication_event_log TO service_role;
ALTER TABLE public.communication_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comm_event read via request"
  ON public.communication_event_log FOR SELECT TO authenticated
  USING (
    (request_id IS NOT NULL AND public.can_access_communication_request(request_id))
    OR (message_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.communication_message m
      WHERE m.id = communication_event_log.message_id
        AND public.can_access_communication_request(m.request_id)
    ))
  );

CREATE POLICY "comm_event write admin"
  ON public.communication_event_log FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())
         OR public.has_permission(auth.uid(), 'system_administration', 'view'))
  WITH CHECK (public.is_admin(auth.uid())
              OR public.has_permission(auth.uid(), 'system_administration', 'view'));
