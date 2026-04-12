

# C3 Payment Failure — Root Cause Analysis & Fix Plan

## Root Causes Identified

### Bug 1: Type Cast Error (affects ALL payer types)
**Error**: `column "period" is of type timestamp without time zone but expression is of type text`

**Location**: `create_c3_payment_with_receipt` RPC, line 239

**Cause**: The `cn_payment.period` column is `timestamp without time zone`, but the insert uses `v_meth->>'period'` which returns `text`. PostgreSQL rejects the type mismatch at plan time — even when the value is NULL. This was introduced in the latest migration (`20260410`) which recreated the function.

**Fix**: Cast to timestamp: `(v_meth->>'period')::timestamp`

---

### Bug 2: Overpayment Guard — Missing `sequence_no` Filter (affects ER and NWD)
**Error**: `Overpayment detected for component LVC: requested=100, balance=0 (original=0, paid=3637.13)`

**Location**: Overpayment guard section of the same RPC (lines 116-128)

**Cause**: The guard sums paid amounts from `cn_payment` by `payment_code` + `period` but does **not** filter by `sequence_no`. Since `cn_payment` doesn't have `sequence_no` (it's in `c3_payment_components`), the guard sums ALL LVC payments across ALL sequences for that payer/period. Meanwhile, it compares against the original amount from only ONE specific sequence in `cn_c3_reported`.

For payer 658852 at March 2026 seq 3 (NWD): original LVC = 202.56, but total paid LVC across all sequences = 3637.13. The guard incorrectly flags overpayment.

**Fix**: Join through `c3_payment_components` to filter paid amounts by `sequence_no`, matching the same logic used by `get_c3_component_balances`.

---

## Implementation Steps

### Step 1 — Fix the timestamp cast
In the RPC's `cn_payment` INSERT, change line 239 from:
```sql
v_meth->>'period',
```
to:
```sql
(v_meth->>'period')::timestamp,
```

### Step 2 — Fix overpayment guard to filter by sequence_no
Replace the paid-amount query (lines 116-128) to join `c3_payment_components` and filter by the component's `sequence_no`:

```sql
SELECT COALESCE(SUM(cpc.component_amount), 0)
INTO v_guard_paid
FROM c3_payment_components cpc
INNER JOIN cn_payment_header h ON h.payment_id = cpc.payment_id
INNER JOIN cn_receipt r ON r.payment_id = cpc.payment_id
WHERE h.payer_id = p_payer_id
  AND h.payer_type = p_payer_type
  AND h.status IS DISTINCT FROM 'deleted'
  AND r.status != 'C'
  AND COALESCE(h.is_for_director, FALSE) = COALESCE(p_is_for_director, FALSE)
  AND cpc.payment_code = v_guard_code
  AND cpc.sequence_no = v_guard_seq;
```

This aligns the guard with `get_c3_component_balances` and prevents cross-sequence inflation.

### Step 3 — Recreate the full RPC via migration
A single migration will:
1. Drop all existing overloads
2. Recreate the function with both fixes
3. No schema changes needed — only function body changes

### Step 4 — Verify no other regressions
Confirm that the `is_for_director` flag logic is correctly isolated:
- SE payments: `p_is_for_director = FALSE` → guard filters correctly
- ER payments: `p_is_for_director = FALSE` → guard filters correctly
- NWD payments: `p_is_for_director = TRUE` → guard filters correctly

---

## What This Does NOT Change
- No table schema changes
- No frontend changes needed (the RPC signature stays identical)
- No changes to `get_c3_component_balances` or other RPCs
- Historical payment data is unaffected

## Summary

| Error | Affected Flows | Root Cause | Fix |
|-------|---------------|------------|-----|
| Timestamp type mismatch | All (SE, ER, NWD) | Missing `::timestamp` cast on `cn_payment.period` insert | Add cast |
| False overpayment rejection | ER, NWD | Guard sums paid amounts across all sequences instead of filtering by `sequence_no` | Join `c3_payment_components` in guard query |

