-- EPIC CH-P3: DB-level send-policy guard inside send_communication_v1 +
-- approve LEGAL/INTERNAL_CASE_ASSIGNMENT_NOTICE for manual_live internal only.

-- Part F: Approve LEGAL internal case assignment notice policy.
-- Uses sentinel system UUID for approved_by since this is a governance-migration
-- approval; UI approvals continue to record the real admin user.
UPDATE public.communication_hub_event_send_policy
   SET approved_by  = COALESCE(approved_by, '00000000-0000-0000-0000-000000000001'::uuid),
       approved_at  = COALESCE(approved_at, now()),
       approval_notes = 'Approved for internal manual live Legal case assignment notice after L1-L6 validation. (EPIC CH-P3)',
       is_enabled   = true,
       send_policy  = 'manual_live',
       recipient_policy = 'internal_only',
       allow_internal_recipients = true,
       allow_external_recipients = false,
       allowed_internal_domains  = ARRAY['mishainfotech.com'],
       max_recipients_per_send   = 1,
       max_sends_per_entity_per_event = 1,
       duplicate_window_minutes  = 1440,
       requires_sender_verified  = true,
       requires_template_approval = true
 WHERE module_code = 'LEGAL'
   AND event_code  = 'INTERNAL_CASE_ASSIGNMENT_NOTICE'
   AND channel     = 'email'
   AND environment_scope = 'production';

INSERT INTO public.communication_hub_control_audit
  (setting_key, old_value, new_value, reason, changed_by, source)
VALUES
  ('send_policy.LEGAL.INTERNAL_CASE_ASSIGNMENT_NOTICE.email.approved',
   to_jsonb(false), to_jsonb(true),
   'Approved for internal manual live Legal case assignment notice after L1-L6 validation.',
   NULL, 'communication-hub-send-policy-ch-p3');

-- Part D: DB-level policy guard. Patch send_communication_v1 to enforce
-- evaluate_comm_hub_send_authorization for live sends (test_mode = false).
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
  v_mode             text := lower(COALESCE(payload->>'mode',''));
  v_is_live          boolean;
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
  v_authz            jsonb;
  v_authz_recip      jsonb;
  v_authz_blockers   jsonb;
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

  -- ==== CH-P3 DB-level policy guard ==========================================
  -- Any live send (test_mode=false or mode='live') MUST be authorized by
  -- evaluate_comm_hub_send_authorization. Dry-run (test_mode=true) bypasses.
  v_is_live := (v_test_mode = false) OR (v_mode = 'live');
  IF v_is_live THEN
    SELECT COALESCE(jsonb_agg(r->>'email') FILTER (WHERE COALESCE(r->>'email','') <> ''), '[]'::jsonb)
      INTO v_authz_recip
      FROM jsonb_array_elements(v_recipients) r;

    v_authz := public.evaluate_comm_hub_send_authorization(jsonb_build_object(
      'module_code', v_module_code,
      'event_code',  v_event_code,
      'channel',     COALESCE(v_channels_text[1], 'email'),
      'environment_scope', 'production',
      'recipients',  v_authz_recip,
      'entity_id',   v_reference->>'entityId'
    ));

    IF NOT COALESCE((v_authz->>'authorized')::boolean, false) THEN
      v_authz_blockers := COALESCE(v_authz->'blockers', '[]'::jsonb);

      INSERT INTO public.communication_hub_control_audit
        (setting_key, old_value, new_value, reason, changed_by, source)
      VALUES
        ('send_communication_v1.policy_guard.blocked',
         jsonb_build_object(
           'module_code', v_module_code,
           'event_code',  v_event_code,
           'channel',     COALESCE(v_channels_text[1], 'email'),
           'origin',      v_origin,
           'test_mode',   v_test_mode,
           'mode',        v_mode,
           'entity_id',   v_reference->>'entityId',
           'recipient_count', jsonb_array_length(v_authz_recip)
         ),
         v_authz,
         'DB-level send-policy guard blocked unauthorized live send',
         v_requested_by,
         'communication-hub-send-policy-db-guard');

      RAISE EXCEPTION 'send_communication_v1: policy_guard blocked live send for %/% blockers=% required_action=%',
        v_module_code, v_event_code,
        v_authz_blockers::text,
        COALESCE(v_authz->>'required_action','n/a')
        USING ERRCODE = '42501';
    END IF;
  END IF;
  -- ==========================================================================

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
      'policy_guard', CASE WHEN v_is_live THEN v_authz ELSE NULL END,
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

  IF v_is_live THEN
    INSERT INTO public.communication_event_log(request_id, event_type, source, actor_user_id, payload)
    VALUES (v_request_id, 'queued', 'send_communication_v1', v_requested_by,
            jsonb_build_object('stage','POLICY_AUTHORIZED','authz',v_authz));
  END IF;

  IF v_template_ver_id IS NOT NULL THEN
    INSERT INTO public.communication_event_log(request_id, event_type, source, actor_user_id, payload)
    VALUES (v_request_id, 'queued', 'send_communication_v1', v_requested_by,
            jsonb_build_object('stage','TEMPLATE_RESOLVED',
              'template_id', v_template_id, 'template_version_id', v_template_ver_id,
              'version_no', v_template_ver_no, 'template_code', v_template_code));

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
    'policyAuthz', CASE WHEN v_is_live THEN v_authz ELSE NULL END,
    'reused', false
  );
END;
$function$;