
CREATE TABLE IF NOT EXISTS public.communication_hub_send_decision_log (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id                 uuid NOT NULL UNIQUE,
  module_code                 text NOT NULL,
  event_code                  text NOT NULL,
  channel                     text NOT NULL,
  send_context                text NOT NULL,
  requested_by                uuid,
  idempotency_key             text,
  allowed                     boolean NOT NULL,
  status                      text NOT NULL,
  configuration_version       bigint,
  recipient_policy_version    bigint,
  send_policy_version         bigint,
  review_policy_version       bigint,
  blockers                    jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings                    jsonb NOT NULL DEFAULT '[]'::jsonb,
  gate_results                jsonb NOT NULL DEFAULT '[]'::jsonb,
  fix_actions                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  trace_context               jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload                     jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at                timestamptz NOT NULL DEFAULT now(),
  expires_at                  timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ch_send_decision_log_lookup
  ON public.communication_hub_send_decision_log(module_code, event_code, channel, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ch_send_decision_log_idem
  ON public.communication_hub_send_decision_log(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

GRANT SELECT ON public.communication_hub_send_decision_log TO authenticated;
GRANT ALL    ON public.communication_hub_send_decision_log TO service_role;

ALTER TABLE public.communication_hub_send_decision_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_decision_log" ON public.communication_hub_send_decision_log;
CREATE POLICY "admin_read_decision_log"
  ON public.communication_hub_send_decision_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_send_decision(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_module          text := p_payload->>'module_code';
  v_event           text := p_payload->>'event_code';
  v_channel         text := coalesce(p_payload->>'channel','email');
  v_send_context    text := coalesce(p_payload->>'send_context', p_payload->>'send_mode', 'dry_run');
  v_to              jsonb := coalesce(p_payload->'to_recipients', '[]'::jsonb);
  v_cc              jsonb := coalesce(p_payload->'cc_recipients', '[]'::jsonb);
  v_bcc             jsonb := coalesce(p_payload->'bcc_recipients', '[]'::jsonb);
  v_all_recipients  jsonb;
  v_tpl_ver         text := nullif(p_payload->>'template_version_id','');
  v_sender_id       text := nullif(p_payload->>'sender_profile_id','');
  v_preview_ok      boolean := coalesce((p_payload->>'preview_confirmed')::boolean, false);
  v_preview_id      text := nullif(p_payload->>'preview_approval_id','');
  v_dryrun_cert_id  text := nullif(p_payload->>'dry_run_certification_id','');
  v_ctrl_grant_id   text := nullif(p_payload->>'controlled_live_grant_id','');
  v_idem            text := nullif(p_payload->>'idempotency_key','');
  v_requested_by    uuid := nullif(p_payload->>'requested_by','')::uuid;
  v_payload_max_tot int  := (p_payload->>'max_total_recipients')::int;

  v_settings        public.communication_hub_control_settings%ROWTYPE;
  v_op_mode         text;
  v_config_version  bigint;
  v_recip_ver       bigint;

  v_recip_eval      jsonb;
  v_send_auth       jsonb;
  v_review          jsonb;

  v_blockers        jsonb := '[]'::jsonb;
  v_warnings        jsonb := '[]'::jsonb;
  v_gates           jsonb := '[]'::jsonb;
  v_fix_actions     jsonb := '[]'::jsonb;
  v_blocker_codes   text[] := ARRAY[]::text[];
  v_allowed         boolean := true;
  v_decision_id     uuid := gen_random_uuid();
  v_now             timestamptz := now();
  v_expires_at      timestamptz := v_now + interval '5 minutes';
  v_status          text;

  v_total_count     int;
  v_policy_max_tot  int;
  v_effective_max   int;

  v_txt             text;
  v_stage_blocked   text := NULL;
BEGIN
  v_all_recipients :=
      (SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM
         (SELECT jsonb_array_elements_text(v_to)  AS x UNION ALL
          SELECT jsonb_array_elements_text(v_cc)  AS x UNION ALL
          SELECT jsonb_array_elements_text(v_bcc) AS x) s);
  v_total_count := jsonb_array_length(v_to) + jsonb_array_length(v_cc) + jsonb_array_length(v_bcc);

  -- Gate 1: payload
  IF v_module IS NULL OR v_module = '' THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','payload_missing_module_code','stage','payload','severity','critical',
      'message','module_code is required.');
    v_blocker_codes := array_append(v_blocker_codes,'payload_missing_module_code');
  END IF;
  IF v_event IS NULL OR v_event = '' THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','payload_missing_event_code','stage','payload','severity','critical',
      'message','event_code is required.');
    v_blocker_codes := array_append(v_blocker_codes,'payload_missing_event_code');
  END IF;
  IF v_send_context NOT IN ('preview','dry_run','controlled_live','manual_live','manual_production',
                            'auto_live_internal','cron','batch') THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','payload_invalid_send_context','stage','payload','severity','high',
      'message', format('send_context %L is not supported.', v_send_context));
    v_blocker_codes := array_append(v_blocker_codes,'payload_invalid_send_context');
  END IF;
  v_gates := v_gates || jsonb_build_object(
    'gate','payload',
    'status', CASE WHEN array_length(v_blocker_codes,1) IS NULL THEN 'pass' ELSE 'blocked' END,
    'reason', CASE WHEN array_length(v_blocker_codes,1) IS NULL THEN 'payload complete' ELSE 'invalid payload' END);
  IF array_length(v_blocker_codes,1) > 0 THEN
    v_stage_blocked := 'payload';
    v_allowed := false;
    IF 'payload_missing_module_code' = ANY(v_blocker_codes)
       OR 'payload_missing_event_code' = ANY(v_blocker_codes) THEN
      RETURN jsonb_build_object(
        'allowed', false,'status','blocked',
        'decision_id', v_decision_id,'decision_type','canonical_send_decision',
        'send_context', v_send_context,'blockers', v_blockers,'warnings', v_warnings,
        'gate_results', v_gates,'fix_actions', v_fix_actions,
        'trace_context', jsonb_build_object('current_stage','payload','blocked_stage','payload',
                                            'blocker_codes', to_jsonb(v_blocker_codes)),
        'evaluated_at', v_now,'expires_at',  v_expires_at,
        'source','evaluate_comm_hub_send_decision');
    END IF;
  END IF;

  -- Gate 2: settings + operating mode + Emergency Stop
  SELECT * INTO v_settings
    FROM public.communication_hub_control_settings
   WHERE singleton_guard = 'primary' LIMIT 1;

  IF NOT FOUND THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','global_settings_missing','stage','global_settings','severity','critical',
      'message','Canonical global settings singleton not found.');
    v_blocker_codes := array_append(v_blocker_codes,'global_settings_missing');
    v_allowed := false;
    IF v_stage_blocked IS NULL THEN v_stage_blocked := 'global_settings'; END IF;
  ELSE
    v_op_mode := v_settings.operating_mode::text;
    v_config_version := v_settings.configuration_version;
  END IF;
  v_gates := v_gates || jsonb_build_object(
    'gate','global_settings',
    'status', CASE WHEN v_settings.id IS NOT NULL THEN 'pass' ELSE 'blocked' END,
    'reason', coalesce('operating_mode=' || v_op_mode, 'no settings found'));

  IF v_op_mode = 'EMERGENCY_STOP' THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','emergency_stop_active','stage','emergency_stop','severity','critical',
      'message','Emergency Stop is active. No provider calls permitted.',
      'fix_route','/admin/communication-hub/global-settings',
      'fix_action','Lift Emergency Stop with an admin reason.');
    v_blocker_codes := array_append(v_blocker_codes,'emergency_stop_active');
    v_fix_actions := v_fix_actions || jsonb_build_object(
      'code','lift_emergency_stop','route','/admin/communication-hub/global-settings');
    v_allowed := false;
    IF v_stage_blocked IS NULL THEN v_stage_blocked := 'emergency_stop'; END IF;
  END IF;
  v_gates := v_gates || jsonb_build_object(
    'gate','emergency_stop',
    'status', CASE WHEN v_op_mode = 'EMERGENCY_STOP' THEN 'blocked' ELSE 'pass' END,
    'reason', CASE WHEN v_op_mode = 'EMERGENCY_STOP' THEN 'operating_mode is EMERGENCY_STOP' ELSE 'not in emergency stop' END);

  IF v_op_mode = 'AUTOMATED_PRODUCTION' THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','automated_production_not_certified','stage','operating_mode','severity','critical',
      'message','AUTOMATED_PRODUCTION is not permitted at this stage.');
    v_blocker_codes := array_append(v_blocker_codes,'automated_production_not_certified');
    v_allowed := false;
  END IF;

  IF v_send_context IN ('cron','batch') THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code', CASE v_send_context WHEN 'cron' THEN 'cron_prohibited' ELSE 'bulk_prohibited' END,
      'stage','send_context','severity','critical',
      'message', format('%s send-context is prohibited on this platform.', v_send_context));
    v_blocker_codes := array_append(v_blocker_codes,
      CASE v_send_context WHEN 'cron' THEN 'cron_prohibited' ELSE 'bulk_prohibited' END);
    v_allowed := false;
  END IF;

  IF v_send_context IN ('controlled_live','manual_live','manual_production','auto_live_internal')
     AND v_op_mode = 'DRY_RUN' THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','operating_mode_forbids_live_send','stage','operating_mode','severity','high',
      'message','Global operating mode is DRY_RUN; live sends are blocked.',
      'current_value', v_op_mode,
      'required_value','SINGLE_CONFIGURED_RECIPIENT | APPROVED_NAMED_RECIPIENTS | APPROVED_DOMAINS',
      'fix_route','/admin/communication-hub/global-settings');
    v_blocker_codes := array_append(v_blocker_codes,'operating_mode_forbids_live_send');
    v_allowed := false;
  END IF;

  IF v_channel = 'email' AND v_settings.email_live_enabled = false
     AND v_send_context IN ('controlled_live','manual_live','manual_production','auto_live_internal') THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','channel_live_disabled','stage','channel','severity','high',
      'message','Email live delivery is disabled by kill-switch.',
      'current_value','email_live_enabled=false',
      'fix_route','/admin/communication-hub/global-settings');
    v_blocker_codes := array_append(v_blocker_codes,'channel_live_disabled');
    v_allowed := false;
  END IF;

  -- Gate 3: recipient policy
  BEGIN
    v_recip_eval := public.evaluate_comm_hub_recipient_policy(
      jsonb_build_object(
        'to_recipients', v_to,'cc_recipients', v_cc,'bcc_recipients', v_bcc,
        'max_total_recipients', v_payload_max_tot));
    v_recip_ver := coalesce((v_recip_eval->>'policy_version')::bigint, 0);
    v_policy_max_tot := (v_recip_eval->>'max_total_recipients')::int;

    v_effective_max := LEAST(
      COALESCE(v_policy_max_tot, 2147483647),
      COALESCE(v_payload_max_tot, 2147483647));
    IF v_effective_max IS NOT NULL AND v_effective_max < 2147483647 AND v_total_count > v_effective_max THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','recipient_total_over_strictest_limit','stage','recipient_policy','severity','high',
        'message','Total recipient count exceeds the strictest applicable limit.',
        'current_value', v_total_count,'required_value', v_effective_max,
        'fix_route','/admin/communication-hub/recipient-policy');
      v_blocker_codes := array_append(v_blocker_codes,'recipient_total_over_strictest_limit');
      v_allowed := false;
    END IF;

    IF coalesce((v_recip_eval->>'allowed')::boolean,false) = false THEN
      IF jsonb_typeof(v_recip_eval->'blockers') = 'array' THEN
        FOR v_txt IN SELECT jsonb_array_elements_text(v_recip_eval->'blockers') LOOP
          v_blockers := v_blockers || jsonb_build_object(
            'code', v_txt,'stage','recipient_policy','severity','high',
            'message','Recipient policy denied: ' || v_txt,
            'fix_route','/admin/communication-hub/recipient-policy');
          v_blocker_codes := array_append(v_blocker_codes, v_txt);
        END LOOP;
      END IF;
      v_allowed := false;
      IF v_stage_blocked IS NULL THEN v_stage_blocked := 'recipient_policy'; END IF;
    END IF;

    IF jsonb_typeof(v_recip_eval->'warnings') = 'array' THEN
      FOR v_txt IN SELECT jsonb_array_elements_text(v_recip_eval->'warnings') LOOP
        v_warnings := v_warnings || jsonb_build_object('code', v_txt, 'stage','recipient_policy','message', v_txt);
      END LOOP;
    END IF;

    v_gates := v_gates || jsonb_build_object(
      'gate','recipient_policy',
      'status', CASE WHEN coalesce((v_recip_eval->>'allowed')::boolean,false) THEN 'pass' ELSE 'blocked' END,
      'reason', coalesce(v_recip_eval->>'note','recipient policy evaluated'));
  EXCEPTION WHEN OTHERS THEN
    v_warnings := v_warnings || jsonb_build_object(
      'code','recipient_policy_error','stage','recipient_policy','message', SQLERRM);
    v_gates := v_gates || jsonb_build_object('gate','recipient_policy','status','unknown','reason', SQLERRM);
  END;

  -- Gate 4: send authorization
  BEGIN
    v_send_auth := public.evaluate_comm_hub_send_authorization(
      jsonb_build_object(
        'module_code', v_module,'event_code', v_event,'channel', v_channel,
        'recipients', v_all_recipients,'environment_scope','production',
        'entity_id', p_payload->>'entity_id','dedupe_key', v_idem,
        'business_event_id', p_payload->>'business_event_id'));
    IF coalesce((v_send_auth->>'allowed')::boolean, false) = false THEN
      IF jsonb_typeof(v_send_auth->'blockers') = 'array' THEN
        FOR v_txt IN SELECT jsonb_array_elements_text(v_send_auth->'blockers') LOOP
          v_blockers := v_blockers || jsonb_build_object(
            'code', v_txt, 'stage','send_authorization','severity','high',
            'message','Send authorization denied: ' || v_txt);
          v_blocker_codes := array_append(v_blocker_codes, v_txt);
        END LOOP;
      END IF;
      v_allowed := false;
      IF v_stage_blocked IS NULL THEN v_stage_blocked := 'send_authorization'; END IF;
    END IF;
    v_gates := v_gates || jsonb_build_object(
      'gate','send_authorization',
      'status', CASE WHEN coalesce((v_send_auth->>'allowed')::boolean,false) THEN 'pass' ELSE 'blocked' END,
      'reason', coalesce(v_send_auth->>'note','send authorization evaluated'));
  EXCEPTION WHEN OTHERS THEN
    v_warnings := v_warnings || jsonb_build_object(
      'code','send_authorization_error','stage','send_authorization','message', SQLERRM);
    v_gates := v_gates || jsonb_build_object('gate','send_authorization','status','unknown','reason', SQLERRM);
  END;

  -- Gate 5: review policy
  BEGIN
    v_review := public.evaluate_comm_hub_review_policy(
      jsonb_build_object(
        'module_code', v_module,'event_code', v_event,'channel', v_channel,
        'preview_shown', v_preview_ok,'rendered_template_version_id', v_tpl_ver,
        'mode', CASE WHEN v_send_context IN ('preview','dry_run') THEN 'dry_run' ELSE 'live' END));
    IF coalesce((v_review->>'authorized')::boolean, false) = false THEN
      IF jsonb_typeof(v_review->'blockers') = 'array' THEN
        FOR v_txt IN SELECT jsonb_array_elements_text(v_review->'blockers') LOOP
          v_blockers := v_blockers || jsonb_build_object(
            'code', v_txt,'stage','review_policy','severity','high',
            'message','Review policy denied: ' || v_txt,
            'fix_route','/admin/communication-hub/events');
          v_blocker_codes := array_append(v_blocker_codes, v_txt);
        END LOOP;
      END IF;
      v_allowed := false;
      IF v_stage_blocked IS NULL THEN v_stage_blocked := 'review_policy'; END IF;
    END IF;
    v_gates := v_gates || jsonb_build_object(
      'gate','review_policy',
      'status', CASE WHEN coalesce((v_review->>'authorized')::boolean,false) THEN 'pass' ELSE 'blocked' END,
      'reason', coalesce(v_review->>'note','review policy evaluated'));
  EXCEPTION WHEN OTHERS THEN
    v_warnings := v_warnings || jsonb_build_object(
      'code','review_policy_error','stage','review_policy','message', SQLERRM);
    v_gates := v_gates || jsonb_build_object('gate','review_policy','status','unknown','reason', SQLERRM);
  END;

  -- Gate 6: preview / dry-run cert / controlled-live grant
  IF v_send_context = 'controlled_live' THEN
    IF v_dryrun_cert_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','dry_run_certification_missing','stage','controlled_live','severity','high',
        'message','Controlled live requires a dry-run certification ID.',
        'fix_route','/admin/communication-hub/go-live');
      v_blocker_codes := array_append(v_blocker_codes,'dry_run_certification_missing');
      v_allowed := false;
    END IF;
    IF v_ctrl_grant_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','controlled_live_grant_missing','stage','controlled_live','severity','critical',
        'message','Controlled live requires an operator grant.',
        'fix_route','/admin/communication-hub/go-live');
      v_blocker_codes := array_append(v_blocker_codes,'controlled_live_grant_missing');
      v_allowed := false;
    END IF;
  END IF;

  IF v_send_context IN ('controlled_live','manual_live','manual_production')
     AND v_preview_id IS NULL AND v_preview_ok = false THEN
    v_warnings := v_warnings || jsonb_build_object(
      'code','preview_approval_recommended','stage','preview_approval',
      'message','Preview approval recommended for live send-contexts.');
  END IF;

  IF v_allowed THEN v_status := 'allowed'; ELSE v_status := 'blocked'; END IF;

  BEGIN
    INSERT INTO public.communication_hub_send_decision_log (
      decision_id, module_code, event_code, channel, send_context,
      requested_by, idempotency_key, allowed, status,
      configuration_version, recipient_policy_version,
      blockers, warnings, gate_results, fix_actions, trace_context,
      payload, evaluated_at, expires_at
    ) VALUES (
      v_decision_id, coalesce(v_module,''), coalesce(v_event,''), v_channel, v_send_context,
      v_requested_by, v_idem, v_allowed, v_status,
      v_config_version, v_recip_ver,
      v_blockers, v_warnings, v_gates, v_fix_actions,
      jsonb_build_object('current_stage', coalesce(v_stage_blocked,'complete'),
                         'blocked_stage', v_stage_blocked,
                         'blocker_codes', to_jsonb(v_blocker_codes)),
      p_payload, v_now, v_expires_at);
  EXCEPTION WHEN OTHERS THEN
    v_warnings := v_warnings || jsonb_build_object('code','decision_log_write_failed','message', SQLERRM);
  END;

  RETURN jsonb_build_object(
    'allowed', v_allowed,'status', v_status,
    'decision_id', v_decision_id,'decision_type','canonical_send_decision',
    'send_context', v_send_context,
    'module_code', v_module,'event_code',  v_event,'channel',     v_channel,
    'blockers',    v_blockers,'warnings',    v_warnings,
    'gate_results', v_gates,'fix_actions', v_fix_actions,
    'configuration_version',    v_config_version,
    'recipient_policy_version', v_recip_ver,
    'send_policy_version',      (v_send_auth->>'policy_version')::bigint,
    'review_policy_version',    (v_review->>'policy_version')::bigint,
    'evaluated_at', v_now,'expires_at',   v_expires_at,
    'trace_context', jsonb_build_object(
      'current_stage', coalesce(v_stage_blocked,'complete'),
      'blocked_stage', v_stage_blocked,
      'blocker_codes', to_jsonb(v_blocker_codes)),
    'source','evaluate_comm_hub_send_decision');
END;
$function$;

REVOKE ALL ON FUNCTION public.evaluate_comm_hub_send_decision(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_comm_hub_send_decision(jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.evaluate_comm_hub_send_decision(jsonb) IS
  'CH-SIMPLE-P3B canonical send decision.';
