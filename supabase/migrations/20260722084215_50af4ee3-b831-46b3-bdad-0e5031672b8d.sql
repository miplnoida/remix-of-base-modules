-- CH-GL-02 Slice D — Fix type mismatch in check_comm_hub_readiness.
-- communication_hub_control_settings.operating_mode is enum
-- communication_operating_mode; communication_hub_mode_profile.operating_mode
-- is text. The current function compares them directly which raises
-- "operator does not exist: text = communication_operating_mode".
-- Cast the enum to text on the join and every equality/IN check to keep
-- the semantics unchanged. No writes are introduced.

CREATE OR REPLACE FUNCTION public.check_comm_hub_readiness(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_module   text := NULLIF(p_payload->>'module_code','');
  v_event    text := NULLIF(p_payload->>'event_code','');
  v_channel  text := COALESCE(NULLIF(p_payload->>'channel',''),'email');
  v_target   text := COALESCE(NULLIF(p_payload->>'target_stage',''),'SAFE_TESTING');
  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_profile  public.communication_hub_mode_profile%ROWTYPE;
  v_send_ctx text;
  v_decision jsonb;
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_actions  jsonb := '[]'::jsonb;
  v_ready    boolean := true;
BEGIN
  SELECT * INTO v_settings FROM public.communication_hub_control_settings
  ORDER BY updated_at DESC NULLS LAST LIMIT 1;

  SELECT * INTO v_profile
  FROM public.communication_hub_mode_profile
  WHERE operating_mode = v_settings.operating_mode::text;

  IF v_settings.operating_mode::text = 'EMERGENCY_STOP' THEN
    v_ready := false;
    v_blockers := v_blockers || jsonb_build_object(
      'code','emergency_stop_active','stage','platform','severity','critical',
      'title','Emergency Stop is engaged',
      'message','New dispatch is blocked while Emergency Stop is engaged.',
      'fixAction','emergency_stop','fixRoute','/admin/communication-hub/go-live');
  END IF;

  v_send_ctx := CASE v_target
    WHEN 'SAFE_TESTING'         THEN 'dry_run'
    WHEN 'CONTROLLED_STUB'      THEN 'controlled_live'
    WHEN 'ONE_REAL_EMAIL'       THEN 'controlled_live'
    WHEN 'MANUAL_PRODUCTION'    THEN 'manual_production'
    WHEN 'AUTOMATED_PRODUCTION' THEN 'cron'
    ELSE 'dry_run'
  END;

  IF v_module IS NOT NULL AND v_event IS NOT NULL THEN
    v_decision := public._evaluate_comm_hub_send_rules(jsonb_build_object(
      'module_code', v_module,
      'event_code', v_event,
      'channel', v_channel,
      'send_context', v_send_ctx,
      'to_recipients', '[]'::jsonb,
      'cc_recipients', '[]'::jsonb,
      'bcc_recipients', '[]'::jsonb,
      'preview_confirmed', false
    ));
    IF v_decision IS NOT NULL THEN
      IF NOT COALESCE((v_decision->>'allowed')::boolean, false) THEN
        v_ready := false;
      END IF;
      v_blockers := v_blockers || COALESCE(v_decision->'blockers','[]'::jsonb);
      v_warnings := v_warnings || COALESCE(v_decision->'warnings','[]'::jsonb);
    END IF;
  END IF;

  IF v_target = 'MANUAL_PRODUCTION' AND v_module IS NOT NULL AND v_event IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.communication_hub_event_live_control
      WHERE module_code = v_module AND event_code = v_event AND channel = v_channel
        AND (live_manual_only = true OR live_cron_allowed = true)
    ) THEN
      v_ready := false;
      v_blockers := v_blockers || jsonb_build_object(
        'code','event_not_certified_for_manual_production','stage','event','severity','critical',
        'title','Event not certified for Manual Production',
        'message','This event has no live_manual_only or live_cron_allowed certification.',
        'fixAction','event_configuration');
    END IF;
  END IF;

  IF v_target = 'AUTOMATED_PRODUCTION' AND v_module IS NOT NULL AND v_event IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.communication_hub_event_live_control
      WHERE module_code = v_module AND event_code = v_event AND channel = v_channel
        AND live_cron_allowed = true
    ) THEN
      v_ready := false;
      v_blockers := v_blockers || jsonb_build_object(
        'code','event_not_certified_for_automated_production','stage','event','severity','critical',
        'title','Event not certified for Automated Production',
        'message','This event has no live_cron_allowed certification.',
        'fixAction','event_configuration');
    END IF;
  END IF;

  IF v_target IN ('ONE_REAL_EMAIL','CONTROLLED_STUB') AND v_settings.operating_mode::text = 'DRY_RUN' THEN
    v_warnings := v_warnings || jsonb_build_object(
      'code','operating_mode_dry_run_only','stage','mode',
      'message','Current mode is Safe Testing; switch to Controlled Testing to run this stage.');
  END IF;
  IF v_target = 'MANUAL_PRODUCTION' AND v_settings.operating_mode::text NOT IN ('MANUAL_PRODUCTION','AUTOMATED_PRODUCTION') THEN
    v_ready := false;
    v_blockers := v_blockers || jsonb_build_object(
      'code','operating_mode_not_production','stage','mode','severity','high',
      'title','Operating mode is not Production',
      'message','Activate Manual Production from the mode cards to enable this stage.');
  END IF;
  IF v_target = 'AUTOMATED_PRODUCTION' AND v_settings.operating_mode::text <> 'AUTOMATED_PRODUCTION' THEN
    v_ready := false;
    v_blockers := v_blockers || jsonb_build_object(
      'code','operating_mode_not_automated','stage','mode','severity','high',
      'title','Operating mode is not Automated Production',
      'message','Activate Automated Production from the mode cards to enable this stage.');
  END IF;

  RETURN jsonb_build_object(
    'ready', v_ready,
    'currentMode', v_settings.operating_mode::text,
    'targetStage', v_target,
    'configurationVersion', v_settings.configuration_version,
    'profile', to_jsonb(v_profile),
    'blockers', v_blockers,
    'warnings', v_warnings,
    'availableActions', v_actions,
    'evaluatedAt', now()
  );
END;
$function$;

COMMENT ON FUNCTION public.check_comm_hub_readiness(jsonb) IS
'CH-GL-02 Slice D: Go Live readiness aggregator. Read-only. Casts operating_mode enum to text when joining communication_hub_mode_profile to avoid operator-does-not-exist error.';