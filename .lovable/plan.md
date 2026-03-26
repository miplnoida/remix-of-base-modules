

# Configurable Card & Cheque Detail Display

## Summary
Add two new boolean config keys (`show_cheque_details`, `show_card_details`) to `payment_module_config`. Expose toggle switches on the config screen. Consume them in both payment entry routes to conditionally show/hide detail sections and skip related validations.

## Database Change
Insert two rows into `payment_module_config` via migration:
- `show_cheque_details` → `true` (default enabled, preserves current behavior)
- `show_card_details` → `true` (default enabled)

## Config Screen (`PaymentModuleConfig.tsx`)
Add a new tab **"MOP Detail Settings"** with two Switch toggles:
- **Show Cheque Details** — "When enabled, cheque detail fields appear when CHQ is selected"
- **Show Card Details** — "When enabled, card detail fields appear when CRD is selected"

Each toggle saves immediately via `useUpdatePaymentConfig`.

## New Hook (`usePaymentModuleConfig.ts`)
Add `useMopDetailConfig()` hook:
```ts
export function useMopDetailConfig() {
  const { data: chequeConfig } = usePaymentConfig('show_cheque_details');
  const { data: cardConfig } = usePaymentConfig('show_card_details');
  return {
    showChequeDetails: chequeConfig?.config_value !== false,
    showCardDetails: cardConfig?.config_value !== false,
    isLoading: ...
  };
}
```

## C3Payments + SearchPayInvoices (via `PaymentMethodModal.tsx`)
- Accept optional `showChequeDetails` and `showCardDetails` boolean props (default `true`).
- If `showChequeDetails` is false: hide the "Cheque Details" section, remove cheque validation from `canSave`.
- If `showCardDetails` is false: hide the "Card Details" section, remove card validation from `canSave`.
- When hidden, the saved `MethodRow` will have empty cheque/card fields (same as a CSH method).
- Both `C3Payments.tsx` and `SearchPayInvoices.tsx` call `useMopDetailConfig()` and pass the flags to `PaymentMethodModal`.

## PaymentDataEntry (`PaymentDataEntry.tsx`)
- Call `useMopDetailConfig()`.
- In `handleAddDetail`: only open `ChequeDetailModal` if `showChequeDetails` is true; only open `CardDetailModal` if `showCardDetails` is true.
- In `handleEditMopDetail`: same conditional check.
- Modal components remain unchanged — they simply won't be opened.

## Files Modified
1. **Migration SQL** — INSERT two config rows
2. **`src/hooks/usePaymentModuleConfig.ts`** — add `useMopDetailConfig()` hook
3. **`src/pages/cashier/PaymentModuleConfig.tsx`** — add "MOP Detail Settings" tab with toggles
4. **`src/components/payments/PaymentMethodModal.tsx`** — accept config props, conditionally render sections and adjust validation
5. **`src/pages/cashier/C3Payments.tsx`** — consume hook, pass props to modal
6. **`src/pages/cashier/SearchPayInvoices.tsx`** — consume hook, pass props to modal
7. **`src/pages/cashier/PaymentDataEntry.tsx`** — consume hook, conditionally skip opening cheque/card modals

