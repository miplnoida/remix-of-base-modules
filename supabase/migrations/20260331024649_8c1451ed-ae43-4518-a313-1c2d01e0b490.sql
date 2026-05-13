
-- Disable 16 unused Internal Audit sub-modules
UPDATE app_modules SET is_enabled = false, show_in_menu = false
WHERE name IN (
  'sla_escalation_rules',
  'committee_reports',
  'letter_generation',
  'report_builder',
  'communication_center',
  'evidence_management',
  'working_papers',
  'findings_recommendations',
  'management_responses',
  'action_tracking',
  'follow_up_tracker',
  'quality_review',
  'plan_closeout',
  'audit_programs',
  'activity_calendar',
  'activity_workbench',
  'control_testing'
);
