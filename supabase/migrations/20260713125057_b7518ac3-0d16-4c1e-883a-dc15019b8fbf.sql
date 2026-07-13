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
  v_allowed_legacy    text;
  v_allowed_promote   text;
  v_allowed_canonical text;
  v_allowed_revert    text;
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
       (p_module_code = 'COMPLIANCE' AND p_event_code = 'INTERNAL_CASE_STATUS_NOTICE')
     ) THEN
    RAISE EXCEPTION 'set_event_live_control: event %/% not permitted for live_manual_only in this phase',
      p_module_code, p_event_code;
  END IF;

  IF p_new_status = 'live_manual_only' THEN
    v_allowed_legacy    := 'ENABLE live_manual_only FOR ' || p_module_code || '/' || p_event_code;
    v_allowed_promote   := 'PROMOTE ' || p_module_code || '/' || p_event_code || ' TO LIVE MANUAL ONLY';
    v_allowed_canonical := 'ENABLE LIVE ' || p_module_code || '/' || p_event_code;
    IF p_typed_confirmation IS DISTINCT FROM v_allowed_legacy
       AND p_typed_confirmation IS DISTINCT FROM v_allowed_promote
       AND p_typed_confirmation IS DISTINCT FROM v_allowed_canonical THEN
      RAISE EXCEPTION 'set_event_live_control: typed confirmation must equal "%", "%" or "%"',
        v_allowed_canonical, v_allowed_legacy, v_allowed_promote;
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