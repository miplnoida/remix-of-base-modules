
-- Part A: shared automation settings table
CREATE TABLE IF NOT EXISTS public.communication_hub_module_automation_setting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL,
  setting_key text NOT NULL,
  setting_value text NOT NULL,
  environment_scope text NOT NULL DEFAULT 'production',
  is_enabled boolean NOT NULL DEFAULT true,
  allowed_values text[] NOT NULL,
  description text,
  risk_level text NOT NULL DEFAULT 'medium',
  requires_approval boolean NOT NULL DEFAULT true,
  approved_by uuid,
  approved_at timestamptz,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_mas UNIQUE (module_code, setting_key, environment_scope)
);

GRANT SELECT ON public.communication_hub_module_automation_setting TO authenticated;
GRANT ALL ON public.communication_hub_module_automation_setting TO service_role;

ALTER TABLE public.communication_hub_module_automation_setting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read automation settings"
  ON public.communication_hub_module_automation_setting
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "service role manage automation settings"
  ON public.communication_hub_module_automation_setting
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed Legal assignment automation setting
INSERT INTO public.communication_hub_module_automation_setting
  (module_code, setting_key, setting_value, environment_scope, allowed_values, description, risk_level, requires_approval)
VALUES
  ('LEGAL',
   'legal_auto_send_internal_assignment_notice',
   'prepare_only',
   'production',
   ARRAY['disabled','prepare_only','auto_live_internal'],
   'Controls automatic Communication Hub notice on Legal case assignment/reassignment.',
   'medium',
   true)
ON CONFLICT (module_code, setting_key, environment_scope) DO NOTHING;

-- Part B: RPCs
CREATE OR REPLACE FUNCTION public.get_comm_hub_module_automation_setting(
  p_module_code text,
  p_setting_key text,
  p_environment_scope text DEFAULT 'production'
)
RETURNS public.communication_hub_module_automation_setting
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.communication_hub_module_automation_setting
  WHERE module_code = p_module_code
    AND setting_key = p_setting_key
    AND environment_scope = COALESCE(p_environment_scope, 'production')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_comm_hub_module_automation_setting(text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_comm_hub_module_automation_setting(
  p_module_code text,
  p_setting_key text,
  p_setting_value text,
  p_reason text,
  p_typed_confirmation text,
  p_actor_user_id uuid,
  p_environment_scope text DEFAULT 'production'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.communication_hub_module_automation_setting;
  v_old_value text;
  v_expected_confirmation text;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reason_required');
  END IF;

  SELECT * INTO v_row
  FROM public.communication_hub_module_automation_setting
  WHERE module_code = p_module_code
    AND setting_key = p_setting_key
    AND environment_scope = COALESCE(p_environment_scope, 'production')
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'setting_not_found');
  END IF;

  IF NOT (p_setting_value = ANY(v_row.allowed_values)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'value_not_allowed', 'allowed_values', v_row.allowed_values);
  END IF;

  IF p_setting_value = 'auto_live_internal' THEN
    v_expected_confirmation := 'ENABLE AUTO LIVE INTERNAL ' || upper(replace(p_module_code,'_',' ')) || ' ASSIGNMENT NOTICE';
    IF p_typed_confirmation IS DISTINCT FROM v_expected_confirmation THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'typed_confirmation_required',
        'expected', v_expected_confirmation
      );
    END IF;
  END IF;

  v_old_value := v_row.setting_value;

  UPDATE public.communication_hub_module_automation_setting
     SET setting_value = p_setting_value,
         updated_by    = p_actor_user_id,
         updated_at    = now(),
         approved_by   = CASE WHEN p_setting_value = 'auto_live_internal' THEN p_actor_user_id ELSE approved_by END,
         approved_at   = CASE WHEN p_setting_value = 'auto_live_internal' THEN now() ELSE approved_at END
   WHERE id = v_row.id
   RETURNING * INTO v_row;

  INSERT INTO public.communication_hub_control_audit
    (setting_key, old_value, new_value, reason, changed_by, source)
  VALUES
    (p_module_code || '.' || p_setting_key,
     jsonb_build_object('value', v_old_value, 'environment', p_environment_scope),
     jsonb_build_object('value', p_setting_value, 'environment', p_environment_scope, 'typed_confirmation_provided', p_setting_value = 'auto_live_internal'),
     p_reason,
     p_actor_user_id,
     'communication-hub-automation-settings');

  RETURN jsonb_build_object('ok', true, 'setting', to_jsonb(v_row));
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_comm_hub_module_automation_setting(text, text, text, text, text, uuid, text) TO authenticated, service_role;

-- Part F: secure officer resolution RPC
CREATE OR REPLACE FUNCTION public.resolve_legal_officer_for_notice(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_code text;
  v_name text;
  v_email text;
  v_eligible boolean;
  v_reason text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('user_id', null, 'eligible_for_internal_pilot', false, 'fallback_reason', 'no_user_id');
  END IF;

  SELECT id, user_code, full_name, lower(trim(email))
    INTO v_id, v_code, v_name, v_email
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('user_id', p_user_id, 'eligible_for_internal_pilot', false, 'fallback_reason', 'profile_not_found');
  END IF;

  v_eligible := (v_email IS NOT NULL AND v_email LIKE '%@mishainfotech.com');
  v_reason := CASE
                WHEN v_email IS NULL THEN 'email_missing'
                WHEN NOT v_eligible THEN 'email_not_internal'
                ELSE NULL
              END;

  RETURN jsonb_build_object(
    'user_id', v_id,
    'user_code', v_code,
    'full_name', v_name,
    'email', v_email,
    'eligible_for_internal_pilot', v_eligible,
    'fallback_reason', v_reason
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_legal_officer_for_notice(uuid) TO authenticated, service_role;
