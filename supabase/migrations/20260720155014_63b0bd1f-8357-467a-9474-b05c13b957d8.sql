
BEGIN;

-- 1. Container conversion
UPDATE public.app_modules
   SET route = NULL, updated_at = now()
 WHERE id = '079b69ea-befe-4a7f-86b2-8d8a1d403e58'
   AND name = 'bn_appeals';

-- 2. Insert six children
INSERT INTO public.app_modules
  (name, display_name, description, icon, route, parent_id, sort_order,
   show_in_menu, actions_enabled, routes_enabled, rollout_state)
VALUES
  ('bn_appeals_dashboard',      'Appeals Dashboard',
     'Programme-wide operational KPIs and worklist entry-point.',
     'LayoutDashboard', '/bn/appeals',
     '079b69ea-befe-4a7f-86b2-8d8a1d403e58', 10, true,  false, true, 'public'),
  ('bn_appeals_register',       'Register Received Appeal',
     'Staff-assisted intake for appeals filed via walk-in, post, email, phone or representative.',
     'FilePlus', '/bn/appeals/new',
     '079b69ea-befe-4a7f-86b2-8d8a1d403e58', 20, true,  false, true, 'public'),
  ('bn_appeals_preparation',    'Case Preparation Queue',
     'Admissible appeals awaiting case preparation and hearing scheduling.',
     'ClipboardCheck', '/bn/appeals/preparation',
     '079b69ea-befe-4a7f-86b2-8d8a1d403e58', 30, true,  false, true, 'public'),
  ('bn_appeals_hearings',       'Hearings Queue',
     'Scheduled and pending hearings across the appeals docket.',
     'Gavel', '/bn/appeals/hearings',
     '079b69ea-befe-4a7f-86b2-8d8a1d403e58', 40, true,  false, true, 'public'),
  ('bn_appeals_implementation', 'Implementation Queue',
     'Decided appeals awaiting downstream implementation.',
     'CheckSquare', '/bn/appeals/implementation',
     '079b69ea-befe-4a7f-86b2-8d8a1d403e58', 50, true,  false, true, 'public'),
  ('bn_appeals_detail',         'Appeal 360',
     'Per-appeal 360 workspace (URL-parameterised, hidden from menu).',
     'Search', '/bn/appeals/:id',
     '079b69ea-befe-4a7f-86b2-8d8a1d403e58', 60, false, false, true, 'public')
ON CONFLICT (name) DO UPDATE
   SET display_name    = EXCLUDED.display_name,
       description     = EXCLUDED.description,
       icon            = EXCLUDED.icon,
       route           = EXCLUDED.route,
       parent_id       = EXCLUDED.parent_id,
       sort_order      = EXCLUDED.sort_order,
       show_in_menu    = EXCLUDED.show_in_menu,
       actions_enabled = EXCLUDED.actions_enabled,
       routes_enabled  = EXCLUDED.routes_enabled,
       updated_at      = now();

-- 3. Seed action catalogue for each child
INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT m.id, a.action_name, a.display_name, true
  FROM public.app_modules m
  CROSS JOIN (VALUES
    ('view',  'View'),
    ('read',  'Read'),
    ('write', 'Write'),
    ('admin', 'Admin')
  ) AS a(action_name, display_name)
 WHERE m.name IN (
    'bn_appeals_dashboard','bn_appeals_register','bn_appeals_preparation',
    'bn_appeals_hearings','bn_appeals_implementation','bn_appeals_detail'
 )
   AND NOT EXISTS (
     SELECT 1 FROM public.module_actions ma2
      WHERE ma2.module_id = m.id AND ma2.action_name = a.action_name
   );

-- 4. Inherit view/read grants from parent bn_appeals to every child
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT parent_rp.role_id,
       child.id,
       child_action.id,
       true
  FROM public.role_permissions parent_rp
  JOIN public.module_actions parent_action
    ON parent_action.id = parent_rp.action_id
   AND parent_action.action_name IN ('view','read')
  JOIN public.app_modules child
    ON child.parent_id = parent_rp.module_id
  JOIN public.module_actions child_action
    ON child_action.module_id = child.id
   AND child_action.action_name = parent_action.action_name
 WHERE parent_rp.module_id = '079b69ea-befe-4a7f-86b2-8d8a1d403e58'
   AND parent_rp.is_granted = true
   AND NOT EXISTS (
     SELECT 1 FROM public.role_permissions existing
      WHERE existing.role_id  = parent_rp.role_id
        AND existing.module_id = child.id
        AND existing.action_id = child_action.id
   );

COMMIT;
