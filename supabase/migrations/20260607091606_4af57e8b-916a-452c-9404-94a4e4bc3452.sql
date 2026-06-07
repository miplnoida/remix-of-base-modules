ALTER TABLE public.bn_communication_log
  DROP CONSTRAINT IF EXISTS bn_communication_log_status_check;

ALTER TABLE public.bn_communication_log
  ADD CONSTRAINT bn_communication_log_status_check
  CHECK (status::text = ANY (ARRAY[
    'QUEUED','SENT','FAILED','RETRYING','DELIVERED',
    'SKIPPED','BLOCKED','GENERATED','PRINT_PENDING','PRINTED','DISPATCHED'
  ]::text[]));

CREATE INDEX IF NOT EXISTS idx_bn_comm_log_claim_status
  ON public.bn_communication_log (claim_id, status, created_at DESC);