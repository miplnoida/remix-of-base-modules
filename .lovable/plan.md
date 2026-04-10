

# Fix: Batch Closing Cancel Receipt Issues

## Problems Identified

1. **No confirmation dialog** when clicking "Apply Cancel" — the cancellation executes immediately without user confirmation.
2. **Cancel button reappears after cancellation** — after applying, the batch transactions data is not re-fetched, so the local `status` still shows `'O'` and the cancel request status is now `'Completed'` (not matching `isPending` or `isApproved`), causing the Cancel button to reappear.
3. **Consistency** — other screens (PaymentDataEntry, C3Payments, PaymentHistoryManagement) also apply cancellation without a confirmation dialog; all should be aligned.

## Changes

### 1. BatchClosing.tsx — Add confirmation dialog for Apply Cancel

- Add state: `confirmApplyCancelOpen`, `applyCancelTarget` (to hold the cancel request)
- When "Apply Cancel" is clicked, open a `ConfirmDialog` instead of calling `handleApplyBatchCancellation` directly
- On confirm, execute the mutation
- On success, re-fetch batch totals by calling `fetchTotals(batchNumber)` to refresh the transaction list (which filters out cancelled receipts via `r.status !== 'C'`)

### 2. BatchClosing.tsx — Re-fetch data after cancellation

- After `applyCancellation.mutateAsync` succeeds, call `fetchTotals(batchNumber)` to reload `batchPayments` from the database. This ensures cancelled receipts (status `'C'`) are filtered out and the Cancel button does not reappear.

### 3. BatchClosing.tsx — Guard against Completed/Cancelled requests

- Add `cancelReq?.status === 'Completed'` check so that completed requests don't fall through to the Cancel button condition. The condition on line 823 should also check `!cancelReq` OR `cancelReq.status` is not in any active state:
```typescript
{p.status === 'O' && (!cancelReq || cancelReq.status === 'Rejected') && (
```

### 4. PaymentDataEntry, C3Payments, PaymentHistoryManagement — Add confirmation dialog (consistency)

- Add the same `ConfirmDialog` pattern before applying approved cancellations on all three screens, matching the BatchClosing behavior.

## Files Modified

| File | Change |
|---|---|
| `src/pages/cashier/BatchClosing.tsx` | Add confirm dialog for Apply Cancel; re-fetch data after success; fix Cancel button guard |
| `src/pages/cashier/PaymentDataEntry.tsx` | Add confirm dialog before applying cancellation |
| `src/pages/cashier/C3Payments.tsx` | Add confirm dialog before applying cancellation |
| `src/pages/cashier/PaymentHistoryManagement.tsx` | Add confirm dialog before applying cancellation |

