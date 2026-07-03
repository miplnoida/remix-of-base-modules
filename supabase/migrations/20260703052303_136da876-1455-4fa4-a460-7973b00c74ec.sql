
-- EPIC-06D: Add "Recovery Operations" section + Recovery Admin group to Legal sidebar (DB-driven).

INSERT INTO app_modules (id, name, display_name, icon, route, parent_id, sort_order, is_enabled, show_in_menu, description) VALUES
  ('1e9a2000-0000-0000-0000-0000000000e0', 'lg_sec_recovery_ops',      'Recovery Operations',      'shield-alert', NULL, '1e9a1000-0000-0000-0000-000000000001', 45, true, true, 'EPIC-06D Recovery Assignment operations'),
  ('1e9a2000-0000-0000-0000-0000000000e1', 'lg_recovery_assignments',  'Recovery Assignments',     'briefcase',    '/legal/lg/recovery-assignments',           '1e9a2000-0000-0000-0000-0000000000e0', 10, true, true, 'All recovery assignments workbench'),
  ('1e9a2000-0000-0000-0000-0000000000e2', 'lg_recovery_my_work',      'My Recovery Work',         'user-check',   '/legal/lg/recovery-assignments?view=my',   '1e9a2000-0000-0000-0000-0000000000e0', 20, true, true, 'Assignments assigned to me'),
  ('1e9a2000-0000-0000-0000-0000000000e3', 'lg_recovery_team_queue',   'Team Recovery Queue',      'users',        '/legal/lg/recovery-assignments?view=team', '1e9a2000-0000-0000-0000-0000000000e0', 30, true, true, 'Team recovery queue'),
  ('1e9a2000-0000-0000-0000-0000000000e4', 'lg_recovery_campaigns',    'Recovery Campaigns',       'target',       '/legal/lg/recovery-campaigns',             '1e9a2000-0000-0000-0000-0000000000e0', 40, true, true, 'Active and historical recovery campaigns'),
  ('1e9a2000-0000-0000-0000-0000000000e5', 'lg_recovery_admin',        'Recovery Admin',           'settings',     NULL,                                       '1e9a2000-0000-0000-0000-0000000000e0', 90, true, true, 'Recovery configuration'),
  ('1e9a2000-0000-0000-0000-0000000000e6', 'lg_admin_recovery_strat',  'Strategy Types',           'git-branch',   '/legal/admin/recovery-strategy-types',     '1e9a2000-0000-0000-0000-0000000000e5', 10, true, true, 'Recovery strategy playbooks'),
  ('1e9a2000-0000-0000-0000-0000000000e7', 'lg_admin_recovery_camp',   'Campaign Types',           'target',       '/legal/admin/recovery-campaign-types',     '1e9a2000-0000-0000-0000-0000000000e5', 20, true, true, 'Recovery campaign types'),
  ('1e9a2000-0000-0000-0000-0000000000e8', 'lg_admin_recovery_load',   'Workload Rules',           'bar-chart-3',  '/legal/admin/recovery-workload-rules',     '1e9a2000-0000-0000-0000-0000000000e5', 30, true, true, 'Officer workload rules')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  is_enabled = true,
  show_in_menu = true,
  description = EXCLUDED.description;
