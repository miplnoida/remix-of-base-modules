

# Fix user_code Length Mismatch Across All Tables

## Problem
`profiles.user_code` was widened to `varchar(50)` in Live, but 79 columns across 45+ tables still use `varchar(5)`, `varchar(8)`, `varchar(10)`, `varchar(20)`, or `varchar(30)`. When a user_code longer than the column limit is inserted, PostgreSQL throws a value-too-long exception — breaking receipt creation and any other write path.

## Root Cause (Receipt Flow)
The C3 receipt creation path calls `create_c3_payment_with_receipt` RPC which inserts `p_user_code` (TEXT, no limit) into:
- `cn_receipt.created_by` → **varchar(10)** — fails for codes > 10 chars
- `cn_receipt_prints.printed_by` → **varchar(5)** — fails for codes > 5 chars

The `create_payment_with_receipt` and `pay_invoices_with_receipt` RPCs have the same issue.

## Impact Analysis

No function signatures need changes (all use `TEXT` parameters). No frontend changes needed (TypeScript `string` has no length limit). The fix is **100% database column widening**.

### Columns to widen to varchar(50):

**varchar(5) columns (23 columns, 12 tables) — highest risk:**

| Table | Columns |
|---|---|
| cn_receipt_prints | printed_by |
| cn_batch | entered_by, verified_by |
| au_ip_self_employ | entered_by, verified_by |
| c3_config_audit | changed_by |
| c3_config_details | created_by, modified_by |
| c3_config_periods | created_by, modified_by |
| er_master | entered_by, modified_by, verified_by |
| er_suit | entered_by, modified_by, verified_by |
| ip_master | entered_by |
| ip_self_employ | entered_by, verified_by |
| tb_levy_slab_details | created_by, modified_by |
| tb_levy_slabs | created_by, modified_by |

**varchar(8) columns (1 column, 1 table):**

| Table | Columns |
|---|---|
| cn_receipt | cancel_user |

**varchar(10) columns (53 columns, 26 tables):**

| Table | Columns |
|---|---|
| cn_receipt | created_by, updated_by |
| c3_unified_audit_log | changed_by |
| cashier_currency_config | updated_by |
| cashier_currency_denominations | updated_by |
| ce_* (14 tables) | created_by, updated_by, performed_by, approved_by |
| ip_employer | entered_by, modified_by |
| ip_other_payments | created_by, updated_by |
| ip_vol_contrib_wages | entered_by, modified_by |
| meeting_api_logs | created_by |
| meetings | created_by, updated_by |
| tb_batch_status | entered_by, modified_by |
| tb_currencies | created_by, updated_by |
| tb_payer_type | entered_by, updated_by |
| tb_receipt_status | entered_by, modified_by |
| tb_vc_eligibility_config | created_by, updated_by |
| workflow_action_* (4 tables) | created_by, updated_by |

**varchar(20) columns (2 columns, 1 table):**

| Table | Columns |
|---|---|
| dev_info_screens | created_by, updated_by |

**varchar(30) columns (1 column, 1 table):**

| Table | Columns |
|---|---|
| er_commence | modified_by |

## Implementation

**Single database migration** containing ~80 `ALTER TABLE ... ALTER COLUMN ... TYPE varchar(50)` statements. These are safe, non-destructive widenings — no data loss, no downtime, no index rebuilds needed.

No function changes required — all 3 receipt RPCs (`create_c3_payment_with_receipt`, `create_payment_with_receipt`, `pay_invoices_with_receipt`) use `TEXT` parameters internally.

No frontend changes required — TypeScript types are `string` (no length limit).

## Live Database Script
The same ALTER statements will be provided as a standalone SQL script for manual execution in the Live environment.

## Verification
After migration, receipt creation via `/cashier/c3-payments` will succeed for any user_code up to 50 characters, and all audit/log inserts across the system will accept the full value without truncation or exception.

