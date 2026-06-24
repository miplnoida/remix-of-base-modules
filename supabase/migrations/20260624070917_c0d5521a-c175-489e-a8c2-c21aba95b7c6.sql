
-- Re-runnable; uses 'cer_' name prefix and ce100000-… UUIDs.

-- 1. Hide every current descendant of the Compliance parent from the menu
WITH RECURSIVE tree AS (
  SELECT id FROM public.app_modules
   WHERE parent_id = 'ca000000-0000-0000-0000-000000000001'
  UNION ALL
  SELECT m.id FROM public.app_modules m JOIN tree t ON m.parent_id = t.id
)
UPDATE public.app_modules
   SET show_in_menu = false, updated_at = now()
 WHERE id IN (SELECT id FROM tree)
   AND id::text NOT LIKE 'ce100000-0000-0000-000_-%';

-- 2. Section parents
INSERT INTO public.app_modules
  (id, name, display_name, description, icon, route, parent_id, sort_order,
   is_enabled, show_in_menu, rollout_state, routes_enabled, actions_enabled)
VALUES
  ('ce100000-0000-0000-0001-000000000000','cer_sec_workbench','1. Workbench',           'Day-to-day work queues, dashboards and analytics','LayoutDashboard',NULL,'ca000000-0000-0000-0000-000000000001',10,true,true,'public',true,true),
  ('ce100000-0000-0000-0002-000000000000','cer_sec_employer',  '2. Employer Compliance','Employer-centric 360 view, ledger, arrears and risk',  'Building2',     NULL,'ca000000-0000-0000-0000-000000000001',20,true,true,'public',true,true),
  ('ce100000-0000-0000-0003-000000000000','cer_sec_violations','3. Violations',         'Detected and manual violations, verification and merges','AlertTriangle', NULL,'ca000000-0000-0000-0000-000000000001',30,true,true,'public',true,true),
  ('ce100000-0000-0000-0004-000000000000','cer_sec_cases',     '4. Cases',              'Compliance cases, queues, grouping and penalties',    'Folder',        NULL,'ca000000-0000-0000-0000-000000000001',40,true,true,'public',true,true),
  ('ce100000-0000-0000-0005-000000000000','cer_sec_field',     '5. Field & Audit',      'Planning, inspections, findings and audit reports',   'ClipboardCheck',NULL,'ca000000-0000-0000-0000-000000000001',50,true,true,'public',true,true),
  ('ce100000-0000-0000-0006-000000000000','cer_sec_recovery',  '6. Recovery',           'Notices, arrangements, breach monitoring and waivers','HandCoins',     NULL,'ca000000-0000-0000-0000-000000000001',60,true,true,'public',true,true),
  ('ce100000-0000-0000-0007-000000000000','cer_sec_legal',     '7. Legal Escalation',   'Recommendation, referral, legal pack and outcome',    'Scale',         NULL,'ca000000-0000-0000-0000-000000000001',70,true,true,'public',true,true),
  ('ce100000-0000-0000-0008-000000000000','cer_sec_reports',   '8. Reports',            'Compliance, arrears, legal and inspector reports',    'BarChart3',     NULL,'ca000000-0000-0000-0000-000000000001',80,true,true,'public',true,true),
  ('ce100000-0000-0000-0009-000000000000','cer_sec_admin',     '9. Compliance Admin',   'Rules, geography, templates, automation, ledger',     'Settings',      NULL,'ca000000-0000-0000-0000-000000000001',90,true,true,'public',true,true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, display_name = EXCLUDED.display_name,
  description = EXCLUDED.description, icon = EXCLUDED.icon,
  parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order,
  is_enabled = true, show_in_menu = true, updated_at = now();

-- 3. Leaves
INSERT INTO public.app_modules
  (id, name, display_name, description, icon, route, parent_id, sort_order,
   is_enabled, show_in_menu, rollout_state, routes_enabled, actions_enabled)
VALUES
  ('ce100000-0000-0000-0001-000000000001','cer_wb_my_work',     'My Work',               'Personal work queue',                  'Inbox',         '/compliance/my-work-queue',          'ce100000-0000-0000-0001-000000000000',10,true,true,'public',true,true),
  ('ce100000-0000-0000-0001-000000000002','cer_wb_team_queues', 'Team Queues',           'Assignment queues across the team',    'Users',         '/compliance/workbench/queues',       'ce100000-0000-0000-0001-000000000000',20,true,true,'public',true,true),
  ('ce100000-0000-0000-0001-000000000003','cer_wb_mgr_dash',    'Manager Dashboard',     'Manager KPIs and approvals',           'LayoutDashboard','/compliance/workbench/manager',     'ce100000-0000-0000-0001-000000000000',30,true,true,'public',true,true),
  ('ce100000-0000-0000-0001-000000000004','cer_wb_insp_dash',   'Inspector Dashboard',   'Inspector daily view',                 'UserCheck',     '/compliance/workbench/inspector',    'ce100000-0000-0000-0001-000000000000',40,true,true,'public',true,true),
  ('ce100000-0000-0000-0001-000000000005','cer_wb_monitor',     'Monitoring Dashboard',  'Operational monitoring',               'Activity',      '/compliance/workbench/monitoring',   'ce100000-0000-0000-0001-000000000000',50,true,true,'public',true,true),
  ('ce100000-0000-0000-0001-000000000006','cer_wb_analytics',   'Analytics Dashboard',   'Trends and analytics',                 'BarChart3',     '/compliance/workbench/analytics',    'ce100000-0000-0000-0001-000000000000',60,true,true,'public',true,true),

  ('ce100000-0000-0000-0002-000000000001','cer_emp_360',        'Employer 360',          'Unified employer view',                'Eye',           '/compliance/field/employer-360',     'ce100000-0000-0000-0002-000000000000',10,true,true,'public',true,true),
  ('ce100000-0000-0000-0002-000000000002','cer_emp_ledger',     'Employer Ledger',       'Open employer ledger (pick employer)', 'BookOpen',      '/compliance/coming-soon/employer-ledger','ce100000-0000-0000-0002-000000000000',20,true,true,'public',true,true),
  ('ce100000-0000-0000-0002-000000000003','cer_emp_arrears',    'Arrears / Liability Statement','Employer arrears statement',  'Receipt',       '/compliance/coming-soon/arrears-statement','ce100000-0000-0000-0002-000000000000',30,true,true,'public',true,true),
  ('ce100000-0000-0000-0002-000000000004','cer_emp_risk',       'Risk Profile',          'Employer risk score detail',           'Gauge',         '/compliance/risk/score-details',     'ce100000-0000-0000-0002-000000000000',40,true,true,'public',true,true),
  ('ce100000-0000-0000-0002-000000000005','cer_emp_history',    'Compliance History',    'Historical compliance timeline',       'History',       '/compliance/coming-soon/compliance-history','ce100000-0000-0000-0002-000000000000',50,true,true,'public',true,true),

  ('ce100000-0000-0000-0003-000000000001','cer_vio_detected',   'Detection Results',     'Rule-detected violations queue',       'Search',        '/compliance/violations/rule-detected','ce100000-0000-0000-0003-000000000000',10,true,true,'public',true,true),
  ('ce100000-0000-0000-0003-000000000002','cer_vio_verify',     'Verification Queue',    'Verify detected violations',           'CheckSquare',   '/compliance/violations/verification-queue','ce100000-0000-0000-0003-000000000000',20,true,true,'public',true,true),
  ('ce100000-0000-0000-0003-000000000003','cer_vio_manual',     'Manual Violation Entry','Record violation manually',            'PenSquare',     '/compliance/violations/manual-entry','ce100000-0000-0000-0003-000000000000',30,true,true,'public',true,true),
  ('ce100000-0000-0000-0003-000000000004','cer_vio_mgmt',       'Violation Management',  'All violations',                       'ListChecks',    '/compliance/violations',             'ce100000-0000-0000-0003-000000000000',40,true,true,'public',true,true),
  ('ce100000-0000-0000-0003-000000000005','cer_vio_dup',        'Duplicate / Merge Review','Resolve duplicates',                 'Copy',          '/compliance/violations/duplicate-review','ce100000-0000-0000-0003-000000000000',50,true,true,'public',true,true),

  ('ce100000-0000-0000-0004-000000000001','cer_case_mgmt',      'Case Management',       'All compliance cases',                 'Folder',        '/compliance/cases',                  'ce100000-0000-0000-0004-000000000000',10,true,true,'public',true,true),
  ('ce100000-0000-0000-0004-000000000002','cer_case_queue',     'Case Queue',            'Cases assigned to me / team',          'Inbox',         '/compliance/cases/queue',            'ce100000-0000-0000-0004-000000000000',20,true,true,'public',true,true),
  ('ce100000-0000-0000-0004-000000000003','cer_case_families',  'Case Families / Grouping','Grouped/related cases',              'Network',       '/compliance/admin/case-families',    'ce100000-0000-0000-0004-000000000000',30,true,true,'public',true,true),
  ('ce100000-0000-0000-0004-000000000004','cer_case_penalty',   'Penalty Management',    'Penalty calculations and approvals',   'Calculator',    '/compliance/cases/penalties',        'ce100000-0000-0000-0004-000000000000',40,true,true,'public',true,true),

  ('ce100000-0000-0000-0005-000000000001','cer_fld_plans',      'Plans',                 'Weekly plan builder',                  'CalendarRange', '/compliance/field/plan-builder',     'ce100000-0000-0000-0005-000000000000',10,true,true,'public',true,true),
  ('ce100000-0000-0000-0005-000000000002','cer_fld_my_plans',   'My Plans',              'My inspection plans',                  'ClipboardList', '/compliance/field/my-plans',         'ce100000-0000-0000-0005-000000000000',20,true,true,'public',true,true),
  ('ce100000-0000-0000-0005-000000000003','cer_fld_insp',       'Inspections',           'Field inspection execution',           'ClipboardCheck','/compliance/field/execution',        'ce100000-0000-0000-0005-000000000000',30,true,true,'public',true,true),
  ('ce100000-0000-0000-0005-000000000004','cer_fld_findings',   'Findings',              'Inspection findings',                  'AlertCircle',   '/compliance/field/findings',         'ce100000-0000-0000-0005-000000000000',40,true,true,'public',true,true),
  ('ce100000-0000-0000-0005-000000000005','cer_fld_visit',      'Visit Workspace',       'Employer statements / visit workspace','MapPin',        '/compliance/field/employer-statements','ce100000-0000-0000-0005-000000000000',50,true,true,'public',true,true),
  ('ce100000-0000-0000-0005-000000000006','cer_fld_audit_rpt',  'Audit Reports',         'All audit reports',                    'FileText',      '/compliance/field/all-reports',      'ce100000-0000-0000-0005-000000000000',60,true,true,'public',true,true),
  ('ce100000-0000-0000-0005-000000000007','cer_fld_weekly',     'Weekly Reports',        'Weekly inspector reports',             'CalendarDays',  '/compliance/field/weekly-report',    'ce100000-0000-0000-0005-000000000000',70,true,true,'public',true,true),

  ('ce100000-0000-0000-0006-000000000001','cer_rec_notices',    'Notices',               'Notice register and generation',       'Mail',          '/compliance/notices',                'ce100000-0000-0000-0006-000000000000',10,true,true,'public',true,true),
  ('ce100000-0000-0000-0006-000000000002','cer_rec_arr',        'Payment Arrangements',  'Employer payment arrangements',        'CalendarCheck', '/compliance/enforcement/arrangements','ce100000-0000-0000-0006-000000000000',20,true,true,'public',true,true),
  ('ce100000-0000-0000-0006-000000000003','cer_rec_breach',     'Breach Monitoring',     'Arrangement breach monitoring',        'AlertOctagon',  '/compliance/enforcement/breaches',   'ce100000-0000-0000-0006-000000000000',30,true,true,'public',true,true),
  ('ce100000-0000-0000-0006-000000000004','cer_rec_waivers',    'Waivers / Overrides',   'Waiver and override decisions',        'BadgeMinus',    '/compliance/enforcement/waivers',    'ce100000-0000-0000-0006-000000000000',40,true,true,'public',true,true),

  ('ce100000-0000-0000-0007-000000000001','cer_leg_recq',       'Recommendation Queue',  'Legal recommendation queue',           'Inbox',         '/compliance/enforcement/recommendation-queue','ce100000-0000-0000-0007-000000000000',10,true,true,'public',true,true),
  ('ce100000-0000-0000-0007-000000000002','cer_leg_wizard',     'Referral Wizard',       'Send case to legal',                   'Wand2',         '/compliance/enforcement/legal-referral','ce100000-0000-0000-0007-000000000000',20,true,true,'public',true,true),
  ('ce100000-0000-0000-0007-000000000003','cer_leg_pack',       'Legal Pack Generation', 'Prepare legal pack',                   'FilePlus2',     '/compliance/legal/pack-preparation', 'ce100000-0000-0000-0007-000000000000',30,true,true,'public',true,true),
  ('ce100000-0000-0000-0007-000000000004','cer_leg_status',     'Referral Status',       'Status of legal referrals',            'ListOrdered',   '/compliance/enforcement/legal-queue','ce100000-0000-0000-0007-000000000000',40,true,true,'public',true,true),
  ('ce100000-0000-0000-0007-000000000005','cer_leg_outcome',    'Legal Outcome Tracking','Track court proceedings/outcomes',     'Gavel',         '/compliance/enforcement/proceedings','ce100000-0000-0000-0007-000000000000',50,true,true,'public',true,true),

  ('ce100000-0000-0000-0008-000000000001','cer_rpt_c3',         'C3 Compliance',         'C3 filing compliance reports',         'FileBarChart',  '/compliance/reports/c3-compliance',  'ce100000-0000-0000-0008-000000000000',10,true,true,'public',true,true),
  ('ce100000-0000-0000-0008-000000000002','cer_rpt_arrears',    'Arrears',               'Arrears reports',                      'Receipt',       '/compliance/reports/arrears',        'ce100000-0000-0000-0008-000000000000',20,true,true,'public',true,true),
  ('ce100000-0000-0000-0008-000000000003','cer_rpt_arr',        'Arrangements',          'Arrangement reports',                  'CalendarCheck', '/compliance/reports/arrangements',   'ce100000-0000-0000-0008-000000000000',30,true,true,'public',true,true),
  ('ce100000-0000-0000-0008-000000000004','cer_rpt_legal',      'Legal Escalations',     'Legal escalation reports',             'Scale',         '/compliance/reports/legal',          'ce100000-0000-0000-0008-000000000000',40,true,true,'public',true,true),
  ('ce100000-0000-0000-0008-000000000005','cer_rpt_inspector',  'Inspector Performance', 'Inspector performance reports',        'UserCheck',     '/compliance/reports/inspector-performance','ce100000-0000-0000-0008-000000000000',50,true,true,'public',true,true),
  ('ce100000-0000-0000-0008-000000000006','cer_rpt_trends',     'Trends',                'Compliance trends',                    'TrendingUp',    '/compliance/reports/trends',         'ce100000-0000-0000-0008-000000000000',60,true,true,'public',true,true),

  ('ce100000-0000-0000-0009-000000000001','cer_adm_rules',      'Rules & Policies',      'Rule engine and policies',             'Settings2',     '/compliance/admin/settings/rule-engine','ce100000-0000-0000-0009-000000000000',10,true,true,'public',true,true),
  ('ce100000-0000-0000-0009-000000000002','cer_adm_staff',      'Staff & Queues',        'Officers, queues, supervisors',        'Users',         '/compliance/admin/staff/officers',   'ce100000-0000-0000-0009-000000000000',20,true,true,'public',true,true),
  ('ce100000-0000-0000-0009-000000000003','cer_adm_geo',        'Geography',             'Zones, office and village mappings',   'Map',           '/compliance/admin/geography/zones',  'ce100000-0000-0000-0009-000000000000',30,true,true,'public',true,true),
  ('ce100000-0000-0000-0009-000000000004','cer_adm_templates',  'Templates & Communications','Communication templates',          'FileText',      '/compliance/admin/communication-templates','ce100000-0000-0000-0009-000000000000',40,true,true,'public',true,true),
  ('ce100000-0000-0000-0009-000000000005','cer_adm_automation', 'Automation',            'Automation jobs and history',          'Zap',           '/compliance/admin/automation/jobs',  'ce100000-0000-0000-0009-000000000000',50,true,true,'public',true,true),
  ('ce100000-0000-0000-0009-000000000006','cer_adm_ledger',     'Ledger Configuration',  'Compliance ledger configuration',      'BookOpen',      '/compliance/admin/settings/ledger-admin','ce100000-0000-0000-0009-000000000000',60,true,true,'public',true,true),
  ('ce100000-0000-0000-0009-000000000007','cer_adm_tools',      'Tools / Simulators',    'Rule and risk simulators',             'Wrench',        '/compliance/admin/tools/rule-simulator','ce100000-0000-0000-0009-000000000000',70,true,true,'public',true,true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, display_name = EXCLUDED.display_name,
  description = EXCLUDED.description, icon = EXCLUDED.icon,
  route = EXCLUDED.route, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  is_enabled = true, show_in_menu = true, updated_at = now();

-- 4. View action per new module
INSERT INTO public.module_actions (id, module_id, action_name, display_name, description, is_enabled)
SELECT gen_random_uuid(), m.id, 'view', 'View', 'View this module', true
  FROM public.app_modules m
 WHERE m.id::text LIKE 'ce100000-0000-0000-000_-%'
   AND NOT EXISTS (
     SELECT 1 FROM public.module_actions a WHERE a.module_id = m.id AND a.action_name = 'view'
   );

-- 5. Grant view to the compliance role set
INSERT INTO public.role_permissions (id, role_id, module_id, action_id, is_granted)
SELECT gen_random_uuid(), r.id, a.module_id, a.id, true
  FROM public.module_actions a
  JOIN public.app_modules m ON m.id = a.module_id
 CROSS JOIN public.roles r
 WHERE m.id::text LIKE 'ce100000-0000-0000-000_-%'
   AND a.action_name = 'view'
   AND r.role_name IN (
     'Admin','ComplianceHead','ComplianceInspector','SeniorInspector',
     'Supervisor','Manager','LegalOfficer','FinanceOfficer'
   )
   AND NOT EXISTS (
     SELECT 1 FROM public.role_permissions rp
      WHERE rp.role_id = r.id AND rp.module_id = a.module_id AND rp.action_id = a.id
   );
