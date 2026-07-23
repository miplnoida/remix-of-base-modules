
-- =====================================================================
-- Section C — helper contract normalization (additive)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.check_comm_hub_preview_runtime_evidence(
  p_snapshot_id uuid, p_module_code text, p_event_code text, p_channel text,
  p_correlation_id uuid, p_expected_content_hash text, p_expected_recipient_hash text,
  p_expected_template_version_id uuid, p_expected_configuration_hash text,
  p_transition_stage text)
 RETURNS jsonb
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
  v_evidence jsonb;
  v_allowed boolean;
BEGIN
  IF p_transition_stage IS NULL OR p_transition_stage = '' THEN
    RETURN jsonb_build_object(
      'allowed', false, 'ok', false, 'evaluator_version','comm-hub-preview-runtime-evidence/v2',
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_TRANSITION_STAGE_UNKNOWN','message','Transition stage required')),
      'evidence', '{}'::jsonb);
  END IF;
  IF p_transition_stage NOT IN (
    'APPROVE_PREVIEW','START_DRY_RUN','PROCESS_DRY_RUN','CERTIFY_DRY_RUN',
    'START_CONTROLLED_STUB','CREATE_TARGETED_MESSAGE','CLAIM_TARGETED_MESSAGE',
    'DISPATCH_CONTROLLED_STUB','CERTIFY_CONTROLLED_STUB'
  ) THEN
    RETURN jsonb_build_object(
      'allowed', false, 'ok', false, 'evaluator_version','comm-hub-preview-runtime-evidence/v2',
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_TRANSITION_STAGE_UNKNOWN','message','Transition stage not permitted','detail',jsonb_build_object('transition_stage',p_transition_stage))),
      'evidence', jsonb_build_object('transition_stage',p_transition_stage));
  END IF;

  v_requires_approval := (p_transition_stage <> 'APPROVE_PREVIEW');

  IF p_snapshot_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false, 'ok', false, 'evaluator_version','comm-hub-preview-runtime-evidence/v2',
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_SNAPSHOT_MISSING','message','Preview snapshot id required')),
      'evidence','{}'::jsonb);
  END IF;

  SELECT id,status,module_code,event_code,channel,expires_at,
         placeholder_scanner_version,raw_placeholder_count,renderer_unresolved_variables,
         correlation_id,content_hash,recipient_set_hash,template_version_id,
         certified_dependency_hash,current_dependency_hash,governance_evidence
    INTO v_snap
    FROM public.communication_preview_snapshot
   WHERE id = p_snapshot_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false, 'ok', false, 'evaluator_version','comm-hub-preview-runtime-evidence/v2',
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_SNAPSHOT_MISSING','message','Preview snapshot not found')),
      'evidence','{}'::jsonb);
  END IF;

  v_ge := COALESCE(v_snap.governance_evidence,'{}'::jsonb);

  IF v_snap.status <> 'PREPARED' THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_STATUS_INVALID','message','Snapshot must be in PREPARED lifecycle status','detail',jsonb_build_object('status',v_snap.status,'transition_stage',p_transition_stage));
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
      v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_NOT_APPROVED','message','Downstream transitions require an active preview approval','detail',jsonb_build_object('transition_stage',p_transition_stage));
    END IF;
  ELSE
    IF EXISTS(
      SELECT 1 FROM public.communication_preview_approval a
       WHERE a.snapshot_id = v_snap.id
         AND a.status IN ('ACTIVE','RESERVED')
         AND (a.expires_at IS NULL OR a.expires_at > now())
    ) THEN
      v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_ALREADY_APPROVED','message','Snapshot already has an active approval');
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
    v_blockers := v_blockers || jsonb_build_object('code','SCANNER_VERSION_MISMATCH','message','Scanner version must be exactly comm-hub-raw-placeholder-scanner/v2','detail',jsonb_build_object('scanner_version',v_snap.placeholder_scanner_version));
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
  IF NOT (v_ge ? 'raw_placeholders') THEN v_blockers := v_blockers || jsonb_build_object('code','RAW_PLACEHOLDER_EVIDENCE_MISSING'); END IF;
  IF NOT (v_ge ? 'malformed_braces') THEN v_blockers := v_blockers || jsonb_build_object('code','MALFORMED_BRACE_EVIDENCE_MISSING'); END IF;
  IF NOT (v_ge ? 'renderer')         THEN v_blockers := v_blockers || jsonb_build_object('code','RENDERER_EVIDENCE_MISSING'); END IF;
  IF NOT (v_ge ? 'resolver')         THEN v_blockers := v_blockers || jsonb_build_object('code','RESOLVER_EVIDENCE_MISSING'); END IF;

  IF v_snap.content_hash IS NULL OR v_snap.content_hash='' THEN
    v_blockers := v_blockers || jsonb_build_object('code','CONTENT_HASH_MISSING');
  ELSIF p_expected_content_hash IS NOT NULL AND v_snap.content_hash <> p_expected_content_hash THEN
    v_blockers := v_blockers || jsonb_build_object('code','CONTENT_HASH_MISMATCH');
  END IF;
  IF v_snap.recipient_set_hash IS NULL OR v_snap.recipient_set_hash='' THEN
    v_blockers := v_blockers || jsonb_build_object('code','RECIPIENT_HASH_MISSING');
  ELSIF p_expected_recipient_hash IS NOT NULL AND v_snap.recipient_set_hash <> p_expected_recipient_hash THEN
    v_blockers := v_blockers || jsonb_build_object('code','RECIPIENT_HASH_MISMATCH');
  END IF;
  IF p_expected_template_version_id IS NOT NULL THEN
    IF v_snap.template_version_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','TEMPLATE_VERSION_MISSING');
    ELSIF v_snap.template_version_id <> p_expected_template_version_id THEN
      v_blockers := v_blockers || jsonb_build_object('code','TEMPLATE_VERSION_MISMATCH');
    END IF;
  END IF;
  IF p_expected_configuration_hash IS NOT NULL THEN
    IF COALESCE(v_snap.certified_dependency_hash,'')='' THEN
      v_blockers := v_blockers || jsonb_build_object('code','CONFIGURATION_HASH_MISSING');
    ELSIF v_snap.certified_dependency_hash <> p_expected_configuration_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','CONFIGURATION_HASH_MISMATCH');
    END IF;
    IF v_snap.certified_dependency_hash IS DISTINCT FROM v_snap.current_dependency_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','DEPENDENCY_HASH_DRIFT');
    END IF;
  END IF;

  v_allowed := jsonb_array_length(v_blockers)=0;
  v_evidence := jsonb_build_object(
    'snapshot_id',v_snap.id, 'status',v_snap.status,
    'content_hash',v_snap.content_hash, 'recipient_set_hash',v_snap.recipient_set_hash,
    'template_version_id',v_snap.template_version_id,
    'certified_dependency_hash',v_snap.certified_dependency_hash,
    'current_dependency_hash',v_snap.current_dependency_hash,
    'correlation_id',v_snap.correlation_id, 'expires_at',v_snap.expires_at,
    'scanner_version',v_snap.placeholder_scanner_version,
    'raw_placeholder_count',v_snap.raw_placeholder_count,
    'transition_stage',p_transition_stage);

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'ok', v_allowed,
    'blockers', v_blockers,
    'evidence', v_evidence,
    'evaluator_version','comm-hub-preview-runtime-evidence/v2',
    'transition_stage', p_transition_stage);
END $function$;

CREATE OR REPLACE FUNCTION public.check_comm_hub_preview_approval_binding(
  p_preview_approval_id uuid, p_preview_snapshot_id uuid, p_expected_correlation_id uuid,
  p_expected_content_hash text, p_expected_recipient_hash text, p_expected_configuration_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public','extensions'
AS $function$
DECLARE
  v_a public.communication_preview_approval%ROWTYPE;
  v_s public.communication_preview_snapshot%ROWTYPE;
  v_blockers jsonb := '[]'::jsonb;
  v_recomputed text;
  v_evidence jsonb;
  v_ok boolean;
BEGIN
  SELECT * INTO v_a FROM public.communication_preview_approval WHERE id = p_preview_approval_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false, 'allowed', false, 'evaluator_version','comm-hub-preview-approval-binding/v2',
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_APPROVAL_NOT_FOUND')),
      'evidence','{}'::jsonb);
  END IF;
  SELECT * INTO v_s FROM public.communication_preview_snapshot WHERE id = p_preview_snapshot_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false, 'allowed', false, 'evaluator_version','comm-hub-preview-approval-binding/v2',
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_FOUND')),
      'evidence','{}'::jsonb);
  END IF;

  IF v_a.snapshot_id <> v_s.id THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_APPROVAL_SNAPSHOT_MISMATCH');
  END IF;
  IF v_a.status <> 'ACTIVE' THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_APPROVAL_NOT_ACTIVE','status',v_a.status);
  END IF;
  IF v_a.expires_at <= now() THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_APPROVAL_EXPIRED');
  END IF;
  IF v_s.status <> 'PREPARED' THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_PREPARED','status',v_s.status);
  END IF;

  IF v_a.evidence_version IS DISTINCT FROM 'comm-hub-approval-evidence/v1'
     OR v_a.canonical_approval_evidence_hash IS NULL
     OR v_a.placeholder_evidence_hash_at_approval IS NULL
     OR v_a.snapshot_id_at_approval IS NULL
     OR v_a.correlation_id_at_approval IS NULL
     OR v_a.recipient_set_hash_at_approval IS NULL
     OR v_a.template_version_id_at_approval IS NULL
     OR v_a.configuration_hash_at_approval IS NULL
     OR v_a.scanner_version_at_approval IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_EVIDENCE_MISSING_OR_LEGACY','evidence_version', v_a.evidence_version);
  ELSE
    v_recomputed := public._comm_hub_compute_canonical_approval_evidence_v1(
      v_a.snapshot_id_at_approval, v_a.correlation_id_at_approval,
      v_a.content_hash_at_approval, v_a.recipient_set_hash_at_approval,
      v_a.template_version_id_at_approval, v_a.configuration_hash_at_approval,
      v_a.scanner_version_at_approval, v_a.placeholder_evidence_hash_at_approval,
      v_a.approved_by, v_a.approved_at, v_a.expires_at);
    IF v_recomputed IS DISTINCT FROM v_a.canonical_approval_evidence_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CANONICAL_EVIDENCE_HASH_MISMATCH');
    END IF;
  END IF;

  IF p_expected_content_hash IS NOT NULL AND p_expected_content_hash <> v_a.content_hash_at_approval THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CONTENT_HASH_MISMATCH');
  END IF;
  IF p_expected_recipient_hash IS NOT NULL AND p_expected_recipient_hash <> COALESCE(v_a.recipient_set_hash_at_approval,'') THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_RECIPIENT_HASH_MISMATCH');
  END IF;
  IF p_expected_configuration_hash IS NOT NULL AND p_expected_configuration_hash <> COALESCE(v_a.configuration_hash_at_approval,'') THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CONFIGURATION_HASH_MISMATCH');
  END IF;
  IF p_expected_correlation_id IS NOT NULL AND p_expected_correlation_id <> COALESCE(v_a.correlation_id_at_approval,'00000000-0000-0000-0000-000000000000') THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CORRELATION_MISMATCH');
  END IF;

  IF v_a.content_hash_at_approval IS DISTINCT FROM v_s.content_hash THEN
    v_blockers := v_blockers || jsonb_build_object('code','SNAPSHOT_CONTENT_HASH_DRIFT');
  END IF;
  IF v_a.recipient_set_hash_at_approval IS DISTINCT FROM v_s.recipient_set_hash THEN
    v_blockers := v_blockers || jsonb_build_object('code','SNAPSHOT_RECIPIENT_HASH_DRIFT');
  END IF;
  IF v_a.configuration_hash_at_approval IS DISTINCT FROM v_s.certified_dependency_hash THEN
    v_blockers := v_blockers || jsonb_build_object('code','SNAPSHOT_CONFIGURATION_HASH_DRIFT');
  END IF;

  v_ok := jsonb_array_length(v_blockers)=0;
  v_evidence := jsonb_build_object(
    'approval', jsonb_build_object(
      'id', v_a.id, 'status', v_a.status, 'expires_at', v_a.expires_at,
      'evidence_version', v_a.evidence_version,
      'canonical_approval_evidence_hash', v_a.canonical_approval_evidence_hash,
      'correlation_id_at_approval', v_a.correlation_id_at_approval,
      'content_hash_at_approval', v_a.content_hash_at_approval,
      'recipient_set_hash_at_approval', v_a.recipient_set_hash_at_approval,
      'template_version_id_at_approval', v_a.template_version_id_at_approval,
      'configuration_hash_at_approval', v_a.configuration_hash_at_approval),
    'snapshot', jsonb_build_object(
      'id', v_s.id, 'status', v_s.status,
      'correlation_id', v_s.correlation_id, 'expires_at', v_s.expires_at,
      'certified_dependency_hash', v_s.certified_dependency_hash));

  RETURN jsonb_build_object(
    'ok', v_ok, 'allowed', v_ok,
    'blockers', v_blockers,
    'evidence', v_evidence,
    'evaluator_version','comm-hub-preview-approval-binding/v2',
    'approval', v_evidence->'approval',
    'snapshot', v_evidence->'snapshot');
END $function$;


-- =====================================================================
-- Section F — pure read-only preflight
-- =====================================================================

CREATE OR REPLACE FUNCTION public.inspect_comm_hub_dry_run_preflight(
  p_preview_snapshot_id uuid,
  p_preview_approval_id uuid,
  p_module_code text,
  p_event_code text,
  p_channel text DEFAULT 'email')
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_appr public.communication_preview_approval%ROWTYPE;
  v_blockers jsonb := '[]'::jsonb;
  v_evidence jsonb := '{}'::jsonb;
  v_correlation uuid := null;
  v_ready boolean;
  v_status text;
  v_state text;
  v_recipient_count int := null;
  v_placeholder_count int := null;
  v_unresolved_count int := null;
  v_ge jsonb;
BEGIN
  IF p_preview_snapshot_id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_FOUND','message','preview_snapshot_id required');
  ELSE
    SELECT * INTO v_snap FROM public.communication_preview_snapshot WHERE id = p_preview_snapshot_id;
    IF NOT FOUND THEN
      v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_FOUND');
    END IF;
  END IF;

  IF p_preview_approval_id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_APPROVAL_NOT_FOUND','message','preview_approval_id required');
  ELSE
    SELECT * INTO v_appr FROM public.communication_preview_approval WHERE id = p_preview_approval_id;
    IF NOT FOUND THEN
      v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_APPROVAL_NOT_FOUND');
    END IF;
  END IF;

  IF v_snap.id IS NOT NULL AND v_appr.id IS NOT NULL THEN
    IF v_appr.snapshot_id IS DISTINCT FROM v_snap.id THEN
      v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_APPROVAL_SNAPSHOT_MISMATCH');
    END IF;

    IF v_snap.status='EXPIRED' OR (v_snap.expires_at IS NOT NULL AND v_snap.expires_at < now()) THEN
      v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_EXPIRED_BEFORE_BEGIN');
    END IF;
    IF v_appr.expires_at IS NOT NULL AND v_appr.expires_at <= now() THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_EXPIRED_BEFORE_BEGIN');
    END IF;

    IF v_snap.correlation_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_CORRELATION_MISSING');
    END IF;
    IF v_appr.correlation_id_at_approval IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CORRELATION_MISSING');
    END IF;
    IF v_snap.correlation_id IS NOT NULL
       AND v_appr.correlation_id_at_approval IS NOT NULL
       AND v_snap.correlation_id <> v_appr.correlation_id_at_approval THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_PREVIEW_CORRELATION_MISMATCH');
    END IF;

    v_correlation := v_snap.correlation_id;

    IF v_snap.content_hash IS DISTINCT FROM v_appr.content_hash_at_approval THEN
      v_blockers := v_blockers || jsonb_build_object('code','CONTENT_HASH_MISMATCH');
    END IF;
    IF v_snap.recipient_set_hash IS DISTINCT FROM v_appr.recipient_set_hash_at_approval THEN
      v_blockers := v_blockers || jsonb_build_object('code','RECIPIENT_HASH_MISMATCH');
    END IF;
    IF v_snap.template_version_id IS DISTINCT FROM v_appr.template_version_id_at_approval THEN
      v_blockers := v_blockers || jsonb_build_object('code','TEMPLATE_VERSION_MISMATCH');
    END IF;

    IF COALESCE(v_snap.certified_dependency_hash,'')='' OR COALESCE(v_appr.configuration_hash_at_approval,'')='' THEN
      v_blockers := v_blockers || jsonb_build_object('code','CONFIGURATION_HASH_MISSING');
    ELSIF v_snap.certified_dependency_hash <> v_appr.configuration_hash_at_approval THEN
      v_blockers := v_blockers || jsonb_build_object('code','CONFIGURATION_HASH_MISMATCH');
    END IF;
    IF v_snap.certified_dependency_hash IS DISTINCT FROM v_snap.current_dependency_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','DEPENDENCY_HASH_DRIFT');
    END IF;

    IF v_appr.evidence_version IS DISTINCT FROM 'comm-hub-approval-evidence/v1'
       OR v_appr.canonical_approval_evidence_hash IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_EVIDENCE_MISSING_OR_LEGACY','evidence_version',v_appr.evidence_version);
    END IF;

    IF v_snap.module_code IS DISTINCT FROM p_module_code
       OR v_snap.event_code IS DISTINCT FROM p_event_code
       OR v_snap.channel IS DISTINCT FROM COALESCE(p_channel,'email') THEN
      v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_EVENT_MISMATCH',
        'detail', jsonb_build_object('module_code',v_snap.module_code,'event_code',v_snap.event_code,'channel',v_snap.channel));
    END IF;

    -- Recipient snapshot availability (pre-mutation frozen-source evidence)
    IF (COALESCE(jsonb_array_length(v_snap.to_recipients),0)
      + COALESCE(jsonb_array_length(v_snap.cc_recipients),0)
      + COALESCE(jsonb_array_length(v_snap.bcc_recipients),0)) = 0
       OR v_snap.recipient_set_hash IS NULL OR v_snap.recipient_set_hash='' THEN
      v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_FROZEN_RECIPIENT_EVIDENCE_MISSING');
    END IF;
    v_recipient_count := COALESCE(jsonb_array_length(v_snap.to_recipients),0)
                       + COALESCE(jsonb_array_length(v_snap.cc_recipients),0)
                       + COALESCE(jsonb_array_length(v_snap.bcc_recipients),0);

    v_ge := COALESCE(v_snap.governance_evidence,'{}'::jsonb);
    v_placeholder_count := COALESCE(v_snap.raw_placeholder_count,-1);
    v_unresolved_count := COALESCE(jsonb_array_length(COALESCE(v_snap.renderer_unresolved_variables,'[]'::jsonb)),0);
  END IF;

  v_ready := jsonb_array_length(v_blockers)=0;

  IF v_ready THEN
    v_status := 'PREFLIGHT_READY';
    v_state  := 'PREFLIGHT';
  ELSE
    v_status := 'BLOCKED';
    v_state  := 'BLOCKED';
  END IF;

  v_evidence := jsonb_build_object(
    'preview_snapshot_id', v_snap.id,
    'preview_snapshot_status', v_snap.status,
    'preview_approval_id', v_appr.id,
    'preview_approval_status', v_appr.status,
    'module_code', v_snap.module_code, 'event_code', v_snap.event_code, 'channel', v_snap.channel,
    'preview_correlation_id', v_snap.correlation_id,
    'approval_correlation_id_at_approval', v_appr.correlation_id_at_approval,
    'authoritative_correlation_id', v_correlation,
    'correlation_match', (v_snap.correlation_id IS NOT NULL
                          AND v_appr.correlation_id_at_approval IS NOT NULL
                          AND v_snap.correlation_id = v_appr.correlation_id_at_approval),
    'preview_expires_at', v_snap.expires_at,
    'approval_expires_at', v_appr.expires_at,
    'content_hash_match', (v_snap.content_hash IS NOT DISTINCT FROM v_appr.content_hash_at_approval),
    'recipient_hash_match', (v_snap.recipient_set_hash IS NOT DISTINCT FROM v_appr.recipient_set_hash_at_approval),
    'template_version_match', (v_snap.template_version_id IS NOT DISTINCT FROM v_appr.template_version_id_at_approval),
    'configuration_hash_present', (COALESCE(v_snap.certified_dependency_hash,'')<>'' AND COALESCE(v_appr.configuration_hash_at_approval,'')<>''),
    'configuration_hash_match', (v_snap.certified_dependency_hash IS NOT DISTINCT FROM v_appr.configuration_hash_at_approval),
    'dependency_hash_drift', (v_snap.certified_dependency_hash IS DISTINCT FROM v_snap.current_dependency_hash),
    'scanner_version', v_snap.placeholder_scanner_version,
    'raw_placeholder_count', v_placeholder_count,
    'renderer_unresolved_count', v_unresolved_count,
    'approval_evidence_version', v_appr.evidence_version,
    'approval_canonical_hash_present', v_appr.canonical_approval_evidence_hash IS NOT NULL,
    'frozen_recipient_snapshot_available', (COALESCE(v_snap.recipient_set_hash,'')<>''),
    'recipient_count', v_recipient_count,
    'predicted_start_dry_run_blockers', v_blockers
  );

  RETURN jsonb_build_object(
    'contract_version','comm-hub-dry-run-contract/v1',
    'status', v_status,
    'state',  v_state,
    'passed', false,
    'stage_succeeded', v_ready,
    'terminal', false,
    'idempotent_replay', false,
    'failure_stage', CASE WHEN v_ready THEN null ELSE 'PREFLIGHT' END,
    'message', CASE WHEN v_ready THEN 'Preflight ready — safe to begin.' ELSE 'Preflight blocked before mutation.' END,
    'validated_at', now(),
    'execution_deadline_at', null,
    'correlation_id', v_correlation,
    'preview_snapshot_id', v_snap.id,
    'preview_approval_id', v_appr.id,
    'dry_run_execution_id', null,
    'execution_no', null,
    'request_id', null, 'request_number', null,
    'message_id', null, 'trace_id', null,
    'dry_run_certification_id', null, 'certification_expires_at', null,
    'recipient_count', v_recipient_count,
    'blockers', v_blockers,
    'warnings', '[]'::jsonb,
    'transition_log_ids', '[]'::jsonb,
    'mutation_started', false,
    'execution_created', false,
    'request_created', false,
    'message_created', false,
    'cleanup_proven', true,
    'provider_call_attempted', false,
    'simulator_call_attempted', false,
    'ambiguous_outcome', false,
    'retry_safe', true,
    'retry_reason', CASE WHEN v_ready THEN 'SAFE_TO_PROCEED' ELSE 'PRE_MUTATION_VALIDATION_FAILURE' END,
    'evidence', v_evidence,
    'evaluator_version','comm-hub-dry-run-preflight/v1');
END $function$;

REVOKE ALL ON FUNCTION public.inspect_comm_hub_dry_run_preflight(uuid,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inspect_comm_hub_dry_run_preflight(uuid,uuid,text,text,text) TO authenticated, service_role;


-- =====================================================================
-- Section F/G — additive begin_comm_hub_dry_run_v1
-- Server-derived correlation. Delegates to the existing begin RPC ONLY
-- after preflight has passed and the authoritative Preview correlation
-- has been resolved. The legacy begin_comm_hub_dry_run is NOT altered.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.begin_comm_hub_dry_run_v1(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_module text := p_payload->>'module_code';
  v_event  text := p_payload->>'event_code';
  v_channel text := coalesce(p_payload->>'channel','email');
  v_snap_id uuid := nullif(p_payload->>'preview_snapshot_id','')::uuid;
  v_appr_id uuid := nullif(p_payload->>'preview_approval_id','')::uuid;
  v_idem text := nullif(p_payload->>'idempotency_key','');
  v_reason text := coalesce(p_payload->>'operator_reason','');
  v_expected_correlation uuid := nullif(p_payload->>'expected_correlation_id','')::uuid;
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_appr public.communication_preview_approval%ROWTYPE;
  v_authoritative_correlation uuid;
  v_preflight jsonb;
  v_delegate jsonb;
  v_delegate_payload jsonb;
  v_status text;
  v_state text;
  v_stage_ok boolean;
  v_terminal boolean;
  v_idem_replay boolean := false;
  v_blockers jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'contract_version','comm-hub-dry-run-contract/v1',
      'status','BLOCKED','state','BLOCKED','passed',false,'stage_succeeded',false,'terminal',true,
      'idempotent_replay',false,'failure_stage','AUTH','message','Not authenticated.',
      'validated_at',now(),'execution_deadline_at',null,'correlation_id',null,
      'preview_snapshot_id',v_snap_id,'preview_approval_id',v_appr_id,
      'dry_run_execution_id',null,'execution_no',null,'request_id',null,'request_number',null,
      'message_id',null,'trace_id',null,'dry_run_certification_id',null,'certification_expires_at',null,
      'recipient_count',null,
      'blockers', jsonb_build_array(jsonb_build_object('code','NOT_AUTHENTICATED','stage','AUTH','severity','critical')),
      'warnings','[]'::jsonb,'transition_log_ids','[]'::jsonb,
      'mutation_started',false,'execution_created',false,'request_created',false,'message_created',false,
      'cleanup_proven',true,'provider_call_attempted',false,'simulator_call_attempted',false,
      'ambiguous_outcome',false,'retry_safe',true,'retry_reason','PRE_MUTATION_AUTH_FAILURE');
  END IF;

  -- Basic input validation
  v_blockers := '[]'::jsonb;
  IF v_module IS NULL OR v_event IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','MODULE_OR_EVENT_MISSING','stage','INPUT','severity','critical');
  END IF;
  IF v_snap_id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_FOUND','stage','INPUT');
  END IF;
  IF v_appr_id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_APPROVAL_NOT_FOUND','stage','INPUT');
  END IF;
  IF v_idem IS NULL OR length(v_idem) < 8 THEN
    v_blockers := v_blockers || jsonb_build_object('code','IDEMPOTENCY_KEY_REQUIRED','stage','INPUT');
  END IF;
  IF length(v_reason) < 5 THEN
    v_blockers := v_blockers || jsonb_build_object('code','OPERATOR_REASON_REQUIRED','stage','INPUT');
  END IF;

  IF jsonb_array_length(v_blockers) > 0 THEN
    RETURN jsonb_build_object(
      'contract_version','comm-hub-dry-run-contract/v1',
      'status','BLOCKED','state','BLOCKED','passed',false,'stage_succeeded',false,'terminal',true,
      'idempotent_replay',false,'failure_stage','INPUT','message','Input validation failed.',
      'validated_at',now(),'execution_deadline_at',null,'correlation_id',null,
      'preview_snapshot_id',v_snap_id,'preview_approval_id',v_appr_id,
      'dry_run_execution_id',null,'execution_no',null,'request_id',null,'request_number',null,
      'message_id',null,'trace_id',null,'dry_run_certification_id',null,'certification_expires_at',null,
      'recipient_count',null,
      'blockers', v_blockers, 'warnings','[]'::jsonb, 'transition_log_ids','[]'::jsonb,
      'mutation_started',false,'execution_created',false,'request_created',false,'message_created',false,
      'cleanup_proven',true,'provider_call_attempted',false,'simulator_call_attempted',false,
      'ambiguous_outcome',false,'retry_safe',true,'retry_reason','PRE_MUTATION_VALIDATION_FAILURE');
  END IF;

  -- Load snapshot + approval; derive authoritative correlation (server-owned)
  SELECT * INTO v_snap FROM public.communication_preview_snapshot WHERE id = v_snap_id;
  SELECT * INTO v_appr FROM public.communication_preview_approval WHERE id = v_appr_id;

  v_authoritative_correlation := v_snap.correlation_id;

  IF v_expected_correlation IS NOT NULL
     AND v_authoritative_correlation IS NOT NULL
     AND v_expected_correlation <> v_authoritative_correlation THEN
    RETURN jsonb_build_object(
      'contract_version','comm-hub-dry-run-contract/v1',
      'status','BLOCKED','state','BLOCKED','passed',false,'stage_succeeded',false,'terminal',true,
      'idempotent_replay',false,'failure_stage','CORRELATION','message','Caller expected_correlation_id does not match Preview correlation.',
      'validated_at',now(),'execution_deadline_at',null,
      'correlation_id',v_authoritative_correlation,
      'preview_snapshot_id',v_snap_id,'preview_approval_id',v_appr_id,
      'dry_run_execution_id',null,'execution_no',null,'request_id',null,'request_number',null,
      'message_id',null,'trace_id',null,'dry_run_certification_id',null,'certification_expires_at',null,
      'recipient_count',null,
      'blockers', jsonb_build_array(jsonb_build_object('code','CALLER_EXPECTED_CORRELATION_MISMATCH','stage','CORRELATION')),
      'warnings','[]'::jsonb,'transition_log_ids','[]'::jsonb,
      'mutation_started',false,'execution_created',false,'request_created',false,'message_created',false,
      'cleanup_proven',true,'provider_call_attempted',false,'simulator_call_attempted',false,
      'ambiguous_outcome',false,'retry_safe',true,'retry_reason','PRE_MUTATION_CORRELATION_MISMATCH');
  END IF;

  -- Pure preflight
  v_preflight := public.inspect_comm_hub_dry_run_preflight(v_snap_id, v_appr_id, v_module, v_event, v_channel);
  IF (v_preflight->>'status') <> 'PREFLIGHT_READY' THEN
    RETURN jsonb_set(
      jsonb_set(v_preflight, '{status}', to_jsonb('BLOCKED'::text)),
      '{failure_stage}', to_jsonb('PREFLIGHT'::text));
  END IF;

  IF v_authoritative_correlation IS NULL THEN
    RETURN jsonb_build_object(
      'contract_version','comm-hub-dry-run-contract/v1',
      'status','BLOCKED','state','BLOCKED','passed',false,'stage_succeeded',false,'terminal',true,
      'idempotent_replay',false,'failure_stage','CORRELATION','message','Preview correlation missing.',
      'validated_at',now(),'execution_deadline_at',null,'correlation_id',null,
      'preview_snapshot_id',v_snap_id,'preview_approval_id',v_appr_id,
      'dry_run_execution_id',null,'execution_no',null,'request_id',null,'request_number',null,
      'message_id',null,'trace_id',null,'dry_run_certification_id',null,'certification_expires_at',null,
      'recipient_count',null,
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_CORRELATION_MISSING','stage','CORRELATION')),
      'warnings','[]'::jsonb,'transition_log_ids','[]'::jsonb,
      'mutation_started',false,'execution_created',false,'request_created',false,'message_created',false,
      'cleanup_proven',true,'provider_call_attempted',false,'simulator_call_attempted',false,
      'ambiguous_outcome',false,'retry_safe',true,'retry_reason','PRE_MUTATION_VALIDATION_FAILURE');
  END IF;

  -- Delegate to legacy begin with the SERVER-DERIVED correlation.
  -- Caller-supplied correlation_id in p_payload is intentionally dropped.
  v_delegate_payload := jsonb_build_object(
    'module_code', v_module, 'event_code', v_event, 'channel', v_channel,
    'preview_snapshot_id', v_snap_id, 'preview_approval_id', v_appr_id,
    'idempotency_key', v_idem, 'operator_reason', v_reason,
    'correlation_id', v_authoritative_correlation,
    'to_recipients', COALESCE(v_snap.to_recipients,'[]'::jsonb),
    'cc_recipients', COALESCE(v_snap.cc_recipients,'[]'::jsonb),
    'bcc_recipients', COALESCE(v_snap.bcc_recipients,'[]'::jsonb));

  v_delegate := public.begin_comm_hub_dry_run(v_delegate_payload);

  v_status := v_delegate->>'status';
  IF v_status IS NULL THEN v_status := 'BLOCKED'; END IF;

  -- Map legacy status vocabulary to v1 vocabulary
  IF v_status IN ('STARTED','BEGIN_OK') THEN
    v_status := 'BEGIN_OK'; v_state := 'REQUEST_CREATED'; v_stage_ok := true; v_terminal := false; v_idem_replay := false;
  ELSIF v_status = 'BEGIN_REPLAY' THEN
    v_status := 'BEGIN_REPLAY'; v_state := COALESCE(v_delegate->>'state','REQUEST_CREATED'); v_stage_ok := true; v_terminal := false; v_idem_replay := true;
  ELSE
    v_status := 'BLOCKED'; v_state := 'BLOCKED'; v_stage_ok := false; v_terminal := true;
  END IF;

  RETURN jsonb_build_object(
    'contract_version','comm-hub-dry-run-contract/v1',
    'status', v_status, 'state', v_state,
    'passed', false,
    'stage_succeeded', v_stage_ok,
    'terminal', v_terminal,
    'idempotent_replay', v_idem_replay,
    'failure_stage', CASE WHEN v_stage_ok THEN null ELSE 'BEGIN' END,
    'message', CASE WHEN v_stage_ok THEN 'Dry Run begin accepted.' ELSE 'Dry Run begin blocked.' END,
    'validated_at', now(),
    'execution_deadline_at', null,
    'correlation_id', v_authoritative_correlation,
    'preview_snapshot_id', v_snap_id,
    'preview_approval_id', v_appr_id,
    'dry_run_execution_id', v_delegate->>'dry_run_execution_id',
    'execution_no', v_delegate->>'execution_no',
    'request_id', v_delegate->>'request_id',
    'request_number', v_delegate->>'request_number',
    'message_id', v_delegate->>'message_id',
    'trace_id', v_delegate->>'trace_id',
    'dry_run_certification_id', v_delegate->>'certification_id',
    'certification_expires_at', null,
    'recipient_count', (v_preflight->>'recipient_count')::int,
    'blockers', COALESCE(v_delegate->'blockers','[]'::jsonb),
    'warnings','[]'::jsonb,
    'transition_log_ids', COALESCE(
      CASE WHEN v_delegate ? 'transition_log_id'
        THEN jsonb_build_array(v_delegate->>'transition_log_id')
        ELSE '[]'::jsonb END, '[]'::jsonb),
    'mutation_started', CASE WHEN v_stage_ok THEN true ELSE false END,
    'execution_created', CASE WHEN v_stage_ok AND NOT v_idem_replay THEN true
                              WHEN v_stage_ok AND v_idem_replay THEN false
                              ELSE false END,
    'request_created',  CASE WHEN v_stage_ok AND NOT v_idem_replay THEN true
                              WHEN v_stage_ok AND v_idem_replay THEN false
                              ELSE false END,
    'message_created',  CASE WHEN v_stage_ok AND NOT v_idem_replay THEN true
                              WHEN v_stage_ok AND v_idem_replay THEN false
                              ELSE false END,
    'cleanup_proven', CASE WHEN v_stage_ok THEN true ELSE true END,
    'provider_call_attempted', false,
    'simulator_call_attempted', false,
    'ambiguous_outcome', false,
    'retry_safe', true,
    'retry_reason', CASE
      WHEN v_stage_ok AND v_idem_replay THEN 'REPLAY_SAFE'
      WHEN v_stage_ok THEN 'SAFE_TO_PROCEED'
      ELSE 'PRE_MUTATION_VALIDATION_FAILURE' END);
END $function$;

REVOKE ALL ON FUNCTION public.begin_comm_hub_dry_run_v1(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_comm_hub_dry_run_v1(jsonb) TO authenticated, service_role;
