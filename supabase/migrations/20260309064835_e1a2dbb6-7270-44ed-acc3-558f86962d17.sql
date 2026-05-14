
-- Insert 11 new Internal Audit sub-modules
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, description, is_enabled)
VALUES
  ('a1100001-0001-4000-8000-000000000001', 'audit_universe', 'Audit Universe', 'globe', '/audit/audit-universe', '014f0c8f-7388-4bf9-9de0-28d122b6d3bf', 5, 'Master list of all auditable entities', true),
  ('a1100001-0001-4000-8000-000000000002', 'risk_assessment', 'Risk Assessment', 'target', '/audit/risk-assessment', '014f0c8f-7388-4bf9-9de0-28d122b6d3bf', 6, 'Assess and score entity risks', true),
  ('a1100001-0001-4000-8000-000000000003', 'audit_engagements', 'Audit Engagements', 'briefcase', '/audit/engagements', '014f0c8f-7388-4bf9-9de0-28d122b6d3bf', 55, 'Manage formal audit engagements', true),
  ('a1100001-0001-4000-8000-000000000004', 'audit_programs', 'Audit Programs', 'clipboard-list', '/audit/audit-programs', '014f0c8f-7388-4bf9-9de0-28d122b6d3bf', 56, 'Reusable audit programs and procedures', true),
  ('a1100001-0001-4000-8000-000000000005', 'risk_control_matrix', 'Risk Control Matrix', 'layers', '/audit/rcm', '014f0c8f-7388-4bf9-9de0-28d122b6d3bf', 57, 'Map processes, risks, controls and tests', true),
  ('a1100001-0001-4000-8000-000000000006', 'control_testing', 'Control Testing', 'test-tube', '/audit/control-testing', '014f0c8f-7388-4bf9-9de0-28d122b6d3bf', 85, 'Test and evaluate control effectiveness', true),
  ('a1100001-0001-4000-8000-000000000007', 'time_tracking', 'Time Tracking', 'history', '/audit/time-tracking', '014f0c8f-7388-4bf9-9de0-28d122b6d3bf', 25, 'Track auditor time and utilization', true),
  ('a1100001-0001-4000-8000-000000000008', 'quality_review', 'Quality Assurance Review', 'badge-check', '/audit/quality-review', '014f0c8f-7388-4bf9-9de0-28d122b6d3bf', 155, 'Independent review of completed audits', true),
  ('a1100001-0001-4000-8000-000000000009', 'executive_dashboard', 'Executive Dashboard', 'layout-dashboard', '/audit/executive-dashboard', '014f0c8f-7388-4bf9-9de0-28d122b6d3bf', 3, 'High-level audit performance overview', true),
  ('a1100001-0001-4000-8000-000000000010', 'committee_reports', 'Committee Reports', 'file-text', '/audit/committee-reports', '014f0c8f-7388-4bf9-9de0-28d122b6d3bf', 165, 'Board and committee reporting packs', true),
  ('a1100001-0001-4000-8000-000000000011', 'sla_escalation_rules', 'SLA & Escalation Rules', 'bell', '/audit/sla-rules', '014f0c8f-7388-4bf9-9de0-28d122b6d3bf', 205, 'Manage SLA rules and escalation workflows', true)
ON CONFLICT (id) DO NOTHING;

-- Add 'view' action for each new module with display_name
INSERT INTO module_actions (module_id, action_name, display_name)
VALUES
  ('a1100001-0001-4000-8000-000000000001', 'view', 'View'),
  ('a1100001-0001-4000-8000-000000000002', 'view', 'View'),
  ('a1100001-0001-4000-8000-000000000003', 'view', 'View'),
  ('a1100001-0001-4000-8000-000000000004', 'view', 'View'),
  ('a1100001-0001-4000-8000-000000000005', 'view', 'View'),
  ('a1100001-0001-4000-8000-000000000006', 'view', 'View'),
  ('a1100001-0001-4000-8000-000000000007', 'view', 'View'),
  ('a1100001-0001-4000-8000-000000000008', 'view', 'View'),
  ('a1100001-0001-4000-8000-000000000009', 'view', 'View'),
  ('a1100001-0001-4000-8000-000000000010', 'view', 'View'),
  ('a1100001-0001-4000-8000-000000000011', 'view', 'View');
