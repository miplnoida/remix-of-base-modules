

# Card Payment Machine Management & Machine-Based Transaction Entry

## Overview

Replace the current free-text Credit Card / Debit Card amount inputs in Cash Details Entry with a structured, machine-based card transaction entry system. Admin users manage card payment machines (with bank linkages), and cashiers record individual card transactions against those machines during Cash Details Entry.

---

## Database Schema (3 new tables)

### 1. `cn_card_machine` — Master table for card payment machines
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| machine_code | VARCHAR(20) UNIQUE NOT NULL | Short identifier (e.g., "POS-01") |
| machine_name | VARCHAR(100) NOT NULL | Display name |
| card_type_support | VARCHAR(10) NOT NULL | `CRD`, `DRD`, or `BOTH` |
| is_active | BOOLEAN DEFAULT true | Active flag |
| bank_code | VARCHAR(3) | FK to `tb_bank_code.bank_code` |
| settlement_account_no | VARCHAR(50) | Bank settlement account number |
| settlement_account_name | VARCHAR(100) | Account holder name |
| notes | TEXT | Optional notes |
| created_by | VARCHAR(50) | UserCode |
| created_at | TIMESTAMPTZ DEFAULT now() | |
| modified_by | VARCHAR(50) | |
| modified_at | TIMESTAMPTZ | |

### 2. `cn_batch_card_transaction` — Individual card transaction rows per batch
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default `gen_random_uuid()` |
| batch_number | VARCHAR NOT NULL | Parent batch |
| machine_id | UUID NOT NULL | FK to `cn_card_machine.id` |
| card_type | VARCHAR(3) NOT NULL | `CRD` or `DRD` — explicit per row |
| amount | NUMERIC(12,2) NOT NULL | Must be > 0 |
| created_by | VARCHAR(50) | UserCode |
| created_at | TIMESTAMPTZ DEFAULT now() | |

- Validation trigger: amount > 0, card_type IN ('CRD', 'DRD')

### 3. Update to `cn_batch_card_total`
The existing `cn_batch_card_total` table will continue to store the aggregated CRD/DRD totals per batch. A new **RPC** will calculate these totals server-side from `cn_batch_card_transaction` rows and upsert into `cn_batch_card_total`, ensuring the `close_batch` RPC continues to work without modification.

### Audit triggers
- Attach `audit_table_changes` trigger to both `cn_card_machine` and `cn_batch_card_transaction`.

---

## Server-Side Logic (RPC)

### `save_batch_card_transactions`
**Parameters:** `p_batch_number`, `p_transactions JSONB[]` (array of {machine_id, card_type, amount}), `p_user_code`

**Logic:**
1. Validate batch is Open
2. For each transaction row: validate machine exists, is active, has bank_code set, card_type is compatible with machine's `card_type_support`, amount > 0
3. Delete existing `cn_batch_card_transaction` rows for this batch
4. Insert new rows
5. Calculate SUM by card_type and upsert into `cn_batch_card_total` (CRD total, DRD total)
6. Return the calculated totals

This ensures `close_batch` continues reading from `cn_batch_card_total` with zero changes.

---

## Admin UI — Card Machine Management

### New page: `/cashier/card-machines`
- Add to "Sage Integrations Settings" menu group with `admin` permission
- Full CRUD: list all machines in a table, Create/Edit via dialog, Deactivate toggle
- Fields: Machine Code, Machine Name, Card Type Support (CRD/DRD/Both), Bank (dropdown from `tb_bank_code`), Settlement Account No, Settlement Account Name, Active status, Notes
- Deactivation uses soft-delete (is_active = false), not hard delete

### Route addition
- Add route in `AppRoutes.tsx`
- Add menu item in `cashierMenuItems.ts`

---

## Cashier UI — Cash Details Entry Update

### Replace "Card Machine Totals" section (lines 611-651 of `CashDetails.tsx`)

**Current:** Two free-text inputs for CRD and DRD amounts.

**New:** A structured card transaction entry table:

1. **"Add Card Transaction" button** opens an inline row or modal with:
   - Machine dropdown (only active machines)
   - Card Type dropdown (filtered by selected machine's `card_type_support` — if machine supports `BOTH`, show CRD and DRD options; if CRD-only, auto-select CRD)
   - Amount input (number, > 0)

2. **Transaction grid** showing all rows: Machine Code, Machine Name, Card Type, Amount, with Edit/Remove actions

3. **Auto-calculated footer** showing:
   - Total CRD: sum of all rows where card_type = 'CRD'
   - Total DRD: sum of all rows where card_type = 'DRD'
   - These are read-only display values

4. **Summary cards** (CRD and DRD) at the top remain but now show the calculated totals from transaction rows instead of manual input

### Save flow update
- On "Save All", call `save_batch_card_transactions` RPC with the transaction rows
- The RPC returns server-calculated CRD and DRD totals, which update the summary cards
- The existing cash count and cheque save logic remain unchanged
- Physical count formula: `cashTotal + chequeTotal + serverCRDTotal + serverDRDTotal`

### Load flow update
- On batch selection, fetch `cn_batch_card_transaction` rows (joined with `cn_card_machine` for display names) instead of reading flat `cn_batch_card_total`
- CRD/DRD summary totals are derived client-side from loaded rows for display, but authoritative totals come from the server on save

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | CREATE tables, RPC, triggers |
| `src/pages/cashier/CardMachineManagement.tsx` | New admin page |
| `src/pages/cashier/CashDetails.tsx` | Replace card totals section |
| `src/components/payments/CardTransactionEntry.tsx` | New component for transaction row entry |
| `src/components/sidebar/menuItems/cashierMenuItems.ts` | Add menu item |
| `src/components/routing/AppRoutes.tsx` | Add route |

---

## Reconciliation & Reporting Compatibility

- `close_batch` RPC reads from `cn_batch_card_total` — no changes needed since the new RPC keeps this table in sync
- `BatchClosing.tsx` reads from `cn_batch_card_total` — no changes needed
- Future reporting can query `cn_batch_card_transaction` for machine-level, bank-level, card-type, and date-based breakdowns

---

## Technical Details

- No RLS per project rules; authenticated access policies only
- All validation is server-side in the RPC; client validates for UX only
- `tb_bank_code` is the existing bank master table (PK: `bank_code` VARCHAR(3))
- Audit triggers follow existing `audit_table_changes` pattern
- UserCode tracking follows project standards for `created_by`/`modified_by`

