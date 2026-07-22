
-- ============================================================================
-- Phase 4B3 Slice 2 — Canonical variable resolver + Preview integration
-- Additive. Does not alter B1/B2 immutability, freshness, mode transitions,
-- Automated Production STANDBY, Emergency Stop or certification records.
-- ============================================================================

-- 1) Additive resolver-evidence columns on the Preview snapshot (nullable)
ALTER TABLE public.communication_preview_snapshot
  ADD COLUMN IF NOT EXISTS resolver_version text,
  ADD COLUMN IF NOT EXISTS variable_contract_version text,
  ADD COLUMN IF NOT EXISTS resolved_token_bundle jsonb,
  ADD COLUMN IF NOT EXISTS variable_evidence jsonb,
  ADD COLUMN IF NOT EXISTS unresolved_variables_normalised jsonb,
  ADD COLUMN IF NOT EXISTS test_scenario_id uuid,
  ADD COLUMN IF NOT EXISTS test_scenario_hash text,
  ADD COLUMN IF NOT EXISTS recipient_context_ref text,
  ADD COLUMN IF NOT EXISTS request_context_values jsonb;

-- 2) Canonical variable resolver
--    READ-ONLY. Never renders, never creates snapshots, never mutates lifecycle.
CREATE OR REPLACE FUNCTION public.resolve_comm_hub_template_variables(
  p_template_version_id uuid,
  p_module_code text,
  p_event_code text,
  p_channel text DEFAULT 'email',
  p_resolution_mode text DEFAULT 'PREVIEW_TEST',
  p_test_scenario_id uuid DEFAULT NULL,
  p_event_payload jsonb DEFAULT NULL,
  p_recipient_context jsonb DEFAULT NULL,
  p_request_context jsonb DEFAULT NULL,
  p_system_context jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_mode text := COALESCE(p_resolution_mode,'PREVIEW_TEST');
  v_channel text := COALESCE(p_channel,'email');
  v_row RECORD;
  v_scenario RECORD;
  v_event_payload jsonb;
  v_recipient jsonb := COALESCE(p_recipient_context,'{}'::jsonb);
  v_request   jsonb := COALESCE(p_request_context,'{}'::jsonb);
  v_system    jsonb := COALESCE(p_system_context,'{}'::jsonb);
  v_tokens jsonb := '{}'::jsonb;
  v_evidence jsonb := '{}'::jsonb;
  v_unresolved jsonb := '[]'::jsonb;
  v_source jsonb;
  v_val jsonb;
  v_reason text;
  v_contract_count int := 0;
  v_scenario_hash text;
BEGIN
  IF p_module_code IS NULL OR p_event_code IS NULL THEN
    RAISE EXCEPTION 'module_code and event_code are required';
  END IF;

  -- Load test scenario (exact id, or active default) when applicable.
  IF p_test_scenario_id IS NOT NULL THEN
    SELECT * INTO v_scenario FROM public.communication_hub_event_test_scenario
     WHERE id = p_test_scenario_id;
  ELSIF v_mode IN ('PREVIEW_TEST','CERTIFICATION_TEST','DRY_RUN_TEST','CONTROLLED_STUB') THEN
    SELECT * INTO v_scenario FROM public.communication_hub_event_test_scenario
     WHERE module_code=p_module_code AND event_code=p_event_code
       AND channel=v_channel AND is_active=true
     ORDER BY (scenario_key='default') DESC, updated_at DESC LIMIT 1;
  END IF;

  -- Event payload source: production uses caller-provided payload only;
  -- test modes fall back to the active scenario's tokens.
  IF v_mode = 'PRODUCTION_EVENT' THEN
    v_event_payload := COALESCE(p_event_payload,'{}'::jsonb);
  ELSE
    v_event_payload := COALESCE(p_event_payload, v_scenario.tokens, '{}'::jsonb);
  END IF;

  IF v_scenario.tokens IS NOT NULL THEN
    v_scenario_hash := encode(extensions.digest(v_scenario.tokens::text,'sha256'),'hex');
  END IF;

  -- Iterate the variable contract for this exact version, falling back to
  -- the event-level unversioned contract only if no version-bound rows exist.
  FOR v_row IN
    WITH scoped AS (
      SELECT * FROM public.communication_hub_template_variable_contract
       WHERE (p_template_version_id IS NOT NULL AND template_version_id = p_template_version_id)
          OR (module_code=p_module_code AND event_code=p_event_code)
    )
    SELECT DISTINCT ON (variable_name)
           variable_name, source_type, canonical_path, is_required,
           default_value, contract_status, template_version_id
      FROM scoped
     ORDER BY variable_name, (template_version_id IS NOT NULL) DESC, updated_at DESC
  LOOP
    v_contract_count := v_contract_count + 1;
    v_val := NULL;
    v_reason := NULL;

    v_source := CASE lower(COALESCE(v_row.source_type,''))
      WHEN 'event_payload'     THEN v_event_payload
      WHEN 'recipient_context' THEN v_recipient
      WHEN 'request_context'   THEN v_request
      WHEN 'system_context'    THEN v_system
      ELSE NULL
    END;

    IF lower(COALESCE(v_row.source_type,'')) = 'late_bound' AND v_mode <> 'PRODUCTION_EVENT' THEN
      v_reason := 'LATE_BOUND_NOT_AVAILABLE';
    ELSIF v_row.canonical_path IS NULL OR trim(v_row.canonical_path) = '' THEN
      v_reason := 'SOURCE_PATH_MISSING';
    ELSIF v_source IS NULL AND lower(COALESCE(v_row.source_type,'')) NOT IN
          ('template_default','derived','late_bound') THEN
      v_reason := 'SOURCE_NOT_CONFIGURED';
    ELSIF v_source IS NOT NULL THEN
      v_val := v_source #> string_to_array(v_row.canonical_path,'.');
      IF v_val IS NULL OR jsonb_typeof(v_val) = 'null' THEN
        v_reason := 'SOURCE_PATH_MISSING';
        v_val := NULL;
      ELSIF jsonb_typeof(v_val) = 'string' AND trim(both from (v_val #>> '{}')) = '' THEN
        v_reason := 'SOURCE_VALUE_BLANK';
        v_val := NULL;
      END IF;
    END IF;

    -- Declared default only for optional variables.
    IF v_val IS NULL AND v_row.default_value IS NOT NULL AND NOT v_row.is_required THEN
      v_val := to_jsonb(v_row.default_value);
      v_reason := NULL;
    END IF;

    IF v_val IS NOT NULL AND v_reason IS NULL THEN
      -- Materialise under the exact template variable name (alias support).
      v_tokens := v_tokens || jsonb_build_object(v_row.variable_name, v_val);
      v_evidence := v_evidence || jsonb_build_object(
        v_row.variable_name, jsonb_build_object(
          'resolved', true,
          'source_type', v_row.source_type,
          'canonical_path', v_row.canonical_path,
          'is_required', v_row.is_required
        ));
    ELSE
      v_evidence := v_evidence || jsonb_build_object(
        v_row.variable_name, jsonb_build_object(
          'resolved', false,
          'source_type', v_row.source_type,
          'canonical_path', v_row.canonical_path,
          'is_required', v_row.is_required,
          'reason_code', COALESCE(v_reason,'SOURCE_PATH_MISSING')
        ));
      -- Required OR blank-with-value-expected are blockers; optional missing is not.
      IF v_row.is_required THEN
        v_unresolved := v_unresolved || jsonb_build_array(jsonb_build_object(
          'variable', v_row.variable_name,
          'source_type', v_row.source_type,
          'canonical_path', v_row.canonical_path,
          'reason_code', COALESCE(v_reason,'SOURCE_PATH_MISSING'),
          'required', true,
          'occurrence_count', 1,
          'locations', '[]'::jsonb
        ));
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', (jsonb_array_length(v_unresolved) = 0 AND v_contract_count > 0),
    'resolution_mode', v_mode,
    'template_version_id', p_template_version_id,
    'module_code', p_module_code,
    'event_code', p_event_code,
    'channel', v_channel,
    'test_scenario_id', v_scenario.id,
    'test_scenario_key', v_scenario.scenario_key,
    'test_scenario_hash', v_scenario_hash,
    'contract_count', v_contract_count,
    'contract_missing', v_contract_count = 0,
    'tokens', v_tokens,
    'evidence', v_evidence,
    'unresolved_variables', v_unresolved,
    'resolver_version', '4b3.slice2',
    'resolved_at', now()
  );
END; $$;

REVOKE ALL ON FUNCTION public.resolve_comm_hub_template_variables(uuid,text,text,text,text,uuid,jsonb,jsonb,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_comm_hub_template_variables(uuid,text,text,text,text,uuid,jsonb,jsonb,jsonb,jsonb) TO authenticated;

-- 3) Wire prepare_comm_hub_preview to use the canonical resolver.
--    Same signature and outward behaviour. The only change is that v_tokens
--    now comes from the resolver (which materialises aliases) instead of a
--    raw namespace merge. All previous evidence is preserved additively.
CREATE OR REPLACE FUNCTION public.prepare_comm_hub_preview(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public','extensions'
AS $function$
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
  v_tokens jsonb;
  v_system_tokens jsonb; v_request_tokens jsonb; v_recipient_tokens jsonb := '{}'::jsonb;
  v_resolver jsonb;
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

  -- Server-owned contexts.
  v_system_tokens := jsonb_build_object(
    'module_code', v_module_code, 'event_code', v_event_code, 'channel', v_channel,
    'generated_at', to_char(v_generated_at,'YYYY-MM-DD HH24:MI:SS TZ'),
    'current_date', to_char(v_generated_at,'YYYY-MM-DD'),
    'correlation_id', gen_random_uuid()::text);
  v_request_tokens := jsonb_build_object(
    'request_no', v_request_no,
    'request_id', gen_random_uuid()::text,
    'requested_at', to_char(v_generated_at,'YYYY-MM-DD HH24:MI:SS TZ'));
  IF v_recipient_name IS NOT NULL THEN
    v_recipient_tokens := v_recipient_tokens || jsonb_build_object('display_name', v_recipient_name);
  END IF;
  IF v_first_to IS NOT NULL THEN
    v_recipient_tokens := v_recipient_tokens || jsonb_build_object('email', v_first_to);
  END IF;

  SELECT * INTO v_scenario FROM public.communication_hub_event_test_scenario
    WHERE module_code=v_module_code AND event_code=v_event_code
      AND channel=v_channel AND is_active=true
    ORDER BY (scenario_key='default') DESC, updated_at DESC LIMIT 1;

  -- Canonical variable resolution (alias materialisation).
  v_resolver := public.resolve_comm_hub_template_variables(
    v_ver.id, v_module_code, v_event_code, v_channel, 'PREVIEW_TEST',
    v_scenario.id,
    COALESCE(v_scenario.tokens,'{}'::jsonb),
    v_recipient_tokens,
    v_request_tokens,
    v_system_tokens
  );

  -- Token bundle passed to the renderer is the resolver's alias-materialised
  -- map. We additively include server contexts so any nested placeholder like
  -- {{module_code}} that isn't in the contract still resolves.
  v_tokens := (v_resolver->'tokens') || v_ctx_in || v_recipient_tokens || v_system_tokens || v_request_tokens;

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
    unresolved_variables, context_data, status, expires_at, created_at,
    resolver_version, resolved_token_bundle, variable_evidence,
    unresolved_variables_normalised, test_scenario_id, test_scenario_hash,
    request_context_values
  ) VALUES (
    gen_random_uuid(), v_module_code, v_event_code, v_channel, v_send_ctx,
    v_to, v_cc, v_bcc, v_recipient_hash,
    v_tpl.id, v_ver.id, v_sender_id,
    v_render->>'rendered_subject', v_render->>'rendered_body_html', v_render->>'rendered_body_text',
    v_render->>'subject_hash', v_render->>'body_hash', v_render->>'content_hash',
    encode(extensions.digest(v_tokens::text,'sha256'),'hex'),
    -- Prefer resolver's dedup'd unresolved list; fall back to renderer scan.
    COALESCE(v_resolver->'unresolved_variables', v_render->'unresolved_variables'),
    v_tokens || jsonb_build_object(
      'request_no', v_request_no,
      'recipient_name_confirmed', v_recipient_name_confirmed,
      'scenario_id',  COALESCE(v_scenario.id::text, NULL),
      'scenario_key', COALESCE(v_scenario.scenario_key, NULL),
      'template_purpose', v_render->>'template_purpose',
      'canonical_renderer_version', v_render->>'canonical_renderer_version'
    ),
    'PREPARED', now() + interval '24 hours', now(),
    v_resolver->>'resolver_version',
    v_resolver->'tokens',
    v_resolver->'evidence',
    v_resolver->'unresolved_variables',
    (v_resolver->>'test_scenario_id')::uuid,
    v_resolver->>'test_scenario_hash',
    v_request_tokens
  ) RETURNING id INTO v_snapshot_id;

  RETURN (SELECT to_jsonb(s.*) FROM public.communication_preview_snapshot s WHERE s.id = v_snapshot_id);
END; $function$;

NOTIFY pgrst, 'reload schema';
