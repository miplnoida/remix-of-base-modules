CREATE OR REPLACE FUNCTION public.prepare_comm_hub_preview(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
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
  v_sender      RECORD;
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

  -- Resolve sender profile.
  -- Resolution order: explicit payload -> event/template mapping -> active
  -- default sender profile for this channel. This mirrors what the runtime
  -- resolver does at send time; without this fallback the preview snapshot
  -- would be written with a null sender_profile_id and the Controlled Stub
  -- would then fail at request_creation with
  -- `controlled_live_sender_profile_missing`.
  IF v_sender_id IS NULL THEN
    v_sender_id := NULLIF(v_map.sender_profile_id::text, '')::uuid;
  END IF;

  IF v_sender_id IS NULL THEN
    SELECT id INTO v_sender_id
    FROM public.communication_hub_sender_profile
    WHERE is_enabled = true
      AND is_default = true
      AND (channel IS NULL OR channel = v_channel)
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  IF v_sender_id IS NULL THEN
    SELECT id INTO v_sender_id
    FROM public.communication_hub_sender_profile
    WHERE is_enabled = true
      AND (channel IS NULL OR channel = v_channel)
    ORDER BY is_default DESC NULLS LAST, updated_at DESC
    LIMIT 1;
  END IF;

  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'sender_profile_missing: no active sender profile is configured for channel %', v_channel;
  END IF;

  -- Validate the resolved sender is usable.
  SELECT * INTO v_sender FROM public.communication_hub_sender_profile WHERE id = v_sender_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'sender_profile_missing: resolved sender profile % does not exist', v_sender_id;
  END IF;
  IF COALESCE(v_sender.is_enabled, false) = false THEN
    RAISE EXCEPTION 'sender_profile_disabled: sender profile % is not enabled', v_sender_id;
  END IF;
  IF NULLIF(trim(COALESCE(v_sender.from_email,'')), '') IS NULL THEN
    RAISE EXCEPTION 'sender_profile_invalid: sender profile % has no from_email', v_sender_id;
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

  v_tokens := v_scenario_tokens
           || v_ctx_in
           || v_contract_tokens
           || v_recipient_tokens
           || v_system_tokens
           || v_request_tokens;

  v_render_subject := public.render_comm_hub_template(v_ver.subject_template, v_tokens);
  v_render_html    := public.render_comm_hub_template(v_ver.body_html_template, v_tokens);
  v_render_text    := public.render_comm_hub_template(v_ver.body_text_template, v_tokens);

  v_unresolved := (v_render_subject->'unresolved')
               || (v_render_html->'unresolved')
               || (v_render_text->'unresolved');

  v_subject_hash := encode(digest(COALESCE(v_render_subject->>'rendered',''),'sha256'),'hex');
  v_body_hash    := encode(digest(COALESCE(v_render_html->>'rendered','') || COALESCE(v_render_text->>'rendered',''),'sha256'),'hex');
  v_content_hash := encode(digest(v_subject_hash || v_body_hash,'sha256'),'hex');
  v_recipient_hash := public.comm_hub_normalize_recipient_set(v_to, v_cc, v_bcc);

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