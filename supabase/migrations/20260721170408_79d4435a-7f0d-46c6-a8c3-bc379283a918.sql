
ALTER TABLE public.communication_request DROP CONSTRAINT IF EXISTS communication_request_status_chk;
ALTER TABLE public.communication_request ADD CONSTRAINT communication_request_status_chk
  CHECK (status = ANY (ARRAY['pending','approved','dispatching','completed','partial','failed','cancelled','dry_run']));

ALTER TABLE public.communication_message DROP CONSTRAINT IF EXISTS communication_message_status_chk;
ALTER TABLE public.communication_message ADD CONSTRAINT communication_message_status_chk
  CHECK (status = ANY (ARRAY['queued','sending','sent','delivered','failed','bounced','cancelled','suppressed','dry_run']));
