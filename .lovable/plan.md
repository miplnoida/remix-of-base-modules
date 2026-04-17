

## Diagnosis

**Publish to Live is failing on migration `20260417113408_cec02a66...sql`.**

That migration unconditionally runs:
```sql
ALTER TABLE role_permissions DISABLE TRIGGER admin_permissions_protection;
```
On **Test** the trigger `admin_permissions_protection` exists, so it works. On **Live** the trigger does **not exist**, so Postgres raises:
> `trigger "admin_permissions_protection" for table "role_permissions" does not exist`

This aborts the publish. Every subsequent migration (`20260417122616` C3-Wizard seed, `20260417181129` date_married trigger) is therefore **never applied to Live** — confirmed by querying Live:
- `c3_site_settings` has **0 rows** for `C3_WIZARD_BASE_URL` / `OUTBOUND_*` / `INBOUND_*` / `ACTIVE_ENVIRONMENT`
- `validate_date_married_ge_dob()` exists but the **triggers on `ip_master` are missing**
- `app_modules` rows `…000031` / `…000032` were **not** deleted on Live (still present, disabled)

## Fix (one new idempotent migration)

Create a single new SQL migration that does the following, in this order, all defensively (so it's safe to run on both Test and Live, no matter the prior state):

### 1. Re-do the cleanup from `20260417113408` safely
- Wrap the trigger disable/enable in `DO $$` blocks that check `pg_trigger` first.
- Re-run the two DELETEs (`role_permissions` + `app_modules` for module IDs `…000031` and `…000032`) — already no-ops on Test, will finally succeed on Live.

### 2. Re-apply the C3-Wizard seed from `20260417122616`
- Replace the bare `ON CONFLICT DO NOTHING` with `WHERE NOT EXISTS (SELECT 1 FROM c3_site_settings WHERE setting_key=… AND environment=…)` so it's truly idempotent on a table with no unique constraint on `(setting_key, environment)`.
- Seeds the 5 keys × 2 environments (`Dev` / `Production`) needed for C3-Wizard publish-to-live to work.

### 3. Re-apply the date_married trigger from `20260417181129`
- The function already exists on Live; just re-create the trigger on `ip_master` using `DROP TRIGGER IF EXISTS … CREATE TRIGGER …` (already idempotent — but was skipped on Live because the publish aborted earlier).
- The `ip_applications` block stays guarded by the existing `IF EXISTS` check.

## Why this is safe
- **No new tables, no new columns, no destructive DDL.** All statements are guarded by `IF EXISTS` / `WHERE NOT EXISTS` / `DROP … IF EXISTS`.
- **Test environment:** all three sections are no-ops (cleanup already done, seed rows already present, triggers already created).
- **Live environment:** all three sections execute and bring Live in sync with Test.
- **No frontend code change** required — this is purely a migration-pipeline repair.

## Verification after publish
1. Publish completes without error.
2. On Live: `SELECT setting_key, environment FROM c3_site_settings WHERE setting_key='C3_WIZARD_BASE_URL'` returns 2 rows (Dev + Production).
3. On Live: `SELECT trigger_name FROM information_schema.triggers WHERE trigger_name='trg_validate_date_married_ip_master'` returns 1 row.
4. On Live: `SELECT id FROM app_modules WHERE id IN ('…000031','…000032')` returns 0 rows.
5. C3-Wizard "Publish to Live" workflow that the user fixed earlier now works in the production environment without any "C3_WIZARD_BASE_URL is not configured" error.

## Files
- **Create** `supabase/migrations/<new-timestamp>_repair-live-publish-pipeline.sql` (one file, ~60 lines)
- No other files touched.

