
-- =========================================================================
-- EPIC 2C — Safe operator RPCs + second business event + evaluator mapping.
-- No table changes. Admin-only. Reason-required. One-message-only. Audited.
-- =========================================================================

-- 1. Harden cancel_comm_hub_message: allow queued/sending/failed/suppressed.
CREATE OR REPLACE FUNCTION public.cancel_comm_hub_message(
  p_message_id uuid,
  p_reason text,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg communication_message%ROWTYPE;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF p_actor_user_id IS NULL THEN RAISE EXCEPTION 'actor_user_id required'; END IF;
  IF NOT public.has_role(p_actor_user_id, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin required';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'reason required'; END IF;

  SELECT * INTO v_msg FROM public.communication_message WHERE id = p_message_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'message not found: %', p_message_id; END IF;
  IF COALESCE(v_msg.origin, '') <> 'comm_hub' THEN
    RAISE EXCEPTION 'refusing to cancel: message origin=% (comm_hub only)', v_msg.origin;
  END IF;
  IF v_msg.status NOT IN ('queued','sending','failed','suppressed') THEN
    RAISE EXCEPTION 'refusing to cancel: status=% (allowed: queued/sending/failed/suppressed)', v_msg.status;
  END IF;

  v_old := jsonb_build_object(
    'status', v_msg.status, 'test_mode', v_msg.test_mode,
    'provider_message_id', v_msg.provider_message_id,
    'locked_at', v_msg.locked_at, 'locked_by', v_msg.locked_by,
    'error_code', v_msg.error_code, 'error_message', v_msg.error_message
  );

  UPDATE public.communication_message
     SET status='cancelled',
         error_code=COALESCE(NULLIF(error_code,''),'CANCELLED_BY_ADMIN'),
         error_message=left(p_reason, 1000),
         locked_at=NULL, locked_by=NULL, updated_at=now()
   WHERE id = p_message_id;

  v_new := jsonb_build_object('status','cancelled','cancelled_by',p_actor_user_id,'cancelled_at',now());

  INSERT INTO public.communication_event_log
    (message_id, request_id, event_type, source, payload, actor_user_id)
  VALUES
    (v_msg.id, v_msg.request_id, 'cancelled', 'cancel_comm_hub_message',
     jsonb_build_object('stage','MESSAGE_CANCELLED_BY_ADMIN','reason',p_reason,'actor',p_actor_user_id,
                        'previous_status',v_msg.status),
     p_actor_user_id);

  INSERT INTO public.communication_hub_control_audit
    (setting_key, old_value, new_value, reason, changed_by, source)
  VALUES
    ('message_cancelled:' || p_message_id::text, v_old, v_new, p_reason, p_actor_user_id, 'cancel_comm_hub_message');

  BEGIN
    PERFORM public.recompute_communication_request_status(v_msg.request_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'message_id', p_message_id,
                            'request_id', v_msg.request_id,
                            'previous_status', v_msg.status, 'new_status', 'cancelled');
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_comm_hub_message(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_comm_hub_message(uuid, text, uuid) TO authenticated, service_role;

-- 2. clear_comm_hub_message_lock
CREATE OR REPLACE FUNCTION public.clear_comm_hub_message_lock(
  p_message_id uuid,
  p_reason text,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg communication_message%ROWTYPE;
  v_old jsonb; v_new jsonb;
BEGIN
  IF p_actor_user_id IS NULL THEN RAISE EXCEPTION 'actor_user_id required'; END IF;
  IF NOT public.has_role(p_actor_user_id, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin required';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'reason required'; END IF;

  SELECT * INTO v_msg FROM public.communication_message WHERE id = p_message_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'message not found: %', p_message_id; END IF;
  IF COALESCE(v_msg.origin, '') <> 'comm_hub' THEN
    RAISE EXCEPTION 'refusing: message origin=% (comm_hub only)', v_msg.origin;
  END IF;
  IF v_msg.status <> 'sending' THEN
    RAISE EXCEPTION 'refusing: status=% (only sending eligible for stale-lock clear)', v_msg.status;
  END IF;
  IF v_msg.locked_at IS NULL OR v_msg.locked_at > now() - INTERVAL '10 minutes' THEN
    RAISE EXCEPTION 'refusing: lock not stale (>10 minutes required)';
  END IF;

  v_old := jsonb_build_object('status', v_msg.status, 'locked_at', v_msg.locked_at, 'locked_by', v_msg.locked_by);

  UPDATE public.communication_message
     SET status='queued', locked_at=NULL, locked_by=NULL,
         next_attempt_at=now(), updated_at=now()
   WHERE id = p_message_id;

  v_new := jsonb_build_object('status','queued','next_attempt_at',now(),'cleared_by',p_actor_user_id);

  INSERT INTO public.communication_event_log
    (message_id, request_id, event_type, source, payload, actor_user_id)
  VALUES
    (v_msg.id, v_msg.request_id, 'lock_cleared', 'clear_comm_hub_message_lock',
     jsonb_build_object('stage','STALE_LOCK_CLEARED_BY_ADMIN','reason',p_reason,'actor',p_actor_user_id,
                        'previous_locked_at',v_msg.locked_at,'previous_locked_by',v_msg.locked_by),
     p_actor_user_id);

  INSERT INTO public.communication_hub_control_audit
    (setting_key, old_value, new_value, reason, changed_by, source)
  VALUES
    ('message_lock_cleared:' || p_message_id::text, v_old, v_new, p_reason, p_actor_user_id, 'clear_comm_hub_message_lock');

  RETURN jsonb_build_object('ok', true, 'message_id', p_message_id, 'new_status', 'queued');
END;
$$;
REVOKE ALL ON FUNCTION public.clear_comm_hub_message_lock(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_comm_hub_message_lock(uuid, text, uuid) TO authenticated, service_role;

-- 3. retry_comm_hub_message (dry-run / test_mode=true only in this phase)
CREATE OR REPLACE FUNCTION public.retry_comm_hub_message(
  p_message_id uuid,
  p_reason text,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg communication_message%ROWTYPE;
  v_old jsonb; v_new jsonb;
BEGIN
  IF p_actor_user_id IS NULL THEN RAISE EXCEPTION 'actor_user_id required'; END IF;
  IF NOT public.has_role(p_actor_user_id, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin required';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'reason required'; END IF;

  SELECT * INTO v_msg FROM public.communication_message WHERE id = p_message_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'message not found: %', p_message_id; END IF;
  IF COALESCE(v_msg.origin, '') <> 'comm_hub' THEN
    RAISE EXCEPTION 'refusing: message origin=% (comm_hub only)', v_msg.origin;
  END IF;
  IF v_msg.status <> 'failed' THEN
    RAISE EXCEPTION 'refusing: status=% (retry allowed only for failed in this phase)', v_msg.status;
  END IF;
  IF v_msg.test_mode IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'refusing: retry is dry-run-only in this phase (test_mode must be true)';
  END IF;

  v_old := jsonb_build_object('status',v_msg.status,'error_code',v_msg.error_code,
                              'error_message',v_msg.error_message,'attempt_count',v_msg.attempt_count,
                              'locked_at',v_msg.locked_at,'locked_by',v_msg.locked_by);

  UPDATE public.communication_message
     SET status='queued',
         next_attempt_at=now(),
         error_code=NULL, error_message=NULL,
         locked_at=NULL, locked_by=NULL,
         updated_at=now()
   WHERE id = p_message_id;

  v_new := jsonb_build_object('status','queued','next_attempt_at',now(),
                              'attempt_count_preserved', v_msg.attempt_count,
                              'requeued_by', p_actor_user_id);

  INSERT INTO public.communication_event_log
    (message_id, request_id, event_type, source, payload, actor_user_id)
  VALUES
    (v_msg.id, v_msg.request_id, 'requeued', 'retry_comm_hub_message',
     jsonb_build_object('stage','MESSAGE_REQUEUED_BY_ADMIN','reason',p_reason,'actor',p_actor_user_id,
                        'previous_status','failed','previous_error_code',v_msg.error_code,
                        'attempt_count_preserved', v_msg.attempt_count, 'test_mode', true),
     p_actor_user_id);

  INSERT INTO public.communication_hub_control_audit
    (setting_key, old_value, new_value, reason, changed_by, source)
  VALUES
    ('message_requeued:' || p_message_id::text, v_old, v_new, p_reason, p_actor_user_id, 'retry_comm_hub_message');

  BEGIN
    PERFORM public.recompute_communication_request_status(v_msg.request_id);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'message_id', p_message_id,
                            'request_id', v_msg.request_id, 'new_status', 'queued',
                            'test_mode', true);
END;
$$;
REVOKE ALL ON FUNCTION public.retry_comm_hub_message(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_comm_hub_message(uuid, text, uuid) TO authenticated, service_role;

-- 4. Second business event — dry_run_only
INSERT INTO public.communication_hub_event_live_control
  (module_code, event_code, status, risk_level, reason)
VALUES
  ('EMPLOYER_REGISTRATION', 'INTERNAL_APPROVAL_REVIEW_NOTICE', 'dry_run_only', 'low',
   'Second business-module dry-run onboarding candidate.')
ON CONFLICT (module_code, event_code) DO NOTHING;

-- 5. Seed template + v1
DO $seed$
DECLARE
  v_tpl_id uuid;
  v_ver_id uuid;
BEGIN
  SELECT id INTO v_tpl_id FROM public.core_template
   WHERE code = 'EMPLOYER_REGISTRATION_INTERNAL_APPROVAL_REVIEW_EMAIL';

  IF v_tpl_id IS NULL THEN
    INSERT INTO public.core_template
      (code, name, description, module_code, template_type, template_category,
       status, is_active, scope, owner_scope)
    VALUES
      ('EMPLOYER_REGISTRATION_INTERNAL_APPROVAL_REVIEW_EMAIL',
       'Employer Registration — Internal Approval Review (Dry-Run)',
       'Internal dry-run notice used to validate Communication Hub onboarding for employer registration approval review. Not for external use.',
       'EMPLOYER_REGISTRATION', 'EMAIL', 'INTERNAL_DRY_RUN',
       'ACTIVE', true, 'GLOBAL', 'GLOBAL')
    RETURNING id INTO v_tpl_id;
  END IF;

  SELECT id INTO v_ver_id FROM public.core_template_version
   WHERE template_id = v_tpl_id AND version_no = 1;

  IF v_ver_id IS NULL THEN
    INSERT INTO public.core_template_version
      (template_id, version_no, status, subject, body_html, body_text, body_metadata, published_at)
    VALUES
      (v_tpl_id, 1, 'PUBLISHED',
       'Employer Registration Review Update — {{reference_no}}',
       $html$<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
<p><strong>INTERNAL DRY-RUN / ADMIN VALIDATION</strong></p>
<p>Hello {{recipient_name}},</p>
<p>This is an <em>internal</em> Communication Hub validation notice for the employer registration approval review workflow. It is not a customer notification.</p>
<table style="border-collapse:collapse;font-size:13px">
  <tr><td style="padding:4px 8px;color:#555">Employer</td><td style="padding:4px 8px"><strong>{{employer_name}}</strong></td></tr>
  <tr><td style="padding:4px 8px;color:#555">Reference No</td><td style="padding:4px 8px"><code>{{reference_no}}</code></td></tr>
  <tr><td style="padding:4px 8px;color:#555">Review Status</td><td style="padding:4px 8px">{{review_status}}</td></tr>
  <tr><td style="padding:4px 8px;color:#555">Hub Request No</td><td style="padding:4px 8px"><code>{{request_no}}</code></td></tr>
  <tr><td style="padding:4px 8px;color:#555">Generated At</td><td style="padding:4px 8px">{{generated_at}}</td></tr>
</table>
<p style="color:#888;font-size:11px;margin-top:16px">Communication Hub — EMPLOYER_REGISTRATION / INTERNAL_APPROVAL_REVIEW_NOTICE (dry-run only)</p>
</div>$html$,
       'INTERNAL DRY-RUN / ADMIN VALIDATION' || E'\n\nHello {{recipient_name}},\n\nInternal Communication Hub validation notice for the employer registration approval review workflow (not a customer notification).\n\nEmployer: {{employer_name}}\nReference No: {{reference_no}}\nReview Status: {{review_status}}\nHub Request No: {{request_no}}\nGenerated At: {{generated_at}}\n',
       jsonb_build_object(
         'module_code','EMPLOYER_REGISTRATION',
         'event_code','INTERNAL_APPROVAL_REVIEW_NOTICE',
         'channel','EMAIL',
         'required_tokens', jsonb_build_array('recipient_name','employer_name','reference_no','review_status','request_no','generated_at')
       ),
       now())
    RETURNING id INTO v_ver_id;
  END IF;

  UPDATE public.core_template
     SET active_version_id=v_ver_id, is_active=true, status='ACTIVE', updated_at=now()
   WHERE id = v_tpl_id AND (active_version_id IS DISTINCT FROM v_ver_id OR is_active IS DISTINCT FROM true);
END;
$seed$;

-- 6. Extend dynamic live-gate evaluator mapping for the second event.
CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_live_gate(
  p_module_code    text,
  p_event_code     text,
  p_recipient_email text,
  p_mode           text DEFAULT 'manual',
  p_template_code  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
  v_tpl_source text := 'none';
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
      v_expires_at := v_settings.live_eligible_after
        + make_interval(mins => greatest(1, least(1440, coalesce(v_settings.live_eligible_max_age_minutes,30))));
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

  IF p_template_code IS NOT NULL AND length(trim(p_template_code)) > 0 THEN
    v_tpl_code := trim(p_template_code); v_tpl_source := 'explicit';
  ELSIF p_module_code = 'COMM_HUB' AND p_event_code = 'ADMIN_TEST_NOTICE' THEN
    v_tpl_code := 'COMM_HUB_ADMIN_TEST_NOTICE_EMAIL'; v_tpl_source := 'mapping';
  ELSIF p_module_code = 'EMPLOYER_REGISTRATION' AND p_event_code = 'INTERNAL_ACKNOWLEDGEMENT_NOTICE' THEN
    v_tpl_code := 'EMPLOYER_REGISTRATION_INTERNAL_ACK_EMAIL'; v_tpl_source := 'mapping';
  ELSIF p_module_code = 'EMPLOYER_REGISTRATION' AND p_event_code = 'INTERNAL_APPROVAL_REVIEW_NOTICE' THEN
    v_tpl_code := 'EMPLOYER_REGISTRATION_INTERNAL_APPROVAL_REVIEW_EMAIL'; v_tpl_source := 'mapping';
  ELSIF p_module_code = 'COMM_HUB' THEN
    v_tpl_code := 'COMM_HUB_' || p_event_code || '_EMAIL'; v_tpl_source := 'legacy_fallback';
  ELSE
    v_tpl_code := NULL; v_tpl_source := 'unresolved';
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
GRANT EXECUTE ON FUNCTION public.evaluate_comm_hub_live_gate(text,text,text,text,text) TO authenticated, service_role;
