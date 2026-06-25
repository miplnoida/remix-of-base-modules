
UPDATE public.app_modules
SET display_name='Legal Advice & Contract Reviews',
    description='Unified Legal Advice / Contract / NDA / MOU / Policy review requests',
    updated_at=now()
WHERE id='1e9a1000-0000-0000-0000-0000000003a0';

UPDATE public.app_modules SET display_name='Dashboard', sort_order=5, updated_at=now() WHERE id='1e9a1000-0000-0000-0000-000000000301';
UPDATE public.app_modules SET display_name='New Request', sort_order=10, updated_at=now() WHERE id='1e9a1000-0000-0000-0000-000000000302';
UPDATE public.app_modules SET display_name='My Requests', sort_order=20, updated_at=now() WHERE id='1e9a1000-0000-0000-0000-000000000303';

INSERT INTO public.app_modules (id, name, display_name, parent_id, route, sort_order, is_enabled, show_in_menu, icon)
VALUES
  ('1e9a1000-0000-0000-0000-0000000003b1','lg_advice_workbench_team','Team Workbasket','1e9a1000-0000-0000-0000-0000000003a0','/legal/advice/workbench/team',30,true,true,'Users'),
  ('1e9a1000-0000-0000-0000-0000000003b2','lg_advice_workbench_info','Info Requested','1e9a1000-0000-0000-0000-0000000003a0','/legal/advice/workbench/info-requested',40,true,true,'HelpCircle'),
  ('1e9a1000-0000-0000-0000-0000000003b3','lg_advice_workbench_review','Under Review','1e9a1000-0000-0000-0000-0000000003a0','/legal/advice/workbench/under-review',50,true,true,'Search'),
  ('1e9a1000-0000-0000-0000-0000000003b4','lg_advice_workbench_final','Final Advice Issued','1e9a1000-0000-0000-0000-0000000003a0','/legal/advice/workbench/final-advice',60,true,true,'CheckCircle'),
  ('1e9a1000-0000-0000-0000-0000000003b5','lg_advice_workbench_closed','Closed','1e9a1000-0000-0000-0000-0000000003a0','/legal/advice/workbench/closed',70,true,true,'Archive')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.module_actions (id, module_id, action_name, display_name)
SELECT gen_random_uuid(), m.id, 'view', 'View'
FROM public.app_modules m
WHERE m.id IN (
  '1e9a1000-0000-0000-0000-0000000003b1','1e9a1000-0000-0000-0000-0000000003b2',
  '1e9a1000-0000-0000-0000-0000000003b3','1e9a1000-0000-0000-0000-0000000003b4',
  '1e9a1000-0000-0000-0000-0000000003b5'
)
AND NOT EXISTS (SELECT 1 FROM public.module_actions ma WHERE ma.module_id=m.id AND ma.action_name='view');

INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, ma.module_id, ma.id, true
FROM public.roles r
CROSS JOIN public.module_actions ma
WHERE r.role_name='Admin'
  AND ma.module_id IN (
    '1e9a1000-0000-0000-0000-0000000003b1','1e9a1000-0000-0000-0000-0000000003b2',
    '1e9a1000-0000-0000-0000-0000000003b3','1e9a1000-0000-0000-0000-0000000003b4',
    '1e9a1000-0000-0000-0000-0000000003b5'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id=r.id AND rp.module_id=ma.module_id AND rp.action_id=ma.id
  );
