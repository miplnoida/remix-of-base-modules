
-- 1. Add column
ALTER TABLE public.communication_hub_control_settings
  ADD COLUMN IF NOT EXISTS recipient_release_mode text NOT NULL DEFAULT 'single_recipient_pilot';

-- 2. Enforce allowed values via trigger (avoids CHECK constraint restore issues)
CREATE OR REPLACE FUNCTION public.validate_recipient_release_mode_tg()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.recipient_release_mode NOT IN (
    'single_recipient_pilot',
    'internal_named_users',
    'internal_domain_pilot',
    'internal_production',
    'approved_external_domains',
    'approved_user_segments',
    'full_production_controlled'
  ) THEN
    RAISE EXCEPTION 'invalid recipient_release_mode: %', NEW.recipient_release_mode
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_recipient_release_mode ON public.communication_hub_control_settings;
CREATE TRIGGER trg_validate_recipient_release_mode
BEFORE INSERT OR UPDATE OF recipient_release_mode
ON public.communication_hub_control_settings
FOR EACH ROW EXECUTE FUNCTION public.validate_recipient_release_mode_tg();

-- 3. Validator RPC
CREATE OR REPLACE FUNCTION public.validate_comm_hub_recipient_release_mode(
  p_mode text,
  p_allowed_email_addresses text[],
  p_allowed_email_domains text[]
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blockers jsonb := '[]'::jsonb;
  v_addresses text[] := COALESCE(p_allowed_email_addresses, ARRAY[]::text[]);
  v_domains text[] := COALESCE(p_allowed_email_domains, ARRAY[]::text[]);
  v_addr text;
  v_dom text;
  v_bad_addr boolean := false;
  v_bad_dom boolean := false;
BEGIN
  IF p_mode IS NULL OR p_mode NOT IN (
    'single_recipient_pilot','internal_named_users','internal_domain_pilot',
    'internal_production','approved_external_domains','approved_user_segments',
    'full_production_controlled'
  ) THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','recipient_release_mode_invalid',
      'message','Recipient release mode is missing or not recognised.'
    );
    RETURN jsonb_build_object('ok', false, 'mode', p_mode, 'blockers', v_blockers);
  END IF;

  IF p_mode = 'single_recipient_pilot' THEN
    IF array_length(v_addresses,1) IS DISTINCT FROM 1
       OR lower(v_addresses[1]) IS DISTINCT FROM 'rohit@mishainfotech.com'
       OR array_length(v_domains,1) IS NOT NULL THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','single_recipient_required',
        'message','Single Recipient Pilot requires exactly rohit@mishainfotech.com and no allowed domains.'
      );
    END IF;

  ELSIF p_mode = 'internal_named_users' THEN
    IF array_length(v_domains,1) IS NOT NULL THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','internal_email_required',
        'message','Internal Named Users mode does not allow domain allowlists; use individual @mishainfotech.com addresses.'
      );
    END IF;
    IF array_length(v_addresses,1) IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','internal_email_required',
        'message','Add at least one @mishainfotech.com internal address.'
      );
    ELSE
      FOREACH v_addr IN ARRAY v_addresses LOOP
        IF lower(v_addr) NOT LIKE '%@mishainfotech.com' THEN
          v_bad_addr := true;
        END IF;
      END LOOP;
      IF v_bad_addr THEN
        v_blockers := v_blockers || jsonb_build_object(
          'code','internal_email_required',
          'message','All allowed email addresses must end with @mishainfotech.com in this mode.'
        );
      END IF;
    END IF;

  ELSIF p_mode = 'internal_domain_pilot' THEN
    IF array_length(v_domains,1) IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','internal_domain_required',
        'message','Internal Domain Pilot requires the mishainfotech.com domain to be allowlisted.'
      );
    ELSE
      FOREACH v_dom IN ARRAY v_domains LOOP
        IF lower(v_dom) <> 'mishainfotech.com' THEN
          v_bad_dom := true;
        END IF;
      END LOOP;
      IF v_bad_dom THEN
        v_blockers := v_blockers || jsonb_build_object(
          'code','internal_domain_required',
          'message','Only mishainfotech.com may be allowlisted in Internal Domain Pilot.'
        );
      END IF;
    END IF;
    IF array_length(v_addresses,1) IS NOT NULL THEN
      FOREACH v_addr IN ARRAY v_addresses LOOP
        IF lower(v_addr) NOT LIKE '%@mishainfotech.com' THEN
          v_bad_addr := true;
        END IF;
      END LOOP;
      IF v_bad_addr THEN
        v_blockers := v_blockers || jsonb_build_object(
          'code','internal_email_required',
          'message','Individual addresses in Internal Domain Pilot must also be @mishainfotech.com.'
        );
      END IF;
    END IF;

  ELSIF p_mode = 'internal_production' THEN
    IF array_length(v_domains,1) IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','internal_domain_required',
        'message','Internal Production requires at least one approved internal domain.'
      );
    ELSE
      FOREACH v_dom IN ARRAY v_domains LOOP
        IF lower(v_dom) <> 'mishainfotech.com' THEN
          v_bad_dom := true;
        END IF;
      END LOOP;
      IF v_bad_dom THEN
        v_blockers := v_blockers || jsonb_build_object(
          'code','internal_domain_required',
          'message','External domains are not permitted yet; only internal domains are allowed.'
        );
      END IF;
    END IF;

  ELSIF p_mode = 'approved_external_domains' THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','external_domain_phase_not_enabled',
      'message','Approved External Domains phase is not enabled yet.'
    );

  ELSIF p_mode = 'approved_user_segments' THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','user_segment_phase_not_enabled',
      'message','Approved User Segments phase is not enabled yet.'
    );

  ELSIF p_mode = 'full_production_controlled' THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','full_production_phase_not_enabled',
      'message','Full Production Controlled phase is not enabled yet.'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', jsonb_array_length(v_blockers) = 0,
    'mode', p_mode,
    'allowed_email_addresses', to_jsonb(v_addresses),
    'allowed_email_domains', to_jsonb(v_domains),
    'blockers', v_blockers
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_comm_hub_recipient_release_mode(text, text[], text[]) TO authenticated, service_role, anon;

-- 4. Patch open_comm_hub_live_window: replace hardcoded Rohit-only rule
CREATE OR REPLACE FUNCTION public.open_comm_hub_live_window(
  p_module_code text,
  p_event_code text,
  p_duration_minutes integer,
  p_reason text,
  p_typed_confirmation text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_event_status text;
  v_queued_live integer;
  v_expected_confirm text;
  v_now timestamptz := now();
  v_new_after timestamptz;
  v_max_duration int;
  v_validator jsonb;
  v_blockers text;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'Admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    (p_module_code = 'COMM_HUB'   AND p_event_code = 'ADMIN_TEST_NOTICE') OR
    (p_module_code = 'COMPLIANCE' AND p_event_code = 'INTERNAL_CASE_STATUS_NOTICE') OR
    (p_module_code = 'LEGAL'      AND p_event_code = 'INTERNAL_CASE_ASSIGNMENT_NOTICE')
  ) THEN
    RAISE EXCEPTION 'unsupported event: %/% not permitted in this phase', p_module_code, p_event_code;
  END IF;

  v_expected_confirm := 'OPEN LIVE WINDOW FOR ' || p_module_code || '/' || p_event_code;
  IF p_typed_confirmation IS DISTINCT FROM v_expected_confirm THEN
    RAISE EXCEPTION 'typed confirmation mismatch: expected exact phrase';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason is required';
  END IF;

  v_max_duration := CASE WHEN p_module_code IN ('COMPLIANCE','LEGAL') THEN 5 ELSE 30 END;
  IF p_duration_minutes IS NULL OR p_duration_minutes < 1 OR p_duration_minutes > v_max_duration THEN
    RAISE EXCEPTION 'duration must be between 1 and % minutes (got %)', v_max_duration, p_duration_minutes;
  END IF;

  SELECT * INTO v_settings FROM public.communication_hub_control_settings ORDER BY created_at ASC LIMIT 1;
  IF v_settings.id IS NULL THEN RAISE EXCEPTION 'control settings row missing'; END IF;

  -- NEW: recipient release mode validation (replaces hardcoded Rohit-only rule)
  v_validator := public.validate_comm_hub_recipient_release_mode(
    v_settings.recipient_release_mode,
    v_settings.allowed_email_addresses,
    v_settings.allowed_email_domains
  );
  IF (v_validator->>'ok')::boolean IS DISTINCT FROM true THEN
    v_blockers := (
      SELECT string_agg(b->>'code' || ': ' || (b->>'message'), ' | ')
      FROM jsonb_array_elements(v_validator->'blockers') b
    );
    INSERT INTO public.communication_hub_control_audit
      (setting_key, old_value, new_value, reason, changed_by, source)
    VALUES
      ('recipient_release_mode', to_jsonb(v_settings.recipient_release_mode), v_validator,
       'live-window open refused: ' || COALESCE(v_blockers, 'unknown blockers'),
       v_uid, 'open_comm_hub_live_window');
    RAISE EXCEPTION 'recipient release mode blocks live window: %', COALESCE(v_blockers, 'unknown');
  END IF;

  SELECT status INTO v_event_status FROM public.communication_hub_event_live_control
    WHERE module_code = p_module_code AND event_code = p_event_code;
  IF v_event_status IS DISTINCT FROM 'live_manual_only' THEN
    RAISE EXCEPTION 'event status must be live_manual_only (got %)', COALESCE(v_event_status,'null');
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
    'duration_minutes', p_duration_minutes, 'module_code', p_module_code, 'event_code', p_event_code,
    'recipient_release_mode', v_settings.recipient_release_mode);
END;
$function$;
