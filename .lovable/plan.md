

# Simplify Invoice Payment Methods & Add Server-Side Allocation

## Problem
The "Payment Details" section on `/cashier/search-pay-invoices` currently uses `AddDetailModal` which forces the user to select payment_type, fund_code, period, and other allocation fields. These are unnecessary because the payable components are already defined in the selected invoices' line items (`cn_invoice_lines`). The allocation should be automatic, matching the C3 Payments intelligence.

## Solution

### 1. Replace `AddDetailModal` with C3-style inline MOP entry

Remove `AddDetailModal` and `PaymentDetailGrid` from the invoice payment screen. Replace with the same inline method rows used in C3Payments:
- Each row captures only: **Method of Payment**, **Currency**, **Amount**
- Cheque/Card details via existing `ChequeDetailModal`/`CardDetailModal`
- No payment_code, fund_code, or period fields

### 2. Update `pay_invoices_with_receipt` RPC with intelligent allocation

Rewrite the RPC to:
1. Accept `p_methods JSONB` (same shape as C3) instead of `p_detail_lines JSONB` with payment_code/fund_code
2. For each selected invoice, fetch its `cn_invoice_lines` to get the payment components (payment_code, fund_code, amounts)
3. Build an ordered component array from all invoice lines across all selected invoices
4. Apply the same sequential allocation algorithm from `create_c3_payment_with_receipt`: iterate components and methods simultaneously, allocating `LEAST(comp_remaining, meth_remaining)` to each `cn_payment` row
5. Resolve `base_currency` and `currency_conversion_rate` server-side from `tb_currencies`

### 3. Update `SearchPayInvoices.tsx` UI

Replace the MOP section to use C3-style `MethodRow` state with inline selects/inputs:
- Method select (from `tb_method_of_payment`)
- Currency select (from enabled currencies)
- Amount input
- Auto-calculated base amount for foreign currencies
- Edit/delete buttons per row
- Remove all imports of `AddDetailModal` and `PaymentDetailGrid`

Update submission to pass `p_methods` array matching C3 format instead of `p_detail_lines`.

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Redefine `pay_invoices_with_receipt` — accept methods array, fetch invoice lines server-side, apply C3 sequential allocation |
| `src/pages/cashier/SearchPayInvoices.tsx` | Replace `AddDetailModal`/`PaymentDetailGrid` with inline MOP rows matching C3 pattern; update submission payload |

## Allocation Logic (Server-Side)

```text
Components = [inv1_line1, inv1_line2, inv2_line1, ...] (ordered by invoice, then sort_order)
Methods = [method1, method2, ...] (as entered by user)

comp_idx = 1, meth_idx = 1
comp_remaining = component[1].outstanding
meth_remaining = method[1].base_amount

WHILE both have items:
  alloc = MIN(comp_remaining, meth_remaining)
  INSERT cn_payment(payment_code=comp.code, fund=comp.fund, amount=alloc, mop=meth.mop, ...)
  comp_remaining -= alloc
  meth_remaining -= alloc
  advance whichever hit zero
```

This is identical to the C3 split logic, ensuring consistent behavior across both screens.

