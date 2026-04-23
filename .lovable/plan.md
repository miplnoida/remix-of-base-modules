
## Fix publish by correcting the bootstrap migration order

### Confirmed issue
- The publish error is still the same:
  ```sql
  ERROR: 42P01: relation "dashboard_v_employer_compliance_status" does not exist
  ```
- Both Test and Live currently have:
  - `dashboard_v_compliance_distribution`
  - `dashboard_v_compliance_metrics`
- Both Test and Live do not have:
  - `dashboard_v_employer_compliance_status`

### Root cause
The bootstrap SQL itself is fine, but it was added in the wrong file order.

Current file:
- `supabase/migrations/20260423140526_d0dad13a-b076-43b7-a164-4ba459f79b3c.sql`

That timestamp is **after** the failing April 22 migrations, so it cannot help with the dependency error. The diff/apply process still reaches `20260422102700...` first, where dependent views reference `dashboard_v_employer_compliance_status` before that relation exists.

### Implementation
1. Add a new migration with a timestamp that sorts **before** `20260422102700`.
   - Target pattern:
     `supabase/migrations/20260422102659_<new_id>_bootstrap_dashboard_employer_compliance_status.sql`

2. Put the same idempotent bootstrap logic into that new file:
   ```sql
   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1
       FROM pg_views
       WHERE schemaname = 'public'
         AND viewname = 'dashboard_v_employer_compliance_status'
     ) THEN
       EXECUTE $view$
         CREATE VIEW public.dashboard_v_employer_compliance_status AS
         SELECT
           regno::text AS employer_id,
           'Compliant'::text AS bucket
         FROM public.er_master
         WHERE status = 'A'
       $view$;
     END IF;
   END $$;
   ```

3. Keep these existing files in place:
   - `20260422102700_e8ed6cdd-3055-4c1c-a249-abd303d4fdc6.sql`
   - `20260422102813_e106fcf1-2f02-40c5-ae7f-5e47a7204efa.sql`
   - `20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql`

4. Do not make destructive changes.
   - No dropping tables
   - No removing existing migrations
   - No changing view consumers in app code

### Why this should fix it
The failing April 22 migrations only need the base relation to exist before they rebuild dependent views. A correctly timestamped bootstrap migration will create that relation early enough, and the later April 22 + April 23 migrations can then replace it with the final canonical logic.

### Technical notes
- The current late bootstrap file can remain; it is harmless because its `IF NOT EXISTS` guard prevents duplicate creation.
- The actual bug is **migration ordering by filename**, not the SQL body.
- This matches the project’s migration standard for missing-object publish failures: add an idempotent bootstrap migration that sorts before the first failing migration.

### Files
| Change | File |
|---|---|
| New early bootstrap migration | `supabase/migrations/20260422102659_<new_id>_bootstrap_dashboard_employer_compliance_status.sql` |

### Verification
1. Apply the new migration in Test.
2. Confirm Test now has all three views:
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
3. Publish again.
4. Run the same check against Live and confirm all three views exist.
