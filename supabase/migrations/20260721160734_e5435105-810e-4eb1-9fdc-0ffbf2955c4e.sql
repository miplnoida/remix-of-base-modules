
CREATE OR REPLACE FUNCTION public.prepare_comm_hub_preview(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
DECLARE
  v_module_code text := p_payload->>'module_code';
  v_event_code  text := p_payload->>'event_code';
  v_channel     text := COALESCE(p_payload->>'channel','email');
  v_send_ctx    text := COALESCE(p_payload->>'send_context','preview');
  v_to          jsonb := COALESCE(p_payload->'to_recipients','[]'::jsonb);
  v_cc          jsonb := COALESCE(p_payload->'cc_recipients','[]'::jsonb);
  v_bcc         jsonb := COALESCE(p_payload->'bcc_recipients','[]'::jsonb);
  v_sender_id   uuid  := NULLIF(p_payload->>'sender_profile_id','')::uuid;
  v_ctx_in      jsonb := COALESCE(p_payload->'context_data','{}'::jsonb);
  v_map RECORD; v_tpl RECORD; v_ver RECORD; v_policy RECORD; v_scenario RECORD;
  v_recipient_name text;
  v_recipient_name_confirmed boolean := false;
  v_request_no text;
  v_generated_at timestamptz := now();
  v_tokens jsonb;
  v_scenario_tokens jsonb := '{}'::jsonb;
  v_render_subject jsonb; v_render_html jsonb; v_render_text jsonb;
  v_unresolved jsonb := '[]'::jsonb;
  v_snapshot_id uuid;
  v_recipient_hash text; v_content_hash text; v_subject_hash text; v_body_hash text;
  v_first_to text;
  v_system_tokens jsonb; v_request_tokens jsonb; v_recipient_tokens jsonb := '{}'::jsonb;
  v_contract_tokens jsonb := '{}'::jsonb;
  v_contract_bound_vars jsonb := '[]'::jsonb;
  c RECORD; v_val jsonb; v_path_parts text[];
BEGIN
  IF v_module_code IS NULL OR v_event_code IS NULL THEN
    RAISE EXCEPTION 'module_code and event_code are required';
  END IF;

  SELECT * INTO v_map FROM public.communication_hub_event_template_map
    WHERE module_code = v_module_code AND event_code = v_event_code LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no template mapped for %/%', v_module_code, v_event_code;
  END IF;

  SELECT * INTO v_tpl FROM public.core_template WHERE id = v_map.template_id;
  SELECT * INTO v_ver FROM public.core_template_version WHERE id = v_tpl.active_version_id;
  SELECT * INTO v_policy FROM public.communication_hub_recipient_policy LIMIT 1;

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

  SELECT * INTO v_scenario
  FROM public.communication_hub_event_test_scenario
  WHERE module_code = v_module_code AND event_code = v_event_code
    AND channel = v_channel AND is_active = true
  ORDER BY scenario_key = 'default' DESC, updated_at DESC LIMIT 1;

  IF FOUND THEN
    v_scenario_tokens := COALESCE(v_scenario.tokens,'{}'::jsonb);
    v_scenario_tokens := v_scenario_tokens
      - 'module_code' - 'event_code' - 'channel'
      - 'generated_at' - 'current_date'
      - 'recipient_name' - 'recipient_email'
      - 'request_no' - 'preview_reference' - 'correlation_id'
      - 'request_id' - 'requested_at';
  END IF;

  v_tokens := v_ctx_in || v_scenario_tokens || v_system_tokens || v_request_tokens;
  IF v_recipient_name IS NOT NULL THEN
    v_tokens := v_tokens || jsonb_build_object('recipient_name',v_recipient_name);
  END IF;
  IF v_first_to IS NOT NULL THEN
    v_tokens := v_tokens || jsonb_build_object('recipient_email',v_first_to);
  END IF;

  FOR c IN
    SELECT variable_name, source_type, canonical_path
    FROM public.communication_hub_template_variable_contract
    WHERE module_code = v_module_code AND event_code = v_event_code
      AND (template_version_id IS NULL OR template_version_id = v_ver.id)
      AND contract_status <> 'RETIRED'
  LOOP
    IF v_tokens ? c.variable_name THEN CONTINUE; END IF;
    v_val := NULL;
    IF c.source_type = 'system_context' THEN
      v_val := v_system_tokens -> c.canonical_path;
    ELSIF c.source_type = 'request_context' THEN
      v_val := v_request_tokens -> c.canonical_path;
    ELSIF c.source_type = 'recipient_context' THEN
      v_val := v_recipient_tokens -> c.canonical_path;
    ELSIF c.source_type = 'event_payload' THEN
      v_path_parts := string_to_array(c.canonical_path,'.');
      BEGIN v_val := v_scenario_tokens #> v_path_parts;
      EXCEPTION WHEN OTHERS THEN v_val := NULL; END;
      IF v_val IS NULL OR v_val = 'null'::jsonb THEN
        v_val := v_scenario_tokens -> c.variable_name;
      END IF;
    END IF;
    IF v_val IS NOT NULL AND v_val <> 'null'::jsonb THEN
      v_tokens := v_tokens || jsonb_build_object(
        c.variable_name,
        CASE WHEN jsonb_typeof(v_val)='string' THEN v_val #>> '{}' ELSE v_val::text END);
      v_contract_tokens := v_contract_tokens || jsonb_build_object(c.variable_name,v_val);
      v_contract_bound_vars := v_contract_bound_vars || to_jsonb(c.variable_name);
    END IF;
  END LOOP;

  v_render_subject := public.comm_hub_render_template(COALESCE(v_ver.subject,''),   v_tokens);
  v_render_html    := public.comm_hub_render_template(COALESCE(v_ver.body_html,''), v_tokens);
  v_render_text    := public.comm_hub_render_template(COALESCE(v_ver.body_text,''), v_tokens);

  SELECT COALESCE(jsonb_agg(DISTINCT v ORDER BY v),'[]'::jsonb) INTO v_unresolved FROM (
    SELECT jsonb_array_elements_text(v_render_subject->'unresolved') AS v
    UNION SELECT jsonb_array_elements_text(v_render_html->'unresolved')
    UNION SELECT jsonb_array_elements_text(v_render_text->'unresolved')
  ) u;

  v_recipient_hash := encode(digest(coalesce(v_first_to,''),'sha256'),'hex');
  v_subject_hash   := encode(digest(coalesce(v_render_subject->>'rendered',''),'sha256'),'hex');
  v_body_hash      := encode(digest(
                        coalesce(v_render_html->>'rendered','') || '||' ||
                        coalesce(v_render_text->>'rendered',''),'sha256'),'hex');
  v_content_hash   := encode(digest(v_subject_hash || '||' || v_body_hash,'sha256'),'hex');

  UPDATE public.communication_preview_snapshot
     SET status = 'SUPERSEDED'
   WHERE module_code = v_module_code AND event_code = v_event_code
     AND channel = v_channel AND recipient_set_hash = v_recipient_hash
     AND status = 'PREPARED';

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
    v_render_subject->>'rendered', v_render_html->>'rendered', v_render_text->>'rendered',
    v_subject_hash, v_body_hash, v_content_hash,
    encode(digest(v_tokens::text,'sha256'),'hex'),
    v_unresolved,
    v_tokens || jsonb_build_object(
      'request_no', v_request_no,
      'recipient_name_confirmed', v_recipient_name_confirmed,
      'scenario_id', COALESCE(v_scenario.id::text, NULL),
      'scenario_key', COALESCE(v_scenario.scenario_key, NULL),
      'contract_bound_variables', v_contract_bound_vars,
      'contract_tokens', v_contract_tokens
    ),
    'PREPARED', now() + interval '24 hours', now()
  ) RETURNING id INTO v_snapshot_id;

  RETURN (SELECT to_jsonb(s.*) FROM public.communication_preview_snapshot s WHERE s.id = v_snapshot_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.prepare_comm_hub_preview(jsonb) TO PUBLIC;
