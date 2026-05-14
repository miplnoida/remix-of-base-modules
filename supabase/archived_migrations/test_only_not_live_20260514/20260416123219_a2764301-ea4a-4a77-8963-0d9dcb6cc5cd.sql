
INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, show_in_menu, is_enabled, sort_order, description)
VALUES (
  'ca000000-0000-0000-0000-000000000213',
  'ce_field_my_upcoming',
  'My Upcoming Audits',
  'Calendar',
  '/compliance/field/my-upcoming',
  'ca000000-0000-0000-0000-000000000200',
  true,
  true,
  120,
  'View upcoming audit assignments'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, show_in_menu, is_enabled, sort_order, description)
VALUES (
  'ca000000-0000-0000-0000-000000000214',
  'ce_field_weekly_report_submit',
  'Weekly Report Submission',
  'FileCheck',
  '/compliance/field/weekly-report',
  'ca000000-0000-0000-0000-000000000200',
  true,
  true,
  90,
  'Submit weekly field reports'
)
ON CONFLICT (id) DO NOTHING;
