
-- ============================================================================
-- PHASE 4B3 FOUNDATION CLOSURE — Part 1 (predicates, service-op, uniqueness, grant helpers)
-- ============================================================================

-- ---------- A. Preview runtime-evidence predicate ---------------------------
DROP FUNCTION IF EXISTS public.check_comm_hub_preview_runtime_evidence(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.check_comm_hub_preview_runtime_evidence(
  p_snapshot_id             uuid,
  p_module_code             text,
  p_event_code              text,
  p_channel                 text,
  p_correlation_id          uuid,
  p_expected_content_hash   text,
  p_expected_recipient_hash text,
  p_expected_template_version_id uuid,
  p_expected_configuration_hash  text,
  p_transition_stage        text
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_snap record; v_ge jsonb; v_blockers jsonb := '[]'::jsonb; v_expected text[];
BEGIN
  IF p_snapshot_id IS NULL THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','PREVIEW_SNAPSHOT_MISSING','message','Preview snapshot id required')));
  END IF;

  SELECT id,status,module_code,event_code,channel,expires_at,
         placeholder_scanner_version,raw_placeholder_count,renderer_unresolved_variables,
         correlation_id,content_hash,recipient_set_hash,template_version_id,
         certified_dependency_hash,current_dependency_hash,governance_evidence
    INTO v_snap FROM public.communication_preview_snapshot WHERE id = p_snapshot_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','PREVIEW_SNAPSHOT_MISSING','message','Preview snapshot not found')));
  END IF;

  v_ge := COALESCE(v_snap.governance_evidence,'{}'::jsonb);
  v_expected := ARRAY['PREPARED'];

  IF NOT (v_snap.status = ANY(v_expected)) THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_STATUS_INVALID','message','Snapshot status not acceptable',
      'detail',jsonb_build_object('status',v_snap.status));
  END IF;
  IF v_snap.status='EXPIRED' OR (v_snap.expires_at IS NOT NULL AND v_snap.expires_at<now()) THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_EXPIRED','message','Preview snapshot expired');
  END IF;
  IF v_snap.status='SUPERSEDED' THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_SUPERSEDED','message','Preview snapshot superseded');
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
    v_blockers := v_blockers || jsonb_build_object('code','SCANNER_VERSION_MISMATCH','message','Scanner version must be exactly comm-hub-raw-placeholder-scanner/v2',
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
  IF NOT (v_ge ? 'renderer') THEN v_blockers := v_blockers || jsonb_build_object('code','RENDERER_EVIDENCE_MISSING','message','Renderer evidence missing'); END IF;
  IF NOT (v_ge ? 'resolver') THEN v_blockers := v_blockers || jsonb_build_object('code','RESOLVER_EVIDENCE_MISSING','message','Resolver evidence missing'); END IF;

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

  RETURN jsonb_build_object('allowed', jsonb_array_length(v_blockers)=0, 'blockers', v_blockers,
    'evidence', jsonb_build_object('snapshot_id',v_snap.id,'content_hash',v_snap.content_hash,
      'recipient_set_hash',v_snap.recipient_set_hash,'template_version_id',v_snap.template_version_id,
      'certified_dependency_hash',v_snap.certified_dependency_hash,'correlation_id',v_snap.correlation_id,
      'scanner_version',v_snap.placeholder_scanner_version,'evaluator_version','4b3.slice2.predicate'));
END; $$;

REVOKE ALL ON FUNCTION public.check_comm_hub_preview_runtime_evidence(uuid,text,text,text,uuid,text,text,uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_comm_hub_preview_runtime_evidence(uuid,text,text,text,uuid,text,text,uuid,text,text) TO authenticated, service_role;

-- ---------- B. Binding helpers ---------------------------------------------
DROP FUNCTION IF EXISTS public.check_comm_hub_preview_approval_binding CASCADE;

CREATE FUNCTION public.check_comm_hub_preview_approval_binding(
  p_preview_approval_id       uuid,
  p_preview_snapshot_id       uuid,
  p_expected_correlation_id   uuid,
  p_expected_content_hash     text,
  p_expected_recipient_hash   text,
  p_expected_configuration_hash text
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_a record; v_snap record; v_blockers jsonb := '[]'::jsonb;
BEGIN
  IF p_preview_approval_id IS NULL THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','PREVIEW_APPROVAL_MISSING','message','Approval id required')));
  END IF;
  SELECT id,snapshot_id,status,expires_at,content_hash_at_approval,approved_by
    INTO v_a FROM public.communication_preview_approval WHERE id = p_preview_approval_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','PREVIEW_APPROVAL_MISSING','message','Approval not found')));
  END IF;
  IF v_a.status <> 'ACTIVE' THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_STATUS_INVALID','message','Approval not ACTIVE','detail',jsonb_build_object('status',v_a.status));
  END IF;
  IF v_a.expires_at IS NOT NULL AND v_a.expires_at<now() THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_EXPIRED','message','Approval expired');
  END IF;
  IF v_a.snapshot_id IS DISTINCT FROM p_preview_snapshot_id THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_SNAPSHOT_MISMATCH','message','Approval snapshot mismatch');
  END IF;
  IF v_a.approved_by IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_ACTOR_MISSING','message','Approver missing');
  END IF;

  SELECT correlation_id,content_hash,recipient_set_hash,certified_dependency_hash
    INTO v_snap FROM public.communication_preview_snapshot WHERE id = p_preview_snapshot_id;
  IF NOT FOUND THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_MISSING','message','Approval snapshot not found');
  ELSE
    IF p_expected_correlation_id IS NOT NULL AND v_snap.correlation_id IS DISTINCT FROM p_expected_correlation_id THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CORRELATION_MISMATCH','message','Correlation mismatch');
    END IF;
    IF v_a.content_hash_at_approval IS DISTINCT FROM v_snap.content_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CONTENT_HASH_DRIFT','message','content_hash_at_approval drifted from snapshot');
    END IF;
    IF p_expected_content_hash IS NOT NULL AND v_a.content_hash_at_approval <> p_expected_content_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CONTENT_HASH_MISMATCH','message','content_hash mismatch');
    END IF;
    IF p_expected_recipient_hash IS NOT NULL AND v_snap.recipient_set_hash <> p_expected_recipient_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_RECIPIENT_HASH_MISMATCH','message','recipient_set_hash mismatch');
    END IF;
    IF p_expected_configuration_hash IS NOT NULL AND v_snap.certified_dependency_hash <> p_expected_configuration_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CONFIGURATION_HASH_MISMATCH','message','certified_dependency_hash mismatch');
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', jsonb_array_length(v_blockers)=0, 'blockers', v_blockers,
    'evidence', jsonb_build_object('approval_id',v_a.id,'snapshot_id',v_a.snapshot_id,'approved_by',v_a.approved_by,
      'content_hash_at_approval',v_a.content_hash_at_approval,'evaluator_version','4b3.slice2.approval'));
END; $$;

REVOKE ALL ON FUNCTION public.check_comm_hub_preview_approval_binding(uuid,uuid,uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_comm_hub_preview_approval_binding(uuid,uuid,uuid,text,text,text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.check_comm_hub_dry_run_certification_binding CASCADE;

CREATE FUNCTION public.check_comm_hub_dry_run_certification_binding(
  p_dry_run_certification_id uuid,
  p_dry_run_execution_id     uuid,
  p_preview_approval_id      uuid,
  p_preview_snapshot_id      uuid,
  p_expected_correlation_id  uuid
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_c record; v_e record; v_corr uuid; v_blockers jsonb := '[]'::jsonb;
BEGIN
  IF p_dry_run_certification_id IS NULL THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','DRY_RUN_CERTIFICATION_MISSING','message','Certification id required')));
  END IF;
  SELECT id,status,preview_snapshot_id,preview_approval_id,superseded_by,invalidated_at
    INTO v_c FROM public.communication_dry_run_certification WHERE id = p_dry_run_certification_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','DRY_RUN_CERTIFICATION_MISSING','message','Certification not found')));
  END IF;
  IF v_c.status <> 'ACTIVE' THEN
    v_blockers := v_blockers || jsonb_build_object('code','CERTIFICATION_STATUS_INVALID','message','Not ACTIVE','detail',jsonb_build_object('status',v_c.status));
  END IF;
  IF v_c.superseded_by IS NOT NULL OR v_c.invalidated_at IS NOT NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','CERTIFICATION_SUPERSEDED_OR_INVALIDATED','message','Superseded or invalidated');
  END IF;

  SELECT id,preview_snapshot_id,preview_approval_id,certification_id
    INTO v_e FROM public.communication_dry_run_execution WHERE id = p_dry_run_execution_id;
  IF NOT FOUND THEN
    v_blockers := v_blockers || jsonb_build_object('code','DRY_RUN_EXECUTION_MISSING','message','Execution not found');
  ELSE
    IF v_e.certification_id IS DISTINCT FROM v_c.id THEN
      v_blockers := v_blockers || jsonb_build_object('code','CERTIFICATION_EXECUTION_MISMATCH','message','Execution/cert mismatch');
    END IF;
    IF v_e.preview_approval_id IS DISTINCT FROM p_preview_approval_id THEN
      v_blockers := v_blockers || jsonb_build_object('code','EXECUTION_APPROVAL_MISMATCH','message','Execution/approval mismatch');
    END IF;
    IF v_e.preview_snapshot_id IS DISTINCT FROM p_preview_snapshot_id THEN
      v_blockers := v_blockers || jsonb_build_object('code','EXECUTION_SNAPSHOT_MISMATCH','message','Execution/snapshot mismatch');
    END IF;
  END IF;
  IF v_c.preview_snapshot_id IS DISTINCT FROM p_preview_snapshot_id THEN
    v_blockers := v_blockers || jsonb_build_object('code','CERTIFICATION_SNAPSHOT_MISMATCH','message','Cert/snapshot mismatch');
  END IF;
  IF v_c.preview_approval_id IS DISTINCT FROM p_preview_approval_id THEN
    v_blockers := v_blockers || jsonb_build_object('code','CERTIFICATION_APPROVAL_MISMATCH','message','Cert/approval mismatch');
  END IF;
  IF p_expected_correlation_id IS NOT NULL THEN
    SELECT correlation_id INTO v_corr FROM public.communication_preview_snapshot WHERE id = p_preview_snapshot_id;
    IF v_corr IS DISTINCT FROM p_expected_correlation_id THEN
      v_blockers := v_blockers || jsonb_build_object('code','CERTIFICATION_CORRELATION_MISMATCH','message','Correlation mismatch');
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', jsonb_array_length(v_blockers)=0, 'blockers', v_blockers,
    'evidence', jsonb_build_object('certification_id',v_c.id,'execution_id',p_dry_run_execution_id,'evaluator_version','4b3.slice2.dryrun_cert'));
END; $$;

REVOKE ALL ON FUNCTION public.check_comm_hub_dry_run_certification_binding(uuid,uuid,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_comm_hub_dry_run_certification_binding(uuid,uuid,uuid,uuid,uuid) TO authenticated, service_role;

-- ---------- D. assert_comm_hub_service_operation ----------------------------
DROP FUNCTION IF EXISTS public.assert_comm_hub_service_operation(text,text,text);
DROP FUNCTION IF EXISTS public.assert_comm_hub_service_operation(text,text);
DROP FUNCTION IF EXISTS public.assert_comm_hub_service_operation(text);

CREATE FUNCTION public.assert_comm_hub_service_operation(
  p_operation text, p_expected_transition text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_jwt json; v_role text; v_service text; v_row record;
BEGIN
  BEGIN v_jwt := current_setting('request.jwt.claims', true)::json;
  EXCEPTION WHEN OTHERS THEN v_jwt := NULL; END;
  v_role := coalesce(v_jwt->>'role','');
  IF v_role <> 'service_role' THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','SERVICE_ROLE_REQUIRED','message','JWT role must be service_role')));
  END IF;
  v_service := coalesce(v_jwt->>'service_account_id', v_jwt->>'iss', '');
  IF v_service = '' THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','SERVICE_OPERATION_IDENTITY_REQUIRED','message','Service identity not derivable from JWT')));
  END IF;
  IF p_operation IS NULL OR p_operation='' THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','SERVICE_OPERATION_UNKNOWN','message','Operation not supplied')));
  END IF;
  SELECT service_account,operation,active INTO v_row
    FROM public.comm_hub_service_operation_allowlist
   WHERE service_account = v_service AND operation = p_operation AND active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','SERVICE_OPERATION_UNKNOWN','message','Operation not in allowlist for this service identity',
        'detail',jsonb_build_object('service',v_service,'operation',p_operation))));
  END IF;
  IF p_expected_transition IS NOT NULL AND p_expected_transition<>''
     AND position(p_expected_transition in p_operation) = 0
     AND position(split_part(p_expected_transition,'_',1) in p_operation) = 0 THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','SERVICE_OPERATION_NOT_ALLOWED_FOR_TRANSITION',
        'message','Operation not compatible with transition',
        'detail',jsonb_build_object('operation',p_operation,'transition',p_expected_transition))));
  END IF;
  RETURN jsonb_build_object('allowed',true,'blockers','[]'::jsonb,
    'evidence',jsonb_build_object('service_account',v_service,'operation',p_operation));
END; $$;

REVOKE ALL ON FUNCTION public.assert_comm_hub_service_operation(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_comm_hub_service_operation(text,text) TO service_role;

-- ---------- F. Uniqueness (additive) ---------------------------------------
DO $$ DECLARE v_dup int; BEGIN
  SELECT count(*) INTO v_dup FROM (
    SELECT preview_snapshot_id,content_hash FROM public.communication_dry_run_certification
     WHERE status='ACTIVE' AND preview_snapshot_id IS NOT NULL AND content_hash IS NOT NULL
     GROUP BY 1,2 HAVING count(*)>1
  ) t;
  IF v_dup = 0 THEN
    EXECUTE $ix$CREATE UNIQUE INDEX IF NOT EXISTS uq_dry_run_cert_active_evidence
      ON public.communication_dry_run_certification (preview_snapshot_id, content_hash)
      WHERE status='ACTIVE' AND preview_snapshot_id IS NOT NULL AND content_hash IS NOT NULL$ix$;
  ELSE
    RAISE NOTICE 'Skipped uq_dry_run_cert_active_evidence: % dupes exist', v_dup;
  END IF;
END $$;

DO $$ DECLARE v_dup int; BEGIN
  SELECT count(*) INTO v_dup FROM (
    SELECT execution_id FROM public.communication_controlled_live_grant GROUP BY 1 HAVING count(*)>1
  ) t;
  IF v_dup = 0 THEN
    EXECUTE $ix$CREATE UNIQUE INDEX IF NOT EXISTS uq_cclg_all_status_per_execution
      ON public.communication_controlled_live_grant (execution_id)$ix$;
  ELSE
    RAISE NOTICE 'Skipped uq_cclg_all_status_per_execution: % dupes exist', v_dup;
  END IF;
END $$;

-- ---------- E. Grant lifecycle helpers (new signatures, coexist with legacy) --
CREATE OR REPLACE FUNCTION public.reserve_comm_hub_controlled_live_grant(
  p_grant_id uuid, p_execution_id uuid, p_expected_action text,
  p_expected_correlation_id uuid, p_service_operation text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_svc jsonb; v_g record;
BEGIN
  v_svc := public.assert_comm_hub_service_operation(p_service_operation, 'START_CONTROLLED_STUB');
  IF NOT (v_svc->>'allowed')::bool THEN RETURN jsonb_build_object('allowed',false,'blockers',v_svc->'blockers'); END IF;

  SELECT g.*, s.correlation_id AS snap_correlation INTO v_g
    FROM public.communication_controlled_live_grant g
    JOIN public.communication_preview_approval a ON a.id=g.preview_approval_id
    JOIN public.communication_preview_snapshot s ON s.id=a.snapshot_id
   WHERE g.id = p_grant_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed',false,'blockers',
    jsonb_build_array(jsonb_build_object('code','GRANT_NOT_FOUND','message','Grant not found'))); END IF;

  IF v_g.execution_id IS DISTINCT FROM p_execution_id THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_EXECUTION_MISMATCH','message','Execution mismatch'))); END IF;
  IF v_g.expires_at IS NOT NULL AND v_g.expires_at<now() THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_EXPIRED','message','Expired'))); END IF;
  IF v_g.status::text = 'RESERVED' THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_ALREADY_RESERVED','message','Already reserved'))); END IF;
  IF v_g.status::text = 'CONSUMED' THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_ALREADY_CONSUMED','message','Already consumed'))); END IF;
  IF v_g.status::text = 'REVOKED' THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_REVOKED','message','Revoked'))); END IF;
  IF v_g.status::text <> 'ISSUED' THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_STATE_INVALID','message','Not ISSUED','detail',jsonb_build_object('status',v_g.status)))); END IF;
  IF p_expected_action IS NOT NULL AND p_expected_action <> 'RUN_CONTROLLED_STUB' THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_ACTION_MISMATCH','message','Only RUN_CONTROLLED_STUB supported'))); END IF;
  IF p_expected_correlation_id IS NOT NULL AND v_g.snap_correlation IS DISTINCT FROM p_expected_correlation_id THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_CORRELATION_MISMATCH','message','Correlation mismatch'))); END IF;

  UPDATE public.communication_controlled_live_grant
     SET status='RESERVED', reserved_at=now(), updated_at=now() WHERE id=v_g.id;
  RETURN jsonb_build_object('allowed',true,'grant_id',v_g.id,'status','RESERVED');
END; $$;

REVOKE ALL ON FUNCTION public.reserve_comm_hub_controlled_live_grant(uuid,uuid,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_comm_hub_controlled_live_grant(uuid,uuid,text,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_comm_hub_controlled_live_grant(
  p_grant_id uuid, p_execution_id uuid, p_message_id uuid,
  p_expected_correlation_id uuid, p_service_operation text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_svc jsonb; v_g record; v_msg_exec uuid; v_success int;
BEGIN
  v_svc := public.assert_comm_hub_service_operation(p_service_operation, 'DISPATCH_CONTROLLED_STUB');
  IF NOT (v_svc->>'allowed')::bool THEN RETURN jsonb_build_object('allowed',false,'blockers',v_svc->'blockers'); END IF;
  SELECT g.*, s.correlation_id AS snap_correlation INTO v_g
    FROM public.communication_controlled_live_grant g
    JOIN public.communication_preview_approval a ON a.id=g.preview_approval_id
    JOIN public.communication_preview_snapshot s ON s.id=a.snapshot_id
   WHERE g.id = p_grant_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed',false,'blockers',
    jsonb_build_array(jsonb_build_object('code','GRANT_NOT_FOUND','message','Grant not found'))); END IF;
  IF v_g.status::text <> 'RESERVED' THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_STATE_INVALID','message','Not RESERVED','detail',jsonb_build_object('status',v_g.status)))); END IF;
  IF v_g.execution_id IS DISTINCT FROM p_execution_id THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_EXECUTION_MISMATCH','message','Execution mismatch'))); END IF;
  IF p_expected_correlation_id IS NOT NULL AND v_g.snap_correlation IS DISTINCT FROM p_expected_correlation_id THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_CORRELATION_MISMATCH','message','Correlation mismatch'))); END IF;
  IF p_message_id IS NULL THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_MESSAGE_BINDING_MISMATCH','message','Message id required'))); END IF;
  SELECT controlled_live_execution_id INTO v_msg_exec FROM public.communication_message WHERE id = p_message_id;
  IF v_msg_exec IS DISTINCT FROM p_execution_id THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_MESSAGE_BINDING_MISMATCH','message','Message not bound to execution'))); END IF;
  SELECT count(*) INTO v_success FROM public.communication_delivery_attempt
    WHERE message_id = p_message_id AND status='SUCCESS';
  IF v_success <> 1 THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_MESSAGE_BINDING_MISMATCH','message','Message must have exactly one SUCCESS attempt','detail',jsonb_build_object('count',v_success)))); END IF;
  UPDATE public.communication_controlled_live_grant
     SET status='CONSUMED', consumed_at=now(), updated_at=now() WHERE id=v_g.id;
  RETURN jsonb_build_object('allowed',true,'grant_id',v_g.id,'status','CONSUMED');
END; $$;

REVOKE ALL ON FUNCTION public.consume_comm_hub_controlled_live_grant(uuid,uuid,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_comm_hub_controlled_live_grant(uuid,uuid,uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.revoke_comm_hub_controlled_live_grant(
  p_grant_id uuid, p_execution_id uuid, p_reason text, p_service_operation text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_svc jsonb; v_g record;
BEGIN
  v_svc := public.assert_comm_hub_service_operation(p_service_operation, 'REVOKE_GRANT');
  IF NOT (v_svc->>'allowed')::bool THEN RETURN jsonb_build_object('allowed',false,'blockers',v_svc->'blockers'); END IF;
  IF p_reason IS NULL OR btrim(p_reason)='' THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_SERVICE_OPERATION_DENIED','message','Reason required'))); END IF;
  SELECT * INTO v_g FROM public.communication_controlled_live_grant WHERE id = p_grant_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed',false,'blockers',
    jsonb_build_array(jsonb_build_object('code','GRANT_NOT_FOUND','message','Grant not found'))); END IF;
  IF v_g.execution_id IS DISTINCT FROM p_execution_id THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_EXECUTION_MISMATCH','message','Execution mismatch'))); END IF;
  IF v_g.status::text NOT IN ('ISSUED','RESERVED') THEN
    RETURN jsonb_build_object('allowed',false,'blockers',
      jsonb_build_array(jsonb_build_object('code','GRANT_STATE_INVALID','message','Not revocable','detail',jsonb_build_object('status',v_g.status)))); END IF;
  UPDATE public.communication_controlled_live_grant
     SET status='REVOKED', revoked_at=now(), revocation_reason=p_reason, updated_at=now() WHERE id=v_g.id;
  RETURN jsonb_build_object('allowed',true,'grant_id',v_g.id,'status','REVOKED');
END; $$;

REVOKE ALL ON FUNCTION public.revoke_comm_hub_controlled_live_grant(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_comm_hub_controlled_live_grant(uuid,uuid,text,text) TO service_role;

-- Seed REVOKE_GRANT allowlist rows only for service identities already registered.
INSERT INTO public.comm_hub_service_operation_allowlist (service_account, operation, reason, active)
SELECT DISTINCT service_account, 'REVOKE_GRANT', 'Auto-added for grant lifecycle revoke helper', true
  FROM public.comm_hub_service_operation_allowlist
 WHERE operation IN ('DISPATCH_CONTROLLED_STUB','PROCESS_DRY_RUN','CLAIM_TARGETED_MESSAGE','START_CONTROLLED_STUB')
ON CONFLICT (service_account, operation) DO NOTHING;
