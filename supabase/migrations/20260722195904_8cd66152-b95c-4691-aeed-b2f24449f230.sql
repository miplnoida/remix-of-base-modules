
-- Small patch to runner: replace digest() call with existing helper.
DO $$
DECLARE v_src text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_src FROM pg_proc
   WHERE proname='run_comm_hub_go_live_certification' AND pronamespace='public'::regnamespace LIMIT 1;
  IF v_src IS NULL THEN RAISE EXCEPTION 'runner not found'; END IF;
END $$;

-- Simple targeted replacement via CREATE OR REPLACE with only the hash line changed.
-- Instead of duplicating the huge function, add a wrapper hash helper the runner will use.
CREATE OR REPLACE FUNCTION public._comm_hub_hash_manifest(p_manifest jsonb) RETURNS text
LANGUAGE sql STABLE AS $$ SELECT compute_comm_hub_dependency_hash(p_manifest) $$;
GRANT EXECUTE ON FUNCTION public._comm_hub_hash_manifest(jsonb) TO authenticated, service_role;

-- Recreate runner substituting the hash source.
CREATE OR REPLACE FUNCTION public.run_comm_hub_go_live_certification(
  p_module_code text, p_event_code text, p_channel text DEFAULT 'email',
  p_target_stage text DEFAULT 'READINESS_ONLY', p_execute boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_manifest jsonb; v_hash text; v_blockers jsonb := '[]'::jsonb; v_warnings jsonb := '[]'::jsonb;
  v_stage text := upper(p_target_stage); v_channel text := lower(p_channel);
  v_tv_id uuid; v_scenario_id uuid; v_sender_id uuid;
  v_ready_readiness boolean; v_ready_preview boolean; v_ready_dry_run boolean; v_ready_stub boolean; v_ready_stage boolean;
  v_render_subject jsonb; v_render_html jsonb; v_render_text jsonb; v_resolution jsonb; v_gov_check jsonb;
  v_recipient_ctx jsonb; v_request_ctx jsonb; v_system_ctx jsonb;
  v_cert_id uuid;
  v_reg record; v_map record; v_tv record; v_schema record; v_fixture record;
  v_sender record; v_readiness record; v_recipient record; v_gov record; v_cert record; v_live record;
BEGIN
  IF v_stage NOT IN ('READINESS_ONLY','PREVIEW_READY','DRY_RUN_READY','CONTROLLED_STUB_READY') THEN
    RETURN jsonb_build_object('ok',false,'code','invalid_target_stage','message',v_stage);
  END IF;
  IF p_execute IS true THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','execute_ignored','message','p_execute=true ignored in foundation iteration'));
  END IF;

  SELECT * INTO v_reg FROM communication_hub_module_event_registry
   WHERE module_code=p_module_code AND event_code=p_event_code LIMIT 1;
  IF v_reg IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','module_event_registration','code','event_not_registered'));
  END IF;
  SELECT * INTO v_live FROM communication_hub_event_live_control
   WHERE module_code=p_module_code AND event_code=p_event_code LIMIT 1;
  IF v_live IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_live_control','code','event_live_control_missing'));
  END IF;
  SELECT * INTO v_map FROM communication_hub_event_template_map
   WHERE module_code=p_module_code AND event_code=p_event_code
     AND lower(channel)=v_channel AND active=true LIMIT 1;
  IF v_map IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_template_map','code','event_template_map_missing_or_inactive'));
  END IF;
  IF v_map IS NOT NULL THEN
    SELECT v.*, t.status AS template_status, t.code AS template_code, t.active_version_id
      INTO v_tv FROM core_template t JOIN core_template_version v ON v.id=t.active_version_id
     WHERE t.id=v_map.template_id LIMIT 1;
    IF v_tv IS NULL THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','template_version','code','template_active_version_missing'));
    ELSE
      v_tv_id := v_tv.id;
      IF upper(v_tv.status::text) NOT IN ('ACTIVE','PUBLISHED') THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','template_version','code','template_version_not_published','details',v_tv.status));
      END IF;
      IF coalesce(length(v_tv.subject),0)=0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','template_version','code','template_subject_empty'));
      END IF;
      IF coalesce(length(v_tv.body_html),0)=0 AND coalesce(length(v_tv.body_text),0)=0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','template_version','code','template_body_empty'));
      END IF;
    END IF;
  END IF;
  SELECT * INTO v_schema FROM communication_hub_event_payload_schema
   WHERE module_code=p_module_code AND event_code=p_event_code ORDER BY schema_version DESC LIMIT 1;
  IF v_schema IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_payload_schema','code','event_payload_schema_missing'));
  ELSIF upper(v_schema.status)<>'ENFORCED' AND v_stage IN ('DRY_RUN_READY','CONTROLLED_STUB_READY') THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_payload_schema','code','event_payload_schema_not_enforced','details',v_schema.status));
  END IF;
  IF v_tv_id IS NOT NULL THEN
    PERFORM 1 FROM communication_hub_template_variable_contract
     WHERE module_code=p_module_code AND event_code=p_event_code AND template_version_id=v_tv_id LIMIT 1;
    IF NOT FOUND THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_contract','code','variable_contract_missing_for_active_version'));
    END IF;
    IF v_stage IN ('DRY_RUN_READY','CONTROLLED_STUB_READY') THEN
      PERFORM 1 FROM communication_hub_template_variable_contract
       WHERE module_code=p_module_code AND event_code=p_event_code
         AND template_version_id=v_tv_id AND contract_status<>'ENFORCED' LIMIT 1;
      IF FOUND THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_contract','code','variable_contract_not_enforced'));
      END IF;
    END IF;
  END IF;
  SELECT * INTO v_fixture FROM communication_hub_event_test_scenario
   WHERE module_code=p_module_code AND event_code=p_event_code AND lower(channel)=v_channel AND is_active=true
   ORDER BY updated_at DESC LIMIT 1;
  IF v_fixture IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','test_scenario','code','governed_test_scenario_missing'));
  ELSE
    v_scenario_id := v_fixture.id;
    IF v_fixture.tokens ? 'appeal_reference' OR v_fixture.tokens ? 'case_reference'
       OR v_fixture.tokens ? 'submitted_at' OR v_fixture.tokens ? 'recipient_name'
       OR v_fixture.tokens ? 'request_no' OR v_fixture.tokens ? 'generated_at' THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','test_scenario','code','test_scenario_uses_flat_template_tokens'));
    END IF;
  END IF;
  SELECT * INTO v_recipient FROM communication_hub_recipient_policy LIMIT 1;
  IF v_recipient IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','recipient_policy','code','recipient_policy_missing'));
  ELSE
    IF v_stage IN ('DRY_RUN_READY','CONTROLLED_STUB_READY') AND
       (v_recipient.active_mode<>'SINGLE_CONFIGURED_RECIPIENT' OR coalesce(v_recipient.single_configured_address,'')='') THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','recipient_policy','code','recipient_policy_not_configured_for_controlled_stub'));
    END IF;
    IF v_stage='CONTROLLED_STUB_READY' AND coalesce(v_recipient.single_configured_display_name_confirmed,false)=false THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','recipient_policy','code','recipient_display_name_not_confirmed'));
    END IF;
  END IF;
  IF v_map IS NOT NULL AND v_map.sender_profile_id IS NOT NULL THEN
    SELECT * INTO v_sender FROM communication_hub_sender_profile WHERE id=v_map.sender_profile_id;
    v_sender_id := v_map.sender_profile_id;
    IF v_sender IS NULL THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_profile_missing'));
    ELSE
      IF v_sender.is_enabled IS DISTINCT FROM true THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_profile_disabled'));
      END IF;
      IF v_sender.domain_verified IS DISTINCT FROM true THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_domain_not_verified'));
      END IF;
      IF v_sender.provider_identity_status IS DISTINCT FROM 'verified' THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_provider_identity_not_verified','details',v_sender.provider_identity_status));
      END IF;
    END IF;
    SELECT * INTO v_readiness FROM comm_hub_sender_readiness
     WHERE sender_profile_id=v_sender_id ORDER BY computed_at DESC LIMIT 1;
    IF v_stage='CONTROLLED_STUB_READY' THEN
      IF v_readiness IS NULL OR v_readiness.readiness_state<>'TEST_READY' OR v_readiness.is_stale=true THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_readiness','code','sender_not_test_ready'));
      END IF;
    ELSIF v_readiness IS NULL OR v_readiness.readiness_state<>'TEST_READY' THEN
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','sender_test_readiness_missing_or_stale'));
    END IF;
  ELSE
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_profile_not_bound_to_mapping'));
  END IF;
  IF v_tv_id IS NOT NULL THEN
    SELECT * INTO v_gov FROM comm_hub_governance_record
     WHERE entity_type='TEMPLATE_VERSION' AND entity_id=v_tv_id ORDER BY updated_at DESC LIMIT 1;
    IF v_gov IS NULL THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','governance','code','template_version_governance_missing'));
    END IF;
    SELECT * INTO v_cert FROM comm_hub_certification
     WHERE entity_type='TEMPLATE_VERSION' AND entity_id=v_tv_id ORDER BY certified_at DESC LIMIT 1;
    IF v_cert IS NULL THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','governance','code','template_version_certification_missing'));
    ELSIF v_cert.result NOT IN ('PASS','WARN') THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','governance','code','template_version_certification_not_pass','details',v_cert.result));
    ELSIF v_cert.is_stale=true THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','governance','code','template_version_certification_stale','details',v_cert.stale_reason));
    END IF;
  END IF;

  v_recipient_ctx := CASE WHEN v_recipient IS NULL THEN '{}'::jsonb
    ELSE jsonb_build_object('display_name', v_recipient.single_configured_display_name,
                            'email', v_recipient.single_configured_address,
                            'policy_version', v_recipient.policy_version) END;
  v_request_ctx := jsonb_build_object('request_no','REQ-CERT-'||to_char(now(),'YYYYMMDDHH24MISS'),
                                      'correlation_id',gen_random_uuid()::text,
                                      'timestamp',to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  v_system_ctx := jsonb_build_object('generated_at',to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                                     'module_code',p_module_code,'event_code',p_event_code,
                                     'channel',v_channel,'platform','secureserve');

  IF v_tv_id IS NOT NULL AND v_scenario_id IS NOT NULL THEN
    BEGIN
      v_resolution := resolve_comm_hub_template_variables(
        p_template_version_id := v_tv_id, p_module_code := p_module_code, p_event_code := p_event_code,
        p_channel := v_channel,
        p_resolution_mode := CASE WHEN v_stage='PREVIEW_READY' THEN 'PREVIEW_TEST' ELSE 'CONTROLLED_STUB' END,
        p_test_scenario_id := v_scenario_id,
        p_event_payload := coalesce(v_fixture.tokens,'{}'::jsonb),
        p_recipient_context := v_recipient_ctx, p_request_context := v_request_ctx, p_system_context := v_system_ctx);
      IF jsonb_array_length(coalesce(v_resolution->'unresolved_required','[]'::jsonb))>0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_resolution','code','required_variables_unresolved','details',v_resolution->'unresolved_required'));
      END IF;
      IF jsonb_array_length(coalesce(v_resolution->'raw_tokens','[]'::jsonb))>0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_resolution','code','raw_tokens_present','details',v_resolution->'raw_tokens'));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_resolution','code','resolver_error','details',SQLERRM));
    END;
  END IF;

  IF v_tv IS NOT NULL AND v_resolution IS NOT NULL THEN
    BEGIN
      v_render_subject := comm_hub_render_template(v_tv.subject, coalesce(v_resolution->'context','{}'::jsonb));
      IF jsonb_array_length(coalesce(v_render_subject->'raw_tokens','[]'::jsonb))>0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','render_check','code','subject_raw_tokens_present'));
      END IF;
      IF coalesce(length(v_tv.body_html),0)>0 THEN
        v_render_html := comm_hub_render_template(v_tv.body_html, coalesce(v_resolution->'context','{}'::jsonb));
        IF jsonb_array_length(coalesce(v_render_html->'raw_tokens','[]'::jsonb))>0 THEN
          v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','render_check','code','body_html_raw_tokens_present'));
        END IF;
      END IF;
      IF coalesce(length(v_tv.body_text),0)>0 THEN
        v_render_text := comm_hub_render_template(v_tv.body_text, coalesce(v_resolution->'context','{}'::jsonb));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','render_check','code','render_error','details',SQLERRM));
    END;
  END IF;

  IF v_tv_id IS NOT NULL AND v_map IS NOT NULL THEN
    BEGIN
      v_gov_check := check_comm_hub_runtime_governance(
        p_module_code := p_module_code, p_event_code := p_event_code, p_channel := v_channel,
        p_target_stage := CASE WHEN v_stage='PREVIEW_READY' THEN 'PREVIEW_TEST'
                               WHEN v_stage='DRY_RUN_READY' THEN 'DRY_RUN'
                               WHEN v_stage='CONTROLLED_STUB_READY' THEN 'CONTROLLED_STUB'
                               ELSE 'PREVIEW_TEST' END);
      IF jsonb_array_length(coalesce(v_gov_check->'blockers','[]'::jsonb))>0 THEN
        v_blockers := v_blockers || (
          SELECT jsonb_agg(jsonb_build_object('stage','runtime_governance','code',coalesce(b->>'code','governance_blocker'),'details',b))
          FROM jsonb_array_elements(v_gov_check->'blockers') b);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','runtime_governance_check_error','message',SQLERRM));
    END;
  END IF;

  v_manifest := _comm_hub_build_event_manifest(p_module_code,p_event_code,v_channel);
  v_hash := _comm_hub_hash_manifest(v_manifest);

  v_ready_readiness := NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_blockers) b
    WHERE (b->>'code') IN ('event_not_registered','event_template_map_missing_or_inactive','template_active_version_missing'));
  v_ready_preview := jsonb_array_length(v_blockers)=0;
  v_ready_dry_run := v_ready_preview;
  v_ready_stub := v_ready_preview;
  v_ready_stage := CASE v_stage
    WHEN 'READINESS_ONLY' THEN v_ready_readiness
    WHEN 'PREVIEW_READY' THEN v_ready_preview
    WHEN 'DRY_RUN_READY' THEN v_ready_dry_run
    WHEN 'CONTROLLED_STUB_READY' THEN v_ready_stub END;

  INSERT INTO comm_hub_certification(
    entity_type, entity_id, entity_version, certification_kind, result,
    dependency_manifest, dependency_hash, renderer_version, channel,
    validation_findings, error_count, warning_count, is_stale, certified_at, certified_by, certification_reason
  ) VALUES (
    'EVENT_TEMPLATE_MAPPING', coalesce(v_map.id, gen_random_uuid()), v_tv_id,
    'go_live_readiness_'||v_stage,
    CASE WHEN v_ready_stage THEN 'PASS' ELSE 'FAIL' END,
    v_manifest, v_hash, 'comm-hub-render/1', v_channel,
    jsonb_build_object('blockers',v_blockers,'warnings',v_warnings,'stage',v_stage),
    jsonb_array_length(v_blockers), jsonb_array_length(v_warnings), false, now(), auth.uid(),
    'run_comm_hub_go_live_certification'
  ) RETURNING id INTO v_cert_id;

  RETURN jsonb_build_object(
    'ok',true,'module_code',p_module_code,'event_code',p_event_code,'channel',v_channel,
    'requested_stage',v_stage,'ready_for_requested_stage',v_ready_stage,
    'ready_by_stage',jsonb_build_object('READINESS_ONLY',v_ready_readiness,'PREVIEW_READY',v_ready_preview,'DRY_RUN_READY',v_ready_dry_run,'CONTROLLED_STUB_READY',v_ready_stub),
    'blockers',v_blockers,'warnings',v_warnings,
    'manifest_hash',v_hash,'certification_id',v_cert_id,
    'mapping_id',v_map.id,'template_version_id',v_tv_id,
    'payload_schema_id',v_schema.id,'payload_schema_version',v_schema.schema_version,
    'sender_profile_id',v_sender_id,'sender_readiness_state',coalesce(v_readiness.readiness_state,'MISSING'),
    'recipient_policy_version',v_recipient.policy_version,
    'unresolved_required_count',jsonb_array_length(coalesce(v_resolution->'unresolved_required','[]'::jsonb)),
    'raw_token_count',jsonb_array_length(coalesce(v_resolution->'raw_tokens','[]'::jsonb))
      + jsonb_array_length(coalesce(v_render_subject->'raw_tokens','[]'::jsonb))
      + jsonb_array_length(coalesce(v_render_html->'raw_tokens','[]'::jsonb)),
    'executed',false,'schema_version','go-live-runner/1');
END; $$;

GRANT EXECUTE ON FUNCTION public.run_comm_hub_go_live_certification(text,text,text,text,boolean) TO authenticated, service_role;
