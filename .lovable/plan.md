## Findings

- The site is already published and public, and the Live backend is healthy.
- The screenshot error is a generic publish failure, not an app/browser network failure.
- The previous package-lock mismatch hypothesis no longer holds: `package.json` and `package-lock.json` now match.
- Live is behind Test by many migrations. The next publish likely tries to apply those pending backend changes to Live.
- At least one pending migration is not publish-safe/idempotent:
  - `20260505102047_...sql` runs `ALTER PUBLICATION supabase_realtime ADD TABLE public.ia_risk_categories` without checking if the table is already in the realtime publication. If Live has partial migration state from a failed publish, this can fail the next publish.
- Another pending migration creates multiple `bn_medical_*` tables using plain `CREATE TABLE`, not `CREATE TABLE IF NOT EXISTS`; that can also fail if Live contains any of those objects from a partial publish.

## Plan

1. **Make pending migrations idempotent where they can fail on retry**
   - Update the pending `ia_risk_categories` migration to add realtime only when the publication entry does not already exist.
   - Update the pending medical-benefit setup migration to use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and safe trigger creation where needed.
   - Preserve the existing project constraint: no new RLS policies.

2. **Check other pending migrations for retry hazards**
   - Review the migrations after the last successful Live version for duplicate-prone statements such as plain `CREATE TABLE`, `CREATE INDEX`, `CREATE TRIGGER`, or non-guarded realtime publication changes.
   - Patch only statements that can block a repeated publish after a partial Live migration.

3. **Validate publish readiness without changing product behavior**
   - Re-run read-only checks comparing Live/Test migration state and local migration files.
   - Run targeted validation suitable for publish failure diagnosis.
   - Do not make UI/business-logic changes.

4. **Republish**
   - After the migration files are publish-safe, use the Publish dialog’s **Update** button again.
   - If publishing still fails, the next suspect is deployment volume from the large number of backend functions; then we should isolate whether a backend function deploy is failing.

## Files expected to change

- `supabase/migrations/20260505102047_9cf8b5d5-40a4-4750-abab-134a04be740b.sql`
- `supabase/migrations/20260501074942_c2ca9684-b238-4a23-88d0-2010b56b93d0.sql`
- Possibly other pending migration files only if they contain the same retry-unsafe patterns.