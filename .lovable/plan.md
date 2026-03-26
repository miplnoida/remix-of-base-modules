

# Fix: Replace Invalid Column Names in `create_c3_payment_with_receipt` RPC

## Problem

The `cn_receipt` INSERT in the RPC references two columns that don't exist:

| RPC uses | Actual column in `cn_receipt` |
|---|---|
| `receipt_amount` | `receipt_total` |
| `receipt_date` | *(no such column — `created_at` already captures this)* |

## Fix — Single Migration

Recreate `create_c3_payment_with_receipt` with the corrected `cn_receipt` INSERT:

**Before (broken):**
```sql
INSERT INTO public.cn_receipt (
  receipt_id, payment_id, receipt_amount, receipt_date, status,
  created_by, created_at
) VALUES (
  v_receipt_id, v_payment_id, p_receipt_total, NOW(), 'O',
  p_user_code, NOW()
);
```

**After (fixed):**
```sql
INSERT INTO public.cn_receipt (
  receipt_id, payment_id, receipt_total, status,
  created_by, created_at
) VALUES (
  v_receipt_id, v_payment_id, p_receipt_total, 'O',
  p_user_code, NOW()
);
```

Changes:
- `receipt_amount` → `receipt_total` (correct column name)
- Remove `receipt_date` column and its `NOW()` value (column doesn't exist; `created_at` already serves this purpose)

## What Is NOT Changed
- No schema changes needed
- No UI changes
- All other RPC logic (header, components with `sequence_no`, payments, allocation, print logging) remains identical

## File
- 1 new Supabase migration: `CREATE OR REPLACE FUNCTION create_c3_payment_with_receipt` with the corrected receipt INSERT

