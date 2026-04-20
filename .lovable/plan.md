The user wants a single consolidated, idempotent SQL migration file that recreates all DB objects (tables, indexes, FKs, sequences, enums, views, RLS, policies, functions, triggers, storage buckets, auth triggers) so the project can be redeployed onto a self-hosted Supabase on EC2.

Key constraints from the project:

- This is a LARGE project (200+ tables, hundreds of migrations in `supabase/migrations/`).
- Project rule (`docs/ARCHITECTURE-NO-RLS-RULE.md` + custom instruction Entry 9): **No RLS**. So while user asked to "include RLS enablement and policies", in *this* project there are virtually no live RLS policies — I'll honor the project rule and only emit RLS where it actually exists in the migrations folder, and call this out clearly.
- This is an artifact-generation / data-task request, not a UI change → produce a downloadable `.sql` file in `/mnt/documents/`. Per project guidelines this is the right format (no UI).
- READ-ONLY plan mode → I need user approval before running the consolidation script.

### Approach

**1. Discovery pass** (script, read-only)

- Walk `supabase/migrations/*.sql` in filename order (timestamp-prefixed = chronological).
- Concatenate, then deduplicate by parsing top-level statements and keeping only the LAST definition of each named object (table, function, view, trigger, policy, type, index, sequence). This captures the final intended schema, not the chronological churn.
- Detect destructive statements (`DROP …`, `TRUNCATE`, `DELETE FROM`, data-mutating `UPDATE`/`INSERT` against business tables) and strip them from the consolidated output — the user explicitly forbids these and forbids data changes.
- Keep `INSERT … ON CONFLICT DO NOTHING` for **infrastructure seeds only** (storage buckets, app_modules bootstrap, role seeds) — flagged for user review.

**2. Idempotency rewrite pass**

- `CREATE TABLE` → `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX` / `CREATE UNIQUE INDEX` → `… IF NOT EXISTS`
- `CREATE SEQUENCE` → `… IF NOT EXISTS`
- `CREATE TYPE … AS ENUM` → wrap in `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN null; END $$;` (Postgres has no native `CREATE TYPE IF NOT EXISTS`)
- `CREATE FUNCTION` → `CREATE OR REPLACE FUNCTION`
- `CREATE VIEW` / `CREATE MATERIALIZED VIEW` → `CREATE OR REPLACE VIEW` (matviews wrapped in DO-block existence check)
- `CREATE TRIGGER` → wrap in `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN null; END $$;`
- `CREATE POLICY` → wrap in DO-block with existence check
- `ALTER TABLE … ADD CONSTRAINT` → wrap in DO-block with `pg_constraint` existence check
- `ALTER TABLE … ADD COLUMN` → `ADD COLUMN IF NOT EXISTS`
- `ALTER PUBLICATION supabase_realtime ADD TABLE` → wrap in safe DO-block
- `GRANT` statements → kept as-is (idempotent)

**3. Dependency ordering**
Output sections in this fixed order:

1. Extensions (`uuid-ossp`, `pgcrypto`, `pg_trgm`, `pg_net`, `vector` if used)
2. Schemas (if any non-public)
3. Enums / custom types
4. Sequences
5. Tables (no FKs first, FKs added in section 7)
6. Indexes
7. Constraints (FKs, checks, uniques) — separate `ALTER TABLE` block to break circular deps
8. Functions
9. Triggers
10. Views & matviews
11. RLS enablement + policies (only where they exist — most tables stay un-RLS'd per project rule)
12. Storage buckets + storage policies
13. Auth triggers (verify/create `on_auth_user_created` on `auth.users` if missing)
14. Realtime publication additions
15. Grants

**4. Auth trigger guarantee**
Explicitly emit a guarded block that creates `public.handle_new_user()` (if a profiles-bootstrap function is found in migrations, reuse it; otherwise emit a no-op stub flagged in a comment) and the `on_auth_user_created` trigger on `auth.users` if not already present.

**5. Output**

- Single file: `/mnt/documents/consolidated_schema.sql`
- Plus `/mnt/documents/consolidation_report.md` listing: total source migrations processed, total objects emitted by type, any destructive statements stripped (with line refs), any flagged seeds kept, any objects skipped because they target reserved schemas (`auth`, `storage`, `realtime`, `vault`, `supabase_functions` — the rule forbids modifying these except for the documented `auth.users` trigger and `storage.buckets` inserts).

**6. QA pass**

- Run `psql --dry-run`-equivalent syntax check via `psql -f file.sql --set ON_ERROR_STOP=1` against an ephemeral throwaway schema OR (safer) parse with `pg_query` Python lib to confirm every statement parses.
- Verify every `IF NOT EXISTS` / DO-block guard is in place via grep.
- Re-run the file twice mentally (idempotency check): second run must be a no-op.

### What you'll get

- `consolidated_schema.sql` — single idempotent file, safe to run on a fresh self-hosted EC2 Supabase, safe to re-run on an existing one.
- `consolidation_report.md` — what was included, what was stripped, what needs your review.

### What I will NOT do

- Will not include `DROP …`, `TRUNCATE`, or data-modifying statements against business tables.
- Will not modify reserved Supabase schemas beyond the explicitly-allowed `storage.buckets` inserts and the documented `auth.users` trigger.
- Will not re-enable RLS broadly — only where the source migrations actually create policies (per `ARCHITECTURE-NO-RLS-RULE.md`). I'll list any RLS objects emitted in the report so you can decide.
- Will not include data seeds beyond infrastructure bootstrap (storage buckets, and any `app_modules`/`role_permissions` rows the migrations themselves seed via `ON CONFLICT DO NOTHING`). All flagged in the report.

### Scale note

The migrations folder is large; consolidation will be a Python script using `sqlparse` + custom dedup logic. Expected output: a single file likely 30k–80k lines. Generation runs in <60s.

Approve and I'll run the consolidation and deliver both files.  
  
*Important note: It is just a read only operation, not other functio0nality should be impacted.*