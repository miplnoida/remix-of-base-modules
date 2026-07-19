
CREATE TABLE IF NOT EXISTS public.bn_gap_command_log (
  command_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_name text NOT NULL,
  command_version integer NOT NULL,
  module_code text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  correlation_id uuid NOT NULL,
  causation_id uuid,
  actor_user_id uuid NOT NULL,
  actor_user_code text NOT NULL,
  reason_code text,
  justification text,
  outcome text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  requested_at timestamptz NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bn_gap_command_log TO authenticated;
GRANT ALL ON public.bn_gap_command_log TO service_role;
CREATE INDEX IF NOT EXISTS ix_bn_gap_command_log_correlation ON public.bn_gap_command_log(correlation_id);
CREATE INDEX IF NOT EXISTS ix_bn_gap_command_log_module ON public.bn_gap_command_log(module_code, entered_at DESC);
CREATE INDEX IF NOT EXISTS ix_bn_gap_command_log_entity ON public.bn_gap_command_log(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.bn_gap_idempotency (
  idempotency_key uuid PRIMARY KEY,
  command_name text NOT NULL,
  correlation_id uuid NOT NULL,
  result_json jsonb NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bn_gap_idempotency TO authenticated;
GRANT ALL ON public.bn_gap_idempotency TO service_role;

CREATE OR REPLACE FUNCTION public.bn_actor_has_capability(
  p_user_id uuid,
  p_capability text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module text;
  v_verb   text;
  v_ok     boolean;
BEGIN
  IF p_capability IS NULL OR position(':' in p_capability) = 0 THEN
    RETURN false;
  END IF;
  v_module := split_part(p_capability, ':', 1);
  v_verb   := split_part(p_capability, ':', 2);

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r
      ON r.role_name = ur.role::text
    JOIN public.role_permissions rp
      ON rp.role_id = r.id
     AND COALESCE(rp.is_granted, false) = true
    JOIN public.app_modules am
      ON am.id = rp.module_id
     AND am.name = v_module
    JOIN public.module_actions ma
      ON ma.id = rp.action_id
     AND ma.action_name = v_verb
    WHERE ur.user_id = p_user_id
  ) INTO v_ok;

  RETURN COALESCE(v_ok, false);
END;
$$;
GRANT EXECUTE ON FUNCTION public.bn_actor_has_capability(uuid, text) TO authenticated, service_role;

INSERT INTO public.app_modules (name, display_name, description, route, is_enabled, routes_enabled, actions_enabled, show_in_menu, rollout_state, sort_order)
VALUES
  ('bn_mortality',       'Death & Mortality Processing', 'Death notifications, verification, award closure.', '/bn/mortality',    true, true, false, false, 'internal_pilot', 900),
  ('bn_overpayments',    'Overpayment Recovery',         'Detection, calculation, notification, arrangement.','/bn/overpayments', true, true, false, false, 'internal_pilot', 901),
  ('bn_appeals',         'Appeals & Disputes',           'Intake, panel scheduling, hearing outcome, remedy.','/bn/appeals',      true, true, false, false, 'internal_pilot', 902),
  ('bn_means_tests',     'Means-Test Assessment',        'Household composition, income evidence, scoring.',  '/bn/means-tests',  true, true, false, false, 'internal_pilot', 903),
  ('bn_risk_management', 'Fraud, Error & Risk',          'Risk indicators, investigation, referral, remedy.', '/bn/risk',         true, true, false, false, 'internal_pilot', 904),
  ('bn_uprating',        'Uprating & Indexation',        'Rate table uplifts, effective-date scheduling.',    '/bn/uprating',     true, true, false, false, 'internal_pilot', 905)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT am.id, v.verb, initcap(v.verb), true
FROM public.app_modules am
CROSS JOIN (VALUES ('read'), ('write'), ('decide'), ('admin')) AS v(verb)
WHERE am.name IN ('bn_mortality','bn_overpayments','bn_appeals','bn_means_tests','bn_risk_management','bn_uprating')
  AND NOT EXISTS (
    SELECT 1 FROM public.module_actions ma
    WHERE ma.module_id = am.id AND ma.action_name = v.verb
  );
