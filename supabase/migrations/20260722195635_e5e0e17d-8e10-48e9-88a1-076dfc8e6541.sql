
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
  SELECT jsonb_build_object('id',id::text,'template_code',template_code) INTO v_reg
  FROM communication_hub_module_event_registry
  WHERE module_code=p_module_code AND event_code=p_event_code LIMIT 1;

  SELECT jsonb_build_object('id',m.id::text,'template_id',m.template_id::text,'template_code',m.template_code,'sender_profile_id',m.sender_profile_id::text,'active',m.active) INTO v_map
  FROM communication_hub_event_template_map m
  WHERE m.module_code=p_module_code AND m.event_code=p_event_code
    AND lower(m.channel)=lower(p_channel) AND m.active=true LIMIT 1;

  IF v_map IS NOT NULL THEN
    SELECT jsonb_build_object('id',t.id::text,'code',t.code,'status',t.status,'active_version_id',t.active_version_id::text) INTO v_tpl
    FROM core_template t WHERE t.id=(v_map->>'template_id')::uuid;
    SELECT jsonb_build_object('id',v.id::text,'version_no',v.version_no,'status',v.status,'subject_len',coalesce(length(v.subject),0),'html_len',coalesce(length(v.body_html),0),'text_len',coalesce(length(v.body_text),0)) INTO v_ver
    FROM core_template_version v WHERE v.id=(v_tpl->>'active_version_id')::uuid;
  END IF;

  SELECT jsonb_build_object('id',id::text,'version',schema_version,'status',status) INTO v_schema
  FROM communication_hub_event_payload_schema
  WHERE module_code=p_module_code AND event_code=p_event_code
  ORDER BY schema_version DESC LIMIT 1;

  SELECT jsonb_agg(jsonb_build_object('id',id::text,'var',variable_name,'source',source_type,'path',canonical_path,'req',is_required,'status',contract_status) ORDER BY variable_name) INTO v_contract
  FROM communication_hub_template_variable_contract
  WHERE module_code=p_module_code AND event_code=p_event_code;

  SELECT jsonb_build_object('id',id::text,'key',scenario_key,'active',is_active) INTO v_scenario
  FROM communication_hub_event_test_scenario
  WHERE module_code=p_module_code AND event_code=p_event_code AND lower(channel)=lower(p_channel) AND is_active=true
  ORDER BY updated_at DESC LIMIT 1;

  SELECT jsonb_build_object('mode',active_mode,'version',policy_version,'display_confirmed',single_configured_display_name_confirmed) INTO v_recipient
  FROM communication_hub_recipient_policy LIMIT 1;

  IF v_map IS NOT NULL AND (v_map->>'sender_profile_id') IS NOT NULL THEN
    SELECT jsonb_build_object('id',id::text,'code',profile_code,'from',from_email,'display',display_name,'domain_verified',domain_verified,'provider_status',provider_identity_status,'enabled',is_enabled) INTO v_sender
    FROM communication_hub_sender_profile WHERE id=(v_map->>'sender_profile_id')::uuid;
    SELECT jsonb_build_object('state',readiness_state,'version',sender_version,'stale',is_stale) INTO v_readiness
    FROM comm_hub_sender_readiness WHERE sender_profile_id=(v_map->>'sender_profile_id')::uuid
    ORDER BY computed_at DESC LIMIT 1;
  END IF;

  IF v_ver IS NOT NULL THEN
    SELECT jsonb_build_object('id',id::text,'status',governance_status::text,'entity_type',entity_type::text) INTO v_gov
    FROM comm_hub_governance_record
    WHERE entity_type='TEMPLATE_VERSION' AND entity_id=(v_ver->>'id')::uuid
    ORDER BY updated_at DESC LIMIT 1;
    SELECT jsonb_build_object('id',id::text,'result',result,'stale',is_stale,'hash',dependency_hash) INTO v_cert
    FROM comm_hub_certification
    WHERE entity_type='TEMPLATE_VERSION' AND entity_id=(v_ver->>'id')::uuid
    ORDER BY certified_at DESC LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'schema_version','comm-hub-event-manifest/1','module_code',p_module_code,'event_code',p_event_code,'channel',lower(p_channel),
    'event_registry',v_reg,'event_template_map',v_map,'template',v_tpl,'template_version',v_ver,
    'event_payload_schema',v_schema,'variable_contract',coalesce(v_contract,'[]'::jsonb),'test_scenario',v_scenario,
    'recipient_policy',v_recipient,'sender_profile',v_sender,'sender_readiness',v_readiness,
    'template_version_governance',v_gov,'template_version_certification',v_cert,
    'renderer_version','comm-hub-render/1','resolver_version','comm-hub-resolve/1',
    'dispatch_contract_version','controlled-dispatch.v1','targeted_creation_contract_version','create-controlled-stub.v1');
END; $$;
