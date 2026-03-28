

# Cheque Verification from Payment Sources — Implementation Plan

## Summary

Replace the manual cheque entry section in Cash Details with an auto-populated, verification-driven view. Cheques flow in from three payment screens and are displayed for physical verification by the cashier. No manual add/delete. Edits propagate back to source records.

---

## Data Sources

Cheques already exist in the database from payment flows:

| Source | Table | Key Fields |
|--------|-------|------------|
| Payment Data Entry | `cn_payment` (mop_code='CHQ') | `mop_number`, `bank_code`, `cheque_date`, `payment_amount`, `payment_id` |
| Search & Pay Invoices | `cn_payment` (mop_code='CHQ') | Same as above |
| C3 Payments | `c3_payment_methods` (mop_code='CHQ') | `mop_number`, `bank_code`, `cheque_date`, `original_amount`, `payment_id` |

Both link to `cn_payment_header` via `payment_id` to get `batch_number` and payer info.

---

## Database Changes

### 1. New table: `cn_batch_cheque_verification`

Tracks verification status and edits per cheque. Does NOT duplicate cheque data — references source records.

```
cn_batch_cheque_verification (
  id UUID PK,
  batch_number VARCHAR NOT NULL,
  source_table VARCHAR(30) NOT NULL,        -- 'cn_payment' or 'c3_payment_methods'
  source_record_id TEXT NOT NULL,           -- payment_sequence_no or c3_payment_methods.id
  source_payment_id INTEGER NOT NULL,       -- payment_id for joining
  is_verified BOOLEAN DEFAULT false,
  verified_by VARCHAR(50),
  verified_at TIMESTAMPTZ,
  -- Override fields (NULL = no edit, use source value)
  override_cheque_number VARCHAR(30),
  override_bank_code VARCHAR(3),
  override_amount NUMERIC(10,2),
  override_cheque_date DATE,
  edit_reason TEXT,
  edited_by VARCHAR(50),
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

### 2. New RPC: `get_batch_cheques_for_verification`

Aggregates cheques from both `cn_payment` and `c3_payment_methods` for a given batch. Returns a unified structure:

- Joins `cn_payment` WHERE `mop_code = 'CHQ'` via `cn_payment_header.batch_number`
- Joins `c3_payment_methods` WHERE `mop_code = 'CHQ'` via `cn_payment_header.batch_number`  
- LEFT JOINs `cn_batch_cheque_verification` to overlay verification status and any overrides
- Returns: cheque_number, bank_code, bank_name, amount, currency_code, cheque_date, payer_id, payer_type, source_table, source_record_id, payment_id, is_verified, override fields

### 3. New RPC: `verify_batch_cheque`

Sets `is_verified = true` for a cheque row. Creates verification record if not exists.

### 4. New RPC: `edit_and_verify_batch_cheque`

- Saves override fields to `cn_batch_cheque_verification`
- Also updates the **source record** (`cn_payment` or `c3_payment_methods`) to propagate the corrected cheque data
- Logs audit trail with before/after values
- Server-side validation: amount > 0, cheque_number not empty

### 5. Update `close_batch` RPC

Change the physical CHQ calculation from reading `cn_batch_cheque` to:
- Query the same aggregation as `get_batch_cheques_for_verification`
- Sum only rows WHERE `is_verified = true`
- Use override amounts where present, else source amounts
- Convert to base currency using `tb_currencies`

### 6. Drop legacy usage

The `cn_batch_cheque` table remains (backward compat) but is no longer written to from Cash Details. The save flow in `CashDetails.tsx` will stop inserting into it.

---

## UI Changes

### `CashDetails.tsx` — Cheque Entries Section

**Remove:**
- "Add Cheque" button
- Delete/remove cheque capability
- `ChequeEntryModal` for adding new cheques
- All `cn_batch_cheque` insert/delete logic in `saveAll`

**Replace with:**
- Auto-fetched cheque list from `get_batch_cheques_for_verification` RPC
- Checkbox column for physical verification (checked = verified)
- Visual distinction: verified rows get green left border + checkmark icon; unverified rows get amber/warning styling
- "Edit" button per row — opens a modal to correct cheque details (cheque number, bank, amount, date) with a mandatory "Reason for Edit" field
- Read-only "Source" column showing origin (Payment Entry / C3 Payment / Invoice Payment)
- Payer column showing payer ID
- Summary footer: "Verified Total" and "Unverified Count"
- Bulk verify checkbox in header to verify all at once

### `ChequeEntryModal.tsx` — Repurpose as `ChequeEditModal`

- Same fields but with an added "Reason for Edit" text field
- On save, calls `edit_and_verify_batch_cheque` RPC
- Shows original vs. edited values side by side

### `BatchClosing.tsx` — Update physical CHQ calculation

- Replace the `cn_batch_cheque` query (lines 81-101) with the new verification-aware query
- Only sum verified cheques
- Show unverified count as a warning if > 0

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | New table, 3 RPCs, updated `close_batch` |
| `src/components/payments/ChequeVerificationList.tsx` | New component — verification table with checkboxes |
| `src/components/payments/ChequeEditModal.tsx` | New component — edit modal with reason field |
| `src/pages/cashier/CashDetails.tsx` | Replace cheque section, remove manual add/delete |
| `src/pages/cashier/BatchClosing.tsx` | Update CHQ physical total query |
| `src/components/payments/ChequeEntryModal.tsx` | Deprecated (can keep for reference) |

---

## Audit Logging

- Cheque verification: logs user, timestamp, cheque details
- Cheque edit: logs before_value (original source data), after_value (overrides), edit_reason, user
- All via `system_audit_trail` using existing `audit_table_changes` trigger on `cn_batch_cheque_verification`

---

## Batch Closing Integrity

- `close_batch` RPC: physical CHQ = SUM of verified cheques only (with currency conversion)
- System CHQ (from `cn_payment` WHERE mop_code='CHQ') remains unchanged
- If unverified cheques exist, the mismatch will naturally prevent closing (physical < system), which is correct business behavior
- BatchClosing UI will show a warning badge: "X cheques pending verification"

