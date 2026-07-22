
-- CH-GL-02 Slice A — Pure rule evaluator + genuinely read-only readiness.
--
-- Contract:
--   public._evaluate_comm_hub_send_rules(jsonb) MUST perform zero writes to
--   any table. It reuses the canonical rule logic in
--   _evaluate_comm_hub_send_decision_core by executing that function inside a
--   plpgsql subtransaction and raising a sentinel exception so every DML
--   inside (notably the INSERT into communication_hub_send_decision_log) is
--   rolled back. plpgsql local variables retain their values across the
--   subtransaction boundary, so the captured jsonb envelope survives.
--
--   public.check_comm_hub_readiness now calls the pure function directly and
--   never routes through the persistent evaluate_comm_hub_send_decision
--   wrapper.

CREATE OR REPLACE FUNCTION public._evaluate_comm_hub_send_rules(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_result jsonb;
  v_sentinel constant text := '__ch_pure_rules_rollback__';
BEGIN
  BEGIN
    -- Delegate to the canonical rule body. Any DML the core performs
    -- (including the decision-log INSERT) will be rolled back by the
    -- RAISE below. Local variables in *this* frame survive the rollback.
    v_result := public._evaluate_comm_hub_send_decision_core(p_payload);
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = v_sentinel;
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> v_sentinel THEN
      RAISE;
    END IF;
  END;

  IF v_result IS NULL THEN
    -- Should never happen: the core always returns jsonb. Defensive fallback.
    RETURN jsonb_build_object(
      'allowed', false,
      'status', 'blocked',
      'decision_id', NULL,
      'decision_type', 'pure_send_rules',
      'blockers', jsonb_build_array(jsonb_build_object(
        'code','pure_rule_evaluator_no_result','stage','platform','severity','critical')),
      'warnings', '[]'::jsonb,
      'gate_results', '[]'::jsonb,
      'fix_actions', '[]'::jsonb,
      'source','_evaluate_comm_hub_send_rules'
    );
  END IF;

  -- Strip decision_id so callers can never mistake it for durable evidence.
  v_result := jsonb_set(v_result, '{decision_id}', 'null'::jsonb, true);
  v_result := jsonb_set(v_result, '{source}', to_jsonb('_evaluate_comm_hub_send_rules'::text), true);
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public._evaluate_comm_hub_send_rules(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._evaluate_comm_hub_send_rules(jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public._evaluate_comm_hub_send_rules(jsonb) IS
'CH-GL-02 Slice A: pure (zero-write) send-rule evaluator. Delegates to _evaluate_comm_hub_send_decision_core inside a subtransaction and rolls back any writes before returning. Used by check_comm_hub_readiness so readiness never persists a decision-log row.';

-- Map each Go Live target stage to the send_context the rule evaluator
-- expects. Kept in one place so the readiness aggregator stays honest.
CREATE OR REPLACE FUNCTION public._ch_target_stage_to_send_context(p_target text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE upper(coalesce(p_target,''))
    WHEN 'SAFE_TESTING'          THEN 'preview'
    WHEN 'CONTROLLED_STUB'       THEN 'controlled_live'
    WHEN 'ONE_REAL_EMAIL'        THEN 'controlled_live'
    WHEN 'MANUAL_PRODUCTION'     THEN 'manual_production'
    WHEN 'AUTOMATED_PRODUCTION'  THEN 'auto_live_internal'
    ELSE 'preview'
  END
$$;

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
  v_send_context TEXT := public._ch_target_stage_to_send_context(v_target);
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
      'targetStage', v_target,
      'blockers', jsonb_build_array(jsonb_build_object(
        'code','platform_settings_missing','stage','platform','severity','critical',
        'title','Communication Hub settings are not initialised',
        'message','The hub settings singleton is missing. Platform setup must complete before any go-live activity.',
        'fixAction','Contact platform administrator','fixRoute','/admin/communication-hub'
      )),
      'warnings', '[]'::jsonb,
      'availableActions', '[]'::jsonb,
      'evaluatedAt', now()
    );
  END IF;

  SELECT * INTO v_profile FROM public.communication_hub_mode_profile
  WHERE operating_mode = v_settings.operating_mode;

  IF v_settings.operating_mode = 'EMERGENCY_STOP' THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code','emergency_stop_engaged','stage','mode','severity','critical',
      'title','Emergency Stop is engaged',
      'message','New dispatch, real provider, scheduler, automation, batch and bulk are all blocked. Historical evidence remains available.',
      'fixAction','Select an operating mode','fixRoute','/admin/communication-hub/go-live'
    ));
  END IF;

  IF v_module IS NOT NULL AND v_event IS NOT NULL THEN
    BEGIN
      -- READ-ONLY: pure rule evaluator, guaranteed zero writes.
      v_decision := public._evaluate_comm_hub_send_rules(jsonb_build_object(
        'module_code', v_module,
        'event_code', v_event,
        'channel', v_channel,
        'send_context', v_send_context
      ));
      IF (v_decision->>'allowed')::boolean IS DISTINCT FROM true THEN
        v_blockers := v_blockers || COALESCE(v_decision->'blockers','[]'::jsonb);
        v_warnings := v_warnings || COALESCE(v_decision->'warnings','[]'::jsonb);
      END IF;
    EXCEPTION WHEN undefined_function THEN
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
        'code','send_decision_unavailable','stage','event','severity','medium',
        'title','Send decision evaluator unavailable',
        'message','The canonical send-rule evaluator is not deployed in this environment.'
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
    'sendContext', v_send_context,
    'configurationVersion', v_settings.configuration_version,
    'profile', to_jsonb(v_profile),
    'blockers', v_blockers,
    'warnings', v_warnings,
    'availableActions', v_available,
    'evaluatedAt', now(),
    'source','check_comm_hub_readiness'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_comm_hub_readiness(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_comm_hub_readiness(JSONB) TO authenticated, service_role;

COMMENT ON FUNCTION public.check_comm_hub_readiness(jsonb) IS
'CH-GL-02 Slice A: Go Live readiness aggregator. Read-only. Calls the pure _evaluate_comm_hub_send_rules evaluator so no decision-log row, communication request, recipient row, message, delivery attempt, controlled-live execution, or grant is created.';
