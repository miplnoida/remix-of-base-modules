
-- FIXTURE COMPATIBILITY CHECKER (READ-ONLY)
CREATE OR REPLACE FUNCTION public.check_comm_hub_event_fixture_compatibility(
  p_module_code text, p_event_code text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_module text := upper(coalesce(p_module_code,''));
  v_event  text := upper(coalesce(p_event_code,''));
  v_schema jsonb;
  v_schema_enforced boolean := false;
  v_contract_enforced boolean := false;
  v_fixtures record;
  v_var record;
  v_missing_paths jsonb := '[]'::jsonb;
  v_unresolved jsonb := '[]'::jsonb;
  v_required_missing jsonb := '[]'::jsonb;
  v_scenario_reports jsonb := '[]'::jsonb;
  v_scenario_report jsonb;
  v_json_ptr jsonb;
  v_seg text;
  v_path_segments text[];
  v_scenario_count int := 0;
  v_compatible_count int := 0;
  v_ok boolean;
BEGIN
  -- schema
  SELECT payload_schema, is_enforced INTO v_schema, v_schema_enforced
  FROM communication_hub_event_payload_schema
  WHERE module_code=v_module AND event_code=v_event AND is_active=true
  ORDER BY version DESC LIMIT 1;

  SELECT bool_or(is_enforced) INTO v_contract_enforced
  FROM communication_hub_template_variable_contract
  WHERE module_code=v_module AND event_code=v_event AND is_active=true;

  -- iterate scenarios
  FOR v_fixtures IN
    SELECT id, scenario_code, event_payload_fixture, recipient_context_fixture
      FROM communication_hub_event_test_scenario
     WHERE module_code=v_module AND event_code=v_event AND is_active=true
  LOOP
    v_scenario_count := v_scenario_count + 1;
    v_missing_paths := '[]'::jsonb;
    v_required_missing := '[]'::jsonb;

    -- For each variable contract entry: walk canonical_path over the correct source
    FOR v_var IN
      SELECT variable_name, canonical_path, source_type, is_required
        FROM communication_hub_template_variable_contract
       WHERE module_code=v_module AND event_code=v_event AND is_active=true
    LOOP
      v_path_segments := string_to_array(v_var.canonical_path,'.');
      v_json_ptr := CASE v_var.source_type
        WHEN 'event_payload' THEN v_fixtures.event_payload_fixture
        WHEN 'recipient_context' THEN COALESCE(v_fixtures.recipient_context_fixture,'{}'::jsonb)
        WHEN 'request_context' THEN '{"request_no":"REQ-STUB","reference":"REF-STUB"}'::jsonb
        WHEN 'system_context' THEN jsonb_build_object('generated_at', now())
        ELSE NULL END;
      v_ok := v_json_ptr IS NOT NULL;
      IF v_ok THEN
        FOREACH v_seg IN ARRAY v_path_segments LOOP
          IF v_json_ptr IS NULL OR jsonb_typeof(v_json_ptr) <> 'object'
             OR NOT (v_json_ptr ? v_seg) THEN
            v_ok := false; EXIT;
          END IF;
          v_json_ptr := v_json_ptr -> v_seg;
        END LOOP;
        IF v_ok AND (v_json_ptr IS NULL OR jsonb_typeof(v_json_ptr) = 'null') THEN
          v_ok := false;
        END IF;
      END IF;
      IF NOT v_ok THEN
        v_missing_paths := v_missing_paths || jsonb_build_object(
          'variable', v_var.variable_name,
          'source_type', v_var.source_type,
          'canonical_path', v_var.canonical_path,
          'is_required', v_var.is_required);
        IF v_var.is_required THEN
          v_required_missing := v_required_missing || to_jsonb(v_var.variable_name);
        END IF;
      END IF;
    END LOOP;

    v_scenario_report := jsonb_build_object(
      'scenario_id', v_fixtures.id,
      'scenario_code', v_fixtures.scenario_code,
      'missing_variable_paths', v_missing_paths,
      'required_missing', v_required_missing,
      'compatible', (jsonb_array_length(v_required_missing) = 0));
    v_scenario_reports := v_scenario_reports || v_scenario_report;
    IF (jsonb_array_length(v_required_missing) = 0) THEN
      v_compatible_count := v_compatible_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'module_code', v_module,
    'event_code', v_event,
    'schema_present', v_schema IS NOT NULL,
    'schema_enforced', COALESCE(v_schema_enforced,false),
    'contract_enforced', COALESCE(v_contract_enforced,false),
    'scenario_count', v_scenario_count,
    'compatible_scenario_count', v_compatible_count,
    'is_compatible', (v_scenario_count > 0 AND v_scenario_count = v_compatible_count),
    'scenarios', v_scenario_reports,
    'evaluated_at', now());
END;$$;
GRANT EXECUTE ON FUNCTION public.check_comm_hub_event_fixture_compatibility(text,text) TO authenticated, service_role;

-- SENDER READINESS COMPUTER
CREATE OR REPLACE FUNCTION public.compute_comm_hub_sender_readiness(
  p_sender_profile_id uuid,
  p_readiness_kind text DEFAULT 'TEST_READY'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v record;
  v_kind text := upper(coalesce(p_readiness_kind,'TEST_READY'));
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_advisories jsonb := '[]'::jsonb;
  v_status text;
  v_reason text;
  v_hash text;
  v_verif_ver text;
  v_evidence jsonb;
  v_expires timestamptz;
  v_result_id uuid;
BEGIN
  IF v_kind NOT IN ('TEST_READY','REAL_EMAIL_READY') THEN
    RAISE EXCEPTION 'SENDER_READINESS_KIND_UNSUPPORTED: %', v_kind;
  END IF;

  SELECT id, sender_code, sender_status, from_email, from_name, provider_channel,
         auth_domain_verified, spf_status, dkim_status, dmarc_status, updated_at
    INTO v
  FROM communication_hub_sender_profile
  WHERE id = p_sender_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SENDER_PROFILE_NOT_FOUND: %', p_sender_profile_id;
  END IF;

  -- Configuration
  IF v.from_email IS NULL OR trim(v.from_email)='' THEN
    v_blockers := v_blockers || jsonb_build_object('code','from_email_missing','severity','BLOCKER','stage','SENDER');
  END IF;
  IF v.provider_channel IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','provider_channel_missing','severity','BLOCKER','stage','SENDER');
  END IF;
  IF v.sender_status IS DISTINCT FROM 'verified' THEN
    v_blockers := v_blockers || jsonb_build_object('code','sender_not_verified','severity','BLOCKER','stage','SENDER','detail',v.sender_status);
  END IF;

  -- Domain / DKIM / SPF / DMARC evidence
  IF v.spf_status IS DISTINCT FROM 'pass' THEN
    IF v_kind='REAL_EMAIL_READY' THEN
      v_blockers := v_blockers || jsonb_build_object('code','spf_not_passing','severity','BLOCKER');
    ELSE
      v_warnings := v_warnings || jsonb_build_object('code','spf_not_passing','severity','WARNING');
    END IF;
  END IF;
  IF v.dkim_status IS DISTINCT FROM 'pass' THEN
    IF v_kind='REAL_EMAIL_READY' THEN
      v_blockers := v_blockers || jsonb_build_object('code','dkim_not_passing','severity','BLOCKER');
    ELSE
      v_warnings := v_warnings || jsonb_build_object('code','dkim_not_passing','severity','WARNING');
    END IF;
  END IF;
  IF v.dmarc_status IS DISTINCT FROM 'pass' THEN
    IF v_kind='REAL_EMAIL_READY' THEN
      v_warnings := v_warnings || jsonb_build_object('code','dmarc_not_passing','severity','WARNING');
    ELSE
      v_advisories := v_advisories || jsonb_build_object('code','dmarc_not_passing','severity','ADVISORY');
    END IF;
  END IF;
  IF NOT COALESCE(v.auth_domain_verified,false) THEN
    IF v_kind='REAL_EMAIL_READY' THEN
      v_blockers := v_blockers || jsonb_build_object('code','auth_domain_not_verified','severity','BLOCKER');
    ELSE
      v_warnings := v_warnings || jsonb_build_object('code','auth_domain_not_verified','severity','WARNING');
    END IF;
  END IF;

  -- Status resolution
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_blockers) x
             WHERE x->>'code' IN ('from_email_missing','provider_channel_missing')) THEN
    v_status := 'BLOCKED_CONFIGURATION';
    v_reason := 'Sender lacks required configuration.';
  ELSIF jsonb_array_length(v_blockers) > 0 THEN
    v_status := 'BLOCKED_VERIFICATION';
    v_reason := 'Sender verification evidence insufficient for '||v_kind||'.';
  ELSIF v_kind='REAL_EMAIL_READY' THEN
    v_status := 'REAL_EMAIL_READY';
    v_reason := 'Sender meets real-email verification requirements.';
  ELSE
    v_status := 'TEST_READY';
    v_reason := 'Sender meets test-mode requirements.';
  END IF;

  v_verif_ver := md5(coalesce(v.spf_status,'')||'|'||coalesce(v.dkim_status,'')||'|'||coalesce(v.dmarc_status,'')||'|'||coalesce(v.auth_domain_verified::text,'')||'|'||coalesce(v.sender_status,''));
  v_evidence := jsonb_build_object(
    'sender_code', v.sender_code,
    'sender_status', v.sender_status,
    'from_email', v.from_email,
    'provider_channel', v.provider_channel,
    'spf_status', v.spf_status,
    'dkim_status', v.dkim_status,
    'dmarc_status', v.dmarc_status,
    'auth_domain_verified', v.auth_domain_verified,
    'readiness_kind', v_kind);
  v_hash := md5(v_evidence::text);
  v_expires := now() + interval '30 days';

  INSERT INTO comm_hub_sender_readiness(
    id, sender_profile_id, sender_code, computed_at, status, blockers, warnings, advisories,
    readiness_kind, verification_evidence_version, provider_code, evidence_hash, expires_at,
    computed_by, reason)
  VALUES (
    gen_random_uuid(), v.id, v.sender_code, now(), v_status::comm_hub_sender_readiness_state,
    v_blockers, v_warnings, v_advisories, v_kind, v_verif_ver, v.provider_channel, v_hash, v_expires,
    auth.uid(), v_reason)
  RETURNING id INTO v_result_id;

  RETURN jsonb_build_object(
    'readiness_id', v_result_id,
    'sender_profile_id', v.id,
    'sender_code', v.sender_code,
    'readiness_kind', v_kind,
    'status', v_status,
    'reason', v_reason,
    'blockers', v_blockers,
    'warnings', v_warnings,
    'advisories', v_advisories,
    'evidence_hash', v_hash,
    'evidence_version', v_verif_ver,
    'expires_at', v_expires,
    'evidence', v_evidence);
END;$$;

GRANT EXECUTE ON FUNCTION public.compute_comm_hub_sender_readiness(uuid,text) TO authenticated, service_role;
