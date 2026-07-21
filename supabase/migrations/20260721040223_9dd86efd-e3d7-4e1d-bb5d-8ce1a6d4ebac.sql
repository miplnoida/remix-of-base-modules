
-- CH-SIMPLE-P3D-B.2.c — Durable dry-run execution state + split begin/finalize RPCs.

-- 1. Durable execution table
CREATE TABLE IF NOT EXISTS public.communication_dry_run_execution (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_no                text UNIQUE NOT NULL,
  idempotency_key             text NOT NULL,
  scope_hash                  text NOT NULL,
  requested_by                uuid NOT NULL,
  module_code                 text NOT NULL,
  event_code                  text NOT NULL,
  channel                     text NOT NULL,
  preview_snapshot_id         uuid NOT NULL,
  preview_approval_id         uuid,
  recipient_set_hash          text NOT NULL,
  original_decision_id        uuid,
  request_id                  uuid,
  message_id                  uuid,
  delivery_attempt_id         uuid,
  dispatcher_revalidation_decision_id uuid,
  trace_id                    uuid,
  certification_id            uuid,
  state                       text NOT NULL DEFAULT 'STARTED'
    CHECK (state IN ('STARTED','REQUEST_CREATED','DISPATCHING','PROCESSED','CERTIFIED','BLOCKED','FAILED')),
  failure_stage               text,
  blockers                    jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings                    jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  completed_at                timestamptz,
  audit_metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.communication_dry_run_execution TO authenticated;
GRANT ALL    ON public.communication_dry_run_execution TO service_role;

ALTER TABLE public.communication_dry_run_execution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dry_run_execution_owner_select" ON public.communication_dry_run_execution;
CREATE POLICY "dry_run_execution_owner_select"
  ON public.communication_dry_run_execution FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

DROP POLICY IF EXISTS "dry_run_execution_service_all" ON public.communication_dry_run_execution;
CREATE POLICY "dry_run_execution_service_all"
  ON public.communication_dry_run_execution FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dry_run_execution_idem_scope
  ON public.communication_dry_run_execution (idempotency_key, scope_hash);
CREATE INDEX IF NOT EXISTS idx_dry_run_execution_state
  ON public.communication_dry_run_execution (state, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dry_run_execution_operator
  ON public.communication_dry_run_execution (requested_by, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_dry_run_execution_message
  ON public.communication_dry_run_execution (message_id) WHERE message_id IS NOT NULL;

-- 2. Immutability + state-machine trigger
CREATE OR REPLACE FUNCTION public._enforce_dry_run_execution_transitions()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_ok boolean := false;
BEGIN
  IF NEW.execution_no <> OLD.execution_no THEN RAISE EXCEPTION 'dry_run_execution_no_immutable' USING ERRCODE='23514'; END IF;
  IF NEW.idempotency_key <> OLD.idempotency_key THEN RAISE EXCEPTION 'dry_run_execution_idempotency_immutable' USING ERRCODE='23514'; END IF;
  IF NEW.scope_hash <> OLD.scope_hash THEN RAISE EXCEPTION 'dry_run_execution_scope_immutable' USING ERRCODE='23514'; END IF;
  IF NEW.requested_by <> OLD.requested_by THEN RAISE EXCEPTION 'dry_run_execution_operator_immutable' USING ERRCODE='23514'; END IF;
  IF NEW.module_code <> OLD.module_code OR NEW.event_code <> OLD.event_code OR NEW.channel <> OLD.channel
     OR NEW.preview_snapshot_id <> OLD.preview_snapshot_id OR NEW.recipient_set_hash <> OLD.recipient_set_hash THEN
    RAISE EXCEPTION 'dry_run_execution_scope_columns_immutable' USING ERRCODE='23514';
  END IF;
  IF OLD.request_id IS NOT NULL AND NEW.request_id IS DISTINCT FROM OLD.request_id THEN
    RAISE EXCEPTION 'dry_run_execution_request_write_once' USING ERRCODE='23514'; END IF;
  IF OLD.message_id IS NOT NULL AND NEW.message_id IS DISTINCT FROM OLD.message_id THEN
    RAISE EXCEPTION 'dry_run_execution_message_write_once' USING ERRCODE='23514'; END IF;
  IF OLD.delivery_attempt_id IS NOT NULL AND NEW.delivery_attempt_id IS DISTINCT FROM OLD.delivery_attempt_id THEN
    RAISE EXCEPTION 'dry_run_execution_attempt_write_once' USING ERRCODE='23514'; END IF;
  IF OLD.certification_id IS NOT NULL AND NEW.certification_id IS DISTINCT FROM OLD.certification_id THEN
    RAISE EXCEPTION 'dry_run_execution_certification_write_once' USING ERRCODE='23514'; END IF;
  IF OLD.trace_id IS NOT NULL AND NEW.trace_id IS DISTINCT FROM OLD.trace_id THEN
    RAISE EXCEPTION 'dry_run_execution_trace_write_once' USING ERRCODE='23514'; END IF;
  IF OLD.original_decision_id IS NOT NULL AND NEW.original_decision_id IS DISTINCT FROM OLD.original_decision_id THEN
    RAISE EXCEPTION 'dry_run_execution_decision_write_once' USING ERRCODE='23514'; END IF;

  IF NEW.state = OLD.state THEN v_ok := true;
  ELSIF OLD.state = 'STARTED'         AND NEW.state IN ('REQUEST_CREATED','BLOCKED','FAILED') THEN v_ok := true;
  ELSIF OLD.state = 'REQUEST_CREATED' AND NEW.state IN ('DISPATCHING','BLOCKED','FAILED')     THEN v_ok := true;
  ELSIF OLD.state = 'DISPATCHING'     AND NEW.state IN ('PROCESSED','BLOCKED','FAILED')       THEN v_ok := true;
  ELSIF OLD.state = 'PROCESSED'       AND NEW.state IN ('CERTIFIED','FAILED')                 THEN v_ok := true;
  ELSIF OLD.state IN ('CERTIFIED','BLOCKED','FAILED') THEN
    RAISE EXCEPTION 'dry_run_execution_terminal_state_immutable' USING ERRCODE='23514';
  END IF;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'dry_run_execution_invalid_transition: % -> %', OLD.state, NEW.state USING ERRCODE='23514';
  END IF;

  NEW.updated_at := now();
  IF NEW.state IN ('CERTIFIED','BLOCKED','FAILED') AND OLD.completed_at IS NULL THEN
    NEW.completed_at := coalesce(NEW.completed_at, now());
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_dry_run_execution ON public.communication_dry_run_execution;
CREATE TRIGGER trg_enforce_dry_run_execution
  BEFORE UPDATE ON public.communication_dry_run_execution
  FOR EACH ROW EXECUTE FUNCTION public._enforce_dry_run_execution_transitions();

-- 3. Scope-hash helper
CREATE OR REPLACE FUNCTION public.comm_hub_dry_run_scope_hash(
  p_actor uuid, p_module text, p_event text, p_channel text,
  p_snapshot uuid, p_recipient_hash text
) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(digest(
    coalesce(p_actor::text,'') || '|' || coalesce(p_module,'') || '|' ||
    coalesce(p_event,'') || '|' || coalesce(p_channel,'') || '|' ||
    coalesce(p_snapshot::text,'') || '|' || coalesce(p_recipient_hash,'')
  , 'sha256'), 'hex')
$$;

-- 4. begin_comm_hub_dry_run
CREATE OR REPLACE FUNCTION public.begin_comm_hub_dry_run(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    v_snap.template_id, v_snap.template_id)
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
END; $$;

REVOKE ALL ON FUNCTION public.begin_comm_hub_dry_run(jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_comm_hub_dry_run(jsonb) TO service_role;

-- 5. mark_comm_hub_dry_run_dispatching
CREATE OR REPLACE FUNCTION public.mark_comm_hub_dry_run_dispatching(
  p_execution_id uuid, p_requested_by uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exec public.communication_dry_run_execution%ROWTYPE;
BEGIN
  SELECT * INTO v_exec FROM public.communication_dry_run_execution WHERE id = p_execution_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','execution_not_found'); END IF;
  IF v_exec.requested_by <> p_requested_by THEN
    RETURN jsonb_build_object('ok',false,'code','execution_operator_mismatch');
  END IF;
  IF v_exec.state = 'DISPATCHING' THEN RETURN jsonb_build_object('ok',true,'code','already_dispatching'); END IF;
  IF v_exec.state <> 'REQUEST_CREATED' THEN
    RETURN jsonb_build_object('ok',false,'code','invalid_state','state',v_exec.state);
  END IF;
  UPDATE public.communication_dry_run_execution SET state='DISPATCHING' WHERE id = p_execution_id;
  RETURN jsonb_build_object('ok',true);
END; $$;

REVOKE ALL ON FUNCTION public.mark_comm_hub_dry_run_dispatching(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_comm_hub_dry_run_dispatching(uuid, uuid) TO service_role;

-- 6. finalize_comm_hub_dry_run
CREATE OR REPLACE FUNCTION public.finalize_comm_hub_dry_run(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := coalesce(nullif(p_payload->>'requested_by','')::uuid, auth.uid());
  v_exec_id uuid := nullif(p_payload->>'dry_run_execution_id','')::uuid;
  v_exec public.communication_dry_run_execution%ROWTYPE;
  v_msg  public.communication_message%ROWTYPE;
  v_req  public.communication_request%ROWTYPE;
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_att  public.communication_delivery_attempt%ROWTYPE;
  v_cert public.communication_dry_run_certification%ROWTYPE;
  v_cert_id uuid; v_cert_no text;
  v_expires_at timestamptz; v_expiry_days integer := 7;
  v_operating_mode text;
  v_warnings jsonb := '[]'::jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','not_authenticated','stage','auth','severity','critical'))); END IF;
  IF v_exec_id IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','execution_id_required','stage','finalize_input','severity','critical'))); END IF;

  SELECT * INTO v_exec FROM public.communication_dry_run_execution WHERE id = v_exec_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','execution_not_found','stage','finalize_input','severity','critical'))); END IF;
  IF v_exec.requested_by <> v_actor THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','execution_operator_mismatch','stage','finalize_input','severity','critical'))); END IF;

  IF v_exec.state = 'CERTIFIED' AND v_exec.certification_id IS NOT NULL THEN
    SELECT * INTO v_cert FROM public.communication_dry_run_certification WHERE id = v_exec.certification_id;
    RETURN jsonb_build_object(
      'status','DRY_RUN_PASSED','passed', true, 'idempotent_replay', true,
      'dry_run_execution_id', v_exec.id, 'dry_run_certification_id', v_cert.id,
      'request_id', v_exec.request_id, 'message_id', v_exec.message_id,
      'delivery_attempt_id', v_exec.delivery_attempt_id, 'trace_id', v_exec.trace_id,
      'original_decision_id', v_exec.original_decision_id,
      'dispatcher_revalidation_decision_id', v_exec.dispatcher_revalidation_decision_id,
      'preview_snapshot_id', v_exec.preview_snapshot_id, 'preview_approval_id', v_exec.preview_approval_id,
      'started_at', v_exec.started_at, 'completed_at', v_exec.completed_at,
      'certification_expires_at', v_cert.expires_at,
      'provider_call_attempted', false, 'provider_message_id', NULL,
      'blockers','[]'::jsonb,'warnings',v_exec.warnings,
      'message','Dry test passed — no real email was sent.');
  END IF;

  IF v_exec.state IN ('BLOCKED','FAILED') THEN
    RETURN jsonb_build_object('status', CASE v_exec.state WHEN 'BLOCKED' THEN 'BLOCKED' ELSE 'DRY_RUN_FAILED' END,
      'passed', false, 'dry_run_execution_id', v_exec.id,
      'failure_stage', v_exec.failure_stage, 'blockers', v_exec.blockers, 'warnings', v_exec.warnings);
  END IF;

  IF v_exec.state NOT IN ('DISPATCHING','PROCESSED') THEN
    RETURN jsonb_build_object('status','DRY_RUN_FAILED','passed',false,
      'dry_run_execution_id', v_exec.id,
      'blockers', jsonb_build_array(jsonb_build_object('code','execution_not_ready_for_finalize','stage','state_check','state',v_exec.state))); END IF;

  SELECT * INTO v_msg  FROM public.communication_message WHERE id = v_exec.message_id;
  SELECT * INTO v_req  FROM public.communication_request WHERE id = v_exec.request_id;
  SELECT * INTO v_snap FROM public.communication_preview_snapshot WHERE id = v_exec.preview_snapshot_id;

  IF v_msg.dry_run_locked IS DISTINCT FROM true OR v_msg.send_context <> 'dry_run' THEN
    UPDATE public.communication_dry_run_execution SET state='FAILED', failure_stage='message_classification_invalid' WHERE id = v_exec.id;
    RETURN jsonb_build_object('status','DRY_RUN_FAILED','passed',false,'dry_run_execution_id', v_exec.id,
      'blockers', jsonb_build_array(jsonb_build_object('code','message_classification_invalid','stage','finalize_evidence'))); END IF;

  SELECT * INTO v_att FROM public.communication_delivery_attempt
   WHERE message_id = v_msg.id AND attempt_type = 'dry_run'
   ORDER BY attempt_no DESC LIMIT 1;
  IF NOT FOUND THEN
    UPDATE public.communication_dry_run_execution SET state='FAILED', failure_stage='attempt_missing' WHERE id = v_exec.id;
    RETURN jsonb_build_object('status','DRY_RUN_FAILED','passed',false,'dry_run_execution_id', v_exec.id,
      'blockers', jsonb_build_array(jsonb_build_object('code','attempt_missing','stage','finalize_evidence','severity','critical'))); END IF;

  IF v_att.provider_call_attempted IS DISTINCT FROM false THEN
    UPDATE public.communication_dry_run_execution SET state='FAILED', failure_stage='provider_call_attempted_true' WHERE id = v_exec.id;
    RETURN jsonb_build_object('status','DRY_RUN_FAILED','passed',false,'dry_run_execution_id', v_exec.id,
      'blockers', jsonb_build_array(jsonb_build_object('code','provider_call_attempted_true','stage','finalize_evidence','severity','critical'))); END IF;
  IF v_att.provider_message_id IS NOT NULL THEN
    UPDATE public.communication_dry_run_execution SET state='FAILED', failure_stage='provider_message_id_present' WHERE id = v_exec.id;
    RETURN jsonb_build_object('status','DRY_RUN_FAILED','passed',false,'dry_run_execution_id', v_exec.id,
      'blockers', jsonb_build_array(jsonb_build_object('code','provider_message_id_present','stage','finalize_evidence','severity','critical'))); END IF;
  IF coalesce(v_att.provider_response#>>'{response,result}','') <> 'DRY_RUN_PROCESSED' THEN
    UPDATE public.communication_dry_run_execution SET state='FAILED', failure_stage='attempt_result_not_processed' WHERE id = v_exec.id;
    RETURN jsonb_build_object('status','DRY_RUN_FAILED','passed',false,'dry_run_execution_id', v_exec.id,
      'blockers', jsonb_build_array(jsonb_build_object('code','attempt_result_not_processed','stage','finalize_evidence','severity','critical'))); END IF;
  IF v_att.recipient_set_hash IS DISTINCT FROM v_exec.recipient_set_hash THEN
    UPDATE public.communication_dry_run_execution SET state='FAILED', failure_stage='recipient_hash_mismatch' WHERE id = v_exec.id;
    RETURN jsonb_build_object('status','DRY_RUN_FAILED','passed',false,'dry_run_execution_id', v_exec.id,
      'blockers', jsonb_build_array(jsonb_build_object('code','recipient_hash_mismatch','stage','finalize_evidence','severity','critical'))); END IF;
  IF v_att.revalidation_decision_id IS NULL THEN
    UPDATE public.communication_dry_run_execution SET state='FAILED', failure_stage='revalidation_decision_missing' WHERE id = v_exec.id;
    RETURN jsonb_build_object('status','DRY_RUN_FAILED','passed',false,'dry_run_execution_id', v_exec.id,
      'blockers', jsonb_build_array(jsonb_build_object('code','revalidation_decision_missing','stage','finalize_evidence','severity','critical'))); END IF;
  IF v_att.original_decision_id IS NULL THEN
    UPDATE public.communication_dry_run_execution SET state='FAILED', failure_stage='original_decision_missing' WHERE id = v_exec.id;
    RETURN jsonb_build_object('status','DRY_RUN_FAILED','passed',false,'dry_run_execution_id', v_exec.id,
      'blockers', jsonb_build_array(jsonb_build_object('code','original_decision_missing','stage','finalize_evidence','severity','critical'))); END IF;

  IF NOT EXISTS (SELECT 1 FROM public.communication_event_log
                  WHERE message_id = v_msg.id AND payload->>'stage'='DRY_RUN_PROCESSED') THEN
    v_warnings := v_warnings || jsonb_build_object('code','dry_run_event_log_missing');
  END IF;

  UPDATE public.communication_dry_run_execution
     SET state='PROCESSED', delivery_attempt_id = v_att.id,
         dispatcher_revalidation_decision_id = v_att.revalidation_decision_id, warnings = v_warnings
   WHERE id = v_exec.id AND state = 'DISPATCHING';

  BEGIN
    SELECT operating_mode INTO v_operating_mode FROM public.communication_hub_control_settings WHERE singleton_guard = 'primary';
  EXCEPTION WHEN OTHERS THEN v_operating_mode := NULL; END;

  v_expires_at := now() + make_interval(days => v_expiry_days);

  INSERT INTO public.communication_dry_run_certification(
    certification_no, module_code, event_code, channel,
    preview_snapshot_id, preview_approval_id,
    communication_request_id, communication_message_id, communication_delivery_attempt_id, trace_id,
    recipient_set_hash, template_id, template_version_id, sender_profile_id,
    rendered_subject_hash, rendered_body_hash, content_hash,
    configuration_version, recipient_policy_version, send_policy_version, review_policy_version,
    original_decision_id, dispatcher_revalidation_decision_id,
    result, status, provider_call_attempted,
    certified_by, certified_at, expires_at,
    idempotency_key, audit_metadata)
  VALUES (
    'DRC-' || to_char(now() at time zone 'utc','YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8),
    v_exec.module_code, v_exec.event_code, v_exec.channel,
    v_exec.preview_snapshot_id, v_exec.preview_approval_id,
    v_exec.request_id, v_exec.message_id, v_att.id, v_exec.trace_id,
    v_exec.recipient_set_hash, v_snap.template_id, v_snap.template_version_id, v_snap.sender_profile_id,
    v_att.subject_hash, v_att.body_hash, v_snap.content_hash,
    v_req.configuration_version, v_req.recipient_policy_version, v_req.send_policy_version, v_req.review_policy_version,
    v_att.original_decision_id, v_att.revalidation_decision_id,
    'DRY_RUN_PASSED','ACTIVE', false,
    v_actor, now(), v_expires_at,
    v_exec.idempotency_key || '::' || v_exec.scope_hash,
    jsonb_build_object('operating_mode', v_operating_mode, 'dry_run_execution_id', v_exec.id))
  RETURNING id, certification_no INTO v_cert_id, v_cert_no;

  UPDATE public.communication_dry_run_certification
     SET status = 'SUPERSEDED', superseded_by = v_cert_id
   WHERE id <> v_cert_id
     AND module_code = v_exec.module_code AND event_code = v_exec.event_code AND channel = v_exec.channel
     AND recipient_set_hash = v_exec.recipient_set_hash
     AND status = 'ACTIVE' AND result = 'DRY_RUN_PASSED';

  UPDATE public.communication_dry_run_execution SET state='CERTIFIED', certification_id = v_cert_id WHERE id = v_exec.id;

  RETURN jsonb_build_object(
    'status','DRY_RUN_PASSED','passed', true, 'idempotent_replay', false,
    'dry_run_execution_id', v_exec.id, 'dry_run_certification_id', v_cert_id, 'certification_no', v_cert_no,
    'request_id', v_exec.request_id, 'message_id', v_exec.message_id,
    'delivery_attempt_id', v_att.id, 'trace_id', v_exec.trace_id,
    'original_decision_id', v_att.original_decision_id,
    'dispatcher_revalidation_decision_id', v_att.revalidation_decision_id,
    'preview_snapshot_id', v_exec.preview_snapshot_id, 'preview_approval_id', v_exec.preview_approval_id,
    'blockers','[]'::jsonb, 'warnings', v_warnings,
    'started_at', v_exec.started_at, 'completed_at', now(),
    'certification_expires_at', v_expires_at,
    'provider_call_attempted', false, 'provider_message_id', NULL,
    'final_operating_mode', v_operating_mode,
    'message','Dry test passed — no real email was sent.');
END; $$;

REVOKE ALL ON FUNCTION public.finalize_comm_hub_dry_run(jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_comm_hub_dry_run(jsonb) TO service_role;
