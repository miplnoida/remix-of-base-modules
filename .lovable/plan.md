

# Fix: Missing Columns in `c3_payment_components` INSERT

## Root Cause

The `public_api_payment_save` RPC (recreated in the last migration) inserts into **non-existent columns** on `c3_payment_components`:

| RPC uses (wrong) | Actual column |
|---|---|
| `component_type` | ❌ does not exist |
| `amount` | `component_amount` |
| `payer_id` | ❌ does not exist |
| `payer_type` | ❌ does not exist |

The actual table schema is:
`id, payment_id, payment_code, fund_code, component_amount, period, sort_order, created_at, sequence_no`

The RPC was written with assumed column names that don't match the real schema. The fix is to **rewrite the INSERT** to use the correct existing columns — no schema changes needed.

## Fix — One Migration

Recreate `public_api_payment_save` with the corrected `c3_payment_components` INSERT:

```sql
INSERT INTO c3_payment_components (
  payment_id,
  payment_code,
  fund_code,
  component_amount,
  period,
  sequence_no,
  sort_order
) VALUES (
  v_payment_id,
  COALESCE(v_header->>'paymentCode', 'ONL'),
  COALESCE(v_header->>'fundCode', 'GEN'),
  COALESCE((v_header->>'amount')::NUMERIC, 0),
  v_comp_period,
  v_schedule_number,
  v_sort_idx
);
```

This maps the C3-Wizard payload fields to the correct table columns:
- `paymentCode` → `payment_code`
- `fundCode` → `fund_code`
- `amount` → `component_amount`
- `scheduleNumber` → `sequence_no`

No new columns, no schema changes — just correcting the column references in the RPC.

## Summary

| Item | Detail |
|---|---|
| **Root cause** | RPC references 4 non-existent columns in `c3_payment_components` |
| **Fix** | Recreate RPC with correct column names |
| **Files** | 1 new migration |
| **Risk** | None — aligns RPC with existing schema |

