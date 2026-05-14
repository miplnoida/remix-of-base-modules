INSERT INTO app_modules (id, name, display_name, route, icon, parent_id, sort_order, show_in_menu, is_enabled, description)
VALUES (
  'ca000000-0000-0000-0000-000000000215',
  'ce_field_weekly_report_review',
  'Weekly Report Review',
  '/compliance/field/weekly-report-review',
  'FileText',
  (SELECT parent_id FROM app_modules WHERE id='ca000000-0000-0000-0000-000000000214'),
  215,
  true,
  true,
  'Supervisor review of submitted weekly reports'
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  route = EXCLUDED.route,
  show_in_menu = true,
  is_enabled = true;