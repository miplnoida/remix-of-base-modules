## Fix: Overpayment False Positive -- Missing Period Filter in Guard Query

### Root Cause

The `create_c3_payment_with_receipt` RPC's overpayment guard (lines 121-132) sums paid amounts from `c3_payment_components` filtered by `payment_code` and `sequence_no`, but **does NOT filter by `period**`. This causes it to sum payments across ALL periods for that payer.

For SE 100039, SSE with sequence_no=1:

- Correct (Sep 2026 only): **paid = 10**
- Actual (all periods): **paid = 80** (10 × 8 payments across May, Aug, Sep, etc.)

Since the original amount for Sep 2026 is 80, the guard calculates balance = 80 - 80 = 0, and rejects the new 10 payment as overpayment.

The same bug exists in `get_c3_component_balances` (line 92-106) — it uses `cp.period = p_period::timestamp` on `cn_payment` but that's a different table. The `c3_payment_components` period is stored as `MM/YYYY` format, not as a timestamp.

### Fix

**Migration SQL** — Add period filter to both RPCs:

1. `**create_c3_payment_with_receipt**` overpayment guard (line 121-132): Add `AND cpc.period = v_guard_period` to match the component's period string (e.g., `'09/2026'`).
2. `**get_c3_component_balances**` paid aggregation (line 89-106): Replace `cp.period = p_period::timestamp` with a filter on `cpc.period` using the correct `MM/YYYY` format derived from the input period, and sum `cpc.component_amount` instead of `cp.payment_amount`.

### Technical Detail

The `c3_payment_components.period` column stores period as `MM/YYYY` format (e.g., `'09/2026'`), while `cn_payment.period` stores it as a timestamp. The guard must use `cpc.period` with the matching format.

### Files to Modify


| File          | Change                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Migration SQL | Update both `create_c3_payment_with_receipt` and `get_c3_component_balances` to add `cpc.period` filter in the paid-amount aggregation |


### Verification

After fix, the guard query for SE 100039, SSE, seq 1, period 09/2026 will return paid=10 instead of 80, correctly allowing the next partial payment.