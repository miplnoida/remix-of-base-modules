
## What's actually going on

Previous attempts assumed migration ledger drift and fixed it by replacing every active migration in `supabase/migrations/` with a no-op (`select 1 where false;`). The publish still fails. So the no-op approach is not the fix — and it has now overwritten the real migration history in the active folder. We need to revert that and address the real problem.

### The real divergence

- **Live ledger:** 349 migrations, last version `20260427075142` (April 27).
- **Test ledger:** 500 migrations, last version `20260513163056` (May 13).
- **Zero overlap between the two ledgers.** Test was Remixed at some point (its earliest version is `20260310181315`, which is *after* most of Live's history). So Test and Live recorded entirely different migration timestamps even though they were both built from the same SQL.
- Publish promotes Test → Live. With no shared ledger versions, Lovable's publish pipeline cannot compute a clean diff. That is the underlying blocker, not the local file count.

### Why the current state is bad

- `supabase/migrations/` now contains **849 no-op files**. The original SQL is only inside `supabase/archived_migrations/`.
- If publish ever does succeed in this state, Lovable would record 500 no-op migrations against Live's ledger but the actual schema work would already be there from the original 349 — fine for Live, but the project's migration history becomes meaningless for any future schema change.
- "Publishing failed" shows with **no failing network request in DevTools**, which means the publish check is failing on a pre-flight client/server check (most likely "ledgers cannot be reconciled" or an edge-function deploy failure), not on a SQL replay.

## Plan

### 1. Stop guessing, capture the real failure signal

We have never seen the actual platform error. Before any more file shuffling:

- User clicks Publish → Update one more time with **DevTools → Network and Console both open and "Preserve log" enabled**. Even if no request fails, the platform UI usually emits an error payload to the console or to a background `/publish` / `/deployments` call. We need either the response body of that call or the console error.
- In parallel, I will pull recent edge-function deploy logs from Cloud to confirm whether one of the 92 functions is silently failing on deploy. (This is read-only.)

If Step 1 surfaces a specific failure (function name, ledger error, schema diff), we go straight to that fix and skip the rest.

### 2. Revert the no-op damage in `supabase/migrations/`

Regardless of what Step 1 returns, the active folder must hold real migration files again, not 849 no-op placeholders.

- Restore the **349** real Live migration SQL files from `supabase/archived_migrations/pre_unified_active_baseline_20260514/` back into `supabase/migrations/`, using their **current Live ledger versions** as filenames.
- Delete the 849 `_unified_publish_reconciliation.sql` files.
- Do not bring the 500 Test-only files back yet. Test already has them recorded in its ledger; pushing them locally would not change Test, and they don't exist on Live.

This restores a sane, real-history baseline that exactly matches Live and does not pretend Test's divergent history exists locally.

### 3. Reconcile the Test/Live divergence the right way

There are only two real options:

- **Option A — Reset Test to match Live (preferred if no Test-only data matters).** Use Lovable Cloud's reset/restore for the Test backend so its `schema_migrations` is reseeded from Live's 349 versions. After that, local files, Test, and Live all agree, and publish has a clean diff to compute.
- **Option B — Backfill Live's ledger to match Test (preferred if Test schema actually drifted from Live).** Insert the 151 Test-only versions into Live's `schema_migrations` as already-applied rows (no SQL replay), but only after diffing the actual schemas to confirm Live already has every object Test introduced. If Live is missing any object, generate a single forward migration that adds it idempotently before the backfill.

Step 1's signal plus a quick `pg_dump --schema-only` diff between Test and Live tells us which option is correct. We do not pick blindly.

### 4. Re-deploy edge functions cleanly

Once migrations are reverted to real history, redeploy all functions to Test and watch for any single function that fails. A failed function deploy is a known cause of generic "Publishing failed" with no network error in DevTools.

### 5. Retry Publish → Update

Only after Steps 1–4 produce a green state (real migrations restored, ledgers reconciled by Option A or B, all functions deployed). If it still fails, the remaining cause is a Lovable platform-side reconciliation bug and the right next step is to escalate with the captured error payload from Step 1 — not more file edits.

## What I need from you to start

1. Click Publish → Update one more time with DevTools Network + Console open, then paste the exact error text from the dialog and any console error or request response body you see (even if status is 200).
2. Confirm whether Test-only data (anything created in Test since around March 10) is important to preserve, so I know whether Option A (reset Test) is acceptable.

## Out of scope

- App code, UI, auth, RLS, business logic.
- Creating any more no-op migration files.
- Renaming local migration files to match drifted timestamps — that approach has been tried and did not fix the publish.
