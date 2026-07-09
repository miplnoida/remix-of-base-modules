
-- EPIC 2B — Make evaluate_comm_hub_live_gate dynamic for template lookup.
-- Adds optional p_template_code and a deterministic module/event → template
-- mapping. Returns richer gates.template payload. Existing 4-argument callers
-- keep working via DEFAULT NULL. No table changes.

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

  -- Dynamic template resolution.
  -- Precedence:
  --   1) explicit p_template_code
  --   2) known module/event → template mapping
  --   3) fallback: legacy COMM_HUB_<event>_EMAIL for COMM_HUB module only
  IF p_template_code IS NOT NULL AND length(trim(p_template_code)) > 0 THEN
    v_tpl_code := trim(p_template_code);
    v_tpl_source := 'explicit';
  ELSIF p_module_code = 'COMM_HUB' AND p_event_code = 'ADMIN_TEST_NOTICE' THEN
    v_tpl_code := 'COMM_HUB_ADMIN_TEST_NOTICE_EMAIL';
    v_tpl_source := 'mapping';
  ELSIF p_module_code = 'EMPLOYER_REGISTRATION' AND p_event_code = 'INTERNAL_ACKNOWLEDGEMENT_NOTICE' THEN
    v_tpl_code := 'EMPLOYER_REGISTRATION_INTERNAL_ACK_EMAIL';
    v_tpl_source := 'mapping';
  ELSIF p_module_code = 'COMM_HUB' THEN
    v_tpl_code := 'COMM_HUB_' || p_event_code || '_EMAIL';
    v_tpl_source := 'legacy_fallback';
  ELSE
    v_tpl_code := NULL;
    v_tpl_source := 'unresolved';
  END IF;

  IF v_tpl_code IS NULL THEN
    v_reasons := array_append(v_reasons, 'template_code_unresolved_for_event');
  ELSE
    SELECT id, (is_active AND active_version_id IS NOT NULL), active_version_id, is_active
      INTO v_tpl_id, v_tpl_active, v_tpl_ver, v_tpl_active_flag
      FROM public.core_template
      WHERE code = v_tpl_code
      LIMIT 1;
    IF v_tpl_id IS NULL THEN
      v_reasons := array_append(v_reasons, 'template_not_found');
    ELSIF v_tpl_active IS NOT TRUE THEN
      v_reasons := array_append(v_reasons, 'template_inactive_or_missing_active_version');
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
        'template_code', v_tpl_code,
        'template_id', v_tpl_id,
        'active_version_id', v_tpl_ver,
        'is_active', coalesce(v_tpl_active_flag, false),
        'resolution_source', v_tpl_source
      ),
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
$function$;

GRANT EXECUTE ON FUNCTION public.evaluate_comm_hub_live_gate(text,text,text,text,text) TO authenticated, service_role;
