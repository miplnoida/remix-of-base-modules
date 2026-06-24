# Why the numbers don't match

- **165** = the real count of `bn_*` tables in the `public` schema (just verified directly against the database).
- **58** = the number of tables hard-coded into `src/pages/bn/admin/BenefitsDiagnostics.tsx` as a static array. The page only checks those 58, so it can never report more.

So the diagnostics screen isn't wrong about the rows it shows — it is simply blind to the other ~107 tables. That's the gap.

# What to change

Replace the hard-coded table list with a live enumeration of every `bn_*` table in `public`, then compute row count + last `created_at` for each one.

## Plan

1. **Add a database function** `public.bn_list_tables()` (security definer) that returns:
   - `table_name`
   - `row_count` (via `pg_class.reltuples` for speed, with an option to do exact `count(*)` on demand)
   - `has_created_at` (bool)
   - `last_created_at` (nullable timestamptz, filled only when `has_created_at` is true)
   
   Implementation: loop over `information_schema.tables` where `table_schema='public' AND table_name LIKE 'bn\_%'`, and for each table run a dynamic `SELECT count(*), max(created_at)` (guarded by checking `information_schema.columns` for a `created_at` column).
   
   Grant `EXECUTE` to `authenticated` and `service_role`.

2. **Rewrite `BenefitsDiagnostics.tsx`** to:
   - Call `supabase.rpc('bn_list_tables')` on mount.
   - Render every row returned (expect ~165), not a static array.
   - Keep the existing screen-to-table mapping as a *separate* lookup (`Record<table, screens[]>`) merged into each row, so tables with no UI owner are clearly labelled "no screen consumer".
   - Keep the existing "warning when screen shows records but table is empty" badge.
   - Add a small summary header: `Total bn_ tables: X · Populated: Y · Empty: Z · Orphan (no screen): N`.

3. **Update `docs/bn-audit-report.md`** so the screen-to-table mapping section is generated against the full 165-table list, with a clear "Unmapped tables" subsection for the ones no `/bn/*` screen reads from yet.

4. **No data changes.** No new `bn_*` tables are created, none are renamed. This is a pure visibility fix.

## Acceptance

- `/bn/admin/diagnostics` shows all 165 `bn_*` tables.
- Header total matches `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'bn\_%'`.
- Tables without a `/bn/*` consumer are flagged, not hidden.
- TypeScript build passes.

## Technical notes

- Using `pg_class.reltuples` avoids 165 sequential `count(*)` scans on page load. An "Exact count" toggle can be added later if needed.
- The RPC is the only safe way to enumerate schema from the browser client — PostgREST won't expose `information_schema` directly.
- Grants must be added in the same migration as the function (per project standard).
