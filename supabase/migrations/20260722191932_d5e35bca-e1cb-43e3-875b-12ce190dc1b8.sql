
-- Part G: terminalise the orphan pre-provider Controlled Stub message from execution-5.
-- Message id 8e83b69f-3486-45d1-8a33-a9976c8c655a was created without authoritative
-- classification fields (send_context, sender_profile_id, template_version_id),
-- causing the targeted dispatcher to reject it with HTTP 409 before any provider call.
-- Its grant a0f5e1db-6acd-4ef8-b75d-390f574227f2 is already REVOKED and no delivery
-- attempt exists. We mark it cancelled with structured evidence so no queue path
-- (normal, retry, targeted) can pick it up.

DO $$
DECLARE
  v_msg uuid := '8e83b69f-3486-45d1-8a33-a9976c8c655a';
  v_req uuid := '76c72b0f-aae2-4391-bf40-3cd62e74ee96';
  v_exec uuid := 'cff848ce-74cc-4356-bdac-8825db55c8f6';
  v_grant uuid := 'a0f5e1db-6acd-4ef8-b75d-390f574227f2';
  v_attempts int;
  v_current_status text;
BEGIN
  SELECT status INTO v_current_status FROM public.communication_message WHERE id = v_msg;
  IF v_current_status IS NULL THEN
    RAISE NOTICE 'Message % not found; nothing to terminalise.', v_msg;
    RETURN;
  END IF;
  IF v_current_status <> 'queued' THEN
    RAISE NOTICE 'Message % already in status %; leaving as-is.', v_msg, v_current_status;
    RETURN;
  END IF;

  SELECT count(*) INTO v_attempts
  FROM public.communication_delivery_attempt WHERE message_id = v_msg;
  IF v_attempts > 0 THEN
    RAISE EXCEPTION 'Refusing to terminalise message % — % delivery attempts exist.', v_msg, v_attempts;
  END IF;

  UPDATE public.communication_message
     SET status = 'cancelled',
         error_code = 'controlled_live_aborted_pre_provider',
         error_message = concat(
           'Controlled Stub execution ', v_exec::text,
           ' aborted before provider invocation. Grant ', v_grant::text,
           ' REVOKED. Message lacked authoritative classification fields ',
           '(send_context, sender_profile_id, template_version_id). ',
           'provider_adapter_invoked=false, provider_call_attempted=false, ',
           'external_provider_call_attempted=false, simulated=false, ',
           'retry_safe=true, automatic_retry_allowed=false, ',
           'existing_message_dispatchable=false, ',
           'requires_new_execution=true, requires_new_grant=true. ',
           'Terminalised by CH-SIMPLE-P3E recovery slice at ', now()::text, '.'
         ),
         locked_at = NULL,
         locked_by = NULL,
         dry_run_locked = false,
         updated_at = now()
   WHERE id = v_msg
     AND status = 'queued';

  -- Recompute the parent request status if every message on it is terminal.
  IF EXISTS (SELECT 1 FROM public.communication_request WHERE id = v_req)
     AND NOT EXISTS (
       SELECT 1 FROM public.communication_message
       WHERE request_id = v_req AND status NOT IN ('sent','failed','cancelled','suppressed')
     ) THEN
    UPDATE public.communication_request
       SET status = 'cancelled',
           updated_at = now()
     WHERE id = v_req
       AND status = 'pending';
  END IF;
END $$;
