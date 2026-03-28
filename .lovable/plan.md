

# Fix: System Totals Missing C3 Payment Methods

## Problem
The BatchClosing screen computes system totals by querying only the `cn_payment` table. However, cheques (and other MOP types) entered through the C3-Payments flow are stored in `c3_payment_methods`, not `cn_payment`. The physical CHQ count correctly includes both sources (via the `get_batch_cheques_for_verification` RPC), but the system total does not — causing a permanent mismatch even when all cheques are verified.

## Root Cause
In `BatchClosing.tsx` lines 193-216, the system totals are built exclusively from:
```
cn_payment.payment_amount grouped by mop_code
```
But `c3_payment_methods.original_amount` (or `base_amount`) is never included.

## Fix — UI Change Only

### `BatchClosing.tsx` — Include `c3_payment_methods` in system totals

After fetching `cn_payment` rows for the batch's payment IDs, also fetch `c3_payment_methods` rows for the same payment IDs and merge their amounts into the system totals by `mop_code`.

The updated flow:
1. Fetch `cn_payment_header` for the batch (existing)
2. Fetch `cn_payment` by payment IDs (existing)
3. **NEW**: Fetch `c3_payment_methods` by the same payment IDs
4. Merge both sets into `sysTotals` by `mop_code`

For `c3_payment_methods`, the amount field to use is `base_amount` (already converted to base currency) to match the physical side's currency-converted total.

### Files Modified

| File | Action |
|------|--------|
| `src/pages/cashier/BatchClosing.tsx` | Add `c3_payment_methods` query to system totals calculation |

No database changes needed — the data already exists in the right tables.

