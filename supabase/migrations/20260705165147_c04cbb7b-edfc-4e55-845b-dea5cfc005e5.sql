DO $$
DECLARE
  v_module_id uuid;
  v_action_id uuid;
  r RECORD;
  a RECORD;
BEGIN
  SELECT id INTO v_module_id FROM public.app_modules WHERE name = 'organization_management';

  IF v_module_id IS NULL THEN
    RAISE NOTICE 'organization_management module not found — skipping activation';
    RETURN;
  END IF;

  -- Ensure standard action vocabulary exists on the module
  FOR a IN SELECT * FROM (VALUES
      ('view',   'View Organisation Foundation'),
      ('manage', 'Manage Organisation Foundation (profile, branches, departments, designations, calendars, branding, settings)'),
      ('admin',  'Administer Organisation Foundation (governance, ownership, lifecycle)')
    ) AS t(action_name, display_name)
  LOOP
    INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
    SELECT v_module_id, a.action_name, a.display_name, TRUE
     WHERE NOT EXISTS (
       SELECT 1 FROM public.module_actions
        WHERE module_id = v_module_id AND action_name = a.action_name
     );
  END LOOP;

  -- Grant view/manage/admin to Admin, Application Admin, Super Admin (when present)
  FOR r IN
    SELECT id AS role_id, role_name
      FROM public.roles
     WHERE role_name IN ('Admin','Application Admin','Super Admin')
  LOOP
    FOR a IN SELECT action_name FROM (VALUES ('view'),('manage'),('admin')) AS t(action_name)
    LOOP
      SELECT id INTO v_action_id
        FROM public.module_actions
       WHERE module_id = v_module_id AND action_name = a.action_name;

      IF v_action_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
        SELECT r.role_id, v_module_id, v_action_id, TRUE
         WHERE NOT EXISTS (
           SELECT 1 FROM public.role_permissions
            WHERE role_id = r.role_id
              AND module_id = v_module_id
              AND action_id = v_action_id
         );
      END IF;
    END LOOP;
  END LOOP;
END $$;