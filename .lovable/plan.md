

## Investigation Summary: Why Two Table Names Existed

### Root Cause — It Was Never Two Tables

There was **never** a plural `c3_holiday_pay_policy_defaults` table. The actual table has always been **`c3_holiday_pay_policy_default`** (singular), created in migration `20260302193144`.

The plural reference was a **typo bug** inside two RPC functions:

1. **`calculate_c3_contributions`** (migration `20260310195736`): Referenced `c3_holiday_pay_policy_defaults` (plural) at line 357 and used wrong column `created_at` instead of `created_on`.
2. **`resolve_holiday_pay_policy`** (migration `20260311204328`): Also referenced the plural name at line 56 and used `effective_from` instead of `date_from`.

### Fix History

| Migration | What it did |
|-----------|-------------|
| `20260310203816` | Attempted a string-replace fix inside `calculate_c3_contributions` to change plural → singular |
| `20260317064259` | Recreated `resolve_holiday_pay_policy` with the correct singular table name and `date_from` column |
| `20260317064343` | Recreated `calculate_c3_contributions` with corrected date arithmetic |

### Impact of the Recent Fixes

**No other functionality is impacted.** Here's why:

- **Only one table exists** in the database: `c3_holiday_pay_policy_default` (singular). Nothing was dropped or deleted.
- **All application code** (hooks, publish logic, UI components) already references the correct singular name — confirmed across 15 files.
- **No live RPC functions** currently reference the plural name (verified via `information_schema.routines`).
- The fixes only corrected **function bodies** (the SQL logic inside RPCs), not table structures.

### Summary

The "two tables" were never two tables — it was one table (`c3_holiday_pay_policy_default`) with a typo in two RPC functions that silently failed when trying to query the non-existent plural name. The recent migrations corrected these function references. No tables were created or deleted, and no other functionality is affected.

