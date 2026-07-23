
-- ============================================================
-- A. Transition-aware preview runtime evidence predicate
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_comm_hub_preview_runtime_evidence(
  p_snapshot_id uuid,
  p_module_code text,
  p_event_code text,
  p_channel text,
  p_correlation_id uuid,
  p_expected_content_hash text,
  p_expected_recipient_hash text,
  p_expected_template_version_id uuid,
  p_expected_configuration_hash text,
  p_transition_stage text
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_snap record;
  v_ge jsonb;
  v_blockers jsonb := '[]'::jsonb;
  v_requires_approval boolean;
  v_has_active_approval boolean;
BEGIN
  -- Fail-closed transition-stage matrix
  IF p_transition_stage IS NULL OR p_transition_stage = '' THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','PREVIEW_TRANSITION_STAGE_UNKNOWN',
        'message','Transition stage required')));
  END IF;

  IF p_transition_stage NOT IN (
    'APPROVE_PREVIEW','START_DRY_RUN','PROCESS_DRY_RUN','CERTIFY_DRY_RUN',
    'START_CONTROLLED_STUB','CREATE_TARGETED_MESSAGE','CLAIM_TARGETED_MESSAGE',
    'DISPATCH_CONTROLLED_STUB','CERTIFY_CONTROLLED_STUB'
  ) THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','PREVIEW_TRANSITION_STAGE_UNKNOWN',
        'message','Transition stage not permitted',
        'detail',jsonb_build_object('transition_stage',p_transition_stage))));
  END IF;

  -- APPROVE_PREVIEW: needs snapshot only in PREPARED. All other stages: require ACTIVE approval binding.
  v_requires_approval := (p_transition_stage <> 'APPROVE_PREVIEW');

  IF p_snapshot_id IS NULL THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','PREVIEW_SNAPSHOT_MISSING','message','Preview snapshot id required')));
  END IF;

  SELECT id,status,module_code,event_code,channel,expires_at,
         placeholder_scanner_version,raw_placeholder_count,renderer_unresolved_variables,
         correlation_id,content_hash,recipient_set_hash,template_version_id,
         certified_dependency_hash,current_dependency_hash,governance_evidence
    INTO v_snap
    FROM public.communication_preview_snapshot
   WHERE id = p_snapshot_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','PREVIEW_SNAPSHOT_MISSING','message','Preview snapshot not found')));
  END IF;

  v_ge := COALESCE(v_snap.governance_evidence,'{}'::jsonb);

  -- The Preview snapshot itself only carries lifecycle statuses; the "APPROVED"
  -- state in the transition matrix is expressed via an ACTIVE preview approval.
  IF v_snap.status <> 'PREPARED' THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','PREVIEW_SNAPSHOT_STATUS_INVALID',
      'message','Snapshot must be in PREPARED lifecycle status',
      'detail',jsonb_build_object('status',v_snap.status,'transition_stage',p_transition_stage));
  END IF;

  IF v_snap.status='EXPIRED' OR (v_snap.expires_at IS NOT NULL AND v_snap.expires_at<now()) THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_EXPIRED','message','Preview snapshot expired');
  END IF;
  IF v_snap.status='SUPERSEDED' THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_SUPERSEDED','message','Preview snapshot superseded');
  END IF;

  IF v_requires_approval THEN
    SELECT EXISTS(
      SELECT 1 FROM public.communication_preview_approval a
       WHERE a.snapshot_id = v_snap.id
         AND a.status IN ('ACTIVE','RESERVED')
         AND (a.expires_at IS NULL OR a.expires_at > now())
    ) INTO v_has_active_approval;

    IF NOT v_has_active_approval THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','PREVIEW_NOT_APPROVED',
        'message','Downstream transitions require an active preview approval',
        'detail',jsonb_build_object('transition_stage',p_transition_stage));
    END IF;
  ELSE
    -- APPROVE_PREVIEW: reject if an active approval already exists (would be a re-approval).
    IF EXISTS(
      SELECT 1 FROM public.communication_preview_approval a
       WHERE a.snapshot_id = v_snap.id
         AND a.status IN ('ACTIVE','RESERVED')
         AND (a.expires_at IS NULL OR a.expires_at > now())
    ) THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','PREVIEW_ALREADY_APPROVED',
        'message','Snapshot already has an active approval');
    END IF;
  END IF;

  IF v_snap.module_code IS DISTINCT FROM p_module_code THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_MODULE_MISMATCH','message','Module mismatch');
  END IF;
  IF v_snap.event_code IS DISTINCT FROM p_event_code THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_EVENT_MISMATCH','message','Event mismatch');
  END IF;
  IF p_channel IS NOT NULL AND v_snap.channel IS DISTINCT FROM p_channel THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_CHANNEL_MISMATCH','message','Channel mismatch');
  END IF;

  IF p_correlation_id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','CORRELATION_ID_REQUIRED','message','Correlation id required');
  ELSIF v_snap.correlation_id IS DISTINCT FROM p_correlation_id THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_CORRELATION_MISMATCH','message','Correlation mismatch');
  END IF;

  IF COALESCE(v_snap.placeholder_scanner_version,'') <> 'comm-hub-raw-placeholder-scanner/v2' THEN
    v_blockers := v_blockers || jsonb_build_object('code','SCANNER_VERSION_MISMATCH',
      'message','Scanner version must be exactly comm-hub-raw-placeholder-scanner/v2',
      'detail',jsonb_build_object('scanner_version',v_snap.placeholder_scanner_version));
  END IF;

  IF COALESCE(v_snap.raw_placeholder_count,0) <> 0 THEN
    v_blockers := v_blockers || jsonb_build_object('code','RAW_PLACEHOLDER_RESIDUE','message','Raw placeholder residue present');
  END IF;
  IF COALESCE((v_ge->'malformed_braces'->>'count')::int, -1) <> 0 THEN
    v_blockers := v_blockers || jsonb_build_object('code','MALFORMED_BRACES_PRESENT','message','Malformed brace count non-zero or missing');
  END IF;
  IF COALESCE(jsonb_array_length(COALESCE(v_snap.renderer_unresolved_variables,'[]'::jsonb)),0) <> 0 THEN
    v_blockers := v_blockers || jsonb_build_object('code','RENDERER_UNRESOLVED_PRESENT','message','Renderer unresolved variables present');
  END IF;
  IF COALESCE((v_ge->'resolver'->>'unresolved_required_count')::int, -1) <> 0 THEN
    v_blockers := v_blockers || jsonb_build_object('code','RESOLVER_REQUIRED_UNRESOLVED','message','Resolver required unresolved');
  END IF;

  IF NOT (v_ge ? 'raw_placeholders') THEN v_blockers := v_blockers || jsonb_build_object('code','RAW_PLACEHOLDER_EVIDENCE_MISSING','message','Raw placeholder evidence missing'); END IF;
  IF NOT (v_ge ? 'malformed_braces') THEN v_blockers := v_blockers || jsonb_build_object('code','MALFORMED_BRACE_EVIDENCE_MISSING','message','Malformed brace evidence missing'); END IF;
  IF NOT (v_ge ? 'renderer')         THEN v_blockers := v_blockers || jsonb_build_object('code','RENDERER_EVIDENCE_MISSING','message','Renderer evidence missing'); END IF;
  IF NOT (v_ge ? 'resolver')         THEN v_blockers := v_blockers || jsonb_build_object('code','RESOLVER_EVIDENCE_MISSING','message','Resolver evidence missing'); END IF;

  IF v_snap.content_hash IS NULL OR v_snap.content_hash='' THEN
    v_blockers := v_blockers || jsonb_build_object('code','CONTENT_HASH_MISSING','message','content_hash empty');
  ELSIF p_expected_content_hash IS NOT NULL AND v_snap.content_hash <> p_expected_content_hash THEN
    v_blockers := v_blockers || jsonb_build_object('code','CONTENT_HASH_MISMATCH','message','content_hash mismatch');
  END IF;
  IF v_snap.recipient_set_hash IS NULL OR v_snap.recipient_set_hash='' THEN
    v_blockers := v_blockers || jsonb_build_object('code','RECIPIENT_HASH_MISSING','message','recipient_set_hash empty');
  ELSIF p_expected_recipient_hash IS NOT NULL AND v_snap.recipient_set_hash <> p_expected_recipient_hash THEN
    v_blockers := v_blockers || jsonb_build_object('code','RECIPIENT_HASH_MISMATCH','message','recipient_set_hash mismatch');
  END IF;
  IF p_expected_template_version_id IS NOT NULL THEN
    IF v_snap.template_version_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','TEMPLATE_VERSION_MISSING','message','template_version_id null');
    ELSIF v_snap.template_version_id <> p_expected_template_version_id THEN
      v_blockers := v_blockers || jsonb_build_object('code','TEMPLATE_VERSION_MISMATCH','message','template_version_id mismatch');
    END IF;
  END IF;
  IF p_expected_configuration_hash IS NOT NULL THEN
    IF COALESCE(v_snap.certified_dependency_hash,'')='' THEN
      v_blockers := v_blockers || jsonb_build_object('code','CONFIGURATION_HASH_MISSING','message','certified_dependency_hash empty');
    ELSIF v_snap.certified_dependency_hash <> p_expected_configuration_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','CONFIGURATION_HASH_MISMATCH','message','certified_dependency_hash mismatch');
    END IF;
    IF v_snap.certified_dependency_hash IS DISTINCT FROM v_snap.current_dependency_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','DEPENDENCY_HASH_DRIFT','message','certified vs current dependency hash drift');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', jsonb_array_length(v_blockers)=0,
    'blockers', v_blockers,
    'transition_stage', p_transition_stage,
    'evidence', jsonb_build_object(
      'snapshot_id',v_snap.id,
      'content_hash',v_snap.content_hash,
      'recipient_set_hash',v_snap.recipient_set_hash,
      'template_version_id',v_snap.template_version_id,
      'certified_dependency_hash',v_snap.certified_dependency_hash,
      'correlation_id',v_snap.correlation_id,
      'scanner_version',v_snap.placeholder_scanner_version,
      'evaluator_version','4b3.foundation.part2'));
END;
$function$;

REVOKE ALL ON FUNCTION public.check_comm_hub_preview_runtime_evidence(uuid,text,text,text,uuid,text,text,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_comm_hub_preview_runtime_evidence(uuid,text,text,text,uuid,text,text,uuid,text,text) TO authenticated, service_role;


-- ============================================================
-- D. Fail-closed wrappers for legacy grant-mutation overloads
-- ============================================================
CREATE OR REPLACE FUNCTION public.reserve_comm_hub_controlled_live_grant(p_grant_id uuid, p_reserved_by uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN jsonb_build_object('allowed',false,'blockers',
    jsonb_build_array(jsonb_build_object(
      'code','LEGACY_GRANT_API_DISABLED',
      'message','Legacy reserve overload is disabled. Use hardened reserve_comm_hub_controlled_live_grant(uuid,uuid,text,uuid,text).'
    )));
END; $$;

CREATE OR REPLACE FUNCTION public.consume_comm_hub_controlled_live_grant(p_grant_id uuid, p_consumed_by uuid, p_message_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN jsonb_build_object('allowed',false,'blockers',
    jsonb_build_array(jsonb_build_object(
      'code','LEGACY_GRANT_API_DISABLED',
      'message','Legacy consume overload is disabled. Use hardened consume_comm_hub_controlled_live_grant(uuid,uuid,uuid,uuid,text).'
    )));
END; $$;

CREATE OR REPLACE FUNCTION public.revoke_comm_hub_controlled_live_grant(p_grant_id uuid, p_revoked_by uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN jsonb_build_object('allowed',false,'blockers',
    jsonb_build_array(jsonb_build_object(
      'code','LEGACY_GRANT_API_DISABLED',
      'message','Legacy revoke overload is disabled. Use hardened revoke_comm_hub_controlled_live_grant(uuid,uuid,text,text).'
    )));
END; $$;

REVOKE ALL ON FUNCTION public.reserve_comm_hub_controlled_live_grant(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_comm_hub_controlled_live_grant(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_comm_hub_controlled_live_grant(uuid,uuid,text) FROM PUBLIC, anon, authenticated;


-- ============================================================
-- F. Wire pre-mutation gates into begin_comm_hub_dry_run
-- Adds: transition-safe log + stage-aware preview evidence check.
-- ============================================================
CREATE OR REPLACE FUNCTION public.begin_comm_hub_dry_run(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := coalesce(nullif(p_payload->>'requested_by','')::uuid, auth.uid());
  v_module text := p_payload->>'module_code';
  v_event  text := p_payload->>'event_code';
  v_channel text := coalesce(p_payload->>'channel','email');
  v_to  jsonb := coalesce(p_payload->'to_recipients','[]'::jsonb);
  v_cc  jsonb := coalesce(p_payload->'cc_recipients','[]'::jsonb);
  v_bcc jsonb := coalesce(p_payload->'bcc_recipients','[]'::jsonb);
  v_snap_id uuid := nullif(p_payload->>'preview_snapshot_id','')::uuid;
  v_appr_id uuid := nullif(p_payload->>'preview_approval_id','')::uuid;
  v_idem text := nullif(p_payload->>'idempotency_key','');
  v_reason text := coalesce(p_payload->>'operator_reason','');
  v_correlation_id uuid := nullif(p_payload->>'correlation_id','')::uuid;
  v_expected_content_hash text := nullif(p_payload->>'expected_content_hash','');
  v_expected_recipient_hash text := nullif(p_payload->>'expected_recipient_hash','');
  v_expected_template_version_id uuid := nullif(p_payload->>'expected_template_version_id','')::uuid;
  v_expected_configuration_hash text := nullif(p_payload->>'expected_configuration_hash','');
  v_started timestamptz := now();
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_norm jsonb;
  v_recipient_hash text; v_scope_hash text;
  v_decision jsonb; v_allowed boolean;
  v_blockers jsonb; v_warnings jsonb := '[]'::jsonb;
  v_orig_decision_id uuid;
  v_cfg_ver bigint; v_recip_ver bigint; v_send_ver bigint; v_review_ver bigint;
  v_request_id uuid; v_request_no text;
  v_message_id uuid;
  v_execution_id uuid; v_execution_no text;
  v_trace_id uuid;
  v_existing public.communication_dry_run_execution%ROWTYPE;
  v_transition_result jsonb;
  v_evidence_result jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','not_authenticated','stage','auth','severity','critical'))); END IF;
  IF v_idem IS NULL OR length(v_idem) < 8 THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','idempotency_key_required','stage','idempotency','severity','critical'))); END IF;
  IF v_module IS NULL OR v_event IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','module_or_event_missing','stage','input','severity','critical'))); END IF;
  IF v_snap_id IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','preview_snapshot_required','stage','preview','severity','critical'))); END IF;
  IF v_correlation_id IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','correlation_id_required','stage','input','severity','critical'))); END IF;

  -- Runtime transition-safety gate (durable denial log on failure)
  v_transition_result := public.check_comm_hub_runtime_transition_safe(
    'START_DRY_RUN',
    jsonb_build_object(
      'module_code', v_module, 'event_code', v_event, 'channel', v_channel,
      'preview_snapshot_id', v_snap_id, 'preview_approval_id', v_appr_id,
      'correlation_id', v_correlation_id, 'actor_id', v_actor,
      'idempotency_key', v_idem));
  IF NOT COALESCE((v_transition_result->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', COALESCE(v_transition_result->'blockers','[]'::jsonb),
      'stage','runtime_transition',
      'message','START_DRY_RUN denied by runtime transition gate.');
  END IF;

  -- Stage-aware preview evidence gate
  v_evidence_result := public.check_comm_hub_preview_runtime_evidence(
    v_snap_id, v_module, v_event, v_channel, v_correlation_id,
    v_expected_content_hash, v_expected_recipient_hash,
    v_expected_template_version_id, v_expected_configuration_hash,
    'START_DRY_RUN');
  IF NOT COALESCE((v_evidence_result->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', COALESCE(v_evidence_result->'blockers','[]'::jsonb),
      'stage','preview_evidence',
      'message','START_DRY_RUN denied by preview evidence gate.');
  END IF;

  SELECT * INTO v_snap FROM public.communication_preview_snapshot WHERE id = v_snap_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','preview_snapshot_missing','stage','preview','severity','critical'))); END IF;
  IF v_snap.module_code <> v_module OR v_snap.event_code <> v_event OR v_snap.channel <> v_channel THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','preview_snapshot_scope_mismatch','stage','preview','severity','critical'))); END IF;

  v_norm := public.comm_hub_normalize_recipient_set(v_to, v_cc, v_bcc);
  v_recipient_hash := v_norm->>'recipient_set_hash';
  IF v_snap.recipient_set_hash IS NOT NULL AND v_snap.recipient_set_hash <> '' AND v_snap.recipient_set_hash <> v_recipient_hash THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','preview_snapshot_recipient_mismatch','stage','preview','severity','critical'))); END IF;

  v_scope_hash := public.comm_hub_dry_run_scope_hash(v_actor, v_module, v_event, v_channel, v_snap_id, v_recipient_hash);

  SELECT * INTO v_existing FROM public.communication_dry_run_execution
   WHERE idempotency_key = v_idem AND scope_hash = v_scope_hash LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('status','BEGIN_REPLAY','passed', v_existing.state='CERTIFIED',
      'idempotent_replay', true, 'dry_run_execution_id', v_existing.id, 'execution_no', v_existing.execution_no,
      'state', v_existing.state, 'request_id', v_existing.request_id, 'message_id', v_existing.message_id,
      'delivery_attempt_id', v_existing.delivery_attempt_id, 'trace_id', v_existing.trace_id,
      'certification_id', v_existing.certification_id, 'original_decision_id', v_existing.original_decision_id,
      'dispatcher_revalidation_decision_id', v_existing.dispatcher_revalidation_decision_id,
      'preview_snapshot_id', v_existing.preview_snapshot_id, 'preview_approval_id', v_existing.preview_approval_id);
  END IF;

  IF EXISTS (SELECT 1 FROM public.communication_dry_run_execution
              WHERE idempotency_key = v_idem AND scope_hash <> v_scope_hash) THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','idempotency_key_scope_mismatch','stage','idempotency','severity','critical')));
  END IF;

  v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
    'module_code', v_module, 'event_code', v_event, 'channel', v_channel,
    'send_context','dry_run',
    'to_recipients', v_to, 'cc_recipients', v_cc, 'bcc_recipients', v_bcc,
    'template_version_id', v_snap.template_version_id,
    'sender_profile_id',   v_snap.sender_profile_id,
    'expected_content_hash', v_snap.content_hash,
    'preview_approval_id', v_appr_id,
    'idempotency_key', v_idem, 'requested_by', v_actor));
  v_allowed := coalesce((v_decision->>'allowed')::boolean,false);
  v_blockers := coalesce(v_decision->'blockers','[]'::jsonb);
  v_warnings := v_warnings || coalesce(v_decision->'warnings','[]'::jsonb);
  v_orig_decision_id := nullif(v_decision->>'decision_id','')::uuid;
  v_cfg_ver    := nullif(v_decision->>'configuration_version','')::bigint;
  v_recip_ver  := nullif(v_decision->>'recipient_policy_version','')::bigint;
  v_send_ver   := nullif(v_decision->>'send_policy_version','')::bigint;
  v_review_ver := nullif(v_decision->>'review_policy_version','')::bigint;

  v_execution_no := 'DRE-' || to_char(v_started at time zone 'utc','YYYYMMDDHH24MISS')
                          || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);

  IF NOT v_allowed THEN
    INSERT INTO public.communication_dry_run_execution(
      execution_no, idempotency_key, scope_hash, requested_by, module_code, event_code, channel,
      preview_snapshot_id, preview_approval_id, recipient_set_hash, original_decision_id,
      state, failure_stage, blockers, warnings, started_at, updated_at, completed_at, audit_metadata)
    VALUES (v_execution_no, v_idem, v_scope_hash, v_actor, v_module, v_event, v_channel,
      v_snap_id, v_appr_id, v_recipient_hash, v_orig_decision_id,
      'BLOCKED','canonical_decision', v_blockers, v_warnings, v_started, now(), now(),
      jsonb_build_object('operator_reason', v_reason))
    RETURNING id INTO v_execution_id;
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'dry_run_execution_id', v_execution_id, 'execution_no', v_execution_no,
      'original_decision_id', v_orig_decision_id,
      'blockers', v_blockers, 'warnings', v_warnings,
      'preview_snapshot_id', v_snap_id, 'preview_approval_id', v_appr_id,
      'message','Dry run blocked by canonical send decision.');
  END IF;

  INSERT INTO public.communication_dry_run_execution(
    execution_no, idempotency_key, scope_hash, requested_by, module_code, event_code, channel,
    preview_snapshot_id, preview_approval_id, recipient_set_hash, original_decision_id, state,
    warnings, started_at, updated_at, audit_metadata)
  VALUES (v_execution_no, v_idem, v_scope_hash, v_actor, v_module, v_event, v_channel,
    v_snap_id, v_appr_id, v_recipient_hash, v_orig_decision_id, 'STARTED',
    v_warnings, v_started, now(), jsonb_build_object('operator_reason', v_reason))
  RETURNING id INTO v_execution_id;

  INSERT INTO public.communication_request(
    request_no, module_code, event_code, channels, status, payload, context,
    idempotency_key, requested_by,
    original_decision_id, decision_send_context,
    configuration_version, recipient_policy_version, send_policy_version, review_policy_version,
    decision_expires_at, decision_blocker_snapshot, template_id, core_template_id)
  VALUES (
    'DRYRUN-' || to_char(v_started at time zone 'utc','YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8),
    v_module, v_event, ARRAY[v_channel], 'dry_run',
    jsonb_build_object('preview_snapshot_id',v_snap_id,'operator_reason',v_reason,'dry_run_execution_id',v_execution_id),
    jsonb_build_object('send_context','dry_run','preview_approval_id',v_appr_id,'idempotency_key',v_idem,'dry_run_execution_id',v_execution_id),
    v_idem || '::' || v_scope_hash, v_actor,
    v_orig_decision_id, 'dry_run',
    v_cfg_ver, v_recip_ver, v_send_ver, v_review_ver,
    nullif(v_decision->>'expires_at','')::timestamptz, v_blockers,
    NULL::uuid, v_snap.template_id)
  RETURNING id, request_no INTO v_request_id, v_request_no;

  INSERT INTO public.communication_recipient(request_id, role, email, name)
  SELECT v_request_id, 'to', r->>'email', r->>'name' FROM jsonb_array_elements(v_to) r;
  INSERT INTO public.communication_recipient(request_id, role, email, name)
  SELECT v_request_id, 'cc', r->>'email', r->>'name' FROM jsonb_array_elements(v_cc) r;
  INSERT INTO public.communication_recipient(request_id, role, email, name)
  SELECT v_request_id, 'bcc', r->>'email', r->>'name' FROM jsonb_array_elements(v_bcc) r;

  INSERT INTO public.communication_message(
    request_id, channel, template_version_id, sender_profile_id,
    subject, body_text, body_html, status, test_mode, origin,
    send_context, dry_run_locked, original_decision_id)
  VALUES (v_request_id, v_channel, v_snap.template_version_id, v_snap.sender_profile_id,
    v_snap.rendered_subject, v_snap.rendered_body_text, v_snap.rendered_body_html,
    'dry_run', true, 'comm-hub-dry-run', 'dry_run', true, v_orig_decision_id)
  RETURNING id INTO v_message_id;

  BEGIN
    SELECT (r->>'trace_id')::uuid INTO v_trace_id
      FROM public.start_comm_hub_trace(jsonb_build_object(
        'module_code', v_module, 'event_code', v_event, 'channel', v_channel,
        'source_action','dry_run', 'correlation_id', v_idem,
        'current_stage','DRY_RUN_STARTED')) r;
  EXCEPTION WHEN OTHERS THEN
    v_warnings := v_warnings || jsonb_build_object('code','trace_unavailable','message',SQLERRM);
  END;

  UPDATE public.communication_dry_run_execution
     SET state='REQUEST_CREATED', request_id=v_request_id, message_id=v_message_id,
         trace_id=v_trace_id, warnings=v_warnings
   WHERE id=v_execution_id;

  RETURN jsonb_build_object(
    'status','BEGIN_OK','passed', false,
    'dry_run_execution_id', v_execution_id, 'execution_no', v_execution_no, 'state','REQUEST_CREATED',
    'request_id', v_request_id, 'request_number', v_request_no,
    'message_id', v_message_id, 'trace_id', v_trace_id,
    'original_decision_id', v_orig_decision_id,
    'preview_snapshot_id', v_snap_id, 'preview_approval_id', v_appr_id,
    'started_at', v_started, 'blockers','[]'::jsonb, 'warnings', v_warnings);
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO v_existing FROM public.communication_dry_run_execution
   WHERE idempotency_key = v_idem AND scope_hash = v_scope_hash LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('status','BEGIN_REPLAY','passed', v_existing.state='CERTIFIED',
      'idempotent_replay', true, 'dry_run_execution_id', v_existing.id,
      'execution_no', v_existing.execution_no, 'state', v_existing.state,
      'request_id', v_existing.request_id, 'message_id', v_existing.message_id,
      'delivery_attempt_id', v_existing.delivery_attempt_id, 'trace_id', v_existing.trace_id,
      'certification_id', v_existing.certification_id,
      'original_decision_id', v_existing.original_decision_id);
  END IF;
  RAISE;
END; $function$;
