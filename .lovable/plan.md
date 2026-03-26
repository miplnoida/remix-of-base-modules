

# Filter Payment Code Dropdown to Exclude C3 Payment Types

## Problem
The "Add Payment Detail Line" popup on `/cashier/payment-data-entry` shows all payment codes from `tb_payment_type`, including those configured as C3 Payment Types. These C3 codes should be excluded since they belong to the C3 payments flow.

## Solution
In `src/components/payments/AddDetailModal.tsx`:

1. Import the existing `useC3PaymentTypes` hook from `src/hooks/usePaymentModuleConfig.ts`
2. In the `filteredPaymentTypes` memo, add a pre-filter step that excludes any `payment_code` present in the `c3PaymentTypes` array
3. No backend changes needed — the C3 config is already fetched from `payment_module_config` table via the hook

## File Changed
**`src/components/payments/AddDetailModal.tsx`** — ~5 lines changed:
- Add import for `useC3PaymentTypes`
- Call `useC3PaymentTypes()` to get the exclusion list
- Update `filteredPaymentTypes` memo to first exclude C3 codes, then apply search filter
- Add `c3PaymentTypes` to the memo's dependency array

The filtering is fully database-driven: when codes are added/removed in the "C3 Payment Types" config tab, the dropdown updates automatically on next open.

