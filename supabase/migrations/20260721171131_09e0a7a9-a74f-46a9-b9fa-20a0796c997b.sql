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