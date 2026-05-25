
-- Compliance permission hardening: seed canonical action vocabulary on every
-- ce_*/compliance_* module and grant the appropriate bundles to the three
-- existing Compliance roles. Uses ON CONFLICT DO NOTHING — fully idempotent.
-- No new tables, no new role types, no RLS.

-- 1. Ensure a 'view' action exists on EVERY compliance module
INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT am.id, 'view', 'View', 'View this module', true
FROM public.app_modules am
WHERE (am.name LIKE 'ce_%' OR am.name LIKE 'compliance%' OR am.name IN ('all_violations','manual_violation_entry','legal_escalation_policy'))
ON CONFLICT (module_id, action_name) DO NOTHING;

-- 2. Seed canonical write/workflow actions on operational compliance modules
WITH ops_modules AS (
  SELECT id FROM public.app_modules WHERE name IN (
    'all_violations','manual_violation_entry','ce_violations_verification_queue',
    'ce_violations_rule_detected','ce_violations_duplicate_review','ce_violations_history',
    'ce_case_management','ce_case_queue','ce_cases','ce_cases_assigned','ce_cases_intake',
    'ce_cases_closure','ce_cases_reopen','ce_cases_merge_review','ce_penalty_mgmt',
    'compliance_notices','ce_notices_register','ce_notices_generate','ce_notices_pending_approval',
    'ce_notices_delivery','ce_notices_employer_responses','ce_notices_history','ce_notices_comm',
    'ce_payment_arrangements','ce_arr_all','ce_arr_new','ce_arr_pending','ce_arr_active',
    'ce_arr_installments_due','ce_arr_breaches','ce_arr_payment_alloc','ce_breach_monitoring',
    'ce_waivers','ce_waivers_overrides',
    'ce_inspection_mgmt','ce_inspections','ce_insp_evidence','ce_insp_convert','ce_insp_field_visits',
    'ce_insp_findings','ce_insp_plans','ce_insp_assigned',
    'ce_field_plans','ce_field_plan_builder_v3','ce_field_plan_revisions','ce_field_approval_inbox',
    'ce_field_execution','ce_field_operations','ce_field_visits','ce_field_weekly_report_submit',
    'ce_field_weekly_report_review','ce_field_audit_mgmt','ce_field_employer_360',
    'ce_field_employer_grp','ce_field_findings_grp','ce_field_my_upcoming',
    'ce_legal_queue','ce_legal_proceedings','ce_legal_recommendation','ce_legal_recommendation_queue',
    'ce_legal_pack_prep','ce_legal_approved','ce_legal_returned','ce_legal_escalations',
    'ce_legal_review_queue','ce_legal_status_tracking',
    'ce_assignment_queues','ce_review_queue','ce_reassignment','ce_my_work_queue'
  )
),
canonical_actions(action_name, display_name) AS (
  VALUES
    ('create','Create'),('edit','Edit'),('delete','Delete'),
    ('submit','Submit'),('approve','Approve'),('reject','Reject'),
    ('assign','Assign'),('close','Close'),('reopen','Reopen'),
    ('export','Export'),('issue','Issue'),('escalate','Escalate'),
    ('waive','Waive')
)
INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT m.id, a.action_name, a.display_name, true
FROM ops_modules m CROSS JOIN canonical_actions a
ON CONFLICT (module_id, action_name) DO NOTHING;

-- 3. Admin/configuration screens get configure + run + edit
WITH admin_modules AS (
  SELECT id FROM public.app_modules WHERE name IN (
    'compliance_settings','compliance_settings_page','compliance_templates','compliance_tools',
    'ce_admin_arr_rules','ce_admin_automation','ce_admin_calc_rules','ce_admin_case_families',
    'ce_admin_escalation_rules','ce_admin_feature_toggles','ce_admin_help',
    'ce_admin_integrations','ce_admin_legal_handoff_rules','ce_admin_schedule_settings',
    'ce_admin_setup_wizard','ce_admin_waiver_rules','ce_admin_workflow_mapping',
    'ce_assignment_routing','ce_audit_comm_templates','ce_c3_ledger_sync',
    'ce_document_foundation','ce_employer_jobs','ce_job_config','ce_job_history',
    'ce_notice_templates','ce_number_templates','ce_online_response_config',
    'ce_report_templates','ce_rule_simulator','ce_risk_scoring_config','ce_risk_simulator',
    'ce_sampling_settings','ce_geography','ce_zones_mgmt','ce_office_zone_map',
    'ce_village_zone_map','ce_officers','ce_queue_members_mgmt','ce_supervisors',
    'ce_violation_types','legal_escalation_policy','ce_ledger_admin'
  )
),
admin_actions(action_name, display_name) AS (
  VALUES ('configure','Configure'),('run','Run'),('edit','Edit'),('create','Create'),('delete','Delete')
)
INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT m.id, a.action_name, a.display_name, true
FROM admin_modules m CROSS JOIN admin_actions a
ON CONFLICT (module_id, action_name) DO NOTHING;

-- 4. Reports & dashboards get export
WITH report_modules AS (
  SELECT id FROM public.app_modules WHERE name LIKE 'ce_%report%'
     OR name IN ('compliance_reports','ce_all_reports','ce_reports_automation_jobs',
                 'ce_trend_reports','compliance_rate_by_zone','compliance_trends_12m')
)
INSERT INTO public.module_actions (module_id, action_name, display_name, is_enabled)
SELECT id, 'export', 'Export', true FROM report_modules
ON CONFLICT (module_id, action_name) DO NOTHING;

-- ============================================================
-- 5. Role bundles
-- ============================================================
DO $$
DECLARE
  v_inspector  uuid := 'cc000000-0000-0000-0000-000000000001';
  v_senior     uuid := '48b7dcf1-adbd-4b62-9415-05aa29959c38';
  v_head       uuid := '3becd763-cd0b-494b-bab9-2ea7253735b1';
BEGIN
  -- All three Compliance roles: VIEW on every ce_*/compliance_* module
  INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
  SELECT r.role_id, ma.module_id, ma.id, true
  FROM public.module_actions ma
  JOIN public.app_modules am ON am.id = ma.module_id
  CROSS JOIN (VALUES (v_inspector),(v_senior),(v_head)) AS r(role_id)
  WHERE ma.action_name = 'view'
    AND (am.name LIKE 'ce_%' OR am.name LIKE 'compliance%'
         OR am.name IN ('all_violations','manual_violation_entry','legal_escalation_policy'))
  ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

  -- ComplianceInspector: field create/edit/submit/close + export
  INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
  SELECT v_inspector, ma.module_id, ma.id, true
  FROM public.module_actions ma
  JOIN public.app_modules am ON am.id = ma.module_id
  WHERE ma.action_name IN ('create','edit','submit','close','export')
    AND am.name IN (
      'manual_violation_entry','all_violations','ce_violations_history',
      'ce_field_plans','ce_field_plan_builder_v3','ce_field_execution',
      'ce_field_operations','ce_field_visits','ce_field_weekly_report_submit',
      'ce_inspections','ce_insp_evidence','ce_insp_convert','ce_insp_field_visits',
      'ce_insp_findings','ce_insp_plans','ce_field_employer_360',
      'ce_field_employer_grp','ce_field_findings_grp','ce_field_my_upcoming',
      'ce_my_work_queue'
    )
  ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

  -- SeniorInspector: everything ComplianceInspector has, plus approve/reject/assign/waive/escalate/issue
  INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
  SELECT v_senior, ma.module_id, ma.id, true
  FROM public.module_actions ma
  JOIN public.app_modules am ON am.id = ma.module_id
  WHERE (
    (ma.action_name IN ('create','edit','submit','close','export','reopen','assign')
       AND (am.name LIKE 'ce_%' OR am.name IN ('manual_violation_entry','all_violations','compliance_notices')))
    OR (ma.action_name IN ('approve','reject')
       AND am.name IN ('ce_field_plan_revisions','ce_field_weekly_report_review',
                       'ce_field_approval_inbox','compliance_notices','ce_notices_pending_approval',
                       'ce_arr_pending','ce_legal_recommendation_queue','ce_review_queue'))
    OR (ma.action_name = 'waive' AND am.name IN ('ce_penalty_mgmt','ce_waivers','ce_waivers_overrides'))
    OR (ma.action_name = 'escalate'
       AND am.name IN ('ce_breach_monitoring','ce_legal_queue','ce_legal_escalations','ce_legal_recommendation_queue'))
    OR (ma.action_name = 'issue' AND am.name IN ('compliance_notices','ce_notices_generate','ce_notices_register'))
  )
  ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

  -- ComplianceHead: every seeded action on every compliance module
  INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
  SELECT v_head, ma.module_id, ma.id, true
  FROM public.module_actions ma
  JOIN public.app_modules am ON am.id = ma.module_id
  WHERE am.name LIKE 'ce_%' OR am.name LIKE 'compliance%'
     OR am.name IN ('all_violations','manual_violation_entry','legal_escalation_policy')
  ON CONFLICT (role_id, module_id, action_id) DO NOTHING;
END $$;
