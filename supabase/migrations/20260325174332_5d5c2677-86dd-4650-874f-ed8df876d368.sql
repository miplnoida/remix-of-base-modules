
INSERT INTO ia_plan_versions (
  id, plan_id, version_number, snapshot_data, status_at_snapshot, change_summary, created_by, created_at
)
SELECT
  gen_random_uuid(),
  p.id,
  1,
  jsonb_build_object(
    'title', p.title,
    'fiscal_year', p.fiscal_year,
    'function_id', p.function_id,
    'risk_level', p.risk_level,
    'status', p.status,
    'assigned_auditor', p.assigned_auditor,
    'planned_start_date', p.planned_start_date,
    'planned_end_date', p.planned_end_date,
    'scope', p.scope,
    'objective', p.objective,
    'methodology', p.methodology,
    'audit_scope', p.audit_scope
  ),
  COALESCE(p.status, 'Draft'),
  'Initial version (backfill)',
  p.created_by,
  COALESCE(p.created_at, now())
FROM ia_annual_plans p
WHERE NOT EXISTS (
  SELECT 1 FROM ia_plan_versions v WHERE v.plan_id = p.id
);
