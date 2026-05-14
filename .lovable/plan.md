## Diagnosis

The backend is reachable, but the publish failure is still consistent with migration-history reconciliation, not frontend code.

Current state:
- Live backend has **349** applied migration versions.
- Test backend has **500** applied migration versions.
- Local `supabase/migrations` now has **849** files.
- The prior fix created **349 Live no-op placeholders**, but it also left hundreds of Test/local migration files active in `supabase/migrations`.
- During publish to Live, those extra active local files can be treated as pending migrations and replayed on Live. Many contain non-idempotent schema/function changes, so publish can still fail.

## Fix plan

1. **Make Live ledger the active publish baseline**
   - Keep only the migration files whose timestamps already exist in the Live backend ledger.
   - Keep the 349 `*_live_history_reconciliation.sql` files as the active baseline because they safely satisfy Live history validation.

2. **Archive all local-only/Test-only migrations out of the active folder**
   - Move every migration file not present in Live’s `schema_migrations` ledger from `supabase/migrations/` into `supabase/archived_migrations/test_only_not_live_20260514/`.
   - Do not delete them; preserve them for audit/recovery.
   - This includes the March/April/May Test-only migration files that are currently likely being treated as pending on Live.

3. **Validate the active migration folder**
   - Confirm local active migration count equals Live ledger count.
   - Confirm `remote_not_local = 0` against Live.
   - Confirm `local_not_live = 0` against Live.
   - Confirm no duplicate migration timestamp prefixes.
   - Confirm there is no `deno.lock` under `supabase/` or `supabase/functions/`.

4. **Ask you to retry Publish → Update**
   - If this still fails after the active folder is Live-only, the next blocker is no longer migration history; I’ll then isolate backend function deployment by deploying/checking functions in smaller groups.

## Technical detail

This is a repository migration-file cleanup only. It does not modify database schema, app logic, user data, or authentication.