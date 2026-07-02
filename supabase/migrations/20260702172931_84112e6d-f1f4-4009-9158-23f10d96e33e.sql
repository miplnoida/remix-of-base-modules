
-- 1. Rename Referrals Workbench → Referral Queue (canonical label)
UPDATE public.app_modules
   SET display_name = 'Referral Queue', updated_at = now()
 WHERE id = '1e9a1000-0000-0000-0000-0000000007b3';

-- 2. Add "Intake & Qualification" and "Supervisor Review" under Referrals section
INSERT INTO public.app_modules
  (id, name, display_name, description, icon, route, parent_id, sort_order,
   is_enabled, show_in_menu, routes_enabled, actions_enabled, rollout_state)
VALUES
  ('1e9a1000-0000-0000-0000-0000000007b4',
   'lg_intake_qualification',
   'Intake & Qualification',
   'Mandatory qualification of legal referrals before case creation',
   'ClipboardCheck',
   '/legal/lg/intake',
   '1e9a2000-0000-0000-0000-0000000000c3', -- lg_sec_referrals
   40, true, true, true, true, 'public'),
  ('1e9a1000-0000-0000-0000-0000000007b5',
   'lg_intake_supervisor_review',
   'Supervisor Review',
   'Intakes awaiting supervisor approval before case creation',
   'ShieldCheck',
   '/legal/lg/intake?preset=supervisor_review',
   '1e9a2000-0000-0000-0000-0000000000c3',
   50, true, true, true, true, 'public')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  icon         = EXCLUDED.icon,
  route        = EXCLUDED.route,
  parent_id    = EXCLUDED.parent_id,
  sort_order   = EXCLUDED.sort_order,
  show_in_menu = true,
  is_enabled   = true,
  updated_at   = now();

-- 3. Add "My Work" section between Command Centre and Recovery Workbench
INSERT INTO public.app_modules
  (id, name, display_name, description, icon, route, parent_id, sort_order,
   is_enabled, show_in_menu, routes_enabled, actions_enabled, rollout_state)
VALUES
  ('1e9a2000-0000-0000-0000-0000000000d3',
   'lg_sec_my_work',
   'My Work',
   'Personal workqueue for the signed-in legal officer',
   'Briefcase',
   NULL,
   '1e9a1000-0000-0000-0000-000000000001', -- legal_enforcement
   15, true, true, true, true, 'public'),
  ('1e9a2000-0000-0000-0000-0000000000da',
   'lg_my_tasks',
   'My Tasks',
   'Tasks assigned directly to me',
   'ListChecks',
   '/legal/lg/tasks?view=my',
   '1e9a2000-0000-0000-0000-0000000000d3',
   10, true, true, true, true, 'public'),
  ('1e9a2000-0000-0000-0000-0000000000db',
   'lg_team_queue',
   'Team Queue',
   'Team-wide workqueue',
   'Users',
   '/legal/lg/tasks?view=team',
   '1e9a2000-0000-0000-0000-0000000000d3',
   20, true, true, true, true, 'public')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  icon         = EXCLUDED.icon,
  route        = EXCLUDED.route,
  parent_id    = EXCLUDED.parent_id,
  sort_order   = EXCLUDED.sort_order,
  show_in_menu = true,
  is_enabled   = true,
  updated_at   = now();
