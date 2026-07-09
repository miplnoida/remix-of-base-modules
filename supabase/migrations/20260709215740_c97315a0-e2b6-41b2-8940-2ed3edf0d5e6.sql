
-- EPIC 2D — Event Template Mapping table + RPCs + Evaluator update + Synthetic failed helper
-- + Third business event (COMPLIANCE / INTERNAL_CASE_STATUS_NOTICE) seed.
-- Read-only where possible. No cron, no live email. All admin-guarded.

-- =========================================================================
-- PART A — Mapping table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.communication_hub_event_template_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL,
  event_code text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  template_code text NOT NULL,
  template_id uuid NULL,
  active boolean NOT NULL DEFAULT true,
  risk_level text NOT NULL DEFAULT 'low',
  mapping_source text NOT NULL DEFAULT 'admin',
  reason text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_hub_event_template_map_unique UNIQUE (module_code, event_code, channel),
  CONSTRAINT communication_hub_event_template_map_channel_chk CHECK (channel IN ('email','sms','whatsapp','push','in_app','print','letter')),
  CONSTRAINT communication_hub_event_template_map_risk_chk CHECK (risk_level IN ('low','medium','high','sensitive'))
);

GRANT SELECT ON public.communication_hub_event_template_map TO authenticated;
GRANT ALL ON public.communication_hub_event_template_map TO service_role;

ALTER TABLE public.communication_hub_event_template_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_template_map_read_admin" ON public.communication_hub_event_template_map;
CREATE POLICY "event_template_map_read_admin"
  ON public.communication_hub_event_template_map FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

-- Reuse existing updated_at trigger fn if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname='tg_update_updated_at') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_ceh_event_tpl_map_updated_at ON public.communication_hub_event_template_map';
    EXECUTE 'CREATE TRIGGER trg_ceh_event_tpl_map_updated_at BEFORE UPDATE ON public.communication_hub_event_template_map FOR EACH ROW EXECUTE FUNCTION tg_update_updated_at()';
  END IF;
END $$;

-- =========================================================================
-- PART B — RPCs to upsert / disable mappings (admin-only, audited)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.upsert_comm_hub_event_template_mapping(
  p_module_code text,
  p_event_code text,
  p_channel text,
  p_template_code text,
  p_reason text,
  p_actor_user_id uuid,
  p_risk_level text DEFAULT 'low'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tpl_id uuid;
  v_tpl_active boolean;
  v_tpl_active_ver uuid;
  v_row public.communication_hub_event_template_map%ROWTYPE;
  v_old jsonb;
BEGIN
  IF NOT has_role(p_actor_user_id, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden_admin_only';
  END IF;
  IF coalesce(trim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;
  IF coalesce(trim(p_module_code), '')='' OR coalesce(trim(p_event_code),'')='' OR coalesce(trim(p_channel),'')='' OR coalesce(trim(p_template_code),'')='' THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  SELECT id, is_active, active_version_id INTO v_tpl_id, v_tpl_active, v_tpl_active_ver
    FROM public.core_template WHERE code = p_template_code LIMIT 1;
  IF v_tpl_id IS NULL THEN RAISE EXCEPTION 'template_not_found:%', p_template_code; END IF;
  IF v_tpl_active IS NOT TRUE OR v_tpl_active_ver IS NULL THEN
    RAISE EXCEPTION 'template_inactive_or_no_active_version:%', p_template_code;
  END IF;

  SELECT * INTO v_row FROM public.communication_hub_event_template_map
    WHERE module_code=p_module_code AND event_code=p_event_code AND channel=lower(p_channel);
  v_old := CASE WHEN v_row.id IS NULL THEN NULL ELSE to_jsonb(v_row) END;

  INSERT INTO public.communication_hub_event_template_map
    (module_code, event_code, channel, template_code, template_id, active, risk_level, mapping_source, reason, created_by, updated_by)
  VALUES
    (p_module_code, p_event_code, lower(p_channel), p_template_code, v_tpl_id, true, coalesce(p_risk_level,'low'), 'admin', p_reason, p_actor_user_id, p_actor_user_id)
  ON CONFLICT (module_code, event_code, channel) DO UPDATE
    SET template_code=EXCLUDED.template_code,
        template_id=EXCLUDED.template_id,
        active=true,
        risk_level=EXCLUDED.risk_level,
        mapping_source=EXCLUDED.mapping_source,
        reason=EXCLUDED.reason,
        updated_by=EXCLUDED.updated_by,
        updated_at=now()
  RETURNING * INTO v_row;

  INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
  VALUES ('event_template_mapping_upsert:'||p_module_code||'/'||p_event_code||'/'||lower(p_channel), v_old, to_jsonb(v_row), p_reason, p_actor_user_id, 'upsert_comm_hub_event_template_mapping');

  RETURN jsonb_build_object('ok', true, 'mapping', to_jsonb(v_row));
END;
$function$;

REVOKE ALL ON FUNCTION public.upsert_comm_hub_event_template_mapping(text,text,text,text,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_comm_hub_event_template_mapping(text,text,text,text,text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.disable_comm_hub_event_template_mapping(
  p_module_code text,
  p_event_code text,
  p_channel text,
  p_reason text,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_row public.communication_hub_event_template_map%ROWTYPE;
  v_old jsonb;
BEGIN
  IF NOT has_role(p_actor_user_id, 'Admin'::app_role) THEN RAISE EXCEPTION 'forbidden_admin_only'; END IF;
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'reason_required'; END IF;

  SELECT * INTO v_row FROM public.communication_hub_event_template_map
    WHERE module_code=p_module_code AND event_code=p_event_code AND channel=lower(p_channel);
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'mapping_not_found'; END IF;
  v_old := to_jsonb(v_row);

  UPDATE public.communication_hub_event_template_map
    SET active=false, reason=p_reason, updated_by=p_actor_user_id, updated_at=now()
    WHERE id=v_row.id RETURNING * INTO v_row;

  INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
  VALUES ('event_template_mapping_disable:'||p_module_code||'/'||p_event_code||'/'||lower(p_channel), v_old, to_jsonb(v_row), p_reason, p_actor_user_id, 'disable_comm_hub_event_template_mapping');

  RETURN jsonb_build_object('ok', true, 'mapping', to_jsonb(v_row));
END;
$function$;

REVOKE ALL ON FUNCTION public.disable_comm_hub_event_template_mapping(text,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.disable_comm_hub_event_template_mapping(text,text,text,text,uuid) TO authenticated;

-- =========================================================================
-- PART C — Update evaluator to use mapping table (fallback to legacy code guess)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_live_gate(
  p_module_code text,
  p_event_code text,
  p_recipient_email text,
  p_mode text DEFAULT 'manual',
  p_template_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_reasons text[] := ARRAY[]::text[];
  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_event_status text;
  v_tpl_id uuid;
  v_tpl_code text;
  v_tpl_active_flag boolean := false;
  v_tpl_active boolean := false;
  v_tpl_ver uuid;
  v_tpl_source text := 'missing';
  v_map_row public.communication_hub_event_template_map%ROWTYPE;
  v_queued_live integer;
  v_expires_at timestamptz;
  v_window_expired boolean := false;
  v_recipient text := lower(coalesce(p_recipient_email,''));
  v_mode text := lower(coalesce(p_mode,'manual'));
BEGIN
  SELECT * INTO v_settings FROM public.communication_hub_control_settings ORDER BY created_at ASC LIMIT 1;
  IF v_settings.id IS NULL THEN
    v_reasons := array_append(v_reasons, 'control_settings_missing');
  ELSE
    IF v_settings.dispatch_enabled IS DISTINCT FROM true THEN v_reasons := array_append(v_reasons, 'db_dispatch_disabled'); END IF;
    IF v_settings.dry_run_only THEN v_reasons := array_append(v_reasons, 'db_dry_run_only'); END IF;
    IF v_settings.email_live_enabled IS DISTINCT FROM true THEN v_reasons := array_append(v_reasons, 'db_email_live_disabled'); END IF;
    IF v_settings.live_eligible_after IS NULL THEN
      v_reasons := array_append(v_reasons, 'live_eligible_after_missing');
    ELSE
      v_expires_at := v_settings.live_eligible_after + make_interval(mins => greatest(1, least(1440, coalesce(v_settings.live_eligible_max_age_minutes,30))));
      IF now() > v_expires_at THEN
        v_window_expired := true;
        v_reasons := array_append(v_reasons, 'live_window_expired');
      END IF;
    END IF;
    IF NOT (coalesce(array_length(v_settings.allowed_email_addresses,1),0) = 1
       AND lower(v_settings.allowed_email_addresses[1]) = 'rohit@mishainfotech.com') THEN
      v_reasons := array_append(v_reasons, 'db_allowlist_not_pilot_only');
    END IF;
    IF coalesce(array_length(v_settings.allowed_email_domains,1),0) <> 0 THEN
      v_reasons := array_append(v_reasons, 'db_allowed_domains_not_empty');
    END IF;
  END IF;

  SELECT status INTO v_event_status FROM public.communication_hub_event_live_control
    WHERE module_code = p_module_code AND event_code = p_event_code;
  IF v_event_status IS NULL THEN
    v_reasons := array_append(v_reasons, 'event_live_control_missing');
  ELSIF v_mode IN ('cron','batch') THEN
    IF v_event_status <> 'live_cron_allowed' THEN v_reasons := array_append(v_reasons, 'event_not_live_cron_allowed'); END IF;
  ELSE
    IF v_event_status NOT IN ('live_manual_only','live_cron_allowed') THEN v_reasons := array_append(v_reasons, 'event_not_live'); END IF;
  END IF;

  -- Template resolution:
  --   1) explicit p_template_code (admin pilot override)
  --   2) mapping table (channel='email')
  --   3) unresolved
  IF p_template_code IS NOT NULL AND length(trim(p_template_code)) > 0 THEN
    v_tpl_code := trim(p_template_code); v_tpl_source := 'explicit';
  ELSE
    SELECT * INTO v_map_row FROM public.communication_hub_event_template_map
      WHERE module_code=p_module_code AND event_code=p_event_code AND channel='email' AND active=true;
    IF v_map_row.id IS NOT NULL THEN
      v_tpl_code := v_map_row.template_code;
      v_tpl_source := 'mapping_table';
    ELSE
      v_tpl_code := NULL;
      v_tpl_source := 'missing';
    END IF;
  END IF;

  IF v_tpl_code IS NULL THEN
    v_reasons := array_append(v_reasons, 'template_code_unresolved_for_event');
  ELSE
    SELECT id, (is_active AND active_version_id IS NOT NULL), active_version_id, is_active
      INTO v_tpl_id, v_tpl_active, v_tpl_ver, v_tpl_active_flag
      FROM public.core_template WHERE code = v_tpl_code LIMIT 1;
    IF v_tpl_id IS NULL THEN v_reasons := array_append(v_reasons, 'template_not_found');
    ELSIF v_tpl_active IS NOT TRUE THEN v_reasons := array_append(v_reasons, 'template_inactive_or_missing_active_version');
    END IF;
  END IF;

  IF v_recipient <> 'rohit@mishainfotech.com' THEN
    v_reasons := array_append(v_reasons, 'recipient_not_pilot_allowlist');
  END IF;

  SELECT count(*) INTO v_queued_live FROM public.communication_message
    WHERE test_mode = false AND status IN ('queued','sending');
  IF v_queued_live > 0 THEN
    v_reasons := array_append(v_reasons, format('other_live_messages_queued:%s', v_queued_live));
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
      'template', jsonb_build_object(
        'template_code', v_tpl_code, 'template_id', v_tpl_id,
        'active_version_id', v_tpl_ver, 'is_active', coalesce(v_tpl_active_flag, false),
        'resolution_source', v_tpl_source
      ),
      'template_active', v_tpl_active,
      'template_active_version_id', v_tpl_ver,
      'other_live_queued', v_queued_live,
      'allowlist_addresses', to_jsonb(coalesce(v_settings.allowed_email_addresses, ARRAY[]::text[])),
      'allowlist_domains', to_jsonb(coalesce(v_settings.allowed_email_domains, ARRAY[]::text[])),
      'recipient', v_recipient, 'mode', v_mode
    )
  );
END;
$function$;

-- =========================================================================
-- PART F — Synthetic failed test message helper (admin, dry-run only, no provider)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.create_comm_hub_synthetic_failed_test_message(
  p_module_code text,
  p_event_code text,
  p_template_code text,
  p_reason text,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tpl_id uuid;
  v_tpl_ver uuid;
  v_req_id uuid := gen_random_uuid();
  v_req_no text;
  v_recipient_id uuid := gen_random_uuid();
  v_msg_id uuid := gen_random_uuid();
BEGIN
  IF NOT has_role(p_actor_user_id, 'Admin'::app_role) THEN RAISE EXCEPTION 'forbidden_admin_only'; END IF;
  IF coalesce(trim(p_reason),'') = '' THEN RAISE EXCEPTION 'reason_required'; END IF;

  SELECT id, active_version_id INTO v_tpl_id, v_tpl_ver
    FROM public.core_template WHERE code=p_template_code AND is_active=true LIMIT 1;
  IF v_tpl_id IS NULL OR v_tpl_ver IS NULL THEN RAISE EXCEPTION 'template_not_ready:%', p_template_code; END IF;

  v_req_no := 'CR-SYN-' || to_char(now() AT TIME ZONE 'UTC','YYYYMMDDHH24MISS') || '-' || upper(substr(md5(random()::text),1,6));

  INSERT INTO public.communication_request(
    id, request_no, module_code, event_code, status, priority,
    origin, test_mode, requested_by, metadata, created_at, updated_at
  ) VALUES (
    v_req_id, v_req_no, p_module_code, p_event_code, 'failed', 'normal',
    'comm_hub', true, p_actor_user_id,
    jsonb_build_object('synthetic', true, 'reason', p_reason, 'source','create_comm_hub_synthetic_failed_test_message'),
    now(), now()
  );

  INSERT INTO public.communication_recipient(
    id, request_id, role, recipient_type, email, name, channel_hint, created_at, updated_at
  ) VALUES (
    v_recipient_id, v_req_id, 'to', 'ADMIN_USER', 'rohit@mishainfotech.com', 'Rohit Wadhwa (synthetic)', 'email', now(), now()
  );

  INSERT INTO public.communication_message(
    id, request_id, recipient_id, channel, template_version_id,
    subject, body_text, status, attempt_count, provider_message_id,
    error_code, error_message, test_mode, origin, created_at, updated_at
  ) VALUES (
    v_msg_id, v_req_id, v_recipient_id, 'email', v_tpl_ver,
    'SYNTHETIC — operator action rehearsal',
    'This is a synthetic failed dry-run message for admin operator action rehearsal. No provider was called.',
    'failed', 1, NULL,
    'SYNTHETIC_OPERATOR_ACTION_TEST',
    'Synthetic failed dry-run message for operator action rehearsal',
    true, 'comm_hub', now(), now()
  );

  INSERT INTO public.communication_event_log(message_id, request_id, event_type, source, payload, actor_user_id)
  VALUES (v_msg_id, v_req_id, 'failed', 'create_comm_hub_synthetic_failed_test_message',
          jsonb_build_object('synthetic', true, 'stage','SYNTHETIC_FAILED_TEST_MESSAGE_CREATED', 'reason', p_reason),
          p_actor_user_id);

  INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
  VALUES ('synthetic_failed_test_message_created:'||v_msg_id::text, NULL,
          jsonb_build_object('request_id',v_req_id,'request_no',v_req_no,'message_id',v_msg_id,'module_code',p_module_code,'event_code',p_event_code,'template_code',p_template_code),
          p_reason, p_actor_user_id, 'create_comm_hub_synthetic_failed_test_message');

  RETURN jsonb_build_object('ok', true, 'request_id', v_req_id, 'request_no', v_req_no, 'message_id', v_msg_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_comm_hub_synthetic_failed_test_message(text,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_comm_hub_synthetic_failed_test_message(text,text,text,text,uuid) TO authenticated;

-- =========================================================================
-- Seed initial mappings (COMM_HUB + EMPLOYER_REGISTRATION x2)
-- =========================================================================
INSERT INTO public.communication_hub_event_template_map(module_code, event_code, channel, template_code, template_id, active, risk_level, mapping_source, reason)
SELECT 'COMM_HUB','ADMIN_TEST_NOTICE','email','COMM_HUB_ADMIN_TEST_NOTICE_EMAIL', t.id, true, 'low', 'seed_epic_2d','EPIC 2D — promote CASE mapping to table.'
FROM public.core_template t WHERE t.code='COMM_HUB_ADMIN_TEST_NOTICE_EMAIL'
ON CONFLICT (module_code,event_code,channel) DO UPDATE SET template_id=EXCLUDED.template_id, template_code=EXCLUDED.template_code, active=true, updated_at=now();

INSERT INTO public.communication_hub_event_template_map(module_code, event_code, channel, template_code, template_id, active, risk_level, mapping_source, reason)
SELECT 'EMPLOYER_REGISTRATION','INTERNAL_ACKNOWLEDGEMENT_NOTICE','email','EMPLOYER_REGISTRATION_INTERNAL_ACK_EMAIL', t.id, true, 'low', 'seed_epic_2d','EPIC 2D — promote CASE mapping to table.'
FROM public.core_template t WHERE t.code='EMPLOYER_REGISTRATION_INTERNAL_ACK_EMAIL'
ON CONFLICT (module_code,event_code,channel) DO UPDATE SET template_id=EXCLUDED.template_id, template_code=EXCLUDED.template_code, active=true, updated_at=now();

INSERT INTO public.communication_hub_event_template_map(module_code, event_code, channel, template_code, template_id, active, risk_level, mapping_source, reason)
SELECT 'EMPLOYER_REGISTRATION','INTERNAL_APPROVAL_REVIEW_NOTICE','email','EMPLOYER_REGISTRATION_INTERNAL_APPROVAL_REVIEW_EMAIL', t.id, true, 'low', 'seed_epic_2d','EPIC 2D — promote CASE mapping to table.'
FROM public.core_template t WHERE t.code='EMPLOYER_REGISTRATION_INTERNAL_APPROVAL_REVIEW_EMAIL'
ON CONFLICT (module_code,event_code,channel) DO UPDATE SET template_id=EXCLUDED.template_id, template_code=EXCLUDED.template_code, active=true, updated_at=now();

-- =========================================================================
-- PART H — Third business event (COMPLIANCE / INTERNAL_CASE_STATUS_NOTICE)
-- =========================================================================
INSERT INTO public.communication_hub_event_live_control(module_code, event_code, status, risk_level, reason)
VALUES ('COMPLIANCE','INTERNAL_CASE_STATUS_NOTICE','dry_run_only','low','Third business-module dry-run onboarding candidate from Compliance.')
ON CONFLICT (module_code, event_code) DO UPDATE SET status=EXCLUDED.status, risk_level=EXCLUDED.risk_level, reason=EXCLUDED.reason, updated_at=now();

-- Template + active version
DO $$
DECLARE
  v_tpl uuid;
  v_ver uuid;
BEGIN
  SELECT id INTO v_tpl FROM public.core_template WHERE code='COMPLIANCE_INTERNAL_CASE_STATUS_EMAIL' LIMIT 1;
  IF v_tpl IS NULL THEN
    INSERT INTO public.core_template(code, name, description, module_code, template_type, status, is_active, source_system, scope, owner_scope)
    VALUES ('COMPLIANCE_INTERNAL_CASE_STATUS_EMAIL',
            'Compliance — Internal Case Status Email',
            'Internal dry-run notice used to validate Communication Hub onboarding for Compliance module.',
            'COMPLIANCE','EMAIL','ACTIVE',true,'CORE','COUNTRY','GLOBAL')
    RETURNING id INTO v_tpl;
  END IF;

  SELECT id INTO v_ver FROM public.core_template_version WHERE template_id=v_tpl AND version_no=1 LIMIT 1;
  IF v_ver IS NULL THEN
    INSERT INTO public.core_template_version(template_id, version_no, status, subject, body_html, body_text, body_metadata, published_at)
    VALUES (v_tpl, 1, 'PUBLISHED',
      'Compliance Case Status Update — {{case_reference}}',
      '<div style="font-family:Arial,sans-serif;font-size:14px">'
      || '<p><strong>INTERNAL DRY-RUN / ADMIN VALIDATION</strong></p>'
      || '<p>Hello {{recipient_name}},</p>'
      || '<p>This is an internal Communication Hub validation notice for compliance case '
      || '<strong>{{case_reference}}</strong>.</p>'
      || '<ul>'
      || '<li>Status: {{case_status}}</li>'
      || '<li>Assigned officer: {{assigned_officer}}</li>'
      || '<li>Request No: {{request_no}}</li>'
      || '<li>Generated at: {{generated_at}}</li>'
      || '</ul>'
      || '<p>No customer/claimant/employer was contacted.</p>'
      || '</div>',
      'INTERNAL DRY-RUN / ADMIN VALIDATION'
       || E'\nHello {{recipient_name}},'
       || E'\nCompliance case {{case_reference}} status update.'
       || E'\nStatus: {{case_status}}'
       || E'\nAssigned officer: {{assigned_officer}}'
       || E'\nRequest No: {{request_no}}'
       || E'\nGenerated at: {{generated_at}}'
       || E'\nNo external recipient was contacted.',
      jsonb_build_object(
        'required_tokens', jsonb_build_array('recipient_name','case_reference','case_status','assigned_officer','request_no','generated_at'),
        'purpose','internal_dry_run_only'
      ),
      now()
    ) RETURNING id INTO v_ver;
  END IF;

  UPDATE public.core_template SET active_version_id=v_ver, is_active=true, status='ACTIVE', updated_at=now() WHERE id=v_tpl;
END $$;

-- PART I — Mapping for third event
INSERT INTO public.communication_hub_event_template_map(module_code, event_code, channel, template_code, template_id, active, risk_level, mapping_source, reason)
SELECT 'COMPLIANCE','INTERNAL_CASE_STATUS_NOTICE','email','COMPLIANCE_INTERNAL_CASE_STATUS_EMAIL', t.id, true, 'low', 'seed_epic_2d','EPIC 2D — Compliance dry-run onboarding.'
FROM public.core_template t WHERE t.code='COMPLIANCE_INTERNAL_CASE_STATUS_EMAIL'
ON CONFLICT (module_code,event_code,channel) DO UPDATE SET template_id=EXCLUDED.template_id, template_code=EXCLUDED.template_code, active=true, updated_at=now();
