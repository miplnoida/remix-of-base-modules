-- ══════════════════════════════════════════════════════════════
-- Restructure Compliance Admin: 5-bucket sub-group model
-- Admin parent: ca000000-0000-0000-0000-000000000100
-- ══════════════════════════════════════════════════════════════

-- 1. Create new parent groups under Admin (100)
INSERT INTO app_modules (id, name, display_name, parent_id, sort_order, is_enabled, show_in_menu, icon, description)
VALUES
  ('ca000000-0000-0000-0000-000000000110', 'ce_admin_policy', 'Policy & Rules', 'ca000000-0000-0000-0000-000000000100', 10, true, true, 'Scale', 'Detection rules, violation types, risk policies, and templates'),
  ('ca000000-0000-0000-0000-000000000115', 'ce_admin_automation', 'Automation & Jobs', 'ca000000-0000-0000-0000-000000000100', 15, true, true, 'Zap', 'Scheduled compliance automation jobs'),
  ('ca000000-0000-0000-0000-000000000118', 'ce_admin_integrations', 'Integrations & Ledger', 'ca000000-0000-0000-0000-000000000100', 18, true, true, 'ArrowRightLeft', 'Ledger synchronization, posting framework, and operations'),
  ('ca000000-0000-0000-0000-000000000140', 'ce_admin_diagnostics', 'Testing & Diagnostics', 'ca000000-0000-0000-0000-000000000100', 50, true, true, 'Search', 'Simulators, diagnostics, and schema tools')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  is_enabled = EXCLUDED.is_enabled,
  show_in_menu = EXCLUDED.show_in_menu,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description;

-- 2. Re-parent Policy & Rules items → 110
UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000110', sort_order = 1
WHERE id = 'ca000000-0000-0000-0000-000000000104'; -- Rule Engine

UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000110', sort_order = 2
WHERE id = 'ca000000-0000-0000-0000-000000000105'; -- Violation Types

UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000110', sort_order = 3
WHERE id = 'ca000000-0000-0000-0000-000000000108'; -- Assignment Routing

UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000110', sort_order = 4, is_enabled = true
WHERE id = 'ca000000-0000-0000-0000-000000000107'; -- Risk & Escalation Policy (re-enable)

UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000110', sort_order = 5
WHERE id = 'ca000000-0000-0000-0000-000000000154'; -- Sampling Settings

UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000110', sort_order = 6
WHERE id = 'ca000000-0000-0000-0000-000000000106'; -- Reference Numbering

UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000110', sort_order = 7
WHERE id = 'ca000000-0000-0000-0000-000000000161'; -- Templates

-- 3. Re-parent Automation & Jobs items → 115
UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000115', sort_order = 1
WHERE id = 'ca000000-0000-0000-0000-000000000091'; -- Job Configuration

UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000115', sort_order = 2
WHERE id = 'ca000000-0000-0000-0000-000000000092'; -- Job History

UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000115', sort_order = 3
WHERE id = 'ca000000-0000-0000-0000-000000000094'; -- Employer Compliance Jobs

-- 4. Re-parent Integrations & Ledger items → 118
UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000118', sort_order = 1
WHERE id = 'ca000000-0000-0000-0000-000000000162'; -- C3 Ledger Sync

UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000118', sort_order = 2
WHERE id = 'ca000000-0000-0000-0000-000000000163'; -- Payment Ledger Sync

UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000118', sort_order = 3
WHERE id = 'ca000000-0000-0000-0000-000000000164'; -- Ledger Administration

-- Insert Ledger Posting Framework, Ledger Operations, Ledger Help (may not exist yet)
INSERT INTO app_modules (id, name, display_name, route, parent_id, sort_order, is_enabled, show_in_menu, icon, description)
VALUES
  ('ca000000-0000-0000-0000-000000000165', 'ce_ledger_posting', 'Ledger Posting Framework', '/compliance/admin/settings/ledger-posting', 'ca000000-0000-0000-0000-000000000118', 4, true, true, 'Activity', 'Incremental posting, reconciliation, backfill, and rebuild'),
  ('ca000000-0000-0000-0000-000000000166', 'ce_ledger_operations', 'Ledger Operations', '/compliance/admin/settings/ledger-operations', 'ca000000-0000-0000-0000-000000000118', 5, true, true, 'Eye', 'Operational dashboard for posting health and manual reruns'),
  ('ca000000-0000-0000-0000-000000000167', 'ce_ledger_help', 'Ledger Help & SOP', '/compliance/admin/settings/ledger-help', 'ca000000-0000-0000-0000-000000000118', 6, true, true, 'HelpCircle', 'Role-based SOPs, help manual, and troubleshooting')
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  is_enabled = EXCLUDED.is_enabled,
  show_in_menu = EXCLUDED.show_in_menu;

-- 5. Update Geography sort order (stays under Admin)
UPDATE app_modules SET sort_order = 30 WHERE id = 'ca000000-0000-0000-0000-000000000120';

-- 6. Update Staff sort order (stays under Admin)  
UPDATE app_modules SET sort_order = 35 WHERE id = 'ca000000-0000-0000-0000-000000000130';

-- Link Legacy Inspectors
UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000130', sort_order = 4
WHERE name = 'ce_link_legacy' OR (route = '/compliance/admin/staff/link-legacy' AND parent_id = 'ca000000-0000-0000-0000-000000000130');

-- 7. Re-parent Testing & Diagnostics items → 140
UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000140', sort_order = 1
WHERE id = 'ca000000-0000-0000-0000-000000000096'; -- Rule Simulator

UPDATE app_modules SET parent_id = 'ca000000-0000-0000-0000-000000000140', sort_order = 2
WHERE id = 'ca000000-0000-0000-0000-000000000097'; -- Risk Simulator

-- Add DB Diagram under Testing & Diagnostics
INSERT INTO app_modules (id, name, display_name, route, parent_id, sort_order, is_enabled, show_in_menu, icon, description)
VALUES
  ('ca000000-0000-0000-0000-000000000141', 'ce_db_diagram', 'DB Diagram', '/db-diagram', 'ca000000-0000-0000-0000-000000000140', 3, true, true, 'Network', 'Visual schema diagram for compliance tables')
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order,
  is_enabled = EXCLUDED.is_enabled,
  show_in_menu = EXCLUDED.show_in_menu;