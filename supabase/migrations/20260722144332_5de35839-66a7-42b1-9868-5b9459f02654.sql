
-- ============================================================
-- COMMUNICATION HUB — PHASE 2
-- Canonical content renderer, canonical version renderer,
-- compatibility wrappers, dependency certification.
-- Additive only. No table or data changes.
-- ============================================================

-- 1. Flatten nested jsonb into dotted keys
CREATE OR REPLACE FUNCTION public.comm_hub_flatten_tokens(
  p_tokens jsonb,
  p_prefix text DEFAULT ''
) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_out jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_path text;
BEGIN
  IF p_tokens IS NULL OR jsonb_typeof(p_tokens) <> 'object' THEN
    RETURN v_out;
  END IF;
  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_tokens) LOOP
    v_path := CASE WHEN p_prefix = '' THEN v_key ELSE p_prefix || '.' || v_key END;
    IF jsonb_typeof(v_val) = 'object' THEN
      v_out := v_out || public.comm_hub_flatten_tokens(v_val, v_path);
      v_out := v_out || jsonb_build_object(v_path, v_val::text);
    ELSIF jsonb_typeof(v_val) = 'array' THEN
      v_out := v_out || jsonb_build_object(v_path, v_val::text);
    ELSIF jsonb_typeof(v_val) = 'null' THEN
      v_out := v_out || jsonb_build_object(v_path, '');
    ELSE
      v_out := v_out || jsonb_build_object(v_path, trim(both '"' from v_val::text));
    END IF;
  END LOOP;
  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.comm_hub_flatten_tokens(jsonb, text)
  TO authenticated, service_role, anon;

-- 2. HTML escape helper
CREATE OR REPLACE FUNCTION public.comm_hub_html_escape(p_in text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT replace(replace(replace(replace(replace(
    COALESCE(p_in,''),
    '&','&amp;'),
    '<','&lt;'),
    '>','&gt;'),
    '"','&quot;'),
    '''','&#39;');
$$;

GRANT EXECUTE ON FUNCTION public.comm_hub_html_escape(text)
  TO authenticated, service_role, anon;

-- 3. jsonb object-key counter
CREATE OR REPLACE FUNCTION public.jsonb_object_keys_count(p jsonb)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p IS NULL OR jsonb_typeof(p) <> 'object' THEN 0
              ELSE (SELECT count(*)::int FROM jsonb_object_keys(p)) END;
$$;

GRANT EXECUTE ON FUNCTION public.jsonb_object_keys_count(jsonb)
  TO authenticated, service_role, anon;

-- 4. CANONICAL CONTENT RENDERER
CREATE OR REPLACE FUNCTION public.render_comm_hub_content(
  p_content text,
  p_tokens jsonb DEFAULT '{}'::jsonb,
  p_output_context text DEFAULT 'text'
) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_out text := COALESCE(p_content, '');
  v_flat jsonb;
  v_key text;
  v_val text;
  v_ctx text := lower(COALESCE(p_output_context, 'text'));
  v_unresolved text[] := ARRAY[]::text[];
  v_match text;
  v_hash text;
  v_token_count int := 0;
BEGIN
  IF v_ctx NOT IN ('text','plain','html','sms') THEN
    v_ctx := 'text';
  END IF;
  v_flat := public.comm_hub_flatten_tokens(COALESCE(p_tokens, '{}'::jsonb), '');
  v_token_count := public.jsonb_object_keys_count(v_flat);
  IF v_flat IS NOT NULL AND jsonb_typeof(v_flat) = 'object' THEN
    FOR v_key IN SELECT jsonb_object_keys(v_flat) LOOP
      v_val := COALESCE(v_flat->>v_key, '');
      IF v_ctx = 'html' THEN
        v_val := public.comm_hub_html_escape(v_val);
      END IF;
      v_out := regexp_replace(
        v_out,
        '\{\{\s*' ||
          regexp_replace(v_key,'([\.\+\*\?\(\)\[\]\{\}\|\^\$\\])','\\\1','g') ||
        '\s*\}\}',
        v_val,
        'g'
      );
    END LOOP;
  END IF;
  FOR v_match IN
    SELECT (regexp_matches(v_out, '\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}','g'))[1]
  LOOP
    IF NOT (v_match = ANY(v_unresolved)) THEN
      v_unresolved := v_unresolved || v_match;
    END IF;
  END LOOP;
  v_hash := encode(extensions.digest(v_out, 'sha256'), 'hex');
  RETURN jsonb_build_object(
    'rendered',         v_out,
    'unresolved',       to_jsonb(v_unresolved),
    'content_hash',     v_hash,
    'output_context',   v_ctx,
    'token_count',      v_token_count,
    'unresolved_count', COALESCE(array_length(v_unresolved,1),0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.render_comm_hub_content(text, jsonb, text)
  TO authenticated, service_role, anon;

-- 5. COMPATIBILITY WRAPPERS
-- 5a. render_comm_hub_template — the signature prepare_comm_hub_preview
--     was calling; created here to fix the latent "function does not exist".
CREATE OR REPLACE FUNCTION public.render_comm_hub_template(
  p_source text,
  p_context jsonb
) RETURNS jsonb
LANGUAGE sql IMMUTABLE
AS $$
  SELECT public.render_comm_hub_content(p_source, p_context, 'text');
$$;

GRANT EXECUTE ON FUNCTION public.render_comm_hub_template(text, jsonb)
  TO authenticated, service_role, anon;

-- 5b. comm_hub_render_template — pre-existing name, now a wrapper.
CREATE OR REPLACE FUNCTION public.comm_hub_render_template(
  p_source text,
  p_context jsonb
) RETURNS jsonb
LANGUAGE sql IMMUTABLE
AS $$
  SELECT public.render_comm_hub_content(p_source, p_context, 'text');
$$;

GRANT EXECUTE ON FUNCTION public.comm_hub_render_template(text, jsonb)
  TO authenticated, service_role, anon;

-- 6. CANONICAL VERSION RENDERER
CREATE OR REPLACE FUNCTION public.render_comm_hub_template_version(
  p_template_version_id uuid,
  p_tokens jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql STABLE
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_ver RECORD;
  v_tpl RECORD;
  v_subj jsonb; v_html jsonb; v_text jsonb;
  v_unresolved jsonb := '[]'::jsonb;
  v_blockers jsonb := '[]'::jsonb;
  v_norm_status text;
  v_expects_subject boolean := true;
  v_expects_html boolean := true;
  v_expects_text boolean := true;
  v_content_hash text;
BEGIN
  IF p_template_version_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'blockers', jsonb_build_array(jsonb_build_object(
        'code','template_version_missing',
        'message','p_template_version_id is required'))
    );
  END IF;

  SELECT * INTO v_ver FROM public.core_template_version WHERE id = p_template_version_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'blockers', jsonb_build_array(jsonb_build_object(
        'code','template_version_not_found',
        'template_version_id', p_template_version_id,
        'message','core_template_version row not found'))
    );
  END IF;

  SELECT * INTO v_tpl FROM public.core_template WHERE id = v_ver.template_id;

  v_norm_status := lower(COALESCE(v_ver.status,''));
  IF v_norm_status NOT IN ('active','published') THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','template_version_not_active',
      'status', v_ver.status,
      'message','Template version status is not ACTIVE/PUBLISHED');
  END IF;

  IF v_tpl.template_type IN ('SMS','sms') THEN
    v_expects_html := false;
  END IF;
  IF v_tpl.template_type IN ('LETTER','NOTICE','DOCUMENT','CERTIFICATE','FORM','RECEIPT','STATEMENT') THEN
    v_expects_subject := false;
  END IF;

  v_subj := public.render_comm_hub_content(v_ver.subject,  p_tokens, 'text');
  v_html := public.render_comm_hub_content(v_ver.body_html, p_tokens, 'html');
  v_text := public.render_comm_hub_content(v_ver.body_text, p_tokens, 'text');

  IF v_expects_subject AND NULLIF(trim(COALESCE(v_ver.subject,'')),'') IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','subject_empty',
      'message','Template version has no subject');
  END IF;
  IF v_expects_html AND NULLIF(trim(COALESCE(v_ver.body_html,'')),'') IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','body_html_empty',
      'message','Template version has no body_html');
  END IF;
  IF v_expects_text AND NULLIF(trim(COALESCE(v_ver.body_text,'')),'') IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','body_text_empty',
      'message','Template version has no body_text');
  END IF;

  v_unresolved := (v_subj->'unresolved')
               || (v_html->'unresolved')
               || (v_text->'unresolved');

  v_content_hash := encode(extensions.digest(
    COALESCE(v_subj->>'content_hash','') ||
    COALESCE(v_html->>'content_hash','') ||
    COALESCE(v_text->>'content_hash',''), 'sha256'), 'hex');

  RETURN jsonb_build_object(
    'ok',                    (jsonb_array_length(v_blockers) = 0),
    'template_id',           v_tpl.id,
    'template_code',         v_tpl.code,
    'template_type',         v_tpl.template_type,
    'template_version_id',   v_ver.id,
    'template_version_no',   v_ver.version_no,
    'status',                v_ver.status,
    'rendered', jsonb_build_object(
      'subject',   v_subj->>'rendered',
      'body_html', v_html->>'rendered',
      'body_text', v_text->>'rendered'
    ),
    'field_hashes', jsonb_build_object(
      'subject',   v_subj->>'content_hash',
      'body_html', v_html->>'content_hash',
      'body_text', v_text->>'content_hash'
    ),
    'unresolved',            v_unresolved,
    'unresolved_count',      jsonb_array_length(v_unresolved),
    'content_hash',          v_content_hash,
    'blockers',              v_blockers,
    'blocker_count',         jsonb_array_length(v_blockers)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.render_comm_hub_template_version(uuid, jsonb)
  TO authenticated, service_role;

-- 7. DEPENDENCY CERTIFICATION
CREATE OR REPLACE FUNCTION public.certify_comm_hub_template_version(
  p_template_version_id uuid
) RETURNS jsonb
LANGUAGE plpgsql STABLE
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_ver RECORD; v_tpl RECORD; v_map RECORD; v_scenario RECORD;
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_render jsonb;
  v_sender_id uuid;
  v_contract_count int;
  v_schema_count int;
  v_has_map boolean := false;
BEGIN
  IF p_template_version_id IS NULL THEN
    RETURN jsonb_build_object(
      'is_certified', false,
      'blockers', jsonb_build_array(jsonb_build_object(
        'code','template_version_missing',
        'message','p_template_version_id is required'))
    );
  END IF;

  SELECT * INTO v_ver FROM public.core_template_version WHERE id = p_template_version_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_certified', false,
      'blockers', jsonb_build_array(jsonb_build_object(
        'code','template_version_not_found',
        'template_version_id', p_template_version_id))
    );
  END IF;

  SELECT * INTO v_tpl FROM public.core_template WHERE id = v_ver.template_id;

  IF lower(COALESCE(v_ver.status,'')) NOT IN ('active','published') THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','status_not_publishable', 'status', v_ver.status,
      'message','Version status must be ACTIVE or PUBLISHED');
  END IF;

  SELECT * INTO v_map
  FROM public.communication_hub_event_template_map
  WHERE template_id = v_tpl.id
  ORDER BY updated_at DESC NULLS LAST LIMIT 1;
  v_has_map := FOUND;
  IF NOT v_has_map THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','no_event_mapping',
      'template_code', v_tpl.code,
      'message','Template is not bound to any (module,event,channel).');
  END IF;

  IF v_has_map THEN
    v_sender_id := v_map.sender_profile_id;
    IF v_sender_id IS NULL THEN
      SELECT id INTO v_sender_id FROM public.communication_hub_sender_profile
       WHERE is_enabled AND is_default LIMIT 1;
    END IF;
    IF v_sender_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','sender_not_resolvable',
        'message','No sender profile is bound and no default sender exists.');
    END IF;

    SELECT count(*) INTO v_schema_count
    FROM public.communication_hub_event_payload_schema
    WHERE module_code = v_map.module_code
      AND event_code  = v_map.event_code;
    IF v_schema_count = 0 THEN
      v_warnings := v_warnings || jsonb_build_object(
        'code','no_payload_schema',
        'message','Event has no declared payload schema.');
    END IF;
  END IF;

  SELECT count(*) INTO v_contract_count
  FROM public.communication_hub_template_variable_contract
  WHERE template_version_id = v_ver.id
     OR template_id         = v_tpl.id
     OR template_code       = v_tpl.code;
  IF v_contract_count = 0 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'code','no_variable_contract_bound',
      'template_code', v_tpl.code,
      'message','No variable contract rows are bound to this template.');
  END IF;

  v_render := public.render_comm_hub_template_version(v_ver.id, '{}'::jsonb);
  IF jsonb_array_length(v_render->'blockers') > 0 THEN
    v_blockers := v_blockers || (v_render->'blockers');
  END IF;

  IF v_has_map THEN
    SELECT * INTO v_scenario
    FROM public.communication_hub_event_test_scenario
    WHERE module_code = v_map.module_code
      AND event_code  = v_map.event_code
      AND channel     = v_map.channel
      AND is_active   = true
    ORDER BY scenario_key = 'default' DESC, updated_at DESC LIMIT 1;

    IF FOUND THEN
      v_render := public.render_comm_hub_template_version(
        v_ver.id, COALESCE(v_scenario.tokens,'{}'::jsonb));
      IF (v_render->>'unresolved_count')::int > 0 THEN
        v_warnings := v_warnings || jsonb_build_object(
          'code','unresolved_tokens_under_scenario',
          'scenario_key', v_scenario.scenario_key,
          'unresolved', v_render->'unresolved',
          'message','Default scenario does not resolve every token.');
      END IF;
    ELSE
      v_warnings := v_warnings || jsonb_build_object(
        'code','no_test_scenario',
        'message','No active test scenario exists for this event/channel.');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_certified',        (jsonb_array_length(v_blockers) = 0),
    'template_version_id', v_ver.id,
    'template_id',         v_tpl.id,
    'template_code',       v_tpl.code,
    'template_type',       v_tpl.template_type,
    'status',              v_ver.status,
    'blockers',            v_blockers,
    'blocker_count',       jsonb_array_length(v_blockers),
    'warnings',            v_warnings,
    'warning_count',       jsonb_array_length(v_warnings)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.certify_comm_hub_template_version(uuid)
  TO authenticated, service_role;

-- 8. Batch certification
CREATE OR REPLACE FUNCTION public.certify_all_comm_hub_template_versions()
RETURNS TABLE(
  template_version_id uuid,
  template_code text,
  is_certified boolean,
  blocker_count int,
  warning_count int,
  result jsonb
)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT v.id,
         t.code,
         (r->>'is_certified')::boolean,
         (r->>'blocker_count')::int,
         (r->>'warning_count')::int,
         r
  FROM public.core_template_version v
  JOIN public.core_template t ON t.id = v.template_id
  CROSS JOIN LATERAL public.certify_comm_hub_template_version(v.id) AS r
  WHERE lower(COALESCE(v.status,'')) IN ('active','published');
$$;

GRANT EXECUTE ON FUNCTION public.certify_all_comm_hub_template_versions()
  TO authenticated, service_role;
