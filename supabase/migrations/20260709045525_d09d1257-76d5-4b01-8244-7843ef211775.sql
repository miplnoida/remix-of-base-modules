
CREATE OR REPLACE FUNCTION public.claim_comm_hub_messages(
  p_batch_size int,
  p_worker_id text,
  p_include_live boolean
)
RETURNS SETOF public.communication_message
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch int := GREATEST(1, LEAST(COALESCE(p_batch_size, 25), 200));
BEGIN
  RETURN QUERY
  WITH cte AS (
    SELECT id
    FROM public.communication_message
    WHERE origin = 'comm_hub'
      AND channel = 'email'
      AND status = 'queued'
      AND (p_include_live IS TRUE OR test_mode IS TRUE)
      AND (next_attempt_at IS NULL OR next_attempt_at <= now())
      AND (locked_at IS NULL OR locked_at < now() - interval '10 minutes')
    ORDER BY created_at
    LIMIT v_batch
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.communication_message m
  SET status = 'sending',
      locked_at = now(),
      locked_by = p_worker_id,
      attempt_count = m.attempt_count + 1,
      last_attempt_at = now(),
      updated_at = now()
  FROM cte
  WHERE m.id = cte.id
  RETURNING m.*;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_comm_hub_messages(int, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_comm_hub_messages(int, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_comm_hub_messages(int, text, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_comm_hub_messages(int, text, boolean) TO service_role;
