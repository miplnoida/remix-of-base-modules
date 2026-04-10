

# Fix: `get_c3_component_balances` RPC Not Filtering by Sequence Number

## Root Cause

The `$200` discrepancy comes from the `get_c3_component_balances` RPC used by the C3 Payments screen (`/cashier/c3-payments`). 

**Payment History popup** (`get_c3_payment_history_by_schedule`): Correctly joins `c3_payment_components` and filters by `sequence_no = 4`. Finds no payments → shows $0 paid, full due of $5,395.02.

**C3 Payments screen** (`get_c3_component_balances`): Sums paid amounts from `cn_payment` matching the payer/period, but **does NOT filter by `sequence_no`**. It sums payments across ALL schedules (1, 2, 3, etc.) — deducting $200 that was actually paid against other schedules, incorrectly reducing the balance to $5,195.02.

The bug is in `get_c3_component_balances` at lines 90–106 of migration `20260410132635`:

```sql
-- Current: sums ALL payments for this payer+period regardless of schedule
SELECT cp.payment_code, SUM(COALESCE(cp.payment_amount, 0)) AS total_paid
FROM cn_payment cp
INNER JOIN cn_payment_header h ON h.payment_id = cp.payment_id
INNER JOIN cn_receipt r ON r.payment_id = cp.payment_id
WHERE h.payer_id = p_payer_id ...
  AND cp.period = p_period::timestamp
  -- MISSING: no join to c3_payment_components, no sequence_no filter
```

## Fix

Update the paid-amounts aggregation in `get_c3_component_balances` to join `c3_payment_components` and filter by `sequence_no = p_sequence_no`:

```sql
SELECT cp.payment_code, SUM(COALESCE(cp.payment_amount, 0)) AS total_paid
FROM cn_payment cp
INNER JOIN cn_payment_header h ON h.payment_id = cp.payment_id
INNER JOIN cn_receipt r ON r.payment_id = cp.payment_id
INNER JOIN c3_payment_components cpc 
  ON cpc.payment_id = cp.payment_id::BIGINT
WHERE h.payer_id = p_payer_id
  AND h.payer_type = p_payer_type
  AND h.status IS DISTINCT FROM 'deleted'
  AND r.status != 'C'
  AND COALESCE(h.is_for_director, FALSE) = COALESCE(p_is_for_director, FALSE)
  AND cp.period = p_period::timestamp
  AND cp.payment_code = ANY(v_codes)
  AND cpc.sequence_no = p_sequence_no
GROUP BY cp.payment_code
```

This ensures only payments mapped to the specific schedule are deducted, making the C3 Payments screen balance consistent with the Payment History popup.

## Files Modified

| File | Change |
|---|---|
| **Migration** | Recreate `get_c3_component_balances` with `c3_payment_components` join filtered by `p_sequence_no` |

## Impact

- Fixes the $200 discrepancy — both screens will now show consistent balances
- No UI changes needed
- No regression: the RPC already accepts `p_sequence_no` as a parameter; it was just not used in the paid-amount calculation

