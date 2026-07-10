
CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_send_authorization(
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module      text := p_payload->>'module_code';
  v_event       text := p_payload->>'event_code';
  v_channel     text := COALESCE(p_payload->>'channel', 'email');
  v_env         text := COALESCE(p_payload->>'environment_scope', 'production');
  v_recipients  jsonb := COALESCE(p_payload->'recipients', '[]'::jsonb);
  v_entity_id   text  := p_payload->>'entity_id';
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
  v_send_policy text;
  v_is_enabled boolean;
  v_approved boolean;
  v_req_sender_verified boolean;
  v_recipient_count int := 0;
  v_dup_count int := 0;
BEGIN
  v_policy := public.resolve_comm_hub_send_policy(v_module, v_event, v_channel, v_env);
  v_send_policy := v_policy->>'send_policy';
  v_is_enabled := COALESCE((v_policy->>'is_enabled')::boolean, false);
  v_approved := COALESCE((v_policy->>'approved')::boolean, false);
  v_allow_int := COALESCE((v_policy->>'allow_internal_recipients')::boolean, false);
  v_allow_ext := COALESCE((v_policy->>'allow_external_recipients')::boolean, false);
  v_max_recip := COALESCE((v_policy->>'max_recipients_per_send')::int, 1);
  v_dup_window := COALESCE((v_policy->>'duplicate_window_minutes')::int, 1440);
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
       WHERE is_enabled = true
         AND provider_identity_status = 'verified'
         AND domain_verified = true
    ) INTO v_sender_ok;
    IF NOT v_sender_ok THEN
      v_blockers := v_blockers || to_jsonb('sender_not_verified'::text);
      v_required_action := COALESCE(v_required_action, 'sender_verification_required');
    END IF;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.communication_hub_event_template_map
     WHERE module_code = v_module
       AND event_code = v_event
       AND channel = v_channel
       AND active = true
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

  IF v_entity_id IS NOT NULL AND v_dup_window > 0 THEN
    SELECT COUNT(*) INTO v_dup_count
      FROM public.communication_request
     WHERE module_code = v_module
       AND event_code = v_event
       AND entity_id::text = v_entity_id
       AND created_at > (now() - make_interval(mins => v_dup_window));
    IF v_dup_count >= COALESCE((v_policy->>'max_sends_per_entity_per_event')::int, 1) THEN
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
    'duplicate_count', v_dup_count
  );
END;
$$;
