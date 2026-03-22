

# Cash Details (Cheque/Card Entry) & Batch Closing — Implementation Plan

## Overview

Two connected changes: (1) Extend Cash Details Entry to capture cheque rows, credit card total, and debit card total per batch. (2) Rewrite Batch Closing to use real data with MOP-code-level reconciliation and server-side close validation.

## Database Changes

### New table: `cn_batch_cheque`
Stores individual cheque entries per batch:
```sql
CREATE TABLE public.cn_batch_cheque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR NOT NULL,
  cheque_number VARCHAR(30) NOT NULL,
  bank_code VARCHAR(3),
  amount NUMERIC(10,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'XCD',
  date_of_issue DATE,
  created_by VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### New table: `cn_batch_card_total`
Stores credit card and debit card machine totals per batch:
```sql
CREATE TABLE public.cn_batch_card_total (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR NOT NULL,
  mop_code VARCHAR(3) NOT NULL, -- 'CRD' or 'DRD'
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_by VARCHAR,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(batch_number, mop_code)
);
```

### New RPC: `close_batch`
Atomic function that:
1. Validates batch exists and status = 'O'
2. Queries `cn_cash_count` (joined with denominations) to compute physical CSH total for the batch
3. Queries `cn_batch_cheque` to compute physical CHQ total for the batch
4. Queries `cn_batch_card_total` for CRD and DRD physical totals
5. Queries `cn_payment` (joined via `cn_payment_header` by batch_number) to compute system totals grouped by mop_code (CSH, CHQ, CRD, DRD)
6. Compares each of the 4 MOP totals — if any mismatch, raises exception listing which codes don't match
7. If all match, updates `cn_batch.batch_status = 'P'` and sets `posted_by` and `date_posted`
8. Returns success with the totals

RLS policies on new tables for authenticated users (select, insert, update, delete).

## Frontend: Cash Details Entry (`CashDetails.tsx`)

Add two new sections below the existing currency denomination tabs:

### Cheque Entry Section
- Table with columns: Cheque #, Bank (select from `tb_bank_code`), Amount, Currency, Date of Issue
- "Add Cheque" button to add a row inline
- Delete button per row
- Load existing cheques from `cn_batch_cheque` on batch change
- Save cheques on the existing "Save" action (alongside cash counts)
- Upsert/delete pattern similar to cash counts

### Card Totals Section
- Two input fields: Credit Card Machine Total (CRD), Debit Card Machine Total (DRD)
- Load from `cn_batch_card_total` on batch change
- Save via upsert on the same "Save" action

Update the summary header cards to show Cash, Cheques, Credit Card, Debit Card, and combined Physical Count.

## Frontend: Batch Closing (`BatchClosing.tsx`)

Full rewrite — remove all mock data and hardcoded denominations.

### Batch Selection
- Use `useBatchSelection` + `BatchSelectionGuard` (same as other screens)
- Support `?batch=` URL param from Batch Management navigation

### Display Sections
**Physical Count (from Cash Details Entry):**
- CSH total: query `cn_cash_count` with denomination values for the batch (converted to main currency)
- CHQ total: sum of `cn_batch_cheque.amount` for the batch
- CRD total: from `cn_batch_card_total` where mop_code='CRD'
- DRD total: from `cn_batch_card_total` where mop_code='DRD'

**System Totals (from payment transactions):**
- Group `cn_payment.payment_amount` by `mop_code` for all payment_ids in the batch (via `cn_payment_header`)
- Show CSH, CHQ, CRD, DRD system totals

**Comparison Grid:**
| MOP | Physical | System | Variance | Match? |
Visual indicators for match/mismatch per row.

### Close Batch Action
- Button calls `close_batch` RPC with batch_number and user_code
- On success: toast + update UI to show batch is posted
- On failure: show server error message identifying which MOP codes don't match
- Confirmation dialog before close

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Create `cn_batch_cheque`, `cn_batch_card_total` tables with RLS; create `close_batch` RPC |
| `src/pages/cashier/CashDetails.tsx` | Add cheque entry table, card total inputs, update save logic |
| `src/pages/cashier/BatchClosing.tsx` | Full rewrite with real batch data, MOP comparison grid, server-side close |

