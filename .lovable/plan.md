

# Create Invoice — Full Functional Implementation

## Overview
Complete rewrite of `/cashier/create-invoice` from hardcoded mock to fully Supabase-backed invoice creation with dynamic dropdowns, payer lookup, multi-currency line items, and atomic database persistence.

## Database Changes (1 migration)

### 3 New Tables

**tb_invoices** — Invoice header
- `id SERIAL PRIMARY KEY`, `invoice_number TEXT UNIQUE NOT NULL`
- `invoice_type TEXT NOT NULL` (from tb_invoice_types.code)
- `payment_source TEXT NOT NULL` (from tb_payment_sources.code)
- `payer_type TEXT NOT NULL`, `payer_id TEXT NOT NULL`, `payer_name TEXT`
- `currency_code TEXT NOT NULL DEFAULT 'XCD'`, `exchange_rate NUMERIC DEFAULT 1`
- `total_amount NUMERIC DEFAULT 0`, `total_amount_base NUMERIC DEFAULT 0`
- `due_date DATE NOT NULL`
- `public_notes TEXT`, `internal_notes TEXT`
- `is_recurring BOOLEAN DEFAULT false`, `status TEXT DEFAULT 'pending'`
- `created_by TEXT`, `created_at TIMESTAMPTZ DEFAULT now()`

**tb_invoice_lines** — Line items
- `id SERIAL PRIMARY KEY`, `invoice_id INTEGER REFERENCES tb_invoices(id)`
- `payment_code TEXT NOT NULL`, `currency_code TEXT DEFAULT 'XCD'`
- `amount NUMERIC DEFAULT 0`, `exchange_rate NUMERIC DEFAULT 1`, `amount_base NUMERIC DEFAULT 0`
- `sort_order INTEGER DEFAULT 0`

**tb_invoice_recurring** — Recurring config
- `id SERIAL PRIMARY KEY`, `invoice_id INTEGER REFERENCES tb_invoices(id)`
- `frequency TEXT NOT NULL`, `start_date DATE NOT NULL`, `end_date DATE`
- `next_run_date DATE`, `is_active BOOLEAN DEFAULT true`

All tables: RLS enabled with `FOR ALL TO authenticated USING (true)`.

### RPC: `create_invoice_with_lines`
Atomic function using advisory lock to generate invoice number (INV-YYYYMM-NNN), insert header + lines + recurring config. Returns `{invoice_id, invoice_number}`.

## UI Rewrite: `src/pages/cashier/CreateInvoice.tsx`

### Header Section (single Card, grid layout)
- **Invoice Type** — `Select` from `tb_invoice_types` where `is_active = true` (code/description)
- **Payment Source** — `Select` from `tb_payment_sources` where `is_active = true` (code/description)
- **Payer Type** — `Select` from `tb_payer_type` where `is_active = true` (code/description)
- **Payer ID / SSN** — `Input` with onBlur calling `usePaymentEntry().lookupPayer()`. Shows payer name + status indicator exactly like PaymentHeaderForm (CheckCircle/AlertCircle icons, read-only name field)
- **Invoice Currency** — `Select` from `useEnabledCashierCurrencies()`, default = main currency
- **Due Date** — `DatePicker`, validation: no past dates

### Payment Details Section (Card with dynamic table)
- Table columns: Payment Type (`tb_payment_type` code/description), Currency, Amount, Base Amount (read-only text showing `<currency_code> <converted_amount>`)
- Add Row / Delete Row buttons. Minimum 1 row required.
- Exchange rates from `tb_currencies`. Base amount = amount × exchange_rate, recalculated on currency or amount change.
- Total row showing sum of all base amounts with main currency code.

### Notes Section
- Public Notes textarea, Internal Notes textarea

### Recurring Section
- `Switch` toggle "Is Recurring"
- When enabled: Frequency dropdown (weekly/monthly/quarterly/semi-annual/annual), Start Date (mandatory), End Date (optional)

### Submit
- "Create Invoice" button: validates all mandatory fields, payer exists, amounts > 0, due date >= today
- Calls `create_invoice_with_lines` RPC
- Success toast with invoice number, form reset
- Button disabled during submission

### Data Fetching
- `useQuery` hooks for tb_invoice_types, tb_payment_sources, tb_payer_type, tb_payment_type
- Reuse `useEnabledCashierCurrencies()` and `usePaymentEntry().lookupPayer()`

## Files Changed

| File | Change |
|------|--------|
| New migration | 3 tables + RPC + RLS |
| `src/pages/cashier/CreateInvoice.tsx` | Complete rewrite |

