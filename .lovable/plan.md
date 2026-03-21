

# Search & Pay Invoices — Full Implementation Plan

## Overview

Transform the current read-only Search & Pay Invoices screen into a fully functional batch-bound, multi-invoice, multi-MOP payment processing screen using the same architecture as PaymentDataEntry.

## Database Changes

### 1. Add payment tracking columns to `cn_invoices`
```sql
ALTER TABLE cn_invoices
  ADD COLUMN paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN outstanding_amount NUMERIC(15,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  ADD COLUMN payment_reference TEXT;
```
`outstanding_amount` is a computed column so it always stays consistent.

### 2. Create `cn_invoice_payment` linking table
Tracks which invoices were paid in which payment transaction:
```sql
CREATE TABLE cn_invoice_payment (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL,      -- references cn_payment_header
  invoice_id INTEGER NOT NULL,      -- references cn_invoices
  amount_applied NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. Create RPC `pay_invoices_with_receipt`
Atomic transaction that:
1. Validates batch is open
2. Validates all selected invoices are payable (status = 'O', outstanding > 0, not cancelled/voided)
3. Uses advisory lock for safe payment_id generation (same pattern as `create_payment_with_receipt`)
4. Creates `cn_payment_header` linked to batch
5. Inserts MOP detail rows into `cn_payment` (one per method-of-payment entry)
6. Inserts `cn_invoice_payment` rows (one per selected invoice, applying full outstanding amount)
7. Updates each `cn_invoices` row: increments `paid_amount`, updates status to 'P' (Paid) if fully paid
8. Creates `cn_receipt` with status 'O' and logs original print
9. Returns payment_id, receipt_id, and status

Parameters mirror `create_payment_with_receipt` plus `p_invoice_ids INTEGER[]` and `p_invoice_amounts JSONB`.

## Frontend Changes

### 4. Rewrite `SearchPayInvoices.tsx`

The screen gets three sections:

**Section A — Search Panel** (existing, enhanced)
- Add filters: payer ID, SSN, employer code, date range (created/due), invoice type
- Search type dropdown expanded beyond just invoice/payer
- Results table adds checkbox column for selection
- Disable checkbox for invoices with status C (Cancelled), P (Paid), or V (Voided)
- Show outstanding_amount column

**Section B — Shortlisted Invoices**
- Separate card showing selected invoices with amounts
- Running total of outstanding amounts
- Remove button per row
- "Clear All" button

**Section C — Payment Methods**
- Reuse same `AddDetailModal` and `ChequeDetailModal`/`CardDetailModal` components from PaymentDataEntry
- MOP entry grid identical to PaymentDetailGrid
- Running total of MOP entries vs invoice total
- Difference indicator (must be zero to submit)

**Action Bar:**
- "Process Payment" button — enabled only when:
  - Batch is selected and open
  - At least one invoice shortlisted
  - At least one MOP entry
  - MOP total === shortlisted invoice total
  - Not already submitting (double-click guard)
- Calls `pay_invoices_with_receipt` RPC
- On success: clears shortlist, resets MOP entries, refetches search results, shows receipt reference, triggers receipt print

### 5. Batch guard remains
Already using `BatchSelectionGuard` + `useBatchSelection`. Payment actions are blocked if no batch.

## Reused Components
- `BatchSelectionGuard`, `BatchInfoBar` — already imported
- `AddDetailModal`, `ChequeDetailModal`, `CardDetailModal` — from payments
- `PaymentDetailGrid` — for MOP entry display
- `printConfiguredReceipt` — for post-payment printing

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `paid_amount`, computed `outstanding_amount` to `cn_invoices`; create `cn_invoice_payment` table; create `pay_invoices_with_receipt` RPC |
| `src/pages/cashier/SearchPayInvoices.tsx` | Full rewrite with 3-section layout: search+select, shortlist, MOP entry+submit |

## Validation & Safety

- Server-side: RPC validates batch status, invoice eligibility, amount matching, advisory locks for ID generation
- Client-side: checkbox disabled for ineligible invoices, submit button disabled until amounts match
- Double-click protection via `flowState` pattern (same as PaymentDataEntry)
- Full rollback on any failure inside the RPC
- Audit fields: `created_by`, batch linkage, receipt logging

