# C3-Wizard Request: Grant Permissions on `wiz_c3_filing_config_periods`

**Severity:** 🔴 **Blocker** — Publish to C3-Wizard is fully broken.
**Date raised:** 2026-05-08
**Raised by:** SSB Admin team
**Affected endpoint:** `POST /c3-config-sync` (v4.1)

---

## 1. Problem

After deploying the v4.1 schema (which introduced `wiz_c3_filing_config_periods` per spec §2.2), the SSB Admin **Publish to C3-Wizard** call fails with HTTP 500:

```
[wizard_error] Filing config upsert failed: permission denied for table wiz_c3_filing_config_periods
```

The payload is built and transmitted correctly from SSB Admin. The error is raised by Postgres on the **C3-Wizard** database when the Wizard API tries to upsert into the new table.

### Edge function log (SSB Admin side)

```
Sync Publish - Payload summary: {
  sync_version: "4.1",
  config_periods: 1,
  levy_slabs: 2,
  bonus_policies: 1,
  bonus_exceptions: 1,
  holiday_policies: 2,
  holiday_exceptions: 0,
  calculation_configs: 36,
  income_codes: 1,
  income_categories: 14,
  self_emp_contrib_rates: 14,
  income_code_policies: 1,
  income_code_exceptions: 0,
  filing_config_periods: 1
}

Sync Publish - C3-Wizard returned error: 500
{"status":"error","error":"Filing config upsert failed: permission denied for table wiz_c3_filing_config_periods"}
```

---

## 2. Root Cause (C3-Wizard side)

The new `wiz_c3_filing_config_periods` table was created in v4.1, but the database role used by the C3-Wizard API was **not granted** `INSERT/UPDATE/DELETE/SELECT` privileges on it. All other `wiz_c3_*` tables already have the correct grants — only this new table is missing them.

If RLS is enabled on the table, the corresponding `INSERT`/`UPDATE` policies are also missing.

---

## 3. Required Fix (please run on C3-Wizard DB)

Replace `<wizard_api_role>` with the role actually used by your API (the same role that owns inserts on `wiz_c3_config_periods`).

```sql
-- 1. Table-level grants (mandatory)
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.wiz_c3_filing_config_periods
  TO <wizard_api_role>;

-- 2. If the table uses a sequence for any column, grant on it too
-- GRANT USAGE, SELECT ON SEQUENCE public.wiz_c3_filing_config_periods_<col>_seq TO <wizard_api_role>;

-- 3. If RLS is enabled (check with: SELECT relrowsecurity FROM pg_class WHERE relname='wiz_c3_filing_config_periods';)
--    add INSERT/UPDATE policies matching the pattern used by wiz_c3_config_periods, e.g.:
-- ALTER TABLE public.wiz_c3_filing_config_periods ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "wiz_filing_config_insert"
--   ON public.wiz_c3_filing_config_periods FOR INSERT TO <wizard_api_role>
--   WITH CHECK (true);
-- CREATE POLICY "wiz_filing_config_update"
--   ON public.wiz_c3_filing_config_periods FOR UPDATE TO <wizard_api_role>
--   USING (true) WITH CHECK (true);
-- CREATE POLICY "wiz_filing_config_select"
--   ON public.wiz_c3_filing_config_periods FOR SELECT TO <wizard_api_role>
--   USING (true);
```

### Diagnostic queries to confirm the gap

```sql
-- Current grants
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'wiz_c3_filing_config_periods';

-- Current policies
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'wiz_c3_filing_config_periods';
```

Compare results to `wiz_c3_config_periods` — they should match.

---

## 4. Verification (after the fix)

1. Notify SSB Admin team.
2. SSB Admin user opens `/admin/c3-configuration` → clicks **Publish to C3-Wizard**.
3. Expected: HTTP 200, success toast, response includes `filing_config_periods: 1`.
4. Header badge flips to **Synced {date}**.

---

## 5. References

- v4.1 schema confirmation message (2026-05-08) — `wiz_c3_filing_config_periods` table created with UUID PK, DATE/TIMESTAMPTZ, VARCHAR(50) audit columns.
- Related doc: `docs/C3_WIZARD_SYNC_ENDPOINT_UPDATE_REQUIRED.md` (resolution banner).
- SSB Admin edge function: `supabase/functions/c3-config-sync-publish/index.ts` (no changes needed on our side).
