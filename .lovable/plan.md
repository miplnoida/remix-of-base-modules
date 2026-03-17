

## Issue Analysis

### 1. Build/Publish Failure (Blocking Issue)

The publish is **failing** -- it has NOT been successfully deployed. The error is:

```
ERROR: 42P13: cannot remove parameter defaults from existing function
HINT: Use DROP FUNCTION resolve_holiday_pay_policy(date,integer,integer,text) first.
```

**Root cause**: The `resolve_holiday_pay_policy` function has been redefined across multiple migrations with conflicting signatures:
- Migration `20260302204051`: created with `DEFAULT 'without_dates'`
- Migration `20260311204328`: recreated with `DEFAULT 'default'`
- Migrations `20260317064259` and `20260317064343`: recreated WITHOUT any DEFAULT

The Lovable Cloud schema diff engine detects the mismatch between Test (no DEFAULT) and Live (has DEFAULT) and generates a `CREATE OR REPLACE` that PostgreSQL rejects -- you cannot remove parameter defaults via `CREATE OR REPLACE`.

**Fix**: Create a new database migration that:
1. Drops ALL possible overloads of `resolve_holiday_pay_policy` using cascading drop
2. Recreates the function cleanly with the latest correct definition (from migration `20260317064343` -- uses `date_from` column, no DEFAULT)

```sql
-- Force-drop all overloads to resolve signature conflict
DROP FUNCTION IF EXISTS public.resolve_holiday_pay_policy(date, integer, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.resolve_holiday_pay_policy(date, integer, integer) CASCADE;

CREATE OR REPLACE FUNCTION public.resolve_holiday_pay_policy(
  p_period_date DATE,
  p_month INTEGER,
  p_year INTEGER,
  p_policy_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$ ... (latest function body from 20260317064343) ... $$;

GRANT EXECUTE ON FUNCTION public.resolve_holiday_pay_policy(DATE, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_holiday_pay_policy(DATE, INTEGER, INTEGER, TEXT) TO anon;
```

### 2. Route `/c3-management/manage` Behaves Differently on Test vs Live

This is a **direct consequence** of Issue #1. Since publishing has been blocked by the migration error, Live is running an older version of the code. All recent UI changes (role dropdown fixes, date filters, etc.) exist only in Test. Once the migration fix is applied and publish succeeds, both environments will be in sync.

### Summary

| Step | Action |
|------|--------|
| 1 | Run a new migration to drop and recreate `resolve_holiday_pay_policy` cleanly |
| 2 | Publish again -- the schema diff conflict will be resolved |
| 3 | Verify Live route `/c3-management/manage` matches Test behavior |

