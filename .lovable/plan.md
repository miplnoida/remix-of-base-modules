
Fix the publish blocker by collapsing the conflicting compliance-view migration chain into one safe, first-time-create path for Live.

### What is confirmed now
- Test has the canonical 3 compliance dashboard views:
  - `dashboard_v_employer_compliance_status`
  - `dashboard_v_compliance_distribution`
  - `dashboard_v_compliance_metrics`
- Live currently has none of those 3 views.
- Live currently has only `11` `dashboard_v_%` views, so the compliance trio is missing there.
- The repo still contains three conflicting migrations in this chain:
  - `supabase/migrations/20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql`
    - destructive `DROP VIEW ... CASCADE`
  - `supabase/migrations/20260423145045_344860a0-36b0-4491-a713-8bf3e8d3b1aa.sql`
    - destructive `DROP VIEW`
  - `supabase/migrations/20260423144024_b8b212a0-e56f-4839-a309-5457c842b3ac.sql`
    - updates dependent views only and assumes `dashboard_v_employer_compliance_status` already exists
- The current final canonical migration is:
  - `supabase/migrations/20260423151406_377a538e-90b8-4761-a030-badd4e94ebf5.sql`
  - it creates/replaces all 3 views in correct order.

### Root cause
This is now a migration-chain problem, not a one-off Live SQL problem.

Two different failure modes are being triggered by the same broken chain:
1. `2BP01` happens because the repo still contains destructive migrations that try to drop `dashboard_v_employer_compliance_status` after dependents exist.
2. `42P01` happens because Live does not yet have the base compliance view, while one intermediate migration tries to update dependent views that reference it.

That is why repeating manual SQL on Live has not solved publish: the next publish still encounters the broken migration history.

### Proper solution
#### 1) Neutralize the broken intermediate migrations
Replace the contents of these files with:
```sql
SELECT 1;
```

Files:
- `supabase/migrations/20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql`
- `supabase/migrations/20260423145045_344860a0-36b0-4491-a713-8bf3e8d3b1aa.sql`
- `supabase/migrations/20260423144024_b8b212a0-e56f-4839-a309-5457c842b3ac.sql`

Why:
- removes every remaining destructive drop in this chain
- removes the partial dependent-only step that can fail on Live when the base view is absent
- leaves one final migration responsible for the full canonical state

#### 2) Keep one single canonical full migration
Use `supabase/migrations/20260423151406_377a538e-90b8-4761-a030-badd4e94ebf5.sql` as the only active compliance-view alignment step.

It should remain a full, non-destructive definition of all 3 views in this order:
1. `dashboard_v_employer_compliance_status`
2. `dashboard_v_compliance_distribution`
3. `dashboard_v_compliance_metrics`

Requirements:
- `CREATE OR REPLACE VIEW` only
- no `DROP VIEW`
- no `CASCADE`
- no table changes
- no app code changes

#### 3) Preserve the current Test definitions as source of truth
Keep the current canonical logic already present in Test:
- `dashboard_v_employer_compliance_status`
  - active employers from `er_master`
  - latest status from `ce_employer_compliance_status`
  - violation severity fallback
  - bucket outputs limited to:
    - `Compliant`
    - `Minor Issues`
    - `Under Review`
    - `Non-Compliant`
- `dashboard_v_compliance_distribution`
  - reads from `public.dashboard_v_employer_compliance_status`
  - output shape stays `(name, value, color)`
- `dashboard_v_compliance_metrics`
  - `compliant_employers` reads from `public.dashboard_v_employer_compliance_status`
  - output shape stays `(total_employers, compliant_employers, active_violations, pending_audits)`

### Why this should finally fix publish
- Live is missing the compliance trio entirely, so the fix must support first-time creation.
- The current chain contains both:
  - destructive rebuilds that trigger `2BP01`
  - a partial dependent-only migration that can trigger `42P01`
- After neutralizing those three files, publish is left with one safe migration that creates/replaces the full trio in dependency order.
- That gives Live a single valid path from “missing views” to “canonical views” without destructive drops.

### Verification
#### A. Confirm the broken chain is gone
Search the migrations for:
```sql
DROP VIEW IF EXISTS public.dashboard_v_employer_compliance_status
DROP VIEW IF EXISTS public.dashboard_v_compliance_distribution
DROP VIEW IF EXISTS public.dashboard_v_compliance_metrics
```
Expected:
- no remaining matches in this compliance repair chain

Also confirm no remaining active migration references the base view without defining it first.

#### B. Confirm Test still has canonical definitions
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

#### C. Publish again
Expected:
- no `2BP01`
- no `42P01`

#### D. Confirm Live now has the 3 views
```sql
SELECT viewname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'dashboard_v_employer_compliance_status',
    'dashboard_v_compliance_distribution',
    'dashboard_v_compliance_metrics'
  )
ORDER BY viewname;
```
Expected:
- all 3 rows returned

#### E. Confirm dependency shape in Live
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

#### F. Confirm dashboard view count
```sql
SELECT COUNT(*) AS dashboard_view_count
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE 'dashboard_v_%';
```
Expected in Live:
```sql
14
```

### Files to change
| Change | File |
|---|---|
| Neutralize destructive migration | `supabase/migrations/20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql` |
| Neutralize dependent-only migration | `supabase/migrations/20260423144024_b8b212a0-e56f-4839-a309-5457c842b3ac.sql` |
| Neutralize destructive migration | `supabase/migrations/20260423145045_344860a0-36b0-4491-a713-8bf3e8d3b1aa.sql` |
| Keep as the single canonical full alignment migration | `supabase/migrations/20260423151406_377a538e-90b8-4761-a030-badd4e94ebf5.sql` |

### Expected outcome
After this cleanup, the compliance dashboard migration path will no longer contain:
- a destructive drop of the base view
- a partial dependent-only step that assumes the base already exists

The next publish should be able to create the missing Live compliance views from scratch and align Live to Test without hitting either `2BP01` or `42P01`.
