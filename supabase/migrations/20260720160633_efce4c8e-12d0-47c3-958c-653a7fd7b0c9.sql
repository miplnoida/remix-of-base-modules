
-- Parent
UPDATE public.app_modules SET display_name='Appeals & Disputes', route=NULL, show_in_menu=TRUE, is_enabled=TRUE, routes_enabled=TRUE, actions_enabled=FALSE, rollout_state='internal_pilot', updated_at=NOW() WHERE name='bn_appeals';

-- Rename Case Preparation -> My Appeals Workbasket
UPDATE public.app_modules SET name='bn_appeals_my_work', display_name='My Appeals Workbasket', description='Officer-scoped workbasket for open appeals, evidence, hearings, recommendations, and decisions assigned to the current user.', route='/bn/appeals/my-work', icon='BriefcaseBusiness', rollout_state='internal_pilot', actions_enabled=FALSE, routes_enabled=TRUE, is_enabled=TRUE, show_in_menu=TRUE, sort_order=30, updated_at=NOW() WHERE name='bn_appeals_preparation';

-- Normalise remaining children
UPDATE public.app_modules SET display_name='Appeals Dashboard', rollout_state='internal_pilot', actions_enabled=FALSE, routes_enabled=TRUE, is_enabled=TRUE, show_in_menu=TRUE, updated_at=NOW() WHERE name='bn_appeals_dashboard';
UPDATE public.app_modules SET display_name='Register Received Appeal', rollout_state='internal_pilot', actions_enabled=FALSE, routes_enabled=TRUE, is_enabled=TRUE, show_in_menu=TRUE, updated_at=NOW() WHERE name='bn_appeals_register';
UPDATE public.app_modules SET display_name='Hearings & Scheduling', rollout_state='internal_pilot', actions_enabled=FALSE, routes_enabled=TRUE, is_enabled=TRUE, show_in_menu=TRUE, updated_at=NOW() WHERE name='bn_appeals_hearings';
UPDATE public.app_modules SET display_name='Decision Implementation', rollout_state='internal_pilot', actions_enabled=FALSE, routes_enabled=TRUE, is_enabled=TRUE, show_in_menu=TRUE, updated_at=NOW() WHERE name='bn_appeals_implementation';
UPDATE public.app_modules SET show_in_menu=FALSE, rollout_state='internal_pilot', actions_enabled=FALSE, routes_enabled=TRUE, is_enabled=TRUE, display_name='Appeal 360', updated_at=NOW() WHERE name='bn_appeals_detail';

-- Also correct any route that pointed at /bn/appeals/:id -> /bn/appeals/:appealId to match router
UPDATE public.app_modules SET route='/bn/appeals/:appealId', updated_at=NOW() WHERE name='bn_appeals_detail';

-- New Appeals Configuration child (idempotent)
INSERT INTO public.app_modules (name, display_name, description, route, icon, parent_id, show_in_menu, is_enabled, routes_enabled, actions_enabled, rollout_state, sort_order)
SELECT 'bn_appeals_config', 'Appeals Configuration',
       'Read-only view of Appeals configuration: types, grounds, remedies, filing/hearing policies, workflow mapping, communication templates, integration readiness.',
       '/bn/appeals/config', 'Settings2', p.id, TRUE, TRUE, TRUE, FALSE, 'internal_pilot', 70
FROM public.app_modules p
WHERE p.name = 'bn_appeals'
  AND NOT EXISTS (SELECT 1 FROM public.app_modules WHERE name = 'bn_appeals_config');

-- Ensure a 'view' module_action exists for each child + detail
INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'view', 'View', 'Access the module UI', TRUE
FROM public.app_modules m
WHERE m.name IN ('bn_appeals_my_work','bn_appeals_config','bn_appeals_hearings','bn_appeals_implementation','bn_appeals_dashboard','bn_appeals_register','bn_appeals_detail')
  AND NOT EXISTS (SELECT 1 FROM public.module_actions x WHERE x.module_id = m.id AND x.action_name = 'view');

-- Inherit view grants from bn_appeals -> every child (idempotent)
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT rp.role_id, child.id, ca.id, TRUE
FROM public.role_permissions rp
JOIN public.app_modules parent ON parent.id = rp.module_id AND parent.name = 'bn_appeals'
JOIN public.module_actions pa  ON pa.id = rp.action_id AND pa.action_name = 'view'
JOIN public.app_modules child  ON child.parent_id = parent.id
 AND child.name IN ('bn_appeals_dashboard','bn_appeals_register','bn_appeals_my_work','bn_appeals_hearings','bn_appeals_implementation','bn_appeals_config','bn_appeals_detail')
JOIN public.module_actions ca  ON ca.module_id = child.id AND ca.action_name = 'view'
WHERE rp.is_granted = TRUE
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;
