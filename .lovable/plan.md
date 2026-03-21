

# Fix: Payer ID Padding, Print Status, Invoice Status Placeholder

## Three Issues

### 1. Payer ID must be 6-char zero-padded
**Root cause**: In `create_invoice_with_lines` RPC (line 94), new AP payer ID is set as `v_new_payer_id::TEXT` without padding.
**Fix**: Change to `LPAD(v_new_payer_id::TEXT, 6, '0')` in the RPC via a migration that redefines the function.

### 2. Printing must NOT change status
**Root cause**: Both `useReceiptActions.reprintReceipt` and `useInvoiceActions.reprintInvoice` update the record status to `'R'` and increment `reprint_times` before triggering the print window.
**Fix**: Remove all status-changing logic from both reprint functions. Keep only: validate record exists, validate not cancelled, increment `reprint_times` (audit trail), then call the print function. Do NOT update `status`.

**Files**:
- `src/hooks/useReceiptActions.ts` — remove `status: 'R'` from the update payload in `reprintReceipt`
- `src/hooks/useInvoiceActions.ts` — remove `status: 'R'` from the update payload in `reprintInvoice`

### 3. `{{status}}` prints raw code instead of description
**Root cause**: `src/lib/invoicePrinter.ts` line 33 queries `tb_invoice_status` using column names `status_code` and `status_description`, but the actual columns are `code` and `description`. The query returns empty results, so the statusMap is never populated, and the raw code falls through.
**Fix**: Change the select to `.select('code, description')` and update the map builder to use `s.code` and `s.description`.

**File**: `src/lib/invoicePrinter.ts` — lines 33 and 50-51

## Changes Summary

| File | Change |
|------|--------|
| Migration SQL | Redefine `create_invoice_with_lines` with `LPAD(v_new_payer_id::TEXT, 6, '0')` |
| `src/hooks/useReceiptActions.ts` | Remove `status: 'R'` from reprint update |
| `src/hooks/useInvoiceActions.ts` | Remove `status: 'R'` from reprint update |
| `src/lib/invoicePrinter.ts` | Fix column names in `tb_invoice_status` query |

