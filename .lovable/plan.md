

# Fix: Cheque Verification List Includes Cancelled Receipt Cheques

## Problem

The `get_batch_cheques_for_verification` RPC (used by the Cash Details Entry screen) does **not** filter out cheques belonging to cancelled receipts (`cn_receipt.status = 'C'`) or cancelled payment headers. This means:

- A cashier sees cheques from cancelled transactions in the verification list
- They can verify cheques that should no longer exist in the batch
- The `close_batch` RPC correctly excludes these cancelled-receipt cheques, so the physical CHQ total computed at close time will differ from what the cashier verified on screen

This is the same cancelled-receipt bug we just fixed in Batch Closing and Batch Transactions, but it was missed in the cheque verification RPC.

## Fix

### Update `get_batch_cheques_for_verification` RPC (migration)

Add a `JOIN cn_receipt` filter to both UNION branches, matching the pattern already used in `close_batch`:

- **cn_payment branch**: Add `JOIN cn_receipt r ON r.payment_id = ch.payment_id AND r.status != 'C'` and `AND COALESCE(ch.status, 'active') != 'cancelled'`
- **c3_payment_methods branch**: Same join and filter

No UI changes needed — the `ChequeVerificationList.tsx` component simply renders whatever the RPC returns.

## Files

| File | Change |
|------|--------|
| New migration SQL | Redefine `get_batch_cheques_for_verification` with receipt-status filter |

## Expected Result

After this fix, the Cash Details cheque list will only show cheques from active, non-cancelled receipts — matching exactly the set that `close_batch` validates against.

