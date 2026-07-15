-- BN-AWARD360-2.1H: Register bn_survivors.view, preserve dark-launch rollout,
-- and grant Survivors view to roles that already view the Award list.
-- Idempotent and additive. Does not touch other action registrations.

DO $$
DECLARE
  v_survivors_module_id uuid;
  v_awards_list_module_id uuid;
  v_view_action_id uuid;
  v_awards_view_action_id uuid;
  v_grants_created int := 0;
BEGIN
  SELECT id INTO v_survivors_module_id FROM public.app_modules WHERE name = 'bn_survivors';
  SELECT id INTO v_awards_list_module_id FROM public.app_modules WHERE name = 'bn_awards_list';

  IF v_survivors_module_id IS NULL THEN
    RAISE EXCEPTION 'BN-AWARD360-2.1H: bn_survivors module is not registered — cannot register bn_survivors.view';
  END IF;

  -- Preserve rollout: is_enabled=true, routes_enabled=true, actions_enabled=false.
  -- Do not change show_in_menu — respect the existing Benefits menu design.
  UPDATE public.app_modules
     SET is_enabled = true,
         routes_enabled = true,
         actions_enabled = false
   WHERE id = v_survivors_module_id
     AND (is_enabled IS DISTINCT FROM true
          OR routes_enabled IS DISTINCT FROM true
          OR actions_enabled IS DISTINCT FROM false);

  -- Register the view action (idempotent).
  INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
  VALUES (
    v_survivors_module_id,
    'view',
    'View',
    'View Survivors Processing records and workspace',
    true
  )
  ON CONFLICT (module_id, action_name) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        description  = EXCLUDED.description,
        is_enabled   = true;

  SELECT id INTO v_view_action_id
    FROM public.module_actions
   WHERE module_id = v_survivors_module_id AND action_name = 'view';

  -- Grant bn_survivors.view to every role that currently has bn_awards_list.view.
  IF v_awards_list_module_id IS NOT NULL THEN
    SELECT id INTO v_awards_view_action_id
      FROM public.module_actions
     WHERE module_id = v_awards_list_module_id AND action_name = 'view';

    IF v_awards_view_action_id IS NOT NULL THEN
      WITH inserted AS (
        INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
        SELECT rp.role_id, v_survivors_module_id, v_view_action_id, true
          FROM public.role_permissions rp
         WHERE rp.module_id = v_awards_list_module_id
           AND rp.action_id = v_awards_view_action_id
           AND rp.is_granted = true
        ON CONFLICT (role_id, module_id, action_id) DO NOTHING
        RETURNING 1
      )
      SELECT COUNT(*) INTO v_grants_created FROM inserted;
    END IF;
  END IF;

  RAISE NOTICE 'BN-AWARD360-2.1H: bn_survivors.view registered; % new role grant(s) created', v_grants_created;
END $$;