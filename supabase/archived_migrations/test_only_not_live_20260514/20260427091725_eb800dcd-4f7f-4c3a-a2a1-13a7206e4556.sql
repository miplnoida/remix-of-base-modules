
-- Add DMS-tracking columns to er_documents (parity with ip_documents)
ALTER TABLE public.er_documents
  ADD COLUMN IF NOT EXISTS application_reference_number varchar(50),
  ADD COLUMN IF NOT EXISTS source_document_id           varchar(64),
  ADD COLUMN IF NOT EXISTS transfer_status              varchar(20) NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS transfer_error               text,
  ADD COLUMN IF NOT EXISTS dms_document_id              varchar(64),
  ADD COLUMN IF NOT EXISTS dms_uploaded_at              timestamptz,
  ADD COLUMN IF NOT EXISTS unique_uuid                  uuid;

-- Backfill application_reference_number from source_application_reference if present
UPDATE public.er_documents
   SET application_reference_number = source_application_reference
 WHERE application_reference_number IS NULL
   AND source_application_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_er_documents_app_ref
  ON public.er_documents(application_reference_number);

CREATE INDEX IF NOT EXISTS idx_er_documents_transfer_status
  ON public.er_documents(transfer_status) WHERE transfer_status <> 'Transferred';

-- Enqueue trigger for er_documents → dms_transfer_queue
CREATE OR REPLACE FUNCTION public.er_documents_enqueue_dms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true
     AND COALESCE(NEW.transfer_status, 'Pending') = 'Pending'
     AND COALESCE(NEW.file_path, '') <> '' THEN
    INSERT INTO public.dms_transfer_queue (scope, document_id, regno)
    VALUES ('er', NEW.id, NEW.regno)
    ON CONFLICT (scope, document_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_er_documents_enqueue_dms ON public.er_documents;
CREATE TRIGGER trg_er_documents_enqueue_dms
AFTER INSERT ON public.er_documents
FOR EACH ROW
EXECUTE FUNCTION public.er_documents_enqueue_dms();

-- Helper RPC: claim next pending queue rows for processing (locking)
CREATE OR REPLACE FUNCTION public.dms_queue_claim_batch(p_limit int DEFAULT 10)
RETURNS SETOF public.dms_transfer_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.dms_transfer_queue q
     SET status          = 'Processing',
         attempts        = attempts + 1,
         updated_at      = now()
   WHERE q.id IN (
     SELECT id FROM public.dms_transfer_queue
      WHERE status = 'Pending'
        AND next_attempt_at <= now()
        AND attempts < max_attempts
      ORDER BY next_attempt_at
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED
   )
  RETURNING q.*;
END;
$$;

-- Helper RPC: mark a queue row as completed/failed
CREATE OR REPLACE FUNCTION public.dms_queue_mark_result(
  p_queue_id uuid,
  p_success  boolean,
  p_error    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.dms_transfer_queue%ROWTYPE;
  v_backoff_seconds int;
BEGIN
  SELECT * INTO v_row FROM public.dms_transfer_queue WHERE id = p_queue_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF p_success THEN
    UPDATE public.dms_transfer_queue
       SET status = 'Transferred', last_error = NULL, updated_at = now()
     WHERE id = p_queue_id;

    IF v_row.scope = 'ip' THEN
      UPDATE public.ip_documents
         SET transfer_status = 'Transferred', dms_uploaded_at = now()
       WHERE id = v_row.document_id;
    ELSIF v_row.scope = 'er' THEN
      UPDATE public.er_documents
         SET transfer_status = 'Transferred', dms_uploaded_at = now()
       WHERE id = v_row.document_id;
    END IF;
  ELSE
    -- Exponential backoff: 60s * 2^attempts (capped at 1 hour)
    v_backoff_seconds := LEAST(3600, 60 * POWER(2, GREATEST(v_row.attempts, 1)))::int;
    UPDATE public.dms_transfer_queue
       SET status          = CASE WHEN attempts >= max_attempts THEN 'Failed' ELSE 'Pending' END,
           last_error      = p_error,
           next_attempt_at = now() + make_interval(secs => v_backoff_seconds),
           updated_at      = now()
     WHERE id = p_queue_id;

    IF v_row.scope = 'ip' THEN
      UPDATE public.ip_documents
         SET transfer_status = CASE WHEN v_row.attempts >= v_row.max_attempts THEN 'Failed' ELSE 'Pending' END,
             transfer_error  = p_error
       WHERE id = v_row.document_id;
    ELSIF v_row.scope = 'er' THEN
      UPDATE public.er_documents
         SET transfer_status = CASE WHEN v_row.attempts >= v_row.max_attempts THEN 'Failed' ELSE 'Pending' END,
             transfer_error  = p_error
       WHERE id = v_row.document_id;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dms_queue_claim_batch(int)  TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.dms_queue_mark_result(uuid, boolean, text) TO authenticated, anon, service_role;
