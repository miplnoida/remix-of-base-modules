CREATE OR REPLACE FUNCTION public._comm_hub_assert_bound_service_operation(
  p_service text,
  p_operation text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_allow boolean := false;
BEGIN
  v_role := COALESCE(current_setting('request.jwt.claim.role', true), '');
  IF v_role <> 'service_role' AND session_user <> 'postgres' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'stage', 'service_identity',
      'blockers', jsonb_build_array(jsonb_build_object(
        'code','SERVICE_ROLE_REQUIRED','stage','service_identity',
        'service', p_service,'operation', p_operation,
        'message','This operation may only be invoked by the platform service role.')));
  END IF;

  SELECT true INTO v_allow
    FROM public.comm_hub_service_operation_allowlist
    WHERE service_account = p_service
      AND operation = p_operation
      AND COALESCE(active, true) = true
    LIMIT 1;
  IF NOT COALESCE(v_allow,false) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'stage','service_identity',
      'blockers', jsonb_build_array(jsonb_build_object(
        'code','SERVICE_OPERATION_UNKNOWN','stage','service_identity',
        'service', p_service,'operation', p_operation,
        'message', format('Service operation %L on %L is not on the platform allowlist.', p_operation, p_service))));
  END IF;

  RETURN jsonb_build_object('allowed', true, 'service', p_service, 'operation', p_operation);
END;
$$;

REVOKE ALL ON FUNCTION public._comm_hub_assert_bound_service_operation(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._comm_hub_assert_bound_service_operation(text,text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public._comm_hub_assert_bound_service_operation(text,text) TO service_role;

INSERT INTO public.comm_hub_service_operation_allowlist(service_account, operation, reason, active)
VALUES
  ('comm-hub-dry-run','PROCESS_DRY_RUN','Dry Run processor step (Phase 4B3 service identity repair)', true),
  ('comm-hub-dry-run','CERTIFY_DRY_RUN','Dry Run certifier step (Phase 4B3 service identity repair)', true)
ON CONFLICT (service_account, operation) DO UPDATE
  SET active = true, reason = EXCLUDED.reason;

CREATE OR REPLACE FUNCTION public.process_comm_hub_dry_run_execution(
  p_execution_id uuid,
  p_correlation_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_svc jsonb;
  v_exec public.communication_dry_run_execution%ROWTYPE;
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_appr public.communication_preview_approval%ROWTYPE;
  v_tr jsonb; v_ev jsonb; v_bind jsonb;
  v_updated int;
BEGIN
  v_svc := public._comm_hub_assert_bound_service_operation('comm-hub-dry-run','PROCESS_DRY_RUN');
  IF NOT COALESCE((v_svc->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','service_identity',
      'failure_stage','SERVICE_IDENTITY',
      'blockers', COALESCE(v_svc->'blockers','[]'::jsonb));
  END IF;
  IF p_execution_id IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','input',
      'blockers', jsonb_build_array(jsonb_build_object('code','execution_id_required')));
  END IF;

  SELECT * INTO v_exec FROM public.communication_dry_run_execution WHERE id=p_execution_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','execution',
      'blockers', jsonb_build_array(jsonb_build_object('code','execution_not_found')));
  END IF;

  IF v_exec.state IN ('PROCESSED','CERTIFIED') THEN
    RETURN jsonb_build_object('status','PROCESSED','dry_run_execution_id',v_exec.id,
      'state','PROCESSED','idempotent_replay',true,
      'request_id',v_exec.request_id,'message_id',v_exec.message_id,'trace_id',v_exec.trace_id,
      'provider_call_attempted',false);
  END IF;

  SELECT * INTO v_snap FROM public.communication_preview_snapshot WHERE id=v_exec.preview_snapshot_id;
  SELECT * INTO v_appr FROM public.communication_preview_approval WHERE id=v_exec.preview_approval_id;

  v_tr := public.check_comm_hub_runtime_transition_safe('PROCESS_DRY_RUN',
    jsonb_build_object(
      'module_code', v_exec.module_code, 'event_code', v_exec.event_code, 'channel', v_exec.channel,
      'preview_snapshot_id', v_exec.preview_snapshot_id, 'preview_approval_id', v_exec.preview_approval_id,
      'correlation_id', COALESCE(p_correlation_id, v_snap.correlation_id),
      'service_operation','PROCESS_DRY_RUN', 'execution_id', v_exec.id,
      'invoked_from','process_comm_hub_dry_run_execution'));
  IF NOT COALESCE((v_tr->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','runtime_transition',
      'blockers', COALESCE(v_tr->'blockers','[]'::jsonb),
      'transition_log_id', v_tr->>'transition_log_id',
      'request_id',v_exec.request_id,'message_id',v_exec.message_id,'trace_id',v_exec.trace_id);
  END IF;

  v_bind := public.check_comm_hub_preview_approval_binding(
    v_exec.preview_approval_id, v_exec.preview_snapshot_id,
    COALESCE(p_correlation_id, v_snap.correlation_id),
    v_appr.content_hash_at_approval, v_appr.recipient_set_hash_at_approval,
    v_appr.configuration_hash_at_approval);
  IF NOT COALESCE((v_bind->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','approval_binding',
      'blockers', COALESCE(v_bind->'blockers','[]'::jsonb),
      'request_id',v_exec.request_id,'message_id',v_exec.message_id,'trace_id',v_exec.trace_id);
  END IF;

  v_ev := public.check_comm_hub_preview_runtime_evidence(
    v_exec.preview_snapshot_id, v_exec.module_code, v_exec.event_code, v_exec.channel,
    COALESCE(p_correlation_id, v_snap.correlation_id),
    v_appr.content_hash_at_approval, v_appr.recipient_set_hash_at_approval,
    v_appr.template_version_id_at_approval, v_appr.configuration_hash_at_approval,
    'START_DRY_RUN');
  IF NOT COALESCE((v_ev->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','preview_evidence',
      'blockers', COALESCE(v_ev->'blockers','[]'::jsonb),
      'request_id',v_exec.request_id,'message_id',v_exec.message_id,'trace_id',v_exec.trace_id);
  END IF;

  UPDATE public.communication_dry_run_execution
    SET state='DISPATCHING', updated_at=now()
    WHERE id=v_exec.id AND state IN ('STARTED','REQUEST_CREATED');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','claim',
      'blockers', jsonb_build_array(jsonb_build_object(
        'code','DUPLICATE_OR_INVALID_CLAIM','current_state',v_exec.state)),
      'request_id',v_exec.request_id,'message_id',v_exec.message_id,'trace_id',v_exec.trace_id);
  END IF;

  UPDATE public.communication_dry_run_execution
    SET state='PROCESSED', updated_at=now(), completed_at=now()
    WHERE id=v_exec.id;

  RETURN jsonb_build_object('status','PROCESSED', 'dry_run_execution_id', v_exec.id,
    'state','PROCESSED', 'provider_call_attempted', false,
    'request_id',v_exec.request_id,'message_id',v_exec.message_id,'trace_id',v_exec.trace_id,
    'evidence', jsonb_build_object(
      'transition_log_id', v_tr->>'transition_log_id',
      'approval_evidence_hash', v_appr.canonical_approval_evidence_hash));
END; $$;

CREATE OR REPLACE FUNCTION public.certify_comm_hub_dry_run(p_execution_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_svc jsonb;
  v_exec public.communication_dry_run_execution%ROWTYPE;
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_appr public.communication_preview_approval%ROWTYPE;
  v_msg public.communication_message%ROWTYPE;
  v_tr jsonb; v_bind jsonb;
  v_cert_id uuid; v_existing_cert uuid; v_cert_no text;
  v_provider_count int;
BEGIN
  v_svc := public._comm_hub_assert_bound_service_operation('comm-hub-dry-run','CERTIFY_DRY_RUN');
  IF NOT COALESCE((v_svc->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','service_identity',
      'failure_stage','SERVICE_IDENTITY',
      'blockers', COALESCE(v_svc->'blockers','[]'::jsonb));
  END IF;

  IF p_execution_id IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED',
      'blockers', jsonb_build_array(jsonb_build_object('code','execution_id_required'))); END IF;

  SELECT * INTO v_exec FROM public.communication_dry_run_execution WHERE id=p_execution_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','BLOCKED',
      'blockers', jsonb_build_array(jsonb_build_object('code','execution_not_found'))); END IF;

  SELECT id INTO v_existing_cert
    FROM public.communication_dry_run_certification
    WHERE preview_snapshot_id=v_exec.preview_snapshot_id
      AND preview_approval_id=v_exec.preview_approval_id
      AND status='ACTIVE' LIMIT 1;
  IF v_existing_cert IS NOT NULL THEN
    RETURN jsonb_build_object('status','IDEMPOTENT','certification_id',v_existing_cert,
      'dry_run_execution_id', v_exec.id, 'note','existing ACTIVE certification returned');
  END IF;

  SELECT * INTO v_snap FROM public.communication_preview_snapshot WHERE id=v_exec.preview_snapshot_id;
  SELECT * INTO v_appr FROM public.communication_preview_approval WHERE id=v_exec.preview_approval_id;

  v_tr := public.check_comm_hub_runtime_transition_safe('CERTIFY_DRY_RUN',
    jsonb_build_object('module_code', v_exec.module_code, 'event_code', v_exec.event_code,
      'channel', v_exec.channel, 'preview_snapshot_id', v_exec.preview_snapshot_id,
      'preview_approval_id', v_exec.preview_approval_id,
      'correlation_id', v_snap.correlation_id,
      'execution_id', v_exec.id, 'invoked_from','certify_comm_hub_dry_run'));
  IF NOT COALESCE((v_tr->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','runtime_transition',
      'blockers', COALESCE(v_tr->'blockers','[]'::jsonb),
      'transition_log_id', v_tr->>'transition_log_id');
  END IF;

  IF v_exec.state <> 'PROCESSED' THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','execution_state',
      'blockers', jsonb_build_array(jsonb_build_object('code','EXECUTION_NOT_PROCESSED','current_state',v_exec.state)));
  END IF;

  v_bind := public.check_comm_hub_preview_approval_binding(
    v_exec.preview_approval_id, v_exec.preview_snapshot_id, v_snap.correlation_id,
    v_appr.content_hash_at_approval, v_appr.recipient_set_hash_at_approval,
    v_appr.configuration_hash_at_approval);
  IF NOT COALESCE((v_bind->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','approval_binding',
      'blockers', COALESCE(v_bind->'blockers','[]'::jsonb));
  END IF;

  IF v_exec.request_id IS NULL OR v_exec.message_id IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','linkage',
      'blockers', jsonb_build_array(jsonb_build_object('code','EXECUTION_LINKAGE_INCOMPLETE')));
  END IF;

  SELECT * INTO v_msg FROM public.communication_message WHERE id=v_exec.message_id;
  IF NOT FOUND OR v_msg.request_id <> v_exec.request_id OR COALESCE(v_msg.send_context,'') <> 'dry_run' THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','message_linkage',
      'blockers', jsonb_build_array(jsonb_build_object('code','MESSAGE_LINKAGE_INVALID')));
  END IF;

  SELECT COUNT(*) INTO v_provider_count
    FROM public.communication_delivery_attempt
    WHERE communication_message_id = v_exec.message_id;
  IF v_provider_count > 0 THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','provider_call_absence',
      'blockers', jsonb_build_array(jsonb_build_object('code','PROVIDER_CALL_DETECTED','count',v_provider_count)));
  END IF;

  v_cert_no := 'DRC-' || to_char(now() at time zone 'utc','YYYYMMDDHH24MISS')
               || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);
  INSERT INTO public.communication_dry_run_certification(
    certification_no, module_code, event_code, channel,
    preview_snapshot_id, preview_approval_id,
    communication_request_id, communication_message_id, trace_id,
    recipient_set_hash, template_id, template_version_id, sender_profile_id,
    content_hash, configuration_version, recipient_policy_version,
    send_policy_version, review_policy_version,
    original_decision_id, result, status, provider_call_attempted)
  VALUES (
    v_cert_no, v_exec.module_code, v_exec.event_code, v_exec.channel,
    v_exec.preview_snapshot_id, v_exec.preview_approval_id,
    v_exec.request_id, v_exec.message_id, v_exec.trace_id,
    v_exec.recipient_set_hash, v_snap.template_id, v_snap.template_version_id, v_snap.sender_profile_id,
    v_appr.content_hash_at_approval, v_snap.configuration_version, v_snap.recipient_policy_version,
    NULL, NULL, v_exec.original_decision_id, 'DRY_RUN_PASSED','ACTIVE', false)
  RETURNING id INTO v_cert_id;

  UPDATE public.communication_dry_run_execution
    SET state='CERTIFIED', certification_id=v_cert_id, updated_at=now()
    WHERE id=v_exec.id;

  RETURN jsonb_build_object('status','CERTIFIED','certification_id',v_cert_id,
    'certification_no',v_cert_no,'dry_run_execution_id',v_exec.id,
    'evidence',jsonb_build_object(
      'canonical_approval_evidence_hash', v_appr.canonical_approval_evidence_hash,
      'transition_log_id', v_tr->>'transition_log_id'));
EXCEPTION WHEN unique_violation THEN
  SELECT id INTO v_existing_cert FROM public.communication_dry_run_certification
    WHERE preview_snapshot_id=v_exec.preview_snapshot_id
      AND preview_approval_id=v_exec.preview_approval_id AND status='ACTIVE' LIMIT 1;
  RETURN jsonb_build_object('status','IDEMPOTENT','certification_id',v_existing_cert,
    'dry_run_execution_id', v_exec.id);
END; $$;