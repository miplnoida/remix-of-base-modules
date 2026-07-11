
-- Part B: extend event send policy
ALTER TABLE public.communication_hub_event_send_policy
  ADD COLUMN IF NOT EXISTS duplicate_scope text NOT NULL DEFAULT 'entity',
  ADD COLUMN IF NOT EXISTS duplicate_key_template text NULL,
  ADD COLUMN IF NOT EXISTS allow_new_recipient_within_window boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_new_business_event_within_window boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.communication_hub_event_send_policy
    ADD CONSTRAINT ch_esp_dup_scope_valid
    CHECK (duplicate_scope IN ('none','entity','entity_recipient','entity_assignee','entity_business_event','custom_key'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Part C: extend communication_request
ALTER TABLE public.communication_request
  ADD COLUMN IF NOT EXISTS dedupe_key text NULL,
  ADD COLUMN IF NOT EXISTS business_event_id text NULL,
  ADD COLUMN IF NOT EXISTS business_event_type text NULL;

CREATE INDEX IF NOT EXISTS communication_request_dedupe_key_idx
  ON public.communication_request (module_code, event_code, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS communication_request_business_event_idx
  ON public.communication_request (module_code, event_code, business_event_id)
  WHERE business_event_id IS NOT NULL;

-- Seed: LEGAL INTERNAL_CASE_ASSIGNMENT_NOTICE assignment-aware duplicate rule
UPDATE public.communication_hub_event_send_policy
   SET duplicate_scope = 'entity_business_event',
       duplicate_key_template = 'LEGAL:INTERNAL_CASE_ASSIGNMENT_NOTICE:{entity_id}:{assignment_event_id}',
       allow_new_recipient_within_window = true,
       allow_new_business_event_within_window = true,
       approval_notes = COALESCE(approval_notes,'') || E'\n[CH-D1] duplicate_scope=entity_business_event; allow new officer/new assignment event within window.',
       updated_at = now()
 WHERE module_code = 'LEGAL'
   AND event_code = 'INTERNAL_CASE_ASSIGNMENT_NOTICE'
   AND channel = 'email';

-- Part F: patched send-policy resolver returns new fields
CREATE OR REPLACE FUNCTION public.resolve_comm_hub_send_policy(
  p_module_code text, p_event_code text,
  p_channel text DEFAULT 'email', p_environment_scope text DEFAULT 'production'
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.communication_hub_event_send_policy%ROWTYPE;
BEGIN
  SELECT * INTO v_row
    FROM public.communication_hub_event_send_policy
   WHERE module_code = p_module_code
     AND event_code = p_event_code
     AND channel = p_channel
     AND environment_scope = p_environment_scope
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'send_policy', 'dry_run_only',
      'recipient_policy', 'internal_only',
      'allowed_internal_domains', '[]'::jsonb,
      'allowed_external_domains', '[]'::jsonb,
      'blockers', jsonb_build_array('no_policy_configured'),
      'approved', false,
      'is_enabled', false,
      'duplicate_scope', 'entity',
      'duplicate_key_template', NULL,
      'allow_new_recipient_within_window', false,
      'allow_new_business_event_within_window', false
    );
  END IF;
  RETURN jsonb_build_object(
    'found', true,
    'id', v_row.id,
    'send_policy', v_row.send_policy,
    'recipient_policy', v_row.recipient_policy,
    'allowed_internal_domains', to_jsonb(v_row.allowed_internal_domains),
    'allowed_external_domains', to_jsonb(v_row.allowed_external_domains),
    'allow_internal_recipients', v_row.allow_internal_recipients,
    'allow_external_recipients', v_row.allow_external_recipients,
    'max_recipients_per_send', v_row.max_recipients_per_send,
    'max_sends_per_entity_per_event', v_row.max_sends_per_entity_per_event,
    'duplicate_window_minutes', v_row.duplicate_window_minutes,
    'duplicate_scope', v_row.duplicate_scope,
    'duplicate_key_template', v_row.duplicate_key_template,
    'allow_new_recipient_within_window', v_row.allow_new_recipient_within_window,
    'allow_new_business_event_within_window', v_row.allow_new_business_event_within_window,
    'requires_template_approval', v_row.requires_template_approval,
    'requires_sender_verified', v_row.requires_sender_verified,
    'require_typed_confirmation_for_send', v_row.require_typed_confirmation_for_send,
    'require_typed_confirmation_for_policy_change', v_row.require_typed_confirmation_for_policy_change,
    'is_enabled', v_row.is_enabled,
    'approved', v_row.approved_by IS NOT NULL,
    'approved_by', v_row.approved_by,
    'approved_at', v_row.approved_at
  );
END;
$function$;

-- Part F: patched authorization evaluator with scope-aware duplicate logic
CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_send_authorization(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_module      text := p_payload->>'module_code';
  v_event       text := p_payload->>'event_code';
  v_channel     text := COALESCE(p_payload->>'channel', 'email');
  v_env         text := COALESCE(p_payload->>'environment_scope', 'production');
  v_recipients  jsonb := COALESCE(p_payload->'recipients', '[]'::jsonb);
  v_entity_id   text  := p_payload->>'entity_id';
  v_dedupe_key  text  := NULLIF(p_payload->>'dedupe_key','');
  v_assignee    text  := NULLIF(p_payload->>'assigned_to_user_id','');
  v_bevent_id   text  := NULLIF(p_payload->>'business_event_id','');
  v_policy jsonb;
  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_sender_ok boolean := false;
  v_template_ok boolean := false;
  v_blockers jsonb := '[]'::jsonb;
  v_required_action text := NULL;
  v_mode text;
  v_authorized boolean := false;
  v_recipient text;
  v_domain text;
  v_allowed_int text[];
  v_allowed_ext text[];
  v_allow_int boolean;
  v_allow_ext boolean;
  v_max_recip int;
  v_dup_window int;
  v_dup_scope  text;
  v_send_policy text;
  v_is_enabled boolean;
  v_approved boolean;
  v_req_sender_verified boolean;
  v_recipient_count int := 0;
  v_dup_count int := 0;
  v_max_per int;
  v_first_recipient text := NULL;
  v_matched jsonb := NULL;
BEGIN
  v_policy := public.resolve_comm_hub_send_policy(v_module, v_event, v_channel, v_env);
  v_send_policy := v_policy->>'send_policy';
  v_is_enabled := COALESCE((v_policy->>'is_enabled')::boolean, false);
  v_approved := COALESCE((v_policy->>'approved')::boolean, false);
  v_allow_int := COALESCE((v_policy->>'allow_internal_recipients')::boolean, false);
  v_allow_ext := COALESCE((v_policy->>'allow_external_recipients')::boolean, false);
  v_max_recip := COALESCE((v_policy->>'max_recipients_per_send')::int, 1);
  v_dup_window := COALESCE((v_policy->>'duplicate_window_minutes')::int, 1440);
  v_dup_scope := COALESCE(v_policy->>'duplicate_scope', 'entity');
  v_max_per   := COALESCE((v_policy->>'max_sends_per_entity_per_event')::int, 1);
  v_req_sender_verified := COALESCE((v_policy->>'requires_sender_verified')::boolean, true);
  SELECT COALESCE(array_agg(x), ARRAY[]::text[]) INTO v_allowed_int
    FROM jsonb_array_elements_text(COALESCE(v_policy->'allowed_internal_domains','[]'::jsonb)) AS x;
  SELECT COALESCE(array_agg(x), ARRAY[]::text[]) INTO v_allowed_ext
    FROM jsonb_array_elements_text(COALESCE(v_policy->'allowed_external_domains','[]'::jsonb)) AS x;

  SELECT * INTO v_settings FROM public.communication_hub_control_settings
    ORDER BY created_at ASC LIMIT 1;
  IF NOT FOUND OR v_settings.dispatch_enabled = false THEN
    v_blockers := v_blockers || to_jsonb('dispatch_disabled'::text);
  END IF;
  IF FOUND AND v_settings.dry_run_only = true
     AND v_send_policy IN ('manual_live','auto_live_internal','auto_live_external') THEN
    v_blockers := v_blockers || to_jsonb('global_dry_run_only'::text);
  END IF;
  IF NOT COALESCE((v_policy->>'found')::boolean, false) THEN
    v_blockers := v_blockers || to_jsonb('no_policy_configured'::text);
  END IF;
  IF NOT v_is_enabled THEN
    v_blockers := v_blockers || to_jsonb('policy_disabled'::text);
  END IF;
  IF v_send_policy IN ('disabled','dry_run_only','prepare_only') THEN
    v_blockers := v_blockers || to_jsonb('policy_forbids_live_send'::text);
  END IF;
  IF v_send_policy IN ('manual_live','auto_live_internal','auto_live_external') AND NOT v_approved THEN
    v_blockers := v_blockers || to_jsonb('policy_not_approved'::text);
    v_required_action := COALESCE(v_required_action, 'policy_approval_required');
  END IF;

  IF v_req_sender_verified THEN
    SELECT EXISTS(
      SELECT 1 FROM public.communication_hub_sender_profile
       WHERE is_enabled = true AND provider_identity_status = 'verified' AND domain_verified = true
    ) INTO v_sender_ok;
    IF NOT v_sender_ok THEN
      v_blockers := v_blockers || to_jsonb('sender_not_verified'::text);
      v_required_action := COALESCE(v_required_action, 'sender_verification_required');
    END IF;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.communication_hub_event_template_map
     WHERE module_code = v_module AND event_code = v_event AND channel = v_channel AND active = true
  ) INTO v_template_ok;
  IF NOT v_template_ok THEN
    v_blockers := v_blockers || to_jsonb('template_not_mapped'::text);
    v_required_action := COALESCE(v_required_action, 'template_approval_required');
  END IF;

  v_recipient_count := jsonb_array_length(v_recipients);
  IF v_recipient_count = 0 THEN
    v_blockers := v_blockers || to_jsonb('no_recipients'::text);
  END IF;
  IF v_recipient_count > v_max_recip THEN
    v_blockers := v_blockers || to_jsonb('too_many_recipients'::text);
  END IF;

  FOR v_recipient IN SELECT jsonb_array_elements_text(v_recipients) LOOP
    IF v_first_recipient IS NULL THEN v_first_recipient := lower(v_recipient); END IF;
    v_domain := lower(split_part(v_recipient, '@', 2));
    IF v_domain = '' THEN
      v_blockers := v_blockers || to_jsonb('invalid_recipient'::text);
      CONTINUE;
    END IF;
    IF v_domain = ANY(v_allowed_int) THEN
      IF NOT v_allow_int THEN
        v_blockers := v_blockers || to_jsonb('internal_not_allowed'::text);
        v_required_action := COALESCE(v_required_action, 'recipient_not_allowed');
      END IF;
    ELSIF v_domain = ANY(v_allowed_ext) THEN
      IF NOT v_allow_ext THEN
        v_blockers := v_blockers || to_jsonb('external_not_allowed'::text);
        v_required_action := COALESCE(v_required_action, 'recipient_not_allowed');
      END IF;
    ELSE
      v_blockers := v_blockers || to_jsonb('recipient_domain_not_allowlisted'::text);
      v_required_action := COALESCE(v_required_action, 'recipient_not_allowed');
    END IF;
  END LOOP;

  -- Scope-aware duplicate detection
  IF v_dup_scope <> 'none' AND v_dup_window > 0 THEN
    IF v_dup_scope = 'custom_key' AND v_dedupe_key IS NOT NULL THEN
      SELECT jsonb_build_object('request_no', request_no, 'id', id, 'dedupe_key', dedupe_key)
        INTO v_matched
        FROM public.communication_request
       WHERE module_code = v_module AND event_code = v_event
         AND dedupe_key = v_dedupe_key
         AND created_at > (now() - make_interval(mins => v_dup_window))
       ORDER BY created_at DESC LIMIT 1;
      v_dup_count := CASE WHEN v_matched IS NULL THEN 0 ELSE 1 END;

    ELSIF v_dup_scope = 'entity_business_event' AND v_entity_id IS NOT NULL THEN
      SELECT jsonb_build_object('request_no', request_no, 'id', id,
             'dedupe_key', dedupe_key, 'business_event_id', business_event_id)
        INTO v_matched
        FROM public.communication_request
       WHERE module_code = v_module AND event_code = v_event
         AND entity_id::text = v_entity_id
         AND created_at > (now() - make_interval(mins => v_dup_window))
         AND (
              (v_dedupe_key IS NOT NULL AND dedupe_key = v_dedupe_key)
           OR (v_bevent_id  IS NOT NULL AND business_event_id = v_bevent_id)
         )
       ORDER BY created_at DESC LIMIT 1;
      v_dup_count := CASE WHEN v_matched IS NULL THEN 0 ELSE 1 END;

    ELSIF v_dup_scope = 'entity_assignee' AND v_entity_id IS NOT NULL AND v_assignee IS NOT NULL THEN
      SELECT jsonb_build_object('request_no', request_no, 'id', id)
        INTO v_matched
        FROM public.communication_request
       WHERE module_code = v_module AND event_code = v_event
         AND entity_id::text = v_entity_id
         AND (context->>'assigned_to_user_id') = v_assignee
         AND created_at > (now() - make_interval(mins => v_dup_window))
       ORDER BY created_at DESC LIMIT 1;
      v_dup_count := CASE WHEN v_matched IS NULL THEN 0 ELSE 1 END;

    ELSIF v_dup_scope = 'entity_recipient' AND v_entity_id IS NOT NULL AND v_first_recipient IS NOT NULL THEN
      SELECT jsonb_build_object('request_no', cr.request_no, 'id', cr.id)
        INTO v_matched
        FROM public.communication_request cr
        JOIN public.communication_recipient rcp ON rcp.request_id = cr.id
       WHERE cr.module_code = v_module AND cr.event_code = v_event
         AND cr.entity_id::text = v_entity_id
         AND lower(COALESCE(rcp.email,'')) = v_first_recipient
         AND cr.created_at > (now() - make_interval(mins => v_dup_window))
       ORDER BY cr.created_at DESC LIMIT 1;
      v_dup_count := CASE WHEN v_matched IS NULL THEN 0 ELSE 1 END;

    ELSIF v_dup_scope = 'entity' AND v_entity_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_dup_count
        FROM public.communication_request
       WHERE module_code = v_module AND event_code = v_event
         AND entity_id::text = v_entity_id
         AND created_at > (now() - make_interval(mins => v_dup_window));
      IF v_dup_count > 0 THEN
        SELECT jsonb_build_object('request_no', request_no, 'id', id)
          INTO v_matched
          FROM public.communication_request
         WHERE module_code = v_module AND event_code = v_event
           AND entity_id::text = v_entity_id
           AND created_at > (now() - make_interval(mins => v_dup_window))
         ORDER BY created_at DESC LIMIT 1;
      END IF;
    END IF;

    IF v_dup_count >= v_max_per THEN
      v_blockers := v_blockers || to_jsonb('duplicate_send_blocked'::text);
      v_required_action := COALESCE(v_required_action, 'duplicate_blocked');
    END IF;
  END IF;

  v_mode := v_send_policy;
  v_authorized := (jsonb_array_length(v_blockers) = 0)
                  AND v_send_policy IN ('manual_live','auto_live_internal','auto_live_external');

  RETURN jsonb_build_object(
    'authorized', v_authorized,
    'mode', v_mode,
    'blockers', v_blockers,
    'required_action', v_required_action,
    'policy', v_policy,
    'sender_verified', v_sender_ok,
    'template_mapped', v_template_ok,
    'recipient_count', v_recipient_count,
    'duplicate_count', v_dup_count,
    'duplicate_scope', v_dup_scope,
    'duplicate_match', v_matched
  );
END;
$function$;

-- Part E: extend send_communication_v1 to persist dedupe fields and forward to evaluator
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
    END IF;
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
      SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_msg_ids
        FROM public.communication_message WHERE request_id = v_request_id;
      RETURN jsonb_build_object(
        'ok', true,
        'requestId', v_request_id,
        'requestNo', v_request_no,
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
      'assigned_to_user_id', v_assignee
    ),
    v_idem_key, v_requested_by,
    v_template_id,
    v_dedupe_key, v_bevent_id, v_bevent_type
  )
  RETURNING id, request_no INTO v_request_id, v_request_no;

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
  END IF;

  FOR v_rec IN SELECT * FROM jsonb_array_elements(v_recipients) LOOP
    INSERT INTO public.communication_recipient(request_id, kind, role, ref_type, ref_id, email, phone, address_json)
    VALUES (
      v_request_id,
      COALESCE(v_rec->>'kind', v_rec->>'type', 'unknown'),
      COALESCE(v_rec->>'role', 'to'),
      v_rec->>'refType', v_rec->>'refId',
      v_rec->>'email', v_rec->>'phone',
      CASE WHEN v_rec ? 'address' THEN v_rec->'address' ELSE NULL END
    )
    RETURNING id INTO v_rec_id;
  END LOOP;

  FOREACH v_ch IN ARRAY v_channels_text LOOP
    INSERT INTO public.communication_message(
      request_id, channel, status, subject, body_html, body_text,
      template_id, core_template_id, template_version_id
    ) VALUES (
      v_request_id, v_ch, 'queued',
      v_rendered_subject, v_rendered_html, v_rendered_text,
      v_template_id, v_template_id, v_template_ver_id
    )
    RETURNING id INTO v_msg_id;
    v_msg_ids := array_append(v_msg_ids, v_msg_id);
  END LOOP;

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
