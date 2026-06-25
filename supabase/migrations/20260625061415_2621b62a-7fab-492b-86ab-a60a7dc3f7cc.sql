DO $$
DECLARE
  v_legal_root        UUID := '1e9a1000-0000-0000-0000-000000000001';
  v_grp_reference     UUID := '1e9a1000-0000-0000-0000-000000000210';
  v_grp_governance    UUID := '1e9a1000-0000-0000-0000-000000000240';
  v_grp_reports       UUID := '1e9a1000-0000-0000-0000-000000000300';
  v_grp_settings      UUID := '1e9a1000-0000-0000-0000-000000000400';
  v_grp_operations    UUID := '1e9a1000-0000-0000-0000-000000000500';
BEGIN
  INSERT INTO app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
  VALUES
    (v_grp_operations, 'lg_grp_operations',  'Operations',       'Operational legal screens',          'Briefcase', NULL, v_legal_root, 115, true, true),
    (v_grp_reports,    'lg_grp_reports_sub', 'Detailed Reports', 'Detailed legal reports',             'BarChart3', NULL, v_legal_root, 111, true, true),
    (v_grp_settings,   'lg_grp_settings',    'Legal Settings',   'Reference data and module settings', 'Settings',  NULL, v_legal_root, 119, true, true)
  ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order, is_enabled=true, show_in_menu=true;

  INSERT INTO app_modules (name, display_name, route, icon, parent_id, sort_order, is_enabled, show_in_menu) VALUES
    ('lg_ops_dashboard',     'Operations Dashboard', '/legal/ops',              'LayoutDashboard', v_grp_operations, 10, true, true),
    ('lg_classic_dashboard', 'Classic Dashboard',    '/legal/dashboard',        'LayoutDashboard', v_grp_operations, 20, true, true),
    ('lg_delinquent_cases',  'Delinquent Cases',     '/legal/cases/delinquent', 'AlertTriangle',   v_grp_operations, 30, true, true),
    ('lg_appeals',           'Appeals',              '/legal/appeals',          'FileWarning',     v_grp_operations, 40, true, true),
    ('lg_evidence',          'Evidence Management',  '/legal/evidence',         'FolderArchive',   v_grp_operations, 50, true, true),
    ('lg_order_registry',    'Order Registry',       '/legal/orders',           'Gavel',           v_grp_operations, 60, true, true),
    ('lg_templates_library', 'Templates Library',    '/legal/templates',        'FileText',        v_grp_operations, 70, true, true),
    ('lg_rpt_cases_by_stage','Cases by Stage',       '/legal/reports/cases-by-stage',   'BarChart3',  v_grp_reports, 10, true, true),
    ('lg_rpt_aging',         'Aging Receivables',    '/legal/reports/aging',            'TrendingUp', v_grp_reports, 20, true, true),
    ('lg_rpt_recovery',      'Recovery Analysis',    '/legal/reports/recovery',         'PieChart',   v_grp_reports, 30, true, true),
    ('lg_rpt_costs_fees',    'Court Costs & Fees',   '/legal/reports/costs-fees',       'DollarSign', v_grp_reports, 40, true, true),
    ('lg_rpt_pending_hearings','Pending Hearings',   '/legal/reports/pending-hearings', 'Calendar',   v_grp_reports, 50, true, true),
    ('lg_rpt_performance',   'Performance Metrics',  '/legal/reports/performance',      'Activity',   v_grp_reports, 60, true, true),
    ('lg_set_reference_data','Reference Data',       '/legal/config/reference-data','Database',  v_grp_settings, 10, true, true),
    ('lg_set_courts',        'Courts & Judges',      '/legal/settings/courts',      'Building',  v_grp_settings, 20, true, true),
    ('lg_set_hearing_types', 'Hearing Types',        '/legal/settings/hearing-types','Calendar', v_grp_settings, 30, true, true),
    ('lg_set_case_statuses', 'Case Statuses',        '/legal/settings/statuses',    'Tag',       v_grp_settings, 40, true, true),
    ('lg_set_legal_roles',   'Legal Roles',          '/legal/settings/roles',       'Users',     v_grp_settings, 50, true, true),
    ('lg_set_fee_mappings',  'Fee Mappings',         '/legal/settings/fee-mappings','Receipt',   v_grp_settings, 60, true, true),
    ('lg_set_territory',     'Territory',            '/legal/settings/territory',   'MapPin',    v_grp_settings, 70, true, true),
    ('lg_set_workflow',      'Case Workflow',        '/legal/settings/workflow',    'GitBranch', v_grp_settings, 80, true, true),
    ('lg_admin_sla_rules',           'SLA Rules',           '/legal/admin/sla-rules',           'Clock',       v_grp_governance, 10, true, true),
    ('lg_admin_referral_integrity',  'Referral Integrity',  '/legal/admin/referral-integrity',  'ShieldCheck', v_grp_governance, 20, true, true),
    ('lg_admin_case_integrity',      'Case Integrity',      '/legal/admin/case-integrity',      'ShieldAlert', v_grp_governance, 25, true, true),
    ('lg_admin_intake_validation',   'Intake Validation',   '/legal/admin/intake-validation',   'CheckCircle', v_grp_governance, 30, true, true),
    ('lg_admin_ref_verification',    'Reference Verification','/legal/admin/legal-references/verification','ListChecks',v_grp_reference,10,true,true),
    ('lg_admin_workflow_rules',      'Workflow Rules',      '/legal/admin/workflow',            'GitBranch',   v_grp_reference, 20, true, true)
  ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, route=EXCLUDED.route, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order, icon=EXCLUDED.icon, is_enabled=true, show_in_menu=true;

  UPDATE app_modules SET show_in_menu = true
   WHERE name IN ('lg_admin_complainant','lg_admin_stage_templates','lg_admin_stage_refs');
END $$;

DO $$
DECLARE
  m RECORD;
  r RECORD;
  v_action_id UUID;
BEGIN
  FOR m IN
    SELECT id, name FROM app_modules
     WHERE name LIKE 'lg\_%' ESCAPE '\' OR name = 'legal_enforcement'
  LOOP
    SELECT id INTO v_action_id FROM module_actions
     WHERE module_id = m.id AND action_name = 'view' LIMIT 1;
    IF v_action_id IS NULL THEN
      INSERT INTO module_actions (module_id, action_name, display_name, is_enabled)
      VALUES (m.id, 'view', 'View', true) RETURNING id INTO v_action_id;
    END IF;
    FOR r IN
      SELECT id FROM roles
       WHERE role_name IN ('Admin','LEGAL_ADMIN','LEGAL_MANAGER','SENIOR_LEGAL_OFFICER','LEGAL_OFFICER','LEGAL_READ_ONLY')
    LOOP
      INSERT INTO role_permissions (role_id, module_id, action_id, is_granted)
      VALUES (r.id, m.id, v_action_id, true)
      ON CONFLICT (role_id, module_id, action_id) DO UPDATE SET is_granted = true;
    END LOOP;
  END LOOP;
END $$;

INSERT INTO user_roles (user_id, role)
SELECT '62c928c3-cd5e-421f-a010-50f9123fff70'::uuid, 'LEGAL_ADMIN'
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles
   WHERE user_id = '62c928c3-cd5e-421f-a010-50f9123fff70'::uuid
     AND role = 'LEGAL_ADMIN'
);