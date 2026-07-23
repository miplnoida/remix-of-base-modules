
-- ============================================================================
-- Phase 4B3 — Dry Run Wiring
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. Immutable approval-time evidence
-- ---------------------------------------------------------------------------
ALTER TABLE public.communication_preview_approval
  ADD COLUMN IF NOT EXISTS snapshot_id_at_approval           uuid,
  ADD COLUMN IF NOT EXISTS correlation_id_at_approval        uuid,
  ADD COLUMN IF NOT EXISTS recipient_set_hash_at_approval    text,
  ADD COLUMN IF NOT EXISTS template_version_id_at_approval   uuid,
  ADD COLUMN IF NOT EXISTS configuration_hash_at_approval    text,
  ADD COLUMN IF NOT EXISTS scanner_version_at_approval       text,
  ADD COLUMN IF NOT EXISTS placeholder_evidence_hash_at_approval text,
  ADD COLUMN IF NOT EXISTS canonical_approval_evidence_hash  text,
  ADD COLUMN IF NOT EXISTS evidence_version                  text;

-- Freeze evidence-at-approval columns; existing immutability trigger already
-- guards lifecycle. Add a separate trigger to fail-close on evidence drift.
CREATE OR REPLACE FUNCTION public._comm_hub_preview_approval_evidence_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.snapshot_id_at_approval           IS DISTINCT FROM OLD.snapshot_id_at_approval           OR
       NEW.correlation_id_at_approval        IS DISTINCT FROM OLD.correlation_id_at_approval        OR
       NEW.recipient_set_hash_at_approval    IS DISTINCT FROM OLD.recipient_set_hash_at_approval    OR
       NEW.template_version_id_at_approval   IS DISTINCT FROM OLD.template_version_id_at_approval   OR
       NEW.configuration_hash_at_approval    IS DISTINCT FROM OLD.configuration_hash_at_approval    OR
       NEW.scanner_version_at_approval       IS DISTINCT FROM OLD.scanner_version_at_approval       OR
       NEW.placeholder_evidence_hash_at_approval IS DISTINCT FROM OLD.placeholder_evidence_hash_at_approval OR
       NEW.canonical_approval_evidence_hash  IS DISTINCT FROM OLD.canonical_approval_evidence_hash  OR
       NEW.evidence_version                  IS DISTINCT FROM OLD.evidence_version THEN
      RAISE EXCEPTION 'APPROVAL_EVIDENCE_IMMUTABLE';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_preview_approval_evidence_immutability
  ON public.communication_preview_approval;
CREATE TRIGGER trg_preview_approval_evidence_immutability
  BEFORE UPDATE ON public.communication_preview_approval
  FOR EACH ROW EXECUTE FUNCTION public._comm_hub_preview_approval_evidence_immutability();

-- ---------------------------------------------------------------------------
-- B. Update approve_comm_hub_preview to write full immutable evidence
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_comm_hub_preview(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_snap_id uuid := (p_payload->>'snapshot_id')::uuid;
  v_reason text := trim(coalesce(p_payload->>'approval_reason',''));
  v_expected_hash text := nullif(p_payload->>'expected_content_hash','');
  v_expected_recip text := nullif(p_payload->>'expected_recipient_set_hash','');
  v_correlation uuid := NULLIF(p_payload->>'correlation_id','')::uuid;
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_appr_id uuid; v_expires timestamptz;
  v_cfg_now bigint; v_rp_now integer;
  v_gate jsonb;
  v_scan_rescan jsonb;
  v_placeholder_hash text;
  v_canonical_hash text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.has_role(v_uid,'Admin'::app_role) THEN
    RAISE EXCEPTION 'preview approval requires Admin role';
  END IF;
  IF v_snap_id IS NULL THEN RAISE EXCEPTION 'PREVIEW_SNAPSHOT_REQUIRED'; END IF;
  IF v_reason = '' THEN RAISE EXCEPTION 'approval_reason is required and cannot be empty'; END IF;

  SELECT * INTO v_snap FROM public.communication_preview_snapshot WHERE id = v_snap_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PREVIEW_SNAPSHOT_NOT_FOUND'; END IF;

  IF v_correlation IS NULL THEN v_correlation := v_snap.correlation_id; END IF;

  v_gate := public.assert_comm_hub_runtime_transition('APPROVE_PREVIEW', jsonb_build_object(
    'module_code', v_snap.module_code, 'event_code', v_snap.event_code, 'channel', v_snap.channel,
    'correlation_id', v_correlation, 'preview_snapshot_id', v_snap_id,
    'content_hash', v_snap.content_hash, 'recipient_set_hash', v_snap.recipient_set_hash,
    'invoked_from', 'approve_comm_hub_preview'
  ));
  IF (v_gate->>'allowed')::boolean = false THEN
    RAISE EXCEPTION 'runtime_transition_denied: %', v_gate->'denied_reasons';
  END IF;

  IF v_snap.status = 'EXPIRED' OR v_snap.expires_at <= now() THEN
    UPDATE public.communication_preview_snapshot SET status='EXPIRED' WHERE id = v_snap.id;
    RAISE EXCEPTION 'PREVIEW_SNAPSHOT_EXPIRED';
  END IF;
  IF v_snap.status = 'SUPERSEDED' THEN RAISE EXCEPTION 'PREVIEW_SNAPSHOT_SUPERSEDED'; END IF;
  IF v_snap.status <> 'PREPARED' THEN RAISE EXCEPTION 'preview_snapshot_not_approvable: status=%', v_snap.status; END IF;

  IF v_snap.placeholder_scanner_version IS NULL
     OR v_snap.placeholder_scanner_version <> 'comm-hub-raw-placeholder-scanner/v2' THEN
    RAISE EXCEPTION 'PREVIEW_PLACEHOLDER_EVIDENCE_MISSING_OR_LEGACY: scanner=%', v_snap.placeholder_scanner_version;
  END IF;
  IF COALESCE(v_snap.raw_placeholder_count,0) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_RAW_PLACEHOLDERS_PRESENT: count=%', v_snap.raw_placeholder_count;
  END IF;
  IF v_snap.unresolved_variables IS NOT NULL AND jsonb_array_length(v_snap.unresolved_variables) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_UNRESOLVED_REQUIRED_VARIABLES: %', v_snap.unresolved_variables::text;
  END IF;
  IF v_snap.renderer_unresolved_variables IS NOT NULL
     AND jsonb_typeof(v_snap.renderer_unresolved_variables)='array'
     AND jsonb_array_length(v_snap.renderer_unresolved_variables) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_RENDERER_UNRESOLVED_VARIABLES: %', v_snap.renderer_unresolved_variables::text;
  END IF;

  v_scan_rescan := public.scan_comm_hub_raw_placeholders(
    v_snap.rendered_subject, v_snap.rendered_body_html, v_snap.rendered_body_text);
  IF COALESCE((v_scan_rescan->>'total_occurrences')::int,0) > 0
     OR COALESCE((v_scan_rescan->>'malformed_brace_count')::int,0) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_RAW_PLACEHOLDERS_DETECTED_ON_APPROVAL: %', v_scan_rescan::text;
  END IF;

  IF v_expected_hash IS NOT NULL AND v_expected_hash <> v_snap.content_hash THEN
    RAISE EXCEPTION 'PREVIEW_CONTENT_HASH_MISMATCH';
  END IF;
  IF v_expected_recip IS NOT NULL AND v_expected_recip <> v_snap.recipient_set_hash THEN
    RAISE EXCEPTION 'PREVIEW_RECIPIENT_HASH_MISMATCH';
  END IF;
  IF v_correlation IS NOT NULL AND v_snap.correlation_id IS NOT NULL AND v_snap.correlation_id <> v_correlation THEN
    RAISE EXCEPTION 'CORRELATION_ID_MISMATCH';
  END IF;

  SELECT configuration_version INTO v_cfg_now FROM public.communication_hub_control_settings WHERE singleton_guard='primary';
  SELECT policy_version INTO v_rp_now FROM public.communication_hub_recipient_policy WHERE singleton_guard='primary';
  IF v_cfg_now IS DISTINCT FROM v_snap.configuration_version THEN
    RAISE EXCEPTION 'preview_configuration_changed';
  END IF;
  IF v_rp_now IS DISTINCT FROM v_snap.recipient_policy_version THEN
    RAISE EXCEPTION 'preview_policy_changed';
  END IF;

  v_expires := now() + interval '30 minutes';

  -- Canonical placeholder evidence + approval evidence hash
  v_placeholder_hash := md5(coalesce(v_scan_rescan::text,'{}')
                           || '|' || coalesce(v_snap.placeholder_scanner_version,''));
  v_canonical_hash := md5(concat_ws('|',
    v_snap.id::text,
    coalesce(v_correlation::text,''),
    v_snap.content_hash,
    coalesce(v_snap.recipient_set_hash,''),
    coalesce(v_snap.template_version_id::text,''),
    coalesce(v_snap.certified_dependency_hash,''),
    coalesce(v_snap.placeholder_scanner_version,''),
    v_placeholder_hash,
    v_uid::text,
    v_expires::text
  ));

  INSERT INTO public.communication_preview_approval(
    snapshot_id, approved_by, approval_reason, status, expires_at,
    configuration_version, recipient_policy_version,
    content_hash_at_approval, audit_metadata,
    snapshot_id_at_approval, correlation_id_at_approval,
    recipient_set_hash_at_approval, template_version_id_at_approval,
    configuration_hash_at_approval, scanner_version_at_approval,
    placeholder_evidence_hash_at_approval,
    canonical_approval_evidence_hash, evidence_version
  ) VALUES (
    v_snap.id, v_uid, v_reason, 'ACTIVE', v_expires,
    v_snap.configuration_version, v_snap.recipient_policy_version,
    v_snap.content_hash,
    jsonb_build_object('correlation_id', v_correlation, 'gate', v_gate,
                       'placeholder_rescan', v_scan_rescan),
    v_snap.id, v_correlation,
    v_snap.recipient_set_hash, v_snap.template_version_id,
    v_snap.certified_dependency_hash, v_snap.placeholder_scanner_version,
    v_placeholder_hash,
    v_canonical_hash, '4b3.approval-evidence.v1'
  ) RETURNING id INTO v_appr_id;

  BEGIN
    UPDATE public.communication_preview_snapshot SET status='APPROVED' WHERE id = v_snap.id;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object(
    'approval_id', v_appr_id, 'snapshot_id', v_snap.id, 'status', 'ACTIVE',
    'expires_at', v_expires, 'correlation_id', v_correlation,
    'canonical_approval_evidence_hash', v_canonical_hash,
    'evidence_version', '4b3.approval-evidence.v1',
    'placeholder_rescan', v_scan_rescan
  );
END; $function$;

-- ---------------------------------------------------------------------------
-- C. Tightened approval binding check
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_comm_hub_preview_approval_binding(
  p_preview_approval_id uuid, p_preview_snapshot_id uuid,
  p_expected_correlation_id uuid, p_expected_content_hash text,
  p_expected_recipient_hash text, p_expected_configuration_hash text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_a record; v_snap record; v_blockers jsonb := '[]'::jsonb;
BEGIN
  IF p_preview_approval_id IS NULL THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','PREVIEW_APPROVAL_MISSING','message','Approval id required')));
  END IF;
  SELECT id,snapshot_id,status,expires_at,content_hash_at_approval,approved_by,
         snapshot_id_at_approval,correlation_id_at_approval,recipient_set_hash_at_approval,
         template_version_id_at_approval,configuration_hash_at_approval,
         scanner_version_at_approval,placeholder_evidence_hash_at_approval,
         canonical_approval_evidence_hash,evidence_version
    INTO v_a FROM public.communication_preview_approval WHERE id = p_preview_approval_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','PREVIEW_APPROVAL_MISSING','message','Approval not found')));
  END IF;

  -- Legacy evidence: reject
  IF v_a.canonical_approval_evidence_hash IS NULL
     OR v_a.evidence_version IS NULL
     OR v_a.snapshot_id_at_approval IS NULL
     OR v_a.recipient_set_hash_at_approval IS NULL
     OR v_a.configuration_hash_at_approval IS NULL
     OR v_a.scanner_version_at_approval IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_EVIDENCE_MISSING_OR_LEGACY',
      'message','Approval predates immutable evidence contract',
      'detail',jsonb_build_object('evidence_version',v_a.evidence_version));
  END IF;

  IF v_a.status <> 'ACTIVE' THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_STATUS_INVALID',
      'message','Approval not ACTIVE','detail',jsonb_build_object('status',v_a.status));
  END IF;
  IF v_a.expires_at IS NOT NULL AND v_a.expires_at < now() THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_EXPIRED','message','Approval expired');
  END IF;
  IF v_a.snapshot_id IS DISTINCT FROM p_preview_snapshot_id THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_SNAPSHOT_MISMATCH','message','Approval snapshot mismatch');
  END IF;
  IF v_a.snapshot_id_at_approval IS NOT NULL
     AND v_a.snapshot_id_at_approval IS DISTINCT FROM p_preview_snapshot_id THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_SNAPSHOT_EVIDENCE_MISMATCH','message','Immutable snapshot evidence mismatch');
  END IF;
  IF v_a.approved_by IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_ACTOR_MISSING','message','Approver missing');
  END IF;

  SELECT correlation_id,content_hash,recipient_set_hash,certified_dependency_hash,template_version_id
    INTO v_snap FROM public.communication_preview_snapshot WHERE id = p_preview_snapshot_id;
  IF NOT FOUND THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_MISSING','message','Approval snapshot not found');
  ELSE
    -- Immutable approval evidence ↔ Preview evidence
    IF v_a.correlation_id_at_approval IS NOT NULL
       AND v_a.correlation_id_at_approval IS DISTINCT FROM v_snap.correlation_id THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CORRELATION_DRIFT','message','Immutable approval correlation drifted from preview');
    END IF;
    IF v_a.content_hash_at_approval IS DISTINCT FROM v_snap.content_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CONTENT_HASH_DRIFT','message','content_hash_at_approval drifted from snapshot');
    END IF;
    IF v_a.recipient_set_hash_at_approval IS NOT NULL
       AND v_a.recipient_set_hash_at_approval IS DISTINCT FROM v_snap.recipient_set_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_RECIPIENT_HASH_DRIFT','message','recipient_set_hash drifted from preview');
    END IF;
    IF v_a.template_version_id_at_approval IS NOT NULL
       AND v_a.template_version_id_at_approval IS DISTINCT FROM v_snap.template_version_id THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_TEMPLATE_VERSION_DRIFT','message','template_version drifted from preview');
    END IF;
    IF v_a.configuration_hash_at_approval IS NOT NULL
       AND v_a.configuration_hash_at_approval IS DISTINCT FROM v_snap.certified_dependency_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CONFIGURATION_HASH_DRIFT','message','configuration_hash drifted from preview');
    END IF;

    -- Caller expectations vs authoritative approval evidence
    IF p_expected_correlation_id IS NOT NULL
       AND v_a.correlation_id_at_approval IS NOT NULL
       AND v_a.correlation_id_at_approval <> p_expected_correlation_id THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CORRELATION_MISMATCH','message','Correlation mismatch');
    END IF;
    IF p_expected_content_hash IS NOT NULL AND v_a.content_hash_at_approval <> p_expected_content_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CONTENT_HASH_MISMATCH','message','content_hash mismatch');
    END IF;
    IF p_expected_recipient_hash IS NOT NULL
       AND v_a.recipient_set_hash_at_approval IS NOT NULL
       AND v_a.recipient_set_hash_at_approval <> p_expected_recipient_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_RECIPIENT_HASH_MISMATCH','message','recipient_set_hash mismatch');
    END IF;
    IF p_expected_configuration_hash IS NOT NULL
       AND v_a.configuration_hash_at_approval IS NOT NULL
       AND v_a.configuration_hash_at_approval <> p_expected_configuration_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CONFIGURATION_HASH_MISMATCH','message','configuration_hash mismatch');
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', jsonb_array_length(v_blockers)=0, 'blockers', v_blockers,
    'evidence', jsonb_build_object('approval_id',v_a.id,'snapshot_id',v_a.snapshot_id,'approved_by',v_a.approved_by,
      'content_hash_at_approval',v_a.content_hash_at_approval,
      'canonical_approval_evidence_hash',v_a.canonical_approval_evidence_hash,
      'evidence_version',v_a.evidence_version,
      'evaluator_version','4b3.dry-run-wiring.approval'));
END; $function$;

-- ---------------------------------------------------------------------------
-- D. Register PROCESS_DRY_RUN in the transition allowlist and the service
--    operation allowlist for the dry-run edge function.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_comm_hub_runtime_transition(p_action text, p_context jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $function$
DECLARE
  v_allowed_actions text[] := ARRAY[
    'PREPARE_PREVIEW','APPROVE_PREVIEW','START_DRY_RUN','PROCESS_DRY_RUN','CERTIFY_DRY_RUN',
    'START_CONTROLLED_STUB','CREATE_TARGETED_MESSAGE','CLAIM_TARGETED_MESSAGE',
    'DISPATCH_CONTROLLED_STUB','CERTIFY_CONTROLLED_STUB','REVALIDATE_SEND_DECISION'
  ];
  v_reasons jsonb := '[]'::jsonb;
  v_uid uuid := auth.uid();
  v_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
  v_actor_type text;
  v_expected_actor uuid := NULLIF(p_context->>'expected_actor_id','')::uuid;
  v_service_op text := NULLIF(p_context->>'service_operation','');
  v_actor uuid;
  v_module text := p_context->>'module_code';
  v_event text := p_context->>'event_code';
  v_channel text := COALESCE(p_context->>'channel','email');
  v_correlation uuid := NULLIF(p_context->>'correlation_id','')::uuid;
  v_allowed boolean := true;
  v_snap_id uuid := NULLIF(p_context->>'preview_snapshot_id','')::uuid;
  v_appr_id uuid := NULLIF(p_context->>'preview_approval_id','')::uuid;
  v_snap RECORD; v_appr RECORD;
  v_safe jsonb;
  v_log_id uuid;
BEGIN
  IF v_uid IS NOT NULL THEN
    v_actor_type := 'USER'; v_actor := v_uid;
    IF v_expected_actor IS NOT NULL AND v_expected_actor <> v_uid THEN
      v_reasons := v_reasons || jsonb_build_object('code','ACTOR_IDENTITY_MISMATCH');
      v_allowed := false;
    END IF;
  ELSIF v_role = 'service_role' THEN
    v_actor_type := 'SERVICE_ROLE'; v_actor := NULL;
    IF v_service_op IS NULL THEN
      v_reasons := v_reasons || jsonb_build_object('code','SERVICE_OPERATION_IDENTITY_REQUIRED');
      v_allowed := false;
    END IF;
  ELSE
    v_actor_type := 'UNAUTHENTICATED';
    v_reasons := v_reasons || jsonb_build_object('code','UNAUTHENTICATED_TRANSITION');
    v_allowed := false;
  END IF;

  IF p_action IN ('START_ONE_REAL_EMAIL','DISPATCH_ONE_REAL_EMAIL','SEND_ONE_REAL_EMAIL') THEN
    v_reasons := v_reasons || jsonb_build_object('code','ONE_REAL_EMAIL_TRANSITION_DENIED'); v_allowed := false;
  ELSIF p_action = 'START_MANUAL_PRODUCTION' THEN
    v_reasons := v_reasons || jsonb_build_object('code','MANUAL_PRODUCTION_TRANSITION_DENIED'); v_allowed := false;
  ELSIF p_action = 'START_AUTOMATED_PRODUCTION' THEN
    v_reasons := v_reasons || jsonb_build_object('code','AUTOMATED_PRODUCTION_TRANSITION_DENIED'); v_allowed := false;
  ELSIF NOT (p_action = ANY(v_allowed_actions)) THEN
    v_reasons := v_reasons || jsonb_build_object('code','UNKNOWN_RUNTIME_TRANSITION','action',p_action); v_allowed := false;
  END IF;

  IF v_module IS NULL OR v_event IS NULL THEN
    v_reasons := v_reasons || jsonb_build_object('code','MODULE_EVENT_REQUIRED'); v_allowed := false;
  END IF;

  IF v_correlation IS NULL AND p_action = ANY(v_allowed_actions) AND p_action <> 'PREPARE_PREVIEW' THEN
    v_reasons := v_reasons || jsonb_build_object('code','CORRELATION_ID_REQUIRED'); v_allowed := false;
  END IF;

  IF v_allowed AND p_action IN ('APPROVE_PREVIEW','START_DRY_RUN','PROCESS_DRY_RUN','CERTIFY_DRY_RUN',
                                'START_CONTROLLED_STUB','CREATE_TARGETED_MESSAGE',
                                'CLAIM_TARGETED_MESSAGE','DISPATCH_CONTROLLED_STUB',
                                'CERTIFY_CONTROLLED_STUB','REVALIDATE_SEND_DECISION') THEN
    IF v_snap_id IS NULL THEN
      v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_REQUIRED'); v_allowed := false;
    ELSE
      SELECT id,status,module_code,event_code,channel,content_hash,recipient_set_hash,
             template_version_id,expires_at,raw_placeholder_count,correlation_id,
             placeholder_scanner_version,raw_placeholders,renderer_unresolved_variables,unresolved_variables
        INTO v_snap FROM public.communication_preview_snapshot WHERE id=v_snap_id;
      IF NOT FOUND THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_FOUND'); v_allowed := false;
      ELSIF v_snap.module_code<>v_module OR v_snap.event_code<>v_event OR v_snap.channel<>v_channel THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SCOPE_MISMATCH'); v_allowed := false;
      ELSIF v_snap.status = 'EXPIRED' OR v_snap.expires_at <= now() THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_EXPIRED'); v_allowed := false;
      ELSIF v_snap.status = 'SUPERSEDED' THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_SUPERSEDED'); v_allowed := false;
      ELSIF v_snap.status NOT IN ('PREPARED','APPROVED') THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_USABLE','status',v_snap.status); v_allowed := false;
      ELSIF COALESCE(v_snap.raw_placeholder_count,0) > 0 THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_RAW_PLACEHOLDERS_PRESENT','count',v_snap.raw_placeholder_count); v_allowed := false;
      ELSIF v_snap.correlation_id IS NOT NULL AND v_correlation IS NOT NULL AND v_snap.correlation_id <> v_correlation THEN
        v_reasons := v_reasons || jsonb_build_object('code','CORRELATION_ID_MISMATCH'); v_allowed := false;
      END IF;

      IF v_snap.id IS NOT NULL AND (
           v_snap.placeholder_scanner_version IS NULL
           OR v_snap.placeholder_scanner_version <> 'comm-hub-raw-placeholder-scanner/v2'
           OR v_snap.raw_placeholders IS NULL
           OR v_snap.renderer_unresolved_variables IS NULL
           OR v_snap.unresolved_variables IS NULL
         ) THEN
        v_reasons := v_reasons || jsonb_build_object(
          'code','PREVIEW_PLACEHOLDER_EVIDENCE_MISSING_OR_LEGACY',
          'scanner_version', v_snap.placeholder_scanner_version);
        v_allowed := false;
      END IF;
    END IF;
  END IF;

  IF v_allowed AND p_action IN ('START_DRY_RUN','PROCESS_DRY_RUN','CERTIFY_DRY_RUN','START_CONTROLLED_STUB',
                                'CREATE_TARGETED_MESSAGE','CLAIM_TARGETED_MESSAGE',
                                'DISPATCH_CONTROLLED_STUB','CERTIFY_CONTROLLED_STUB',
                                'REVALIDATE_SEND_DECISION') THEN
    IF v_appr_id IS NULL THEN
      v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_APPROVAL_REQUIRED'); v_allowed := false;
    ELSE
      SELECT id,snapshot_id,status,expires_at,content_hash_at_approval INTO v_appr
        FROM public.communication_preview_approval WHERE id=v_appr_id;
      IF NOT FOUND THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_APPROVAL_NOT_FOUND'); v_allowed := false;
      ELSIF p_action = 'START_DRY_RUN' AND v_appr.status <> 'ACTIVE' THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_APPROVAL_NOT_ACTIVE','status',v_appr.status); v_allowed := false;
      ELSIF v_appr.status NOT IN ('ACTIVE','RESERVED','CONSUMED') THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_APPROVAL_NOT_USABLE','status',v_appr.status); v_allowed := false;
      ELSIF v_appr.snapshot_id IS DISTINCT FROM v_snap_id THEN
        v_reasons := v_reasons || jsonb_build_object('code','APPROVAL_SNAPSHOT_MISMATCH'); v_allowed := false;
      ELSIF v_appr.expires_at IS NOT NULL AND v_appr.expires_at <= now() THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_APPROVAL_EXPIRED'); v_allowed := false;
      END IF;
    END IF;
  END IF;

  v_safe := jsonb_strip_nulls(jsonb_build_object(
    'actor_type', v_actor_type, 'service_operation', v_service_op,
    'module_code', v_module, 'event_code', v_event, 'channel', v_channel,
    'correlation_id', v_correlation,
    'preview_snapshot_id', v_snap_id, 'preview_approval_id', v_appr_id,
    'dry_run_certification_id', NULLIF(p_context->>'dry_run_certification_id','')::uuid,
    'execution_id', NULLIF(p_context->>'execution_id','')::uuid,
    'grant_id', NULLIF(p_context->>'grant_id','')::uuid,
    'message_id', NULLIF(p_context->>'message_id','')::uuid,
    'content_hash', p_context->>'content_hash',
    'recipient_set_hash', p_context->>'recipient_set_hash',
    'manifest_hash', p_context->>'manifest_hash',
    'invoked_from', p_context->>'invoked_from'
  ));

  INSERT INTO public.comm_hub_runtime_transition_log(
    action,allowed,actor_id,module_code,event_code,channel,context,denied_reasons,correlation_id
  ) VALUES (
    p_action, v_allowed, v_actor, v_module, v_event, v_channel,
    v_safe, v_reasons, v_correlation
  ) RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'allowed', v_allowed, 'action', p_action,
    'blockers', v_reasons,
    'denied_reasons', v_reasons,
    'transition_log_id', v_log_id,
    'actor_id', v_actor, 'actor_type', v_actor_type,
    'correlation_id', v_correlation,
    'evaluator_version','4b3.dry-run-wiring.transition',
    'evaluated_at', now()
  );
END; $function$;

-- Normalised safe wrapper
CREATE OR REPLACE FUNCTION public.check_comm_hub_runtime_transition_safe(p_action text, p_context jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb; v_blockers jsonb;
BEGIN
  BEGIN v_result := public.assert_comm_hub_runtime_transition(p_action, p_context);
  EXCEPTION WHEN OTHERS THEN
    v_result := jsonb_build_object('allowed',false,
      'denied_reasons', jsonb_build_array(jsonb_build_object('code','runtime_gate_error','message',SQLERRM,'sqlstate',SQLSTATE)),
      'blockers',       jsonb_build_array(jsonb_build_object('code','runtime_gate_error','message',SQLERRM,'sqlstate',SQLSTATE)),
      'transition_log_id', NULL,
      'correlation_id', NULLIF(p_context->>'correlation_id','')::uuid,
      'evaluator_version','4b3.dry-run-wiring.safe');
    RETURN v_result;
  END;
  v_blockers := COALESCE(v_result->'blockers', v_result->'denied_reasons','[]'::jsonb);
  -- Guarantee non-empty blockers whenever allowed=false
  IF COALESCE((v_result->>'allowed')::boolean,false) = false
     AND jsonb_array_length(v_blockers) = 0 THEN
    v_blockers := jsonb_build_array(jsonb_build_object('code','RUNTIME_TRANSITION_DENIED_UNSPECIFIED'));
  END IF;
  v_result := v_result
    || jsonb_build_object('blockers', v_blockers, 'denied_reasons', v_blockers);
  RETURN v_result;
END; $function$;

-- ---------------------------------------------------------------------------
-- E. Harden begin_comm_hub_dry_run
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.begin_comm_hub_dry_run(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_expected_actor uuid := nullif(p_payload->>'requested_by','')::uuid;
  v_actor uuid;
  v_module text := p_payload->>'module_code';
  v_event text := p_payload->>'event_code';
  v_channel text := coalesce(p_payload->>'channel','email');
  v_to jsonb := coalesce(p_payload->'to_recipients','[]'::jsonb);
  v_cc jsonb := coalesce(p_payload->'cc_recipients','[]'::jsonb);
  v_bcc jsonb := coalesce(p_payload->'bcc_recipients','[]'::jsonb);
  v_snap_id uuid := nullif(p_payload->>'preview_snapshot_id','')::uuid;
  v_appr_id uuid := nullif(p_payload->>'preview_approval_id','')::uuid;
  v_idem text := nullif(p_payload->>'idempotency_key','');
  v_reason text := coalesce(p_payload->>'operator_reason','');
  v_correlation_id uuid := nullif(p_payload->>'correlation_id','')::uuid;
  v_caller_content_hash text := nullif(p_payload->>'expected_content_hash','');
  v_caller_recip_hash text := nullif(p_payload->>'expected_recipient_hash','');
  v_caller_tv uuid := nullif(p_payload->>'expected_template_version_id','')::uuid;
  v_caller_cfg text := nullif(p_payload->>'expected_configuration_hash','');
  v_started timestamptz := now();
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_appr public.communication_preview_approval%ROWTYPE;
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
  v_binding_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','not_authenticated','stage','auth','severity','critical'))); END IF;
  v_actor := v_uid;  -- SERVER-DERIVED
  IF v_expected_actor IS NOT NULL AND v_expected_actor <> v_uid THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','ACTOR_IDENTITY_MISMATCH','stage','auth','severity','critical'))); END IF;

  IF v_idem IS NULL OR length(v_idem) < 8 THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','idempotency_key_required','stage','idempotency','severity','critical'))); END IF;
  IF v_module IS NULL OR v_event IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','module_or_event_missing','stage','input','severity','critical'))); END IF;
  IF v_snap_id IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','preview_snapshot_required','stage','preview','severity','critical'))); END IF;
  IF v_appr_id IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_APPROVAL_REQUIRED','stage','approval','severity','critical'))); END IF;
  IF v_correlation_id IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','correlation_id_required','stage','input','severity','critical'))); END IF;

  v_transition_result := public.check_comm_hub_runtime_transition_safe(
    'START_DRY_RUN',
    jsonb_build_object(
      'module_code', v_module, 'event_code', v_event, 'channel', v_channel,
      'preview_snapshot_id', v_snap_id, 'preview_approval_id', v_appr_id,
      'correlation_id', v_correlation_id, 'expected_actor_id', v_uid,
      'idempotency_key', v_idem, 'invoked_from','begin_comm_hub_dry_run'));
  IF NOT COALESCE((v_transition_result->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', COALESCE(v_transition_result->'blockers','[]'::jsonb),
      'transition_log_id', v_transition_result->>'transition_log_id',
      'stage','runtime_transition');
  END IF;

  SELECT * INTO v_snap FROM public.communication_preview_snapshot WHERE id=v_snap_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','preview_snapshot_missing'))); END IF;
  SELECT * INTO v_appr FROM public.communication_preview_approval WHERE id=v_appr_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_APPROVAL_NOT_FOUND'))); END IF;

  -- Approval binding using AUTHORITATIVE approval evidence
  v_binding_result := public.check_comm_hub_preview_approval_binding(
    v_appr_id, v_snap_id, v_correlation_id,
    v_appr.content_hash_at_approval,
    v_appr.recipient_set_hash_at_approval,
    v_appr.configuration_hash_at_approval);
  IF NOT COALESCE((v_binding_result->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', COALESCE(v_binding_result->'blockers','[]'::jsonb),
      'stage','approval_binding');
  END IF;

  -- Caller-supplied expected hashes may be used ONLY for optimistic concurrency
  IF v_caller_content_hash IS NOT NULL AND v_caller_content_hash <> v_appr.content_hash_at_approval THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','CALLER_EXPECTED_CONTENT_HASH_MISMATCH'))); END IF;
  IF v_caller_recip_hash IS NOT NULL AND v_caller_recip_hash <> v_appr.recipient_set_hash_at_approval THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','CALLER_EXPECTED_RECIPIENT_HASH_MISMATCH'))); END IF;
  IF v_caller_tv IS NOT NULL AND v_caller_tv <> v_appr.template_version_id_at_approval THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','CALLER_EXPECTED_TEMPLATE_VERSION_MISMATCH'))); END IF;
  IF v_caller_cfg IS NOT NULL AND v_caller_cfg <> v_appr.configuration_hash_at_approval THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','CALLER_EXPECTED_CONFIGURATION_HASH_MISMATCH'))); END IF;

  v_evidence_result := public.check_comm_hub_preview_runtime_evidence(
    v_snap_id, v_module, v_event, v_channel, v_correlation_id,
    v_appr.content_hash_at_approval, v_appr.recipient_set_hash_at_approval,
    v_appr.template_version_id_at_approval, v_appr.configuration_hash_at_approval,
    'START_DRY_RUN');
  IF NOT COALESCE((v_evidence_result->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', COALESCE(v_evidence_result->'blockers','[]'::jsonb),
      'stage','preview_evidence');
  END IF;

  IF v_snap.module_code <> v_module OR v_snap.event_code <> v_event OR v_snap.channel <> v_channel THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','preview_snapshot_scope_mismatch'))); END IF;

  -- Recipients: authoritative hash comes from the approval evidence.
  -- If caller supplies any recipient rows, they MUST hash to the frozen recipient_set_hash.
  IF jsonb_array_length(v_to) + jsonb_array_length(v_cc) + jsonb_array_length(v_bcc) > 0 THEN
    v_norm := public.comm_hub_normalize_recipient_set(v_to, v_cc, v_bcc);
    v_recipient_hash := v_norm->>'recipient_set_hash';
    IF v_recipient_hash IS DISTINCT FROM v_appr.recipient_set_hash_at_approval THEN
      RETURN jsonb_build_object('status','BLOCKED','passed',false,
        'blockers', jsonb_build_array(jsonb_build_object('code','DRY_RUN_RECIPIENT_SET_MISMATCH',
          'message','Caller-supplied recipients do not match frozen approval recipient_set_hash')));
    END IF;
  ELSE
    v_recipient_hash := v_appr.recipient_set_hash_at_approval;
  END IF;

  v_scope_hash := public.comm_hub_dry_run_scope_hash(v_actor, v_module, v_event, v_channel, v_snap_id, v_recipient_hash);

  SELECT * INTO v_existing FROM public.communication_dry_run_execution
    WHERE idempotency_key = v_idem AND scope_hash = v_scope_hash LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('status','BEGIN_REPLAY','passed', v_existing.state='CERTIFIED',
      'idempotent_replay', true, 'dry_run_execution_id', v_existing.id, 'execution_no', v_existing.execution_no,
      'state', v_existing.state, 'request_id', v_existing.request_id, 'message_id', v_existing.message_id,
      'certification_id', v_existing.certification_id, 'original_decision_id', v_existing.original_decision_id,
      'preview_snapshot_id', v_existing.preview_snapshot_id, 'preview_approval_id', v_existing.preview_approval_id);
  END IF;

  IF EXISTS (SELECT 1 FROM public.communication_dry_run_execution
             WHERE idempotency_key = v_idem AND scope_hash <> v_scope_hash) THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','idempotency_key_scope_mismatch')));
  END IF;

  v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
    'module_code', v_module, 'event_code', v_event, 'channel', v_channel,
    'send_context','dry_run',
    'to_recipients', v_to, 'cc_recipients', v_cc, 'bcc_recipients', v_bcc,
    'template_version_id', v_snap.template_version_id,
    'sender_profile_id', v_snap.sender_profile_id,
    'expected_content_hash', v_snap.content_hash,
    'preview_approval_id', v_appr_id,
    'idempotency_key', v_idem, 'requested_by', v_actor));
  v_allowed := coalesce((v_decision->>'allowed')::boolean,false);
  v_blockers := coalesce(v_decision->'blockers','[]'::jsonb);
  v_warnings := v_warnings || coalesce(v_decision->'warnings','[]'::jsonb);
  v_orig_decision_id := nullif(v_decision->>'decision_id','')::uuid;
  v_cfg_ver := nullif(v_decision->>'configuration_version','')::bigint;
  v_recip_ver := nullif(v_decision->>'recipient_policy_version','')::bigint;
  v_send_ver := nullif(v_decision->>'send_policy_version','')::bigint;
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
      'blockers', v_blockers, 'warnings', v_warnings);
  END IF;

  INSERT INTO public.communication_dry_run_execution(
    execution_no, idempotency_key, scope_hash, requested_by, module_code, event_code, channel,
    preview_snapshot_id, preview_approval_id, recipient_set_hash, original_decision_id, state,
    warnings, started_at, updated_at, audit_metadata)
  VALUES (v_execution_no, v_idem, v_scope_hash, v_actor, v_module, v_event, v_channel,
    v_snap_id, v_appr_id, v_recipient_hash, v_orig_decision_id, 'STARTED',
    v_warnings, v_started, now(), jsonb_build_object('operator_reason', v_reason,
      'approval_evidence_version', v_appr.evidence_version,
      'canonical_approval_evidence_hash', v_appr.canonical_approval_evidence_hash))
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
    'preview_snapshot_id', v_snap_id, 'preview_approval_id', v_appr_id,
    'transition_log_id', v_transition_result->>'transition_log_id',
    'started_at', v_started, 'blockers','[]'::jsonb, 'warnings', v_warnings);
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO v_existing FROM public.communication_dry_run_execution
    WHERE idempotency_key = v_idem AND scope_hash = v_scope_hash LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('status','BEGIN_REPLAY','passed', v_existing.state='CERTIFIED',
      'idempotent_replay', true, 'dry_run_execution_id', v_existing.id,
      'execution_no', v_existing.execution_no, 'state', v_existing.state);
  END IF;
  RAISE;
END; $function$;

-- ---------------------------------------------------------------------------
-- F. Trusted Dry Run processor (service_role only, PROCESS_DRY_RUN)
-- ---------------------------------------------------------------------------
INSERT INTO public.comm_hub_service_operation_allowlist(service_account,operation,reason,active)
VALUES ('comm-hub-dry-run','PROCESS_DRY_RUN','Trusted internal processor for Dry Run executions',true)
ON CONFLICT (service_account,operation) DO UPDATE SET active=true;

CREATE OR REPLACE FUNCTION public.process_comm_hub_dry_run_execution(p_execution_id uuid, p_correlation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_svc jsonb;
  v_exec public.communication_dry_run_execution%ROWTYPE;
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_appr public.communication_preview_approval%ROWTYPE;
  v_tr jsonb; v_ev jsonb; v_bind jsonb;
  v_updated int;
BEGIN
  v_svc := public.assert_comm_hub_service_operation('PROCESS_DRY_RUN','START_DRY_RUN');
  IF NOT COALESCE((v_svc->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','service_identity',
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
      'transition_log_id', v_tr->>'transition_log_id');
  END IF;

  v_bind := public.check_comm_hub_preview_approval_binding(
    v_exec.preview_approval_id, v_exec.preview_snapshot_id,
    COALESCE(p_correlation_id, v_snap.correlation_id),
    v_appr.content_hash_at_approval, v_appr.recipient_set_hash_at_approval,
    v_appr.configuration_hash_at_approval);
  IF NOT COALESCE((v_bind->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','approval_binding',
      'blockers', COALESCE(v_bind->'blockers','[]'::jsonb));
  END IF;

  v_ev := public.check_comm_hub_preview_runtime_evidence(
    v_exec.preview_snapshot_id, v_exec.module_code, v_exec.event_code, v_exec.channel,
    COALESCE(p_correlation_id, v_snap.correlation_id),
    v_appr.content_hash_at_approval, v_appr.recipient_set_hash_at_approval,
    v_appr.template_version_id_at_approval, v_appr.configuration_hash_at_approval,
    'START_DRY_RUN');  -- Preview evidence checked with equivalent stage
  IF NOT COALESCE((v_ev->>'allowed')::boolean,false) THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','preview_evidence',
      'blockers', COALESCE(v_ev->'blockers','[]'::jsonb));
  END IF;

  -- Atomic claim: STARTED or REQUEST_CREATED -> DISPATCHING, then -> PROCESSED
  UPDATE public.communication_dry_run_execution
    SET state='DISPATCHING', updated_at=now()
    WHERE id=v_exec.id AND state IN ('STARTED','REQUEST_CREATED');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('status','BLOCKED','stage','claim',
      'blockers', jsonb_build_array(jsonb_build_object('code','DUPLICATE_OR_INVALID_CLAIM','current_state',v_exec.state)));
  END IF;

  UPDATE public.communication_dry_run_execution
    SET state='PROCESSED', updated_at=now(), completed_at=now()
    WHERE id=v_exec.id;

  RETURN jsonb_build_object('status','PROCESSED', 'dry_run_execution_id', v_exec.id,
    'state','PROCESSED', 'provider_call_attempted', false,
    'evidence', jsonb_build_object(
      'transition_log_id', v_tr->>'transition_log_id',
      'approval_evidence_hash', v_appr.canonical_approval_evidence_hash));
END; $function$;

REVOKE ALL ON FUNCTION public.process_comm_hub_dry_run_execution(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_comm_hub_dry_run_execution(uuid,uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- G. Dedicated Dry Run certification RPC
-- ---------------------------------------------------------------------------
-- Idempotency: one ACTIVE certification per execution
CREATE UNIQUE INDEX IF NOT EXISTS communication_dry_run_certification_exec_active_uk
  ON public.communication_dry_run_certification((preview_snapshot_id), (preview_approval_id))
  WHERE status='ACTIVE';

CREATE OR REPLACE FUNCTION public.certify_comm_hub_dry_run(p_execution_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_exec public.communication_dry_run_execution%ROWTYPE;
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_appr public.communication_preview_approval%ROWTYPE;
  v_msg public.communication_message%ROWTYPE;
  v_tr jsonb; v_bind jsonb;
  v_cert_id uuid; v_existing_cert uuid; v_cert_no text;
  v_provider_count int;
BEGIN
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
END; $function$;

REVOKE ALL ON FUNCTION public.certify_comm_hub_dry_run(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.certify_comm_hub_dry_run(uuid) TO service_role;
