-- EPIC 2E rehearsal fix: align operator action event log types with the existing
-- communication_event_log_type_chk allowed values.
-- Safe-only: no live email, no cron, no live window, no live status changes.

CREATE OR REPLACE FUNCTION public.clear_comm_hub_message_lock(
  p_message_id uuid,
  p_reason text,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg communication_message%ROWTYPE;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF p_actor_user_id IS NULL THEN RAISE EXCEPTION 'actor_user_id required'; END IF;
  IF NOT public.has_role(p_actor_user_id, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin required';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'reason required'; END IF;

  SELECT * INTO v_msg FROM public.communication_message WHERE id = p_message_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'message not found: %', p_message_id; END IF;
  IF COALESCE(v_msg.origin, '') <> 'comm_hub' THEN
    RAISE EXCEPTION 'refusing: message origin=% (comm_hub only)', v_msg.origin;
  END IF;
  IF v_msg.status <> 'sending' THEN
    RAISE EXCEPTION 'refusing: status=% (only sending eligible for stale-lock clear)', v_msg.status;
  END IF;
  IF v_msg.locked_at IS NULL OR v_msg.locked_at > now() - INTERVAL '10 minutes' THEN
    RAISE EXCEPTION 'refusing: lock not stale (>10 minutes required)';
  END IF;

  v_old := jsonb_build_object('status', v_msg.status, 'locked_at', v_msg.locked_at, 'locked_by', v_msg.locked_by);

  UPDATE public.communication_message
     SET status='queued',
         locked_at=NULL,
         locked_by=NULL,
         next_attempt_at=now(),
         updated_at=now()
   WHERE id = p_message_id;

  v_new := jsonb_build_object('status','queued','next_attempt_at',now(),'cleared_by',p_actor_user_id);

  INSERT INTO public.communication_event_log
    (message_id, request_id, event_type, source, payload, actor_user_id)
  VALUES
    (v_msg.id, v_msg.request_id, 'queued', 'clear_comm_hub_message_lock',
     jsonb_build_object(
       'stage','STALE_LOCK_CLEARED_BY_ADMIN',
       'logical_event_type','lock_cleared',
       'reason',p_reason,
       'actor',p_actor_user_id,
       'previous_locked_at',v_msg.locked_at,
       'previous_locked_by',v_msg.locked_by
     ),
     p_actor_user_id);

  INSERT INTO public.communication_hub_control_audit
    (setting_key, old_value, new_value, reason, changed_by, source)
  VALUES
    ('message_lock_cleared:' || p_message_id::text, v_old, v_new, p_reason, p_actor_user_id, 'clear_comm_hub_message_lock');

  RETURN jsonb_build_object('ok', true, 'message_id', p_message_id, 'new_status', 'queued');
END;
$$;
REVOKE ALL ON FUNCTION public.clear_comm_hub_message_lock(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_comm_hub_message_lock(uuid, text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.retry_comm_hub_message(
  p_message_id uuid,
  p_reason text,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg communication_message%ROWTYPE;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF p_actor_user_id IS NULL THEN RAISE EXCEPTION 'actor_user_id required'; END IF;
  IF NOT public.has_role(p_actor_user_id, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin required';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'reason required'; END IF;

  SELECT * INTO v_msg FROM public.communication_message WHERE id = p_message_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'message not found: %', p_message_id; END IF;
  IF COALESCE(v_msg.origin, '') <> 'comm_hub' THEN
    RAISE EXCEPTION 'refusing: message origin=% (comm_hub only)', v_msg.origin;
  END IF;
  IF v_msg.status <> 'failed' THEN
    RAISE EXCEPTION 'refusing: status=% (retry allowed only for failed in this phase)', v_msg.status;
  END IF;
  IF v_msg.test_mode IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'refusing: retry is dry-run-only in this phase (test_mode must be true)';
  END IF;

  v_old := jsonb_build_object(
    'status',v_msg.status,
    'error_code',v_msg.error_code,
    'error_message',v_msg.error_message,
    'attempt_count',v_msg.attempt_count,
    'locked_at',v_msg.locked_at,
    'locked_by',v_msg.locked_by
  );

  UPDATE public.communication_message
     SET status='queued',
         next_attempt_at=now(),
         error_code=NULL,
         error_message=NULL,
         locked_at=NULL,
         locked_by=NULL,
         updated_at=now()
   WHERE id = p_message_id;

  v_new := jsonb_build_object(
    'status','queued',
    'next_attempt_at',now(),
    'attempt_count_preserved', v_msg.attempt_count,
    'requeued_by', p_actor_user_id
  );

  INSERT INTO public.communication_event_log
    (message_id, request_id, event_type, source, payload, actor_user_id)
  VALUES
    (v_msg.id, v_msg.request_id, 'retried', 'retry_comm_hub_message',
     jsonb_build_object(
       'stage','MESSAGE_REQUEUED_BY_ADMIN',
       'logical_event_type','requeued',
       'reason',p_reason,
       'actor',p_actor_user_id,
       'previous_status','failed',
       'previous_error_code',v_msg.error_code,
       'attempt_count_preserved', v_msg.attempt_count,
       'test_mode', true
     ),
     p_actor_user_id);

  INSERT INTO public.communication_hub_control_audit
    (setting_key, old_value, new_value, reason, changed_by, source)
  VALUES
    ('message_requeued:' || p_message_id::text, v_old, v_new, p_reason, p_actor_user_id, 'retry_comm_hub_message');

  BEGIN
    PERFORM public.recompute_communication_request_status(v_msg.request_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'message_id', p_message_id,
    'request_id', v_msg.request_id,
    'new_status', 'queued',
    'test_mode', true
  );
END;
$$;
REVOKE ALL ON FUNCTION public.retry_comm_hub_message(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_comm_hub_message(uuid, text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_comm_hub_synthetic_stale_locked_test_message(
  p_module_code text,
  p_event_code text,
  p_template_code text,
  p_reason text,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tpl_id uuid;
  v_tpl_ver uuid;
  v_req_id uuid := gen_random_uuid();
  v_req_no text;
  v_recipient_id uuid := gen_random_uuid();
  v_msg_id uuid := gen_random_uuid();
  v_locked_at timestamptz := now() - interval '16 minutes';
BEGIN
  IF NOT has_role(p_actor_user_id, 'Admin'::app_role) THEN RAISE EXCEPTION 'forbidden_admin_only'; END IF;
  IF coalesce(trim(p_reason),'') = '' THEN RAISE EXCEPTION 'reason_required'; END IF;

  SELECT id, active_version_id INTO v_tpl_id, v_tpl_ver
    FROM public.core_template
   WHERE code=p_template_code
     AND is_active=true
   LIMIT 1;
  IF v_tpl_id IS NULL OR v_tpl_ver IS NULL THEN RAISE EXCEPTION 'template_not_ready:%', p_template_code; END IF;

  v_req_no := 'CR-SYN-' || to_char(now() AT TIME ZONE 'UTC','YYYYMMDDHH24MISS') || '-' || upper(substr(md5(random()::text),1,6));

  INSERT INTO public.communication_request(
    id, request_no, module_code, event_code, status, priority,
    requested_by, payload, context, channels, created_at, updated_at
  ) VALUES (
    v_req_id, v_req_no, p_module_code, p_event_code, 'dispatching', 'normal',
    p_actor_user_id,
    jsonb_build_object('synthetic', true, 'reason', p_reason),
    jsonb_build_object('synthetic', true, 'origin','comm_hub', 'test_mode', true,
                      'source','create_comm_hub_synthetic_stale_locked_test_message'),
    ARRAY['email']::text[],
    now(), now()
  );

  INSERT INTO public.communication_recipient(
    id, request_id, role, recipient_type, email, name, channel_hint, created_at, updated_at
  ) VALUES (
    v_recipient_id, v_req_id, 'to', 'ADMIN_USER', 'rohit@mishainfotech.com', 'Rohit Wadhwa (synthetic)', 'email', now(), now()
  );

  INSERT INTO public.communication_message(
    id, request_id, recipient_id, channel, template_version_id,
    subject, body_text, status, attempt_count, provider_message_id,
    error_code, error_message, test_mode, origin,
    locked_at, locked_by, created_at, updated_at
  ) VALUES (
    v_msg_id, v_req_id, v_recipient_id, 'email', v_tpl_ver,
    'SYNTHETIC — stale lock rehearsal',
    'Synthetic stale-locked dry-run message for clear-lock rehearsal. No provider was called.',
    'sending', 0, NULL,
    'SYNTHETIC_STALE_LOCK_TEST',
    'Synthetic stale-locked dry-run message for operator clear-lock rehearsal',
    true, 'comm_hub',
    v_locked_at, 'synthetic-operator-rehearsal',
    now(), now()
  );

  INSERT INTO public.communication_event_log(message_id, request_id, event_type, source, payload, actor_user_id)
  VALUES (
    v_msg_id,
    v_req_id,
    'created',
    'create_comm_hub_synthetic_stale_locked_test_message',
    jsonb_build_object(
      'synthetic', true,
      'stage','SYNTHETIC_STALE_LOCK_TEST_MESSAGE_CREATED',
      'logical_message_status','sending',
      'locked_at', v_locked_at,
      'reason', p_reason
    ),
    p_actor_user_id
  );

  INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
  VALUES ('synthetic_stale_lock_test_message_created:'||v_msg_id::text, NULL,
          jsonb_build_object('request_id',v_req_id,'request_no',v_req_no,'message_id',v_msg_id,'module_code',p_module_code,'event_code',p_event_code,'template_code',p_template_code,'locked_at',v_locked_at),
          p_reason, p_actor_user_id, 'create_comm_hub_synthetic_stale_locked_test_message');

  RETURN jsonb_build_object('ok', true, 'request_id', v_req_id, 'request_no', v_req_no, 'message_id', v_msg_id, 'locked_at', v_locked_at);
END;
$$;
REVOKE ALL ON FUNCTION public.create_comm_hub_synthetic_stale_locked_test_message(text,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_comm_hub_synthetic_stale_locked_test_message(text,text,text,text,uuid) TO authenticated, service_role;