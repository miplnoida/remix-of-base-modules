

# Cheque Entry Modal, Currency Conversion Fix & Total Consistency

## Problems
1. Cheque entry is inline — should use a popup modal with auto-focus
2. `chequesTotal` sums raw amounts regardless of currency — must convert to base (XCD)
3. `close_batch` RPC sums `cn_batch_cheque.amount` without currency conversion — CHQ physical total is wrong for foreign-currency cheques
4. Batch Closing frontend also queries `cn_batch_cheque` without conversion

## Changes

### 1. New Component: `src/components/payments/ChequeEntryModal.tsx`

Modal with fields: Cheque Number, Bank (select from `tb_bank_code`), Amount, Currency (select from enabled currencies), Date of Issue. Auto-focus on Cheque Number input on open. On save, returns the `ChequeEntry` object to the parent. Same modal used for editing existing rows (pre-filled). Focus returns to "Add Cheque" button on close via ref.

### 2. Update `src/pages/cashier/CashDetails.tsx`

- Replace inline cheque table rows with **read-only display rows** (cheque #, bank name, amount with currency, date, base amount)
- "Add Cheque" button opens `ChequeEntryModal` — use `useRef` for focus restoration
- Click edit icon on a row opens modal pre-filled for that cheque
- **Fix `chequesTotal`**: compute base-currency total by looking up each cheque's currency exchange rate from `enabledCurrencies`. Formula: `amount * (isMain ? 1 : exchangeRate)`
- Show both original amount and converted base amount in the cheque display table
- The summary card for "Cheques (CHQ)" shows the base-currency total

### 3. Migration: Update `close_batch` RPC

Update the CHQ physical total calculation to join `cn_batch_cheque` with `tb_currencies` on `currency_code` and apply exchange rate conversion:

```sql
SELECT COALESCE(SUM(
  chq.amount * CASE WHEN cur.is_main_currency THEN 1 ELSE cur.exchange_rate END
), 0) INTO v_phys_chq
FROM cn_batch_cheque chq
LEFT JOIN tb_currencies cur ON cur.currency_code = chq.currency_code
WHERE chq.batch_number = p_batch_number;
```

This ensures both the `close_batch` RPC and the frontend compute CHQ totals identically — using `tb_currencies` exchange rates applied to each cheque row.

### 4. Update `src/pages/cashier/BatchClosing.tsx`

Update the client-side CHQ physical query to also convert cheque amounts to base currency using the same join logic (fetch cheques with their currency, then sum converted amounts). This keeps the display consistent with what `close_batch` validates.

## Files Changed

| File | Change |
|------|--------|
| `src/components/payments/ChequeEntryModal.tsx` | New — modal for add/edit cheque entry with auto-focus |
| `src/pages/cashier/CashDetails.tsx` | Modal-based cheque entry, base-currency cheque total |
| `src/pages/cashier/BatchClosing.tsx` | Currency-converted CHQ physical total query |
| Migration SQL | Update `close_batch` RPC to convert CHQ amounts via `tb_currencies` |

