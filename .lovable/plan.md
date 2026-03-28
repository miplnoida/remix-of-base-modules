

# Fix: Cheque Duplication and Opening Balance Integration

## Root Cause

**Cheque Duplication**: The `get_batch_cheques_for_verification` RPC uses `UNION ALL` across `cn_payment` and `c3_payment_methods`. For C3 payments, both tables contain the same cheque (same payment_id, same amount, same cheque number). Live data confirms this: payment_id 11 returns two identical $200 BON cheques — one from each table.

Since `cn_payment` is already the single source of truth for system totals (established in prior fixes), the `c3_payment_methods` branch should be removed from the cheque verification RPC. Every C3 cheque already has a corresponding `cn_payment` row.

**Opening Balance**: Already correctly included in `BatchClosing.tsx` (CSH system total) and `close_batch` RPC. The current implementation is sound. The UI info card is present. No changes needed here.

## Plan

### 1. Fix `get_batch_cheques_for_verification` RPC (migration)

Remove the `UNION ALL` with `c3_payment_methods`. Keep only the `cn_payment` branch. This eliminates the duplicate cheque entries.

The `close_batch` RPC also has the same `UNION ALL` pattern for cheque verification — it must be updated identically.

### 2. Fix `close_batch` RPC cheque sections (same migration)

Update the physical CHQ calculation and unverified cheque count sections to remove the `c3_payment_methods` branches, matching the corrected cheque verification RPC.

### 3. Update ChequeVerificationList source labels

Remove the `c3_payment_methods` entry from `SOURCE_LABELS` since that source will no longer appear.

## Files

| File | Change |
|------|--------|
| New migration SQL | Redefine `get_batch_cheques_for_verification` (remove c3 branch) and `close_batch` (remove c3 cheque branches) |
| `src/components/payments/ChequeVerificationList.tsx` | Remove `c3_payment_methods` from `SOURCE_LABELS` |

## Verification

After the fix, the sample batch `STK-20260314-224943` should return exactly 1 cheque (not 2) from the RPC. The `close_batch` RPC will validate against the same single-source cheque set.

