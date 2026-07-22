
CREATE OR REPLACE FUNCTION public.apply_communication_release_mode(
  p_new_mode text,
  p_reason text DEFAULT NULL,
  p_expected_version integer DEFAULT NULL,
  p_module_code text DEFAULT NULL,
  p_event_code text DEFAULT NULL,
  p_channel text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_is_admin BOOLEAN := false;
  v_profile public.communication_hub_mode_profile%ROWTYPE;
  v_current public.communication_hub_control_settings%ROWTYPE;
  v_new_version BIGINT;
  v_new_mode public.communication_operating_mode;
  v_previous_mode public.communication_operating_mode;
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

  -- Validate and cast the incoming text to the enum ONCE.
  BEGIN
    v_new_mode := p_new_mode::public.communication_operating_mode;
  EXCEPTION WHEN invalid_text_representation OR others THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'unknown_operating_mode';
  END;

  -- Profile lookup. profile.operating_mode is text (compatibility debt);
  -- compare via ::text at the boundary.
  SELECT * INTO v_profile FROM public.communication_hub_mode_profile
   WHERE operating_mode = v_new_mode::text;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'unknown_operating_mode';
  END IF;

  -- Note: Manual/Automated production mode SELECTION no longer requires an
  -- event-level certification. Event-level send authorisation continues to
  -- be enforced by the send evaluator, dispatcher and provider adapter.

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
     SET operating_mode = v_new_mode,
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
       jsonb_build_object('operating_mode', v_previous_mode::text),
       jsonb_build_object(
         'operating_mode', v_new_mode::text,
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
    'previous_mode', v_previous_mode::text,
    'new_mode', v_new_mode::text,
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
$function$;
