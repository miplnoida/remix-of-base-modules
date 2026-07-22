
-- Phase 4B3 — Unified Go-Live Certification Foundation
-- Additive only. No runtime rows created.

-- ============================================================
-- 1. Enforce APPEALS payload schema + variable contract
-- ============================================================
UPDATE public.communication_hub_event_payload_schema
SET status='ENFORCED', enforced_at=now(), enforced_by=auth.uid()
WHERE module_code='APPEALS' AND event_code='APPEAL_RECEIVED_NOTICE' AND status<>'ENFORCED';

UPDATE public.communication_hub_template_variable_contract
SET contract_status='ENFORCED', enforced_at=now(), enforced_by=auth.uid()
WHERE module_code='APPEALS' AND event_code='APPEAL_RECEIVED_NOTICE' AND contract_status<>'ENFORCED';

-- ============================================================
-- 2. Manifest builder for an event (safe identifiers + versions)
-- ============================================================
CREATE OR REPLACE FUNCTION public._comm_hub_build_event_manifest(
  p_module_code text, p_event_code text, p_channel text DEFAULT 'email'
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_reg jsonb; v_map jsonb; v_tpl jsonb; v_ver jsonb; v_schema jsonb;
  v_contract jsonb; v_scenario jsonb; v_recipient jsonb; v_sender jsonb;
  v_readiness jsonb; v_gov jsonb; v_cert jsonb; v_manifest jsonb;
BEGIN
  SELECT jsonb_build_object('id',id::text,'template_code',template_code)
    INTO v_reg
  FROM communication_hub_module_event_registry
  WHERE module_code=p_module_code AND event_code=p_event_code
  LIMIT 1;

  SELECT jsonb_build_object('id',m.id::text,'template_id',m.template_id::text,'template_code',m.template_code,'sender_profile_id',m.sender_profile_id::text,'active',m.active)
    INTO v_map
  FROM communication_hub_event_template_map m
  WHERE m.module_code=p_module_code AND m.event_code=p_event_code
    AND lower(m.channel)=lower(p_channel) AND m.active=true
  LIMIT 1;

  IF v_map IS NOT NULL THEN
    SELECT jsonb_build_object('id',t.id::text,'code',t.code,'status',t.status,'active_version_id',t.active_version_id::text)
      INTO v_tpl
    FROM core_template t WHERE t.id=(v_map->>'template_id')::uuid;

    SELECT jsonb_build_object('id',v.id::text,'version_no',v.version_no,'status',v.status,'subject_len',coalesce(length(v.subject),0),'html_len',coalesce(length(v.body_html),0),'text_len',coalesce(length(v.body_text),0))
      INTO v_ver
    FROM core_template_version v WHERE v.id=(v_tpl->>'active_version_id')::uuid;
  END IF;

  SELECT jsonb_build_object('id',id::text,'version',schema_version,'status',status) INTO v_schema
  FROM communication_hub_event_payload_schema
  WHERE module_code=p_module_code AND event_code=p_event_code
  ORDER BY schema_version DESC LIMIT 1;

  SELECT jsonb_agg(jsonb_build_object('id',id::text,'var',variable_name,'source',source_type,'path',canonical_path,'req',is_required,'status',contract_status) ORDER BY variable_name)
    INTO v_contract
  FROM communication_hub_template_variable_contract
  WHERE module_code=p_module_code AND event_code=p_event_code;

  SELECT jsonb_build_object('id',id::text,'key',scenario_key,'active',is_active)
    INTO v_scenario
  FROM communication_hub_event_test_scenario
  WHERE module_code=p_module_code AND event_code=p_event_code AND lower(channel)=lower(p_channel) AND is_active=true
  ORDER BY updated_at DESC LIMIT 1;

  SELECT jsonb_build_object('mode',active_mode,'version',policy_version,'display_confirmed',single_configured_display_name_confirmed)
    INTO v_recipient
  FROM communication_hub_recipient_policy LIMIT 1;

  IF v_map IS NOT NULL AND (v_map->>'sender_profile_id') IS NOT NULL THEN
    SELECT jsonb_build_object('id',id::text,'code',profile_code,'from',from_email,'display',display_name,'domain_verified',domain_verified,'provider_status',provider_identity_status,'enabled',is_enabled)
      INTO v_sender
    FROM communication_hub_sender_profile WHERE id=(v_map->>'sender_profile_id')::uuid;

    SELECT jsonb_build_object('state',readiness_state,'version',sender_version,'stale',is_stale)
      INTO v_readiness
    FROM comm_hub_sender_readiness WHERE sender_profile_id=(v_map->>'sender_profile_id')::uuid
    ORDER BY computed_at DESC LIMIT 1;
  END IF;

  IF v_ver IS NOT NULL THEN
    SELECT jsonb_build_object('id',id::text,'status',status::text,'entity_type',entity_type::text)
      INTO v_gov
    FROM comm_hub_governance_record
    WHERE entity_type='TEMPLATE_VERSION' AND entity_id=(v_ver->>'id')::uuid
    ORDER BY updated_at DESC LIMIT 1;

    SELECT jsonb_build_object('id',id::text,'result',result,'stale',is_stale,'hash',dependency_hash)
      INTO v_cert
    FROM comm_hub_certification
    WHERE entity_type='TEMPLATE_VERSION' AND entity_id=(v_ver->>'id')::uuid
    ORDER BY certified_at DESC LIMIT 1;
  END IF;

  v_manifest := jsonb_build_object(
    'schema_version','comm-hub-event-manifest/1',
    'module_code',p_module_code,
    'event_code',p_event_code,
    'channel',lower(p_channel),
    'event_registry',v_reg,
    'event_template_map',v_map,
    'template',v_tpl,
    'template_version',v_ver,
    'event_payload_schema',v_schema,
    'variable_contract',coalesce(v_contract,'[]'::jsonb),
    'test_scenario',v_scenario,
    'recipient_policy',v_recipient,
    'sender_profile',v_sender,
    'sender_readiness',v_readiness,
    'template_version_governance',v_gov,
    'template_version_certification',v_cert,
    'renderer_version','comm-hub-render/1',
    'resolver_version','comm-hub-resolve/1',
    'dispatch_contract_version','controlled-dispatch.v1',
    'targeted_creation_contract_version','create-controlled-stub.v1'
  );
  RETURN v_manifest;
END; $$;

GRANT EXECUTE ON FUNCTION public._comm_hub_build_event_manifest(text,text,text) TO authenticated, service_role;

-- ============================================================
-- 3. Event-level Go-Live Certification Runner
-- ============================================================
CREATE OR REPLACE FUNCTION public.run_comm_hub_go_live_certification(
  p_module_code text,
  p_event_code text,
  p_channel text DEFAULT 'email',
  p_target_stage text DEFAULT 'READINESS_ONLY',
  p_execute boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_manifest jsonb;
  v_hash text;
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_findings jsonb := '[]'::jsonb;
  v_stage text := upper(p_target_stage);
  v_channel text := lower(p_channel);
  v_tv_id uuid;
  v_scenario_id uuid;
  v_sender_id uuid;
  v_ready_readiness boolean;
  v_ready_preview boolean;
  v_ready_dry_run boolean;
  v_ready_stub boolean;
  v_ready_stage boolean;
  v_render_subject jsonb;
  v_render_html jsonb;
  v_render_text jsonb;
  v_resolution jsonb;
  v_gov_check jsonb;
  v_recipient_ctx jsonb;
  v_request_ctx jsonb;
  v_system_ctx jsonb;
  v_cert_id uuid;
  v_reg record;
  v_map record;
  v_tv record;
  v_schema record;
  v_fixture record;
  v_sender record;
  v_readiness record;
  v_recipient record;
  v_gov record;
  v_cert record;
  v_live record;
  v_added_blocker boolean := false;
BEGIN
  IF v_stage NOT IN ('READINESS_ONLY','PREVIEW_READY','DRY_RUN_READY','CONTROLLED_STUB_READY') THEN
    RETURN jsonb_build_object('ok',false,'code','invalid_target_stage','message',v_stage);
  END IF;
  IF p_execute IS true THEN
    -- Iteration boundary: no execution in this iteration.
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','execute_ignored','message','p_execute=true ignored in foundation iteration'));
  END IF;

  -- (1) module_event registration
  SELECT * INTO v_reg FROM communication_hub_module_event_registry
   WHERE module_code=p_module_code AND event_code=p_event_code LIMIT 1;
  IF v_reg IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','module_event_registration','code','event_not_registered'));
  END IF;

  -- (2) live control
  SELECT * INTO v_live FROM communication_hub_event_live_control
   WHERE module_code=p_module_code AND event_code=p_event_code LIMIT 1;
  IF v_live IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_live_control','code','event_live_control_missing'));
  END IF;

  -- (3) active template mapping
  SELECT * INTO v_map FROM communication_hub_event_template_map
   WHERE module_code=p_module_code AND event_code=p_event_code
     AND lower(channel)=v_channel AND active=true LIMIT 1;
  IF v_map IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_template_map','code','event_template_map_missing_or_inactive'));
  END IF;

  -- (4) template + active version
  IF v_map IS NOT NULL THEN
    SELECT v.*, t.status AS template_status, t.code AS template_code, t.active_version_id
      INTO v_tv
      FROM core_template t
      JOIN core_template_version v ON v.id=t.active_version_id
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

  -- (5) event payload schema
  SELECT * INTO v_schema FROM communication_hub_event_payload_schema
   WHERE module_code=p_module_code AND event_code=p_event_code
   ORDER BY schema_version DESC LIMIT 1;
  IF v_schema IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_payload_schema','code','event_payload_schema_missing'));
  ELSIF upper(v_schema.status)<>'ENFORCED' AND v_stage IN ('DRY_RUN_READY','CONTROLLED_STUB_READY') THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_payload_schema','code','event_payload_schema_not_enforced','details',v_schema.status));
  END IF;

  -- (6) variable contract
  IF v_tv_id IS NOT NULL THEN
    PERFORM 1 FROM communication_hub_template_variable_contract
     WHERE module_code=p_module_code AND event_code=p_event_code
       AND template_version_id=v_tv_id LIMIT 1;
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

  -- (7) test scenario / fixture
  SELECT * INTO v_fixture FROM communication_hub_event_test_scenario
   WHERE module_code=p_module_code AND event_code=p_event_code
     AND lower(channel)=v_channel AND is_active=true
   ORDER BY updated_at DESC LIMIT 1;
  IF v_fixture IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','test_scenario','code','governed_test_scenario_missing'));
  ELSE
    v_scenario_id := v_fixture.id;
    -- fixture must not carry template-alias flat tokens; must be nested payload
    IF v_fixture.tokens ? 'appeal_reference' OR v_fixture.tokens ? 'case_reference'
       OR v_fixture.tokens ? 'submitted_at' OR v_fixture.tokens ? 'recipient_name'
       OR v_fixture.tokens ? 'request_no' OR v_fixture.tokens ? 'generated_at' THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','test_scenario','code','test_scenario_uses_flat_template_tokens'));
    END IF;
  END IF;

  -- (8) recipient policy (single configured recipient for controlled stub)
  SELECT * INTO v_recipient FROM communication_hub_recipient_policy LIMIT 1;
  IF v_recipient IS NULL THEN
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','recipient_policy','code','recipient_policy_missing'));
  ELSE
    IF v_stage IN ('DRY_RUN_READY','CONTROLLED_STUB_READY') AND
       (v_recipient.active_mode<>'SINGLE_CONFIGURED_RECIPIENT'
        OR coalesce(v_recipient.single_configured_address,'')='') THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','recipient_policy','code','recipient_policy_not_configured_for_controlled_stub'));
    END IF;
    IF v_stage='CONTROLLED_STUB_READY' AND coalesce(v_recipient.single_configured_display_name_confirmed,false)=false THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','recipient_policy','code','recipient_display_name_not_confirmed'));
    END IF;
  END IF;

  -- (9) sender profile + readiness
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
    IF v_stage IN ('CONTROLLED_STUB_READY') THEN
      IF v_readiness IS NULL OR v_readiness.readiness_state<>'TEST_READY' OR v_readiness.is_stale=true THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_readiness','code','sender_not_test_ready'));
      END IF;
    ELSIF v_readiness IS NULL OR v_readiness.readiness_state<>'TEST_READY' THEN
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','sender_test_readiness_missing_or_stale'));
    END IF;
  ELSE
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_profile_not_bound_to_mapping'));
  END IF;

  -- (10) governance record + certification for template version
  IF v_tv_id IS NOT NULL THEN
    SELECT * INTO v_gov FROM comm_hub_governance_record
     WHERE entity_type='TEMPLATE_VERSION' AND entity_id=v_tv_id
     ORDER BY updated_at DESC LIMIT 1;
    IF v_gov IS NULL THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','governance','code','template_version_governance_missing'));
    END IF;
    SELECT * INTO v_cert FROM comm_hub_certification
     WHERE entity_type='TEMPLATE_VERSION' AND entity_id=v_tv_id
     ORDER BY certified_at DESC LIMIT 1;
    IF v_cert IS NULL THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','governance','code','template_version_certification_missing'));
    ELSIF v_cert.result NOT IN ('PASS','WARN') THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','governance','code','template_version_certification_not_pass','details',v_cert.result));
    ELSIF v_cert.is_stale=true THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','governance','code','template_version_certification_stale','details',v_cert.stale_reason));
    END IF;
  END IF;

  -- (11) system-owned contexts (server-built, never event-payload owned)
  IF v_recipient IS NOT NULL THEN
    v_recipient_ctx := jsonb_build_object(
      'display_name', v_recipient.single_configured_display_name,
      'email', v_recipient.single_configured_address,
      'policy_version', v_recipient.policy_version
    );
  ELSE
    v_recipient_ctx := '{}'::jsonb;
  END IF;
  v_request_ctx := jsonb_build_object(
    'request_no', 'REQ-CERT-'||to_char(now(),'YYYYMMDDHH24MISS'),
    'correlation_id', gen_random_uuid()::text,
    'timestamp', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
  v_system_ctx := jsonb_build_object(
    'generated_at', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'module_code', p_module_code,
    'event_code', p_event_code,
    'channel', v_channel,
    'platform', 'secureserve'
  );

  -- (12) canonical variable resolution (leverages existing resolver)
  IF v_tv_id IS NOT NULL AND v_scenario_id IS NOT NULL AND
     NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_blockers) b WHERE b->>'code'='template_active_version_missing') THEN
    BEGIN
      v_resolution := resolve_comm_hub_template_variables(
        p_template_version_id := v_tv_id,
        p_module_code := p_module_code,
        p_event_code := p_event_code,
        p_channel := v_channel,
        p_resolution_mode := CASE WHEN v_stage='PREVIEW_READY' THEN 'PREVIEW_TEST' ELSE 'CONTROLLED_STUB' END,
        p_test_scenario_id := v_scenario_id,
        p_event_payload := coalesce(v_fixture.tokens,'{}'::jsonb),
        p_recipient_context := v_recipient_ctx,
        p_request_context := v_request_ctx,
        p_system_context := v_system_ctx
      );
      IF (v_resolution->'unresolved_required')::jsonb IS NOT NULL AND
         jsonb_array_length(coalesce(v_resolution->'unresolved_required','[]'::jsonb))>0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
          'stage','variable_resolution','code','required_variables_unresolved',
          'details', v_resolution->'unresolved_required'));
      END IF;
      IF (v_resolution->'raw_tokens')::jsonb IS NOT NULL AND
         jsonb_array_length(coalesce(v_resolution->'raw_tokens','[]'::jsonb))>0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
          'stage','variable_resolution','code','raw_tokens_present',
          'details', v_resolution->'raw_tokens'));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'stage','variable_resolution','code','resolver_error','details',SQLERRM));
    END;
  END IF;

  -- (13) synthetic render (subject + body) to prove renderability without runtime rows
  IF v_tv IS NOT NULL AND v_resolution IS NOT NULL THEN
    BEGIN
      v_render_subject := comm_hub_render_template(v_tv.subject, coalesce(v_resolution->'context','{}'::jsonb));
      IF (v_render_subject->'raw_tokens')::jsonb IS NOT NULL AND
         jsonb_array_length(coalesce(v_render_subject->'raw_tokens','[]'::jsonb))>0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','render_check','code','subject_raw_tokens_present'));
      END IF;
      IF coalesce(length(v_tv.body_html),0)>0 THEN
        v_render_html := comm_hub_render_template(v_tv.body_html, coalesce(v_resolution->'context','{}'::jsonb));
        IF (v_render_html->'raw_tokens')::jsonb IS NOT NULL AND
           jsonb_array_length(coalesce(v_render_html->'raw_tokens','[]'::jsonb))>0 THEN
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

  -- (14) runtime governance evaluation for the requested stage
  IF v_tv_id IS NOT NULL AND v_map IS NOT NULL THEN
    BEGIN
      v_gov_check := check_comm_hub_runtime_governance(
        p_module_code := p_module_code,
        p_event_code := p_event_code,
        p_channel := v_channel,
        p_target_stage := CASE
          WHEN v_stage='PREVIEW_READY' THEN 'PREVIEW_TEST'
          WHEN v_stage='DRY_RUN_READY' THEN 'DRY_RUN'
          WHEN v_stage='CONTROLLED_STUB_READY' THEN 'CONTROLLED_STUB'
          ELSE 'PREVIEW_TEST' END
      );
      IF (v_gov_check->'blockers')::jsonb IS NOT NULL AND
         jsonb_array_length(coalesce(v_gov_check->'blockers','[]'::jsonb))>0 THEN
        v_blockers := v_blockers || (
          SELECT jsonb_agg(jsonb_build_object('stage','runtime_governance','code', coalesce(b->>'code','governance_blocker'),'details',b))
          FROM jsonb_array_elements(v_gov_check->'blockers') b
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','runtime_governance_check_error','message',SQLERRM));
    END;
  END IF;

  -- (15) build manifest + hash
  v_manifest := _comm_hub_build_event_manifest(p_module_code,p_event_code,v_channel);
  v_hash := encode(digest(comm_hub_canonical_jsonb(v_manifest)::text,'sha256'),'hex');

  -- (16) per-stage readiness
  v_ready_readiness := jsonb_array_length(v_blockers)=0
                       OR (SELECT NOT bool_or((b->>'code') IN (
                          'event_not_registered','event_template_map_missing_or_inactive',
                          'template_active_version_missing')) FROM jsonb_array_elements(v_blockers) b);
  v_ready_preview := jsonb_array_length(v_blockers)=0;
  v_ready_dry_run := v_ready_preview;
  v_ready_stub := v_ready_preview;
  v_ready_stage := CASE v_stage
    WHEN 'READINESS_ONLY' THEN v_ready_readiness
    WHEN 'PREVIEW_READY' THEN v_ready_preview
    WHEN 'DRY_RUN_READY' THEN v_ready_dry_run
    WHEN 'CONTROLLED_STUB_READY' THEN v_ready_stub END;

  -- (17) record certification row
  INSERT INTO comm_hub_certification(
    entity_type, entity_id, entity_version, certification_kind, result,
    dependency_manifest, dependency_hash, renderer_version, channel,
    validation_findings, error_count, warning_count, is_stale, certified_at, certified_by,
    certification_reason
  ) VALUES (
    'EVENT_TEMPLATE_MAPPING',
    coalesce(v_map.id, gen_random_uuid()),
    v_tv_id,
    'go_live_readiness_'||v_stage,
    CASE WHEN v_ready_stage THEN 'PASS' ELSE 'FAIL' END,
    v_manifest,
    v_hash,
    'comm-hub-render/1',
    v_channel,
    jsonb_build_object('blockers',v_blockers,'warnings',v_warnings,'stage',v_stage),
    jsonb_array_length(v_blockers),
    jsonb_array_length(v_warnings),
    false,
    now(),
    auth.uid(),
    'run_comm_hub_go_live_certification'
  ) RETURNING id INTO v_cert_id;

  RETURN jsonb_build_object(
    'ok', true,
    'module_code', p_module_code,
    'event_code', p_event_code,
    'channel', v_channel,
    'requested_stage', v_stage,
    'ready_for_requested_stage', v_ready_stage,
    'ready_by_stage', jsonb_build_object(
      'READINESS_ONLY', v_ready_readiness,
      'PREVIEW_READY', v_ready_preview,
      'DRY_RUN_READY', v_ready_dry_run,
      'CONTROLLED_STUB_READY', v_ready_stub
    ),
    'blockers', v_blockers,
    'warnings', v_warnings,
    'manifest_hash', v_hash,
    'certification_id', v_cert_id,
    'mapping_id', v_map.id,
    'template_version_id', v_tv_id,
    'payload_schema_id', v_schema.id,
    'payload_schema_version', v_schema.schema_version,
    'sender_profile_id', v_sender_id,
    'sender_readiness_state', coalesce(v_readiness.readiness_state,'MISSING'),
    'recipient_policy_version', v_recipient.policy_version,
    'unresolved_required_count', jsonb_array_length(coalesce(v_resolution->'unresolved_required','[]'::jsonb)),
    'raw_token_count', jsonb_array_length(coalesce(v_resolution->'raw_tokens','[]'::jsonb))
      + jsonb_array_length(coalesce(v_render_subject->'raw_tokens','[]'::jsonb))
      + jsonb_array_length(coalesce(v_render_html->'raw_tokens','[]'::jsonb)),
    'executed', false,
    'schema_version', 'go-live-runner/1'
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.run_comm_hub_go_live_certification(text,text,text,text,boolean) TO authenticated, service_role;

-- ============================================================
-- 4. Platform-wide template renderability assessment
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_all_comm_hub_template_renderability()
RETURNS TABLE(
  template_id uuid,
  template_version_id uuid,
  template_code text,
  version_no int,
  status text,
  purpose text,
  module_code text,
  event_code text,
  channel text,
  detected_variable_count int,
  contract_row_count int,
  fixture_present boolean,
  recipient_required boolean,
  sender_required boolean,
  renderable boolean,
  raw_token_count int,
  unresolved_required_count int,
  blockers jsonb,
  recommended_action text,
  dependency_hash text,
  checked_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  rec record;
  v_manifest jsonb;
  v_purpose text;
  v_map record;
  v_contract_ct int;
  v_fixture record;
  v_blockers jsonb;
  v_render_subj jsonb;
  v_render_html jsonb;
  v_raw int;
BEGIN
  FOR rec IN
    SELECT v.id AS tv_id, v.template_id, v.version_no, v.status,
           v.subject, v.body_html, v.body_text,
           t.code AS template_code, t.module_code AS t_module
      FROM core_template_version v
      JOIN core_template t ON t.id=v.template_id
     WHERE upper(v.status::text) IN ('ACTIVE','PUBLISHED')
  LOOP
    v_blockers := '[]'::jsonb;
    v_purpose := comm_hub_classify_template_purpose(rec.template_id);
    SELECT m.module_code, m.event_code, m.channel, m.id AS map_id
      INTO v_map
      FROM communication_hub_event_template_map m
     WHERE m.template_id=rec.template_id AND m.active=true
     ORDER BY updated_at DESC LIMIT 1;
    SELECT count(*) INTO v_contract_ct
      FROM communication_hub_template_variable_contract
     WHERE template_version_id=rec.tv_id;
    IF v_map.module_code IS NOT NULL THEN
      SELECT * INTO v_fixture FROM communication_hub_event_test_scenario
       WHERE module_code=v_map.module_code AND event_code=v_map.event_code AND is_active=true LIMIT 1;
    ELSE
      v_fixture := NULL;
    END IF;

    -- purpose-specific rules
    IF v_purpose='EVENT_COMMUNICATION' THEN
      IF v_map.module_code IS NULL THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','event_mapping_missing'));
      END IF;
      IF v_contract_ct=0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','variable_contract_missing'));
      END IF;
      IF v_fixture IS NULL THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','governed_fixture_missing'));
      END IF;
    ELSIF v_purpose='MANUAL_CORRESPONDENCE' THEN
      IF v_contract_ct=0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','manual_correspondence_context_missing'));
      END IF;
    ELSIF v_purpose='DOCUMENT_GENERATION' THEN
      IF v_contract_ct=0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','document_fixture_missing'));
      END IF;
    ELSIF v_purpose='FORM_OUTPUT' THEN
      IF v_contract_ct=0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','form_output_context_missing'));
      END IF;
    END IF;

    -- synthetic render with empty context to count raw tokens present in template body
    v_raw := 0;
    BEGIN
      IF coalesce(length(rec.subject),0)>0 THEN
        v_render_subj := comm_hub_render_template(rec.subject,'{}'::jsonb);
        v_raw := v_raw + jsonb_array_length(coalesce(v_render_subj->'raw_tokens','[]'::jsonb));
      END IF;
      IF coalesce(length(rec.body_html),0)>0 THEN
        v_render_html := comm_hub_render_template(rec.body_html,'{}'::jsonb);
        v_raw := v_raw + jsonb_array_length(coalesce(v_render_html->'raw_tokens','[]'::jsonb));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code','render_error','details',SQLERRM));
    END;

    template_id := rec.template_id;
    template_version_id := rec.tv_id;
    template_code := rec.template_code;
    version_no := rec.version_no;
    status := rec.status::text;
    purpose := coalesce(v_purpose,'UNKNOWN');
    module_code := v_map.module_code;
    event_code := v_map.event_code;
    channel := v_map.channel;
    detected_variable_count := v_raw;
    contract_row_count := v_contract_ct;
    fixture_present := v_fixture IS NOT NULL;
    recipient_required := (v_contract_ct>0);
    sender_required := (v_map.map_id IS NOT NULL);
    raw_token_count := v_raw;
    unresolved_required_count := CASE WHEN v_contract_ct=0 THEN v_raw ELSE 0 END;
    renderable := jsonb_array_length(v_blockers)=0;
    blockers := v_blockers;
    recommended_action := CASE
      WHEN jsonb_array_length(v_blockers)=0 THEN 'READY'
      WHEN v_purpose='EVENT_COMMUNICATION' AND v_map.module_code IS NULL THEN 'CREATE_EVENT_MAPPING'
      WHEN v_contract_ct=0 THEN 'DEFINE_VARIABLE_CONTRACT'
      WHEN v_fixture IS NULL THEN 'DEFINE_GOVERNED_FIXTURE'
      ELSE 'REVIEW_BLOCKERS' END;
    dependency_hash := NULL;
    checked_at := now();
    RETURN NEXT;
  END LOOP;
END; $$;

GRANT EXECUTE ON FUNCTION public.check_all_comm_hub_template_renderability() TO authenticated, service_role;

-- ============================================================
-- 5. Stop-gate helper — reads latest event certification for a stage
-- ============================================================
CREATE OR REPLACE FUNCTION public.assert_comm_hub_event_ready_for_stage(
  p_module_code text, p_event_code text, p_channel text, p_target_stage text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_cert record;
BEGIN
  SELECT * INTO v_cert FROM comm_hub_certification
   WHERE entity_type='EVENT_TEMPLATE_MAPPING'
     AND certification_kind='go_live_readiness_'||upper(p_target_stage)
     AND channel=lower(p_channel)
     AND (dependency_manifest->>'event_code')=p_event_code
     AND (dependency_manifest->>'module_code')=p_module_code
   ORDER BY certified_at DESC LIMIT 1;
  IF v_cert IS NULL THEN
    RETURN jsonb_build_object('ok',false,'code','event_not_certified_for_stage','stage',p_target_stage);
  END IF;
  IF v_cert.is_stale THEN
    RETURN jsonb_build_object('ok',false,'code','event_certification_stale','stage',p_target_stage,'reason',v_cert.stale_reason);
  END IF;
  IF v_cert.result<>'PASS' THEN
    RETURN jsonb_build_object('ok',false,'code','event_certification_failed','stage',p_target_stage,'certification_id',v_cert.id);
  END IF;
  RETURN jsonb_build_object('ok',true,'certification_id',v_cert.id,'manifest_hash',v_cert.dependency_hash);
END; $$;

GRANT EXECUTE ON FUNCTION public.assert_comm_hub_event_ready_for_stage(text,text,text,text) TO authenticated, service_role;
