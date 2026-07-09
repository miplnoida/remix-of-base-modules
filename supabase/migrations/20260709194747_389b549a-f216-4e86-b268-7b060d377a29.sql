-- =============================================================================
-- Phase 1C-B9-Control-Hardening — dedicated live-window RPCs.
-- =============================================================================
-- SECURITY DEFINER so the app can call them without granting broad table
-- write access. Env secrets are NEVER touched.

CREATE OR REPLACE FUNCTION public.open_comm_hub_live_window(
  p_module_code       text,
  p_event_code        text,
  p_duration_minutes  integer,
  p_reason            text,
  p_typed_confirmation text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_event_status text;
  v_queued_live integer;
  v_expected_confirm text;
  v_now timestamptz := now();
  v_new_after timestamptz;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required' USING ERRCODE = '42501';
  END IF;

  IF p_module_code IS DISTINCT FROM 'COMM_HUB' OR p_event_code IS DISTINCT FROM 'ADMIN_TEST_NOTICE' THEN
    RAISE EXCEPTION 'unsupported event: only COMM_HUB/ADMIN_TEST_NOTICE is permitted in this phase';
  END IF;

  v_expected_confirm := 'OPEN LIVE WINDOW FOR ' || p_module_code || '/' || p_event_code;
  IF p_typed_confirmation IS DISTINCT FROM v_expected_confirm THEN
    RAISE EXCEPTION 'typed confirmation mismatch: expected exact phrase';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason is required';
  END IF;

  IF p_duration_minutes IS NULL OR p_duration_minutes < 1 OR p_duration_minutes > 30 THEN
    RAISE EXCEPTION 'duration must be between 1 and 30 minutes (got %)', p_duration_minutes;
  END IF;

  SELECT * INTO v_settings FROM public.communication_hub_control_settings
    ORDER BY created_at ASC LIMIT 1;
  IF v_settings.id IS NULL THEN
    RAISE EXCEPTION 'control settings row missing';
  END IF;

  -- Allowlist must be exactly [rohit@mishainfotech.com] and no domains.
  IF NOT (
    coalesce(array_length(v_settings.allowed_email_addresses,1),0) = 1
    AND lower(v_settings.allowed_email_addresses[1]) = 'rohit@mishainfotech.com'
    AND coalesce(array_length(v_settings.allowed_email_domains,1),0) = 0
  ) THEN
    RAISE EXCEPTION 'allowlist must be exactly [rohit@mishainfotech.com] with zero domains';
  END IF;

  -- Event status must be live_manual_only.
  SELECT status INTO v_event_status
    FROM public.communication_hub_event_live_control
    WHERE module_code = p_module_code AND event_code = p_event_code;
  IF v_event_status IS DISTINCT FROM 'live_manual_only' THEN
    RAISE EXCEPTION 'event status must be live_manual_only (got %)', coalesce(v_event_status,'null');
  END IF;

  -- No queued/sending live messages anywhere.
  SELECT count(*) INTO v_queued_live FROM public.communication_message
    WHERE test_mode = false AND status IN ('queued','sending');
  IF v_queued_live > 0 THEN
    RAISE EXCEPTION 'refusing to open: % queued/sending live messages exist', v_queued_live;
  END IF;

  v_new_after := v_now;

  -- Audit rows (one per changed key), BEFORE update so old values are captured.
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
     SET dry_run_only = false,
         email_live_enabled = true,
         dispatch_enabled = true,
         live_eligible_after = v_new_after,
         live_eligible_max_age_minutes = p_duration_minutes,
         updated_by = v_uid
   WHERE id = v_settings.id;

  RETURN jsonb_build_object(
    'ok', true,
    'opened_at', v_new_after,
    'expires_at', v_new_after + make_interval(mins => p_duration_minutes),
    'duration_minutes', p_duration_minutes,
    'module_code', p_module_code,
    'event_code', p_event_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.close_comm_hub_live_window(
  p_reason    text,
  p_emergency boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_src text;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason is required';
  END IF;

  SELECT * INTO v_settings FROM public.communication_hub_control_settings
    ORDER BY created_at ASC LIMIT 1;
  IF v_settings.id IS NULL THEN
    RAISE EXCEPTION 'control settings row missing';
  END IF;

  v_src := CASE WHEN p_emergency THEN 'close_comm_hub_live_window:emergency'
                ELSE 'close_comm_hub_live_window' END;

  INSERT INTO public.communication_hub_control_audit
    (setting_key, old_value, new_value, reason, changed_by, source)
  VALUES
    ('dry_run_only', to_jsonb(v_settings.dry_run_only), to_jsonb(true),
      CASE WHEN p_emergency THEN 'EMERGENCY close: ' ELSE 'live-window RPC close: ' END || p_reason, v_uid, v_src),
    ('email_live_enabled', to_jsonb(v_settings.email_live_enabled), to_jsonb(false),
      CASE WHEN p_emergency THEN 'EMERGENCY close' ELSE 'live-window RPC close' END, v_uid, v_src);

  UPDATE public.communication_hub_control_settings
     SET dry_run_only = true,
         email_live_enabled = false,
         dispatch_enabled = true,
         updated_by = v_uid
   WHERE id = v_settings.id;

  RETURN jsonb_build_object(
    'ok', true,
    'closed_at', now(),
    'emergency', p_emergency
  );
END;
$$;

REVOKE ALL ON FUNCTION public.open_comm_hub_live_window(text,text,integer,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_comm_hub_live_window(text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_comm_hub_live_window(text,text,integer,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_comm_hub_live_window(text,boolean) TO authenticated;