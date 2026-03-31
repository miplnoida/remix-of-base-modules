

# Fix: Migration `20260331110159` Missing Single-Param DROP

## Root Cause

The error occurs at migration `20260331110159`, not the latest migration. Migrations are applied sequentially to Live. Here's the chain:

```text
20260331061827 → Creates functions with DEFAULT NULL on p_email
                 (PostgreSQL registers as callable with 1 arg: (TEXT))

20260331110159 → DROP (TEXT, TEXT)  ← only drops 2-param signature
                 But function still exists as (TEXT) due to DEFAULT
                 CREATE OR REPLACE without DEFAULT → ERROR
```

The later fix migrations (`135011`, `142631`) never get a chance to run because `110159` fails first.

## Fix

Edit migration `20260331110159` to add the missing single-parameter drops:

**File:** `supabase/migrations/20260331110159_a034a2be-5015-4c23-a9c5-9762e0b6792f.sql`

Change lines 2-4 from:
```sql
-- Drop existing functions to allow recreation with updated return fields
DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT, TEXT);
```

To:
```sql
-- Drop existing functions (both overloads) to allow recreation with updated return fields
DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT);
DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT);
DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT, TEXT);
```

## Other Migrations — No Issues

The subsequent migrations (`20260331135011` and `20260331142631`) already include both `DROP (TEXT)` and `DROP (TEXT, TEXT)`, so they will execute cleanly after this fix. No other migrations have this problem.

## Summary

- **1 file changed**: `20260331110159` — add 2 missing `DROP FUNCTION IF EXISTS ...(TEXT)` lines
- **No other blockers** found in the migration chain
- After this fix, all migrations will apply cleanly to Live on publish

