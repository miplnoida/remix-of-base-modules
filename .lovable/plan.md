
Fix the mismatch by aligning Batch Closing around one consistent financial model across UI and backend.

## What I found

There are 3 separate logic problems causing the conceptual mismatch:

1. **System totals are double-counting C3 payments**
   - `BatchClosing.tsx` adds:
     - `cn_payment.payment_amount`
     - plus `c3_payment_methods.base_amount`
   - But for C3 payments, `cn_payment` already contains the allocated accounting lines in base currency.
   - Result: C3 cash/cheque/card amounts get counted twice in **MOP Reconciliation**.

2. **Batch Transactions is showing rows that should not contribute**
   - The screen currently pulls batch headers with `cn_payment_header.status is null/active`, then shows receipt totals even when the receipt is cancelled (`cn_receipt.status = 'C'`) or missing.
   - I verified live data where cancelled receipts are still included in the list.
   - Result: transaction totals on screen do not represent the same “valid transactions” set used conceptually for reconciliation.

3. **`close_batch` RPC is not using the same rules as the UI**
   - Current RPC validates system totals from `cn_payment` only.
   - It also uses a different cheque verification key format for `cn_payment` (`payment_id-payment_sequence_no`) than the cheque verification RPC/UI (`payment_sequence_no` only).
   - Result: even if UI looks corrected, backend close logic can still mismatch or reject valid batches.

## Implementation plan

### 1) Refactor Batch Closing system totals
Update `src/pages/cashier/BatchClosing.tsx` so **system MOP totals** are built from a single source of truth:

- Use `cn_payment` only for MOP system totals
- Do **not** add `c3_payment_methods` again into reconciliation totals
- Continue including batch `offset_amount` in `CSH` system total

This will stop double-counting and make MOP totals conceptually match posted accounting lines.

### 2) Refactor Batch Transactions list
Update the same screen so **Batch Transactions** only shows financially valid transaction rows:

- Load headers joined conceptually to receipts
- Exclude:
  - cancelled receipts (`cn_receipt.status = 'C'`)
  - headers with no receipt row
- Build the list from the same valid payment set used for reconciliation totals
- Keep receipt modal support, but fetch details only for valid displayed payments

This makes the “Batch Transactions” grand total represent the same active batch money as reconciliation.

### 3) Keep payment-method popup accurate
For the transaction popup modal:

- Fetch `cn_payment` rows for the selected `payment_id`
- Aggregate by `mop_code`
- Do **not** merge `c3_payment_methods` amounts into the popup totals
- Optionally still use `c3_payment_methods` only as metadata later if needed, not as additive amounts

This ensures popup totals equal the displayed transaction amount instead of doubling C3 receipts.

### 4) Fix backend batch-closing validation
Create a migration to redefine `public.close_batch` so backend validation matches the corrected UI:

- Validate only active/non-cancelled receipt-backed transactions
- Use `cn_payment` as the system-total source
- Include `offset_amount` in `CSH` system validation
- Keep physical sources:
  - `cn_cash_count`
  - verified cheques
  - `cn_batch_card_total`
- Fix cheque verification join for `cn_payment` to use the same `source_record_id` format as `get_batch_cheques_for_verification` (`payment_sequence_no::text`)

This makes the Save/Close flow consistent and prevents UI/backend disagreement.

## Files to update

- `src/pages/cashier/BatchClosing.tsx`
- new migration in `supabase/migrations/*` redefining `public.close_batch`

## Technical notes

```text
Correct conceptual model

System total:
  Active receipt-backed batch transactions
  -> cn_payment grouped by mop_code
  -> plus opening balance only into CSH

Batch Transactions:
  Same active receipt-backed payment_ids
  -> cn_receipt.receipt_total

Physical total:
  Cash counts + verified cheques + saved card totals

Close batch:
  Backend must validate using the exact same transaction scope
```

## Expected outcome

After the fix:

- MOP Reconciliation totals will no longer overstate C3-based amounts
- Batch Transactions grand total will align conceptually with valid system transactions
- Payment-method modal totals will match the selected receipt
- Close Batch will validate using the same rules the cashier sees on screen
