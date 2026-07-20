
-- ============================================================================
-- CH-SIMPLE-P3B-R.1
-- ============================================================================

-- 1. evaluate_comm_hub_send_authorization → compat wrapper
CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_send_authorization(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_module     text := p_payload->>'module_code';
  v_event      text := p_payload->>'event_code';
  v_channel    text := COALESCE(p_payload->>'channel','email');
  v_env        text := COALESCE(p_payload->>'environment_scope','production');
  v_recipients jsonb := COALESCE(p_payload->'recipients', '[]'::jsonb);
  v_entity_id  text := p_payload->>'entity_id';
  v_send_ctx   text := COALESCE(p_payload->>'send_context','manual_live');
  v_canon      jsonb;
  v_policy     jsonb;
  v_blocker_codes jsonb := '[]'::jsonb;
  v_required_action text := NULL;
  v_recipient_count int := 0;
BEGIN
  IF jsonb_typeof(v_recipients) = 'array' THEN
    v_recipient_count := jsonb_array_length(v_recipients);
  END IF;

  v_canon := public.evaluate_comm_hub_send_decision(jsonb_build_object(
    'module_code',       v_module,
    'event_code',        v_event,
    'channel',           v_channel,
    'environment_scope', v_env,
    'send_context',      v_send_ctx,
    'to_recipients',     v_recipients,
    'entity_id',         v_entity_id,
    'business_event_id', NULLIF(p_payload->>'business_event_id',''),
    'dedupe_key',        NULLIF(p_payload->>'dedupe_key','')
  ));

  SELECT COALESCE(jsonb_agg(b->>'code'), '[]'::jsonb) INTO v_blocker_codes
    FROM jsonb_array_elements(COALESCE(v_canon->'blockers','[]'::jsonb)) AS b
   WHERE b ? 'code';

  SELECT b->>'fix_action' INTO v_required_action
    FROM jsonb_array_elements(COALESCE(v_canon->'blockers','[]'::jsonb)) AS b
   WHERE b ? 'fix_action' AND (b->>'fix_action') IS NOT NULL LIMIT 1;

  BEGIN
    v_policy := public.resolve_comm_hub_send_policy(v_module, v_event, v_channel, v_env);
  EXCEPTION WHEN OTHERS THEN v_policy := '{}'::jsonb;
  END;

  RETURN jsonb_build_object(
    'authorized',       COALESCE((v_canon->>'allowed')::boolean, false),
    'mode',             v_policy->>'send_policy',
    'blockers',         v_blocker_codes,
    'required_action',  v_required_action,
    'policy',           v_policy,
    'sender_verified',  COALESCE((v_policy->>'sender_verified')::boolean, false),
    'template_mapped',  COALESCE((v_policy->>'template_mapped')::boolean, false),
    'recipient_count',  v_recipient_count,
    'duplicate_count',  0,
    'duplicate_scope',  COALESCE(v_policy->>'duplicate_scope','entity'),
    'duplicate_match',  NULL,
    'canonical_decision_id',   v_canon->>'decision_id',
    'canonical_status',        v_canon->>'status',
    'configuration_version',   v_canon->'configuration_version',
    'recipient_policy_version', v_canon->'recipient_policy_version',
    'send_policy_version',     v_canon->'send_policy_version',
    'review_policy_version',   v_canon->'review_policy_version',
    'canonical_blockers',      v_canon->'blockers',
    'source',                  'evaluate_comm_hub_send_authorization(compat_wrapper_v2)',
    'delegates_to',            'evaluate_comm_hub_send_decision'
  );
END;
$function$;

COMMENT ON FUNCTION public.evaluate_comm_hub_send_authorization(jsonb) IS
  'CH-SIMPLE-P3B-R.1: compat wrapper. Delegates 100% of allow/deny to public.evaluate_comm_hub_send_decision.';


-- 2. evaluate_comm_hub_runtime_gate_status → compat wrapper
CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_runtime_gate_status(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_module    text := p_payload->>'module_code';
  v_event     text := p_payload->>'event_code';
  v_channel   text := COALESCE(p_payload->>'channel','email');
  v_send_mode text := COALESCE(p_payload->>'send_mode', p_payload->>'mode','dry_run');
  v_recipient text := LOWER(COALESCE(p_payload->>'recipient_email',''));
  v_rec_count int  := COALESCE((p_payload->>'recipient_count')::int,
                              CASE WHEN v_recipient <> '' THEN 1 ELSE 0 END);
  v_tpl_ver   text := NULLIF(p_payload->>'template_version_id','');
  v_preview_ok boolean := COALESCE((p_payload->>'preview_confirmed')::boolean, false);
  v_to_recipients jsonb;
  v_canon jsonb;
  v_send_ctx text;
BEGIN
  IF v_recipient <> '' THEN v_to_recipients := jsonb_build_array(v_recipient);
  ELSE v_to_recipients := COALESCE(p_payload->'to_recipients','[]'::jsonb); END IF;

  v_send_ctx := CASE v_send_mode
    WHEN 'live' THEN 'manual_live' WHEN 'manual_live' THEN 'manual_live'
    WHEN 'auto_live_internal' THEN 'auto_live_internal'
    WHEN 'cron' THEN 'cron' WHEN 'batch' THEN 'batch'
    WHEN 'controlled_live' THEN 'controlled_live' WHEN 'preview' THEN 'preview'
    ELSE 'dry_run' END;

  v_canon := public.evaluate_comm_hub_send_decision(jsonb_build_object(
    'module_code', v_module, 'event_code', v_event, 'channel', v_channel,
    'send_context', v_send_ctx, 'to_recipients', v_to_recipients,
    'preview_confirmed', v_preview_ok, 'template_version_id', v_tpl_ver));

  RETURN jsonb_build_object(
    'allowed',                     COALESCE((v_canon->>'allowed')::boolean, false),
    'source',                      'evaluate_comm_hub_runtime_gate_status(compat_wrapper_v2)',
    'delegates_to',                'evaluate_comm_hub_send_decision',
    'legacy_authorization_allowed', COALESCE((v_canon->>'allowed')::boolean, false),
    'send_mode', v_send_mode, 'module_code', v_module, 'event_code', v_event,
    'channel', v_channel, 'recipient_count', v_rec_count,
    'preview_confirmed', v_preview_ok, 'template_version_id', v_tpl_ver,
    'blockers',      COALESCE(v_canon->'blockers','[]'::jsonb),
    'warnings',      COALESCE(v_canon->'warnings','[]'::jsonb),
    'gate_results',  COALESCE(v_canon->'gate_results','[]'::jsonb),
    'needs_review',  '[]'::jsonb,
    'trace_context', COALESCE(v_canon->'trace_context', jsonb_build_object(
                       'current_stage','unknown','blocked_stage', NULL,'blocker_codes','[]'::jsonb)),
    'canonical_decision_id',      v_canon->>'decision_id',
    'configuration_version',      v_canon->'configuration_version',
    'recipient_policy_version',   v_canon->'recipient_policy_version',
    'evaluated_at',               v_canon->>'evaluated_at'
  );
END;
$function$;

COMMENT ON FUNCTION public.evaluate_comm_hub_runtime_gate_status(jsonb) IS
  'CH-SIMPLE-P3B-R.1: compat wrapper. Delegates 100% of allow/deny to public.evaluate_comm_hub_send_decision.';


-- 3. revalidate_comm_hub_send_decision
CREATE OR REPLACE FUNCTION public.revalidate_comm_hub_send_decision(
  p_prior_decision_id uuid, p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_prior public.communication_hub_send_decision_log%ROWTYPE;
  v_fresh jsonb;
  v_reasons text[] := ARRAY[]::text[];
  v_cur_cfg int; v_cur_rp int; v_cur_sp int; v_cur_rv int;
BEGIN
  IF p_prior_decision_id IS NULL THEN
    v_reasons := array_append(v_reasons, 'no_prior_decision');
  ELSE
    SELECT * INTO v_prior FROM public.communication_hub_send_decision_log
     WHERE decision_id = p_prior_decision_id LIMIT 1;
    IF NOT FOUND THEN
      v_reasons := array_append(v_reasons, 'prior_decision_not_found');
    ELSIF v_prior.expires_at IS NOT NULL AND v_prior.expires_at < now() THEN
      v_reasons := array_append(v_reasons, 'send_decision_expired');
    END IF;
  END IF;

  v_fresh := public.evaluate_comm_hub_send_decision(p_payload);

  IF v_prior.decision_id IS NOT NULL THEN
    v_cur_cfg := NULLIF(v_fresh->>'configuration_version','')::int;
    v_cur_rp  := NULLIF(v_fresh->>'recipient_policy_version','')::int;
    v_cur_sp  := NULLIF(v_fresh->>'send_policy_version','')::int;
    v_cur_rv  := NULLIF(v_fresh->>'review_policy_version','')::int;
    IF v_cur_cfg IS DISTINCT FROM v_prior.configuration_version THEN
      v_reasons := array_append(v_reasons, 'global_configuration_changed'); END IF;
    IF v_cur_rp IS DISTINCT FROM v_prior.recipient_policy_version THEN
      v_reasons := array_append(v_reasons, 'recipient_policy_changed'); END IF;
    IF v_cur_sp IS DISTINCT FROM v_prior.send_policy_version THEN
      v_reasons := array_append(v_reasons, 'send_policy_changed'); END IF;
    IF v_cur_rv IS DISTINCT FROM v_prior.review_policy_version THEN
      v_reasons := array_append(v_reasons, 'review_policy_changed'); END IF;
  END IF;

  RETURN jsonb_build_object(
    'source', 'revalidate_comm_hub_send_decision',
    'stale', (COALESCE(array_length(v_reasons,1),0) > 0),
    'staleness_reasons', to_jsonb(v_reasons),
    'fresh_decision', v_fresh,
    'fresh_decision_id', v_fresh->>'decision_id',
    'fresh_allowed', COALESCE((v_fresh->>'allowed')::boolean, false),
    'prior_decision_id', p_prior_decision_id,
    'prior_configuration_version',    v_prior.configuration_version,
    'prior_recipient_policy_version', v_prior.recipient_policy_version,
    'prior_send_policy_version',      v_prior.send_policy_version,
    'prior_review_policy_version',    v_prior.review_policy_version,
    'evaluated_at', now()
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.revalidate_comm_hub_send_decision(uuid, jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.revalidate_comm_hub_send_decision(uuid, jsonb) IS
  'CH-SIMPLE-P3B-R.1: dispatcher-side freshness check. Delegates to canonical evaluator; emits structured staleness_reasons.';


-- 4. Runtime harness (single-block, no nested subprograms)
CREATE OR REPLACE FUNCTION public.run_ch_p3b_r_runtime_tests()
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_results jsonb := '[]'::jsonb;
  v_passed int := 0;
  v_failed int := 0;
  v_orig_settings public.communication_hub_control_settings%ROWTYPE;
  v_orig_policy   public.communication_hub_recipient_policy%ROWTYPE;
  v_decision jsonb;
  v_authz    jsonb;
  v_rgs      jsonb;
  v_reval    jsonb;
  v_prior_id uuid;
  v_cond boolean;
  v_name text;

  -- Helper: record a boolean assertion (inline usage below)
BEGIN
  SELECT * INTO v_orig_settings FROM public.communication_hub_control_settings LIMIT 1;
  SELECT * INTO v_orig_policy   FROM public.communication_hub_recipient_policy LIMIT 1;

  BEGIN
    -- ---- Wrapper parity
    v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','dry_run','to_recipients', jsonb_build_array('a@example.com')));
    v_authz := public.evaluate_comm_hub_send_authorization(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','dry_run','recipients', jsonb_build_array('a@example.com')));
    v_rgs := public.evaluate_comm_hub_runtime_gate_status(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_mode','dry_run','recipient_email','a@example.com'));

    v_name := 'wrapper_authz_delegates_to_canonical';
    v_cond := (v_authz->>'delegates_to') = 'evaluate_comm_hub_send_decision';
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    v_name := 'wrapper_rgs_delegates_to_canonical';
    v_cond := (v_rgs->>'delegates_to') = 'evaluate_comm_hub_send_decision';
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    v_name := 'wrapper_authz_mirrors_canonical_allowed';
    v_cond := (v_authz->>'authorized')::boolean = (v_decision->>'allowed')::boolean;
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    v_name := 'wrapper_rgs_mirrors_canonical_allowed';
    v_cond := (v_rgs->>'allowed')::boolean = (v_decision->>'allowed')::boolean;
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    v_name := 'wrapper_authz_carries_canonical_decision_id';
    v_cond := (v_authz->>'canonical_decision_id') IS NOT NULL;
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    v_name := 'wrapper_rgs_carries_canonical_decision_id';
    v_cond := (v_rgs->>'canonical_decision_id') IS NOT NULL;
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    -- ---- Envelope completeness
    FOR v_name IN SELECT unnest(ARRAY[
      'decision_id','expires_at','trace_context','configuration_version',
      'recipient_policy_version','send_policy_version','review_policy_version'])
    LOOP
      v_cond := (v_decision ? v_name);
      v_results := v_results || jsonb_build_object('name','envelope_has_'||v_name,'ok',v_cond);
      IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;
    END LOOP;

    v_name := 'envelope_source_is_canonical';
    v_cond := (v_decision->>'source') = 'evaluate_comm_hub_send_decision';
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    -- ---- Emergency Stop
    UPDATE public.communication_hub_control_settings
       SET operating_mode = 'EMERGENCY_STOP', updated_at = now()
     WHERE singleton_guard = 1;

    v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','manual_live',
      'to_recipients', jsonb_build_array(
        COALESCE(v_orig_policy.single_configured_address,'noone@example.com'))));

    v_name := 'emergency_stop_blocks_live';
    v_cond := (v_decision->>'allowed')::boolean = false;
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond,
      'status', v_decision->>'status');
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    v_name := 'emergency_stop_emits_blocker';
    v_cond := EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(v_decision->'blockers','[]'::jsonb)) b
                       WHERE b->>'code' = 'emergency_stop_active');
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    v_authz := public.evaluate_comm_hub_send_authorization(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','manual_live',
      'recipients', jsonb_build_array(
        COALESCE(v_orig_policy.single_configured_address,'noone@example.com'))));

    v_name := 'emergency_stop_reaches_legacy_authz_wrapper';
    v_cond := (v_authz->>'authorized')::boolean = false;
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    UPDATE public.communication_hub_control_settings
       SET operating_mode = v_orig_settings.operating_mode, updated_at = now()
     WHERE singleton_guard = 1;

    -- ---- Cron/batch always blocked
    v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','cron','to_recipients', jsonb_build_array('anyone@example.com')));
    v_name := 'cron_context_blocked_by_canonical';
    v_cond := (v_decision->>'allowed')::boolean = false;
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','batch','to_recipients', jsonb_build_array('anyone@example.com')));
    v_name := 'batch_context_blocked_by_canonical';
    v_cond := (v_decision->>'allowed')::boolean = false;
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    -- ---- Strictest limit wins (P3-A GAP-01 fix)
    v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','dry_run',
      'to_recipients', jsonb_build_array('a@example.com','b@example.com','c@example.com'),
      'max_total_recipients', 1));
    v_name := 'strictest_payload_total_limit_wins';
    v_cond := EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(v_decision->'blockers','[]'::jsonb)) b
                       WHERE b->>'code' = 'recipient_total_over_strictest_limit');
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    -- ---- Revalidation & staleness on recipient-policy change
    v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','dry_run',
      'to_recipients', jsonb_build_array('recipient-A@example.com')));
    v_prior_id := (v_decision->>'decision_id')::uuid;

    v_name := 'prior_decision_persisted';
    v_cond := EXISTS (SELECT 1 FROM public.communication_hub_send_decision_log WHERE decision_id = v_prior_id);
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    UPDATE public.communication_hub_recipient_policy
       SET policy_version = COALESCE(policy_version,0) + 1, updated_at = now()
     WHERE singleton_guard = 1;

    v_reval := public.revalidate_comm_hub_send_decision(v_prior_id, jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','dry_run',
      'to_recipients', jsonb_build_array('recipient-A@example.com')));

    v_name := 'revalidate_returns_fresh_decision';
    v_cond := (v_reval->>'fresh_decision_id') IS NOT NULL;
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    v_name := 'revalidate_detects_recipient_policy_change';
    v_cond := EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_reval->'staleness_reasons','[]'::jsonb)) r
       WHERE r.value = 'recipient_policy_changed');
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond,
      'staleness_reasons', v_reval->'staleness_reasons');
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    v_name := 'revalidate_marks_stale';
    v_cond := (v_reval->>'stale')::boolean = true;
    v_results := v_results || jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed := v_passed+1; ELSE v_failed := v_failed+1; END IF;

    RAISE EXCEPTION 'ch_p3b_r_rollback_marker';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%ch_p3b_r_rollback_marker%' THEN RAISE; END IF;
  END;

  RETURN jsonb_build_object(
    'total',   v_passed + v_failed,
    'passed',  v_passed,
    'failed',  v_failed,
    'ok',      (v_failed = 0),
    'results', v_results,
    'run_at',  now()
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.run_ch_p3b_r_runtime_tests() TO authenticated, service_role;
COMMENT ON FUNCTION public.run_ch_p3b_r_runtime_tests() IS
  'CH-SIMPLE-P3B-R.1 runtime harness. Self-rolling-back. Verifies wrapper parity, envelope, Emergency Stop, cron/batch, strictest-limit-wins, revalidation.';
