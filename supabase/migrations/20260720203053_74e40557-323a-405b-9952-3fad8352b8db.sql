
CREATE OR REPLACE FUNCTION public.run_ch_p3b_r_runtime_tests()
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_results jsonb := '[]'::jsonb;
  v_passed int := 0;
  v_failed int := 0;
  v_orig_settings public.communication_hub_control_settings%ROWTYPE;
  v_orig_policy   public.communication_hub_recipient_policy%ROWTYPE;
  v_decision jsonb; v_authz jsonb; v_rgs jsonb; v_reval jsonb;
  v_prior_id uuid; v_cond boolean; v_name text;
BEGIN
  SELECT * INTO v_orig_settings FROM public.communication_hub_control_settings LIMIT 1;
  SELECT * INTO v_orig_policy   FROM public.communication_hub_recipient_policy LIMIT 1;

  BEGIN
    v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','dry_run','to_recipients', jsonb_build_array('a@example.com')));
    v_authz := public.evaluate_comm_hub_send_authorization(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','dry_run','recipients', jsonb_build_array('a@example.com')));
    v_rgs := public.evaluate_comm_hub_runtime_gate_status(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_mode','dry_run','recipient_email','a@example.com'));

    v_name:='wrapper_authz_delegates_to_canonical';
    v_cond:=(v_authz->>'delegates_to')='evaluate_comm_hub_send_decision';
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    v_name:='wrapper_rgs_delegates_to_canonical';
    v_cond:=(v_rgs->>'delegates_to')='evaluate_comm_hub_send_decision';
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    v_name:='wrapper_authz_mirrors_canonical_allowed';
    v_cond:=(v_authz->>'authorized')::boolean=(v_decision->>'allowed')::boolean;
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    v_name:='wrapper_rgs_mirrors_canonical_allowed';
    v_cond:=(v_rgs->>'allowed')::boolean=(v_decision->>'allowed')::boolean;
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    v_name:='wrapper_authz_carries_canonical_decision_id';
    v_cond:=(v_authz->>'canonical_decision_id') IS NOT NULL;
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    v_name:='wrapper_rgs_carries_canonical_decision_id';
    v_cond:=(v_rgs->>'canonical_decision_id') IS NOT NULL;
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    FOR v_name IN SELECT unnest(ARRAY[
      'decision_id','expires_at','trace_context','configuration_version',
      'recipient_policy_version','send_policy_version','review_policy_version']) LOOP
      v_cond:=(v_decision ? v_name);
      v_results:=v_results||jsonb_build_object('name','envelope_has_'||v_name,'ok',v_cond);
      IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;
    END LOOP;

    v_name:='envelope_source_is_canonical';
    v_cond:=(v_decision->>'source')='evaluate_comm_hub_send_decision';
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    UPDATE public.communication_hub_control_settings
       SET operating_mode='EMERGENCY_STOP', updated_at=now()
     WHERE singleton_guard='primary';

    v_decision:=public.evaluate_comm_hub_send_decision(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','manual_live',
      'to_recipients',jsonb_build_array(
        COALESCE(v_orig_policy.single_configured_address,'noone@example.com'))));
    v_name:='emergency_stop_blocks_live';
    v_cond:=(v_decision->>'allowed')::boolean=false;
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond,'status',v_decision->>'status');
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    v_name:='emergency_stop_emits_blocker';
    v_cond:=EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(v_decision->'blockers','[]'::jsonb)) b
                    WHERE b->>'code'='emergency_stop_active');
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    v_authz:=public.evaluate_comm_hub_send_authorization(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','manual_live',
      'recipients',jsonb_build_array(
        COALESCE(v_orig_policy.single_configured_address,'noone@example.com'))));
    v_name:='emergency_stop_reaches_legacy_authz_wrapper';
    v_cond:=(v_authz->>'authorized')::boolean=false;
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    UPDATE public.communication_hub_control_settings
       SET operating_mode=v_orig_settings.operating_mode, updated_at=now()
     WHERE singleton_guard='primary';

    v_decision:=public.evaluate_comm_hub_send_decision(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','cron','to_recipients',jsonb_build_array('anyone@example.com')));
    v_name:='cron_context_blocked_by_canonical';
    v_cond:=(v_decision->>'allowed')::boolean=false;
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    v_decision:=public.evaluate_comm_hub_send_decision(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','batch','to_recipients',jsonb_build_array('anyone@example.com')));
    v_name:='batch_context_blocked_by_canonical';
    v_cond:=(v_decision->>'allowed')::boolean=false;
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    v_decision:=public.evaluate_comm_hub_send_decision(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','dry_run',
      'to_recipients',jsonb_build_array('a@example.com','b@example.com','c@example.com'),
      'max_total_recipients',1));
    v_name:='strictest_payload_total_limit_wins';
    v_cond:=EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(v_decision->'blockers','[]'::jsonb)) b
                    WHERE b->>'code'='recipient_total_over_strictest_limit');
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    v_decision:=public.evaluate_comm_hub_send_decision(jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','dry_run',
      'to_recipients',jsonb_build_array('recipient-A@example.com')));
    v_prior_id:=(v_decision->>'decision_id')::uuid;

    v_name:='prior_decision_persisted';
    v_cond:=EXISTS(SELECT 1 FROM public.communication_hub_send_decision_log WHERE decision_id=v_prior_id);
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    UPDATE public.communication_hub_recipient_policy
       SET policy_version=COALESCE(policy_version,0)+1, updated_at=now()
     WHERE singleton_guard='primary';

    v_reval:=public.revalidate_comm_hub_send_decision(v_prior_id, jsonb_build_object(
      'module_code','bn','event_code','TEST','channel','email',
      'send_context','dry_run',
      'to_recipients',jsonb_build_array('recipient-A@example.com')));

    v_name:='revalidate_returns_fresh_decision';
    v_cond:=(v_reval->>'fresh_decision_id') IS NOT NULL;
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    v_name:='revalidate_detects_recipient_policy_change';
    v_cond:=EXISTS(SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_reval->'staleness_reasons','[]'::jsonb)) r
                    WHERE r.value='recipient_policy_changed');
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond,'staleness_reasons',v_reval->'staleness_reasons');
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    v_name:='revalidate_marks_stale';
    v_cond:=(v_reval->>'stale')::boolean=true;
    v_results:=v_results||jsonb_build_object('name',v_name,'ok',v_cond);
    IF v_cond THEN v_passed:=v_passed+1; ELSE v_failed:=v_failed+1; END IF;

    RAISE EXCEPTION 'ch_p3b_r_rollback_marker';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%ch_p3b_r_rollback_marker%' THEN RAISE; END IF;
  END;

  RETURN jsonb_build_object(
    'total',v_passed+v_failed,'passed',v_passed,'failed',v_failed,
    'ok',(v_failed=0),'results',v_results,'run_at',now());
END;
$function$;
