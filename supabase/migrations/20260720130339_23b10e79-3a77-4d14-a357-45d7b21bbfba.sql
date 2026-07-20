-- BN-MORT-RBAC-1A — Reuse existing Benefits roles for Mortality view.
-- Additive + idempotent. Fails clearly if module/action/roles are missing.
-- Preserves any pre-existing is_granted=false row (never converts deny → allow).
DO $$
DECLARE
  v_module_id uuid;
  v_view_action_id uuid;
  v_role text;
  v_role_id uuid;
  v_existing record;
  v_inserted text[] := ARRAY[]::text[];
  v_already   text[] := ARRAY[]::text[];
  v_denies    text[] := ARRAY[]::text[];
  v_roles constant text[] := ARRAY[
    'BN_INTAKE_OFFICER',
    'BN_DOCUMENT_OFFICER',
    'BN_BENEFIT_OFFICER_GENERALIST',
    'BN_SUPERVISOR',
    'BN_MANAGER',
    'BN_FINANCE_SUPERVISOR'
  ];
BEGIN
  SELECT id INTO v_module_id FROM public.app_modules WHERE name = 'bn_mortality';
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'bn_mortality module missing';
  END IF;

  SELECT id INTO v_view_action_id
    FROM public.module_actions
   WHERE module_id = v_module_id AND action_name = 'view';
  IF v_view_action_id IS NULL THEN
    RAISE EXCEPTION 'bn_mortality canonical view action missing';
  END IF;

  FOREACH v_role IN ARRAY v_roles LOOP
    SELECT id INTO v_role_id FROM public.roles WHERE role_name = v_role;
    IF v_role_id IS NULL THEN
      RAISE EXCEPTION 'Required role % missing from public.roles', v_role;
    END IF;

    SELECT is_granted INTO v_existing
      FROM public.role_permissions
     WHERE role_id = v_role_id AND action_id = v_view_action_id
     LIMIT 1;

    IF NOT FOUND THEN
      INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
      VALUES (v_role_id, v_module_id, v_view_action_id, true);
      v_inserted := v_inserted || v_role;
    ELSIF v_existing.is_granted IS DISTINCT FROM true THEN
      -- explicit deny — preserve, never convert
      v_denies := v_denies || v_role;
    ELSE
      v_already := v_already || v_role;
    END IF;
  END LOOP;

  RAISE NOTICE 'BN-MORT-RBAC-1A: inserted=% already=% denies_preserved=%',
    COALESCE(array_to_string(v_inserted, ', '), '(none)'),
    COALESCE(array_to_string(v_already,  ', '), '(none)'),
    COALESCE(array_to_string(v_denies,   ', '), '(none)');
END $$;