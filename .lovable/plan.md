

## Root Cause Analysis

Two database errors are preventing C3 calculations from working:

### Error 1: `calculate_c3_contributions_with_other_payments` fails
**Error:** `relation "public.c3_bonus_policy_defaults" does not exist`
**Cause:** The latest migration (`20260310195736`) introduced a typo -- it references `c3_bonus_policy_defaults` (plural) but the actual table is `c3_bonus_policy_default` (singular). This causes the entire calculation RPC to fail, which is why SS contributions, levy, penalties, and fines are all zero.

### Error 2: `get_pending_holiday_pay` fails
**Error:** `column "source_c3_period" does not exist`
**Cause:** The `get_pending_holiday_pay` RPC references columns `source_c3_period`, `target_year`, and `target_month`, but the actual `c3_pending_holiday_pay` table has `source_c3_id` and `target_period` instead. The table schema was changed but the RPC was never updated.

---

## Plan

### 1. Fix the `calculate_c3_contributions` RPC -- table name typo
Create a migration that re-deploys the `calculate_c3_contributions` function, changing `c3_bonus_policy_defaults` to `c3_bonus_policy_default` (singular). This requires reading the full latest RPC definition from the migration file and correcting line 196.

### 2. Fix the `get_pending_holiday_pay` RPC -- column mismatch
Create a migration that redefines `get_pending_holiday_pay` to use the actual column names from the `c3_pending_holiday_pay` table:
- `source_c3_id` instead of `source_c3_period`
- `target_period` instead of `target_year`/`target_month` (will need to construct the period from the year/month parameters, or adjust the query to extract year/month from the `target_period` column)

Both fixes are database-only migrations with no frontend changes needed.

