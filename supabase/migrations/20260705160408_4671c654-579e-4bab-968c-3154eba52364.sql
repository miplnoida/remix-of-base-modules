
DO $$
DECLARE
  v_parent_id uuid := 'e1a00000-0000-4000-8000-000000000003';
  v_module_id uuid;
  v_action_view uuid;
  v_action_manage uuid;
  v_role_admin uuid;
  v_role_app_admin uuid;
  a RECORD;
BEGIN
  SELECT id INTO v_module_id FROM public.app_modules WHERE name = 'admin_reference_framework';

  IF v_module_id IS NULL THEN
    INSERT INTO public.app_modules
      (name, display_name, description, icon, route, parent_id,
       sort_order, is_enabled, show_in_menu, rollout_state, routes_enabled, actions_enabled)
    VALUES
      ('admin_reference_framework',
       'Reference Framework',
       'Enterprise reference data governance console.',
       'Database',
       '/admin/reference-framework',
       v_parent_id,
       0, TRUE, TRUE, 'public', TRUE, TRUE)
    RETURNING id INTO v_module_id;
  ELSE
    UPDATE public.app_modules
       SET route='/admin/reference-framework',
           parent_id=COALESCE(parent_id, v_parent_id),
           display_name='Reference Framework',
           is_enabled=TRUE, show_in_menu=TRUE
     WHERE id=v_module_id;
  END IF;

  FOR a IN SELECT * FROM (VALUES
      ('view','View'),
      ('manage','Manage (CRUD categories, groups, values, aliases, codes, translations)'),
      ('approve','Approve version / promotion'),
      ('retire','Retire / supersede reference values'),
      ('import','Bulk import reference data'),
      ('export','Export reference data')
    ) AS t(action_name, display_name)
  LOOP
    INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
    SELECT v_module_id, a.action_name, a.display_name, TRUE
     WHERE NOT EXISTS (SELECT 1 FROM public.module_actions
                        WHERE module_id=v_module_id AND action_name=a.action_name);
  END LOOP;

  SELECT id INTO v_action_view   FROM public.module_actions WHERE module_id=v_module_id AND action_name='view';
  SELECT id INTO v_action_manage FROM public.module_actions WHERE module_id=v_module_id AND action_name='manage';

  SELECT id INTO v_role_admin     FROM public.roles WHERE role_name='Admin';
  SELECT id INTO v_role_app_admin FROM public.roles WHERE role_name='Application Admin';

  IF v_role_admin IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
    SELECT v_role_admin, v_module_id, v_action_view, TRUE
     WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role_id=v_role_admin AND module_id=v_module_id AND action_id=v_action_view);
    INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
    SELECT v_role_admin, v_module_id, v_action_manage, TRUE
     WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role_id=v_role_admin AND module_id=v_module_id AND action_id=v_action_manage);
  END IF;

  IF v_role_app_admin IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
    SELECT v_role_app_admin, v_module_id, v_action_view, TRUE
     WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role_id=v_role_app_admin AND module_id=v_module_id AND action_id=v_action_view);
    INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
    SELECT v_role_app_admin, v_module_id, v_action_manage, TRUE
     WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role_id=v_role_app_admin AND module_id=v_module_id AND action_id=v_action_manage);
  END IF;
END $$;
