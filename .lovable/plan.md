

# Card Machine Selection for CRD/DRD Payments

## Overview

When a cashier selects Credit Card (CRD) or Debit Card (DRD) as payment method, a mandatory card-machine dropdown must appear, filtered by the office location of the selected batch. If no machines are configured for that office, payment submission is blocked with a clear error.

This affects three screens (PaymentDataEntry, SearchPayInvoices, C3Payments) and two modal components (PaymentMethodModal, AddDetailModal).

---

## Technical Details

### 1. Database Migration — Add `card_machine_id` to `cn_payment`

Add a nullable `card_machine_id` column (UUID) to `cn_payment` referencing `cn_card_machine(id)`. This stores which card machine was used for each CRD/DRD payment line.

```sql
ALTER TABLE public.cn_payment
  ADD COLUMN card_machine_id UUID REFERENCES cn_card_machine(id);
```

### 2. Create Shared Hook — `useOfficeCardMachines(officeCode)`

New file: `src/hooks/useOfficeCardMachines.ts`

Fetches active card machines from `cn_card_machine` filtered by `office_code` and `is_active = true`. Also filters by `card_type_support` compatibility (CRD, DRD, or BOTH). Returns `{ machines, isLoading }`.

### 3. Update `PaymentMethodModal` Component

- Accept new props: `officeCode` (from the selected batch) and `onCardMachineError` callback
- When `mopCode` is CRD or DRD, call `useOfficeCardMachines(officeCode)` and filter by card type compatibility (`card_type_support` = mopCode or 'BOTH')
- Render a **Card Machine** dropdown (mandatory) below the Method of Payment select
- If no machines available for the office, show inline error: "No card machines configured for this office location. Card payment cannot be processed."
- Block the Save button when card machine is required but not selected
- Add `card_machine_id` to the `MethodRow` interface

### 4. Update `AddDetailModal` Component (PaymentDataEntry)

- Accept new prop: `officeCode`
- When `mopCode` is CRD or DRD, show the card machine dropdown using the same hook
- Add `card_machine_id` to `DetailLineData` interface
- Block the Add/Update button if card machine is required but not selected or unavailable

### 5. Update `PaymentDataEntry.tsx`

- Pass `officeCode` from `batchSel.selectedBatch.office_code` to `AddDetailModal`
- Include `card_machine_id` in the detail lines JSON sent to `create_payment_with_receipt` RPC
- Add pre-submission validation: if any detail line has CRD/DRD without `card_machine_id`, block submission with error toast

### 6. Update `SearchPayInvoices.tsx`

- Pass `officeCode` to `PaymentMethodModal`
- Include `card_machine_id` in the methods JSON sent to `pay_invoices_with_receipt` RPC
- Add pre-submission validation for card machine

### 7. Update `C3Payments.tsx`

- Pass `officeCode` to `PaymentMethodModal`
- Include `card_machine_id` in the methods JSON sent to `create_c3_payment_with_receipt` RPC
- Add pre-submission validation for card machine

### 8. Update RPCs (3 functions)

Each of the three RPCs (`create_payment_with_receipt`, `pay_invoices_with_receipt`, `create_c3_payment_with_receipt`) needs to:
- Read `card_machine_id` from the JSON detail/method lines
- Persist it to the `cn_payment.card_machine_id` column
- Validate server-side: if `mop_code` is CRD/DRD, `card_machine_id` must not be null

---

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `card_machine_id` column to `cn_payment` |
| Migration SQL | Update 3 RPCs to handle `card_machine_id` |
| `src/hooks/useOfficeCardMachines.ts` (new) | Shared hook to fetch office-filtered card machines |
| `src/components/payments/PaymentMethodModal.tsx` | Add card machine dropdown for CRD/DRD, new props |
| `src/components/payments/AddDetailModal.tsx` | Add card machine dropdown for CRD/DRD, new props |
| `src/pages/cashier/PaymentDataEntry.tsx` | Pass officeCode, include card_machine_id in submission |
| `src/pages/cashier/SearchPayInvoices.tsx` | Pass officeCode, include card_machine_id in submission |
| `src/pages/cashier/C3Payments.tsx` | Pass officeCode, include card_machine_id in submission |

