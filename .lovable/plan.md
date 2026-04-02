

# Fix: Duplicate Function Overload for `create_c3_payment_with_receipt`

## Problem

The error message says PostgREST **"could not choose the best candidate function"** between two overloads of `create_c3_payment_with_receipt`. Both have `p_date_received` as TEXT, but one has parameter defaults and one does not. PostgreSQL treats these as separate functions because the default-vs-no-default signatures differ, and PostgREST cannot disambiguate.

This was caused by successive migrations using `CREATE OR REPLACE` without first dropping the prior overload — PostgreSQL silently kept both versions.

## Fix

**Single migration** that:

1. **Drops ALL existing overloads** of `create_c3_payment_with_receipt` (both the version with defaults and the version without)
2. **Recreates a single canonical version** using the latest logic from the most recent migration (`20260331235340`), which includes card machine handling, sequential allocation, and all current features

### Migration SQL (summary)

```sql
-- Drop all overloads
DROP FUNCTION IF EXISTS public.create_c3_payment_with_receipt(text,text,text,text,text,jsonb,jsonb,numeric,text);
DROP FUNCTION IF EXISTS public.create_c3_payment_with_receipt(text,text,text,date,text,jsonb,jsonb,numeric,text);

-- Recreate single version with defaults (from latest migration 20260331)
CREATE FUNCTION public.create_c3_payment_with_receipt(
  p_batch_number TEXT,
  p_payer_type TEXT,
  p_payer_id TEXT,
  p_date_received TEXT,
  p_remarks TEXT DEFAULT NULL,
  p_components JSONB DEFAULT '[]'::jsonb,
  p_methods JSONB DEFAULT '[]'::jsonb,
  p_receipt_total NUMERIC DEFAULT 0,
  p_user_code TEXT DEFAULT 'SYSTEM'
) RETURNS JSONB ...
```

The function body will be copied exactly from the latest migration (`20260331235340`, lines 452–696).

### No code changes

The frontend call in `C3Payments.tsx` already passes `p_date_received` as a TEXT string via `formatDateForStorage()`. Once the duplicate overload is removed, PostgREST will resolve to the single remaining function without ambiguity.

