

# Remove Card Machine Transactions from Cash Details & Update Batch Closing Card Totals

## Overview

Two changes: (1) Remove the entire "Card Machine Transactions" section from the Cash Details Entry screen since card payments are now tracked per-payment via `card_machine_id` on `cn_payment`. (2) On Batch Closing, derive CRD/DRD physical totals directly from `cn_payment` (the payments received) instead of from the manual `cn_batch_card_total` table.

The net effect: CRD/DRD reconciliation becomes automatic — physical count equals system total because both come from the same source (`cn_payment`).

---

## Technical Details

### 1. Update `src/pages/cashier/CashDetails.tsx`

**Remove:**
- Import of `CardTransactionEntry` and `CardTransaction`
- State variables: `cardTransactions`, `loadingCards`
- The `useEffect` that loads card transactions from `cn_batch_card_transaction`
- `creditCardTotal` and `debitCardTotal` computed values
- The card transaction RPC save call (`save_batch_card_transactions`) from `saveAll()`
- The CRD and DRD summary cards from the grid
- The `<CardTransactionEntry>` component at the bottom

**Update:**
- `physicalCountInMain` calculation: remove `creditCardTotal + debitCardTotal`
- Summary grid: reduce from 7 columns to 5 (Opening Balance, Cash, Cheques, Physical Count)
- Page subtitle: remove "record card machine totals" text

### 2. Update `src/pages/cashier/BatchClosing.tsx`

**Remove:**
- `CardTransaction` interface (lines 25-32)
- `cardTransactions` state and `cardSectionOpen` state
- The `cn_batch_card_total` query block (lines 158-168) that fetches `physCrd`/`physDrd`
- The `cn_batch_card_transaction` query block (lines 172-193)
- The entire "Card Machine Transactions" collapsible section (lines 525-574)

**Update:**
- CRD/DRD physical totals: derive from `cn_payment` system totals instead of `cn_batch_card_total`. After computing `sysTotals`, set `physical.CRD = sysTotals.CRD` and `physical.DRD = sysTotals.DRD`. This makes card payment reconciliation automatic.

### 3. Database Migration — Update `close_batch` RPC

Replace the CRD/DRD physical count section (currently reading from `cn_batch_card_total`) to instead read from `cn_payment` directly:

```sql
-- Replace cn_batch_card_total lookup with cn_payment-based calculation
SELECT
  COALESCE(SUM(CASE WHEN p.mop_code = 'CRD' THEN p.payment_amount ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN p.mop_code = 'DRD' THEN p.payment_amount ELSE 0 END), 0)
INTO v_physical_crd, v_physical_drd
FROM cn_payment p
JOIN cn_payment_header h ON h.payment_id = p.payment_id
JOIN cn_receipt r ON r.payment_id = h.payment_id AND r.status != 'C'
WHERE h.batch_number = p_batch_number
  AND p.mop_code IN ('CRD', 'DRD')
  AND COALESCE(h.status, 'active') != 'cancelled';
```

This makes physical CRD/DRD = system CRD/DRD, so reconciliation always passes for card payments.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/cashier/CashDetails.tsx` | Remove CardTransactionEntry section, related state, save logic, and summary cards |
| `src/pages/cashier/BatchClosing.tsx` | Remove card transaction detail section; derive CRD/DRD physical from cn_payment |
| Migration SQL | Update `close_batch` RPC to source CRD/DRD physical from `cn_payment` instead of `cn_batch_card_total` |

