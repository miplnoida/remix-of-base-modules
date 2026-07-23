
CREATE OR REPLACE FUNCTION public.check_comm_hub_preview_runtime_evidence(p_snapshot_id uuid, p_module_code text, p_event_code text, p_channel text, p_correlation_id uuid, p_expected_content_hash text, p_expected_recipient_hash text, p_expected_template_version_id uuid, p_expected_configuration_hash text, p_transition_stage text)
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
  v_ev_version text;
  v_resolver jsonb;
  v_required_unresolved int;
  v_canonical_raw text;
BEGIN
  IF p_transition_stage IS NULL OR p_transition_stage = '' THEN
    RETURN jsonb_build_object(
      'allowed', false, 'ok', false, 'evaluator_version','comm-hub-preview-runtime-evidence/v3',
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_TRANSITION_STAGE_UNKNOWN','message','Transition stage required')),
      'evidence', '{}'::jsonb);
  END IF;
  IF p_transition_stage NOT IN (
    'APPROVE_PREVIEW','START_DRY_RUN','PROCESS_DRY_RUN','CERTIFY_DRY_RUN',
    'START_CONTROLLED_STUB','CREATE_TARGETED_MESSAGE','CLAIM_TARGETED_MESSAGE',
    'DISPATCH_CONTROLLED_STUB','CERTIFY_CONTROLLED_STUB'
  ) THEN
    RETURN jsonb_build_object(
      'allowed', false, 'ok', false, 'evaluator_version','comm-hub-preview-runtime-evidence/v3',
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_TRANSITION_STAGE_UNKNOWN','message','Transition stage not permitted','detail',jsonb_build_object('transition_stage',p_transition_stage))),
      'evidence', jsonb_build_object('transition_stage',p_transition_stage));
  END IF;

  v_requires_approval := (p_transition_stage <> 'APPROVE_PREVIEW');

  IF p_snapshot_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false, 'ok', false, 'evaluator_version','comm-hub-preview-runtime-evidence/v3',
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
      'allowed', false, 'ok', false, 'evaluator_version','comm-hub-preview-runtime-evidence/v3',
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_SNAPSHOT_MISSING','message','Preview snapshot not found')),
      'evidence','{}'::jsonb);
  END IF;

  v_ge := COALESCE(v_snap.governance_evidence,'{}'::jsonb);
  v_ev_version := v_ge->>'evidence_version';
  v_resolver := v_ge->'resolver';

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

  -- Canonical resolver evidence key: required_unresolved_count.
  -- For evidence_version = comm-hub-preview-governance-evidence/v1 the canonical key is authoritative.
  -- Missing / non-numeric canonical value => RESOLVER_EVIDENCE_INVALID (never blame a real variable).
  -- Legacy reversed key `unresolved_required_count` is honoured only for other/older evidence versions.
  IF v_resolver IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','RESOLVER_EVIDENCE_MISSING','message','Resolver evidence object missing');
  ELSIF v_ev_version = 'comm-hub-preview-governance-evidence/v1' THEN
    v_canonical_raw := v_resolver->>'required_unresolved_count';
    IF v_canonical_raw IS NULL OR v_canonical_raw !~ '^-?[0-9]+$' THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','RESOLVER_EVIDENCE_INVALID',
        'message','v1 resolver evidence missing canonical required_unresolved_count',
        'detail', jsonb_build_object(
          'evidence_version', v_ev_version,
          'resolver', v_resolver,
          'canonical_key','required_unresolved_count'));
    ELSE
      v_required_unresolved := v_canonical_raw::int;
      IF v_required_unresolved > 0 THEN
        v_blockers := v_blockers || jsonb_build_object(
          'code','RESOLVER_REQUIRED_UNRESOLVED',
          'message','Resolver required unresolved',
          'detail', jsonb_build_object(
            'evidence_version', v_ev_version,
            'required_unresolved_count', v_required_unresolved,
            'total_unresolved_count', COALESCE((v_resolver->>'total_unresolved_count')::int, NULL),
            'unresolved_variables', COALESCE(v_snap.governance_evidence->'resolver'->'required_unresolved_variables','[]'::jsonb)));
      END IF;
    END IF;
  ELSE
    -- legacy / unknown evidence versions: accept either key, prefer canonical
    v_canonical_raw := COALESCE(v_resolver->>'required_unresolved_count', v_resolver->>'unresolved_required_count');
    IF v_canonical_raw IS NULL OR v_canonical_raw !~ '^-?[0-9]+$' THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','RESOLVER_EVIDENCE_INVALID',
        'message','Resolver required-unresolved count missing or non-numeric',
        'detail', jsonb_build_object('evidence_version', v_ev_version, 'resolver', v_resolver));
    ELSIF v_canonical_raw::int > 0 THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','RESOLVER_REQUIRED_UNRESOLVED',
        'message','Resolver required unresolved',
        'detail', jsonb_build_object('evidence_version', v_ev_version, 'required_unresolved_count', v_canonical_raw::int));
    END IF;
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
    'evidence_version', v_ev_version,
    'resolver_required_unresolved_count', COALESCE((v_resolver->>'required_unresolved_count')::int, NULL),
    'resolver_total_unresolved_count', COALESCE((v_resolver->>'total_unresolved_count')::int, NULL),
    'transition_stage',p_transition_stage);

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'ok', v_allowed,
    'blockers', v_blockers,
    'evidence', v_evidence,
    'evaluator_version','comm-hub-preview-runtime-evidence/v3',
    'transition_stage', p_transition_stage);
END $function$;
