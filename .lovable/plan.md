

# Invoice Printing and Template System

## Problem
1. Invoice creation does not trigger actual printing — only a toast message appears.
2. Re-Print button on both CreateInvoice and SearchPayInvoices only updates the DB status but never opens a print window.
3. No invoice template system exists — receipts have a configurable HTML template, invoices do not.

## Solution

### 1. Database: Add `invoice_template` config row

Insert a new row into `payment_module_config` with `config_key = 'invoice_template'` containing a default industry-standard invoice HTML template. The template will use invoice-specific placeholders like `{{invoice_number}}`, `{{payer_name}}`, `{{due_date}}`, `{{line_rows}}`, `{{total_amount}}`, etc.

### 2. New file: `src/lib/invoicePrinter.ts`

Mirrors `src/lib/receiptPrinter.ts` pattern exactly:
- `fetchInvoiceTemplate()` — reads `invoice_template` from `payment_module_config`
- `fetchInvoiceData(invoiceId)` — queries `cn_invoices` + `cn_invoice_lines` + resolves payer name, payment type descriptions, currency info, and builds line item HTML rows
- `printConfiguredInvoice(invoiceId)` — main entry point: fetches template + data, replaces placeholders, opens print window

Placeholders to support:
- `{{org_name}}`, `{{invoice_number}}`, `{{invoice_date}}`, `{{due_date}}`, `{{status}}`
- `{{payer_name}}`, `{{payer_id}}`, `{{payer_type}}`, `{{payer_email}}`, `{{payer_phone}}`, `{{payer_address}}`
- `{{invoice_type}}`, `{{payment_source}}`, `{{currency_code}}`
- `{{line_rows}}` — HTML table rows for each invoice line (payment type, currency, amount, base amount)
- `{{total_amount}}`, `{{total_amount_base}}`, `{{base_currency}}`
- `{{public_notes}}`, `{{print_date}}`

Default HTML template: A4-style invoice layout with organization header, bill-to section, line items table, totals, and notes footer.

### 3. New file: `src/components/cashier/InvoiceTemplateTab.tsx`

Cloned from `ReceiptTemplateTab.tsx` but configured for invoices:
- Reads/writes `invoice_template` config key
- Uses invoice-specific PLACEHOLDERS list
- Uses invoice-specific SAMPLE_DATA for preview
- Same HTML editor + placeholder sidebar + preview dialog pattern

### 4. Update `src/pages/cashier/PaymentModuleConfig.tsx`

Change the "Receipt" tab to "Receipt & Invoice" (shared tab approach per user preference):
- Add a sub-toggle or sub-tabs within the tab content to switch between Receipt Template and Invoice Template
- Import and render both `ReceiptTemplateTab` and `InvoiceTemplateTab`

### 5. Update `src/pages/cashier/CreateInvoice.tsx`

- After successful invoice creation (line ~450), call `printConfiguredInvoice(result.invoice_id)` to auto-print
- In `handleReprintInvoice` (line ~458), after the status update call, call `printConfiguredInvoice(createdInvoice.id)` to actually print

### 6. Update `src/hooks/useInvoiceActions.ts`

- Add `printConfiguredInvoice` import
- In `reprintInvoice`, after successful DB update, call `printConfiguredInvoice(invoiceId)` so that re-printing from SearchPayInvoices also triggers actual printing

### 7. Update `src/pages/cashier/SearchPayInvoices.tsx`

- No additional changes needed since it already calls `invoiceActions.reprintInvoice()` which will now trigger printing via the updated hook

## Files Changed

| File | Change |
|------|--------|
| Migration (INSERT) | Add `invoice_template` row to `payment_module_config` |
| `src/lib/invoicePrinter.ts` | New — invoice print engine |
| `src/components/cashier/InvoiceTemplateTab.tsx` | New — invoice template designer |
| `src/pages/cashier/PaymentModuleConfig.tsx` | Add Invoice sub-section to Receipt tab |
| `src/pages/cashier/CreateInvoice.tsx` | Auto-print on create + reprint |
| `src/hooks/useInvoiceActions.ts` | Trigger print on reprint action |

