
Fix the publish blocker by removing the one destructive migration that is still forcing an invalid drop order, then re-apply the compliance views non-destructively.

### What is confirmed
- The current Live publish blocker is still:
  ```sql
  ERROR: 2BP01: cannot drop view dashboard_v_employer_compliance_status because other objects depend on it
  DETAIL: view dashboard_v_compliance_distribution depends on view dashboard_v_employer_compliance_status
  ```
- Test currently has the canonical dependency graph:
  - `dashboard_v_employer_compliance_status`
  - `dashboard_v_compliance_distribution` depends on the base view
  - `dashboard_v_compliance_metrics` depends on the base view
- Live currently has:
  - the base view already present in final shape
  - the dependent views still in the older inline shape
- The migration most directly causing the current failure is:
  - `supabase/migrations/20260423145045_344860a0-36b0-4491-a713-8bf3e8d3b1aa.sql`
- That file explicitly does:
  ```sql
  DROP VIEW IF EXISTS public.dashboard_v_compliance_metrics;
  DROP VIEW IF EXISTS public.dashboard_v_compliance_distribution;
  DROP VIEW IF EXISTS public.dashboard_v_employer_compliance_status;
  ```
  which is exactly consistent with the `2BP01` failure.

### Root cause
The blocker is no longer a missing object problem.

The current blocker is a destructive migration in the history that tries to drop the base compliance view during publish. By the time the publish worker reaches that drop, the dependency graph already treats `dashboard_v_compliance_distribution` as depending on `dashboard_v_employer_compliance_status`, so PostgreSQL rejects the drop.

### Fix
#### 1) Neutralize the breaking destructive migration
Replace the contents of this file with a no-op:
- `supabase/migrations/20260423145045_344860a0-36b0-4491-a713-8bf3e8d3b1aa.sql`

Use:
```sql
SELECT 1;
```

This removes the exact drop sequence that is triggering the current `2BP01`.

#### 2) Add one new safe canonical migration
Create a new migration that aligns all 3 compliance views using only `CREATE OR REPLACE VIEW`.

File:
- `supabase/migrations/<new_timestamp>_align_dashboard_compliance_views_non_destructive.sql`

Use this approach:
```sql
CREATE OR REPLACE VIEW public.dashboard_v_employer_compliance_status AS ...;

CREATE OR REPLACE VIEW public.dashboard_v_compliance_distribution AS
WITH base AS (
  SELECT bucket FROM public.dashboard_v_employer_compliance_status
)
...

CREATE OR REPLACE VIEW public.dashboard_v_compliance_metrics AS
SELECT
  ...,
  (SELECT count(*)::integer
   FROM public.dashboard_v_employer_compliance_status
   WHERE bucket = 'Compliant') AS compliant_employers,
  ...;
```

Important:
- no `DROP VIEW`
- no `CASCADE`
- no table changes
- no app code changes

#### 3) Use the current canonical definitions already proven in Test
Use the current Test definitions as the source of truth:
- base view logic matching the existing final definition of `dashboard_v_employer_compliance_status`
- dependent view logic matching the existing canonical Test definitions that read from the base view

That means:
- `dashboard_v_employer_compliance_status`
  - active employers from `er_master`
  - latest status from `ce_employer_compliance_status`
  - violation severity fallback
  - outputs only:
    - `Compliant`
    - `Minor Issues`
    - `Under Review`
    - `Non-Compliant`
- `dashboard_v_compliance_distribution`
  - reads from `public.dashboard_v_employer_compliance_status`
- `dashboard_v_compliance_metrics`
  - `compliant_employers` reads from `public.dashboard_v_employer_compliance_status`

### Why this should fix publish
- The current failure is caused by a `DROP VIEW` sequence.
- After neutralizing `20260423145045...`, there is no remaining migration that needs to drop `dashboard_v_employer_compliance_status` in order to align these 3 views.
- A new `CREATE OR REPLACE VIEW` migration is non-destructive and preserves the dependency chain while bringing Live to the same view definitions as Test.
- This removes the exact condition that triggers `2BP01`.

### Verification
After implementation, verify all of the following.

#### A. Test view definitions are canonical
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

#### B. Publish again

#### C. Live now has the correct dependency shape
```sql
SELECT viewname
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%dashboard_v_employer_compliance_status%'
ORDER BY viewname;
```
Expected:
- `dashboard_v_compliance_distribution`
- `dashboard_v_compliance_metrics`

#### D. Test and Live definitions match
Run the same `pg_get_viewdef` query in both environments and confirm parity for the same 3 views.

#### E. No dashboard view gaps exist
```sql
SELECT COUNT(*) AS dashboard_view_count
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE 'dashboard_v_%';
```
Expected in both environments:
```sql
14
```

### Files to change
| Change | File |
|---|---|
| Neutralize breaking destructive migration | `supabase/migrations/20260423145045_344860a0-36b0-4491-a713-8bf3e8d3b1aa.sql` |
| Add safe canonical alignment migration | `supabase/migrations/<new_timestamp>_align_dashboard_compliance_views_non_destructive.sql` |

### Expected outcome
After this change, the compliance dashboard migration chain will no longer contain a publish-time drop of `dashboard_v_employer_compliance_status`, and the next publish should be able to align Live without hitting `2BP01`.

If Live still resists alignment after that, the same non-destructive `CREATE OR REPLACE VIEW` SQL can be run once directly against Live, but the primary fix is removing the destructive migration from the publish path.
