

# C3 Payments Screen — Full Rewrite Plan

## Overview
Rewrite `src/pages/cashier/C3Payments.tsx` from its current mock-data implementation to a fully functional Supabase-backed C3 payment entry screen. Create two new database tables for preserving the C3-specific entry structure, and create a server-side RPC for the intelligent payment split logic.

## Database Changes (2 migrations)

### Migration 1: New tables for C3 entry structure
```sql
-- Stores payment components entered per transaction
CREATE TABLE public.c3_payment_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id INTEGER NOT NULL,
  payment_code TEXT NOT NULL,
  fund_code TEXT NOT NULL,
  component_amount NUMERIC NOT NULL DEFAULT 0,
  period TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.c3_payment_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full" ON public.c3_payment_components FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Stores payment methods entered per transaction
CREATE TABLE public.c3_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id INTEGER NOT NULL,
  mop_code TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'XCD',
  original_amount NUMERIC NOT NULL DEFAULT 0,
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  base_amount NUMERIC NOT NULL DEFAULT 0,
  bank_code TEXT,
  mop_number TEXT,
  cheque_date DATE,
  mop_account_number TEXT,
  mop_notes1 TEXT,
  credit_card_code TEXT,
  expiration_date TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.c3_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full" ON public.c3_payment_methods FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### Migration 2: RPC for C3 payment processing with intelligent split
```sql
CREATE OR REPLACE FUNCTION public.create_c3_payment_with_receipt(
  p_batch_number TEXT, p_payer_type TEXT, p_payer_id TEXT,
  p_date_received DATE, p_remarks TEXT,
  p_components JSONB,  -- [{payment_code, fund_code, amount, period}]
  p_methods JSONB,     -- [{mop_code, currency_code, original_amount, exchange_rate, base_amount, bank_code, mop_number, cheque_date, ...}]
  p_receipt_total NUMERIC, p_user_code TEXT
) RETURNS JSONB ...
```

**Split algorithm** (inside RPC):
1. Build ordered arrays: components (by input order) and methods (by input order)
2. For each component, consume from methods sequentially until the component amount is fulfilled
3. Each consumed slice becomes a `cn_payment` row with that component's `payment_code`/`fund_code` and that method's `mop_code`/details
4. Also insert into `c3_payment_components` and `c3_payment_methods` for structure preservation
5. Create `cn_receipt` and `cn_receipt_prints` as existing RPC does
6. Return `{payment_id, receipt_id, status, detail_count}`

## UI Rewrite: `src/pages/cashier/C3Payments.tsx`

### Structure
The screen uses `BatchSelectionGuard` (existing) and has three main sections:

**Header**: Payer Type, Payer ID (with blur lookup via `usePaymentEntry().lookupPayer()`), C3 Period (Month/Year), Remarks

**Payment Components Section**:
- Fetches configured C3 payment type codes from `useC3PaymentTypes()` hook
- Fetches full details from `tb_payment_type` filtered to only those codes
- Search box at top to filter components by name/code
- Each component row: checkbox + name + amount input (enabled only when checked)
- Selected components with amounts pinned to top of list
- Total shown at bottom

**Payment Methods Section**:
- Add Method button adds a row
- Each row: MOP dropdown (from `tb_method_of_payment`), Currency dropdown (from `useEnabledCashierCurrencies()`), Amount input, Base Amount (auto-calculated if foreign currency using `exchange_rate` from `tb_currencies`)
- CHQ/CHK → opens `ChequeDetailModal`; CRD → opens `CardDetailModal`
- Edit/Remove per row

**Footer (sticky)**:
- Total Payment Received = sum of all method rows' base_amount
- C3 Amount = sum of all component amounts
- Difference = C3 Amount − Total Payment Received
- "Process C3 Payment" button with confirmation dialog

### Processing Flow
1. Validate: payer, components, methods, totals
2. Show `AlertDialog` confirmation
3. Call `create_c3_payment_with_receipt` RPC
4. On success: load receipt, trigger print, show toast
5. Reset form for next entry

### Reused Components/Hooks
- `BatchSelectionGuard`, `BatchInfoBar`, `useBatchSelection`
- `usePaymentEntry().lookupPayer()` for payer validation
- `useC3PaymentTypes()` for configured payment codes
- `useEnabledCashierCurrencies()` for currency list
- `ChequeDetailModal`, `CardDetailModal` for MOP details
- `useReceiptActions().loadReceipt()` for post-save receipt loading
- `useUserCode()` for current user
- `ReceiptCancelModal` for cancellation

## Files Changed

| File | Change |
|------|--------|
| Migration 1 | Create `c3_payment_components` and `c3_payment_methods` tables |
| Migration 2 | Create `create_c3_payment_with_receipt` RPC with split logic |
| `src/pages/cashier/C3Payments.tsx` | Complete rewrite — remove all mock data, implement real Supabase flow |

## Technical Details
- The split algorithm is purely server-side in the RPC — no client-side splitting
- Currency conversion uses `exchange_rate` from `tb_currencies` fetched client-side, passed to RPC as `base_amount`
- The `c3_payment_components` and `c3_payment_methods` tables store the exact user-entered structure for later reconstruction
- The `cn_payment` rows store the split result (one row per component×method slice) for accounting
- Advisory lock pattern reused from existing `create_payment_with_receipt` for safe `payment_id` generation

