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
  v_data             jsonb := COALESCE(payload->'data', '{}'::jsonb);
  v_metadata         jsonb := COALESCE(payload->'metadata', '{}'::jsonb);
  v_context_in       jsonb := COALESCE(payload->'context', '{}'::jsonb);
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
  v_rec_ref_id       uuid;
  v_first_rec_id     uuid;
  v_ch               text;
  v_msg_id           uuid;
  v_msg_ids          uuid[] := ARRAY[]::uuid[];
  v_allowed_ch       text[] := ARRAY['email','sms','push','in_app','letter','print','whatsapp'];
  v_authz            jsonb;
  v_authz_recip      jsonb;
  v_authz_blockers   jsonb;
  v_dedupe_key       text := NULLIF(COALESCE(payload->>'dedupeKey', payload->>'dedupe_key',
                                    v_context_in->>'dedupe_key'), '');
  v_bevent_id        text := NULLIF(COALESCE(payload->>'businessEventId', payload->>'business_event_id',
                                    v_context_in->>'business_event_id',
                                    v_context_in->>'assignment_event_id'), '');
  v_bevent_type      text := NULLIF(COALESCE(payload->>'businessEventType', payload->>'business_event_type',
                                    v_context_in->>'business_event_type',
                                    v_context_in->>'assignment_event_type'), '');
  v_assignee         text := NULLIF(COALESCE(v_context_in->>'assigned_to_user_id',
                                    payload->>'assignedToUserId'), '');
  v_trace_id         uuid := NULLIF(COALESCE(
                                    payload->'trace'->>'trace_id',
                                    payload->>'trace_id',
                                    payload->'context'->'trace'->>'trace_id',
                                    payload->'metadata'->'trace'->>'trace_id'), '')::uuid;
  v_recip_count      int := 0;
  v_first_email      text;
  v_first_domain     text;
  v_masked_email     text;
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

  v_recip_count := jsonb_array_length(v_recipients);
  v_first_email := lower(COALESCE(v_recipients->0->>'email',''));
  IF v_first_email <> '' AND position('@' in v_first_email) > 0 THEN
    v_first_domain := split_part(v_first_email,'@',2);
    v_masked_email := left(v_first_email,1) || '***@' || v_first_domain;
  END IF;

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
      'entity_id',   v_reference->>'entityId',
      'dedupe_key',  v_dedupe_key,
      'business_event_id', v_bevent_id,
      'assigned_to_user_id', v_assignee
    ));

    IF NOT COALESCE((v_authz->>'authorized')::boolean, false) THEN
      v_authz_blockers := COALESCE(v_authz->'blockers', '[]'::jsonb);
      BEGIN
        IF v_trace_id IS NOT NULL THEN
          PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
            'stage_code','DB_POLICY_GUARD_CHECKED','stage_name','DB policy guard',
            'status','blocked',
            'blocker_codes', v_authz_blockers,
            'plain_summary','DB-level send policy guard blocked live send.',
            'payload', jsonb_build_object(
              'module_code', v_module_code, 'event_code', v_event_code,
              'channel', COALESCE(v_channels_text[1],'email'),
              'mode', v_mode, 'test_mode', v_test_mode,
              'recipient_count', v_recip_count,
              'recipient_domain', v_first_domain,
              'required_action', v_authz->>'required_action'
            ),
            'set_status','blocked','set_blocked_stage','DB_POLICY_GUARD_CHECKED'
          ));
          PERFORM public.complete_comm_hub_trace(v_trace_id,'blocked',
            jsonb_build_object('blocked_stage','DB_POLICY_GUARD_CHECKED'));
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      INSERT INTO public.communication_hub_control_audit
        (setting_key, old_value, new_value, reason, changed_by, source)
      VALUES
        ('send_communication_v1.policy_guard.blocked',
         jsonb_build_object(
           'module_code', v_module_code, 'event_code', v_event_code,
           'channel', COALESCE(v_channels_text[1], 'email'),
           'origin', v_origin, 'test_mode', v_test_mode, 'mode', v_mode,
           'entity_id', v_reference->>'entityId',
           'dedupe_key', v_dedupe_key,
           'business_event_id', v_bevent_id,
           'recipient_count', jsonb_array_length(v_authz_recip)
         ),
         v_authz,
         'DB-level send-policy guard blocked unauthorized live send',
         v_requested_by,
         'communication-hub-send-policy-db-guard');
      RAISE EXCEPTION 'send_communication_v1: policy_guard blocked live send for %/% blockers=% required_action=%',
        v_module_code, v_event_code, v_authz_blockers::text,
        COALESCE(v_authz->>'required_action','n/a')
        USING ERRCODE = '42501';
    ELSE
      BEGIN
        IF v_trace_id IS NOT NULL THEN
          PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
            'stage_code','DB_POLICY_GUARD_CHECKED','stage_name','DB policy guard',
            'status','passed',
            'payload', jsonb_build_object(
              'module_code', v_module_code, 'event_code', v_event_code,
              'channel', COALESCE(v_channels_text[1],'email'),
              'mode', v_mode, 'test_mode', v_test_mode,
              'recipient_count', v_recip_count
            ),
            'set_current_stage','DB_POLICY_GUARD_CHECKED'
          ));
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END IF;

  -- EPIC PROD-2C: DB backstop — runtime gate status (live only, additive).
  IF v_is_live THEN
    DECLARE
      v_gate_status   jsonb;
      v_gate_blockers jsonb;
      v_gate_codes    text[];
      v_gate_non_env  boolean;
      v_preview_conf  boolean;
    BEGIN
      v_preview_conf := COALESCE(
        (payload->>'previewConfirmed')::boolean,
        (payload->>'preview_confirmed')::boolean,
        (payload->>'previewShown')::boolean,
        (payload->>'preview_shown')::boolean,
        (v_context_in->>'preview_confirmed')::boolean,
        (v_context_in->>'preview_shown')::boolean,
        (v_context_in->'review_context'->>'preview_confirmed')::boolean,
        (v_context_in->'review_context'->>'preview_shown')::boolean,
        false
      );

      BEGIN
        v_gate_status := public.evaluate_comm_hub_runtime_gate_status(jsonb_build_object(
          'module_code',         v_module_code,
          'event_code',          v_event_code,
          'channel',             COALESCE(v_channels_text[1], 'email'),
          'send_mode',           'live',
          'recipient_email',     COALESCE(v_first_email, ''),
          'recipient_count',     v_recip_count,
          'preview_confirmed',   v_preview_conf,
          'template_version_id', v_template_ver_id,
          'business_event_id',   v_bevent_id,
          'dedupe_key',          v_dedupe_key,
          'entity_id',           v_reference->>'entityId'
        ));
      EXCEPTION WHEN OTHERS THEN
        v_gate_status := NULL;
        BEGIN
          INSERT INTO public.communication_hub_control_audit
            (setting_key, old_value, new_value, reason, changed_by, source)
          VALUES
            ('send_communication_v1.runtime_gate.eval_error',
             jsonb_build_object('module_code',v_module_code,'event_code',v_event_code),
             to_jsonb(SQLERRM),
             'Runtime gate evaluator raised; SQL backstop skipped',
             v_requested_by,
             'communication-hub-send-runtime-gate');
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END;

      IF v_gate_status IS NOT NULL
         AND COALESCE((v_gate_status->>'allowed')::boolean, true) = false THEN
        v_gate_blockers := COALESCE(v_gate_status->'blockers', '[]'::jsonb);
        SELECT COALESCE(array_agg(b->>'code'), ARRAY[]::text[])
          INTO v_gate_codes
          FROM jsonb_array_elements(v_gate_blockers) b;
        v_gate_non_env := EXISTS (
          SELECT 1 FROM unnest(v_gate_codes) c
           WHERE c IS NOT NULL AND c <> 'runtime_env_unknown'
        );

        IF v_gate_non_env THEN
          BEGIN
            IF v_trace_id IS NOT NULL THEN
              PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
                'stage_code','DB_RUNTIME_GATE_CHECKED','stage_name','DB runtime gate status',
                'status','blocked',
                'blocker_codes', v_gate_blockers,
                'plain_summary','DB runtime gate backstop blocked live send.',
                'payload', jsonb_build_object(
                  'source','evaluate_comm_hub_runtime_gate_status',
                  'module_code', v_module_code, 'event_code', v_event_code,
                  'channel', COALESCE(v_channels_text[1],'email'),
                  'blocked_stage', v_gate_status->'trace_context'->>'blocked_stage',
                  'gate_results', v_gate_status->'gate_results',
                  'preview_confirmed', v_preview_conf
                ),
                'set_status','blocked','set_blocked_stage','DB_RUNTIME_GATE_CHECKED'
              ));
              PERFORM public.complete_comm_hub_trace(v_trace_id,'blocked',
                jsonb_build_object('blocked_stage','DB_RUNTIME_GATE_CHECKED'));
            END IF;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          INSERT INTO public.communication_hub_control_audit
            (setting_key, old_value, new_value, reason, changed_by, source)
          VALUES
            ('send_communication_v1.runtime_gate.blocked',
             jsonb_build_object(
               'module_code', v_module_code, 'event_code', v_event_code,
               'channel', COALESCE(v_channels_text[1], 'email'),
               'origin', v_origin, 'mode', v_mode,
               'entity_id', v_reference->>'entityId',
               'dedupe_key', v_dedupe_key,
               'business_event_id', v_bevent_id,
               'recipient_count', v_recip_count,
               'preview_confirmed', v_preview_conf
             ),
             v_gate_status,
             'DB backstop: runtime gate status blocked live send',
             v_requested_by,
             'communication-hub-send-runtime-gate');

          RAISE EXCEPTION 'send_communication_v1: runtime_gate_status blocked live send for %/% blockers=%',
            v_module_code, v_event_code, v_gate_codes::text
            USING ERRCODE = '42501';
        ELSE
          BEGIN
            IF v_trace_id IS NOT NULL THEN
              PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
                'stage_code','DB_RUNTIME_GATE_CHECKED','stage_name','DB runtime gate status',
                'status','passed',
                'plain_summary','Runtime gate returned only runtime_env_unknown; SQL backstop not blocking.',
                'payload', jsonb_build_object(
                  'blocker_codes', to_jsonb(v_gate_codes),
                  'source','evaluate_comm_hub_runtime_gate_status'
                ),
                'set_current_stage','DB_RUNTIME_GATE_CHECKED'
              ));
            END IF;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END IF;
      ELSIF v_gate_status IS NOT NULL THEN
        BEGIN
          IF v_trace_id IS NOT NULL THEN
            PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
              'stage_code','DB_RUNTIME_GATE_CHECKED','stage_name','DB runtime gate status',
              'status','passed',
              'payload', jsonb_build_object(
                'source','evaluate_comm_hub_runtime_gate_status',
                'gate_results', v_gate_status->'gate_results'
              ),
              'set_current_stage','DB_RUNTIME_GATE_CHECKED'
            ));
          END IF;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END IF;
    END;
  END IF;

  BEGIN
    IF v_trace_id IS NOT NULL THEN
      PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
        'stage_code','TEMPLATE_MAPPING_CHECKED','stage_name','Template mapping',
        'status', CASE WHEN v_template_ver_id IS NOT NULL OR v_template_id IS NOT NULL OR v_template_code IS NOT NULL THEN 'passed' ELSE 'skipped' END,
        'payload', jsonb_build_object(
          'template_code', v_template_code,
          'template_id_present', v_template_id IS NOT NULL,
          'template_version_id_present', v_template_ver_id IS NOT NULL
        ),
        'set_current_stage','TEMPLATE_MAPPING_CHECKED'
      ));
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

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

  BEGIN
    IF v_trace_id IS NOT NULL THEN
      PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
        'stage_code','TEMPLATE_RESOLVED','stage_name','Template resolved',
        'status', CASE WHEN v_template_ver_id IS NOT NULL THEN 'passed' ELSE 'skipped' END,
        'payload', jsonb_build_object(
          'template_code', v_template_code,
          'template_version_id', v_template_ver_id,
          'version_no', v_template_ver_no
        ),
        'set_current_stage','TEMPLATE_RESOLVED'
      ));
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  IF v_idem_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.communication_request WHERE idempotency_key = v_idem_key LIMIT 1;
    IF FOUND THEN
      v_request_id := v_existing.id;
      v_request_no := v_existing.request_no;
      SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_msg_ids
        FROM public.communication_message WHERE request_id = v_request_id;
      BEGIN
        IF v_trace_id IS NOT NULL THEN
          PERFORM public.link_comm_hub_trace_request(v_trace_id, v_request_id, v_request_no);
          IF array_length(v_msg_ids,1) IS NOT NULL THEN
            PERFORM public.link_comm_hub_trace_message(v_trace_id, v_msg_ids[1]);
          END IF;
          PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
            'stage_code','REQUEST_CREATED','stage_name','Request reused (idempotent)',
            'status','info','request_id', v_request_id,
            'payload', jsonb_build_object('reused', true, 'request_no', v_request_no),
            'set_current_stage','REQUEST_CREATED'
          ));
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      RETURN jsonb_build_object(
        'ok', true,
        'requestId', v_request_id,
        'requestNo', v_request_no,
        'messageIds', to_jsonb(v_msg_ids), 'reused', true,
        'warnings', to_jsonb(ARRAY['reused existing request via idempotency_key'])
      );
    END IF;
  END IF;

  BEGIN
    IF v_trace_id IS NOT NULL THEN
      PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
        'stage_code','REQUEST_CREATE_ATTEMPTED','stage_name','Request create attempted',
        'status','info',
        'payload', jsonb_build_object(
          'module_code', v_module_code, 'event_code', v_event_code,
          'channels', to_jsonb(v_channels_text), 'test_mode', v_test_mode, 'origin', v_origin
        ),
        'set_current_stage','REQUEST_CREATE_ATTEMPTED'
      ));
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  v_request_no := 'CR-' || to_char(now() AT TIME ZONE 'UTC','YYYYMMDDHH24MISS')
                       || '-' || upper(substr(md5(random()::text),1,6));

  INSERT INTO public.communication_request(
    request_no, module_code, department_code, event_code,
    entity_type, entity_id, reference_no,
    country_code, language_code, channels, priority,
    scheduled_at, status, payload, context,
    idempotency_key, requested_by,
    core_template_id,
    dedupe_key, business_event_id, business_event_type
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
      ) ELSE NULL END,
      'workflow', v_context_in,
      'dedupe_key', v_dedupe_key,
      'business_event_id', v_bevent_id,
      'business_event_type', v_bevent_type,
      'assigned_to_user_id', v_assignee,
      'trace_id', v_trace_id
    ),
    v_idem_key, v_requested_by,
    v_template_id,
    v_dedupe_key, v_bevent_id, v_bevent_type
  )
  RETURNING id, request_no INTO v_request_id, v_request_no;

  BEGIN
    IF v_trace_id IS NOT NULL THEN
      PERFORM public.link_comm_hub_trace_request(v_trace_id, v_request_id, v_request_no);
      PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
        'stage_code','REQUEST_CREATED','stage_name','Request created',
        'status','passed','request_id', v_request_id,
        'payload', jsonb_build_object('request_no', v_request_no),
        'set_current_stage','REQUEST_CREATED'
      ));
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  INSERT INTO public.communication_event_log(request_id, event_type, source, actor_user_id, payload)
  VALUES (v_request_id, 'created', 'send_communication_v1', v_requested_by,
          jsonb_build_object('stage','REQUEST_CREATED','correlation_id',v_correlation_id,'origin',v_origin,'test_mode',v_test_mode,
                             'dedupe_key', v_dedupe_key, 'business_event_id', v_bevent_id));
  INSERT INTO public.communication_event_log(request_id, event_type, source, actor_user_id, payload)
  VALUES (v_request_id, 'created', 'send_communication_v1', v_requested_by,
          jsonb_build_object('stage','REQUEST_VALIDATED','channels',to_jsonb(v_channels_text)));

  IF v_is_live THEN
    INSERT INTO public.communication_event_log(request_id, event_type, source, actor_user_id, payload)
    VALUES (v_request_id, 'queued', 'send_communication_v1', v_requested_by,
            jsonb_build_object('stage','POLICY_AUTHORIZED','authz',v_authz));
  END IF;

  IF v_template_ver_id IS NOT NULL THEN
    v_tokens := v_tokens_in;
    v_rendered_subject := v_tpl_subject;
    v_rendered_html := v_tpl_body_html;
    v_rendered_text := v_tpl_body_text;
    IF v_tokens IS NOT NULL AND jsonb_typeof(v_tokens) = 'object' THEN
      FOR v_tok_key, v_tok_val IN
        SELECT k, COALESCE(v::text, '') FROM jsonb_each_text(v_tokens) AS t(k,v)
      LOOP
        v_rendered_subject := replace(COALESCE(v_rendered_subject,''), '{{'||v_tok_key||'}}', v_tok_val);
        v_rendered_html    := replace(COALESCE(v_rendered_html,''),    '{{'||v_tok_key||'}}', v_tok_val);
        v_rendered_text    := replace(COALESCE(v_rendered_text,''),    '{{'||v_tok_key||'}}', v_tok_val);
        v_tokens_rendered := array_append(v_tokens_rendered, v_tok_key);
      END LOOP;
      v_render_did_run := true;
    END IF;
    INSERT INTO public.communication_event_log(request_id, event_type, source, actor_user_id, payload)
    VALUES (v_request_id, 'queued', 'send_communication_v1', v_requested_by,
            jsonb_build_object('stage','TEMPLATE_RENDERED','template_version_id',v_template_ver_id,
                               'version_no',v_template_ver_no,'tokens_applied',to_jsonb(v_tokens_rendered),
                               'did_run',v_render_did_run));
    BEGIN
      IF v_trace_id IS NOT NULL THEN
        PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
          'stage_code','TEMPLATE_RENDERED','stage_name','Template rendered',
          'status','passed','request_id', v_request_id,
          'payload', jsonb_build_object(
            'subject_present', COALESCE(length(v_rendered_subject),0) > 0,
            'body_present', COALESCE(length(v_rendered_html),0) > 0 OR COALESCE(length(v_rendered_text),0) > 0,
            'tokens_applied', to_jsonb(v_tokens_rendered),
            'did_run', v_render_did_run
          ),
          'set_current_stage','TEMPLATE_RENDERED'
        ));
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  BEGIN
    IF v_trace_id IS NOT NULL THEN
      PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
        'stage_code','RECIPIENT_CREATE_ATTEMPTED','stage_name','Recipient create attempted',
        'status','info','request_id', v_request_id,
        'payload', jsonb_build_object('recipient_count', v_recip_count),
        'set_current_stage','RECIPIENT_CREATE_ATTEMPTED'
      ));
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  FOR v_rec IN SELECT * FROM jsonb_array_elements(v_recipients) LOOP
    v_rec_ref_id := NULLIF(COALESCE(v_rec->>'refId', v_rec->>'recipientUserId'), '')::uuid;
    INSERT INTO public.communication_recipient(
      request_id, role, recipient_type, recipient_user_id,
      name, email, phone, postal_address, channel_hint
    ) VALUES (
      v_request_id,
      COALESCE(v_rec->>'role', 'to'),
      COALESCE(v_rec->>'kind', v_rec->>'type', 'unknown'),
      v_rec_ref_id,
      NULLIF(v_rec->>'name',''),
      v_rec->>'email',
      v_rec->>'phone',
      CASE WHEN v_rec ? 'address' THEN v_rec->'address' ELSE NULL END,
      NULLIF(COALESCE(v_rec->>'channelHint', v_rec->>'channel_hint'), '')
    )
    RETURNING id INTO v_rec_id;
    IF v_first_rec_id IS NULL THEN
      v_first_rec_id := v_rec_id;
    END IF;
  END LOOP;

  BEGIN
    IF v_trace_id IS NOT NULL THEN
      PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
        'stage_code','RECIPIENT_CREATED','stage_name','Recipient created',
        'status','passed','request_id', v_request_id,
        'payload', jsonb_build_object(
          'recipient_count', v_recip_count,
          'recipient_masked', v_masked_email,
          'recipient_domain', v_first_domain
        ),
        'set_current_stage','RECIPIENT_CREATED'
      ));
      PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
        'stage_code','MESSAGE_CREATE_ATTEMPTED','stage_name','Message create attempted',
        'status','info','request_id', v_request_id,
        'payload', jsonb_build_object('channels', to_jsonb(v_channels_text)),
        'set_current_stage','MESSAGE_CREATE_ATTEMPTED'
      ));
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  FOREACH v_ch IN ARRAY v_channels_text LOOP
    INSERT INTO public.communication_message(
      request_id, recipient_id, channel, status, subject, body_html, body_text,
      template_version_id, origin, test_mode
    ) VALUES (
      v_request_id, v_first_rec_id, v_ch, 'queued',
      v_rendered_subject, v_rendered_html, v_rendered_text,
      v_template_ver_id, v_origin, v_test_mode
    )
    RETURNING id INTO v_msg_id;
    v_msg_ids := array_append(v_msg_ids, v_msg_id);
  END LOOP;

  BEGIN
    IF v_trace_id IS NOT NULL THEN
      IF array_length(v_msg_ids,1) IS NOT NULL THEN
        PERFORM public.link_comm_hub_trace_message(v_trace_id, v_msg_ids[1]);
      END IF;
      PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
        'stage_code','MESSAGE_CREATED','stage_name','Message created',
        'status','passed','request_id', v_request_id,
        'message_id', CASE WHEN array_length(v_msg_ids,1) IS NOT NULL THEN v_msg_ids[1] ELSE NULL END,
        'payload', jsonb_build_object(
          'message_count', COALESCE(array_length(v_msg_ids,1), 0),
          'channels', to_jsonb(v_channels_text)
        ),
        'set_current_stage','MESSAGE_CREATED'
      ));
      PERFORM public.append_comm_hub_trace_step(v_trace_id, jsonb_build_object(
        'stage_code','MESSAGE_QUEUED','stage_name','Message queued',
        'status','passed','request_id', v_request_id,
        'message_id', CASE WHEN array_length(v_msg_ids,1) IS NOT NULL THEN v_msg_ids[1] ELSE NULL END,
        'payload', jsonb_build_object(
          'channel', COALESCE(v_channels_text[1],'email'),
          'test_mode', v_test_mode,
          'origin', v_origin,
          'recipient_id_present', v_first_rec_id IS NOT NULL,
          'sender_snapshot_present', false
        ),
        'set_current_stage','MESSAGE_QUEUED'
      ));
      PERFORM public.complete_comm_hub_trace(v_trace_id,'queued',
        jsonb_build_object('request_id', v_request_id, 'request_no', v_request_no,
                           'message_count', COALESCE(array_length(v_msg_ids,1), 0)));
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'requestId', v_request_id,
    'requestNo', v_request_no,
    'messageIds', to_jsonb(v_msg_ids),
    'reused', false,
    'is_live', v_is_live
  );
END;
$function$;
