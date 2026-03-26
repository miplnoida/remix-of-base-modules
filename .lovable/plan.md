

# Fix: `receipt_id` is GENERATED ALWAYS AS IDENTITY — Cannot Insert Explicit Value

## Problem

The `cn_receipt.receipt_id` column is defined as `INTEGER GENERATED ALWAYS AS IDENTITY`. PostgreSQL does not allow inserting an explicit value into such columns. The current RPC manually calculates `v_receipt_id = MAX(receipt_id) + 1` and inserts it — this is what causes the error.

## Fix — Single Migration

Update the `cn_receipt` INSERT in the RPC to:
1. **Remove `receipt_id`** from the INSERT column list (let the database auto-generate it)
2. **Use `RETURNING receipt_id INTO v_receipt_id`** to capture the generated value for use in the print log and response

**Before (broken):**
```sql
SELECT COALESCE(MAX(receipt_id), 0) + 1
INTO v_receipt_id
FROM public.cn_receipt;

INSERT INTO public.cn_receipt (
  receipt_id, payment_id, receipt_total, status,
  created_by, created_at
) VALUES (
  v_receipt_id, v_payment_id, p_receipt_total, 'O',
  p_user_code, NOW()
);
```

**After (fixed):**
```sql
INSERT INTO public.cn_receipt (
  payment_id, receipt_total, status,
  created_by, created_at
) VALUES (
  v_payment_id, p_receipt_total, 'O',
  p_user_code, NOW()
)
RETURNING receipt_id INTO v_receipt_id;
```

Changes:
- Remove the manual `MAX(receipt_id) + 1` calculation (no longer needed)
- Remove `receipt_id` from the INSERT columns/values (let IDENTITY auto-generate)
- Add `RETURNING receipt_id INTO v_receipt_id` to capture the auto-generated ID
- The captured `v_receipt_id` continues to be used for the `cn_receipt_prints` log and the response JSON

## What Is NOT Changed
- No schema changes
- No UI changes
- All other RPC logic (header, components with `sequence_no`, payment allocation, print logging, response) remains identical
- The `cn_receipt_prints` INSERT and the return JSON both continue to use `v_receipt_id` as before

## File
- 1 new Supabase migration: `CREATE OR REPLACE FUNCTION create_c3_payment_with_receipt` with the corrected receipt INSERT using `RETURNING`

