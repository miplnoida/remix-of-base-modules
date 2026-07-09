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
AS $function$
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
    FROM public.core_template WHERE code=p_template_code AND is_active=true LIMIT 1;
  IF v_tpl_id IS NULL OR v_tpl_ver IS NULL THEN RAISE EXCEPTION 'template_not_ready:%', p_template_code; END IF;

  v_req_no := 'CR-SYN-' || to_char(now() AT TIME ZONE 'UTC','YYYYMMDDHH24MISS') || '-' || upper(substr(md5(random()::text),1,6));

  INSERT INTO public.communication_request(
    id, request_no, module_code, event_code, status, priority,
    origin, test_mode, requested_by, metadata, created_at, updated_at
  ) VALUES (
    v_req_id, v_req_no, p_module_code, p_event_code, 'sending', 'normal',
    'comm_hub', true, p_actor_user_id,
    jsonb_build_object('synthetic', true, 'reason', p_reason, 'source','create_comm_hub_synthetic_stale_locked_test_message'),
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
    locked_at, locked_by,
    created_at, updated_at
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
  VALUES (v_msg_id, v_req_id, 'sending', 'create_comm_hub_synthetic_stale_locked_test_message',
          jsonb_build_object('synthetic', true, 'stage','SYNTHETIC_STALE_LOCK_TEST_MESSAGE_CREATED', 'locked_at', v_locked_at, 'reason', p_reason),
          p_actor_user_id);

  INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
  VALUES ('synthetic_stale_lock_test_message_created:'||v_msg_id::text, NULL,
          jsonb_build_object('request_id',v_req_id,'request_no',v_req_no,'message_id',v_msg_id,'module_code',p_module_code,'event_code',p_event_code,'template_code',p_template_code,'locked_at',v_locked_at),
          p_reason, p_actor_user_id, 'create_comm_hub_synthetic_stale_locked_test_message');

  RETURN jsonb_build_object('ok', true, 'request_id', v_req_id, 'request_no', v_req_no, 'message_id', v_msg_id, 'locked_at', v_locked_at);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_comm_hub_synthetic_stale_locked_test_message(text,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_comm_hub_synthetic_stale_locked_test_message(text,text,text,text,uuid) TO authenticated;