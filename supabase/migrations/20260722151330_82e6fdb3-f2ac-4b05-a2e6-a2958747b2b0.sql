DROP FUNCTION IF EXISTS public.render_comm_hub_template_version(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.comm_hub_classify_template_purpose(p_template_id uuid)
RETURNS text LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN t.is_base_layout = true                                             THEN 'SHARED_LAYOUT'
    WHEN upper(COALESCE(t.template_type,'')) IN ('DOCUMENT','STATEMENT','RECEIPT','CERTIFICATE')
                                                                             THEN 'DOCUMENT_GENERATION'
    WHEN upper(COALESCE(t.template_type,'')) = 'FORM'                        THEN 'FORM_OUTPUT'
    WHEN upper(COALESCE(t.template_type,'')) IN ('LETTER','NOTICE')          THEN 'MANUAL_CORRESPONDENCE'
    WHEN upper(COALESCE(t.template_type,'')) IN ('EMAIL','SMS','IN_APP')     THEN 'EVENT_COMMUNICATION'
    ELSE 'UNCLASSIFIED_REVIEW_REQUIRED'
  END
  FROM public.core_template t WHERE t.id = p_template_id;
$$;
GRANT EXECUTE ON FUNCTION public.comm_hub_classify_template_purpose(uuid) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.comm_hub_classify_template_purpose(uuid) IS
'Phase 3 canonical template-purpose classifier.';

CREATE OR REPLACE FUNCTION public.comm_hub_scrub_protected_keys(p_bundle jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(p_bundle,'{}'::jsonb)
       - 'module_code' - 'event_code' - 'channel'
       - 'generated_at' - 'current_date' - 'correlation_id'
       - 'request_no'  - 'request_id'   - 'requested_at'
       - 'recipient_email' - 'recipient_name' - 'display_name' - 'email'
       - 'sender_email' - 'sender_display_name' - 'reply_to'
       - 'template_id' - 'template_version_id';
$$;
GRANT EXECUTE ON FUNCTION public.comm_hub_scrub_protected_keys(jsonb) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.comm_hub_scrub_protected_keys(jsonb) IS
'Phase 3 source-ownership guard.';

CREATE OR REPLACE FUNCTION public.render_comm_hub_template_version(
  p_template_version_id uuid, p_tokens jsonb, p_channel text, p_render_mode text
) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public','extensions' AS $$
DECLARE
  v_ver RECORD; v_tpl RECORD; v_purpose text;
  v_subject jsonb; v_html jsonb; v_text jsonb;
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_unresolved jsonb := '[]'::jsonb;
  v_subject_hash text; v_body_hash text; v_content_hash text;
  v_channel text := upper(COALESCE(p_channel,'EMAIL'));
  v_mode    text := upper(COALESCE(p_render_mode,'PREVIEW_TEST'));
BEGIN
  IF p_template_version_id IS NULL THEN
    RETURN jsonb_build_object('blockers', jsonb_build_array(jsonb_build_object('code','template_version_missing')),
                              'canonical_renderer_version','phase3_v1');
  END IF;
  SELECT * INTO v_ver FROM public.core_template_version WHERE id = p_template_version_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('blockers', jsonb_build_array(jsonb_build_object('code','template_version_not_found','template_version_id',p_template_version_id)),
                              'canonical_renderer_version','phase3_v1');
  END IF;
  SELECT * INTO v_tpl FROM public.core_template WHERE id = v_ver.template_id;
  v_purpose := public.comm_hub_classify_template_purpose(v_ver.template_id);

  IF v_channel NOT IN ('EMAIL','SMS','LETTER','NOTICE','IN_APP','PORTAL','DOCUMENT') THEN
    v_warnings := v_warnings || jsonb_build_object('code','channel_not_recognised','channel',v_channel);
  END IF;
  IF v_mode NOT IN ('PREVIEW_TEST','DRY_RUN_TEST','CONTROLLED_LIVE_TEST','PRODUCTION_EVENT','DOCUMENT_GENERATION') THEN
    v_warnings := v_warnings || jsonb_build_object('code','render_mode_not_recognised','render_mode',v_mode);
  END IF;

  v_subject := public.render_comm_hub_content(COALESCE(v_ver.subject,''),   p_tokens, 'text');
  v_html    := public.render_comm_hub_content(COALESCE(v_ver.body_html,''), p_tokens, 'html');
  v_text    := public.render_comm_hub_content(COALESCE(v_ver.body_text,''), p_tokens, 'text');

  IF (v_subject->>'rendered') ~ E'[\\r\\n]' THEN
    v_blockers := v_blockers || jsonb_build_object('code','subject_control_chars',
      'message','Rendered subject contains CR/LF and would be rejected by SMTP.');
  END IF;

  v_unresolved := (v_subject->'unresolved') || (v_html->'unresolved') || (v_text->'unresolved');

  IF v_purpose = 'EVENT_COMMUNICATION' AND v_channel = 'EMAIL' THEN
    IF COALESCE(v_ver.subject,'')   = '' THEN v_blockers := v_blockers || jsonb_build_object('code','subject_empty'); END IF;
    IF COALESCE(v_ver.body_html,'')='' AND COALESCE(v_ver.body_text,'')='' THEN
      v_blockers := v_blockers || jsonb_build_object('code','body_missing');
    END IF;
  ELSIF v_purpose = 'DOCUMENT_GENERATION' THEN
    IF COALESCE(v_ver.body_html,'')='' AND COALESCE(v_ver.body_text,'')='' THEN
      v_blockers := v_blockers || jsonb_build_object('code','document_body_missing');
    END IF;
  ELSIF v_purpose IN ('MANUAL_CORRESPONDENCE','FORM_OUTPUT') THEN
    IF COALESCE(v_ver.body_html,'')='' AND COALESCE(v_ver.body_text,'')='' THEN
      v_warnings := v_warnings || jsonb_build_object('code','body_empty');
    END IF;
  END IF;

  v_subject_hash := encode(extensions.digest(COALESCE(v_subject->>'rendered',''),'sha256'),'hex');
  v_body_hash    := encode(extensions.digest(
    COALESCE(v_html->>'rendered','') || E'\n---\n' || COALESCE(v_text->>'rendered',''),'sha256'),'hex');
  v_content_hash := encode(extensions.digest(v_subject_hash || v_body_hash,'sha256'),'hex');

  RETURN jsonb_build_object(
    'template_id', v_tpl.id,
    'template_version_id', v_ver.id,
    'template_type', v_tpl.template_type,
    'template_purpose', v_purpose,
    'channel', v_channel,
    'render_mode', v_mode,
    'rendered_subject',   v_subject->>'rendered',
    'rendered_body_html', v_html->>'rendered',
    'rendered_body_text', v_text->>'rendered',
    'subject_hash', v_subject_hash,
    'body_hash',    v_body_hash,
    'content_hash', v_content_hash,
    'resolved_variables', COALESCE(p_tokens,'{}'::jsonb),
    'unresolved',           v_unresolved,
    'unresolved_variables', v_unresolved,
    'unresolved_count', jsonb_array_length(v_unresolved),
    'invalid_variables', '[]'::jsonb,
    'blockers', v_blockers,
    'warnings', v_warnings,
    'canonical_renderer_version','phase3_v1'
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.render_comm_hub_template_version(uuid, jsonb, text, text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.render_comm_hub_template_version(uuid, jsonb, text, text) IS
'Phase 3 canonical template-version renderer with channel + render_mode.';

CREATE OR REPLACE FUNCTION public.render_comm_hub_template_version(p_template_version_id uuid, p_tokens jsonb)
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public','extensions' AS $$
  SELECT public.render_comm_hub_template_version(p_template_version_id, p_tokens, 'EMAIL','PREVIEW_TEST');
$$;
GRANT EXECUTE ON FUNCTION public.render_comm_hub_template_version(uuid, jsonb) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.render_comm_hub_template_version(uuid, jsonb) IS
'Phase 3 compatibility wrapper. Delegates to 4-arg canonical renderer.';

CREATE OR REPLACE FUNCTION public.certify_comm_hub_template_version(p_template_version_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public','extensions' AS $$
DECLARE
  v_ver RECORD; v_tpl RECORD; v_map RECORD; v_scenario RECORD;
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_render jsonb; v_purpose text; v_result text;
  v_mapping_applicable boolean; v_has_map boolean := false;
  v_sender_id uuid; v_contract_count int := 0; v_schema_count int := 0;
BEGIN
  IF p_template_version_id IS NULL THEN
    RETURN jsonb_build_object('result','BLOCKED_TEMPLATE_CONTENT','is_certified',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','template_version_missing')));
  END IF;
  SELECT * INTO v_ver FROM public.core_template_version WHERE id = p_template_version_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('result','BLOCKED_TEMPLATE_CONTENT','is_certified',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','template_version_not_found','template_version_id',p_template_version_id)));
  END IF;
  SELECT * INTO v_tpl FROM public.core_template WHERE id = v_ver.template_id;
  v_purpose := public.comm_hub_classify_template_purpose(v_ver.template_id);
  v_mapping_applicable := (v_purpose = 'EVENT_COMMUNICATION');

  IF lower(COALESCE(v_ver.status,'')) NOT IN ('active','published') THEN
    v_blockers := v_blockers || jsonb_build_object('code','status_not_publishable','status',v_ver.status);
  END IF;

  SELECT * INTO v_map FROM public.communication_hub_event_template_map
    WHERE template_id = v_tpl.id ORDER BY updated_at DESC NULLS LAST LIMIT 1;
  v_has_map := FOUND;

  IF v_mapping_applicable AND NOT v_has_map THEN
    v_blockers := v_blockers || jsonb_build_object('code','event_mapping_required',
      'template_code', v_tpl.code);
  END IF;

  IF v_has_map THEN
    v_sender_id := v_map.sender_profile_id;
    IF v_sender_id IS NULL THEN
      SELECT id INTO v_sender_id FROM public.communication_hub_sender_profile
       WHERE is_enabled AND is_default LIMIT 1;
    END IF;
    IF v_sender_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','sender_not_resolvable');
    END IF;

    SELECT count(*) INTO v_schema_count
      FROM public.communication_hub_event_payload_schema
     WHERE module_code = v_map.module_code AND event_code = v_map.event_code;
    IF v_schema_count = 0 THEN v_warnings := v_warnings || jsonb_build_object('code','no_payload_schema'); END IF;
  END IF;

  SELECT count(*) INTO v_contract_count
    FROM public.communication_hub_template_variable_contract
   WHERE template_version_id = v_ver.id OR template_id = v_tpl.id OR template_code = v_tpl.code;
  IF v_contract_count = 0 THEN
    v_warnings := v_warnings || jsonb_build_object('code','no_variable_contract_bound','template_code',v_tpl.code);
  END IF;

  v_render := public.render_comm_hub_template_version(v_ver.id, '{}'::jsonb, 'EMAIL','PREVIEW_TEST');
  IF jsonb_array_length(v_render->'blockers') > 0 THEN
    v_blockers := v_blockers || (v_render->'blockers');
  END IF;

  IF v_mapping_applicable AND v_has_map THEN
    SELECT * INTO v_scenario FROM public.communication_hub_event_test_scenario
      WHERE module_code=v_map.module_code AND event_code=v_map.event_code
        AND channel=v_map.channel AND is_active=true
      ORDER BY scenario_key='default' DESC, updated_at DESC LIMIT 1;
    IF FOUND THEN
      v_render := public.render_comm_hub_template_version(v_ver.id,
        public.comm_hub_scrub_protected_keys(COALESCE(v_scenario.tokens,'{}'::jsonb)),
        'EMAIL','PREVIEW_TEST');
      IF (v_render->>'unresolved_count')::int > 0 THEN
        v_warnings := v_warnings || jsonb_build_object('code','unresolved_tokens_under_scenario',
          'unresolved', v_render->'unresolved');
      END IF;
    ELSE
      v_warnings := v_warnings || jsonb_build_object('code','no_test_scenario');
    END IF;
  END IF;

  v_result := CASE
    WHEN jsonb_array_length(v_blockers) = 0 AND v_purpose <> 'UNCLASSIFIED_REVIEW_REQUIRED' THEN 'CERTIFIED'
    WHEN v_purpose = 'UNCLASSIFIED_REVIEW_REQUIRED' THEN 'TEMPLATE_PURPOSE_UNCLASSIFIED'
    WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(v_blockers) x WHERE x->>'code'='event_mapping_required')
                                                    THEN 'BLOCKED_EVENT_MAPPING'
    WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(v_blockers) x WHERE x->>'code'='sender_not_resolvable')
                                                    THEN 'BLOCKED_SENDER'
    WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(v_blockers) x
                 WHERE x->>'code' IN ('body_missing','document_body_missing','subject_empty'))
                                                    THEN 'BLOCKED_TEMPLATE_CONTENT'
    ELSE 'BLOCKED_OTHER'
  END;

  RETURN jsonb_build_object(
    'result', v_result,
    'is_certified', (v_result = 'CERTIFIED'),
    'template_purpose', v_purpose,
    'mapping_applicable', v_mapping_applicable,
    'template_version_id', v_ver.id,
    'template_id', v_tpl.id,
    'template_code', v_tpl.code,
    'template_type', v_tpl.template_type,
    'status', v_ver.status,
    'blockers', v_blockers,
    'blocker_count', jsonb_array_length(v_blockers),
    'warnings', v_warnings,
    'warning_count', jsonb_array_length(v_warnings),
    'canonical_renderer_version','phase3_v1'
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.certify_comm_hub_template_version(uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.certify_all_comm_hub_template_versions();
CREATE OR REPLACE FUNCTION public.certify_all_comm_hub_template_versions()
RETURNS TABLE(template_version_id uuid, template_code text, template_purpose text, result text,
              is_certified boolean, blocker_count int, warning_count int, detail jsonb)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT v.id, t.code,
         r->>'template_purpose', r->>'result',
         (r->>'is_certified')::boolean,
         (r->>'blocker_count')::int,
         (r->>'warning_count')::int,
         r
  FROM public.core_template_version v
  JOIN public.core_template t ON t.id = v.template_id
  CROSS JOIN LATERAL public.certify_comm_hub_template_version(v.id) AS r
  WHERE lower(COALESCE(v.status,'')) IN ('active','published');
$$;
GRANT EXECUTE ON FUNCTION public.certify_all_comm_hub_template_versions() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.prepare_comm_hub_preview(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE
  v_module_code text := p_payload->>'module_code';
  v_event_code  text := p_payload->>'event_code';
  v_channel     text := COALESCE(p_payload->>'channel','email');
  v_send_ctx    text := COALESCE(p_payload->>'send_context','preview');
  v_to  jsonb := COALESCE(p_payload->'to_recipients','[]'::jsonb);
  v_cc  jsonb := COALESCE(p_payload->'cc_recipients','[]'::jsonb);
  v_bcc jsonb := COALESCE(p_payload->'bcc_recipients','[]'::jsonb);
  v_sender_id uuid := NULLIF(p_payload->>'sender_profile_id','')::uuid;
  v_sender RECORD;
  v_ctx_in jsonb := public.comm_hub_scrub_protected_keys(COALESCE(p_payload->'context_data','{}'::jsonb));
  v_map RECORD; v_tpl RECORD; v_ver RECORD; v_policy RECORD; v_scenario RECORD;
  v_recipient_name text; v_recipient_name_confirmed boolean := false;
  v_request_no text;
  v_generated_at timestamptz := now();
  v_tokens jsonb; v_scenario_tokens jsonb := '{}'::jsonb;
  v_system_tokens jsonb; v_request_tokens jsonb; v_recipient_tokens jsonb := '{}'::jsonb;
  v_render jsonb;
  v_snapshot_id uuid; v_recipient_hash text; v_first_to text;
BEGIN
  IF v_module_code IS NULL OR v_event_code IS NULL THEN
    RAISE EXCEPTION 'module_code and event_code are required';
  END IF;
  SELECT * INTO v_map FROM public.communication_hub_event_template_map
    WHERE module_code = v_module_code AND event_code = v_event_code LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'no template mapped for %/%', v_module_code, v_event_code; END IF;
  SELECT * INTO v_tpl FROM public.core_template WHERE id = v_map.template_id;
  SELECT * INTO v_ver FROM public.core_template_version WHERE id = v_tpl.active_version_id;
  SELECT * INTO v_policy FROM public.communication_hub_recipient_policy LIMIT 1;

  IF v_sender_id IS NULL THEN v_sender_id := NULLIF(v_map.sender_profile_id::text,'')::uuid; END IF;
  IF v_sender_id IS NULL THEN
    SELECT id INTO v_sender_id FROM public.communication_hub_sender_profile
     WHERE is_enabled=true AND is_default=true AND (channel IS NULL OR channel = v_channel)
     ORDER BY updated_at DESC LIMIT 1;
  END IF;
  IF v_sender_id IS NULL THEN
    SELECT id INTO v_sender_id FROM public.communication_hub_sender_profile
     WHERE is_enabled=true AND (channel IS NULL OR channel = v_channel)
     ORDER BY is_default DESC NULLS LAST, updated_at DESC LIMIT 1;
  END IF;
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'sender_profile_missing: no active sender profile is configured for channel %', v_channel;
  END IF;
  SELECT * INTO v_sender FROM public.communication_hub_sender_profile WHERE id = v_sender_id;
  IF NOT FOUND OR COALESCE(v_sender.is_enabled,false)=false
     OR NULLIF(trim(COALESCE(v_sender.from_email,'')),'') IS NULL THEN
    RAISE EXCEPTION 'sender_profile_invalid: sender profile % is unusable', v_sender_id;
  END IF;

  v_first_to := CASE WHEN jsonb_array_length(v_to) > 0 THEN lower(trim(v_to->>0)) ELSE NULL END;

  IF v_policy.active_mode = 'SINGLE_CONFIGURED_RECIPIENT'
     AND v_policy.single_configured_display_name IS NOT NULL
     AND v_policy.single_configured_display_name_confirmed = true THEN
    v_recipient_name := v_policy.single_configured_display_name;
    v_recipient_name_confirmed := true;
  END IF;

  v_request_no := 'TEST-COMM-' || to_char(v_generated_at,'YYYYMMDD') || '-' ||
                  substr(replace(gen_random_uuid()::text,'-',''),1,8);

  v_system_tokens := jsonb_build_object(
    'module_code',v_module_code,'event_code',v_event_code,'channel',v_channel,
    'generated_at',to_char(v_generated_at,'YYYY-MM-DD HH24:MI:SS TZ'),
    'current_date',to_char(v_generated_at,'YYYY-MM-DD'),
    'correlation_id',gen_random_uuid()::text);
  v_request_tokens := jsonb_build_object(
    'request_no',v_request_no,'request_id',gen_random_uuid()::text,
    'requested_at',to_char(v_generated_at,'YYYY-MM-DD HH24:MI:SS TZ'));
  IF v_recipient_name IS NOT NULL THEN
    v_recipient_tokens := v_recipient_tokens || jsonb_build_object('display_name',v_recipient_name);
  END IF;
  IF v_first_to IS NOT NULL THEN
    v_recipient_tokens := v_recipient_tokens || jsonb_build_object('email',v_first_to);
  END IF;

  SELECT * INTO v_scenario FROM public.communication_hub_event_test_scenario
    WHERE module_code=v_module_code AND event_code=v_event_code
      AND channel=v_channel AND is_active=true
    ORDER BY scenario_key='default' DESC, updated_at DESC LIMIT 1;
  IF FOUND THEN
    v_scenario_tokens := public.comm_hub_scrub_protected_keys(COALESCE(v_scenario.tokens,'{}'::jsonb));
  END IF;

  v_tokens := v_scenario_tokens || v_ctx_in || v_recipient_tokens || v_system_tokens || v_request_tokens;

  v_render := public.render_comm_hub_template_version(v_ver.id, v_tokens, v_channel, 'PREVIEW_TEST');

  v_recipient_hash := public.comm_hub_normalize_recipient_set(v_to, v_cc, v_bcc);

  UPDATE public.communication_preview_snapshot
     SET status = 'SUPERSEDED'
   WHERE module_code=v_module_code AND event_code=v_event_code
     AND channel=v_channel AND recipient_set_hash=v_recipient_hash AND status='PREPARED';

  INSERT INTO public.communication_preview_snapshot(
    id, module_code, event_code, channel, send_context,
    to_recipients, cc_recipients, bcc_recipients, recipient_set_hash,
    template_id, template_version_id, sender_profile_id,
    rendered_subject, rendered_body_html, rendered_body_text,
    subject_hash, body_hash, content_hash, context_hash,
    unresolved_variables, context_data, status, expires_at, created_at
  ) VALUES (
    gen_random_uuid(), v_module_code, v_event_code, v_channel, v_send_ctx,
    v_to, v_cc, v_bcc, v_recipient_hash,
    v_tpl.id, v_ver.id, v_sender_id,
    v_render->>'rendered_subject', v_render->>'rendered_body_html', v_render->>'rendered_body_text',
    v_render->>'subject_hash', v_render->>'body_hash', v_render->>'content_hash',
    encode(extensions.digest(v_tokens::text,'sha256'),'hex'),
    v_render->'unresolved_variables',
    v_tokens || jsonb_build_object(
      'request_no', v_request_no,
      'recipient_name_confirmed', v_recipient_name_confirmed,
      'scenario_id',  COALESCE(v_scenario.id::text, NULL),
      'scenario_key', COALESCE(v_scenario.scenario_key, NULL),
      'template_purpose', v_render->>'template_purpose',
      'canonical_renderer_version', v_render->>'canonical_renderer_version'
    ),
    'PREPARED', now() + interval '24 hours', now()
  ) RETURNING id INTO v_snapshot_id;

  RETURN (SELECT to_jsonb(s.*) FROM public.communication_preview_snapshot s WHERE s.id = v_snapshot_id);
END; $$;
COMMENT ON FUNCTION public.prepare_comm_hub_preview(jsonb) IS
'Phase 3: delegates rendering to render_comm_hub_template_version. Scrubs untrusted bundles.';

CREATE OR REPLACE FUNCTION public.render_comm_hub_template_preview(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_module text := p_payload->>'module_code';
  v_event  text := p_payload->>'event_code';
  v_channel text := COALESCE(p_payload->>'channel','email');
  v_tokens jsonb := public.comm_hub_scrub_protected_keys(COALESCE(p_payload->'tokens','{}'::jsonb));
  v_map RECORD; v_ver RECORD; v_render jsonb;
  v_review jsonb; v_send jsonb;
  v_blockers text[] := ARRAY[]::text[];
  v_warnings text[] := ARRAY[]::text[];
  v_unresolved text[] := ARRAY[]::text[];
  v_block_codes text[];
BEGIN
  SELECT m.*, sp.from_email, sp.display_name, sp.reply_to_email, sp.is_enabled AS sender_enabled,
         sp.provider_identity_status, sp.domain_verified
    INTO v_map FROM communication_hub_event_template_map m
    LEFT JOIN communication_hub_sender_profile sp ON sp.id = m.sender_profile_id
   WHERE m.module_code=v_module AND m.event_code=v_event AND m.channel=v_channel AND m.active=true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'blockers',ARRAY['event_template_map_missing'],
      'module_code',v_module,'event_code',v_event,'channel',v_channel,
      'canonical_renderer_version','phase3_v1','is_compatibility_wrapper',true);
  END IF;

  SELECT tv.* INTO v_ver FROM core_template t
    LEFT JOIN core_template_version tv ON tv.id = t.active_version_id
   WHERE t.id = v_map.template_id;

  IF v_ver.id IS NULL THEN
    v_blockers := array_append(v_blockers,'template_version_missing');
  ELSE
    v_render := public.render_comm_hub_template_version(v_ver.id, v_tokens, v_channel, 'PREVIEW_TEST');
    IF jsonb_array_length(v_render->'blockers') > 0 THEN
      SELECT array_agg(x->>'code') INTO v_block_codes FROM jsonb_array_elements(v_render->'blockers') AS x;
      v_blockers := v_blockers || COALESCE(v_block_codes, ARRAY[]::text[]);
    END IF;
    v_unresolved := ARRAY(SELECT jsonb_array_elements_text(v_render->'unresolved_variables'));
  END IF;

  SELECT to_jsonb(rp.*) INTO v_review FROM communication_hub_event_review_policy rp
   WHERE rp.module_code=v_module AND rp.event_code=v_event AND rp.channel=v_channel LIMIT 1;
  BEGIN v_send := public.resolve_comm_hub_send_policy(v_module,v_event,v_channel,'production');
  EXCEPTION WHEN OTHERS THEN v_send := NULL; END;

  IF v_review IS NULL THEN v_blockers := array_append(v_blockers,'review_policy_missing'); END IF;
  IF v_review IS NOT NULL AND (v_review->>'approval_status') NOT IN ('approved_internal','approved_external') THEN
    v_blockers := array_append(v_blockers,'template_not_approved');
  END IF;
  IF COALESCE(array_length(v_unresolved,1),0) > 0 THEN
    v_blockers := array_append(v_blockers,'unresolved_tokens_present');
  END IF;

  RETURN jsonb_build_object(
    'ok', (COALESCE(array_length(v_blockers,1),0)=0),
    'module_code',v_module,'event_code',v_event,'channel',v_channel,
    'template_id',v_map.template_id,'template_version_id',v_ver.id,
    'version_no',v_ver.version_no,'version_status',v_ver.status,
    'from_email',v_map.from_email,'from_display_name',v_map.display_name,
    'reply_to_email',v_map.reply_to_email,'sender_profile_id',v_map.sender_profile_id,
    'sender_enabled',COALESCE(v_map.sender_enabled,false),
    'sender_verified',COALESCE(v_map.domain_verified,false),
    'subject_preview',v_render->>'rendered_subject',
    'html_preview',v_render->>'rendered_body_html',
    'text_preview',v_render->>'rendered_body_text',
    'template_purpose',v_render->>'template_purpose',
    'unresolved_tokens',COALESCE(v_unresolved,ARRAY[]::text[]),
    'missing_tokens',COALESCE(v_unresolved,ARRAY[]::text[]),
    'review_policy',v_review,'send_policy',v_send,
    'warnings',v_warnings,'blockers',v_blockers,
    'generated_at',now(),
    'canonical_renderer_version','phase3_v1',
    'is_compatibility_wrapper',true
  );
END; $$;
COMMENT ON FUNCTION public.render_comm_hub_template_preview(jsonb) IS
'Phase 3 compatibility wrapper. Delegates all rendering to render_comm_hub_template_version.';

COMMENT ON FUNCTION public.render_email_template(uuid, jsonb) IS
'LEGACY_RENDERER_PENDING_MIGRATION. Operates on notification_templates. Do not add new callers.';

CREATE OR REPLACE FUNCTION public.report_comm_hub_status_normalisation()
RETURNS TABLE(scope text, status_value text, occurrence_count bigint)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT 'core_template', status, count(*)::bigint FROM public.core_template GROUP BY status
  UNION ALL
  SELECT 'core_template_version', status, count(*)::bigint FROM public.core_template_version GROUP BY status
  UNION ALL
  SELECT 'communication_hub_event_review_policy', approval_status, count(*)::bigint
    FROM public.communication_hub_event_review_policy GROUP BY approval_status
  ORDER BY 1, 2;
$$;
GRANT EXECUTE ON FUNCTION public.report_comm_hub_status_normalisation() TO authenticated, service_role;
COMMENT ON FUNCTION public.report_comm_hub_status_normalisation() IS
'Phase 3 read-only status inventory.';