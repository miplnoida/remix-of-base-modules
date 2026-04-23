
## Fix Live publish by bootstrapping the missing base view before the failing April 22 migrations

### Confirmed issue
- Live currently has:
  - `dashboard_v_compliance_distribution`
  - `dashboard_v_compliance_metrics`
- Live does **not** have:
  - `dashboard_v_employer_compliance_status`

The earlier repair migration `20260423135757_f2d08f70-0604-46cd-9f4c-0d55947bfa5b.sql` runs **too late**. Publish still fails earlier, when migration `20260422102700...` tries to rebuild dependent views that reference a base view missing in Live.

### Implementation
1. Add a new **idempotent bootstrap migration** with a timestamp that sorts **before** `20260422102700`.
   - Example filename:
     `supabase/migrations/20260422102659_<new_id>_bootstrap_dashboard_employer_compliance_status.sql`

2. In that migration, **conditionally create** `public.dashboard_v_employer_compliance_status` only if it does not already exist.

3. Use a **minimal compatible definition** with the exact column shape later migrations expect:
   - `employer_id text`
   - `bucket text`

4. Make the bootstrap migration **non-destructive**:
   - No `DROP VIEW`
   - No cascading changes
   - Safe to run in Test where the view already exists

5. Keep the existing forward-only repair migration `20260423135757...` in place.
   - Once the missing dependency exists early enough, the later April 22 migrations can complete
   - Then the existing repair migration can still rebuild the final canonical definitions on Live

### Bootstrap SQL shape
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

### Why this fixes the publish failure
- The failing migration does not need the final logic yet; it only needs the referenced relation to already exist.
- This bootstrap creates that relation early, so the dependent views can be recreated without `42P01`.
- Later migrations will replace the bootstrap definition with the final DB-driven logic.

### Files
| Change | File |
|---|---|
| New bootstrap migration | `supabase/migrations/20260422102659_<new_id>_bootstrap_dashboard_employer_compliance_status.sql` |

### Verification after implementation
1. Publish again.
2. Verify Live:
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
3. Confirm all 3 views are present, including `dashboard_v_employer_compliance_status`.
