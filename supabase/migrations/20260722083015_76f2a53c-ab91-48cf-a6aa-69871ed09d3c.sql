-- CH-GL-02 Slice B — Server-side gating for Manual/Automated Production modes.
-- Extend apply_communication_release_mode to require event certification when
-- transitioning to MANUAL_PRODUCTION or AUTOMATED_PRODUCTION. Safe Testing,
-- Controlled Testing, and Emergency Stop paths are unchanged.

DROP FUNCTION IF EXISTS public.apply_communication_release_mode(TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.apply_communication_release_mode(
  p_new_mode TEXT,
  p_reason TEXT DEFAULT NULL,
  p_expected_version INTEGER DEFAULT NULL,
  p_module_code TEXT DEFAULT NULL,
  p_event_code TEXT DEFAULT NULL,
  p_channel TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_admin BOOLEAN := false;
  v_profile public.communication_hub_mode_profile%ROWTYPE;
  v_current public.communication_hub_control_settings%ROWTYPE;
  v_new_version INTEGER;
  v_previous_mode TEXT;
  v_event_status TEXT;
  v_required_status TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'authentication_required';
  END IF;

  BEGIN
    v_is_admin := public.is_comm_hub_operator_admin(v_uid);
  EXCEPTION WHEN undefined_function THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'Admin'::public.app_role
    ) INTO v_is_admin;
  END;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'not_authorised';
  END IF;

  SELECT * INTO v_profile FROM public.communication_hub_mode_profile
   WHERE operating_mode = p_new_mode;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'unknown_operating_mode';
  END IF;

  -- Production mode gating: require an event certified for the target stage.
  -- Emergency Stop and other transitions are unaffected.
  IF p_new_mode IN ('MANUAL_PRODUCTION','AUTOMATED_PRODUCTION') THEN
    IF p_module_code IS NULL OR p_event_code IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001',
        MESSAGE = 'mode_requires_event_certification',
        DETAIL = 'module_code and event_code are required to activate production modes';
    END IF;
    v_required_status := CASE p_new_mode
      WHEN 'MANUAL_PRODUCTION' THEN 'live_manual_only'
      WHEN 'AUTOMATED_PRODUCTION' THEN 'live_cron_allowed'
    END;
    SELECT status INTO v_event_status
      FROM public.communication_hub_event_live_control
     WHERE module_code = p_module_code AND event_code = p_event_code;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001',
        MESSAGE = 'mode_requires_event_certification',
        DETAIL = format('no live control record for %s/%s', p_module_code, p_event_code);
    END IF;
    IF p_new_mode = 'MANUAL_PRODUCTION'
       AND v_event_status NOT IN ('live_manual_only','live_cron_allowed') THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001',
        MESSAGE = 'mode_requires_event_certification',
        DETAIL = format('event status is %s; required live_manual_only or live_cron_allowed', v_event_status);
    END IF;
    IF p_new_mode = 'AUTOMATED_PRODUCTION' AND v_event_status <> 'live_cron_allowed' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001',
        MESSAGE = 'mode_requires_event_certification',
        DETAIL = format('event status is %s; required live_cron_allowed', v_event_status);
    END IF;
  END IF;

  SELECT * INTO v_current FROM public.communication_hub_control_settings
   WHERE singleton_guard = 'primary' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'settings_singleton_missing';
  END IF;

  IF p_expected_version IS NOT NULL AND p_expected_version <> v_current.configuration_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'configuration_version_conflict',
      DETAIL = format('expected=%s current=%s', p_expected_version, v_current.configuration_version);
  END IF;

  v_previous_mode := v_current.operating_mode;
  v_new_version := COALESCE(v_current.configuration_version, 0) + 1;

  PERFORM set_config('comm_hub.mode_transition', 'on', true);

  UPDATE public.communication_hub_control_settings
     SET operating_mode = p_new_mode,
         previous_operating_mode = v_previous_mode,
         mode_changed_at = now(),
         mode_changed_by = v_uid,
         mode_change_reason = p_reason,
         configuration_version = v_new_version,
         dispatch_enabled = v_profile.dispatch_enabled,
         dry_run_only = v_profile.dry_run_only,
         email_live_enabled = v_profile.email_live_enabled,
         sms_live_enabled = v_profile.sms_live_enabled,
         whatsapp_live_enabled = v_profile.whatsapp_live_enabled,
         print_enabled = v_profile.print_enabled,
         letter_enabled = v_profile.letter_enabled,
         scheduler_enabled = v_profile.scheduler_enabled,
         automatic_triggers_enabled = v_profile.automatic_triggers_enabled,
         retry_worker_enabled = v_profile.retry_worker_enabled,
         batch_enabled = v_profile.batch_enabled,
         bulk_enabled = v_profile.bulk_enabled,
         updated_at = now()
   WHERE singleton_guard = 'primary';

  BEGIN
    INSERT INTO public.communication_hub_control_audit
      (actor_id, action, reason, previous_values, new_values, configuration_version)
    VALUES
      (v_uid, 'apply_release_mode', p_reason,
       jsonb_build_object('operating_mode', v_previous_mode),
       jsonb_build_object(
         'operating_mode', p_new_mode,
         'profile', to_jsonb(v_profile),
         'scope', jsonb_build_object(
           'module_code', p_module_code,
           'event_code', p_event_code,
           'channel', p_channel
         )
       ),
       v_new_version);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'previous_mode', v_previous_mode,
    'new_mode', p_new_mode,
    'configuration_version', v_new_version,
    'profile', to_jsonb(v_profile),
    'changed_at', now(),
    'actor', v_uid,
    'reason', p_reason,
    'scope', jsonb_build_object(
      'module_code', p_module_code,
      'event_code', p_event_code,
      'channel', p_channel
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_communication_release_mode(TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_communication_release_mode(TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) TO authenticated, service_role;