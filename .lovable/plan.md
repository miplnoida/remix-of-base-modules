

# Fix: Invoice Attachment in Email, Email Log Creation, and Email Template for Documents

## Root Cause Analysis

### 1. Invoice/Receipt Missing from Email Attachment
The `sendDocumentEmail()` in `useEmailDeliveryConfig.ts` sends a generic notification body ("Your invoice has been generated") but **never generates or attaches the actual invoice/receipt HTML**. The invoice rendering logic exists in `invoicePrinter.ts` (`fetchInvoiceTemplate` + `fetchInvoiceData`) but these functions are private and never called during email composition.

### 2. Email Log Not Created in `notification_logs`
The `notification_logs.triggered_by` column has a **foreign key constraint** referencing `auth.users(id)` (UUID). The edge function passes a user code string (e.g., `"JBarry"`) into this field, causing the insert to fail silently. The edge function's `logToSystem` helper swallows errors with a `try/catch`, so no error surfaces.

### 3. Email Template for Invoices/Receipts
Currently `sendDocumentEmail` uses a hardcoded HTML body. The user wants admin-editable email templates via the existing Email Template Manager screen. We will seed two templates (`invoice_email` and `receipt_email`) with appropriate placeholders and modify `sendDocumentEmail` to fetch the template from `notification_templates` by `template_code`.

---

## Changes

### 1. Database Migration
- **Drop the FK constraint** `notification_logs_triggered_by_fkey` so the `triggered_by` column can accept user code strings instead of only UUIDs
- **Seed two email templates** into `notification_templates` with `template_code = 'invoice_email'` and `template_code = 'receipt_email'`, including placeholders like `{{DOCUMENT_NUMBER}}`, `{{PAYER_NAME}}`, `{{TOTAL_AMOUNT}}`, `{{DOCUMENT_DATE}}`

### 2. `supabase/functions/send-notification/index.ts`
- Store `triggered_by` as-is (string) since the FK will be dropped
- No other changes needed — the insert logic already works correctly when the FK doesn't block it

### 3. `src/lib/invoicePrinter.ts`
- **Export** `fetchInvoiceTemplate()` and `fetchInvoiceData()` so the email flow can reuse them

### 4. `src/hooks/useEmailDeliveryConfig.ts`
- Import exported functions from `invoicePrinter.ts`
- Before sending, **fetch the email template** from `notification_templates` by `template_code` (`invoice_email` or `receipt_email`)
- **Generate the resolved invoice/receipt HTML** using `fetchInvoiceTemplate` + `fetchInvoiceData`
- Pass the resolved document HTML as a **base64-encoded attachment** (HTML file) to the edge function
- Replace placeholders in the email template body with actual values (payer name, document number, amount, date)
- Pass the `template_id` to the edge function so `notification_logs.template_id` is populated

### 5. `src/pages/admin/EmailLogs.tsx`
- Remove the **duplicate "Retries" column** at lines 272-273 (rendered twice)

### 6. `src/pages/admin/notifications/EmailTemplateManager.tsx`
- Add invoice/receipt-specific placeholders to the `AVAILABLE_PLACEHOLDERS` list: `{{DOCUMENT_NUMBER}}`, `{{PAYER_NAME}}`, `{{PAYER_ID}}`, `{{TOTAL_AMOUNT}}`, `{{DOCUMENT_DATE}}`, `{{CURRENCY_CODE}}`
- Add `invoice_email_sent` and `receipt_email_sent` to `TRIGGER_EVENTS`

---

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Drop `triggered_by` FK, seed invoice/receipt email templates |
| `src/lib/invoicePrinter.ts` | Export `fetchInvoiceTemplate` and `fetchInvoiceData` |
| `src/hooks/useEmailDeliveryConfig.ts` | Fetch email template, generate document HTML attachment, pass template_id |
| `src/pages/admin/EmailLogs.tsx` | Remove duplicate Retries column |
| `src/pages/admin/notifications/EmailTemplateManager.tsx` | Add document-related placeholders and trigger events |

