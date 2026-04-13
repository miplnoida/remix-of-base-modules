

## Fix: "column 'status' does not exist" in C3 Accept Trigger

### Root Cause

The `process_c3_employer_verification` trigger function queries `ip_employer` with:

```sql
WHERE ssn = v_wage_row.ssn AND status = 'C'
```

But `ip_employer` has **no `status` column** — only `posting_status`. This causes the PostgreSQL error when accepting any C3 record that triggers the VAC transition.

This bug was introduced in the migration `20260413120930` which recreated the trigger with `status` instead of the correct column name.

### Fix

**Migration SQL** — Update `process_c3_employer_verification` to use `posting_status` instead of `status`:

```sql
-- Change this line in the trigger:
WHERE ssn = v_wage_row.ssn AND status = 'C'
-- To:
WHERE ssn = v_wage_row.ssn AND posting_status = 'C'
```

Also reset the workflow instance for SCH-4 Mar 2026 if it got stuck in a failed state.

### Files to Modify

| File | Change |
|------|--------|
| Migration SQL | Fix `process_c3_employer_verification`: `status` → `posting_status` on `ip_employer` query |

### Impact

One-line column name fix. No other logic changes. After this, the Accept action will work for all C3 employer records.

