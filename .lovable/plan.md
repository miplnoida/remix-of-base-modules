
Fix the remaining publish blocker by removing both destructive compliance-view migrations from the publish path, then re-align the 3 views non-destructively.

### What is confirmed now
- The current publish failure is still:
  ```sql
  ERROR: 2BP01: cannot drop view dashboard_v_employer_compliance_status because other objects depend on it
  DETAIL: view dashboard_v_compliance_metrics depends on view dashboard_v_employer_compliance_status
  view dashboard_v_compliance_distribution depends on view dashboard_v_employer_compliance_status
  ```
- The repo still contains **2 destructive migrations** for this same dependency chain:
  - `supabase/migrations/20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql`
  - `supabase/migrations/20260423145045_344860a0-36b0-4491-a713-8bf3e8d3b1aa.sql`
- Both of those files explicitly drop:
  - `dashboard_v_compliance_metrics`
  - `dashboard_v_compliance_distribution`
  - `dashboard_v_employer_compliance_status`
- Test already has the canonical dependency graph:
  - `dashboard_v_compliance_distribution` reads from `dashboard_v_employer_compliance_status`
  - `dashboard_v_compliance_metrics` reads from `dashboard_v_employer_compliance_status`
- Live is still not fully aligned:
  - `dashboard_v_employer_compliance_status` is canonical
  - `dashboard_v_compliance_metrics` is canonical
  - `dashboard_v_compliance_distribution` is still the legacy inline definition

### Root cause
There are now **two separate issues**:

1. **Publish-path blocker**
   - The migration history still contains destructive DROP VIEW instructions.
   - During publish, once dependents point at `dashboard_v_employer_compliance_status`, PostgreSQL rejects dropping the base view.

2. **Live drift still exists**
   - Live’s `dashboard_v_compliance_distribution` does not yet match Test.
   - Even after removing destructive migrations, Live still needs the final non-destructive alignment for clean parity.

### Implementation
#### 1) Neutralize both destructive migrations
Replace the contents of these files with:
```sql
SELECT 1;
```

Files:
- `supabase/migrations/20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql`
- `supabase/migrations/20260423145045_344860a0-36b0-4491-a713-8bf3e8d3b1aa.sql`

This removes every remaining publish-time drop of `dashboard_v_employer_compliance_status`.

#### 2) Keep one final non-destructive alignment migration
Use one canonical migration that only does:
```sql
CREATE OR REPLACE VIEW public.dashboard_v_employer_compliance_status AS ...;
CREATE OR REPLACE VIEW public.dashboard_v_compliance_distribution AS ...;
CREATE OR REPLACE VIEW public.dashboard_v_compliance_metrics AS ...;
```

Requirements:
- no `DROP VIEW`
- no `CASCADE`
- no table changes
- no app code changes

If `supabase/migrations/20260423151406_377a538e-90b8-4761-a030-badd4e94ebf5.sql` already contains the correct canonical definitions, keep it as the single alignment migration.

#### 3) Canonical definition set to preserve
Use the current Test definitions as source of truth:
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
  - output shape remains `(name, value, color)`
- `dashboard_v_compliance_metrics`
  - `compliant_employers` reads from `public.dashboard_v_employer_compliance_status`
  - output shape remains `(total_employers, compliant_employers, active_violations, pending_audits)`

#### 4) Re-check Live alignment after the migration cleanup
Because Live still shows a legacy `dashboard_v_compliance_distribution`, verify whether the existing non-destructive alignment migration updates it on next publish.

If Live still does not match after destructive migrations are neutralized, run the same non-destructive `CREATE OR REPLACE VIEW` SQL once on Live again.

### Why this should fix publish now
- The blocker is no longer just Live drift.
- The repo still contains destructive migrations that force an invalid drop order during publish.
- Removing both destructive files eliminates the `2BP01` trigger.
- Keeping one final `CREATE OR REPLACE VIEW` migration preserves dependencies while aligning Live to Test.

### Verification
Run all of these after implementation.

#### A. Confirm no destructive compliance-view migration remains
Search migration files for:
```sql
DROP VIEW IF EXISTS public.dashboard_v_employer_compliance_status
DROP VIEW IF EXISTS public.dashboard_v_compliance_distribution
DROP VIEW IF EXISTS public.dashboard_v_compliance_metrics
```
Expected: no remaining matches in the compliance-view repair chain.

#### B. Confirm Test definitions
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

#### C. Confirm Live definitions
Run the same query in Live and confirm all 3 match Test exactly.

#### D. Confirm dependency shape in Live
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

#### E. Publish again
Expected result:
- no `2BP01`
- no compliance-view drop-order failure
- no remaining blocker from this dashboard dependency chain

### Files to change
| Change | File |
|---|---|
| Neutralize destructive migration | `supabase/migrations/20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql` |
| Neutralize destructive migration | `supabase/migrations/20260423145045_344860a0-36b0-4491-a713-8bf3e8d3b1aa.sql` |
| Keep/use final non-destructive alignment migration | `supabase/migrations/20260423151406_377a538e-90b8-4761-a030-badd4e94ebf5.sql` |

### Expected outcome
After this change, the publish path will no longer attempt to drop `dashboard_v_employer_compliance_status`, and Live can be brought to the same 3-view dependency graph as Test using only non-destructive view replacement.
