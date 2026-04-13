

## Fix: c3-verify 500 — "column occupation does not exist" on ip_wages

### Root Cause

The `process_c3_employer_verification()` trigger fires when `cn_c3_reported.posting_status` changes to `'VAC'` (which happens during c3-verify). On line 27-32, it runs:

```sql
UPDATE ip_wages
SET posting_status = 'VAC',
    verified_by = v_verifier_code,
    date_verified = NOW(),
    occupation = COALESCE(v_current_occupation, occupation)  -- THIS LINE
WHERE id = v_wage_row.id;
```

The `ip_employer` table has an `occupation` column, but `ip_wages` does **not**. The trigger incorrectly tries to write `occupation` to `ip_wages`, causing PostgreSQL error 42703.

### Fix

**Migration SQL** — Recreate the trigger function, removing the `occupation` assignment from the `ip_wages` UPDATE:

```sql
UPDATE ip_wages
SET posting_status = 'VAC',
    verified_by = v_verifier_code,
    date_verified = NOW()
WHERE id = v_wage_row.id;
```

The occupation lookup from `ip_employer` and the `v_current_occupation` variable can also be removed since they serve no purpose without a target column.

### Files to Modify

| File | Change |
|------|--------|
| Migration SQL | Recreate `process_c3_employer_verification()` — remove `occupation` references from `ip_wages` UPDATE |

### Impact

Single-function fix. Unblocks all C3 verify calls (ER, SE, NWD) immediately.

