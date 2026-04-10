
# Fix: Cancel Button Not Visible in Batch Transactions

## Root Cause

In `BatchClosing.tsx` line 299, payment rows are built with `status: h.status` from `cn_payment_header`, which has values like `'active'` or `null`. But the Cancel button visibility check on line 823 is `p.status === 'O'` — which is a `cn_receipt` status value (Open).

Since `h.status` is never `'O'`, the condition always fails and the Cancel button never renders.

## Fix

Change line 299 to use the receipt status instead of the header status:

```typescript
// Line 299 — before:
status: h.status,

// After:
status: receipt?.status || h.status,
```

This pulls the status from `cn_receipt` (which has `'O'` for open, `'C'` for cancelled), making the Cancel button visible for open receipts.

## File Changed

| File | Change |
|---|---|
| `src/pages/cashier/BatchClosing.tsx` | Line 299: use `receipt?.status` instead of `h.status` |
