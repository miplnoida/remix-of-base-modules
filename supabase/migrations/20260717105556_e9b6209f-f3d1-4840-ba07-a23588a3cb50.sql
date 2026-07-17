DO $$
DECLARE
  v_module_id uuid;
  v_action_id uuid;
  v_role record;
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_module_id FROM public.app_modules WHERE name = 'bn_awards_list';
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'Canonical module bn_awards_list is missing from public.app_modules — cannot register view action';
  END IF;

  -- Idempotent upsert of the canonical view action.
  INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
  VALUES (v_module_id, 'view', 'View', true)
  ON CONFLICT (module_id, action_name)
  DO UPDATE SET display_name = EXCLUDED.display_name, is_enabled = true
  RETURNING id INTO v_action_id;

  IF v_action_id IS NULL THEN
    SELECT id INTO v_action_id FROM public.module_actions
      WHERE module_id = v_module_id AND action_name = 'view';
  END IF;

  -- Idempotently grant view to roles that already have any create/edit/delete
  -- grant on bn_awards_list. Do NOT grant to unrelated roles.
  FOR v_role IN
    SELECT DISTINCT rp.role_id
    FROM public.role_permissions rp
    JOIN public.module_actions ma ON ma.id = rp.action_id
    WHERE ma.module_id = v_module_id
      AND ma.action_name IN ('create', 'edit', 'delete')
      AND rp.is_granted = true
  LOOP
    INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
    VALUES (v_role.role_id, v_module_id, v_action_id, true)
    ON CONFLICT (role_id, module_id, action_id) DO NOTHING;
  END LOOP;

  -- Ensure the Admin role (system role) always retains the grant. The
  -- auto_grant_admin_permission trigger normally handles this on INSERT; the
  -- ON CONFLICT DO UPDATE path above may skip it, so make it explicit.
  SELECT id INTO v_admin_id FROM public.roles WHERE role_name = 'Admin';
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
    VALUES (v_admin_id, v_module_id, v_action_id, true)
    ON CONFLICT (role_id, module_id, action_id) DO NOTHING;
  END IF;
END $$;