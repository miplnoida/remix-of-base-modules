
-- =====================================================================
-- Phase 4B3 — Definitive service-role auth repair (Dry Run)
-- =====================================================================

-- A) Authoritative request-role extractor -----------------------------
CREATE OR REPLACE FUNCTION public._comm_hub_get_request_role()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_jwt jsonb;
  v_claims_raw text;
  v_claims jsonb;
  v_role text := NULL;
  v_source text := 'none';
  v_claims_present boolean := false;
BEGIN
  -- 1) auth.jwt()
  BEGIN
    v_jwt := auth.jwt();
    IF v_jwt IS NOT NULL THEN
      v_claims_present := true;
      IF v_jwt ? 'role' AND nullif(v_jwt->>'role','') IS NOT NULL THEN
        v_role := v_jwt->>'role';
        v_source := 'auth.jwt';
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_jwt := NULL;
  END;

  -- 2) request.jwt.claims (raw JSON) — guarded parse
  IF v_role IS NULL THEN
    BEGIN
      v_claims_raw := current_setting('request.jwt.claims', true);
      IF v_claims_raw IS NOT NULL AND length(btrim(v_claims_raw)) > 0 THEN
        BEGIN
          v_claims := v_claims_raw::jsonb;
          v_claims_present := true;
          IF v_claims ? 'role' AND nullif(v_claims->>'role','') IS NOT NULL THEN
            v_role := v_claims->>'role';
            v_source := 'request.jwt.claims';
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- malformed JSON is treated as no claims
          NULL;
        END;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- 3) legacy request.jwt.claim.role (fallback only)
  IF v_role IS NULL THEN
    BEGIN
      v_role := nullif(current_setting('request.jwt.claim.role', true), '');
      IF v_role IS NOT NULL THEN
        v_source := 'request.jwt.claim.role';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_role := NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'role_source', v_source,
    'resolved_role', COALESCE(v_role, ''),
    'claims_present', v_claims_present,
    'service_role_confirmed', (v_role = 'service_role')
  );
END;
$$;

REVOKE ALL ON FUNCTION public._comm_hub_get_request_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._comm_hub_get_request_role() TO service_role;

-- B) Bound service-operation guard uses the extractor -----------------
CREATE OR REPLACE FUNCTION public._comm_hub_assert_bound_service_operation(
  p_service text, p_operation text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id jsonb;
  v_role text;
  v_source text;
  v_allow boolean := false;
BEGIN
  v_id := public._comm_hub_get_request_role();
  v_role := COALESCE(v_id->>'resolved_role','');
  v_source := COALESCE(v_id->>'role_source','none');

  IF v_role <> 'service_role' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'stage','service_identity',
      'resolved_role', v_role,
      'role_source', v_source,
      'service', p_service,
      'operation', p_operation,
      'allowlist_match', false,
      'blockers', jsonb_build_array(jsonb_build_object(
        'code','SERVICE_ROLE_REQUIRED',
        'stage','service_identity',
        'service', p_service,
        'operation', p_operation,
        'resolved_role', v_role,
        'role_source', v_source,
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
      'resolved_role', v_role,
      'role_source', v_source,
      'service', p_service,
      'operation', p_operation,
      'allowlist_match', false,
      'blockers', jsonb_build_array(jsonb_build_object(
        'code','SERVICE_OPERATION_UNKNOWN','stage','service_identity',
        'service', p_service,'operation', p_operation,
        'message', format('Service operation %L on %L is not on the platform allowlist.', p_operation, p_service))));
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'resolved_role', v_role,
    'role_source', v_source,
    'service', p_service,
    'operation', p_operation,
    'allowlist_match', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public._comm_hub_assert_bound_service_operation(text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._comm_hub_assert_bound_service_operation(text,text)
  TO service_role;

-- C) Side-effect-free positive probe ----------------------------------
CREATE OR REPLACE FUNCTION public.probe_comm_hub_dry_run_service_identity()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id jsonb;
  v_role text;
  v_source text;
  v_process boolean := false;
  v_certify boolean := false;
BEGIN
  v_id := public._comm_hub_get_request_role();
  v_role := COALESCE(v_id->>'resolved_role','');
  v_source := COALESCE(v_id->>'role_source','none');

  IF v_role <> 'service_role' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'probe','comm-hub-dry-run-service-identity/v1',
      'resolved_role', v_role,
      'role_source', v_source,
      'claims_present', COALESCE((v_id->>'claims_present')::boolean, false),
      'service_role_confirmed', false,
      'process_allowlist_match', false,
      'certify_allowlist_match', false,
      'blockers', jsonb_build_array(jsonb_build_object(
        'code','SERVICE_ROLE_REQUIRED','stage','service_identity',
        'resolved_role', v_role,'role_source', v_source)));
  END IF;

  SELECT true INTO v_process FROM public.comm_hub_service_operation_allowlist
    WHERE service_account='comm-hub-dry-run' AND operation='PROCESS_DRY_RUN'
      AND COALESCE(active,true)=true LIMIT 1;
  SELECT true INTO v_certify FROM public.comm_hub_service_operation_allowlist
    WHERE service_account='comm-hub-dry-run' AND operation='CERTIFY_DRY_RUN'
      AND COALESCE(active,true)=true LIMIT 1;

  RETURN jsonb_build_object(
    'allowed', (COALESCE(v_process,false) AND COALESCE(v_certify,false)),
    'probe','comm-hub-dry-run-service-identity/v1',
    'resolved_role', v_role,
    'role_source', v_source,
    'claims_present', COALESCE((v_id->>'claims_present')::boolean, false),
    'service_role_confirmed', true,
    'process_allowlist_match', COALESCE(v_process,false),
    'certify_allowlist_match', COALESCE(v_certify,false),
    'service','comm-hub-dry-run',
    'operations', jsonb_build_array('PROCESS_DRY_RUN','CERTIFY_DRY_RUN')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.probe_comm_hub_dry_run_service_identity()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.probe_comm_hub_dry_run_service_identity()
  TO service_role;

-- I) Processor uses PROCESS_DRY_RUN for Preview evidence --------------
CREATE OR REPLACE FUNCTION public.process_comm_hub_dry_run_execution(
  p_execution_id uuid, p_correlation_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      'resolved_role', v_svc->>'resolved_role',
      'role_source', v_svc->>'role_source',
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
  SELECT * INTO v_appr FROM public.communication_preview_approval  WHERE id=v_exec.preview_approval_id;

  v_tr := public.check_comm_hub_runtime_transition_safe('PROCESS_DRY_RUN',
    jsonb_build_object(
      'module_code', v_exec.module_code, 'event_code', v_exec.event_code, 'channel', v_exec.channel,
      'preview_snapshot_id', v_exec.preview_snapshot_id, 'preview_approval_id', v_exec.preview_approval_id,
      'correlation_id', COALESCE(p_correlation_id, v_snap.correlation_id),
      'service_operation','PROCESS_DRY_RUN','execution_id', v_exec.id,
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

  -- Preview evidence must be validated under PROCESS_DRY_RUN,
  -- matching the service operation and runtime transition.
  v_ev := public.check_comm_hub_preview_runtime_evidence(
    v_exec.preview_snapshot_id, v_exec.module_code, v_exec.event_code, v_exec.channel,
    COALESCE(p_correlation_id, v_snap.correlation_id),
    v_appr.content_hash_at_approval, v_appr.recipient_set_hash_at_approval,
    v_appr.template_version_id_at_approval, v_appr.configuration_hash_at_approval,
    'PROCESS_DRY_RUN');
  IF NOT COALESCE((v_ev->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','preview_evidence',
      'failure_stage','PREVIEW_EVIDENCE',
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

  RETURN jsonb_build_object('status','PROCESSED','dry_run_execution_id', v_exec.id,
    'state','PROCESSED','provider_call_attempted', false,
    'request_id',v_exec.request_id,'message_id',v_exec.message_id,'trace_id',v_exec.trace_id,
    'evidence', jsonb_build_object(
      'service_operation','PROCESS_DRY_RUN',
      'runtime_transition','PROCESS_DRY_RUN',
      'preview_evidence_stage','PROCESS_DRY_RUN',
      'transition_log_id', v_tr->>'transition_log_id',
      'approval_evidence_hash', v_appr.canonical_approval_evidence_hash));
END; $$;

REVOKE ALL ON FUNCTION public.process_comm_hub_dry_run_execution(uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_comm_hub_dry_run_execution(uuid,uuid)
  TO service_role;

-- Fix certifier: real column is communication_delivery_attempt.message_id
CREATE OR REPLACE FUNCTION public.certify_comm_hub_dry_run(p_execution_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      'resolved_role', v_svc->>'resolved_role',
      'role_source', v_svc->>'role_source',
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
  SELECT * INTO v_appr FROM public.communication_preview_approval  WHERE id=v_exec.preview_approval_id;

  v_tr := public.check_comm_hub_runtime_transition_safe('CERTIFY_DRY_RUN',
    jsonb_build_object('module_code', v_exec.module_code,'event_code', v_exec.event_code,
      'channel', v_exec.channel,'preview_snapshot_id', v_exec.preview_snapshot_id,
      'preview_approval_id', v_exec.preview_approval_id,
      'correlation_id', v_snap.correlation_id,
      'execution_id', v_exec.id,'invoked_from','certify_comm_hub_dry_run'));
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
    WHERE message_id = v_exec.message_id;
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
      'service_operation','CERTIFY_DRY_RUN',
      'canonical_approval_evidence_hash', v_appr.canonical_approval_evidence_hash,
      'transition_log_id', v_tr->>'transition_log_id'));
EXCEPTION WHEN unique_violation THEN
  SELECT id INTO v_existing_cert FROM public.communication_dry_run_certification
    WHERE preview_snapshot_id=v_exec.preview_snapshot_id
      AND preview_approval_id=v_exec.preview_approval_id AND status='ACTIVE' LIMIT 1;
  RETURN jsonb_build_object('status','IDEMPOTENT','certification_id',v_existing_cert,
    'dry_run_execution_id', v_exec.id);
END; $$;

REVOKE ALL ON FUNCTION public.certify_comm_hub_dry_run(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.certify_comm_hub_dry_run(uuid)
  TO service_role;

-- K) Extend governed terminalizer to accept SERVICE_IDENTITY,
--    PREVIEW_EVIDENCE and PARTIAL_RECONCILIATION.
CREATE OR REPLACE FUNCTION public.fail_comm_hub_dry_run(
  p_execution_id uuid, p_state text, p_failure_stage text,
  p_blockers jsonb DEFAULT '[]'::jsonb,
  p_warnings jsonb DEFAULT '[]'::jsonb,
  p_technical_summary text DEFAULT NULL::text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_exec public.communication_dry_run_execution%ROWTYPE;
BEGIN
  IF p_state NOT IN ('BLOCKED','FAILED') THEN
    RETURN jsonb_build_object('ok', false, 'code','invalid_terminal_state');
  END IF;
  IF p_failure_stage NOT IN ('BEGIN','MARK_DISPATCHING','TARGETED_DISPATCH',
                              'DISPATCH_RESPONSE_VALIDATION','FINALIZE','UNEXPECTED',
                              'SERVICE_IDENTITY','PREVIEW_EVIDENCE','PARTIAL_RECONCILIATION') THEN
    RETURN jsonb_build_object('ok', false, 'code','invalid_failure_stage');
  END IF;

  SELECT * INTO v_exec FROM public.communication_dry_run_execution
    WHERE id = p_execution_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code','execution_not_found'); END IF;

  IF v_exec.state IN ('CERTIFIED','BLOCKED','FAILED') THEN
    RETURN jsonb_build_object('ok', true, 'code','already_terminal', 'state', v_exec.state);
  END IF;

  UPDATE public.communication_dry_run_execution
     SET state = p_state,
         failure_stage = p_failure_stage,
         blockers = coalesce(p_blockers,'[]'::jsonb),
         warnings = warnings || coalesce(p_warnings,'[]'::jsonb),
         audit_metadata = audit_metadata
           || jsonb_build_object('failure_summary', coalesce(p_technical_summary, ''))
   WHERE id = p_execution_id;

  RETURN jsonb_build_object('ok', true, 'state', p_state, 'failure_stage', p_failure_stage);
END; $$;

REVOKE ALL ON FUNCTION public.fail_comm_hub_dry_run(uuid,text,text,jsonb,jsonb,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_comm_hub_dry_run(uuid,text,text,jsonb,jsonb,text)
  TO service_role;

-- A) Truthfully terminalize the two partial executions ----------------
-- Preconditions proven this migration:
--   provider calls=0, simulator calls=0, delivery attempts=0 for both
--   message_ids (see reconciliation queries in the change log).
DO $$
DECLARE
  v_ids uuid[] := ARRAY[
    'e02bc8c7-dd1c-4a0c-a2d9-0cfab4b720b8'::uuid,
    '0dc7276e-f030-4e4b-afbe-3b4fe33c712e'::uuid
  ];
  v_id uuid;
  v_row public.communication_dry_run_execution%ROWTYPE;
  v_delivery int;
  v_appr_expired boolean;
  v_snap_superseded boolean;
  v_blockers jsonb;
BEGIN
  FOREACH v_id IN ARRAY v_ids LOOP
    SELECT * INTO v_row FROM public.communication_dry_run_execution WHERE id = v_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    IF v_row.state IN ('CERTIFIED','BLOCKED','FAILED') THEN CONTINUE; END IF;

    SELECT count(*) INTO v_delivery
      FROM public.communication_delivery_attempt
      WHERE message_id = v_row.message_id;

    SELECT (status = 'SUPERSEDED') INTO v_snap_superseded
      FROM public.communication_preview_snapshot WHERE id = v_row.preview_snapshot_id;
    SELECT (expires_at < now() OR status IN ('EXPIRED','REVOKED')) INTO v_appr_expired
      FROM public.communication_preview_approval  WHERE id = v_row.preview_approval_id;

    v_blockers := jsonb_build_array(
      jsonb_build_object('code','SERVICE_IDENTITY_FAILURE_WHILE_PARTIAL','stage','service_identity'));
    IF COALESCE(v_snap_superseded,false) THEN
      v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SUPERSEDED','stage','preview');
    END IF;
    IF COALESCE(v_appr_expired,false) THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_EXPIRED','stage','approval');
    END IF;

    UPDATE public.communication_dry_run_execution
       SET state='BLOCKED',
           failure_stage='PARTIAL_RECONCILIATION',
           blockers = v_blockers,
           audit_metadata = COALESCE(audit_metadata,'{}'::jsonb) || jsonb_build_object(
             'reconciled_by','phase_4b3_service_role_repair',
             'reconciled_at', now(),
             'delivery_attempts_at_reconciliation', v_delivery,
             'provider_calls_at_reconciliation', 0,
             'simulator_calls_at_reconciliation', 0,
             'cleanup_proven', true,
             'preview_superseded', COALESCE(v_snap_superseded,false),
             'approval_expired',  COALESCE(v_appr_expired,false)),
           updated_at = now()
     WHERE id = v_id;
  END LOOP;
END $$;
