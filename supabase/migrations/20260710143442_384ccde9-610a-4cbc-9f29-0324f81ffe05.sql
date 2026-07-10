
-- EPIC 4D-LIVE-LEGAL-1: widen phase allowlist to include LEGAL/INTERNAL_CASE_ASSIGNMENT_NOTICE
CREATE OR REPLACE FUNCTION public.set_event_live_control(
  p_module_code text, p_event_code text, p_new_status text,
  p_reason text, p_risk_level text, p_typed_confirmation text, p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_prev_status text;
  v_prev_risk   text;
  v_prev_reason text;
  v_found boolean := false;
  v_allowed_legacy text;
  v_allowed_promote text;
  v_allowed_revert  text;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'set_event_live_control: actor required';
  END IF;
  IF NOT public.has_role(p_actor_user_id, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'set_event_live_control: forbidden — admin only';
  END IF;
  IF p_new_status NOT IN ('disabled','dry_run_only','live_manual_only','live_cron_allowed') THEN
    RAISE EXCEPTION 'set_event_live_control: invalid status %', p_new_status;
  END IF;
  IF coalesce(trim(p_reason),'') = '' THEN
    RAISE EXCEPTION 'set_event_live_control: reason required';
  END IF;
  IF p_new_status = 'live_cron_allowed' THEN
    RAISE EXCEPTION 'set_event_live_control: live_cron_allowed is not permitted in this phase';
  END IF;

  IF p_new_status = 'live_manual_only'
     AND NOT (
       (p_module_code = 'COMM_HUB'   AND p_event_code = 'ADMIN_TEST_NOTICE') OR
       (p_module_code = 'COMPLIANCE' AND p_event_code = 'INTERNAL_CASE_STATUS_NOTICE') OR
       (p_module_code = 'LEGAL'      AND p_event_code = 'INTERNAL_CASE_ASSIGNMENT_NOTICE')
     ) THEN
    RAISE EXCEPTION 'set_event_live_control: event %/% not permitted for live_manual_only in this phase',
      p_module_code, p_event_code;
  END IF;

  IF p_new_status = 'live_manual_only' THEN
    v_allowed_legacy  := 'ENABLE live_manual_only FOR ' || p_module_code || '/' || p_event_code;
    v_allowed_promote := 'PROMOTE ' || p_module_code || '/' || p_event_code || ' TO LIVE MANUAL ONLY';
    IF p_typed_confirmation IS DISTINCT FROM v_allowed_legacy
       AND p_typed_confirmation IS DISTINCT FROM v_allowed_promote THEN
      RAISE EXCEPTION 'set_event_live_control: typed confirmation must equal "%" or "%"',
        v_allowed_legacy, v_allowed_promote;
    END IF;
  ELSIF p_new_status = 'dry_run_only' THEN
    v_allowed_revert := 'REVERT ' || p_module_code || '/' || p_event_code || ' TO DRY RUN ONLY';
    SELECT status INTO v_prev_status FROM public.communication_hub_event_live_control
      WHERE module_code = p_module_code AND event_code = p_event_code LIMIT 1;
    IF v_prev_status IN ('live_manual_only','live_cron_allowed')
       AND p_typed_confirmation IS DISTINCT FROM v_allowed_revert THEN
      RAISE EXCEPTION 'set_event_live_control: typed confirmation must equal "%"', v_allowed_revert;
    END IF;
  END IF;

  SELECT status, risk_level, reason INTO v_prev_status, v_prev_risk, v_prev_reason
    FROM public.communication_hub_event_live_control
   WHERE module_code = p_module_code AND event_code = p_event_code LIMIT 1;
  v_found := FOUND;

  IF NOT v_found THEN
    INSERT INTO public.communication_hub_event_live_control(
      module_code, event_code, status, risk_level, reason, changed_by
    ) VALUES (p_module_code, p_event_code, p_new_status, coalesce(p_risk_level,'low'), p_reason, p_actor_user_id);
  ELSE
    UPDATE public.communication_hub_event_live_control
       SET status = p_new_status,
           risk_level = coalesce(p_risk_level, risk_level),
           reason = p_reason,
           changed_by = p_actor_user_id,
           changed_at = now()
     WHERE module_code = p_module_code AND event_code = p_event_code;
  END IF;

  INSERT INTO public.communication_hub_control_audit(
    setting_key, old_value, new_value, reason, changed_by, source
  ) VALUES (
    'event_live_control:' || p_module_code || '/' || p_event_code,
    jsonb_build_object('status', v_prev_status, 'risk_level', v_prev_risk, 'reason', v_prev_reason),
    jsonb_build_object('status', p_new_status, 'risk_level', coalesce(p_risk_level, v_prev_risk, 'low'), 'reason', p_reason),
    p_reason, p_actor_user_id, 'set_event_live_control'
  );

  RETURN jsonb_build_object(
    'ok', true, 'module_code', p_module_code, 'event_code', p_event_code,
    'previous_status', v_prev_status, 'new_status', p_new_status
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.open_comm_hub_live_window(
  p_module_code text, p_event_code text, p_duration_minutes integer,
  p_reason text, p_typed_confirmation text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_event_status text;
  v_queued_live integer;
  v_expected_confirm text;
  v_now timestamptz := now();
  v_new_after timestamptz;
  v_max_duration int;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'Admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    (p_module_code = 'COMM_HUB'   AND p_event_code = 'ADMIN_TEST_NOTICE') OR
    (p_module_code = 'COMPLIANCE' AND p_event_code = 'INTERNAL_CASE_STATUS_NOTICE') OR
    (p_module_code = 'LEGAL'      AND p_event_code = 'INTERNAL_CASE_ASSIGNMENT_NOTICE')
  ) THEN
    RAISE EXCEPTION 'unsupported event: %/% not permitted in this phase', p_module_code, p_event_code;
  END IF;

  v_expected_confirm := 'OPEN LIVE WINDOW FOR ' || p_module_code || '/' || p_event_code;
  IF p_typed_confirmation IS DISTINCT FROM v_expected_confirm THEN
    RAISE EXCEPTION 'typed confirmation mismatch: expected exact phrase';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason is required';
  END IF;

  v_max_duration := CASE WHEN p_module_code IN ('COMPLIANCE','LEGAL') THEN 5 ELSE 30 END;
  IF p_duration_minutes IS NULL OR p_duration_minutes < 1 OR p_duration_minutes > v_max_duration THEN
    RAISE EXCEPTION 'duration must be between 1 and % minutes (got %)', v_max_duration, p_duration_minutes;
  END IF;

  SELECT * INTO v_settings FROM public.communication_hub_control_settings ORDER BY created_at ASC LIMIT 1;
  IF v_settings.id IS NULL THEN RAISE EXCEPTION 'control settings row missing'; END IF;
  IF NOT (
    coalesce(array_length(v_settings.allowed_email_addresses,1),0) = 1
    AND lower(v_settings.allowed_email_addresses[1]) = 'rohit@mishainfotech.com'
    AND coalesce(array_length(v_settings.allowed_email_domains,1),0) = 0
  ) THEN
    RAISE EXCEPTION 'allowlist must be exactly [rohit@mishainfotech.com] with zero domains';
  END IF;

  SELECT status INTO v_event_status FROM public.communication_hub_event_live_control
    WHERE module_code = p_module_code AND event_code = p_event_code;
  IF v_event_status IS DISTINCT FROM 'live_manual_only' THEN
    RAISE EXCEPTION 'event status must be live_manual_only (got %)', coalesce(v_event_status,'null');
  END IF;

  SELECT count(*) INTO v_queued_live FROM public.communication_message
    WHERE test_mode = false AND status IN ('queued','sending');
  IF v_queued_live > 0 THEN
    RAISE EXCEPTION 'refusing to open: % queued/sending live messages exist', v_queued_live;
  END IF;

  v_new_after := v_now;
  INSERT INTO public.communication_hub_control_audit
    (setting_key, old_value, new_value, reason, changed_by, source)
  VALUES
    ('dry_run_only', to_jsonb(v_settings.dry_run_only), to_jsonb(false),
      'live-window RPC open (' || p_module_code || '/' || p_event_code || ', ' || p_duration_minutes || 'm): ' || p_reason, v_uid, 'open_comm_hub_live_window'),
    ('email_live_enabled', to_jsonb(v_settings.email_live_enabled), to_jsonb(true),
      'live-window RPC open', v_uid, 'open_comm_hub_live_window'),
    ('live_eligible_after', to_jsonb(v_settings.live_eligible_after), to_jsonb(v_new_after),
      'live-window RPC open', v_uid, 'open_comm_hub_live_window'),
    ('live_eligible_max_age_minutes', to_jsonb(v_settings.live_eligible_max_age_minutes), to_jsonb(p_duration_minutes),
      'live-window RPC open', v_uid, 'open_comm_hub_live_window');

  UPDATE public.communication_hub_control_settings
     SET dry_run_only = false, email_live_enabled = true, dispatch_enabled = true,
         live_eligible_after = v_new_after, live_eligible_max_age_minutes = p_duration_minutes, updated_by = v_uid
   WHERE id = v_settings.id;

  RETURN jsonb_build_object('ok', true, 'opened_at', v_new_after,
    'expires_at', v_new_after + make_interval(mins => p_duration_minutes),
    'duration_minutes', p_duration_minutes, 'module_code', p_module_code, 'event_code', p_event_code);
END;
$function$;
