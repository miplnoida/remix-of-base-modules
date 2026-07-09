
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
  v_template_code    text := NULLIF(payload->>'templateCode','');
  v_template_id      uuid := NULLIF(payload->>'templateId','')::uuid;
  v_template_ver_id  uuid := NULLIF(payload->>'templateVersionId','')::uuid;
  v_template_ver_no  int;
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
    SELECT version_no INTO v_template_ver_no
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
              jsonb_build_object('stage','MESSAGE_CREATED','channel',v_ch,'template_version_id',v_template_ver_id));
      INSERT INTO public.communication_event_log(request_id, message_id, event_type, source, actor_user_id, payload)
      VALUES (v_request_id, v_msg_id, 'queued', 'send_communication_v1', v_requested_by,
              jsonb_build_object('stage','MESSAGE_QUEUED','channel',v_ch));
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true, 'requestId', v_request_id, 'requestNo', v_request_no,
    'messageIds', to_jsonb(v_msg_ids),
    'templateId', v_template_id, 'templateVersionId', v_template_ver_id,
    'templateVersionNo', v_template_ver_no, 'reused', false
  );
END;
$function$;
