## Why Publish still fails

The schema sync you ran fixed Live's **schema**, but Publish doesn't look at the schema — it looks at the **migration ledger** (`supabase_migrations.schema_migrations`). The numbers tell the story:

```text
Local migration files .................. 725
Test ledger (recorded migrations) ...... 500   (last: 20260513163056)
Live ledger (recorded migrations) ...... 349   (last: 20260427075142)
```

So Publish sees ~150+ migrations on Live that "haven't been applied yet" and tries to run them. Most of them contain non-idempotent SQL (`CREATE TABLE …`, `CREATE TYPE …`, `ALTER TABLE … ADD COLUMN …` without `IF NOT EXISTS`, `CREATE INDEX …`, etc.). Because the schema sync script already created those objects, the very first such statement throws `relation already exists` / `column already exists` / `type already exists`, Publish aborts → "publishing failed".

Fixing the script further won't help — the root cause is the ledger gap, not the schema.

## Fix: backfill Live's ledger

Insert a placeholder row into Live's `supabase_migrations.schema_migrations` for every migration file that exists locally but isn't recorded on Live. Publish then skips them (it only runs versions it doesn't see in the ledger). The schema is already in sync, so skipping them is exactly what we want.

This is the same trick the existing `*_remote_applied.sql` files in your migrations folder use — we just need to do it in bulk on Live.

## What I will produce

1. **Read both ledgers** (Test for reference, Live for the gap) via `supabase--read_query`.
2. **List all 725 local migration filenames** under `supabase/migrations/`.
3. **Compute the set difference**: versions present locally but missing from Live's ledger (~376 rows).
4. **Generate** `/mnt/documents/live_ledger_backfill.sql` containing one idempotent statement:

   ```sql
   INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
   VALUES
     ('20260427090705', 'placeholder_synced_via_schema_script', ARRAY[]::text[]),
     ('20260427091241', 'placeholder_synced_via_schema_script', ARRAY[]::text[]),
     ...
   ON CONFLICT (version) DO NOTHING;
   ```

   - `statements = ARRAY[]::text[]` so nothing re-runs if Supabase ever replays from the ledger.
   - `ON CONFLICT DO NOTHING` makes it safe to re-run.
   - No schema is touched, no data is touched.

5. **Deliver the file as a downloadable artifact**. You run it once in **Cloud View → Run SQL (Live selected)**.

## After running the backfill

1. Re-check: `SELECT count(*) FROM supabase_migrations.schema_migrations` on Live should equal the local file count (725).
2. Click **Publish → Update**. Publish will now find no pending migrations on the database side and proceed straight to edge-function deploy and frontend release.
3. If a small number of *new* migrations created after the gap fail (because schema sync covered them but they still try to add e.g. a constraint), I can add the same `IF NOT EXISTS` / `DO … EXCEPTION` wrapping you already have in `live_schema_sync.sql` — but typically there's nothing left to fail because the gap is closed.

## Out of scope

- No changes to project code or migration files in the repo.
- No data writes, no schema changes on Live beyond inserting ledger rows.
- Test ledger is left alone.

## Confirm to proceed

Say **go** and I'll generate `/mnt/documents/live_ledger_backfill.sql` and hand it to you for one-shot execution on Live.