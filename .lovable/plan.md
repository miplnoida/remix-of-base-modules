

# Enhance Batch-Dependent Screens: Graceful "No Today's Batch" Handling

## Problem
When open batches exist but none match today's date (and `allow_current_date_payment_in_old_batch` is disabled), the system shows a generic "No Open Batches Available" message. This is misleading — batches exist, just not for today. Users have no way to navigate to Batch Management to create one.

## Affected Screens
4 screens with date-filtered batch selection (no `skipDateFilter`):
- **Payment Data Entry** (`/cashier/payment-data-entry`)
- **C3 Payments** (`/cashier/c3-payments`)
- **Search & Pay Invoices** (`/cashier/search-pay-invoices`)
- **VC Payment Update** (`/cashier/vc-payment-update`)

2 screens with `skipDateFilter: true` (BatchClosing, CashDetails) are unaffected — they always see all open batches.

## Changes

### 1. `useBatchSelection.ts` — Expose new state
Add a new return value `hasOpenBatchesButNotForToday` that is `true` when `openBatches.length > 0` but `filteredOpenBatches.length === 0` (and date filtering is active). This tells the guard *why* no batches are available.

### 2. `BatchSelectionGuard.tsx` — Two distinct empty states
Add a new optional prop `hasOpenBatchesButNotForToday` (default `false`).

**When `noBatchesAvailable && hasOpenBatchesButNotForToday`**:
- Icon: `CalendarX2` (calendar with X)
- Title: "No Batch Available for Today's Date"
- Message: "There are open batches in the system, but none are for today's date. A new batch must be created for the current date before you can proceed with this operation."
- Button: "Go to Batch Management" → navigates to `/cashier/batch-management` with `returnTo` query param encoding the current path

**When `noBatchesAvailable && !hasOpenBatchesButNotForToday`** (existing):
- Keep current message but also add the "Go to Batch Management" navigation button

### 3. All 4 affected page files — Pass new prop
Each page passes `hasOpenBatchesButNotForToday={batchSel.hasOpenBatchesButNotForToday}` to `BatchSelectionGuard`.

## Return Navigation
The "Go to Batch Management" button encodes `returnTo` in the URL query string (e.g., `/cashier/batch-management?returnTo=/cashier/payment-data-entry`). This preserves context so after creating a batch, the cashier can navigate back. No data loss concern since the guard blocks entry before any data is entered.

## Files

| Action | File |
|--------|------|
| Modify | `src/hooks/useBatchSelection.ts` — add `hasOpenBatchesButNotForToday` |
| Modify | `src/components/payments/BatchSelectionGuard.tsx` — two empty states + nav button |
| Modify | `src/pages/cashier/PaymentDataEntry.tsx` — pass new prop |
| Modify | `src/pages/cashier/C3Payments.tsx` — pass new prop |
| Modify | `src/pages/cashier/SearchPayInvoices.tsx` — pass new prop |
| Modify | `src/pages/cashier/VCPaymentUpdate.tsx` — pass new prop |

