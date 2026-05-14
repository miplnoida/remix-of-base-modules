
INSERT INTO notification_templates (id, name, category, channel, subject, title, body, placeholders, is_enabled, template_code, trigger_event, description, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'IA Plan Submitted for Approval', 'internal_audit', 'in_app',
   'Audit Plan Submitted: {{plan_title}}', 'Plan Submitted',
   'The audit plan "{{plan_title}}" for fiscal year {{fiscal_year}} has been submitted for approval by {{submitted_by}}.',
   '["plan_title","fiscal_year","submitted_by","plan_id","department_name","risk_level"]'::jsonb,
   true, 'IA_PLAN_SUBMITTED', 'ia_plan_submitted', 'Triggered when an audit plan is submitted for approval', now(), now()),

  (gen_random_uuid(), 'IA Plan Approved', 'internal_audit', 'in_app',
   'Audit Plan Approved: {{plan_title}}', 'Plan Approved',
   'The audit plan "{{plan_title}}" (v{{version_number}}) has been approved by {{approved_by}}.',
   '["plan_title","version_number","approved_by","approved_date"]'::jsonb,
   true, 'IA_PLAN_APPROVED', 'ia_plan_approved', 'Triggered when an audit plan is approved', now(), now()),

  (gen_random_uuid(), 'IA Plan Rejected', 'internal_audit', 'in_app',
   'Audit Plan Rejected: {{plan_title}}', 'Plan Rejected',
   'The audit plan "{{plan_title}}" has been rejected by {{rejected_by}}. Reason: {{rejection_reason}}',
   '["plan_title","rejected_by","rejection_reason"]'::jsonb,
   true, 'IA_PLAN_REJECTED', 'ia_plan_rejected', 'Triggered when an audit plan is rejected', now(), now()),

  (gen_random_uuid(), 'IA Plan Revision Required', 'internal_audit', 'in_app',
   'Plan Revision Triggered: {{plan_title}}', 'Revision Required',
   'Material changes to audit plan "{{plan_title}}" require re-approval. Changed: {{changed_fields}}',
   '["plan_title","changed_fields","requested_by","reason"]'::jsonb,
   true, 'IA_PLAN_REVISION', 'ia_plan_revision_required', 'Triggered when plan changes require re-approval', now(), now()),

  (gen_random_uuid(), 'IA Team Conflict Alert', 'internal_audit', 'in_app',
   'Team Conflict: {{plan_title}}', 'Availability Conflict',
   'Scheduling conflict for "{{plan_title}}". Type: {{conflict_type}}, Auditor: {{auditor_name}}, Severity: {{severity}}',
   '["plan_title","conflict_type","auditor_name","conflict_dates","severity"]'::jsonb,
   true, 'IA_TEAM_CONFLICT', 'ia_team_conflict', 'Triggered when team availability conflicts are detected', now(), now()),

  (gen_random_uuid(), 'IA Engagement Started', 'internal_audit', 'in_app',
   'Engagement Started: {{engagement_name}}', 'Engagement Started',
   'Audit engagement "{{engagement_name}}" has moved to execution. Lead: {{lead_auditor}}, Period: {{start_date}} to {{end_date}}',
   '["engagement_name","lead_auditor","department_name","start_date","end_date"]'::jsonb,
   true, 'IA_ENGAGEMENT_STARTED', 'ia_engagement_started', 'Triggered when an engagement begins execution', now(), now()),

  (gen_random_uuid(), 'IA Report Issued', 'internal_audit', 'in_app',
   'Report Issued: {{report_title}}', 'Report Issued',
   'Audit report "{{report_title}}" ({{report_number}}) has been finalized and issued by {{issued_by}}.',
   '["report_title","report_number","issued_by","department_name"]'::jsonb,
   true, 'IA_REPORT_ISSUED', 'ia_report_issued', 'Triggered when an audit report is finalized', now(), now()),

  (gen_random_uuid(), 'IA Action Overdue', 'internal_audit', 'in_app',
   'Overdue Action: {{action_description}}', 'Action Overdue',
   'Corrective action overdue: {{action_description}}. Owner: {{responsible_person}}, Due: {{due_date}}',
   '["action_description","responsible_person","due_date","engagement_name"]'::jsonb,
   true, 'IA_ACTION_OVERDUE', 'ia_action_overdue', 'Triggered when a corrective action passes its due date', now(), now()),

  (gen_random_uuid(), 'IA Engagement Closure Pending', 'internal_audit', 'in_app',
   'Closure Pending: {{engagement_name}}', 'Closure Pending',
   'Engagement "{{engagement_name}}" pending closure. Rating: {{final_rating}}, Open findings: {{open_findings_count}}',
   '["engagement_name","final_rating","open_findings_count","responses_complete"]'::jsonb,
   true, 'IA_CLOSURE_PENDING', 'ia_closure_pending', 'Triggered when an engagement enters closure phase', now(), now())

ON CONFLICT DO NOTHING;
