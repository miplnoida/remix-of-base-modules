CREATE OR REPLACE FUNCTION public._evaluate_comm_hub_send_decision_core(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
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
  v_tpl_ver         text := nullif(p_payload->>'template_version_id','');
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
  v_stage_blocked   text := NULL;
  v_grant_eval      jsonb;
BEGIN
  v_total_count := jsonb_array_length(v_to) + jsonb_array_length(v_cc) + jsonb_array_length(v_bcc);
  IF v_module IS NULL OR v_module = '' THEN
    v_blockers := v_blockers || jsonb_build_object('code','payload_missing_module_code','stage','payload','severity','critical');
    v_blocker_codes := array_append(v_blocker_codes,'payload_missing_module_code');
    v_allowed := false;
  END IF;
  IF v_event IS NULL OR v_event = '' THEN
    v_blockers := v_blockers || jsonb_build_object('code','payload_missing_event_code','stage','payload','severity','critical');
    v_blocker_codes := array_append(v_blocker_codes,'payload_missing_event_code');
    v_allowed := false;
  END IF;
  IF v_send_context NOT IN ('preview','dry_run','controlled_live','manual_live','manual_production','auto_live_internal','cron','batch') THEN
    v_blockers := v_blockers || jsonb_build_object('code','payload_invalid_send_context','stage','payload','severity','high');
    v_blocker_codes := array_append(v_blocker_codes,'payload_invalid_send_context');
    v_allowed := false;
  END IF;
  SELECT * INTO v_settings FROM public.communication_hub_control_settings WHERE singleton_guard='primary';
  v_op_mode := coalesce(v_settings.operating_mode::text,'EMERGENCY_STOP');
  v_config_version := v_settings.configuration_version;
  SELECT policy_version INTO v_recip_ver FROM public.communication_hub_recipient_policy WHERE singleton_guard='primary';
  IF v_op_mode = 'EMERGENCY_STOP' THEN
    v_blockers := v_blockers || jsonb_build_object('code','emergency_stop_active','stage','global_gate','severity','critical');
    v_blocker_codes := array_append(v_blocker_codes,'emergency_stop_active');
    v_allowed := false;
    IF v_stage_blocked IS NULL THEN v_stage_blocked := 'global_gate'; END IF;
  END IF;
  IF v_send_context IN ('controlled_live','manual_live','manual_production','auto_live_internal','cron','batch') THEN
    IF v_settings.dispatch_enabled = false THEN
      v_blockers := v_blockers || jsonb_build_object('code','global_dispatch_disabled','stage','global_gate','severity','high');
      v_blocker_codes := array_append(v_blocker_codes,'global_dispatch_disabled');
      v_allowed := false;
    END IF;
    IF v_settings.dry_run_only = true THEN
      v_blockers := v_blockers || jsonb_build_object('code','global_dry_run_only','stage','global_gate','severity','high');
      v_blocker_codes := array_append(v_blocker_codes,'global_dry_run_only');
      v_allowed := false;
    END IF;
    IF v_channel = 'email' AND v_settings.email_live_enabled <> true THEN
      v_blockers := v_blockers || jsonb_build_object('code','global_email_live_disabled','stage','global_gate','severity','high');
      v_blocker_codes := array_append(v_blocker_codes,'global_email_live_disabled');
      v_allowed := false;
    END IF;
  END IF;
  IF v_send_context IN ('cron','batch') THEN
    v_blockers := v_blockers || jsonb_build_object('code','automated_context_not_permitted','stage','send_context','severity','critical');
    v_blocker_codes := array_append(v_blocker_codes,'automated_context_not_permitted');
    v_allowed := false;
  END IF;
  BEGIN
    -- UX.6B: inner evaluator expects payload keys `to`/`cc`/`bcc`, not the
    -- outer `*_recipients` shape. Passing the wrong keys silently allowed
    -- every address because the evaluator saw empty recipient arrays.
    v_recip_eval := public.evaluate_comm_hub_recipient_policy(jsonb_build_object(
      'to', v_to, 'cc', v_cc, 'bcc', v_bcc));
    IF NOT coalesce((v_recip_eval->>'allowed')::boolean, false) THEN
      v_blockers := v_blockers || jsonb_build_object('code','recipient_policy_denied','stage','recipient_policy','severity','critical',
        'message', coalesce(v_recip_eval->>'reason','recipient not permitted'),
        'detail', v_recip_eval);
      v_blocker_codes := array_append(v_blocker_codes,'recipient_policy_denied');
      v_allowed := false;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_warnings := v_warnings || jsonb_build_object('code','recipient_policy_error','stage','recipient_policy','message', SQLERRM);
  END;
  v_policy_max_tot := coalesce((v_recip_eval->>'max_total_recipients')::int, 2147483647);
  v_effective_max := LEAST(v_policy_max_tot, coalesce(v_payload_max_tot, 2147483647));
  IF v_total_count > v_effective_max THEN
    v_blockers := v_blockers || jsonb_build_object('code','recipient_total_over_strictest_limit','stage','recipient_policy','severity','high',
      'message', format('total recipients %s exceeds effective max %s', v_total_count, v_effective_max));
    v_blocker_codes := array_append(v_blocker_codes,'recipient_total_over_strictest_limit');
    v_allowed := false;
  END IF;
  IF v_send_context = 'controlled_live' THEN
    IF jsonb_array_length(v_to) <> 1 THEN
      v_blockers := v_blockers || jsonb_build_object('code','controlled_live_single_recipient_required','stage','controlled_live','severity','critical');
      v_blocker_codes := array_append(v_blocker_codes,'controlled_live_single_recipient_required');
      v_allowed := false;
    END IF;
    IF jsonb_array_length(v_cc) > 0 THEN
      v_blockers := v_blockers || jsonb_build_object('code','controlled_live_cc_not_permitted','stage','controlled_live','severity','critical');
      v_blocker_codes := array_append(v_blocker_codes,'controlled_live_cc_not_permitted');
      v_allowed := false;
    END IF;
    IF jsonb_array_length(v_bcc) > 0 THEN
      v_blockers := v_blockers || jsonb_build_object('code','controlled_live_bcc_not_permitted','stage','controlled_live','severity','critical');
      v_blocker_codes := array_append(v_blocker_codes,'controlled_live_bcc_not_permitted');
      v_allowed := false;
    END IF;
    IF v_dryrun_cert_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_missing','stage','controlled_live','severity','high');
      v_blocker_codes := array_append(v_blocker_codes,'dry_run_certification_missing');
      v_allowed := false;
    END IF;
    IF v_ctrl_grant_id IS NOT NULL THEN
      v_grant_eval := public.validate_comm_hub_controlled_live_grant(jsonb_build_object('grant_id', v_ctrl_grant_id));
      IF NOT coalesce((v_grant_eval->>'valid')::boolean, false) THEN
        v_blockers := v_blockers || coalesce(v_grant_eval->'blockers','[]'::jsonb);
        v_allowed := false;
      END IF;
    END IF;
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
    'allowed', v_allowed,
    'status', v_status,
    'decision_id', v_decision_id,
    'decision_type','canonical_send_decision',
    'send_context', v_send_context,
    'module_code', v_module,
    'event_code', v_event,
    'channel', v_channel,
    'blockers', v_blockers,
    'warnings', v_warnings,
    'gate_results', v_gates,
    'fix_actions', v_fix_actions,
    'configuration_version', v_config_version,
    'recipient_policy_version', v_recip_ver,
    'send_policy_version', NULL,
    'review_policy_version', NULL,
    'evaluated_at', v_now,
    'expires_at', v_expires_at,
    'trace_context', jsonb_build_object(
      'current_stage', coalesce(v_stage_blocked,'complete'),
      'blocked_stage', v_stage_blocked,
      'blocker_codes', to_jsonb(v_blocker_codes)),
    'source','evaluate_comm_hub_send_decision'
  );
END;
$function$;