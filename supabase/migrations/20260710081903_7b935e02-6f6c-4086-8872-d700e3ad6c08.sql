
DO $$
DECLARE
  v_admin_role_id uuid := 'bdec06a6-cfbd-4c4e-a2be-11d6b638b948';
  v_parent_id uuid := 'e1a00000-0000-4000-8000-000000000005';
  v_root_id uuid := 'c0110000-0000-4000-8000-000000000001';
  rec RECORD;
  v_mod_id uuid;
  v_act_id uuid;
BEGIN
  INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, show_in_menu, description)
  VALUES (v_root_id, 'communication_hub', 'Communication Hub', 'Radio', NULL, v_parent_id, 50, true, true,
          'Centralized communication management: templates, dispatch monitoring, delivery tracking, retry queue, live governance and audit.')
  ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name, icon=EXCLUDED.icon, parent_id=EXCLUDED.parent_id,
        is_enabled=true, show_in_menu=true, description=EXCLUDED.description;

  FOR rec IN
    SELECT * FROM (VALUES
      ('c0110000-0000-4000-8000-000000000010'::uuid, 'communication_hub_overview',           'Overview',              'LayoutDashboard', '/admin/communication-hub', 10),
      ('c0110000-0000-4000-8000-000000000020'::uuid, 'communication_hub_control_center',     'Control Center',        'ShieldCheck',     '/admin/communication-hub/control-center', 20),
      ('c0110000-0000-4000-8000-000000000030'::uuid, 'communication_hub_requests',           'Communication Requests','ListTodo',        '/admin/communication-hub/requests', 30),
      ('c0110000-0000-4000-8000-000000000040'::uuid, 'communication_hub_delivery_monitor',   'Delivery Monitor',      'Activity',        '/admin/communication-hub/delivery-monitor', 40),
      ('c0110000-0000-4000-8000-000000000050'::uuid, 'communication_hub_dispatch_register',  'Dispatch Register',     'ScrollText',      '/admin/communication-hub/dispatch-register', 50),
      ('c0110000-0000-4000-8000-000000000060'::uuid, 'communication_hub_lifecycle_log',      'Lifecycle Event Log',   'History',         '/admin/communication-hub/lifecycle-log', 60),
      ('c0110000-0000-4000-8000-000000000070'::uuid, 'communication_hub_retry_queue',        'Failed & Retry Queue',  'RefreshCw',       '/admin/communication-hub/retry-queue', 70),
      ('c0110000-0000-4000-8000-000000000080'::uuid, 'communication_hub_print_queue',        'Print Queue',           'Printer',         '/admin/communication-hub/print-queue', 80)
    ) AS t(id, name, display_name, icon, route, sort_order)
  LOOP
    INSERT INTO public.app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
    VALUES (rec.id, rec.name, rec.display_name, rec.icon, rec.route, v_root_id, rec.sort_order, true, true)
    ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name, icon=EXCLUDED.icon, route=EXCLUDED.route,
          parent_id=v_root_id, sort_order=EXCLUDED.sort_order, is_enabled=true, show_in_menu=true;
  END LOOP;

  FOR v_mod_id IN
    SELECT am.id FROM public.app_modules am
    WHERE am.id = v_root_id OR am.parent_id = v_root_id
  LOOP
    SELECT ma.id INTO v_act_id FROM public.module_actions ma
      WHERE ma.module_id = v_mod_id AND ma.action_name = 'view' LIMIT 1;
    IF v_act_id IS NULL THEN
      INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
      VALUES (v_mod_id, 'view', 'View', true)
      RETURNING id INTO v_act_id;
    END IF;

    INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
    VALUES (v_admin_role_id, v_mod_id, v_act_id, true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
