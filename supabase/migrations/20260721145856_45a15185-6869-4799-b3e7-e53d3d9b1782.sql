
CREATE OR REPLACE FUNCTION public.set_recipient_test_identity(
  p_action text,
  p_display_name text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_policy RECORD;
  v_old_name text;
  v_old_source text;
  v_old_confirmed boolean;
  v_new_name text;
  v_new_source text;
  v_new_confirmed boolean;
  v_new_confirmed_at timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;
  IF NOT public.has_role(v_uid, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('confirm','edit','clear') THEN
    RAISE EXCEPTION 'invalid action: %', p_action;
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason is required';
  END IF;

  SELECT * INTO v_policy
  FROM public.communication_hub_recipient_policy
  WHERE singleton_guard = 'primary'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'recipient policy singleton missing';
  END IF;

  v_old_name := v_policy.single_configured_display_name;
  v_old_source := v_policy.single_configured_display_name_source;
  v_old_confirmed := v_policy.single_configured_display_name_confirmed;

  IF p_action = 'confirm' THEN
    IF v_old_name IS NULL OR length(trim(v_old_name)) = 0 THEN
      RAISE EXCEPTION 'cannot confirm an empty display name';
    END IF;
    v_new_name := v_old_name;
    v_new_source := v_old_source; -- preserve provenance; confirmation only flips the flag
    v_new_confirmed := true;
    v_new_confirmed_at := now();
  ELSIF p_action = 'edit' THEN
    IF p_display_name IS NULL OR length(trim(p_display_name)) = 0 THEN
      RAISE EXCEPTION 'display_name required when action=edit';
    END IF;
    v_new_name := trim(p_display_name);
    v_new_source := 'operator_configured';
    v_new_confirmed := true;
    v_new_confirmed_at := now();
  ELSE  -- clear
    v_new_name := NULL;
    v_new_source := 'unknown';
    v_new_confirmed := false;
    v_new_confirmed_at := NULL;
  END IF;

  UPDATE public.communication_hub_recipient_policy
  SET single_configured_display_name = v_new_name,
      single_configured_display_name_source = v_new_source,
      single_configured_display_name_confirmed = v_new_confirmed,
      single_configured_display_name_confirmed_at = v_new_confirmed_at,
      single_configured_display_name_confirmed_by = CASE WHEN v_new_confirmed THEN v_uid ELSE NULL END,
      configuration_version = configuration_version + 1,
      change_reason = p_reason,
      changed_by = v_uid,
      changed_at = now(),
      updated_at = now()
  WHERE singleton_guard = 'primary';

  -- Audit row per changed field
  IF COALESCE(v_old_name,'') IS DISTINCT FROM COALESCE(v_new_name,'') THEN
    INSERT INTO public.communication_hub_recipient_policy_audit(
      policy_id, changed_field, old_value, new_value, reason, changed_by,
      policy_version, configuration_version
    ) VALUES (
      v_policy.id, 'single_configured_display_name',
      to_jsonb(v_old_name), to_jsonb(v_new_name),
      p_reason, v_uid,
      v_policy.policy_version, v_policy.configuration_version + 1
    );
  END IF;
  IF v_old_source IS DISTINCT FROM v_new_source THEN
    INSERT INTO public.communication_hub_recipient_policy_audit(
      policy_id, changed_field, old_value, new_value, reason, changed_by,
      policy_version, configuration_version
    ) VALUES (
      v_policy.id, 'single_configured_display_name_source',
      to_jsonb(v_old_source), to_jsonb(v_new_source),
      p_reason, v_uid,
      v_policy.policy_version, v_policy.configuration_version + 1
    );
  END IF;
  IF v_old_confirmed IS DISTINCT FROM v_new_confirmed THEN
    INSERT INTO public.communication_hub_recipient_policy_audit(
      policy_id, changed_field, old_value, new_value, reason, changed_by,
      policy_version, configuration_version
    ) VALUES (
      v_policy.id, 'single_configured_display_name_confirmed',
      to_jsonb(v_old_confirmed), to_jsonb(v_new_confirmed),
      p_reason, v_uid,
      v_policy.policy_version, v_policy.configuration_version + 1
    );
  END IF;

  RETURN jsonb_build_object(
    'display_name', v_new_name,
    'source', v_new_source,
    'confirmed', v_new_confirmed,
    'confirmed_at', v_new_confirmed_at,
    'confirmed_by', CASE WHEN v_new_confirmed THEN v_uid ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_recipient_test_identity(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_recipient_test_identity(text, text, text) TO authenticated;
