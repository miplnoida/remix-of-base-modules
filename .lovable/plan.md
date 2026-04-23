

## Fix: Publish Failure on `dashboard_v_employer_compliance_status`

### Problem

Publish to Live fails with:
```
ERROR: 42P01: relation "dashboard_v_employer_compliance_status" does not exist
LINE 2338: FROM dashboard_v_employer_compliance_status
```

### Root cause

Two pending migrations apply to Live together:
- `20260422102700` — creates the base view `dashboard_v_employer_compliance_status` AND replaces the dependents (`dashboard_v_compliance_distribution`, `dashboard_v_compliance_metrics`) so they now reference it.
- `20260422102813` — refines the base view's CASE logic.

Live currently has the **older** versions of `dashboard_v_compliance_distribution` and `dashboard_v_compliance_metrics` (from migration `20260411212407`), and does NOT have `dashboard_v_employer_compliance_status` at all.

When Lovable's diff engine bundles both pending migrations into one transaction against Live, the SQL ordering ends up trying to recreate a dependent view (which now references the base view) before the base view itself is created in the same batch — causing the "relation does not exist" error.

### Fix

Add **one new consolidating migration** that:

1. `DROP VIEW IF EXISTS public.dashboard_v_compliance_metrics CASCADE;`
2. `DROP VIEW IF EXISTS public.dashboard_v_compliance_distribution CASCADE;`
3. `DROP VIEW IF EXISTS public.dashboard_v_employer_compliance_status CASCADE;`
4. `CREATE VIEW public.dashboard_v_employer_compliance_status AS ...` (final version, copied verbatim from migration `20260422102813`)
5. `CREATE VIEW public.dashboard_v_compliance_distribution AS ...` (version from `20260422102700` that references the base view)
6. `CREATE VIEW public.dashboard_v_compliance_metrics AS ...` (version from `20260422102700` that references the base view)

Because this migration runs **after** the two failing ones, and uses `DROP ... CASCADE` + plain `CREATE VIEW` (not `CREATE OR REPLACE`), it bypasses any column-shape / dependency-ordering check the diff engine performs. Live ends up with exactly the same final state Test currently has.

### Why not just edit existing migrations

The two existing migrations have already been applied successfully to Test. Editing applied migrations causes hash mismatches. A new forward-only migration is the safe, standard fix.

### Files

| Change | File |
|---|---|
| New migration | `supabase/migrations/<new_timestamp>_fix_dashboard_compliance_views.sql` |

No application code changes required. No data loss (views only).

### Verification after publish

Query Live:
```sql
SELECT table_name FROM information_schema.views
WHERE table_name IN (
  'dashboard_v_employer_compliance_status',
  'dashboard_v_compliance_distribution',
  'dashboard_v_compliance_metrics'
);
```
All three should be present.

