
-- 1) Widen set_event_live_control
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

  -- Widened allowlist: two events permitted for live_manual_only promotion in this phase.
  IF p_new_status = 'live_manual_only'
     AND NOT (
       (p_module_code = 'COMM_HUB'   AND p_event_code = 'ADMIN_TEST_NOTICE') OR
       (p_module_code = 'COMPLIANCE' AND p_event_code = 'INTERNAL_CASE_STATUS_NOTICE')
     ) THEN
    RAISE EXCEPTION 'set_event_live_control: event %/% not permitted for live_manual_only in this phase',
      p_module_code, p_event_code;
  END IF;

  -- Typed confirmation: accept legacy ENABLE phrase OR EPIC-3B PROMOTE/REVERT phrases.
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
    -- Revert phrase required only when demoting from a live status.
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

-- 2) Widen open_comm_hub_live_window
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
    (p_module_code = 'COMPLIANCE' AND p_event_code = 'INTERNAL_CASE_STATUS_NOTICE')
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

  -- COMPLIANCE pilot capped at 5 minutes; ADMIN_TEST_NOTICE retains 30-minute cap.
  v_max_duration := CASE WHEN p_module_code = 'COMPLIANCE' THEN 5 ELSE 30 END;
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

-- 3) Store Live Readiness Proposal (proposal-only, no live enablement).
INSERT INTO public.communication_hub_control_audit
  (setting_key, old_value, new_value, reason, changed_by, source)
VALUES (
  'live_readiness_proposal:COMPLIANCE:INTERNAL_CASE_STATUS_NOTICE',
  NULL,
  jsonb_build_object(
    'module_code', 'COMPLIANCE',
    'event_code',  'INTERNAL_CASE_STATUS_NOTICE',
    'template_code', 'COMPLIANCE_INTERNAL_CASE_STATUS_EMAIL',
    'template_version_id', 'c075fa75-58e6-450d-a06d-8bba141cf93c',
    'latest_dry_run_request_no', 'CR-20260710073424-CB1409',
    'latest_dry_run_message_id', '469e4e17-c433-478c-94ff-c5e3f323d26e',
    'latest_dry_run_dispatch', jsonb_build_object('sentDryRun',1,'sentLive',0,'test_mode',true),
    'operator_rehearsal_result', jsonb_build_object('overall','pass','cancel','PASS','retry','PASS','clear_lock','PASS'),
    'operations_visibility', jsonb_build_object(
      'delivery_monitor', true, 'dispatch_register', true, 'lifecycle_event_log', true),
    'current_gate_state', jsonb_build_object(
      'dispatch_enabled', true, 'dry_run_only', true, 'email_live_enabled', false, 'live_queued', 0, 'cron', false),
    'recipient_restriction', jsonb_build_array('rohit@mishainfotech.com'),
    'risk_level', 'low',
    'pilot_scope', 'exactly one internal live email, single recipient, live window <= 5 minutes',
    'proposed_typed_confirmations', jsonb_build_object(
      'promote', 'PROMOTE COMPLIANCE/INTERNAL_CASE_STATUS_NOTICE TO LIVE MANUAL ONLY',
      'open_window', 'OPEN LIVE WINDOW FOR COMPLIANCE/INTERNAL_CASE_STATUS_NOTICE',
      'send', 'SEND ONE LIVE INTERNAL PILOT',
      'revert', 'REVERT COMPLIANCE/INTERNAL_CASE_STATUS_NOTICE TO DRY RUN ONLY'),
    'rollback_checklist', jsonb_build_array(
      'Call close_comm_hub_live_window immediately after send attempt (success or failure)',
      'Set dry_run_only=true, email_live_enabled=false, dispatch_enabled=true',
      'Confirm live_queued=0 and no sending live rows',
      'Revert event to dry_run_only using REVERT phrase',
      'Confirm no comm-hub cron, notification_queue and notification_logs unchanged'),
    'env_gate_note', 'Live send additionally requires COMMUNICATION_HUB_EMAIL_LIVE=true set by authorized deployment/admin process; this proposal does not toggle env.',
    'status', 'PROPOSAL_STORED_AWAITING_OPERATOR_EXECUTION'
  ),
  'EPIC 3B live readiness proposal for first guarded internal manual live pilot.',
  NULL,
  'epic-3b-live-readiness-proposal'
);
