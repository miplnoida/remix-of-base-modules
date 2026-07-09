-- =============================================================================
-- EPIC 1 — Communication Hub baseline reconciliation + safety kernel hardening.
--
-- Purpose:
--  1. Capture the live DB definition of public.send_communication_v1 in the
--     repo so migrations are reproducible (render-after-request_no + token
--     merge + TEMPLATE_RENDERED_AFTER_REQUEST_NO event log).
--  2. Fix an app_role case bug in the previously committed
--     open_comm_hub_live_window / close_comm_hub_live_window RPCs
--     (repo used 'admin'; live enum only has 'Admin').
--  3. Add central live-gate evaluator public.evaluate_comm_hub_live_gate.
--
-- No secrets touched. No table schema changes. All functions are
-- SECURITY DEFINER with pinned search_path.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.send_communication_v1(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_module_code      text := COALESCE(payload->>'moduleCode', payload->>'module_code');
  v_dept_code        text := COALESCE(payload->>'departmentCode', payload->>'department_code');
  v_event_code       text := COALESCE(payload->>'eventCode', payload->>'event_code');
  v_country_code     text := COALESCE(payload->>'countryCode', payload->>'country_code');
  v_language_code    text := COALESCE(payload->>'languageCode', payload->>'language_code');
  v_priority         text := COALESCE(payload->>'priority', 'normal');
  v_idem_key         text := NULLIF(COALESCE(payload->>'idempotencyKey', payload->>'idempotency_key'), '');
  v_correlation_id   text := COALESCE(payload->>'correlationId', gen_random_uuid()::text);
  v_test_mode        boolean := COALESCE((payload->>'testMode')::boolean, false);
  v_origin           text := COALESCE(payload->>'origin', 'comm_hub');
  v_requested_by     uuid := NULLIF(payload->>'requestedBy','')::uuid;
  v_scheduled_at     timestamptz := NULLIF(payload->>'scheduledAt','')::timestamptz;
  v_reference        jsonb := COALESCE(payload->'reference', '{}'::jsonb);
  v_channels         jsonb := COALESCE(payload->'channels', '["email"]'::jsonb);
  v_channels_text    text[];
  v_recipients       jsonb := COALESCE(payload->'recipients', payload->'recipient', '[]'::jsonb);
  v_message_payload  jsonb := COALESCE(payload->'message', '{}'::jsonb);
  v_data             jsonb := COALESCE(payload->'data', '{}'::jsonb);
  v_metadata         jsonb := COALESCE(payload->'metadata', '{}'::jsonb);
  v_tokens_in        jsonb := COALESCE(payload->'tokens', '{}'::jsonb);
  v_tokens           jsonb;
  v_template_code    text := NULLIF(payload->>'templateCode','');
  v_template_id      uuid := NULLIF(payload->>'templateId','')::uuid;
  v_template_ver_id  uuid := NULLIF(payload->>'templateVersionId','')::uuid;
  v_template_ver_no  int;
  v_tpl_subject      text;
  v_tpl_body_html    text;
  v_tpl_body_text    text;
  v_rendered_subject text;
  v_rendered_html    text;
  v_rendered_text    text;
  v_render_did_run   boolean := false;
  v_tok_key          text;
  v_tok_val          text;
  v_tokens_rendered  text[] := ARRAY[]::text[];
  v_request_id       uuid;
  v_request_no       text;
  v_existing         public.communication_request%ROWTYPE;
  v_rec              jsonb;
  v_rec_id           uuid;
  v_ch               text;
  v_msg_id           uuid;
  v_msg_ids          uuid[] := ARRAY[]::uuid[];
  v_allowed_ch       text[] := ARRAY['email','sms','push','in_app','letter','print','whatsapp'];
BEGIN
  IF v_module_code IS NULL OR v_event_code IS NULL THEN
    RAISE EXCEPTION 'send_communication_v1: moduleCode and eventCode are required';
  END IF;
  IF v_recipients IS NULL OR jsonb_typeof(v_recipients) NOT IN ('array','object') THEN
    RAISE EXCEPTION 'send_communication_v1: recipient(s) required';
  END IF;
  IF jsonb_typeof(v_recipients) = 'object' THEN
    v_recipients := jsonb_build_array(v_recipients);
  END IF;
  IF jsonb_array_length(v_recipients) = 0 THEN
    RAISE EXCEPTION 'send_communication_v1: at least one recipient required';
  END IF;

  SELECT ARRAY(SELECT lower(jsonb_array_elements_text(v_channels))) INTO v_channels_text;
  IF array_length(v_channels_text, 1) IS NULL THEN
    v_channels_text := ARRAY['email'];
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_channels_text) c WHERE c <> ALL(v_allowed_ch)) THEN
    RAISE EXCEPTION 'send_communication_v1: unsupported channel in %', v_channels_text;
  END IF;

  IF v_template_ver_id IS NULL AND v_template_id IS NOT NULL THEN
    SELECT active_version_id INTO v_template_ver_id
      FROM public.core_template WHERE id = v_template_id LIMIT 1;
  END IF;
  IF v_template_ver_id IS NULL AND v_template_code IS NOT NULL THEN
    SELECT t.id, t.active_version_id
      INTO v_template_id, v_template_ver_id
      FROM public.core_template t
     WHERE t.code = v_template_code AND t.is_active = true
     ORDER BY (t.country_code = COALESCE(v_country_code,'KN')) DESC,
              (t.scope = 'COUNTRY') DESC
     LIMIT 1;
  END IF;
  IF v_template_ver_id IS NOT NULL AND v_template_id IS NULL THEN
    SELECT template_id INTO v_template_id
      FROM public.core_template_version WHERE id = v_template_ver_id LIMIT 1;
  END IF;
  IF v_template_ver_id IS NOT NULL THEN
    SELECT version_no, subject, body_html, body_text
      INTO v_template_ver_no, v_tpl_subject, v_tpl_body_html, v_tpl_body_text
      FROM public.core_template_version WHERE id = v_template_ver_id LIMIT 1;
  END IF;

  IF v_idem_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.communication_request WHERE idempotency_key = v_idem_key LIMIT 1;
    IF FOUND THEN
      v_request_id := v_existing.id;
      v_request_no := v_existing.request_no;
      SELECT ARRAY(SELECT id FROM public.communication_message WHERE request_id = v_request_id ORDER BY created_at)
        INTO v_msg_ids;
      RETURN jsonb_build_object(
        'ok', true, 'requestId', v_request_id, 'requestNo', v_request_no,
        'messageIds', to_jsonb(v_msg_ids), 'reused', true,
        'warnings', to_jsonb(ARRAY['reused existing request via idempotency_key'])
      );
    END IF;
  END IF;

  v_request_no := 'CR-' || to_char(now() AT TIME ZONE 'UTC','YYYYMMDDHH24MISS')
                       || '-' || upper(substr(md5(random()::text),1,6));

  INSERT INTO public.communication_request(
    request_no, module_code, department_code, event_code,
    entity_type, entity_id, reference_no,
    country_code, language_code, channels, priority,
    scheduled_at, status, payload, context,
    idempotency_key, requested_by,
    core_template_id
  ) VALUES (
    v_request_no, v_module_code, v_dept_code, v_event_code,
    v_reference->>'entityType', v_reference->>'entityId', v_reference->>'referenceNo',
    v_country_code, v_language_code, v_channels_text, v_priority,
    v_scheduled_at, 'pending', v_data,
    jsonb_build_object(
      'correlation_id', v_correlation_id, 'origin', v_origin, 'test_mode', v_test_mode,
      'metadata', v_metadata, 'caller_user_id', payload->>'callerUserId',
      'template', CASE WHEN v_template_id IS NOT NULL THEN jsonb_build_object(
        'template_id', v_template_id, 'template_version_id', v_template_ver_id,
        'version_no', v_template_ver_no, 'code', v_template_code
      ) ELSE NULL END
    ),
    v_idem_key, v_requested_by,
    v_template_id
  )
  RETURNING id, request_no INTO v_request_id, v_request_no;

  INSERT INTO public.communication_event_log(request_id, event_type, source, actor_user_id, payload)
  VALUES (v_request_id, 'created', 'send_communication_v1', v_requested_by,
          jsonb_build_object('stage','REQUEST_CREATED','correlation_id',v_correlation_id,'origin',v_origin,'test_mode',v_test_mode));
  INSERT INTO public.communication_event_log(request_id, event_type, source, actor_user_id, payload)
  VALUES (v_request_id, 'created', 'send_communication_v1', v_requested_by,
          jsonb_build_object('stage','REQUEST_VALIDATED','channels',to_jsonb(v_channels_text)));

  IF v_template_ver_id IS NOT NULL THEN
    INSERT INTO public.communication_event_log(request_id, event_type, source, actor_user_id, payload)
    VALUES (v_request_id, 'queued', 'send_communication_v1', v_requested_by,
            jsonb_build_object('stage','TEMPLATE_RESOLVED',
              'template_id', v_template_id, 'template_version_id', v_template_ver_id,
              'version_no', v_template_ver_no, 'template_code', v_template_code));

    -- Render AFTER request_no is generated so {{request_no}} resolves.
    -- Server-generated tokens override caller-supplied ones with the same key.
    v_tokens := v_tokens_in
              || jsonb_build_object(
                   'request_no', v_request_no,
                   'request_id', v_request_id::text,
                   'module_code', v_module_code,
                   'event_code', v_event_code,
                   'generated_at', to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
                 );

    v_rendered_subject := v_tpl_subject;
    v_rendered_html    := v_tpl_body_html;
    v_rendered_text    := v_tpl_body_text;

    FOR v_tok_key, v_tok_val IN
      SELECT key, COALESCE(value #>> '{}','') FROM jsonb_each(v_tokens)
    LOOP
      v_rendered_subject := regexp_replace(
        COALESCE(v_rendered_subject,''),
        '\{\{\s*' || v_tok_key || '\s*\}\}', v_tok_val, 'g');
      v_rendered_html := regexp_replace(
        COALESCE(v_rendered_html,''),
        '\{\{\s*' || v_tok_key || '\s*\}\}', v_tok_val, 'g');
      v_rendered_text := regexp_replace(
        COALESCE(v_rendered_text,''),
        '\{\{\s*' || v_tok_key || '\s*\}\}', v_tok_val, 'g');
      v_tokens_rendered := v_tokens_rendered || v_tok_key;
    END LOOP;

    v_message_payload := v_message_payload
      || jsonb_build_object(
           'subject',  v_rendered_subject,
           'bodyHtml', v_rendered_html,
           'bodyText', v_rendered_text
         );
    v_render_did_run := true;

    INSERT INTO public.communication_event_log(request_id, event_type, source, actor_user_id, payload)
    VALUES (v_request_id, 'queued', 'send_communication_v1', v_requested_by,
            jsonb_build_object('stage','TEMPLATE_RENDERED_AFTER_REQUEST_NO',
              'template_id', v_template_id,
              'template_version_id', v_template_ver_id,
              'version_no', v_template_ver_no,
              'template_code', v_template_code,
              'tokens_rendered', to_jsonb(v_tokens_rendered),
              'request_no', v_request_no));
  END IF;

  FOR v_rec IN SELECT * FROM jsonb_array_elements(v_recipients) LOOP
    INSERT INTO public.communication_recipient(
      request_id, role, recipient_type,
      recipient_user_id, recipient_person_id, recipient_employer_id,
      name, email, phone, postal_address, channel_hint
    ) VALUES (
      v_request_id,
      COALESCE(v_rec->>'role','to'),
      COALESCE(v_rec->>'recipient_type', v_rec->>'type'),
      NULLIF(v_rec->>'userId','')::uuid, NULLIF(v_rec->>'personId','')::uuid, NULLIF(v_rec->>'employerId','')::uuid,
      v_rec->>'name', v_rec->>'email', v_rec->>'phone',
      CASE WHEN jsonb_typeof(v_rec->'postalAddress')='object' THEN v_rec->'postalAddress' ELSE NULL END,
      lower(NULLIF(v_rec->>'channelHint',''))
    )
    RETURNING id INTO v_rec_id;

    FOREACH v_ch IN ARRAY v_channels_text LOOP
      INSERT INTO public.communication_message(
        request_id, recipient_id, channel,
        subject, body_text, body_html, status,
        test_mode, origin, template_version_id
      ) VALUES (
        v_request_id, v_rec_id, v_ch,
        v_message_payload->>'subject', v_message_payload->>'bodyText', v_message_payload->>'bodyHtml',
        'queued', v_test_mode, v_origin, v_template_ver_id
      )
      RETURNING id INTO v_msg_id;
      v_msg_ids := v_msg_ids || v_msg_id;

      INSERT INTO public.communication_event_log(request_id, message_id, event_type, source, actor_user_id, payload)
      VALUES (v_request_id, v_msg_id, 'created', 'send_communication_v1', v_requested_by,
              jsonb_build_object('stage','MESSAGE_CREATED','channel',v_ch,
                'template_version_id',v_template_ver_id,
                'rendered_after_request_no', v_render_did_run));
      INSERT INTO public.communication_event_log(request_id, message_id, event_type, source, actor_user_id, payload)
      VALUES (v_request_id, v_msg_id, 'queued', 'send_communication_v1', v_requested_by,
              jsonb_build_object('stage','MESSAGE_QUEUED','channel',v_ch));
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true, 'requestId', v_request_id, 'requestNo', v_request_no,
    'messageIds', to_jsonb(v_msg_ids),
    'templateId', v_template_id, 'templateVersionId', v_template_ver_id,
    'templateVersionNo', v_template_ver_no,
    'rendered', v_render_did_run,
    'tokensRendered', to_jsonb(v_tokens_rendered),
    'reused', false
  );
END;
$function$;

-- Fix: open/close live-window RPCs — use canonical 'Admin' enum value.
CREATE OR REPLACE FUNCTION public.open_comm_hub_live_window(
  p_module_code       text,
  p_event_code        text,
  p_duration_minutes  integer,
  p_reason            text,
  p_typed_confirmation text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_event_status text;
  v_queued_live integer;
  v_expected_confirm text;
  v_now timestamptz := now();
  v_new_after timestamptz;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'Admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required' USING ERRCODE = '42501';
  END IF;
  IF p_module_code IS DISTINCT FROM 'COMM_HUB' OR p_event_code IS DISTINCT FROM 'ADMIN_TEST_NOTICE' THEN
    RAISE EXCEPTION 'unsupported event: only COMM_HUB/ADMIN_TEST_NOTICE is permitted in this phase';
  END IF;
  v_expected_confirm := 'OPEN LIVE WINDOW FOR ' || p_module_code || '/' || p_event_code;
  IF p_typed_confirmation IS DISTINCT FROM v_expected_confirm THEN
    RAISE EXCEPTION 'typed confirmation mismatch: expected exact phrase';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason is required';
  END IF;
  IF p_duration_minutes IS NULL OR p_duration_minutes < 1 OR p_duration_minutes > 30 THEN
    RAISE EXCEPTION 'duration must be between 1 and 30 minutes (got %)', p_duration_minutes;
  END IF;
  SELECT * INTO v_settings FROM public.communication_hub_control_settings ORDER BY created_at ASC LIMIT 1;
  IF v_settings.id IS NULL THEN RAISE EXCEPTION 'control settings row missing'; END IF;
  IF NOT (
    coalesce(array_length(v_settings.allowed_email_addresses,1),0) = 1
    AND lower(v_settings.allowed_email_addresses[1]) = 'rohit@mishainfotech.com'
    AND coalesce(array_length(v_settings.allowed_email_domains,1),0) = 0
  ) THEN
    RAISE EXCEPTION 'allowlist must be exactly [rohit@mishainfotech.com] with zero domains';
  END IF;
  SELECT status INTO v_event_status FROM public.communication_hub_event_live_control
    WHERE module_code = p_module_code AND event_code = p_event_code;
  IF v_event_status IS DISTINCT FROM 'live_manual_only' THEN
    RAISE EXCEPTION 'event status must be live_manual_only (got %)', coalesce(v_event_status,'null');
  END IF;
  SELECT count(*) INTO v_queued_live FROM public.communication_message
    WHERE test_mode = false AND status IN ('queued','sending');
  IF v_queued_live > 0 THEN
    RAISE EXCEPTION 'refusing to open: % queued/sending live messages exist', v_queued_live;
  END IF;
  v_new_after := v_now;
  INSERT INTO public.communication_hub_control_audit
    (setting_key, old_value, new_value, reason, changed_by, source)
  VALUES
    ('dry_run_only', to_jsonb(v_settings.dry_run_only), to_jsonb(false),
      'live-window RPC open (' || p_module_code || '/' || p_event_code || ', ' || p_duration_minutes || 'm): ' || p_reason, v_uid, 'open_comm_hub_live_window'),
    ('email_live_enabled', to_jsonb(v_settings.email_live_enabled), to_jsonb(true),
      'live-window RPC open', v_uid, 'open_comm_hub_live_window'),
    ('live_eligible_after', to_jsonb(v_settings.live_eligible_after), to_jsonb(v_new_after),
      'live-window RPC open', v_uid, 'open_comm_hub_live_window'),
    ('live_eligible_max_age_minutes', to_jsonb(v_settings.live_eligible_max_age_minutes), to_jsonb(p_duration_minutes),
      'live-window RPC open', v_uid, 'open_comm_hub_live_window');
  UPDATE public.communication_hub_control_settings
     SET dry_run_only = false, email_live_enabled = true, dispatch_enabled = true,
         live_eligible_after = v_new_after, live_eligible_max_age_minutes = p_duration_minutes, updated_by = v_uid
   WHERE id = v_settings.id;
  RETURN jsonb_build_object('ok', true, 'opened_at', v_new_after,
    'expires_at', v_new_after + make_interval(mins => p_duration_minutes),
    'duration_minutes', p_duration_minutes, 'module_code', p_module_code, 'event_code', p_event_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.close_comm_hub_live_window(
  p_reason text, p_emergency boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_src text;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'Admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN RAISE EXCEPTION 'reason is required'; END IF;
  SELECT * INTO v_settings FROM public.communication_hub_control_settings ORDER BY created_at ASC LIMIT 1;
  IF v_settings.id IS NULL THEN RAISE EXCEPTION 'control settings row missing'; END IF;
  v_src := CASE WHEN p_emergency THEN 'close_comm_hub_live_window:emergency' ELSE 'close_comm_hub_live_window' END;
  INSERT INTO public.communication_hub_control_audit
    (setting_key, old_value, new_value, reason, changed_by, source)
  VALUES
    ('dry_run_only', to_jsonb(v_settings.dry_run_only), to_jsonb(true),
      CASE WHEN p_emergency THEN 'EMERGENCY close: ' ELSE 'live-window RPC close: ' END || p_reason, v_uid, v_src),
    ('email_live_enabled', to_jsonb(v_settings.email_live_enabled), to_jsonb(false),
      CASE WHEN p_emergency THEN 'EMERGENCY close' ELSE 'live-window RPC close' END, v_uid, v_src);
  UPDATE public.communication_hub_control_settings
     SET dry_run_only = true, email_live_enabled = false, dispatch_enabled = true, updated_by = v_uid
   WHERE id = v_settings.id;
  RETURN jsonb_build_object('ok', true, 'closed_at', now(), 'emergency', p_emergency);
END;
$$;

REVOKE ALL ON FUNCTION public.open_comm_hub_live_window(text,text,integer,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_comm_hub_live_window(text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_comm_hub_live_window(text,text,integer,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_comm_hub_live_window(text,boolean) TO authenticated;

-- Central live-gate evaluator (DB-side gates only; env stays in edge).
CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_live_gate(
  p_module_code text, p_event_code text, p_recipient_email text, p_mode text DEFAULT 'manual'
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_reasons text[] := ARRAY[]::text[];
  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_event_status text;
  v_tpl_active boolean := false;
  v_tpl_ver uuid;
  v_queued_live integer;
  v_expires_at timestamptz;
  v_window_expired boolean := false;
  v_recipient text := lower(coalesce(p_recipient_email,''));
  v_mode text := lower(coalesce(p_mode,'manual'));
BEGIN
  SELECT * INTO v_settings FROM public.communication_hub_control_settings ORDER BY created_at ASC LIMIT 1;
  IF v_settings.id IS NULL THEN
    v_reasons := v_reasons || 'control_settings_missing';
  ELSE
    IF v_settings.dispatch_enabled IS DISTINCT FROM true THEN v_reasons := v_reasons || 'db_dispatch_disabled'; END IF;
    IF v_settings.dry_run_only THEN v_reasons := v_reasons || 'db_dry_run_only'; END IF;
    IF v_settings.email_live_enabled IS DISTINCT FROM true THEN v_reasons := v_reasons || 'db_email_live_disabled'; END IF;
    IF v_settings.live_eligible_after IS NULL THEN
      v_reasons := v_reasons || 'live_eligible_after_missing';
    ELSE
      v_expires_at := v_settings.live_eligible_after
        + make_interval(mins => greatest(1, least(1440, coalesce(v_settings.live_eligible_max_age_minutes,30))));
      IF now() > v_expires_at THEN
        v_window_expired := true;
        v_reasons := v_reasons || 'live_window_expired';
      END IF;
    END IF;
    IF NOT (coalesce(array_length(v_settings.allowed_email_addresses,1),0) = 1
       AND lower(v_settings.allowed_email_addresses[1]) = 'rohit@mishainfotech.com') THEN
      v_reasons := v_reasons || 'db_allowlist_not_pilot_only';
    END IF;
    IF coalesce(array_length(v_settings.allowed_email_domains,1),0) <> 0 THEN
      v_reasons := v_reasons || 'db_allowed_domains_not_empty';
    END IF;
  END IF;

  SELECT status INTO v_event_status FROM public.communication_hub_event_live_control
    WHERE module_code = p_module_code AND event_code = p_event_code;
  IF v_event_status IS NULL THEN
    v_reasons := v_reasons || 'event_live_control_missing';
  ELSIF v_mode IN ('cron','batch') THEN
    IF v_event_status <> 'live_cron_allowed' THEN v_reasons := v_reasons || 'event_not_live_cron_allowed'; END IF;
  ELSE
    IF v_event_status NOT IN ('live_manual_only','live_cron_allowed') THEN v_reasons := v_reasons || 'event_not_live'; END IF;
  END IF;

  SELECT (is_active AND active_version_id IS NOT NULL), active_version_id
    INTO v_tpl_active, v_tpl_ver
    FROM public.core_template
    WHERE code = 'COMM_HUB_' || p_event_code || '_EMAIL'
    LIMIT 1;
  IF v_tpl_active IS NOT TRUE THEN
    v_reasons := v_reasons || 'template_inactive_or_missing_active_version';
  END IF;

  IF v_recipient <> 'rohit@mishainfotech.com' THEN
    v_reasons := v_reasons || 'recipient_not_pilot_allowlist';
  END IF;

  SELECT count(*) INTO v_queued_live FROM public.communication_message
    WHERE test_mode = false AND status IN ('queued','sending');
  IF v_queued_live > 0 THEN
    v_reasons := v_reasons || format('other_live_messages_queued:%s', v_queued_live);
  END IF;

  RETURN jsonb_build_object(
    'ready', array_length(v_reasons,1) IS NULL,
    'reasons', to_jsonb(v_reasons),
    'gates', jsonb_build_object(
      'dispatch_enabled', v_settings.dispatch_enabled,
      'dry_run_only', v_settings.dry_run_only,
      'email_live_enabled', v_settings.email_live_enabled,
      'live_eligible_after', v_settings.live_eligible_after,
      'live_eligible_max_age_minutes', v_settings.live_eligible_max_age_minutes,
      'live_window_expires_at', v_expires_at,
      'live_window_expired', v_window_expired,
      'event_status', v_event_status,
      'template_active', v_tpl_active,
      'template_active_version_id', v_tpl_ver,
      'other_live_queued', v_queued_live,
      'allowlist_addresses', to_jsonb(coalesce(v_settings.allowed_email_addresses, ARRAY[]::text[])),
      'allowlist_domains', to_jsonb(coalesce(v_settings.allowed_email_domains, ARRAY[]::text[])),
      'recipient', v_recipient,
      'mode', v_mode
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_comm_hub_live_gate(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_comm_hub_live_gate(text,text,text,text) TO authenticated, service_role;