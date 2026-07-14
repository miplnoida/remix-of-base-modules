
-- BN-MENU-S1: Expose Award Suspension as read-only in the Benefits left menu.
-- Idempotent. Preserves existing operational grants; only extends `view`.

DO $mig$
DECLARE
  bn_root_id uuid;
  servicing_id uuid;
  susp_id uuid;
  view_action_id uuid;
BEGIN
  -- A. Resolve canonical Benefit Management root
  SELECT id INTO bn_root_id
    FROM public.app_modules
   WHERE name = 'benefits_management' AND parent_id IS NULL;

  IF bn_root_id IS NULL THEN
    RAISE EXCEPTION 'BN-MENU-S1: canonical Benefit Management root (benefits_management) not found';
  END IF;

  -- B. Create/update the servicing group
  INSERT INTO public.app_modules
    (name, display_name, icon, route, parent_id, sort_order,
     is_enabled, show_in_menu, routes_enabled, actions_enabled)
  VALUES
    ('bn_servicing','Benefit Servicing','HeartHandshake', NULL, bn_root_id, 25,
     true, true, true, false)
  ON CONFLICT (name) DO UPDATE
    SET display_name  = EXCLUDED.display_name,
        icon          = EXCLUDED.icon,
        route         = EXCLUDED.route,
        parent_id     = EXCLUDED.parent_id,
        sort_order    = EXCLUDED.sort_order,
        is_enabled    = true,
        show_in_menu  = true,
        routes_enabled= true;

  SELECT id INTO servicing_id FROM public.app_modules WHERE name='bn_servicing';

  -- C. Update Award Suspension module (do NOT create duplicate)
  UPDATE public.app_modules
     SET display_name    = 'Award Suspension',
         route           = '/bn/award-suspension',
         icon            = 'PauseCircle',
         parent_id       = servicing_id,
         sort_order      = 40,
         is_enabled      = true,
         show_in_menu    = true,
         routes_enabled  = true,
         actions_enabled = false   -- DARK LAUNCH: mutations remain disabled
   WHERE name = 'bn_award_suspension';

  SELECT id INTO susp_id FROM public.app_modules WHERE name='bn_award_suspension';
  IF susp_id IS NULL THEN
    RAISE EXCEPTION 'BN-MENU-S1: bn_award_suspension module missing (expected from BN-SEC-S1B)';
  END IF;

  -- Ensure `view` action exists (should already)
  SELECT id INTO view_action_id
    FROM public.module_actions
   WHERE module_id = susp_id AND action_name = 'view';
  IF view_action_id IS NULL THEN
    INSERT INTO public.module_actions (module_id, action_name, is_enabled)
    VALUES (susp_id, 'view', true)
    RETURNING id INTO view_action_id;
  END IF;

  -- 3. Inherit ONLY `view` from every role that has view on the Benefits root.
  INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
  SELECT rp_root.role_id, susp_id, view_action_id, true
    FROM public.role_permissions rp_root
    JOIN public.module_actions ma_root
      ON ma_root.id = rp_root.action_id
     AND ma_root.module_id = bn_root_id
     AND ma_root.action_name = 'view'
   WHERE rp_root.module_id = bn_root_id
     AND rp_root.is_granted = true
     AND NOT EXISTS (
       SELECT 1 FROM public.role_permissions rp2
        WHERE rp2.role_id  = rp_root.role_id
          AND rp2.module_id = susp_id
          AND rp2.action_id = view_action_id
     );

  -- Ensure any pre-existing view grants stay granted
  UPDATE public.role_permissions
     SET is_granted = true
   WHERE module_id = susp_id AND action_id = view_action_id AND is_granted = false;
END
$mig$;
