

# Fix Missing Cheque Verification Database Objects

## Problem
The migration that was applied only contains the updated `close_batch` RPC. The following critical database objects are missing:
- **Table**: `cn_batch_cheque_verification` — required by all cheque verification logic
- **RPC**: `get_batch_cheques_for_verification` — fetches aggregated cheques for a batch
- **RPC**: `verify_batch_cheque` — toggles verification status
- **RPC**: `edit_and_verify_batch_cheque` — saves edits and propagates to source

Both `CashDetails.tsx` (ChequeVerificationList) and `BatchClosing.tsx` call these RPCs, causing the reported error.

## Fix — Single Migration

Create a new migration that:

### 1. Create `cn_batch_cheque_verification` table
- `id` UUID PK, `batch_number` VARCHAR, `source_table` VARCHAR(30), `source_record_id` TEXT, `source_payment_id` BIGINT
- `is_verified` BOOLEAN DEFAULT false, `verified_by`/`verified_at`
- Override fields: `override_cheque_number`, `override_bank_code`, `override_amount`, `override_cheque_date`
- `edit_reason`, `edited_by`, `edited_at`, `created_at`
- UNIQUE constraint on `(batch_number, source_table, source_record_id)`
- Audit trigger using existing `audit_table_changes`

### 2. Create `get_batch_cheques_for_verification(p_batch_number TEXT)`
- UNION ALL query pulling CHQ records from `cn_payment` (via `cn_payment_header`) and `c3_payment_methods` (via `cn_payment_header`)
- LEFT JOIN `cn_batch_cheque_verification` for verification status and overrides
- LEFT JOIN `tb_bank_code` for bank name
- Returns unified structure matching the `VerificationCheque` TypeScript interface

### 3. Create `verify_batch_cheque`
- Parameters: `p_batch_number`, `p_source_table`, `p_source_record_id`, `p_source_payment_id`, `p_is_verified`, `p_user_code`
- INSERT ON CONFLICT UPDATE on the verification table

### 4. Create `edit_and_verify_batch_cheque`
- Parameters: batch, source identifiers, override fields, reason, user_code
- Validates amount > 0
- Upserts into `cn_batch_cheque_verification` with overrides + sets `is_verified = true`
- Propagates edits back to source table (`cn_payment` or `c3_payment_methods`)

## Files
| File | Action |
|------|--------|
| New migration SQL | Create table + 3 RPCs + audit trigger |

No UI changes needed — `ChequeVerificationList.tsx`, `ChequeEditModal.tsx`, `CashDetails.tsx`, and `BatchClosing.tsx` already call these RPCs correctly.

