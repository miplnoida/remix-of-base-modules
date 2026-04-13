

## Fix: "column 'start_date' does not exist" in C3 Accept Trigger

### Root Cause

The `process_c3_employer_verification` trigger function contains:

```sql
ORDER BY start_date DESC
```

But the `ip_employer` table has `term_start_date`, not `start_date`. This was introduced when the trigger was recreated in the earlier migration.

### Fix

**Migration SQL** — Recreate the trigger function replacing `start_date` with `term_start_date`:

```sql
ORDER BY term_start_date DESC
```

Single-line fix inside the trigger function. No other changes needed.

### Files to Modify

| File | Change |
|------|--------|
| Migration SQL | Fix `process_c3_employer_verification`: `start_date` → `term_start_date` |

