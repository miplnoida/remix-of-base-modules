CREATE OR REPLACE FUNCTION public.run_comm_hub_go_live_certification(p_module_code text, p_event_code text, p_channel text DEFAULT 'email'::text, p_target_stage text DEFAULT 'READINESS_ONLY'::text, p_execute boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_manifest jsonb; v_hash text; v_blockers jsonb := '[]'::jsonb; v_warnings jsonb := '[]'::jsonb;
  v_stage text := upper(p_target_stage); v_channel text := lower(p_channel);
  v_tv_id uuid; v_scenario_id uuid; v_sender_id uuid; v_gov_record_id uuid;
  v_map_id uuid; v_schema_id uuid; v_schema_ver int; v_recipient_ver int;
  v_readiness_state text; v_readiness_stale boolean;
  v_ready_readiness boolean; v_ready_preview boolean; v_ready_dry_run boolean; v_ready_stub boolean; v_ready_stage boolean;
  v_render_subject jsonb; v_render_html jsonb; v_render_text jsonb; v_resolution jsonb; v_gov_check jsonb;
  v_recipient_ctx jsonb; v_request_ctx jsonb; v_system_ctx jsonb;
  v_cert_id uuid;
  v_reg record; v_map record; v_tv record; v_schema record; v_fixture record;
  v_sender record; v_readiness record; v_recipient record; v_gov record; v_cert record; v_live record;
  v_has_map boolean := false; v_has_recipient boolean := false; v_has_readiness boolean := false; v_has_schema boolean := false;
  v_template_cert_found boolean := false;
BEGIN
  IF v_stage NOT IN ('READINESS_ONLY','PREVIEW_READY','DRY_RUN_READY','CONTROLLED_STUB_READY') THEN
    RETURN jsonb_build_object('ok',false,'code','invalid_target_stage','message',v_stage);
  END IF;
  IF p_execute IS true THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','execute_ignored','message','p_execute=true ignored in foundation iteration'));
  END IF;

  SELECT * INTO v_reg FROM communication_hub_module_event_registry WHERE module_code=p_module_code AND event_code=p_event_code LIMIT 1;
  IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','module_event_registration','code','event_not_registered')); END IF;
  SELECT * INTO v_live FROM communication_hub_event_live_control WHERE module_code=p_module_code AND event_code=p_event_code LIMIT 1;
  IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_live_control','code','event_live_control_missing')); END IF;
  SELECT * INTO v_map FROM communication_hub_event_template_map WHERE module_code=p_module_code AND event_code=p_event_code AND lower(channel)=v_channel AND active=true LIMIT 1;
  IF FOUND THEN v_has_map:=true; v_map_id:=v_map.id; ELSE v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_template_map','code','event_template_map_missing_or_inactive')); END IF;

  IF v_has_map THEN
    SELECT v.*, t.status AS template_status, t.code AS template_code, t.active_version_id INTO v_tv
      FROM core_template t JOIN core_template_version v ON v.id=t.active_version_id WHERE t.id=v_map.template_id LIMIT 1;
    IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','template_version','code','template_active_version_missing'));
    ELSE
      v_tv_id := v_tv.id;
      IF upper(v_tv.status::text) NOT IN ('ACTIVE','PUBLISHED') THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','template_version','code','template_version_not_published','details',v_tv.status)); END IF;
      IF coalesce(length(v_tv.subject),0)=0 THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','template_version','code','template_subject_empty')); END IF;
      IF coalesce(length(v_tv.body_html),0)=0 AND coalesce(length(v_tv.body_text),0)=0 THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','template_version','code','template_body_empty')); END IF;
    END IF;
  END IF;

  SELECT * INTO v_schema FROM communication_hub_event_payload_schema WHERE module_code=p_module_code AND event_code=p_event_code ORDER BY schema_version DESC LIMIT 1;
  IF FOUND THEN v_has_schema:=true; v_schema_id:=v_schema.id; v_schema_ver:=v_schema.schema_version;
    IF upper(v_schema.status)<>'ENFORCED' AND v_stage IN ('DRY_RUN_READY','CONTROLLED_STUB_READY') THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_payload_schema','code','event_payload_schema_not_enforced','details',v_schema.status));
    END IF;
  ELSE v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_payload_schema','code','event_payload_schema_missing')); END IF;

  IF v_tv_id IS NOT NULL THEN
    PERFORM 1 FROM communication_hub_template_variable_contract WHERE module_code=p_module_code AND event_code=p_event_code AND template_version_id=v_tv_id LIMIT 1;
    IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_contract','code','variable_contract_missing_for_active_version')); END IF;
    IF v_stage IN ('DRY_RUN_READY','CONTROLLED_STUB_READY') THEN
      PERFORM 1 FROM communication_hub_template_variable_contract WHERE module_code=p_module_code AND event_code=p_event_code AND template_version_id=v_tv_id AND contract_status<>'ENFORCED' LIMIT 1;
      IF FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_contract','code','variable_contract_not_enforced')); END IF;
    END IF;
  END IF;

  SELECT * INTO v_fixture FROM communication_hub_event_test_scenario WHERE module_code=p_module_code AND event_code=p_event_code AND lower(channel)=v_channel AND is_active=true ORDER BY updated_at DESC LIMIT 1;
  IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','test_scenario','code','governed_test_scenario_missing'));
  ELSE
    v_scenario_id := v_fixture.id;
    IF v_fixture.tokens ? 'appeal_reference' OR v_fixture.tokens ? 'case_reference' OR v_fixture.tokens ? 'submitted_at'
       OR v_fixture.tokens ? 'recipient_name' OR v_fixture.tokens ? 'request_no' OR v_fixture.tokens ? 'generated_at' THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','test_scenario','code','test_scenario_uses_flat_template_tokens'));
    END IF;
  END IF;

  SELECT * INTO v_recipient FROM communication_hub_recipient_policy LIMIT 1;
  IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','recipient_policy','code','recipient_policy_missing'));
  ELSE
    v_has_recipient:=true; v_recipient_ver := v_recipient.policy_version;
    IF v_stage IN ('DRY_RUN_READY','CONTROLLED_STUB_READY') AND
       (v_recipient.active_mode<>'SINGLE_CONFIGURED_RECIPIENT' OR coalesce(v_recipient.single_configured_address,'')='') THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','recipient_policy','code','recipient_policy_not_configured_for_controlled_stub'));
    END IF;
    IF v_stage='CONTROLLED_STUB_READY' AND coalesce(v_recipient.single_configured_display_name_confirmed,false)=false THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','recipient_policy','code','recipient_display_name_not_confirmed'));
    END IF;
  END IF;

  IF v_has_map AND v_map.sender_profile_id IS NOT NULL THEN
    v_sender_id := v_map.sender_profile_id;
    SELECT * INTO v_sender FROM communication_hub_sender_profile WHERE id=v_sender_id;
    IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_profile_missing'));
    ELSE
      IF v_sender.is_enabled IS DISTINCT FROM true THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_profile_disabled')); END IF;
      IF v_sender.domain_verified IS DISTINCT FROM true THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_domain_not_verified')); END IF;
      IF v_sender.provider_identity_status IS DISTINCT FROM 'verified' THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_provider_identity_not_verified','details',v_sender.provider_identity_status)); END IF;
    END IF;
    SELECT * INTO v_readiness FROM comm_hub_sender_readiness WHERE sender_profile_id=v_sender_id ORDER BY computed_at DESC LIMIT 1;
    IF FOUND THEN v_has_readiness:=true; v_readiness_state:=v_readiness.readiness_state; v_readiness_stale:=v_readiness.is_stale; END IF;
    IF v_stage='CONTROLLED_STUB_READY' THEN
      IF NOT v_has_readiness OR v_readiness_state<>'TEST_READY' OR v_readiness_stale=true THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_readiness','code','sender_not_test_ready'));
      END IF;
    ELSIF NOT v_has_readiness OR v_readiness_state<>'TEST_READY' THEN
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','sender_test_readiness_missing_or_stale'));
    END IF;
  ELSE
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_profile_not_bound_to_mapping'));
  END IF;

  -- Sub-iter 2 · exact authoritative template-cert lookup
  IF v_tv_id IS NOT NULL THEN
    SELECT * INTO v_gov FROM comm_hub_governance_record WHERE entity_type='TEMPLATE_VERSION' AND entity_id=v_tv_id ORDER BY updated_at DESC LIMIT 1;
    IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','governance','code','template_version_governance_missing')); END IF;

    SELECT * INTO v_cert FROM comm_hub_certification
     WHERE entity_type = 'TEMPLATE_VERSION' AND entity_id = v_tv_id
       AND certification_layer = 'TEMPLATE_STRUCTURE_CERTIFICATION'
       AND certification_kind  = 'STANDARD'
       AND provenance_state    = 'AUTHORITATIVE'
       AND is_stale = false AND superseded_by IS NULL
       AND result IN ('PASS','CERTIFIED')
     ORDER BY certified_at DESC LIMIT 1;

    IF NOT FOUND THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'stage','template_certification',
        'code','template_structure_not_certified',
        'details', jsonb_build_object('template_version_id', v_tv_id)
      ));
    ELSE
      v_template_cert_found := true;
      v_cert_id := v_cert.id;

      IF v_cert.dependency_hash IS DISTINCT FROM (
        SELECT dependency_hash FROM public.build_comm_hub_certification_dependency_hash(v_tv_id)
      ) THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
          'stage','template_certification',
          'code','template_certification_dependency_drift',
          'details', jsonb_build_object('certification_id', v_cert_id)
        ));
      END IF;
    END IF;
  END IF;

  IF v_tv_id IS NOT NULL AND v_has_map AND v_scenario_id IS NOT NULL AND v_has_recipient THEN
    BEGIN
      v_recipient_ctx := public.build_comm_hub_recipient_context(v_recipient.id);
      v_request_ctx := public.build_comm_hub_request_context('deterministic-runner');
      v_system_ctx := public.build_comm_hub_system_context();
      v_resolution := public.resolve_comm_hub_template_variables(
        p_module_code:=p_module_code, p_event_code:=p_event_code, p_template_version_id:=v_tv_id,
        p_event_payload:=v_fixture.tokens, p_recipient_context:=v_recipient_ctx,
        p_request_context:=v_request_ctx, p_system_context:=v_system_ctx);
      IF (v_resolution ? 'unresolved_required') AND jsonb_array_length(v_resolution->'unresolved_required')>0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_resolution','code','required_variables_unresolved','details',v_resolution->'unresolved_required'));
      END IF;
      IF (v_resolution ? 'raw_tokens') AND jsonb_array_length(v_resolution->'raw_tokens')>0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_resolution','code','raw_tokens_present','details',v_resolution->'raw_tokens'));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_resolution','code','resolver_error','details',SQLERRM));
    END;

    BEGIN
      v_render_subject := public.render_comm_hub_content(v_tv.subject, coalesce(v_resolution->'resolved',v_fixture.tokens));
      IF (v_render_subject ? 'raw_tokens') AND jsonb_array_length(v_render_subject->'raw_tokens')>0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','render_check','code','subject_raw_tokens_present'));
      END IF;
      IF coalesce(v_tv.body_html,'') <> '' THEN
        v_render_html := public.render_comm_hub_content(v_tv.body_html, coalesce(v_resolution->'resolved',v_fixture.tokens));
        IF (v_render_html ? 'raw_tokens') AND jsonb_array_length(v_render_html->'raw_tokens')>0 THEN
          v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','render_check','code','body_html_raw_tokens_present'));
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','render_check','code','render_error','details',SQLERRM));
    END;
  END IF;

  IF v_tv_id IS NOT NULL AND v_has_map THEN
    BEGIN
      v_gov_check := check_comm_hub_runtime_governance(
        p_module_code:=p_module_code, p_event_code:=p_event_code, p_channel:=v_channel,
        p_target_stage:=CASE WHEN v_stage='PREVIEW_READY' THEN 'PREVIEW_TEST'
                             WHEN v_stage='DRY_RUN_READY' THEN 'DRY_RUN'
                             WHEN v_stage='CONTROLLED_STUB_READY' THEN 'CONTROLLED_STUB'
                             ELSE 'PREVIEW_TEST' END);
      IF jsonb_array_length(coalesce(v_gov_check->'blockers','[]'::jsonb))>0 THEN
        -- Static capability evaluation (p_execute=false) must not require live runtime rows.
        -- Demote runtime-evidence-required codes to warnings; keep other governance blockers.
        IF NOT p_execute THEN
          v_warnings := v_warnings || COALESCE((
            SELECT jsonb_agg(jsonb_build_object('stage','runtime_governance','code',coalesce(b->>'code','governance_blocker'),'details',b))
            FROM jsonb_array_elements(v_gov_check->'blockers') b
            WHERE (b->>'code') IN ('PREVIEW_SNAPSHOT_REQUIRED','PREVIEW_APPROVAL_REQUIRED','DRY_RUN_CERTIFICATION_REQUIRED')
          ), '[]'::jsonb);
          v_blockers := v_blockers || COALESCE((
            SELECT jsonb_agg(jsonb_build_object('stage','runtime_governance','code',coalesce(b->>'code','governance_blocker'),'details',b))
            FROM jsonb_array_elements(v_gov_check->'blockers') b
            WHERE (b->>'code') NOT IN ('PREVIEW_SNAPSHOT_REQUIRED','PREVIEW_APPROVAL_REQUIRED','DRY_RUN_CERTIFICATION_REQUIRED')
          ), '[]'::jsonb);
        ELSE
          v_blockers := v_blockers || (SELECT jsonb_agg(jsonb_build_object('stage','runtime_governance','code',coalesce(b->>'code','governance_blocker'),'details',b))
                                       FROM jsonb_array_elements(v_gov_check->'blockers') b);
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','runtime_governance_check_error','message',SQLERRM));
    END;
  END IF;

  v_manifest := _comm_hub_build_event_manifest(p_module_code,p_event_code,v_channel);
  v_hash := _comm_hub_hash_manifest(v_manifest);

  v_ready_readiness := NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_blockers) b
    WHERE (b->>'code') IN ('event_not_registered','event_template_map_missing_or_inactive','template_active_version_missing'));
  v_ready_preview := jsonb_array_length(v_blockers)=0;
  v_ready_dry_run := v_ready_preview; v_ready_stub := v_ready_preview;
  v_ready_stage := CASE v_stage WHEN 'READINESS_ONLY' THEN v_ready_readiness
                                 WHEN 'PREVIEW_READY' THEN v_ready_preview
                                 WHEN 'DRY_RUN_READY' THEN v_ready_dry_run
                                 WHEN 'CONTROLLED_STUB_READY' THEN v_ready_stub END;

  RETURN jsonb_build_object(
    'ok', v_ready_stage,
    'schema_version','go-live-runner/2',
    'requested_stage', v_stage,
    'module_code', p_module_code, 'event_code', p_event_code, 'channel', v_channel,
    'mapping_id', v_map_id, 'template_version_id', v_tv_id, 'payload_schema_id', v_schema_id, 'payload_schema_version', v_schema_ver,
    'sender_profile_id', v_sender_id, 'sender_readiness_state', v_readiness_state,
    'governance_record_id', v_gov.id, 'certification_id', v_cert_id,
    'template_certification', jsonb_build_object(
       'found', v_template_cert_found,
       'producer_function','record_comm_hub_template_version_certification',
       'producer_version','template-cert-writer/2',
       'certification_id', v_cert_id,
       'certified_dependency_hash', v_cert.dependency_hash,
       'current_dependency_hash', (SELECT dependency_hash FROM public.build_comm_hub_certification_dependency_hash(v_tv_id)),
       'hash_match', CASE WHEN v_cert.dependency_hash IS NULL THEN NULL
                          ELSE v_cert.dependency_hash = (SELECT dependency_hash FROM public.build_comm_hub_certification_dependency_hash(v_tv_id)) END
    ),
    'ready_by_stage', jsonb_build_object('READINESS_ONLY',v_ready_readiness,'PREVIEW_READY',v_ready_preview,'DRY_RUN_READY',v_ready_dry_run,'CONTROLLED_STUB_READY',v_ready_stub),
    'manifest_hash', v_hash, 'raw_token_count', 0,
    'variable_resolution', v_resolution, 'render_subject', v_render_subject, 'render_body_html', v_render_html,
    'runtime_governance', v_gov_check,
    'blockers', v_blockers, 'warnings', v_warnings, 'executed', false
  );
END;
$function$;