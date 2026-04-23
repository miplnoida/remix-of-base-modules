
Fix the publish blocker by removing the broken mid-chain compliance view migrations that fail before the final safe migration can run.

### What is confirmed now
- Both environments currently have only `11` dashboard views.
- Both environments are missing all 3 compliance views:
  - `dashboard_v_employer_compliance_status`
  - `dashboard_v_compliance_distribution`
  - `dashboard_v_compliance_metrics`
- The current publish failure is still caused by a migration-order problem, not by frontend code.
- The repo still contains these broken migrations:
  - `supabase/migrations/20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql`
    - destructive `DROP VIEW ... CASCADE`
  - `supabase/migrations/20260423144024_b8b212a0-e56f-4839-a309-5457c842b3ac.sql`
    - updates dependent views only and assumes the base view already exists
  - `supabase/migrations/20260423145045_344860a0-36b0-4491-a713-8bf3e8d3b1aa.sql`
    - destructive `DROP VIEW`
- The recently added file
  - `supabase/migrations/20260423153921_12a5e532-b595-475c-be6d-ca5975dc4e50.sql`
  is not fixing publish because the failure happens earlier in the chain.

### Root cause
The migration chain still contains two invalid behaviors:

1. Destructive rebuild steps
   - They attempt to drop `dashboard_v_employer_compliance_status`.
   - When dependents exist, publish hits `2BP01`.

2. Dependent-only step before guaranteed base creation
   - `20260423144024...` references `dashboard_v_employer_compliance_status` without creating it.
   - When the base view is absent, publish hits `42P01`.

The newly added non-destructive migration is too late in the sequence to rescue the chain. Publish fails before it gets there.

### Proper fix
#### 1) Neutralize the broken intermediate migrations
Replace the full contents of these files with:
```sql
SELECT 1;
```

Files:
- `supabase/migrations/20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql`
- `supabase/migrations/20260423144024_b8b212a0-e56f-4839-a309-5457c842b3ac.sql`
- `supabase/migrations/20260423145045_344860a0-36b0-4491-a713-8bf3e8d3b1aa.sql`

#### 2) Collapse the duplicate end-state migrations to one canonical file
Keep only one active full compliance alignment migration.

Recommended:
- Keep `supabase/migrations/20260423151406_377a538e-90b8-4761-a030-badd4e94ebf5.sql` as the single canonical migration
- Replace the contents of `supabase/migrations/20260423153921_12a5e532-b595-475c-be6d-ca5975dc4e50.sql` with:
```sql
SELECT 1;
```

Why:
- `20260423153921...` is redundant with `20260423151406...`
- keeping one canonical file avoids future ambiguity and diff noise
- the fix becomes: bootstrap path + one final non-destructive alignment step

#### 3) Preserve the canonical non-destructive view definitions
The kept migration must define the 3 views in this order:
1. `dashboard_v_employer_compliance_status`
2. `dashboard_v_compliance_distribution`
3. `dashboard_v_compliance_metrics`

Requirements:
- `CREATE OR REPLACE VIEW` only
- no `DROP VIEW`
- no `CASCADE`
- no table changes
- no app code changes

### Technical details
#### Safe path after cleanup
After neutralization, the effective path becomes:

```text
bootstrap base view if missing
-> create dependent views
-> replace base view with canonical logic
-> final canonical create/replace of all 3 views in dependency order
```

That supports first-time creation cleanly when the views do not exist in Live.

#### Source of truth to preserve
- `dashboard_v_employer_compliance_status`
  - active employers from `er_master`
  - latest status from `ce_employer_compliance_status`
  - violation severity fallback
  - buckets limited to:
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

### Why this should fix publish
- Right now publish fails before the final safe migration can execute.
- Removing the destructive and dependent-only broken steps eliminates both failure modes:
  - `2BP01` from invalid drop order
  - `42P01` from referencing a missing base view
- Because both Test and Live currently lack the trio, the corrected chain must support first-time creation from scratch.
- After cleanup, publish will have one safe route to create the missing views.

### Verification
#### A. Confirm the broken chain is gone
Search migrations for:
```sql
DROP VIEW IF EXISTS public.dashboard_v_employer_compliance_status
DROP VIEW IF EXISTS public.dashboard_v_compliance_distribution
DROP VIEW IF EXISTS public.dashboard_v_compliance_metrics
```
Expected:
- no active matches in the compliance repair chain

Also confirm the dependent-only migration no longer references the base view.

#### B. Confirm only one final canonical migration remains active
Expected:
- `20260423151406_377a538e-90b8-4761-a030-badd4e94ebf5.sql` remains active
- `20260423153921_12a5e532-b595-475c-be6d-ca5975dc4e50.sql` is a no-op

#### C. Confirm Test creates the 3 views
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
Expected:
- all 3 rows returned

#### D. Publish again
Expected:
- no `42P01`
- no `2BP01`

#### E. Confirm Live now has all 3 views
Run the same query in Live.
Expected:
- all 3 rows returned

#### F. Confirm dashboard view count
```sql
SELECT COUNT(*) AS dashboard_view_count
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE 'dashboard_v_%';
```
Expected after fix:
```sql
14
```

### Files to change
| Change | File |
|---|---|
| Neutralize destructive migration | `supabase/migrations/20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql` |
| Neutralize dependent-only migration | `supabase/migrations/20260423144024_b8b212a0-e56f-4839-a309-5457c842b3ac.sql` |
| Neutralize destructive migration | `supabase/migrations/20260423145045_344860a0-36b0-4491-a713-8bf3e8d3b1aa.sql` |
| Keep as single canonical full alignment migration | `supabase/migrations/20260423151406_377a538e-90b8-4761-a030-badd4e94ebf5.sql` |
| Neutralize duplicate rescue migration | `supabase/migrations/20260423153921_12a5e532-b595-475c-be6d-ca5975dc4e50.sql` |

### Expected outcome
After this cleanup, the compliance migration history will no longer contain:
- a destructive drop of the base view
- a dependent-only step that assumes the base already exists
- duplicate end-state migrations competing as the final source of truth

The next publish should be able to create the missing compliance views on Live and complete successfully.
