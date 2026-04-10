# Fix: NWD "Fully Paid" Due to Missing `is_for_director` Filter in Payment Aggregation

## Root Cause

The `get_c3_component_balances` RPC aggregates paid amounts (lines 493-507) by joining `cn_payment_header` but does **not** filter on `h.is_for_director`. 

For employer `658852`, the query sums ALL LVC payments regardless of the director flag:

- Regular ER LVC payments: **$3,638.13** (`is_for_director = false`)
- NWD LVC payments: **$100.00** (`is_for_director = true`)
- **Total counted as paid: $3,738.13**

Since the NWD LVC due is only ~$202, the balance computes as 0 → "Fully Paid".  
  
Note/:- No it due 102 because 100 already paid by the employer.

## Fix

Add `is_for_director` filter to the paid-amount aggregation query in the RPC. One line change:

```sql
-- Add after line 503 (AND r.status != 'C'):
AND COALESCE(h.is_for_director, FALSE) = COALESCE(p_is_for_director, FALSE)
```

This ensures NWD payments are only counted against NWD balances, and regular ER payments only against regular ER balances.

## Change


| What       | Detail                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**   | Database migration (RPC update)                                                                                                                                                            |
| **File**   | New migration to recreate `get_c3_component_balances`                                                                                                                                      |
| **Impact** | Fixes NWD partial payment detection; no regression on ER/SE/VC flows since `p_is_for_director` defaults to `FALSE` `Make sure: other functionality should not be impacted by this change.` |
