
-- ============================================================
-- Compliance Classic: DB-driven mirror of original Compliance
-- ============================================================

DO $$
DECLARE
  v_classic_parent uuid := 'cc000000-0000-0000-0000-000000000001';
  v_compliance_audit uuid := 'ca000000-0000-0000-0000-000000000001';
  v_old_sort int;
BEGIN
  -- 1. Top-level Compliance Classic parent (idempotent)
  SELECT sort_order INTO v_old_sort FROM app_modules WHERE id = v_compliance_audit;

  INSERT INTO app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu, rollout_state)
  VALUES (v_classic_parent, 'compliance_classic', 'Compliance Classic',
          'Legacy Compliance navigation hierarchy. Mirrors the original menu structure but reuses current Compliance routes/components.',
          'ShieldCheck', NULL, NULL, COALESCE(v_old_sort, 702) + 1, true, true, 'public')
  ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        is_enabled   = true,
        show_in_menu = true,
        icon         = EXCLUDED.icon,
        sort_order   = EXCLUDED.sort_order,
        updated_at   = now();
END $$;

-- 2. Build mapping of every "old" Compliance descendant -> new mirror id
--    The 9 OLD section parents are children of compliance_audit that the
--    pre-restructure menu used (currently kept with show_in_menu = false).
DROP TABLE IF EXISTS tmp_classic_map;
CREATE TEMP TABLE tmp_classic_map (
  old_id uuid PRIMARY KEY,
  new_id uuid NOT NULL,
  old_parent_id uuid,
  depth int NOT NULL
);

WITH RECURSIVE old_tree AS (
  SELECT m.id, m.parent_id, 0 AS depth
  FROM app_modules m
  WHERE m.id IN (
    'ca000000-0000-0000-0000-000000000011', -- Dashboard
    'ca000000-0000-0000-0000-000000000020', -- Violations
    'ca000000-0000-0000-0000-000000000025', -- Compliance Cases
    'ca000000-0000-0000-0000-000000000032', -- Inspections
    'ca000000-0000-0000-0000-000000000070', -- Legal Escalations
    'ca000000-0000-0000-0000-000000000080', -- Reports
    'ca000000-0000-0000-0000-000000000100', -- Setup
    'ca000000-0000-0000-0000-000000000200', -- Field
    'ca000000-0000-0000-0000-000000000300'  -- Enforcement
  )
  UNION ALL
  SELECT c.id, c.parent_id, ot.depth + 1
  FROM app_modules c
  JOIN old_tree ot ON c.parent_id = ot.id
)
INSERT INTO tmp_classic_map (old_id, new_id, old_parent_id, depth)
SELECT
  id,
  CASE
    WHEN substring(id::text, 1, 2) = 'ca' THEN ('cc' || substring(id::text, 3))::uuid
    WHEN substring(id::text, 1, 2) = 'cb' THEN ('cd' || substring(id::text, 3))::uuid
    ELSE md5('compliance_classic::' || id::text)::uuid
  END,
  parent_id,
  depth
FROM old_tree;

-- 3. Insert mirrored app_modules rows level-by-level so parent_id resolves.
INSERT INTO app_modules (
  id, name, display_name, description, icon, route, parent_id,
  sort_order, is_enabled, show_in_menu, rollout_state,
  primary_table, primary_key_column, business_key_column,
  routes_enabled, actions_enabled, internal_only
)
SELECT
  map.new_id,
  'classic_' || src.name,
  src.display_name,
  src.description,
  src.icon,
  src.route,
  COALESCE(
    (SELECT pmap.new_id FROM tmp_classic_map pmap WHERE pmap.old_id = src.parent_id),
    'cc000000-0000-0000-0000-000000000001'::uuid
  ),
  src.sort_order,
  true,
  true,
  src.rollout_state,
  src.primary_table,
  src.primary_key_column,
  src.business_key_column,
  src.routes_enabled,
  src.actions_enabled,
  src.internal_only
FROM tmp_classic_map map
JOIN app_modules src ON src.id = map.old_id
ORDER BY map.depth
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    route        = EXCLUDED.route,
    icon         = EXCLUDED.icon,
    parent_id    = EXCLUDED.parent_id,
    sort_order   = EXCLUDED.sort_order,
    is_enabled   = true,
    show_in_menu = true,
    updated_at   = now();

-- 4. Copy module_actions from each original module to its mirror.
--    The auto_grant_admin_permission trigger fires for each new action,
--    so Admin automatically receives all mirrored permissions.
INSERT INTO module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT map.new_id, a.action_name, a.display_name, a.description, a.is_enabled
FROM tmp_classic_map map
JOIN module_actions a ON a.module_id = map.old_id
ON CONFLICT (module_id, action_name) DO NOTHING;

-- 5. Copy non-admin role_permissions from original modules to mirrors,
--    matching actions by action_name.
INSERT INTO role_permissions (role_id, module_id, action_id, is_granted)
SELECT DISTINCT rp.role_id, map.new_id, new_a.id, rp.is_granted
FROM tmp_classic_map map
JOIN role_permissions rp ON rp.module_id = map.old_id
JOIN module_actions old_a ON old_a.id = rp.action_id
JOIN module_actions new_a ON new_a.module_id = map.new_id AND new_a.action_name = old_a.action_name
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

-- 6. Reconciliation view
CREATE OR REPLACE VIEW public.v_compliance_classic_reconciliation AS
WITH RECURSIVE classic_tree AS (
  SELECT id, name, display_name, route, parent_id, sort_order,
         display_name::text AS classic_path,
         1 AS depth
  FROM app_modules
  WHERE id = 'cc000000-0000-0000-0000-000000000001'
  UNION ALL
  SELECT c.id, c.name, c.display_name, c.route, c.parent_id, c.sort_order,
         ct.classic_path || ' / ' || c.display_name,
         ct.depth + 1
  FROM app_modules c
  JOIN classic_tree ct ON c.parent_id = ct.id
)
SELECT
  ct.classic_path                                  AS classic_menu_path,
  src.route                                        AS old_route,
  ct.route                                         AS current_route_used,
  CASE WHEN ct.route IS NULL THEN 'Section (no route)' ELSE ct.route END AS component,
  ct.id                                            AS db_app_module_id,
  src.name                                         AS permission_source,
  CASE
    WHEN ct.route IS NULL AND ct.id <> 'cc000000-0000-0000-0000-000000000001' THEN 'OK (Section)'
    WHEN ct.route IS NULL THEN 'OK (Root)'
    WHEN src.id IS NULL THEN 'Component Missing'
    WHEN NOT EXISTS (SELECT 1 FROM module_actions ma WHERE ma.module_id = ct.id) THEN 'Permission Missing'
    ELSE 'OK'
  END                                              AS status
FROM classic_tree ct
LEFT JOIN app_modules src
  ON src.id = CASE
                WHEN substring(ct.id::text, 1, 2) = 'cc' THEN ('ca' || substring(ct.id::text, 3))::uuid
                WHEN substring(ct.id::text, 1, 2) = 'cd' THEN ('cb' || substring(ct.id::text, 3))::uuid
                ELSE NULL
              END
ORDER BY ct.classic_path;

GRANT SELECT ON public.v_compliance_classic_reconciliation TO authenticated, anon, service_role;
