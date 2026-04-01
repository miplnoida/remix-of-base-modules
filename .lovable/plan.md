

# Card Machine Totals Section & Enhanced Transaction Modal on Batch Closing

## Overview

Two enhancements to the Batch Closing screen:

1. **New "Card Machine Totals" section** — shows total payment amount per card machine for the batch, dynamically fetched from `cn_payment` joined with `cn_card_machine`.

2. **Enhanced Payment Methods modal** — when clicking a transaction row, CRD/DRD lines now show the assigned card machine name and a dropdown to reassign it. Changes save immediately to `cn_payment` and refresh batch data.

---

## Technical Details

### 1. New Card Machine Totals Section (`BatchClosing.tsx`)

Add a new collapsible `<Card>` section (between MOP Reconciliation and Batch Transactions) titled "Card Machine Totals".

**Data fetching** — inside `fetchTotals()`, after fetching `cn_payment` rows, add a query:
```sql
SELECT p.card_machine_id, cm.machine_code, cm.machine_name, cm.card_type_support,
       SUM(p.payment_amount) as total_amount, COUNT(*) as txn_count
FROM cn_payment p
JOIN cn_card_machine cm ON cm.id = p.card_machine_id
JOIN cn_payment_header h ON h.payment_id = p.payment_id
JOIN cn_receipt r ON r.payment_id = h.payment_id AND r.status != 'C'
WHERE h.batch_number = ? AND p.card_machine_id IS NOT NULL
  AND COALESCE(h.status, 'active') != 'cancelled'
GROUP BY p.card_machine_id, cm.machine_code, cm.machine_name, cm.card_type_support
```

This can be done client-side by enriching the already-fetched `cn_payment` data with a separate `cn_card_machine` lookup for the office. Store result in new state `cardMachineTotals`.

**UI** — A table with columns: Machine Code, Machine Name, Card Type (CRD/DRD/BOTH), Transactions, Total Amount. Shows "No card machine transactions in this batch" if empty.

### 2. Enhanced Payment Methods Detail Modal

**Fetch changes** — In `handlePaymentRowClick`, expand the `cn_payment` select to include `card_machine_id`:
```ts
.select('id, mop_code, payment_amount, card_machine_id')
```

**Updated `PaymentMethodDetail` interface**:
```ts
interface PaymentMethodDetail {
  id: string;           // cn_payment row id (for updates)
  mop_code: string;
  mop_label: string;
  amount: number;
  card_machine_id: string | null;
  card_machine_name: string | null;
}
```

Note: Instead of grouping by `mop_code`, show individual `cn_payment` rows so each CRD/DRD line can have its own card machine assignment.

**Card machine dropdown** — For CRD/DRD rows, render a `<Select>` populated from `useOfficeCardMachines(officeCode)` (already exists), filtered by compatibility. Show current machine name. On change:
1. Call `supabase.from('cn_payment').update({ card_machine_id }).eq('id', paymentRowId)`
2. Show success/error toast
3. Re-fetch batch totals via `fetchTotals()` to refresh card machine totals section and reconciliation
4. Update the modal detail in local state

**Non-card rows** — Show as before (method + amount, no dropdown).

### 3. Office Code Extraction

Use `batchSel.selectedBatch?.office_code` to pass to `useOfficeCardMachines`. The hook is already built and handles filtering by card type support.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/cashier/BatchClosing.tsx` | Add card machine totals section, enhance payment modal with per-row card machine display and editable dropdown, add state for card machine totals, update fetchTotals and handlePaymentRowClick |

No database migrations needed — all data already exists in `cn_payment.card_machine_id` and `cn_card_machine`.

