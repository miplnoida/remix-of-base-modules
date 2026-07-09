-- Phase 1C-B8-C: targeted single-message claim.
-- Safe by construction: SECURITY DEFINER, service_role EXECUTE only,
-- honors live eligibility window identical to batch claim.

CREATE OR REPLACE FUNCTION public.claim_comm_hub_message_by_id(
  p_message_id uuid,
  p_worker_id text,
  p_include_live boolean,
  p_live_eligible_after timestamptz DEFAULT NULL,
  p_live_max_age_minutes int DEFAULT 30
)
RETURNS SETOF public.communication_message
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.communication_message;
  v_max_age int := COALESCE(p_live_max_age_minutes, 30);
BEGIN
  IF p_message_id IS NULL OR p_worker_id IS NULL OR length(p_worker_id) = 0 THEN
    RETURN;
  END IF;

  SELECT *
    INTO v_row
    FROM public.communication_message
   WHERE id = p_message_id
     AND origin = 'comm_hub'
     AND channel = 'email'
     AND status = 'queued'
     AND (next_attempt_at IS NULL OR next_attempt_at <= now())
     AND (locked_at IS NULL OR locked_at < now() - interval '10 minutes')
   FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Live eligibility check for test_mode=false rows.
  IF v_row.test_mode = false THEN
    IF NOT p_include_live THEN
      RETURN;
    END IF;
    IF p_live_eligible_after IS NULL THEN
      RETURN;
    END IF;
    IF v_row.created_at < p_live_eligible_after THEN
      RETURN;
    END IF;
    IF v_row.created_at < now() - make_interval(mins => v_max_age) THEN
      RETURN;
    END IF;
  END IF;

  UPDATE public.communication_message
     SET status = 'sending',
         attempt_count = attempt_count + 1,
         locked_at = now(),
         locked_by = p_worker_id,
         last_attempt_at = now(),
         updated_at = now()
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_comm_hub_message_by_id(uuid, text, boolean, timestamptz, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_comm_hub_message_by_id(uuid, text, boolean, timestamptz, int) TO service_role;
