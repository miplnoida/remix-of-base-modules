## Goal

Generate a single, idempotent SQL script that brings the **Live** database (project `pruvbfejdpodpalqafcu`) up to match the **Test** database (`xynceskeiiisiefqlgxo`) **schema only** — no row data is touched. You then run that script in Cloud View → Run SQL (Live selected). This bypasses the broken Publish path entirely.

## Why this works

App code is the same against both backends, so once Live's schema equals Test's schema, the app will run identically on Live with its own production data. Migration ledgers stay as-is (we are not trying to fix them — they are unrelated to the schema being correct).

## What I already confirmed

Object counts in `public` show Test is ahead of Live:

```text
                Live   Test   Δ
tables           891    904   +13
views             45     46   +1
columns        12995  13214  +219
routines         368    375   +7
indexes         1602   1639   +37
enums             64     64    0
policies          23     23    0
triggers (info_schema, public)  0  0
```

So the script needs to add missing tables/columns/views/functions/indexes and reconcile altered columns. No tables will be dropped from Live.

## Plan

### Step 1 — Full schema introspection of both DBs

Read from `information_schema` and `pg_catalog` for both environments (Test and Live), capturing:

- enum types and their values
- tables and columns (name, data type, nullable, default, identity, generated)
- primary keys, unique constraints, foreign keys, check constraints
- indexes (definition via `pg_indexes.indexdef`)
- views and materialized views (definition)
- functions and procedures (signature + `pg_get_functiondef`)
- triggers on `public` tables (`pg_trigger`)
- RLS state and policies (`pg_policies`)
- sequences owned by `public`
- storage buckets (so any Test-only buckets get created in Live)

All read-only via `supabase--read_query`. No writes.

### Step 2 — Compute the diff (Test − Live)

For each object class, produce idempotent SQL:

- **Enums:** `CREATE TYPE … IF NOT EXISTS` pattern via `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$;`. For existing enums missing values: `ALTER TYPE … ADD VALUE IF NOT EXISTS …`.
- **Tables:** `CREATE TABLE IF NOT EXISTS …` for missing tables. For existing tables missing columns: `ALTER TABLE … ADD COLUMN IF NOT EXISTS …`. For columns whose type/default/nullability differ, emit `ALTER COLUMN` only when the change is non-destructive (widening type, dropping NOT NULL, adding default). Destructive changes (narrowing type, adding NOT NULL on a nullable column with no default) are emitted as **commented-out** statements with a `-- REVIEW:` marker so you decide.
- **Constraints (PK/UNIQUE/FK/CHECK):** drop-by-name then re-add only if definition differs, wrapped in `DO $$ … EXCEPTION WHEN duplicate_object …`. Missing constraints added.
- **Indexes:** `CREATE INDEX IF NOT EXISTS` using Test's `indexdef`.
- **Views / matviews:** `CREATE OR REPLACE VIEW …`. For matviews, `DROP MATERIALIZED VIEW IF EXISTS … CASCADE; CREATE MATERIALIZED VIEW …` (data is regenerated on next refresh, no production rows lost since matviews are derived).
- **Functions / procedures:** `CREATE OR REPLACE FUNCTION …` from Test's `pg_get_functiondef`. Drop+recreate only when signature changed.
- **Triggers:** `DROP TRIGGER IF EXISTS … ON …; CREATE TRIGGER …`.
- **Policies:** `DROP POLICY IF EXISTS … ON …; CREATE POLICY …` and align RLS enabled/disabled state per table.
- **Sequences:** create missing sequences, but **never** reset `setval` on Live (we leave Live's counters where they are).
- **Storage buckets:** `INSERT INTO storage.buckets … ON CONFLICT DO NOTHING`.

Output is one `.sql` file delivered to `/mnt/documents/live_schema_sync.sql`, ordered: enums → tables → columns → constraints → indexes → sequences → views → functions → triggers → policies → buckets. Every statement is idempotent so re-runs are safe.

### Step 3 — Inverse report (Live-only objects)

A second file `/mnt/documents/live_only_objects.txt` lists anything that exists in Live but not Test (tables, columns, functions, indexes). The sync script does **not** drop these — you decide whether to remove or keep them. This protects against accidental data loss if Live had hotfixes Test never received.

### Step 4 — Delivery, no execution

I will not run the sync script against Live from here. You take the `.sql` file and run it in **Cloud View → Run SQL (Live selected)**. If anything errors mid-run, the file is structured so you can re-run it safely (idempotent) after fixing the specific block.

### Step 5 — After Live is synced

- Re-pull object counts from both DBs and confirm `tables/columns/views/functions/indexes` now match.
- Optional: deploy edge functions to Live via the dashboard (or they will deploy on the next successful publish).
- Try Publish → Update again. Even if publish still fails on the ledger reconciliation issue, the app will already work correctly on Live because the schema is in sync.

## Out of scope

- Migration ledger reconciliation (`supabase_migrations.schema_migrations`). Not touched.
- Edge function code. Same in both projects since code is shared.
- Any row data movement. Live keeps Live data; Test keeps Test data.
- RLS policy semantics review — policies are mirrored from Test as-is.

## What I need from you to start

Confirm:
1. **Direction is Test → Live** (Test is the source of truth). If Live actually has hotfixes that should win, say so and I will invert specific objects.
2. You're OK with **non-destructive ALTERs auto-applied** and **destructive ALTERs left commented out** for your review.
3. You will execute the generated `.sql` yourself in Cloud View → Run SQL on Live (I will not run it for you).

On confirmation, I run the introspection and produce both files.