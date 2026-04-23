
## Fix the remaining Live publish blocker by aligning the dashboard view graph, then verifying parity

### What is confirmed
- The repeated publish failures are all tied to the same dependency cluster:
  - `dashboard_v_employer_compliance_status`
  - `dashboard_v_compliance_distribution`
  - `dashboard_v_compliance_metrics`
- Both Test and Live now contain all 3 views.
- Both Test and Live also contain the full dashboard view set (14 views total), so no other missing dashboard objects were found.
- The base source tables/columns required by the compliance views exist in both environments, including `ce_employer_compliance_status.overall_compliance_status`, `compliance_status`, `last_computed_at`, and `updated_at`.
- The remaining mismatch is definition parity:
  - Test: `dashboard_v_compliance_distribution` and `dashboard_v_compliance_metrics` depend on `dashboard_v_employer_compliance_status`
  - Live: those 2 views still use the older inline logic and do not reference the base view
- The two publish errors seen (`42P01` missing relation and `2BP01` cannot drop because dependents exist) are both symptoms of the publish diff trying to reconcile this mismatched view graph.

### Root cause
This is no longer a “missing migration timestamp” issue.

The blocker is that Test and Live have different definitions for the two dependent compliance views. During publish, the backend tries to transform Live’s old view graph into Test’s newer graph and hits ordering/dependency problems while rewriting the 3 related views.

### Fix approach
Do a one-time direct Live schema alignment for these 3 views so Live already matches Test before the next publish.

Do not add more bootstrap migrations.
Do not edit or delete already-applied migrations.
Do not drop the base view in Live.

### Implementation
1. In Live SQL runner, apply a manual patch that sets the 3 views to the exact current Test definitions:
   - `CREATE OR REPLACE VIEW public.dashboard_v_employer_compliance_status AS ...`
   - `CREATE OR REPLACE VIEW public.dashboard_v_compliance_distribution AS ...`
   - `CREATE OR REPLACE VIEW public.dashboard_v_compliance_metrics AS ...`

2. Use the current Test logic exactly:
   - Base view logic from the current Test definition:
     - active employers from `er_master`
     - latest status from `ce_employer_compliance_status`
     - fallback from open violation severity
     - buckets mapped to:
       - `Compliant`
       - `Minor Issues`
       - `Under Review`
       - `Non-Compliant`
   - Distribution view must read from `dashboard_v_employer_compliance_status`
   - Metrics view must read compliant counts from `dashboard_v_employer_compliance_status`

3. Important safety rule for the Live patch:
   - Do not `DROP VIEW public.dashboard_v_employer_compliance_status`
   - Do not use `DROP ... CASCADE` on the base view
   - Prefer `CREATE OR REPLACE VIEW` for all 3 objects so the dependency graph is preserved instead of torn down

4. Leave these migration files in place unchanged:
   - `20260422102700_e8ed6cdd-3055-4c1c-a249-abd303d4fdc6.sql`
   - `20260422102813_e106fcf1-2f02-40c5-ae7f-5e47a7204efa.sql`
   - `20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql`
   - existing bootstrap files  
   They are no longer the publish blocker; the blocker is Live schema parity.

### Verification
After the Live patch, verify all of the following before publishing again:

1. All 3 views exist in Live:
```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'dashboard_v_employer_compliance_status',
    'dashboard_v_compliance_distribution',
    'dashboard_v_compliance_metrics'
  )
ORDER BY table_name;
```

2. Live now has the same dependency shape as Test:
```sql
SELECT viewname
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%dashboard_v_employer_compliance_status%'
ORDER BY viewname;
```
Expected result:
- `dashboard_v_compliance_distribution`
- `dashboard_v_compliance_metrics`

3. Compare exact view SQL between Test and Live for the 3 views:
```sql
SELECT viewname, pg_get_viewdef(('public.' || viewname)::regclass, true) AS definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'dashboard_v_employer_compliance_status',
    'dashboard_v_compliance_distribution',
    'dashboard_v_compliance_metrics'
  )
ORDER BY viewname;
```
The definitions must match Test.

4. Confirm no additional dashboard schema gaps exist:
```sql
SELECT COUNT(*) AS dashboard_view_count
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE 'dashboard_v_%';
```
Expected result in both environments: `14`

5. Publish again.

### Expected outcome
Once Live’s 3 compliance views match Test exactly, the publish diff should no longer need to rewrite this dependency chain, which removes the known blocker.

### Technical details
- No other publish-stopping dashboard issue is currently visible from schema inspection.
- The base source tables are present in both environments.
- The blocker is isolated to view-definition parity, not missing data tables or missing columns.
- This is a non-destructive fix: views only, no table drops, no data migration.
