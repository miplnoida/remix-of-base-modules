## Finding

The hosted backend itself is healthy, but Live still has the same migration ledger gap:

```text
Local migration files: 725
Test ledger rows:      500
Live ledger rows:      349
Live last version:     20260427075142
Placeholder rows:      0
```

This means the previous `live_ledger_backfill.sql` did not actually update the Live migration ledger, even if a SQL script was executed. The most likely causes are: it was run against Test instead of Live, only the schema sync script was run, or the ledger script failed/was not fully executed.

## Plan

1. **Regenerate a corrected Live-only ledger backfill file**
   - Compare all `supabase/migrations/*.sql` local versions against Live's current `supabase_migrations.schema_migrations` entries.
   - Generate a new versioned artifact, for example:
     - `/mnt/documents/live_ledger_backfill_v2.sql`
   - Include only the currently missing local migration versions.
   - Keep it idempotent with `ON CONFLICT DO NOTHING` so it is safe to rerun.

2. **Add built-in verification queries inside the same file**
   - Before/after counts for Live ledger rows.
   - Missing migration count after the insert.
   - A clear success condition: Live ledger should contain all local migration versions needed by Publish.

3. **Avoid touching application code or schema**
   - No frontend changes.
   - No table/function/view changes.
   - No data changes to business tables.
   - Only `supabase_migrations.schema_migrations` ledger rows are inserted.

4. **User execution step required**
   - Because this is a Live production ledger repair, I cannot safely apply it through the normal Test migration flow.
   - You will run the generated SQL in **Cloud View → Run SQL → Live selected**.

5. **Validate after execution**
   - I will re-query Live and confirm:
     - ledger count increased,
     - placeholder rows exist,
     - missing local versions are zero or explain any remaining mismatch.
   - Then you can retry **Publish → Update**.

## Technical detail

The publish pipeline is still trying to replay old migrations on Live because Live has not recorded them as applied. Since the schema was already synced manually, replaying old migration SQL causes duplicate-object failures such as existing tables, columns, indexes, or types. The correct repair is to record those migration versions as already applied, not to keep altering schema sync SQL.