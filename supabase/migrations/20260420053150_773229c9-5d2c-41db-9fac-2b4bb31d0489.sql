-- Phase 1 — Compliance & Enforcement redesign
UPDATE public.app_modules
SET show_in_menu = false, is_enabled = false, updated_at = now()
WHERE route IN (
  '/compliance/field/operations',
  '/compliance/field/inspections',
  '/compliance/field/weekly-reports',
  '/compliance/field/my-upcoming',
  '/compliance/field/sampling/candidates'
);

UPDATE public.app_modules SET display_name = 'Visit Workspace',     updated_at = now() WHERE route = '/compliance/field/execution';
UPDATE public.app_modules SET display_name = 'Submit Weekly Report', updated_at = now() WHERE route = '/compliance/field/weekly-report';
UPDATE public.app_modules SET display_name = 'Weekly Reports',       updated_at = now() WHERE route = '/compliance/field/all-reports';

INSERT INTO public.app_modules
  (id, name, display_name, route, parent_id, sort_order, icon, description, is_enabled, show_in_menu, routes_enabled, rollout_state, internal_only)
VALUES
  ('ca000000-0000-0000-0000-0000000000aa',
   'ce_workbench_landing',
   'Workbench',
   '/compliance/workbench',
   'ca000000-0000-0000-0000-000000000011',
   1,
   'layout-dashboard',
   'Single entry point — routes to the dashboard most relevant for your role',
   true, true, true, 'public', false)
ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      route = EXCLUDED.route,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();

DO $$
DECLARE
  r_inspector uuid;
  r_senior    uuid;
  r_head      uuid;
  inspector_modules text[] := ARRAY[
    '/compliance/workbench','/compliance/workbench/inspector',
    '/compliance/field/plan-builder','/compliance/field/my-plans','/compliance/field/execution',
    '/compliance/field/audit-management','/compliance/field/findings','/compliance/field/employer-360',
    '/compliance/field/weekly-report','/compliance/field/all-reports',
    '/compliance/violations','/compliance/violations/manual-entry',
    '/compliance/cases','/compliance/cases/queue',
    '/compliance/enforcement/notices','/compliance/enforcement/arrangements'
  ];
  senior_extra_modules text[] := ARRAY[
    '/compliance/workbench/manager','/compliance/workbench/queues','/compliance/workbench/review-queue','/compliance/workbench/reassignment',
    '/compliance/field/pending-review','/compliance/field/employer-statements','/compliance/field/weekly-report-review','/compliance/field/sampling',
    '/compliance/cases/penalties',
    '/compliance/enforcement/recommendation-queue','/compliance/enforcement/breaches','/compliance/enforcement/waivers',
    '/compliance/reports/violations-analytics','/compliance/reports/inspector-performance','/compliance/reports/c3-compliance',
    '/compliance/reports/arrears','/compliance/reports/audit','/compliance/reports/arrangements'
  ];
  head_extra_modules text[] := ARRAY[
    '/compliance/workbench/legal','/compliance/workbench/analytics','/compliance/workbench/monitoring',
    '/compliance/enforcement/legal-queue','/compliance/enforcement/proceedings',
    '/compliance/reports/legal','/compliance/reports/trends'
  ];
  current_route text;
  m_id uuid;
  a_id uuid;
BEGIN
  SELECT id INTO r_inspector FROM public.roles WHERE role_name = 'ComplianceInspector';
  SELECT id INTO r_senior    FROM public.roles WHERE role_name = 'SeniorInspector';
  SELECT id INTO r_head      FROM public.roles WHERE role_name = 'ComplianceHead';
  IF r_inspector IS NULL OR r_senior IS NULL OR r_head IS NULL THEN
    RAISE NOTICE 'One or more compliance roles are missing — skipping permission grants';
    RETURN;
  END IF;

  FOREACH current_route IN ARRAY inspector_modules LOOP
    SELECT id INTO m_id FROM public.app_modules WHERE route = current_route LIMIT 1;
    IF m_id IS NULL THEN CONTINUE; END IF;
    SELECT id INTO a_id FROM public.module_actions WHERE module_id = m_id AND action_name = 'view' LIMIT 1;
    IF a_id IS NULL THEN
      INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
      VALUES (m_id, 'view', 'View', true) RETURNING id INTO a_id;
    END IF;
    INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
    VALUES (r_inspector, m_id, a_id, true)
    ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET is_granted = true;
  END LOOP;

  FOREACH current_route IN ARRAY (inspector_modules || senior_extra_modules) LOOP
    SELECT id INTO m_id FROM public.app_modules WHERE route = current_route LIMIT 1;
    IF m_id IS NULL THEN CONTINUE; END IF;
    SELECT id INTO a_id FROM public.module_actions WHERE module_id = m_id AND action_name = 'view' LIMIT 1;
    IF a_id IS NULL THEN
      INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
      VALUES (m_id, 'view', 'View', true) RETURNING id INTO a_id;
    END IF;
    INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
    VALUES (r_senior, m_id, a_id, true)
    ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET is_granted = true;
  END LOOP;

  FOREACH current_route IN ARRAY (inspector_modules || senior_extra_modules || head_extra_modules) LOOP
    SELECT id INTO m_id FROM public.app_modules WHERE route = current_route LIMIT 1;
    IF m_id IS NULL THEN CONTINUE; END IF;
    SELECT id INTO a_id FROM public.module_actions WHERE module_id = m_id AND action_name = 'view' LIMIT 1;
    IF a_id IS NULL THEN
      INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
      VALUES (m_id, 'view', 'View', true) RETURNING id INTO a_id;
    END IF;
    INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
    VALUES (r_head, m_id, a_id, true)
    ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET is_granted = true;
  END LOOP;
END $$;