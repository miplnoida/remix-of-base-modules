
-- 1) New UAT roles (additive)
INSERT INTO public.roles (role_name, description, is_system_role, is_active, mfa_required)
VALUES
  ('ComplianceFinanceUser',   'Compliance Finance officer (UAT) — payment allocation, breach review, arrears reports', false, true, false),
  ('ComplianceLegalOfficer',  'Compliance Legal officer (UAT) — legal escalation workflow only',                       false, true, false),
  ('ComplianceReportsViewer', 'Compliance Reports viewer (UAT) — read-only dashboards and report export',              false, true, false)
ON CONFLICT (role_name) DO NOTHING;

-- 2) Grants helper — insert via SELECT joining roles/modules/actions; uniqueness handled by ON CONFLICT.

-- ============================================================
-- ComplianceFinanceUser
-- ============================================================

-- view on dashboards + work queue + arrangement registers
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, m.id, a.id, true
FROM public.roles r
JOIN public.app_modules m ON m.name = ANY(ARRAY[
  'ce_dashboards','ce_my_work_queue',
  'ce_payment_arrangements','ce_arr_all','ce_arr_new','ce_arr_pending','ce_arr_active',
  'ce_arr_installments_due','ce_arr_breaches','ce_breach_monitoring','ce_arr_payment_alloc'
])
JOIN public.module_actions a ON a.module_id = m.id AND a.action_name = 'view'
WHERE r.role_name = 'ComplianceFinanceUser'
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

-- edit + submit on the narrow finance-owned operations
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, m.id, a.id, true
FROM public.roles r
JOIN public.app_modules m ON m.name = ANY(ARRAY[
  'ce_arr_installments_due','ce_arr_breaches','ce_breach_monitoring','ce_arr_payment_alloc'
])
JOIN public.module_actions a ON a.module_id = m.id AND a.action_name = ANY(ARRAY['edit','submit'])
WHERE r.role_name = 'ComplianceFinanceUser'
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

-- view + export on reports
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, m.id, a.id, true
FROM public.roles r
JOIN public.app_modules m ON m.name = ANY(ARRAY[
  'compliance_reports','ce_all_reports','ce_reports_automation_jobs'
])
JOIN public.module_actions a ON a.module_id = m.id AND a.action_name = ANY(ARRAY['view','export'])
WHERE r.role_name = 'ComplianceFinanceUser'
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

-- ============================================================
-- ComplianceLegalOfficer
-- ============================================================

-- view on dashboards + my work + legal dashboards/queues
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, m.id, a.id, true
FROM public.roles r
JOIN public.app_modules m ON m.name = ANY(ARRAY[
  'ce_dashboards','ce_my_work_queue','ce_legal_dashboard',
  'ce_legal_queue','ce_legal_review_queue','ce_legal_recommendation_queue',
  'ce_legal_pack_prep','ce_legal_status_tracking',
  'ce_legal_approved','ce_legal_returned','ce_legal_escalations','ce_legal_proceedings'
])
JOIN public.module_actions a ON a.module_id = m.id AND a.action_name = 'view'
WHERE r.role_name = 'ComplianceLegalOfficer'
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

-- edit + submit on legal-working queues
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, m.id, a.id, true
FROM public.roles r
JOIN public.app_modules m ON m.name = ANY(ARRAY[
  'ce_legal_queue','ce_legal_review_queue','ce_legal_recommendation_queue',
  'ce_legal_pack_prep','ce_legal_status_tracking',
  'ce_legal_approved','ce_legal_returned','ce_legal_escalations','ce_legal_proceedings'
])
JOIN public.module_actions a ON a.module_id = m.id AND a.action_name = ANY(ARRAY['edit','submit'])
WHERE r.role_name = 'ComplianceLegalOfficer'
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

-- create on legal status/notes-bearing modules
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, m.id, a.id, true
FROM public.roles r
JOIN public.app_modules m ON m.name = ANY(ARRAY[
  'ce_legal_approved','ce_legal_returned','ce_legal_escalations','ce_legal_proceedings'
])
JOIN public.module_actions a ON a.module_id = m.id AND a.action_name = 'create'
WHERE r.role_name = 'ComplianceLegalOfficer'
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

-- approve / reject / escalate ONLY on legal-workflow modules
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, m.id, a.id, true
FROM public.roles r
JOIN public.app_modules m ON m.name = ANY(ARRAY[
  'ce_legal_approved','ce_legal_returned','ce_legal_escalations','ce_legal_proceedings'
])
JOIN public.module_actions a ON a.module_id = m.id AND a.action_name = ANY(ARRAY['approve','reject','escalate'])
WHERE r.role_name = 'ComplianceLegalOfficer'
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

-- view + export on reports
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, m.id, a.id, true
FROM public.roles r
JOIN public.app_modules m ON m.name = ANY(ARRAY['compliance_reports','ce_all_reports'])
JOIN public.module_actions a ON a.module_id = m.id AND a.action_name = ANY(ARRAY['view','export'])
WHERE r.role_name = 'ComplianceLegalOfficer'
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

-- ============================================================
-- ComplianceReportsViewer
-- ============================================================

-- view on dashboards
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, m.id, a.id, true
FROM public.roles r
JOIN public.app_modules m ON m.name = ANY(ARRAY[
  'ce_dashboards','ce_analytics_dashboard','ce_manager_dashboard',
  'ce_inspector_dashboard','ce_legal_dashboard'
])
JOIN public.module_actions a ON a.module_id = m.id AND a.action_name = 'view'
WHERE r.role_name = 'ComplianceReportsViewer'
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

-- view + export on reports
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, m.id, a.id, true
FROM public.roles r
JOIN public.app_modules m ON m.name = ANY(ARRAY[
  'compliance_reports','ce_all_reports','ce_reports_automation_jobs'
])
JOIN public.module_actions a ON a.module_id = m.id AND a.action_name = ANY(ARRAY['view','export'])
WHERE r.role_name = 'ComplianceReportsViewer'
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;
