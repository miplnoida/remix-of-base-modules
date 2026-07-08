
-- Phase 1A Migration 3/3

CREATE TABLE public.communication_approval (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.communication_request(id) ON DELETE CASCADE,
  policy_ref text,
  required_role text,
  required_permission text,
  sequence int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_approval_status_chk
    CHECK (status IN ('pending','approved','rejected','skipped'))
);

CREATE INDEX communication_approval_request_seq_idx
  ON public.communication_approval (request_id, sequence);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_approval TO authenticated;
GRANT ALL ON public.communication_approval TO service_role;
ALTER TABLE public.communication_approval ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comm_approval read via request"
  ON public.communication_approval FOR SELECT TO authenticated
  USING (public.can_access_communication_request(request_id));

CREATE POLICY "comm_approval write admin"
  ON public.communication_approval FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())
         OR public.has_permission(auth.uid(), 'system_administration', 'view'))
  WITH CHECK (public.is_admin(auth.uid())
              OR public.has_permission(auth.uid(), 'system_administration', 'view'));

CREATE TRIGGER trg_communication_approval_updated
  BEFORE UPDATE ON public.communication_approval
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Compatibility view: full message summary
CREATE OR REPLACE VIEW public.v_communication_message_full AS
SELECT
  m.id                       AS message_id,
  m.request_id,
  r.request_no,
  r.module_code,
  r.department_code,
  r.event_code,
  r.entity_type,
  r.entity_id,
  r.reference_no,
  m.recipient_id,
  m.channel,
  m.provider_id,
  m.subject,
  m.status                   AS message_status,
  r.status                   AS request_status,
  m.attempt_count,
  m.last_attempt_at,
  m.next_attempt_at,
  m.sent_at,
  m.delivered_at,
  m.provider_message_id,
  m.error_code,
  m.error_message,
  m.generated_document_id,
  m.created_at,
  m.updated_at,
  (SELECT max(a.attempt_no)
     FROM public.communication_delivery_attempt a
     WHERE a.message_id = m.id)  AS latest_attempt_no,
  (SELECT ev.event_type
     FROM public.communication_event_log ev
     WHERE ev.message_id = m.id
     ORDER BY ev.occurred_at DESC
     LIMIT 1)                     AS latest_event_type,
  (SELECT ev.occurred_at
     FROM public.communication_event_log ev
     WHERE ev.message_id = m.id
     ORDER BY ev.occurred_at DESC
     LIMIT 1)                     AS latest_event_at
FROM public.communication_message m
JOIN public.communication_request r ON r.id = m.request_id;

GRANT SELECT ON public.v_communication_message_full TO authenticated, service_role;


-- Compatibility view: BN unified
CREATE OR REPLACE VIEW public.v_bn_communication_log_unified AS
SELECT
  'legacy_bn'::text        AS source,
  b.id                     AS row_id,
  NULL::uuid               AS request_id,
  NULL::uuid               AS message_id,
  b.claim_id::text         AS claim_id,
  b.event_code::text       AS event_code,
  b.channel::text          AS channel,
  b.recipient_address      AS recipient_address,
  b.subject                AS subject,
  b.status::text           AS status,
  b.provider_message_id    AS provider_message_id,
  b.error_message          AS error_message,
  b.retry_count            AS retry_count,
  NULL::timestamptz        AS sent_at,
  NULL::timestamptz        AS delivered_at,
  b.created_at             AS created_at
FROM public.bn_communication_log b
UNION ALL
SELECT
  'hub'::text              AS source,
  m.id                     AS row_id,
  m.request_id             AS request_id,
  m.id                     AS message_id,
  r.entity_id              AS claim_id,
  r.event_code             AS event_code,
  m.channel                AS channel,
  NULL::text               AS recipient_address,
  m.subject                AS subject,
  m.status                 AS status,
  m.provider_message_id    AS provider_message_id,
  m.error_message          AS error_message,
  m.attempt_count          AS retry_count,
  m.sent_at                AS sent_at,
  m.delivered_at           AS delivered_at,
  m.created_at             AS created_at
FROM public.communication_message m
JOIN public.communication_request r ON r.id = m.request_id
WHERE r.module_code = 'BN' AND r.entity_type = 'bn_claim';

GRANT SELECT ON public.v_bn_communication_log_unified TO authenticated, service_role;


-- Compatibility view: CE notice delivery unified
CREATE OR REPLACE VIEW public.v_ce_notice_delivery_log_unified AS
SELECT
  'legacy_ce'::text        AS source,
  c.id                     AS row_id,
  NULL::uuid               AS request_id,
  NULL::uuid               AS message_id,
  c.notice_id::text        AS notice_id,
  c.attempt_number         AS attempt_no,
  c.channel::text          AS channel,
  c.recipient_address::text AS recipient_address,
  c.status::text           AS status,
  c.sent_at                AS sent_at,
  c.delivered_at           AS delivered_at,
  c.failure_reason         AS failure_reason,
  c.provider_message_id::text AS provider_message_id,
  c.created_at             AS created_at
FROM public.ce_notice_delivery_log c
UNION ALL
SELECT
  'hub'::text              AS source,
  a.id                     AS row_id,
  m.request_id             AS request_id,
  m.id                     AS message_id,
  r.entity_id              AS notice_id,
  a.attempt_no             AS attempt_no,
  m.channel                AS channel,
  NULL::text               AS recipient_address,
  a.status                 AS status,
  a.started_at             AS sent_at,
  a.finished_at            AS delivered_at,
  a.error_message          AS failure_reason,
  a.provider_message_id    AS provider_message_id,
  a.created_at             AS created_at
FROM public.communication_delivery_attempt a
JOIN public.communication_message m ON m.id = a.message_id
JOIN public.communication_request r ON r.id = m.request_id
WHERE r.module_code = 'COMPLIANCE' AND r.entity_type = 'ce_notice';

GRANT SELECT ON public.v_ce_notice_delivery_log_unified TO authenticated, service_role;
