
CREATE OR REPLACE FUNCTION public.inspect_comm_hub_dry_run_preflight(
  p_preview_snapshot_id uuid,
  p_preview_approval_id uuid,
  p_module_code text,
  p_event_code text,
  p_channel text DEFAULT 'email'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
  v_to_len int := 0;
  v_cc_len int := 0;
  v_bcc_len int := 0;
  v_placeholder_count int := null;
  v_malformed_count int := null;
  v_unresolved_count int := null;
  v_required_unresolved_count int := null;
  v_ge jsonb;
  v_uid uuid := auth.uid();
  v_is_service boolean := (auth.role() = 'service_role');
  v_is_admin boolean := false;
  v_recipients_valid boolean := true;
  v_module_norm text := btrim(coalesce(p_module_code,''));
  v_event_norm  text := btrim(coalesce(p_event_code,''));
  v_channel_norm text := btrim(coalesce(nullif(p_channel,''),'email'));
  v_r jsonb;
  v_addr text;
BEGIN
  IF NOT v_is_service THEN
    IF v_uid IS NULL THEN
      RETURN jsonb_build_object(
        'contract_version','comm-hub-dry-run-contract/v1',
        'status','BLOCKED','state','BLOCKED',
        'passed', false, 'stage_succeeded', false, 'terminal', true,
        'idempotent_replay', false,
        'failure_stage','PREFLIGHT',
        'message','Authentication required to inspect preflight.',
        'validated_at', now(),'execution_deadline_at', null,
        'correlation_id', null,
        'preview_snapshot_id', null,'preview_approval_id', null,
        'dry_run_execution_id', null,'execution_no', null,
        'request_id', null,'request_number', null,
        'message_id', null,'trace_id', null,
        'dry_run_certification_id', null,'certification_expires_at', null,
        'recipient_count', null,
        'blockers', jsonb_build_array(jsonb_build_object('code','PREFLIGHT_AUTHENTICATION_REQUIRED')),
        'warnings','[]'::jsonb,'transition_log_ids','[]'::jsonb,
        'mutation_started', false,'execution_created', false,
        'request_created', false,'message_created', false,
        'created_this_call', false,'cleanup_proven', true,
        'provider_call_attempted', false,'simulator_call_attempted', false,
        'ambiguous_outcome', false,
        'retry_safe', true,'retry_reason','PRE_MUTATION_AUTH_FAILURE',
        'evidence', jsonb_build_object('authenticated', false),
        'evaluator_version','comm-hub-dry-run-preflight/v1');
    END IF;

    BEGIN
      v_is_admin := public.is_comm_hub_operator_admin(v_uid);
    EXCEPTION WHEN OTHERS THEN
      v_is_admin := false;
    END;

    IF NOT v_is_admin THEN
      RETURN jsonb_build_object(
        'contract_version','comm-hub-dry-run-contract/v1',
        'status','BLOCKED','state','BLOCKED',
        'passed', false,'stage_succeeded', false,'terminal', true,
        'idempotent_replay', false,
        'failure_stage','PREFLIGHT',
        'message','Communication Hub operator role required.',
        'validated_at', now(),'execution_deadline_at', null,
        'correlation_id', null,
        'preview_snapshot_id', null,'preview_approval_id', null,
        'dry_run_execution_id', null,'execution_no', null,
        'request_id', null,'request_number', null,
        'message_id', null,'trace_id', null,
        'dry_run_certification_id', null,'certification_expires_at', null,
        'recipient_count', null,
        'blockers', jsonb_build_array(jsonb_build_object('code','PREFLIGHT_PERMISSION_REQUIRED')),
        'warnings','[]'::jsonb,'transition_log_ids','[]'::jsonb,
        'mutation_started', false,'execution_created', false,
        'request_created', false,'message_created', false,
        'created_this_call', false,'cleanup_proven', true,
        'provider_call_attempted', false,'simulator_call_attempted', false,
        'ambiguous_outcome', false,
        'retry_safe', true,'retry_reason','PRE_MUTATION_AUTH_FAILURE',
        'evidence', jsonb_build_object('authenticated', true, 'authorized', false),
        'evaluator_version','comm-hub-dry-run-preflight/v1');
    END IF;
  END IF;

  IF p_preview_snapshot_id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_FOUND','message','preview_snapshot_id required');
  ELSE
    SELECT * INTO v_snap FROM public.communication_preview_snapshot WHERE id = p_preview_snapshot_id;
    IF NOT FOUND THEN
      v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_FOUND');
    ELSE
      IF v_snap.status IS DISTINCT FROM 'PREPARED' THEN
        v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_PREPARED','detail', jsonb_build_object('status', v_snap.status));
      END IF;
      IF v_snap.expires_at IS NOT NULL AND v_snap.expires_at <= now() THEN
        v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_EXPIRED_BEFORE_BEGIN');
      END IF;
      IF v_snap.module_code IS DISTINCT FROM v_module_norm
         OR v_snap.event_code IS DISTINCT FROM v_event_norm
         OR v_snap.channel   IS DISTINCT FROM v_channel_norm THEN
        v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SCOPE_MISMATCH',
          'detail', jsonb_build_object('module_code',v_snap.module_code,'event_code',v_snap.event_code,'channel',v_snap.channel));
      END IF;
      IF v_snap.correlation_id IS NULL THEN
        v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_CORRELATION_MISSING');
      END IF;
      IF v_snap.content_hash IS NULL OR v_snap.content_hash = '' THEN
        v_blockers := v_blockers || jsonb_build_object('code','CONTENT_HASH_MISSING');
      END IF;
      IF v_snap.template_version_id IS NULL THEN
        v_blockers := v_blockers || jsonb_build_object('code','TEMPLATE_VERSION_MISSING');
      END IF;
      IF v_snap.certified_dependency_hash IS NULL OR v_snap.certified_dependency_hash = '' THEN
        v_blockers := v_blockers || jsonb_build_object('code','CONFIGURATION_HASH_MISSING');
      END IF;
    END IF;
  END IF;

  IF p_preview_approval_id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_APPROVAL_NOT_FOUND','message','preview_approval_id required');
  ELSE
    SELECT * INTO v_appr FROM public.communication_preview_approval WHERE id = p_preview_approval_id;
    IF NOT FOUND THEN
      v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_APPROVAL_NOT_FOUND');
    ELSE
      IF v_snap.id IS NOT NULL AND v_appr.snapshot_id IS DISTINCT FROM v_snap.id THEN
        v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_APPROVAL_SNAPSHOT_MISMATCH');
      END IF;

      IF v_appr.status IS DISTINCT FROM 'ACTIVE' THEN
        v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_APPROVAL_NOT_ACTIVE','detail', jsonb_build_object('status', v_appr.status));
        IF v_appr.status = 'REVOKED' THEN
          v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_REVOKED_BEFORE_BEGIN');
        ELSIF v_appr.status = 'RESERVED' THEN
          v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_RESERVED_BEFORE_BEGIN');
        ELSIF v_appr.status = 'CONSUMED' THEN
          v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CONSUMED_BEFORE_BEGIN');
        END IF;
      END IF;

      IF v_appr.expires_at IS NOT NULL AND v_appr.expires_at <= now() THEN
        v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_EXPIRED_BEFORE_BEGIN');
      END IF;
      IF v_appr.approved_by IS NULL OR v_appr.approved_at IS NULL THEN
        v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_ACTOR_MISSING');
      END IF;

      IF v_appr.evidence_version IS DISTINCT FROM 'comm-hub-approval-evidence/v1'
         OR v_appr.canonical_approval_evidence_hash IS NULL THEN
        v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_EVIDENCE_MISSING_OR_LEGACY','evidence_version', v_appr.evidence_version);
      END IF;
    END IF;
  END IF;

  IF v_snap.id IS NOT NULL AND v_appr.id IS NOT NULL THEN
    IF v_snap.correlation_id IS NOT NULL
       AND v_appr.correlation_id_at_approval IS NOT NULL
       AND v_snap.correlation_id <> v_appr.correlation_id_at_approval THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_PREVIEW_CORRELATION_MISMATCH');
    END IF;
    IF v_snap.content_hash IS DISTINCT FROM v_appr.content_hash_at_approval THEN
      v_blockers := v_blockers || jsonb_build_object('code','CONTENT_HASH_MISMATCH');
    END IF;
    IF v_snap.recipient_set_hash IS DISTINCT FROM v_appr.recipient_set_hash_at_approval THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_RECIPIENT_HASH_MISMATCH');
    END IF;
    IF v_snap.template_version_id IS DISTINCT FROM v_appr.template_version_id_at_approval THEN
      v_blockers := v_blockers || jsonb_build_object('code','TEMPLATE_VERSION_MISMATCH');
    END IF;
    IF v_snap.certified_dependency_hash IS NOT NULL
       AND v_appr.configuration_hash_at_approval IS NOT NULL
       AND v_snap.certified_dependency_hash <> v_appr.configuration_hash_at_approval THEN
      v_blockers := v_blockers || jsonb_build_object('code','CONFIGURATION_HASH_MISMATCH');
    END IF;
    IF v_snap.certified_dependency_hash IS DISTINCT FROM v_snap.current_dependency_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','DEPENDENCY_HASH_DRIFT');
    END IF;

    v_correlation := v_snap.correlation_id;
  END IF;

  IF v_snap.id IS NOT NULL THEN
    v_ge := COALESCE(v_snap.governance_evidence,'{}'::jsonb);

    IF v_snap.placeholder_scanner_version IS DISTINCT FROM 'comm-hub-raw-placeholder-scanner/v2' THEN
      v_blockers := v_blockers || jsonb_build_object('code','SCANNER_VERSION_MISMATCH','detail', jsonb_build_object('scanner_version', v_snap.placeholder_scanner_version));
    END IF;

    v_placeholder_count := COALESCE(v_snap.raw_placeholder_count, -1);
    IF v_placeholder_count < 0 THEN
      v_blockers := v_blockers || jsonb_build_object('code','RAW_PLACEHOLDER_EVIDENCE_MISSING');
    ELSIF v_placeholder_count > 0 THEN
      v_blockers := v_blockers || jsonb_build_object('code','RAW_PLACEHOLDER_RESIDUE','detail', jsonb_build_object('count', v_placeholder_count));
    END IF;

    IF jsonb_typeof(v_ge->'malformed_braces') IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','MALFORMED_BRACE_EVIDENCE_MISSING');
    ELSE
      IF jsonb_typeof(v_ge->'malformed_braces'->'count') = 'number' THEN
        v_malformed_count := (v_ge->'malformed_braces'->>'count')::int;
      ELSIF jsonb_typeof(v_ge->'malformed_braces') = 'array' THEN
        v_malformed_count := jsonb_array_length(v_ge->'malformed_braces');
      ELSE
        v_malformed_count := 0;
      END IF;
      IF v_malformed_count > 0 THEN
        v_blockers := v_blockers || jsonb_build_object('code','MALFORMED_BRACES_PRESENT','detail', jsonb_build_object('count', v_malformed_count));
      END IF;
    END IF;

    IF jsonb_typeof(v_snap.renderer_unresolved_variables) IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','RENDERER_EVIDENCE_MISSING');
    ELSIF jsonb_typeof(v_snap.renderer_unresolved_variables) = 'array' THEN
      v_unresolved_count := jsonb_array_length(v_snap.renderer_unresolved_variables);
      IF v_unresolved_count > 0 THEN
        v_blockers := v_blockers || jsonb_build_object('code','RENDERER_UNRESOLVED_PRESENT','detail', jsonb_build_object('count', v_unresolved_count));
      END IF;
    ELSE
      v_blockers := v_blockers || jsonb_build_object('code','RENDERER_EVIDENCE_MISSING');
    END IF;

    IF jsonb_typeof(v_snap.unresolved_variables_normalised) IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','RESOLVER_EVIDENCE_MISSING');
    ELSIF jsonb_typeof(v_snap.unresolved_variables_normalised) = 'array' THEN
      v_required_unresolved_count := 0;
      FOR v_r IN SELECT jsonb_array_elements(v_snap.unresolved_variables_normalised) LOOP
        IF (v_r->>'required')::boolean IS TRUE THEN
          v_required_unresolved_count := v_required_unresolved_count + 1;
        END IF;
      END LOOP;
      IF v_required_unresolved_count > 0 THEN
        v_blockers := v_blockers || jsonb_build_object('code','RESOLVER_REQUIRED_UNRESOLVED','detail', jsonb_build_object('count', v_required_unresolved_count));
      END IF;
    ELSE
      v_blockers := v_blockers || jsonb_build_object('code','RESOLVER_EVIDENCE_MISSING');
    END IF;

    v_to_len  := CASE WHEN jsonb_typeof(v_snap.to_recipients)  = 'array' THEN jsonb_array_length(v_snap.to_recipients)  ELSE -1 END;
    v_cc_len  := CASE WHEN jsonb_typeof(v_snap.cc_recipients)  = 'array' THEN jsonb_array_length(v_snap.cc_recipients)  ELSE -1 END;
    v_bcc_len := CASE WHEN jsonb_typeof(v_snap.bcc_recipients) = 'array' THEN jsonb_array_length(v_snap.bcc_recipients) ELSE -1 END;

    IF v_to_len < 0 OR v_cc_len < 0 OR v_bcc_len < 0 THEN
      v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_FROZEN_RECIPIENT_EVIDENCE_INVALID');
      v_recipients_valid := false;
    ELSE
      v_recipient_count := v_to_len + v_cc_len + v_bcc_len;
      IF v_recipient_count = 0 OR COALESCE(v_snap.recipient_set_hash,'') = '' THEN
        v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_FROZEN_RECIPIENT_EVIDENCE_MISSING');
        v_recipients_valid := false;
      ELSE
        FOR v_r IN SELECT jsonb_array_elements(v_snap.to_recipients  || v_snap.cc_recipients || v_snap.bcc_recipients) LOOP
          v_addr := lower(btrim(coalesce(v_r->>'address_normalized', v_r->>'address','')));
          IF v_addr = '' OR position('@' in v_addr) = 0 THEN
            v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_RECIPIENT_ADDRESS_INVALID');
            v_recipients_valid := false;
            EXIT;
          END IF;
        END LOOP;
      END IF;
    END IF;
  END IF;

  v_ready := jsonb_array_length(v_blockers) = 0;

  IF v_ready THEN
    v_status := 'PREFLIGHT_READY';
    v_state  := 'PREFLIGHT';
  ELSE
    v_status := 'BLOCKED';
    v_state  := 'BLOCKED';
  END IF;

  v_evidence := jsonb_build_object(
    'authenticated', v_uid IS NOT NULL OR v_is_service,
    'authorized', v_is_service OR v_is_admin,
    'preview_snapshot_id', v_snap.id,
    'preview_snapshot_status', v_snap.status,
    'preview_expires_at', v_snap.expires_at,
    'preview_approval_id', v_appr.id,
    'preview_approval_status', v_appr.status,
    'approval_expires_at', v_appr.expires_at,
    'module_code', v_snap.module_code,'event_code', v_snap.event_code,'channel', v_snap.channel,
    'scope_module_code', v_module_norm,'scope_event_code', v_event_norm,'scope_channel', v_channel_norm,
    'preview_correlation_id', v_snap.correlation_id,
    'approval_correlation_id_at_approval', v_appr.correlation_id_at_approval,
    'authoritative_correlation_id', v_correlation,
    'correlation_match', (v_snap.correlation_id IS NOT NULL
                          AND v_appr.correlation_id_at_approval IS NOT NULL
                          AND v_snap.correlation_id = v_appr.correlation_id_at_approval),
    'content_hash_match', (v_snap.content_hash IS NOT DISTINCT FROM v_appr.content_hash_at_approval),
    'recipient_hash_match', (v_snap.recipient_set_hash IS NOT DISTINCT FROM v_appr.recipient_set_hash_at_approval),
    'template_version_match', (v_snap.template_version_id IS NOT DISTINCT FROM v_appr.template_version_id_at_approval),
    'configuration_hash_present', (COALESCE(v_snap.certified_dependency_hash,'')<>'' AND COALESCE(v_appr.configuration_hash_at_approval,'')<>''),
    'configuration_hash_match', (v_snap.certified_dependency_hash IS NOT DISTINCT FROM v_appr.configuration_hash_at_approval),
    'dependency_hash_drift', (v_snap.certified_dependency_hash IS DISTINCT FROM v_snap.current_dependency_hash),
    'scanner_version', v_snap.placeholder_scanner_version,
    'raw_placeholder_count', v_placeholder_count,
    'malformed_brace_count', v_malformed_count,
    'renderer_unresolved_count', v_unresolved_count,
    'resolver_required_unresolved_count', v_required_unresolved_count,
    'approval_evidence_version', v_appr.evidence_version,
    'approval_canonical_hash_present', v_appr.canonical_approval_evidence_hash IS NOT NULL,
    'approval_canonical_hash_valid', v_appr.canonical_approval_evidence_hash IS NOT NULL,
    'stored_canonical_hash_short', left(coalesce(v_appr.canonical_approval_evidence_hash,''), 12),
    'frozen_recipient_snapshot_available', v_recipients_valid AND COALESCE(v_snap.recipient_set_hash,'')<>'',
    'recipient_count', v_recipient_count,
    'recipient_to_count', v_to_len,
    'recipient_cc_count', v_cc_len,
    'recipient_bcc_count', v_bcc_len,
    'predicted_start_dry_run_blockers', v_blockers
  );

  RETURN jsonb_build_object(
    'contract_version','comm-hub-dry-run-contract/v1',
    'status', v_status,
    'state',  v_state,
    'passed', false,
    'stage_succeeded', v_ready,
    'terminal', NOT v_ready,
    'idempotent_replay', false,
    'failure_stage', CASE WHEN v_ready THEN null ELSE 'PREFLIGHT' END,
    'message', CASE WHEN v_ready THEN 'Preflight ready — safe to begin.' ELSE 'Preflight blocked before mutation.' END,
    'validated_at', now(),
    'execution_deadline_at', null,
    'correlation_id', v_correlation,
    'preview_snapshot_id', v_snap.id,
    'preview_approval_id', v_appr.id,
    'dry_run_execution_id', null,'execution_no', null,
    'request_id', null,'request_number', null,
    'message_id', null,'trace_id', null,
    'dry_run_certification_id', null,'certification_expires_at', null,
    'recipient_count', v_recipient_count,
    'blockers', v_blockers,
    'warnings','[]'::jsonb,
    'transition_log_ids','[]'::jsonb,
    'mutation_started', false,
    'execution_created', false,
    'request_created', false,
    'message_created', false,
    'created_this_call', false,
    'cleanup_proven', true,
    'provider_call_attempted', false,
    'simulator_call_attempted', false,
    'ambiguous_outcome', false,
    'retry_safe', true,
    'retry_reason', CASE WHEN v_ready THEN 'SAFE_TO_PROCEED' ELSE 'PRE_MUTATION_VALIDATION_FAILURE' END,
    'evidence', v_evidence,
    'evaluator_version','comm-hub-dry-run-preflight/v1');
END $function$;

REVOKE ALL ON FUNCTION public.inspect_comm_hub_dry_run_preflight(uuid, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inspect_comm_hub_dry_run_preflight(uuid, uuid, text, text, text) TO authenticated, service_role;
