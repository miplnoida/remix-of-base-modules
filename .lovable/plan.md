

# Payment Module Configuration Enhancement

## Overview

Four interconnected changes to the Payment Module Configuration screen:

1. **Cashier Currencies** — Full CRUD on `tb_currencies`
2. **MOP Detail Settings** — Extend card details to DRD (Debit Card)
3. **Number Format Configuration** — New tab for configurable invoice/receipt/batch number formats
4. **Receipt & Invoice Template** — Remove `receipt_id` placeholder

---

## 1. Cashier Currencies — Add/Edit Currency

### Current State
The Currencies tab is read-only (shows table from `tb_currencies`, only toggle enable/disable in `cashier_currency_config`).

### Changes
- Add "Add Currency" button opening a dialog with fields: `currency_code` (3-char, uppercase), `currency_name`, `symbol`, `exchange_rate`, `is_main_currency`, `sort_order`
- Validation: unique `currency_code`, required `currency_code` + `currency_name`, `exchange_rate > 0`
- Add edit icon per row to open same dialog pre-filled, performing `update` on `tb_currencies`
- If `is_main_currency` toggled on, warn user the existing main currency will be demoted (enforce single-main constraint)
- All operations via `supabase.from('tb_currencies').insert()` / `.update()` with audit logging
- Invalidate all currency-related query keys on success

### Files Changed
- `src/pages/cashier/PaymentModuleConfig.tsx` — Add dialog component, edit buttons, insert/update handlers

---

## 2. MOP Detail Settings — Extend Card to DRD

### Current State
`isCard` check is `mopCode === 'CRD'` only. The "Show Card Details" toggle only applies to CRD.

### Changes
Update all card-detection logic to include DRD:

| File | Current | New |
|------|---------|-----|
| `PaymentMethodModal.tsx` line 146 | `mopCode === 'CRD'` | `mopCode === 'CRD' \|\| mopCode === 'DRD'` |
| `PaymentDetailGrid.tsx` lines 28, 33 | `mopCode === 'CRD'` | `mopCode === 'CRD' \|\| mopCode === 'DRD'` |
| `PaymentDataEntry.tsx` lines 103, 126 | `mop_code === 'CRD'` | `mop_code === 'CRD' \|\| mop_code === 'DRD'` |
| `PaymentHistoryManagement.tsx` line 644 | `mop_code === 'CRD'` | `mop_code === 'CRD' \|\| mop_code === 'DRD'` |
| `MOPDetailModal.tsx` line 51 | `mop_code === 'CRD'` | `mop_code === 'CRD' \|\| mop_code === 'DRD'` |

Update the MOP Detail Settings UI description to mention "CRD / DRD" instead of just "CRD".

### Files Changed
- `PaymentMethodModal.tsx`, `PaymentDetailGrid.tsx`, `PaymentDataEntry.tsx`, `PaymentHistoryManagement.tsx`, `MOPDetailModal.tsx`
- `PaymentModuleConfig.tsx` — Update label text

---

## 3. Number Format Configuration — New Tab

### Database
Insert config rows into `payment_module_config`:

| config_key | config_value (JSONB) | description |
|------------|---------------------|-------------|
| `invoice_number_format` | `{"format": "INV-{YYYYMM}-{SEQ}", "seq_min_length": 3}` | Invoice number format |
| `receipt_number_format` | `{"format": "{PAYER_ID}/{RECEIPT_ID}/{DDMMYYYYHHMM}", "id_min_length": 1}` | Receipt number format |
| `batch_number_format` | `{"format": "{OFFICE_CODE}-{YYYYMMDD}-{HHMMSS}"}` | Batch number format |
| `receipt_id_min_length` | `1` | Minimum digits for receipt_id display |
| `invoice_id_min_length` | `1` | Minimum digits for invoice_id display |

### Available Placeholders (displayed in UI)

**System Placeholders:**
- `{YYYY}`, `{YY}`, `{MM}`, `{DD}`, `{YYYYMM}`, `{YYYYMMDD}`, `{DDMMYYYY}` — date parts
- `{HH}`, `{MI}`, `{SS}`, `{HHMM}`, `{HHMMSS}`, `{DDMMYYYYHHMM}` — time parts
- `{SEQ}` — auto-increment sequence (with configurable min length via zero-padding)
- `{OFFICE_CODE}` — current user's office code

**User/Entity Placeholders:**
- `{PAYER_ID}` — payer identifier
- `{PAYER_TYPE}` — payer type code
- `{USER_CODE}` — current cashier's user code
- `{RECEIPT_ID}` — database-generated receipt identity
- `{INVOICE_ID}` — database-generated invoice identity
- `{BATCH_NUMBER}` — parent batch number

**Static Text:** Any text outside `{}` is treated as literal (e.g., `INV-`, `/`, `-`)

### UI (New "Number Formats" tab)
- Three cards: Invoice Number, Receipt Number, Batch Number
- Each card has: format pattern input, placeholder reference sidebar, live preview showing example output
- Minimum ID length inputs for receipt_id and invoice_id (numeric, 1-10)
- Save button per card persisting to `payment_module_config`

### Backend Updates

**Invoice Number** — Update `create_invoice_with_lines` RPC:
- Read format from `payment_module_config` where `config_key = 'invoice_number_format'`
- Parse format string, replace placeholders with runtime values
- For `{SEQ}`, use advisory lock + max sequence extraction with configured min length padding
- Fall back to current `INV-YYYYMM-NNN` if no config exists

**Receipt Number** — Update `set_receipt_number()` trigger function:
- Read format from `payment_module_config` where `config_key = 'receipt_number_format'`
- Replace placeholders with actual values (`{RECEIPT_ID}` → `NEW.receipt_id`, `{PAYER_ID}` → resolved payer, etc.)
- Apply `id_min_length` padding to receipt_id
- Fall back to current format if no config exists

**Batch Number** — Update `src/hooks/usePaymentBatch.ts`:
- Fetch format config from `payment_module_config`
- Parse and replace `{OFFICE_CODE}`, date/time placeholders
- Fall back to current `{office}-{YYYYMMDD}-{HHMMSS}` if no config

### Files Changed
- `payment_module_config` — Insert default format rows
- DB migration — Update `create_invoice_with_lines` and `set_receipt_number()` to read config
- `src/pages/cashier/PaymentModuleConfig.tsx` — Add "Number Formats" tab
- `src/hooks/usePaymentBatch.ts` — Read batch format config

---

## 4. Receipt & Invoice Template — Remove `receipt_id` Placeholder

### Changes
- `src/components/cashier/ReceiptTemplateTab.tsx` — Remove `{ key: '{{receipt_id}}', description: 'Numeric receipt ID' }` from the `PLACEHOLDERS` array (line 23)
- `src/lib/receiptPrinter.ts` — Remove `{{receipt_id}}` replacement from template rendering (if present)
- The `{RECEIPT_ID}` placeholder remains available in the Number Format Configuration (section 3)

### Files Changed
- `ReceiptTemplateTab.tsx`
- `receiptPrinter.ts` (if applicable)

---

## Summary of All Files

| File | Change |
|------|--------|
| `PaymentModuleConfig.tsx` | Currency CRUD dialog, MOP label update, new Number Formats tab |
| `PaymentMethodModal.tsx` | Add DRD to card check |
| `PaymentDetailGrid.tsx` | Add DRD to card check |
| `PaymentDataEntry.tsx` | Add DRD to card check |
| `PaymentHistoryManagement.tsx` | Add DRD to card check |
| `MOPDetailModal.tsx` | Add DRD to card check |
| `ReceiptTemplateTab.tsx` | Remove receipt_id placeholder |
| `receiptPrinter.ts` | Remove receipt_id rendering |
| `usePaymentBatch.ts` | Read batch number format from config |
| DB migration | Update `create_invoice_with_lines` + `set_receipt_number()` to read format config |
| Data insert | Insert default format config rows into `payment_module_config` |

