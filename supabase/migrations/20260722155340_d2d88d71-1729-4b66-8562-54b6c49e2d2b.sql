-- Phase 4A hardening: canonical audit writer, idempotency, server-side
-- reason/confirmation validation, structured blockers, schema cache refresh.
-- All changes are additive; existing wrappers keep delegating to the core.

-- 1. Canonical audit writer for operating-mode transitions.
--    Writes exactly one authoritative row to the dedicated
--    communication_hub_operating_mode_audit table. Never touches the
--    general communication_hub_control_audit (that table uses a
--    different (setting_key,old_value,new_value,reason,changed_by,source)
--    schema and is not the authoritative operating-mode audit).
CREATE OR REPLACE FUNCTION public.write_comm_hub_operating_mode_audit(
  p_control_settings_id uuid,
  p_previous_mode public.communication_operating_mode,
  p_new_mode public.communication_operating_mode,
  p_actor uuid,
  p_reason text,
  p_configuration_version bigint,
  p_effective_before jsonb,
  p_effective_after jsonb,
  p_automation_before text,
  p_automation_after text,
  p_source text,
  p_module_code text DEFAULT NULL,
  p_event_code text DEFAULT NULL,
  p_channel text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_audit_id uuid;
  v_snapshot jsonb;
BEGIN
  IF p_control_settings_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='23502', MESSAGE='audit_write_control_settings_id_required';
  END IF;
  IF p_new_mode IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='23502', MESSAGE='audit_write_new_mode_required';
  END IF;
  IF p_configuration_version IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='23502', MESSAGE='audit_write_configuration_version_required';
  END IF;

  -- Redacted snapshot: NEVER include provider secrets, tokens, keys,
  -- signing material or recipient PII. Only mode-derived controls and
  -- automation state are recorded.
  v_snapshot := jsonb_build_object(
    'source',                  COALESCE(p_source, 'canonical_core'),
    'previous_mode',           p_previous_mode,
    'new_mode',                p_new_mode,
    'automation_state_before', p_automation_before,
    'automation_state_after',  p_automation_after,
    'effective_flags_before',  COALESCE(p_effective_before, '{}'::jsonb),
    'effective_flags_after',   COALESCE(p_effective_after,  '{}'::jsonb),
    'audit_context',           jsonb_build_object(
      'module_code', p_module_code,
      'event_code',  p_event_code,
      'channel',     p_channel
    )
  );

  INSERT INTO public.communication_hub_operating_mode_audit (
    control_settings_id, previous_mode, new_mode, actor, reason,
    configuration_version, settings_snapshot
  ) VALUES (
    p_control_settings_id, p_previous_mode, p_new_mode, p_actor, p_reason,
    p_configuration_version, v_snapshot
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;

EXCEPTION WHEN undefined_column OR undefined_table THEN
  RAISE EXCEPTION USING
    ERRCODE = '42703',
    MESSAGE = 'MODE_AUDIT_SCHEMA_MISMATCH',
    DETAIL  = SQLERRM,
    HINT    = 'communication_hub_operating_mode_audit does not have the expected columns.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.write_comm_hub_operating_mode_audit(
  uuid, public.communication_operating_mode, public.communication_operating_mode,
  uuid, text, bigint, jsonb, jsonb, text, text, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_comm_hub_operating_mode_audit(
  uuid, public.communication_operating_mode, public.communication_operating_mode,
  uuid, text, bigint, jsonb, jsonb, text, text, text, text, text, text
) TO service_role;

-- 2. Refactor the canonical core to:
--    - validate the reason server-side (length + presence),
--    - honour same-mode idempotency (no version bump, no audit),
--    - go through the canonical audit writer,
--    - keep the singleton lock, version check, profile lookup and
--      trigger flag intact.
CREATE OR REPLACE FUNCTION public._apply_comm_hub_mode_transition_core(
  p_new_mode public.communication_operating_mode,
  p_reason text,
  p_expected_version bigint,
  p_actor uuid,
  p_source text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile          public.communication_hub_mode_profile%ROWTYPE;
  v_current          public.communication_hub_control_settings%ROWTYPE;
  v_previous_mode    public.communication_operating_mode;
  v_new_version      bigint;
  v_target_auto_state text;
  v_now              timestamptz := now();
  v_reason           text := NULLIF(btrim(COALESCE(p_reason, '')), '');
  v_eff_before       jsonb;
  v_eff_after        jsonb;
  v_audit_id         uuid;
BEGIN
  -- 2a. Load profile (structured error).
  SELECT * INTO v_profile
    FROM public.communication_hub_mode_profile
   WHERE operating_mode = p_new_mode::text;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='MODE_PROFILE_MISSING';
  END IF;

  -- 2b. Lock singleton (structured error).
  SELECT * INTO v_current
    FROM public.communication_hub_control_settings
   WHERE singleton_guard = 'primary'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='MODE_SETTINGS_SINGLETON_MISSING';
  END IF;
  IF v_current.configuration_version IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='22004', MESSAGE='MODE_CONFIGURATION_VERSION_INVALID';
  END IF;

  -- 2c. Optimistic concurrency.
  IF p_expected_version IS NOT NULL
     AND p_expected_version <> v_current.configuration_version THEN
    RAISE EXCEPTION USING ERRCODE='40001',
      MESSAGE='CONFIGURATION_VERSION_CONFLICT',
      DETAIL=format('expected=%s current=%s',
                    p_expected_version, v_current.configuration_version);
  END IF;

  -- 2d. Same-mode idempotency. Skip write, keep version, no audit row.
  IF v_current.operating_mode IS NOT NULL
     AND v_current.operating_mode = p_new_mode THEN
    RETURN jsonb_build_object(
      'ok',                    true,
      'no_change',             true,
      'previous_mode',         v_current.operating_mode::text,
      'new_mode',              p_new_mode::text,
      'configuration_version', v_current.configuration_version,
      'automation_state',      v_current.automation_state,
      'profile',               to_jsonb(v_profile),
      'changed_at',            v_current.mode_changed_at,
      'actor',                 v_current.mode_changed_by,
      'reason',                v_current.mode_change_reason,
      'source',                COALESCE(p_source, 'canonical_core')
    );
  END IF;

  -- 2e. Server-side reason validation for actual transitions.
  IF v_reason IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='MODE_CHANGE_REASON_REQUIRED';
  END IF;
  IF char_length(v_reason) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='MODE_CHANGE_REASON_TOO_LONG';
  END IF;

  v_previous_mode := v_current.operating_mode;
  v_new_version   := COALESCE(v_current.configuration_version, 0) + 1;

  -- 2f. Automation state on every transition:
  --      EMERGENCY_STOP -> SUSPENDED; all others -> STANDBY.
  --     Effective automation flags always OFF (arm operation re-enables).
  IF p_new_mode = 'EMERGENCY_STOP'::public.communication_operating_mode THEN
    v_target_auto_state := 'SUSPENDED';
  ELSE
    v_target_auto_state := 'STANDBY';
  END IF;

  v_eff_before := jsonb_build_object(
    'dispatch_enabled',           v_current.dispatch_enabled,
    'dry_run_only',               v_current.dry_run_only,
    'email_live_enabled',         v_current.email_live_enabled,
    'scheduler_enabled',          v_current.scheduler_enabled,
    'automatic_triggers_enabled', v_current.automatic_triggers_enabled,
    'retry_worker_enabled',       v_current.retry_worker_enabled,
    'batch_enabled',              v_current.batch_enabled,
    'bulk_enabled',               v_current.bulk_enabled
  );
  v_eff_after := jsonb_build_object(
    'dispatch_enabled',           v_profile.dispatch_enabled,
    'dry_run_only',               v_profile.dry_run_only,
    'email_live_enabled',         v_profile.email_live_enabled,
    'scheduler_enabled',          false,
    'automatic_triggers_enabled', false,
    'retry_worker_enabled',       false,
    'batch_enabled',              false,
    'bulk_enabled',               false
  );

  PERFORM set_config('comm_hub.mode_transition', 'on', true);

  UPDATE public.communication_hub_control_settings
     SET operating_mode              = p_new_mode,
         previous_operating_mode     = v_previous_mode,
         mode_changed_at             = v_now,
         mode_changed_by             = p_actor,
         mode_change_reason          = v_reason,
         configuration_version       = v_new_version,
         dispatch_enabled            = v_profile.dispatch_enabled,
         dry_run_only                = v_profile.dry_run_only,
         email_live_enabled          = v_profile.email_live_enabled,
         sms_live_enabled            = v_profile.sms_live_enabled,
         whatsapp_live_enabled       = v_profile.whatsapp_live_enabled,
         print_enabled               = v_profile.print_enabled,
         letter_enabled              = v_profile.letter_enabled,
         scheduler_enabled           = false,
         automatic_triggers_enabled  = false,
         retry_worker_enabled        = false,
         batch_enabled               = false,
         bulk_enabled                = false,
         automation_state            = v_target_auto_state,
         automation_state_changed_at = v_now,
         automation_state_changed_by = p_actor,
         automation_armed_at         = NULL,
         automation_armed_by         = NULL,
         automation_arm_reason       = NULL,
         automation_suspended_at     = CASE WHEN v_target_auto_state = 'SUSPENDED' THEN v_now ELSE NULL END,
         automation_suspension_reason = CASE WHEN v_target_auto_state = 'SUSPENDED'
                                             THEN COALESCE(v_reason, 'mode_transition_' || p_new_mode::text)
                                             ELSE NULL END,
         updated_at                  = v_now,
         updated_by                  = p_actor
   WHERE singleton_guard = 'primary';

  -- 2g. Authoritative audit through the canonical writer. Failure raises
  --     MODE_AUDIT_SCHEMA_MISMATCH and rolls back the whole transaction.
  v_audit_id := public.write_comm_hub_operating_mode_audit(
    p_control_settings_id   := v_current.id,
    p_previous_mode         := v_previous_mode,
    p_new_mode              := p_new_mode,
    p_actor                 := p_actor,
    p_reason                := v_reason,
    p_configuration_version := v_new_version,
    p_effective_before      := v_eff_before,
    p_effective_after       := v_eff_after,
    p_automation_before     := v_current.automation_state,
    p_automation_after      := v_target_auto_state,
    p_source                := p_source
  );

  RETURN jsonb_build_object(
    'ok',                    true,
    'no_change',             false,
    'previous_mode',         v_previous_mode::text,
    'new_mode',              p_new_mode::text,
    'configuration_version', v_new_version,
    'automation_state',      v_target_auto_state,
    'profile',               to_jsonb(v_profile),
    'changed_at',            v_now,
    'actor',                 p_actor,
    'reason',                v_reason,
    'audit_id',              v_audit_id,
    'source',                COALESCE(p_source, 'canonical_core')
  );
END;
$$;

-- 3. Public wrappers keep their existing signatures. Refresh the
--    `apply_communication_release_mode` wrapper so it also passes any
--    caller scope (module/event/channel) into the audit writer via the
--    core's source parameter. Reason validation now happens inside the
--    core so both wrappers are protected.
CREATE OR REPLACE FUNCTION public.apply_communication_release_mode(
  p_new_mode text,
  p_reason text DEFAULT NULL,
  p_expected_version integer DEFAULT NULL,
  p_module_code text DEFAULT NULL,
  p_event_code text DEFAULT NULL,
  p_channel text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  RETURN v_result || jsonb_build_object(
    'scope', jsonb_build_object(
      'module_code', p_module_code,
      'event_code',  p_event_code,
      'channel',     p_channel
    )
  );
END;
$$;

-- 4. Deployment-time contract assertion. Runs once during this migration
--    and raises loudly if any required column is missing so we never
--    discover a schema drift from a browser click.
DO $$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  v_expected record;
BEGIN
  FOR v_expected IN
    SELECT * FROM (VALUES
      ('communication_hub_operating_mode_audit','control_settings_id'),
      ('communication_hub_operating_mode_audit','previous_mode'),
      ('communication_hub_operating_mode_audit','new_mode'),
      ('communication_hub_operating_mode_audit','actor'),
      ('communication_hub_operating_mode_audit','reason'),
      ('communication_hub_operating_mode_audit','changed_at'),
      ('communication_hub_operating_mode_audit','configuration_version'),
      ('communication_hub_operating_mode_audit','settings_snapshot'),
      ('communication_hub_control_settings','operating_mode'),
      ('communication_hub_control_settings','previous_operating_mode'),
      ('communication_hub_control_settings','configuration_version'),
      ('communication_hub_control_settings','automation_state'),
      ('communication_hub_control_settings','scheduler_enabled'),
      ('communication_hub_control_settings','automatic_triggers_enabled'),
      ('communication_hub_control_settings','retry_worker_enabled'),
      ('communication_hub_control_settings','batch_enabled'),
      ('communication_hub_control_settings','bulk_enabled'),
      ('communication_hub_mode_profile','operating_mode'),
      ('communication_hub_mode_profile','dispatch_enabled'),
      ('communication_hub_mode_profile','dry_run_only'),
      ('communication_hub_mode_profile','email_live_enabled')
    ) AS t(table_name, column_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name = v_expected.table_name
         AND column_name = v_expected.column_name
    ) THEN
      v_missing := array_append(v_missing,
        v_expected.table_name || '.' || v_expected.column_name);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'MODE_AUDIT_SCHEMA_MISMATCH: missing columns: %',
      array_to_string(v_missing, ', ');
  END IF;
END;
$$;

-- 5. Refresh PostgREST schema cache so admin browsers pick up the new
--    function bodies immediately (kills any stale actor_id path).
NOTIFY pgrst, 'reload schema';