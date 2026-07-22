
-- ============================================================================
-- Phase 4A — Safe Mode Transitions + Automation State
-- ============================================================================

-- 1. Automation state columns on the singleton control settings row
ALTER TABLE public.communication_hub_control_settings
  ADD COLUMN IF NOT EXISTS automation_state             text        NOT NULL DEFAULT 'STANDBY',
  ADD COLUMN IF NOT EXISTS automation_armed_at          timestamptz,
  ADD COLUMN IF NOT EXISTS automation_armed_by          uuid,
  ADD COLUMN IF NOT EXISTS automation_arm_reason        text,
  ADD COLUMN IF NOT EXISTS automation_suspended_at      timestamptz,
  ADD COLUMN IF NOT EXISTS automation_suspension_reason text,
  ADD COLUMN IF NOT EXISTS automation_state_changed_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS automation_state_changed_by  uuid;

ALTER TABLE public.communication_hub_control_settings
  DROP CONSTRAINT IF EXISTS chk_comm_hub_automation_state;
ALTER TABLE public.communication_hub_control_settings
  ADD  CONSTRAINT chk_comm_hub_automation_state
       CHECK (automation_state IN ('STANDBY','ARMED','SUSPENDED'));

-- Defensive backfill: no existing row should end up with automation "ARMED".
UPDATE public.communication_hub_control_settings
   SET automation_state = 'STANDBY'
 WHERE automation_state IS NULL OR automation_state = 'ARMED';

-- 2. Extend the derived-field protection trigger to also protect
--    automation_state, and allow either a mode-transition or a controlled
--    arm/disarm/suspend context flag to pass through.
CREATE OR REPLACE FUNCTION public.enforce_mode_derived_controls()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_mode_flag TEXT := current_setting('comm_hub.mode_transition', true);
  v_auto_flag TEXT := current_setting('comm_hub.automation_op',   true);
BEGIN
  IF v_mode_flag = 'on' OR v_auto_flag = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.dispatch_enabled           IS DISTINCT FROM OLD.dispatch_enabled
     OR NEW.dry_run_only            IS DISTINCT FROM OLD.dry_run_only
     OR NEW.email_live_enabled      IS DISTINCT FROM OLD.email_live_enabled
     OR NEW.sms_live_enabled        IS DISTINCT FROM OLD.sms_live_enabled
     OR NEW.whatsapp_live_enabled   IS DISTINCT FROM OLD.whatsapp_live_enabled
     OR NEW.scheduler_enabled       IS DISTINCT FROM OLD.scheduler_enabled
     OR NEW.automatic_triggers_enabled IS DISTINCT FROM OLD.automatic_triggers_enabled
     OR NEW.retry_worker_enabled    IS DISTINCT FROM OLD.retry_worker_enabled
     OR NEW.batch_enabled           IS DISTINCT FROM OLD.batch_enabled
     OR NEW.bulk_enabled            IS DISTINCT FROM OLD.bulk_enabled
     OR NEW.operating_mode          IS DISTINCT FROM OLD.operating_mode
     OR NEW.automation_state        IS DISTINCT FROM OLD.automation_state
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'mode_derived_field_direct_write',
      HINT = 'This setting is managed by the Communication Hub operating mode and automation controls.';
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Canonical INTERNAL transition core.
--    Not directly executable by normal authenticated users; wrappers do auth.
CREATE OR REPLACE FUNCTION public._apply_comm_hub_mode_transition_core(
  p_new_mode         public.communication_operating_mode,
  p_reason           text,
  p_expected_version bigint,
  p_actor            uuid,
  p_source           text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile          public.communication_hub_mode_profile%ROWTYPE;
  v_current          public.communication_hub_control_settings%ROWTYPE;
  v_previous_mode    public.communication_operating_mode;
  v_new_version      bigint;
  v_target_auto_state text;
  v_now              timestamptz := now();
  -- Effective automation flags (server-owned).
  v_sched   boolean;
  v_auto    boolean;
  v_retry   boolean;
  v_batch   boolean;
  v_bulk    boolean;
BEGIN
  SELECT * INTO v_profile
    FROM public.communication_hub_mode_profile
   WHERE operating_mode = p_new_mode::text;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'unknown_operating_mode';
  END IF;

  SELECT * INTO v_current
    FROM public.communication_hub_control_settings
   WHERE singleton_guard = 'primary'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'settings_singleton_missing';
  END IF;

  IF p_expected_version IS NOT NULL
     AND p_expected_version <> v_current.configuration_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001',
      MESSAGE = 'configuration_version_conflict',
      DETAIL  = format('expected=%s current=%s',
                       p_expected_version, v_current.configuration_version);
  END IF;

  v_previous_mode := v_current.operating_mode;
  v_new_version   := COALESCE(v_current.configuration_version, 0) + 1;

  -- Automation activation is always reset by a mode transition. Re-arming
  -- requires an explicit arm operation. Emergency Stop => SUSPENDED.
  IF p_new_mode = 'EMERGENCY_STOP'::public.communication_operating_mode THEN
    v_target_auto_state := 'SUSPENDED';
  ELSE
    v_target_auto_state := 'STANDBY';
  END IF;

  -- Effective automation flags are OFF for every fresh transition. The
  -- profile still describes what Automated Production CAN do once armed;
  -- arm_comm_hub_automation flips these flags to the profile values.
  v_sched := false;
  v_auto  := false;
  v_retry := false;
  v_batch := false;
  v_bulk  := false;

  PERFORM set_config('comm_hub.mode_transition', 'on', true);

  UPDATE public.communication_hub_control_settings
     SET operating_mode              = p_new_mode,
         previous_operating_mode     = v_previous_mode,
         mode_changed_at             = v_now,
         mode_changed_by             = p_actor,
         mode_change_reason          = p_reason,
         configuration_version       = v_new_version,
         dispatch_enabled            = v_profile.dispatch_enabled,
         dry_run_only                = v_profile.dry_run_only,
         email_live_enabled          = v_profile.email_live_enabled,
         sms_live_enabled            = v_profile.sms_live_enabled,
         whatsapp_live_enabled       = v_profile.whatsapp_live_enabled,
         print_enabled               = v_profile.print_enabled,
         letter_enabled              = v_profile.letter_enabled,
         scheduler_enabled           = v_sched,
         automatic_triggers_enabled  = v_auto,
         retry_worker_enabled        = v_retry,
         batch_enabled               = v_batch,
         bulk_enabled                = v_bulk,
         automation_state            = v_target_auto_state,
         automation_state_changed_at = v_now,
         automation_state_changed_by = p_actor,
         automation_armed_at         = NULL,
         automation_armed_by         = NULL,
         automation_arm_reason       = NULL,
         automation_suspended_at     = CASE WHEN v_target_auto_state = 'SUSPENDED' THEN v_now ELSE NULL END,
         automation_suspension_reason = CASE WHEN v_target_auto_state = 'SUSPENDED'
                                             THEN COALESCE(p_reason, 'mode_transition_' || p_new_mode::text)
                                             ELSE NULL END,
         updated_at                  = v_now,
         updated_by                  = p_actor
   WHERE singleton_guard = 'primary';

  INSERT INTO public.communication_hub_operating_mode_audit (
    control_settings_id, previous_mode, new_mode, actor, reason,
    configuration_version, settings_snapshot
  ) VALUES (
    v_current.id, v_previous_mode, p_new_mode, p_actor, p_reason, v_new_version,
    jsonb_build_object(
      'source',                  COALESCE(p_source, 'canonical_core'),
      'previous_mode',           v_previous_mode,
      'new_mode',                p_new_mode,
      'profile',                 to_jsonb(v_profile),
      'automation_state_before', v_current.automation_state,
      'automation_state_after',  v_target_auto_state,
      'effective_flags_after',   jsonb_build_object(
         'dispatch_enabled',           v_profile.dispatch_enabled,
         'dry_run_only',               v_profile.dry_run_only,
         'email_live_enabled',         v_profile.email_live_enabled,
         'scheduler_enabled',          v_sched,
         'automatic_triggers_enabled', v_auto,
         'retry_worker_enabled',       v_retry,
         'batch_enabled',              v_batch,
         'bulk_enabled',               v_bulk
      )
    )
  );

  RETURN jsonb_build_object(
    'ok',                    true,
    'previous_mode',         v_previous_mode::text,
    'new_mode',              p_new_mode::text,
    'configuration_version', v_new_version,
    'automation_state',      v_target_auto_state,
    'profile',               to_jsonb(v_profile),
    'changed_at',            v_now,
    'actor',                 p_actor,
    'reason',                p_reason,
    'source',                COALESCE(p_source, 'canonical_core')
  );
END;
$function$;

REVOKE ALL ON FUNCTION public._apply_comm_hub_mode_transition_core(
  public.communication_operating_mode, text, bigint, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._apply_comm_hub_mode_transition_core(
  public.communication_operating_mode, text, bigint, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public._apply_comm_hub_mode_transition_core(
  public.communication_operating_mode, text, bigint, uuid, text) TO service_role;

-- 4. apply_communication_release_mode — thin wrapper around the core.
CREATE OR REPLACE FUNCTION public.apply_communication_release_mode(
  p_new_mode         text,
  p_reason           text    DEFAULT NULL,
  p_expected_version integer DEFAULT NULL,
  p_module_code      text    DEFAULT NULL,
  p_event_code       text    DEFAULT NULL,
  p_channel          text    DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid       uuid := auth.uid();
  v_is_admin  boolean := false;
  v_new_mode  public.communication_operating_mode;
  v_result    jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='authentication_required';
  END IF;
  BEGIN
    v_is_admin := public.is_comm_hub_operator_admin(v_uid);
  EXCEPTION WHEN undefined_function THEN
    SELECT EXISTS(SELECT 1 FROM public.user_roles
                   WHERE user_id = v_uid AND role = 'Admin'::public.app_role)
      INTO v_is_admin;
  END;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorised';
  END IF;

  BEGIN
    v_new_mode := p_new_mode::public.communication_operating_mode;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='unknown_operating_mode';
  END;

  v_result := public._apply_comm_hub_mode_transition_core(
                v_new_mode,
                p_reason,
                p_expected_version::bigint,
                v_uid,
                'apply_communication_release_mode');

  -- Attach caller scope for the frontend (mirrors previous contract).
  RETURN v_result || jsonb_build_object(
    'scope', jsonb_build_object(
      'module_code', p_module_code,
      'event_code',  p_event_code,
      'channel',     p_channel
    )
  );
END;
$function$;

-- 5. set_communication_operating_mode — legacy wrappers, both overloads
--    delegate to the same core; both accept AUTOMATED_PRODUCTION now.
CREATE OR REPLACE FUNCTION public.set_communication_operating_mode(
  p_new_mode public.communication_operating_mode,
  p_reason   text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid       uuid := auth.uid();
  v_is_admin  boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_is_admin := public.is_comm_hub_operator_admin(v_uid);
  EXCEPTION WHEN undefined_function THEN
    SELECT public.has_role(v_uid, 'Admin'::public.app_role) INTO v_is_admin;
  END;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'not_authorised' USING ERRCODE='42501';
  END IF;
  RETURN public._apply_comm_hub_mode_transition_core(
           p_new_mode, p_reason, NULL, v_uid, 'set_communication_operating_mode');
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_communication_operating_mode(
  p_new_mode text,
  p_reason   text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_new_mode public.communication_operating_mode;
BEGIN
  BEGIN
    v_new_mode := p_new_mode::public.communication_operating_mode;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'unknown_operating_mode' USING ERRCODE='22023';
  END;
  RETURN public.set_communication_operating_mode(v_new_mode, p_reason);
END;
$function$;

-- 6. restore_comm_hub_operating_mode_after_controlled_live — also delegate.
--    A Controlled Stub restore that returns to AUTOMATED_PRODUCTION lands
--    in STANDBY (never silently re-armed) because the core resets state.
CREATE OR REPLACE FUNCTION public.restore_comm_hub_operating_mode_after_controlled_live(
  p_execution_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_prior   public.communication_operating_mode;
  v_current public.communication_operating_mode;
  v_actor   uuid;
  v_err     text;
BEGIN
  SELECT prior_operating_mode INTO v_prior
    FROM public.communication_controlled_live_execution
   WHERE id = p_execution_id;
  IF v_prior IS NULL THEN
    UPDATE public.communication_controlled_live_execution
       SET restored_operating_mode = NULL,
           cleanup_state = COALESCE(cleanup_state,'no_restore_needed'),
           updated_at = now()
     WHERE id = p_execution_id;
    RETURN jsonb_build_object('ok', true, 'restored', false);
  END IF;

  SELECT operating_mode INTO v_current
    FROM public.communication_hub_control_settings
   WHERE singleton_guard = 'primary';

  -- The restore path runs under SECURITY DEFINER, but there is no live
  -- operator; use the execution's owner where available.
  SELECT COALESCE(actor_id, operator_id, requested_by, created_by)
    INTO v_actor
    FROM public.communication_controlled_live_execution
   WHERE id = p_execution_id;

  BEGIN
    IF v_current IS DISTINCT FROM v_prior THEN
      PERFORM public._apply_comm_hub_mode_transition_core(
                v_prior,
                'restore_after_controlled_live_execution:' || p_execution_id::text,
                NULL,
                v_actor,
                'restore_after_controlled_live');
    END IF;
    UPDATE public.communication_controlled_live_execution
       SET restored_operating_mode = v_prior,
           cleanup_state = 'restored',
           updated_at = now()
     WHERE id = p_execution_id;
    RETURN jsonb_build_object('ok', true, 'restored', true,
                              'operating_mode', v_prior,
                              'automation_state', 'STANDBY');
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    BEGIN
      PERFORM public._apply_comm_hub_mode_transition_core(
                'EMERGENCY_STOP'::public.communication_operating_mode,
                'fail_safe_after_restore_failure:' || p_execution_id::text,
                NULL, v_actor, 'restore_fail_safe');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    UPDATE public.communication_controlled_live_execution
       SET cleanup_state = 'restore_failed_emergency_stop_engaged',
           cleanup_error = v_err,
           updated_at = now()
     WHERE id = p_execution_id;
    RETURN jsonb_build_object('ok', false, 'restored', false,
                              'fail_safe_engaged', true, 'error', v_err);
  END;
END;
$function$;

-- 7. arm_comm_hub_automation
CREATE OR REPLACE FUNCTION public.arm_comm_hub_automation(
  p_reason           text,
  p_confirmation     text,
  p_expected_version bigint DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid      uuid := auth.uid();
  v_is_admin boolean := false;
  v_row      public.communication_hub_control_settings%ROWTYPE;
  v_profile  public.communication_hub_mode_profile%ROWTYPE;
  v_now      timestamptz := now();
  v_new_ver  bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='authentication_required';
  END IF;
  BEGIN
    v_is_admin := public.is_comm_hub_operator_admin(v_uid);
  EXCEPTION WHEN undefined_function THEN
    SELECT public.has_role(v_uid, 'Admin'::public.app_role) INTO v_is_admin;
  END;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorised';
  END IF;

  IF COALESCE(p_reason,'') = '' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='reason_required';
  END IF;
  IF COALESCE(p_confirmation,'') <> 'ARM AUTOMATED PRODUCTION' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='typed_confirmation_mismatch';
  END IF;

  SELECT * INTO v_row FROM public.communication_hub_control_settings
   WHERE singleton_guard = 'primary' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='settings_singleton_missing';
  END IF;

  IF p_expected_version IS NOT NULL
     AND p_expected_version <> v_row.configuration_version THEN
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='configuration_version_conflict';
  END IF;

  IF v_row.operating_mode <> 'AUTOMATED_PRODUCTION'::public.communication_operating_mode THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='automation_not_in_automated_production';
  END IF;
  IF v_row.automation_state = 'ARMED' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='automation_already_armed';
  END IF;

  -- Phase 4A: lifecycle certification evidence is not yet available.
  -- Fail closed. Phase 4B will provide the certification evidence gate.
  RAISE EXCEPTION USING ERRCODE='22023',
    MESSAGE='automation_certification_evidence_incomplete',
    HINT='Phase 4B lifecycle certification evidence is required before Automated Production can be armed.';

  -- Unreachable in Phase 4A but kept for the arm-success contract.
  SELECT * INTO v_profile FROM public.communication_hub_mode_profile
   WHERE operating_mode = 'AUTOMATED_PRODUCTION';
  v_new_ver := v_row.configuration_version + 1;

  PERFORM set_config('comm_hub.automation_op', 'on', true);
  UPDATE public.communication_hub_control_settings
     SET automation_state             = 'ARMED',
         automation_armed_at          = v_now,
         automation_armed_by          = v_uid,
         automation_arm_reason        = p_reason,
         automation_state_changed_at  = v_now,
         automation_state_changed_by  = v_uid,
         automation_suspended_at      = NULL,
         automation_suspension_reason = NULL,
         scheduler_enabled            = v_profile.scheduler_enabled,
         automatic_triggers_enabled   = v_profile.automatic_triggers_enabled,
         retry_worker_enabled         = v_profile.retry_worker_enabled,
         batch_enabled                = v_profile.batch_enabled,
         bulk_enabled                 = v_profile.bulk_enabled,
         configuration_version        = v_new_ver,
         updated_at                   = v_now,
         updated_by                   = v_uid
   WHERE singleton_guard = 'primary';

  RETURN jsonb_build_object('ok', true, 'automation_state', 'ARMED',
                            'configuration_version', v_new_ver);
END;
$function$;

REVOKE ALL ON FUNCTION public.arm_comm_hub_automation(text, text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arm_comm_hub_automation(text, text, bigint) TO authenticated, service_role;

-- 8. disarm_comm_hub_automation
CREATE OR REPLACE FUNCTION public.disarm_comm_hub_automation(
  p_reason  text,
  p_suspend boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid      uuid := auth.uid();
  v_is_admin boolean := false;
  v_row      public.communication_hub_control_settings%ROWTYPE;
  v_now      timestamptz := now();
  v_new_ver  bigint;
  v_target   text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='authentication_required';
  END IF;
  BEGIN
    v_is_admin := public.is_comm_hub_operator_admin(v_uid);
  EXCEPTION WHEN undefined_function THEN
    SELECT public.has_role(v_uid, 'Admin'::public.app_role) INTO v_is_admin;
  END;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='not_authorised';
  END IF;
  IF COALESCE(p_reason,'') = '' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='reason_required';
  END IF;

  SELECT * INTO v_row FROM public.communication_hub_control_settings
   WHERE singleton_guard = 'primary' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='settings_singleton_missing';
  END IF;

  v_target := CASE WHEN p_suspend THEN 'SUSPENDED' ELSE 'STANDBY' END;
  v_new_ver := v_row.configuration_version + 1;

  PERFORM set_config('comm_hub.automation_op', 'on', true);
  UPDATE public.communication_hub_control_settings
     SET automation_state             = v_target,
         automation_state_changed_at  = v_now,
         automation_state_changed_by  = v_uid,
         automation_armed_at          = NULL,
         automation_armed_by          = NULL,
         automation_arm_reason        = NULL,
         automation_suspended_at      = CASE WHEN v_target = 'SUSPENDED' THEN v_now ELSE NULL END,
         automation_suspension_reason = CASE WHEN v_target = 'SUSPENDED' THEN p_reason ELSE NULL END,
         scheduler_enabled            = false,
         automatic_triggers_enabled   = false,
         retry_worker_enabled         = false,
         batch_enabled                = false,
         bulk_enabled                 = false,
         configuration_version        = v_new_ver,
         updated_at                   = v_now,
         updated_by                   = v_uid
   WHERE singleton_guard = 'primary';

  RETURN jsonb_build_object('ok', true, 'automation_state', v_target,
                            'configuration_version', v_new_ver);
END;
$function$;

REVOKE ALL ON FUNCTION public.disarm_comm_hub_automation(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.disarm_comm_hub_automation(text, boolean) TO authenticated, service_role;
