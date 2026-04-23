
## Fix the publish blocker by collapsing the conflicting compliance-view migration chain, then re-aligning Live once

### What is confirmed
- The current publish failure is:
```sql
ERROR: 2BP01: cannot drop view dashboard_v_employer_compliance_status because other objects depend on it
DETAIL: view dashboard_v_compliance_distribution depends on view dashboard_v_employer_compliance_status
```
- The stored view SQL in both Test and Live is currently the same:
  - `dashboard_v_employer_compliance_status` exists
  - `dashboard_v_compliance_distribution` is still the older inline version
  - `dashboard_v_compliance_metrics` is still the older inline version
- Both environments already have all `dashboard_v_%` views present (`14` total).
- That means the blocker is no longer “missing object in Live”. The blocker is the migration history for these 3 views.

### Root cause
The compliance dashboard view chain has been rewritten multiple times across these migrations:
- `20260422102659_207c2603-2da9-48ec-b549-48880660e8c8_bootstrap_dashboard_employer_compliance_status.sql`
- `20260422102700_e8ed6cdd-3055-4c1c-a249-abd303d4fdc6.sql`
- `20260422102813_e106fcf1-2f02-40c5-ae7f-5e47a7204efa.sql`
- `20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql`
- `20260423140526_d0dad13a-b076-43b7-a164-4ba459f79b3c.sql`
- `20260423141322_207c2603-2da9-48ec-b549-48880660e8c8.sql`
- `20260423144024_b8b212a0-e56f-4839-a309-5457c842b3ac.sql`

The publish worker is generating a self-conflicting apply sequence from that history:
1. a dependent view is made to reference `dashboard_v_employer_compliance_status`
2. later in the same publish flow the base view is treated like it must be dropped/replaced
3. PostgreSQL blocks the drop because the new dependent already exists

So the remaining problem is the migration graph itself, not the persisted schema snapshot.

### Implementation
#### 1) Neutralize the conflicting migration chain
Replace the contents of these compliance-view repair/bootstrap migrations with a no-op:
- `20260422102659_207c2603-2da9-48ec-b549-48880660e8c8_bootstrap_dashboard_employer_compliance_status.sql`
- `20260422102700_e8ed6cdd-3055-4c1c-a249-abd303d4fdc6.sql`
- `20260422102813_e106fcf1-2f02-40c5-ae7f-5e47a7204efa.sql`
- `20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql`
- `20260423140526_d0dad13a-b076-43b7-a164-4ba459f79b3c.sql`
- `20260423141322_207c2603-2da9-48ec-b549-48880660e8c8.sql`
- `20260423144024_b8b212a0-e56f-4839-a309-5457c842b3ac.sql`

Use:
```sql
SELECT 1;
```

This removes the broken historical instructions that are causing the publish worker to build an invalid drop/create order.

#### 2) Add one new canonical migration for the 3 views
Create one new migration that becomes the single source of truth for the compliance dashboard views.

File:
- `supabase/migrations/<new_timestamp>_rebuild_dashboard_compliance_views_canonical.sql`

In that migration:
1. Drop dependents first
2. Drop base
3. Recreate base
4. Recreate dependents

Use explicit order:
```sql
DROP VIEW IF EXISTS public.dashboard_v_compliance_metrics;
DROP VIEW IF EXISTS public.dashboard_v_compliance_distribution;
DROP VIEW IF EXISTS public.dashboard_v_employer_compliance_status;

CREATE VIEW public.dashboard_v_employer_compliance_status AS ...;
CREATE VIEW public.dashboard_v_compliance_distribution AS ...;
CREATE VIEW public.dashboard_v_compliance_metrics AS ...;
```

#### 3) Use one final canonical definition set
Use:
- Base view logic from `20260422102813...` / `20260423135757...`
- Dependent view logic from `20260422102700...` / `20260423144024...`

Canonical target:
- `dashboard_v_employer_compliance_status`
  - active employers from `er_master`
  - latest compliance status from `ce_employer_compliance_status`
  - violation severity fallback
  - bucket output only:
    - `Compliant`
    - `Minor Issues`
    - `Under Review`
    - `Non-Compliant`
- `dashboard_v_compliance_distribution`
  - must read from `public.dashboard_v_employer_compliance_status`
- `dashboard_v_compliance_metrics`
  - `compliant_employers` must read from `public.dashboard_v_employer_compliance_status`

#### 4) Apply the canonical migration in Test
After the new migration is created:
- let it rebuild the 3 views in Test
- confirm the actual Test schema now matches the canonical SQL

#### 5) Manually align Live once using the same canonical SQL
Because publish is currently blocked, run the same canonical view rebuild SQL directly in the Live SQL runner once.

Important:
- drop dependents first
- then drop base
- then recreate base and dependents
- no `CASCADE`
- no table changes
- no data migration

This follows the project migration standard for persistent schema-conflict publish loops: neutralize the breaking migrations and manually align Live once.

### Verification
Run these checks in both Test and Live after the canonical rebuild.

#### A. All 3 views exist
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

#### B. Dependency shape is correct
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

#### C. Exact definitions match between Test and Live
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

#### D. No other dashboard gaps exist
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

#### E. Publish again
Expected result:
- no `42P01`
- no `2BP01`
- no further blocker from the compliance dashboard view chain

### Files to change
| Change | File |
|---|---|
| Neutralize old bootstrap/repair migrations | `supabase/migrations/20260422102659_207c2603-2da9-48ec-b549-48880660e8c8_bootstrap_dashboard_employer_compliance_status.sql` |
| Neutralize old conflicting migration | `supabase/migrations/20260422102700_e8ed6cdd-3055-4c1c-a249-abd303d4fdc6.sql` |
| Neutralize old conflicting migration | `supabase/migrations/20260422102813_e106fcf1-2f02-40c5-ae7f-5e47a7204efa.sql` |
| Neutralize old conflicting migration | `supabase/migrations/20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql` |
| Neutralize duplicate bootstrap | `supabase/migrations/20260423140526_d0dad13a-b076-43b7-a164-4ba459f79b3c.sql` |
| Neutralize duplicate bootstrap | `supabase/migrations/20260423141322_207c2603-2da9-48ec-b549-48880660e8c8.sql` |
| Neutralize late dependent rewrite | `supabase/migrations/20260423144024_b8b212a0-e56f-4839-a309-5457c842b3ac.sql` |
| Add single canonical rebuild migration | `supabase/migrations/<new_timestamp>_rebuild_dashboard_compliance_views_canonical.sql` |

### Expected outcome
This removes the conflicting historical instructions that are causing the publish worker to generate an invalid drop order, while preserving one final canonical definition for the 3 compliance views. After the one-time Live alignment, there should be no remaining issue in this dependency chain to stop publish.
