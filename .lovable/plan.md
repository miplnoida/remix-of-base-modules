

# Add Payment Method Modal for C3 Payments & Search Pay Invoices

## Overview

Both screens currently create inline MOP rows immediately when "Add Method" is clicked. Replace with a shared modal that collects all MOP fields before adding the row to the list. The same modal serves for both add and edit operations.

## New File: `src/components/payments/PaymentMethodModal.tsx`

A shared modal component using `StandardModal` pattern:
- Props: `open`, `onOpenChange`, `onSave(row: MethodRow)`, `editRow?: MethodRow`, `mopTypes`, `enabledCurrencies`, `baseCurrCode`, `disabled?`
- Fields inside modal: Method (select), Currency (select), Amount (number input)
- When Method is CHQ/CHK → embedded cheque fields (bank, cheque #, date, account, notes) shown inline in the same modal
- When Method is CRD → embedded card fields (card type, card #, expiry, notes) shown inline in the same modal
- Auto-focus on Method select when opened (via `autoFocus` or `useEffect` with ref)
- On Save: validates method is selected and amount > 0, calculates base_amount using exchange rate, returns complete `MethodRow` to parent
- On Cancel/Close: returns focus to the trigger button

Currency exchange rate auto-resolved from `enabledCurrencies` when currency changes. Base amount shown as read-only info when foreign currency.

## Changes to `src/pages/cashier/C3Payments.tsx`

- Import `PaymentMethodModal`
- Add state: `showMethodModal`, `editingMethod: MethodRow | null`
- `addMethodRow` → sets `editingMethod = null`, opens modal
- New: clicking Edit2 icon on existing row → sets `editingMethod = thatRow`, opens modal
- `onSave` callback: if editing, update existing row in `methods`; if adding, append new row
- Remove `ChequeDetailModal` and `CardDetailModal` imports/usage (consolidated into the new modal)
- Add `ref` to "Add Method" button for focus restoration
- Remove inline MOP field rendering (Select/Input grid inside each method card) — replace with read-only summary display per row

## Changes to `src/pages/cashier/SearchPayInvoices.tsx`

- Same pattern as C3Payments above
- Import `PaymentMethodModal`, remove `ChequeDetailModal`/`CardDetailModal`
- `addMethodRow` → opens modal instead of appending blank row
- Edit button on row → opens modal with existing data
- Remove inline field grid, keep read-only summary cards for each method row

## Method Row Display (Both Screens)

After modal-based entry, each method row in the list shows a compact read-only card:
- Method name, Currency, Amount (base amount if foreign)
- Cheque/Card details as info text
- Edit button (opens modal pre-filled) and Delete button

## Focus Management

- Modal open: `useEffect` with `setTimeout` to focus the Method select trigger on mount
- Modal close (save or cancel): focus returns to the "Add Method" button via `buttonRef.current?.focus()`

## No Backend Changes

All MOP data structures and submission payloads remain identical. The modal is purely a UI entry pattern change — the same `MethodRow` objects are produced and passed to existing RPCs.

## Files Changed

| File | Change |
|------|--------|
| `src/components/payments/PaymentMethodModal.tsx` | New — shared modal for add/edit MOP entry |
| `src/pages/cashier/C3Payments.tsx` | Use modal for add/edit, remove inline fields, remove separate cheque/card modals |
| `src/pages/cashier/SearchPayInvoices.tsx` | Same modal integration as C3Payments |

