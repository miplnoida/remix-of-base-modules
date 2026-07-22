
CREATE OR REPLACE FUNCTION public.build_comm_hub_dependency_manifest(
  p_entity_type text, p_entity_id uuid, p_entity_version_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public, extensions
AS $$
DECLARE
  v_manifest jsonb := jsonb_build_object(
    'manifest_schema_version', 1,
    'manifest_builder_version', '2026.07.22.b2.3',
    'canonical_renderer_version', '2026.07.22.canonical.1',
    'security_policy_version', '1',
    'template_type_policy_version', '1',
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'entity_version_id', p_entity_version_id,
    'dependencies', '{}'::jsonb,
    'dependency_categories', '[]'::jsonb,
    'warnings', '[]'::jsonb,
    'build_status', 'OK'
  );
  v_missing text[] := ARRAY[]::text[];
  v_deps jsonb := '{}'::jsonb;
  v_cats text[] := ARRAY[]::text[];
  v_purpose text;
  v_template record;
  v_version record;
  v_mapping record;
BEGIN
  IF p_entity_type = 'TEMPLATE_VERSION' THEN
    SELECT id, template_id, version_no, status, subject, body_html, body_text, layout_id
      INTO v_version FROM public.core_template_version WHERE id = p_entity_id;
    IF NOT FOUND THEN
      v_missing := v_missing || ARRAY['DEPENDENCY_TEMPLATE_VERSION_MISSING']::text[];
    ELSE
      SELECT id, code, template_type, status, module_code, country_code, institution_code
        INTO v_template FROM public.core_template WHERE id = v_version.template_id;
      v_purpose := public.comm_hub_classify_template_purpose(v_template.id);
      v_deps := jsonb_build_object(
        'template_id', v_template.id,
        'template_code', v_template.code,
        'template_type', v_template.template_type,
        'template_status', upper(coalesce(v_template.status,'')),
        'module_code', v_template.module_code,
        'country_code', v_template.country_code,
        'institution_code', v_template.institution_code,
        'template_purpose', v_purpose,
        'template_version_id', v_version.id,
        'template_version_no', v_version.version_no,
        'template_version_status', upper(coalesce(v_version.status,'')),
        'subject_hash', encode(extensions.digest(convert_to(coalesce(v_version.subject,''),'UTF8'),'sha256'),'hex'),
        'body_html_hash', encode(extensions.digest(convert_to(coalesce(v_version.body_html,''),'UTF8'),'sha256'),'hex'),
        'body_text_hash', encode(extensions.digest(convert_to(coalesce(v_version.body_text,''),'UTF8'),'sha256'),'hex'),
        'layout_id', v_version.layout_id);
      v_cats := ARRAY['TEMPLATE_CONTENT','TEMPLATE_VERSION','TEMPLATE_PURPOSE','TEMPLATE_TYPE']::text[];

      v_deps := v_deps || jsonb_build_object(
        'sections', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', s.id, 'section_key', s.section_key,
            'section_order', s.sort_order, 'is_required', s.is_required,
            'content_hash', encode(extensions.digest(convert_to(coalesce(s.content_html,''),'UTF8'),'sha256'),'hex')
          ) ORDER BY s.sort_order NULLS LAST, s.id)
          FROM public.core_template_section s WHERE s.version_id = v_version.id
        ), '[]'::jsonb));
      v_cats := v_cats || ARRAY['SECTION']::text[];

      v_deps := v_deps || jsonb_build_object(
        'variable_bindings', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', vb.id, 'token_code', vb.token_code, 'is_required', vb.is_required,
            'default_hash', encode(extensions.digest(convert_to(coalesce(vb.default_value,''),'UTF8'),'sha256'),'hex')
          ) ORDER BY vb.token_code, vb.id)
          FROM public.core_template_variable_binding vb WHERE vb.template_version_id = v_version.id
        ), '[]'::jsonb));
      v_cats := v_cats || ARRAY['VARIABLE_CONTRACT']::text[];

      IF v_purpose = 'EVENT_COMMUNICATION' THEN
        SELECT id, module_code, event_code, channel, sender_profile_id, active, risk_level
          INTO v_mapping FROM public.communication_hub_event_template_map
         WHERE template_id = v_template.id AND active = true
         ORDER BY module_code, event_code, channel LIMIT 1;
        IF NOT FOUND THEN
          v_missing := v_missing || ARRAY['DEPENDENCY_MAPPING_MISSING']::text[];
        ELSE
          v_deps := v_deps || jsonb_build_object(
            'event_mapping', jsonb_build_object(
              'id', v_mapping.id, 'module_code', v_mapping.module_code,
              'event_code', v_mapping.event_code, 'channel', lower(v_mapping.channel),
              'sender_profile_id', v_mapping.sender_profile_id, 'risk_level', v_mapping.risk_level));
          v_cats := v_cats || ARRAY['EVENT_MAPPING','SENDER_CONFIGURATION']::text[];
          v_deps := v_deps || jsonb_build_object(
            'sender_readiness', COALESCE((
              SELECT jsonb_build_object(
                'sender_profile_id', sr.sender_profile_id, 'sender_version', sr.sender_version,
                'readiness_state', sr.readiness_state,
                'state_hash', encode(extensions.digest(convert_to(coalesce(sr.readiness_state::text,''),'UTF8'),'sha256'),'hex'))
              FROM public.comm_hub_sender_readiness sr
              WHERE sr.sender_profile_id = v_mapping.sender_profile_id
              ORDER BY sr.computed_at DESC LIMIT 1), 'null'::jsonb));
          v_cats := v_cats || ARRAY['SENDER_READINESS']::text[];
        END IF;
      ELSIF v_purpose IS NULL OR v_purpose = 'UNCLASSIFIED' THEN
        v_missing := v_missing || ARRAY['TEMPLATE_PURPOSE_UNCLASSIFIED']::text[];
      END IF;

      v_manifest := v_manifest
        || jsonb_build_object('template_purpose', v_purpose)
        || jsonb_build_object('module_code', v_template.module_code)
        || jsonb_build_object('dependencies', v_deps)
        || jsonb_build_object('dependency_categories', to_jsonb(
             (SELECT array_agg(DISTINCT c ORDER BY c) FROM unnest(v_cats) c)));
    END IF;
  ELSE
    v_manifest := v_manifest || jsonb_build_object(
      'dependencies', jsonb_build_object(
        'entity_type', p_entity_type, 'entity_id', p_entity_id,
        'entity_version_id', p_entity_version_id));
  END IF;

  IF array_length(v_missing,1) IS NOT NULL THEN
    v_manifest := v_manifest
      || jsonb_build_object('build_status','BLOCKED')
      || jsonb_build_object('missing_dependencies', to_jsonb(v_missing));
  END IF;
  RETURN v_manifest;
END $$;

NOTIFY pgrst, 'reload schema';
