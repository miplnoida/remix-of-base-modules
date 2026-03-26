

# Fix: Remove Invalid Column References from `create_c3_payment_with_receipt` RPC

## Problem

The `create_c3_payment_with_receipt` RPC (migration `20260326141422`) fails with `column "payer_type" of relation "cn_payment" does not exist` because the INSERT at lines 193-221 references 4 columns that don't exist in `cn_payment`:

- `payer_type` — not in `cn_payment` (lives in `cn_payment_header`)
- `payer_id` — not in `cn_payment` (lives in `cn_payment_header`)
- `inserted_by` — not in `cn_payment`
- `insert_date` — not in `cn_payment`

The column `currency_code` **does exist** — no issue there.

The column `sequence_no` **already exists** in `c3_payment_components` — no schema change needed.

## Fix — Single Migration

Recreate the `create_c3_payment_with_receipt` function with the corrected `cn_payment` INSERT. Remove the 4 non-existent columns and their corresponding VALUES. Keep everything else identical.

**Corrected INSERT into `cn_payment`:**
```sql
INSERT INTO public.cn_payment (
  payment_id, payment_code, fund_code, period,
  payment_amount, mop_code,
  base_currency, currency_conversion_rate, currency_code
) VALUES (
  v_payment_id,
  v_comp_arr[v_comp_idx]->>'payment_code',
  v_comp_arr[v_comp_idx]->>'fund_code',
  v_period_ts,
  v_alloc,
  v_meth_arr[v_meth_idx]->>'mop_code',
  v_base_currency,
  v_method_rate,
  v_method_currency
);
```

## What Is NOT Changed
- No schema changes needed (all columns already exist where needed)
- No UI changes
- `cn_payment_header` — untouched, already stores `payer_type` and `payer_id`
- `c3_payment_components` — untouched, already has `sequence_no` and the RPC already saves it (line 101-109)
- All other RPC logic (validation, advisory lock, component saving, method saving, sequential allocation, receipt generation, print logging) remains identical

## File
- 1 new Supabase migration: `CREATE OR REPLACE FUNCTION create_c3_payment_with_receipt` with the 4 invalid columns removed from the `cn_payment` INSERT

