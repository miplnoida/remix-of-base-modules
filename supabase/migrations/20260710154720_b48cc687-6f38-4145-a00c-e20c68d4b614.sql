
-- EPIC CH-S2 — Sender verification governance

-- Part E: SPF/DKIM/DMARC and verification tracking columns
ALTER TABLE public.communication_hub_sender_profile
  ADD COLUMN IF NOT EXISTS spf_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS dkim_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS dmarc_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_checked_by uuid NULL,
  ADD COLUMN IF NOT EXISTS verification_notes text NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chub_sender_spf_chk') THEN
    ALTER TABLE public.communication_hub_sender_profile
      ADD CONSTRAINT chub_sender_spf_chk   CHECK (spf_status   IN ('unknown','pending','valid','invalid','not_applicable')),
      ADD CONSTRAINT chub_sender_dkim_chk  CHECK (dkim_status  IN ('unknown','pending','valid','invalid','not_applicable')),
      ADD CONSTRAINT chub_sender_dmarc_chk CHECK (dmarc_status IN ('unknown','pending','valid','invalid','not_applicable'));
  END IF;
END $$;

-- Part G: verification RPC (Admin-only, audited)
CREATE OR REPLACE FUNCTION public.set_comm_hub_sender_verification(
  p_id uuid,
  p_spf_status text,
  p_dkim_status text,
  p_dmarc_status text,
  p_verification_notes text,
  p_reason text,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_row public.communication_hub_sender_profile%ROWTYPE;
  v_old jsonb;
BEGIN
  IF NOT has_role(p_actor_user_id, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden_admin_only';
  END IF;
  IF coalesce(trim(p_reason),'')='' THEN RAISE EXCEPTION 'reason_required'; END IF;

  SELECT * INTO v_row FROM public.communication_hub_sender_profile WHERE id = p_id;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'sender_profile_not_found'; END IF;
  v_old := to_jsonb(v_row);

  UPDATE public.communication_hub_sender_profile SET
    spf_status         = coalesce(p_spf_status, spf_status),
    dkim_status        = coalesce(p_dkim_status, dkim_status),
    dmarc_status       = coalesce(p_dmarc_status, dmarc_status),
    verification_notes = coalesce(p_verification_notes, verification_notes),
    last_checked_at    = now(),
    last_checked_by    = p_actor_user_id,
    updated_by         = p_actor_user_id
  WHERE id = p_id
  RETURNING * INTO v_row;

  INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
  VALUES ('sender_profile_verification:'||v_row.profile_code, v_old, to_jsonb(v_row), p_reason, p_actor_user_id, 'sender-verification-console');

  RETURN jsonb_build_object('ok', true, 'profile', to_jsonb(v_row));
END;
$fn$;

REVOKE ALL ON FUNCTION public.set_comm_hub_sender_verification(uuid,text,text,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_comm_hub_sender_verification(uuid,text,text,text,text,text,uuid) TO authenticated;

-- Part B: extend evaluate_comm_hub_live_gate to include sender scoring
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
  v_event_risk text;
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
  -- Sender resolution
  v_sender public.communication_hub_sender_profile%ROWTYPE;
  v_sender_source text := 'none';
  v_recipient_internal boolean := (v_recipient LIKE '%@mishainfotech.com');
  v_expected_category text;
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

  SELECT status, risk_level INTO v_event_status, v_event_risk
    FROM public.communication_hub_event_live_control
    WHERE module_code = p_module_code AND event_code = p_event_code;
  IF v_event_status IS NULL THEN
    v_reasons := array_append(v_reasons, 'event_live_control_missing');
  ELSIF v_mode IN ('cron','batch') THEN
    IF v_event_status <> 'live_cron_allowed' THEN v_reasons := array_append(v_reasons, 'event_not_live_cron_allowed'); END IF;
  ELSE
    IF v_event_status NOT IN ('live_manual_only','live_cron_allowed') THEN v_reasons := array_append(v_reasons, 'event_not_live'); END IF;
  END IF;

  -- Template resolution
  IF p_template_code IS NOT NULL AND length(trim(p_template_code)) > 0 THEN
    v_tpl_code := trim(p_template_code); v_tpl_source := 'explicit';
  ELSE
    SELECT * INTO v_map_row FROM public.communication_hub_event_template_map
      WHERE module_code=p_module_code AND event_code=p_event_code AND channel='email' AND active=true;
    IF v_map_row.id IS NOT NULL THEN
      v_tpl_code := v_map_row.template_code;
      v_tpl_source := 'mapping_table';
    ELSE
      v_tpl_code := NULL; v_tpl_source := 'missing';
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

  -- Sender resolution
  IF v_map_row.id IS NOT NULL AND v_map_row.sender_profile_id IS NOT NULL THEN
    SELECT * INTO v_sender FROM public.communication_hub_sender_profile WHERE id = v_map_row.sender_profile_id;
    v_sender_source := 'event_mapping';
  END IF;
  IF v_sender.id IS NULL THEN
    SELECT * INTO v_sender FROM public.communication_hub_sender_profile
      WHERE is_default = true AND is_enabled = true LIMIT 1;
    IF v_sender.id IS NOT NULL THEN v_sender_source := 'system_default'; END IF;
  END IF;

  IF v_sender.id IS NULL THEN
    v_reasons := array_append(v_reasons, 'sender_profile_missing');
  ELSE
    IF v_sender.is_enabled IS NOT TRUE THEN
      v_reasons := array_append(v_reasons, 'sender_disabled');
    END IF;
    -- External live send requires verified identity + domain
    IF NOT v_recipient_internal THEN
      IF v_sender.provider_identity_status <> 'verified' THEN
        v_reasons := array_append(v_reasons, 'sender_not_verified');
      END IF;
      IF v_sender.domain_verified IS NOT TRUE THEN
        v_reasons := array_append(v_reasons, 'sender_domain_not_verified');
      END IF;
    END IF;
    -- Category recommendation checks
    v_expected_category := CASE
      WHEN p_module_code = 'LEGAL'                 THEN 'legal'
      WHEN p_module_code = 'BENEFITS' AND p_event_code IN ('CLAIM_APPROVAL_NOTICE','CLAIM_REJECTION_NOTICE') THEN 'benefits'
      WHEN p_module_code = 'BENEFITS'              THEN 'claims'
      WHEN p_module_code = 'COMPLIANCE'            THEN 'compliance'
      WHEN p_module_code = 'EMPLOYER_REGISTRATION' THEN 'registration'
      ELSE NULL
    END;
    IF v_expected_category IS NOT NULL
       AND v_sender.sender_category = 'notifications'
       AND v_sender.sender_category <> v_expected_category THEN
      v_reasons := array_append(v_reasons, 'sender_category_mismatch');
    END IF;
    -- High-risk events cannot use generic notifications sender
    IF coalesce(v_event_risk,'low') IN ('high','sensitive')
       AND v_sender.sender_category = 'notifications' THEN
      IF NOT ('sender_category_mismatch' = ANY(v_reasons)) THEN
        v_reasons := array_append(v_reasons, 'sender_category_mismatch');
      END IF;
    END IF;
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
      'event_risk_level', v_event_risk,
      'template', jsonb_build_object(
        'template_code', v_tpl_code, 'template_id', v_tpl_id,
        'active_version_id', v_tpl_ver, 'is_active', coalesce(v_tpl_active_flag, false),
        'resolution_source', v_tpl_source
      ),
      'template_active', v_tpl_active,
      'template_active_version_id', v_tpl_ver,
      'other_live_queued', v_queued_live,
      'allowlist_addresses', to_jsonb(coalesce(v_settings.allowed_email_addresses, ARRAY[]::text[])),
      'allowlist_domains',   to_jsonb(coalesce(v_settings.allowed_email_domains,   ARRAY[]::text[])),
      'recipient', v_recipient, 'mode', v_mode,
      'sender', CASE WHEN v_sender.id IS NULL THEN
        jsonb_build_object('resolution_source','none')
      ELSE jsonb_build_object(
        'sender_profile_id', v_sender.id,
        'profile_code', v_sender.profile_code,
        'profile_name', v_sender.profile_name,
        'from_email', v_sender.from_email,
        'display_name', v_sender.display_name,
        'reply_to_email', v_sender.reply_to_email,
        'sender_category', v_sender.sender_category,
        'audience_type', v_sender.audience_type,
        'risk_level', v_sender.risk_level,
        'provider_code', v_sender.provider_code,
        'provider_identity_status', v_sender.provider_identity_status,
        'domain_verified', v_sender.domain_verified,
        'is_enabled', v_sender.is_enabled,
        'spf_status', v_sender.spf_status,
        'dkim_status', v_sender.dkim_status,
        'dmarc_status', v_sender.dmarc_status,
        'resolution_source', v_sender_source
      ) END
    )
  );
END;
$function$;
