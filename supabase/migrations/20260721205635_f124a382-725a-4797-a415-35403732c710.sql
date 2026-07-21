
-- 1) Mode profile reference table (canonical map: mode -> full internal control set)
CREATE TABLE IF NOT EXISTS public.communication_hub_mode_profile (
  operating_mode TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  dispatch_enabled BOOLEAN NOT NULL,
  dry_run_only BOOLEAN NOT NULL,
  email_live_enabled BOOLEAN NOT NULL,
  sms_live_enabled BOOLEAN NOT NULL DEFAULT false,
  whatsapp_live_enabled BOOLEAN NOT NULL DEFAULT false,
  print_enabled BOOLEAN NOT NULL DEFAULT false,
  letter_enabled BOOLEAN NOT NULL DEFAULT false,
  scheduler_enabled BOOLEAN NOT NULL,
  automatic_triggers_enabled BOOLEAN NOT NULL,
  retry_worker_enabled BOOLEAN NOT NULL,
  batch_enabled BOOLEAN NOT NULL,
  bulk_enabled BOOLEAN NOT NULL,
  real_provider_available BOOLEAN NOT NULL,
  requires_grant_for_real_email BOOLEAN NOT NULL DEFAULT false,
  eligible_release_stages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.communication_hub_mode_profile TO authenticated;
GRANT ALL ON public.communication_hub_mode_profile TO service_role;

ALTER TABLE public.communication_hub_mode_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mode profile readable to authenticated" ON public.communication_hub_mode_profile;
CREATE POLICY "mode profile readable to authenticated"
  ON public.communication_hub_mode_profile FOR SELECT TO authenticated USING (true);

-- Seed / upsert the five canonical profiles.
INSERT INTO public.communication_hub_mode_profile
  (operating_mode, display_name, summary, dispatch_enabled, dry_run_only, email_live_enabled,
   scheduler_enabled, automatic_triggers_enabled, retry_worker_enabled, batch_enabled, bulk_enabled,
   real_provider_available, requires_grant_for_real_email, eligible_release_stages)
VALUES
  ('DRY_RUN',
   'Safe Testing',
   'Simulate every send. Real provider unavailable. Scheduler, automation, batch, bulk off.',
   true,  true,  false, false, false, false, false, false, false, false,
   ARRAY['SETUP_INCOMPLETE','READY_FOR_SAFE_TESTING','DRY_RUN_CERTIFIED']),
  ('CONTROLLED_LIVE',
   'Controlled Testing',
   'Controlled Stub uses the provider simulator. One real email requires a one-use server grant.',
   true,  false, true,  false, false, false, false, false, true,  true,
   ARRAY['DRY_RUN_CERTIFIED','CONTROLLED_STUB_CERTIFIED','CONTROLLED_LIVE_CERTIFIED']),
  ('MANUAL_PRODUCTION',
   'Manual Production',
   'Real provider available for certified manual events. Scheduler, automation, batch, bulk off.',
   true,  false, true,  false, false, true,  false, false, true,  false,
   ARRAY['MANUAL_PRODUCTION_CERTIFIED','MANUAL_PRODUCTION_ACTIVE']),
  ('AUTOMATED_PRODUCTION',
   'Automated Production',
   'Real provider available for automation-certified events. Scheduler, retries, batch, bulk gated by event policy.',
   true,  false, true,  true,  true,  true,  true,  true,  true,  false,
   ARRAY['AUTOMATED_PRODUCTION_CERTIFIED','AUTOMATED_PRODUCTION_ACTIVE']),
  ('EMERGENCY_STOP',
   'Emergency Stop',
   'New dispatch, real provider, scheduler, automation, batch, bulk all blocked. Evidence preserved.',
   false, true,  false, false, false, false, false, false, false, false,
   ARRAY[]::TEXT[])
ON CONFLICT (operating_mode) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  summary = EXCLUDED.summary,
  dispatch_enabled = EXCLUDED.dispatch_enabled,
  dry_run_only = EXCLUDED.dry_run_only,
  email_live_enabled = EXCLUDED.email_live_enabled,
  scheduler_enabled = EXCLUDED.scheduler_enabled,
  automatic_triggers_enabled = EXCLUDED.automatic_triggers_enabled,
  retry_worker_enabled = EXCLUDED.retry_worker_enabled,
  batch_enabled = EXCLUDED.batch_enabled,
  bulk_enabled = EXCLUDED.bulk_enabled,
  real_provider_available = EXCLUDED.real_provider_available,
  requires_grant_for_real_email = EXCLUDED.requires_grant_for_real_email,
  eligible_release_stages = EXCLUDED.eligible_release_stages,
  updated_at = now();

-- 2) Extend control settings with optional flags used by the profile.
--    These are legacy compat surfaces the profile now owns. Guarded IF NOT EXISTS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'communication_hub_control_settings'
      AND column_name = 'scheduler_enabled'
  ) THEN
    ALTER TABLE public.communication_hub_control_settings ADD COLUMN scheduler_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'communication_hub_control_settings'
      AND column_name = 'automatic_triggers_enabled'
  ) THEN
    ALTER TABLE public.communication_hub_control_settings ADD COLUMN automatic_triggers_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'communication_hub_control_settings'
      AND column_name = 'retry_worker_enabled'
  ) THEN
    ALTER TABLE public.communication_hub_control_settings ADD COLUMN retry_worker_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'communication_hub_control_settings'
      AND column_name = 'batch_enabled'
  ) THEN
    ALTER TABLE public.communication_hub_control_settings ADD COLUMN batch_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'communication_hub_control_settings'
      AND column_name = 'bulk_enabled'
  ) THEN
    ALTER TABLE public.communication_hub_control_settings ADD COLUMN bulk_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 3) Canonical mode change RPC. Single server-side operation for mode transitions.
CREATE OR REPLACE FUNCTION public.apply_communication_release_mode(
  p_new_mode TEXT,
  p_reason TEXT DEFAULT NULL,
  p_expected_version INTEGER DEFAULT NULL
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'authentication_required';
  END IF;

  -- Role check reuses existing helper when present, otherwise falls back.
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

  -- Lock settings singleton
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

  -- Signal to any legacy-writer trigger that this write is mode-owned.
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

  -- One audit record per transition. Uses existing control_audit table when present.
  BEGIN
    INSERT INTO public.communication_hub_control_audit
      (actor_id, action, reason, previous_values, new_values, configuration_version)
    VALUES
      (v_uid, 'apply_release_mode', p_reason,
       jsonb_build_object('operating_mode', v_previous_mode),
       jsonb_build_object('operating_mode', p_new_mode, 'profile', to_jsonb(v_profile)),
       v_new_version);
  EXCEPTION WHEN undefined_table THEN
    -- audit table unavailable in this environment: caller can still rely on
    -- mode_changed_at / mode_changed_by fields for provenance
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
    'reason', p_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_communication_release_mode(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_communication_release_mode(TEXT, TEXT, INTEGER) TO authenticated, service_role;

-- 4) Trigger: reject direct edits to mode-derived control fields.
CREATE OR REPLACE FUNCTION public.enforce_mode_derived_controls()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_flag TEXT;
BEGIN
  v_flag := current_setting('comm_hub.mode_transition', true);
  IF v_flag = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.dispatch_enabled IS DISTINCT FROM OLD.dispatch_enabled
     OR NEW.dry_run_only IS DISTINCT FROM OLD.dry_run_only
     OR NEW.email_live_enabled IS DISTINCT FROM OLD.email_live_enabled
     OR NEW.sms_live_enabled IS DISTINCT FROM OLD.sms_live_enabled
     OR NEW.whatsapp_live_enabled IS DISTINCT FROM OLD.whatsapp_live_enabled
     OR NEW.scheduler_enabled IS DISTINCT FROM OLD.scheduler_enabled
     OR NEW.automatic_triggers_enabled IS DISTINCT FROM OLD.automatic_triggers_enabled
     OR NEW.retry_worker_enabled IS DISTINCT FROM OLD.retry_worker_enabled
     OR NEW.batch_enabled IS DISTINCT FROM OLD.batch_enabled
     OR NEW.bulk_enabled IS DISTINCT FROM OLD.bulk_enabled
     OR NEW.operating_mode IS DISTINCT FROM OLD.operating_mode
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'mode_derived_field_direct_write',
      HINT = 'This setting is managed by the Communication Hub operating mode.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_mode_derived_controls ON public.communication_hub_control_settings;
CREATE TRIGGER trg_enforce_mode_derived_controls
  BEFORE UPDATE ON public.communication_hub_control_settings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_mode_derived_controls();

-- 5) Readiness aggregator (read-only, no writes, no provider calls).
CREATE OR REPLACE FUNCTION public.check_comm_hub_readiness(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_module TEXT := NULLIF(p_payload->>'module_code','');
  v_event TEXT := NULLIF(p_payload->>'event_code','');
  v_channel TEXT := COALESCE(NULLIF(p_payload->>'channel',''),'email');
  v_target TEXT := COALESCE(NULLIF(p_payload->>'target_stage',''),'SAFE_TESTING');
  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_profile public.communication_hub_mode_profile%ROWTYPE;
  v_blockers JSONB := '[]'::JSONB;
  v_warnings JSONB := '[]'::JSONB;
  v_available JSONB := '[]'::JSONB;
  v_decision JSONB;
BEGIN
  SELECT * INTO v_settings FROM public.communication_hub_control_settings
  WHERE singleton_guard='primary';
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ready', false,
      'blockers', jsonb_build_array(jsonb_build_object(
        'code','platform_settings_missing','stage','platform','severity','critical',
        'title','Communication Hub settings are not initialised',
        'message','The hub settings singleton is missing. Platform setup must complete before any go-live activity.',
        'fixAction','Contact platform administrator','fixRoute','/admin/communication-hub'
      )),
      'warnings', '[]'::jsonb,
      'availableActions', '[]'::jsonb
    );
  END IF;

  SELECT * INTO v_profile FROM public.communication_hub_mode_profile
  WHERE operating_mode = v_settings.operating_mode;

  -- Emergency stop is a hard gate for every target except Safe Testing diagnostics.
  IF v_settings.operating_mode = 'EMERGENCY_STOP' THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code','emergency_stop_engaged','stage','mode','severity','critical',
      'title','Emergency Stop is engaged',
      'message','New dispatch, real provider, scheduler, automation, batch and bulk are all blocked. Historical evidence remains available.',
      'fixAction','Select an operating mode','fixRoute','/admin/communication-hub/go-live'
    ));
  END IF;

  -- Event-scoped checks (only if the operator selected an event).
  IF v_module IS NOT NULL AND v_event IS NOT NULL THEN
    BEGIN
      SELECT public.evaluate_comm_hub_send_decision(jsonb_build_object(
        'module_code', v_module,
        'event_code', v_event,
        'channel', v_channel,
        'send_context','preview'
      )) INTO v_decision;
      IF (v_decision->>'allowed')::boolean IS DISTINCT FROM true THEN
        v_blockers := v_blockers || COALESCE(v_decision->'blockers','[]'::jsonb);
        v_warnings := v_warnings || COALESCE(v_decision->'warnings','[]'::jsonb);
      END IF;
    EXCEPTION WHEN undefined_function THEN
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
        'code','send_decision_unavailable','stage','event','severity','medium',
        'title','Send decision evaluator unavailable',
        'message','The canonical send-decision RPC is not deployed in this environment.'
      ));
    END;
  ELSE
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code','event_not_selected','stage','selection','severity','medium',
      'title','Select a module and event',
      'message','Choose the event you are certifying so we can check its readiness.',
      'fixAction','Select event','fixRoute','/admin/communication-hub/go-live'
    ));
  END IF;

  -- Stage-target-specific hints
  IF v_target IN ('ONE_REAL_EMAIL','CONTROLLED_STUB') AND v_settings.operating_mode = 'DRY_RUN' THEN
    v_available := v_available || jsonb_build_array('switch_to_controlled_testing');
  END IF;
  IF v_target = 'MANUAL_PRODUCTION' AND v_settings.operating_mode NOT IN ('MANUAL_PRODUCTION','AUTOMATED_PRODUCTION') THEN
    v_available := v_available || jsonb_build_array('activate_manual_production');
  END IF;
  IF v_target = 'AUTOMATED_PRODUCTION' AND v_settings.operating_mode <> 'AUTOMATED_PRODUCTION' THEN
    v_available := v_available || jsonb_build_array('activate_automated_production');
  END IF;

  RETURN jsonb_build_object(
    'ready', (jsonb_array_length(v_blockers) = 0),
    'currentMode', v_settings.operating_mode,
    'targetStage', v_target,
    'configurationVersion', v_settings.configuration_version,
    'profile', to_jsonb(v_profile),
    'blockers', v_blockers,
    'warnings', v_warnings,
    'availableActions', v_available,
    'evaluatedAt', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_comm_hub_readiness(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_comm_hub_readiness(JSONB) TO authenticated, service_role;
