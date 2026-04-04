# BN Batch Operations Specification

## Business Purpose
Groups payable instructions (`bn_payment_instruction`) into controlled payment batches for validation, approval, and release before issue to `cl_cheques*`. This is the final orchestration layer in the benefit payment pipeline.

## How It Fits into the Existing System
```
Entitlement → Payable Instruction → Payment Schedule → [BATCH OPERATIONS] → cl_cheques / cl_cheques_holding
```

## Existing Tables Used
| Table | Usage |
|---|---|
| `bn_payment_instruction` | Source payable records (status=READY) |
| `bn_entitlement` | Entitlement context |
| `bn_claim` | Claim context |
| `bn_claim_event` | Audit trail (entity_type=PAYMENT_BATCH) |
| `cl_head` | Legacy claim header (soft join) |
| `cl_cheques` | **Issue target** — actual payment persistence |
| `cl_cheques_holding` | Holding payments |
| `cl_cheques_survivor` | Survivor payments |

## New Tables Introduced
| Table | Purpose |
|---|---|
| `bn_payment_batch` | Batch header with lifecycle tracking |
| `bn_batch_item` | Individual payable items within a batch |
| `bn_payment_exception` | Exception records for failed items |

## Batch Header Fields
| Field | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `batch_number` | TEXT UNIQUE | Format: `BN-{OFFICE}-{YYYYMMDD}-{HHmmss}` |
| `batch_date` | DATE | Payment run date |
| `payment_method` | ENUM | CHEQUE, DIRECT_DEPOSIT, MIXED |
| `status` | ENUM | OPEN → VALIDATED → APPROVED → RELEASED → ISSUED |
| `office_code` | TEXT | Branch code |
| `total_items` | INT | Active item count |
| `total_amount` | NUMERIC | Sum of active items |
| `currency` | TEXT | Default: XCD |
| `validated_items` | INT | Count of validated items |
| `failed_items` | INT | Count of failed items |
| `issued_items` | INT | Count of issued items |
| `created_by` / `created_at` | | Creator tracking |
| `validated_by` / `validated_at` | | Validation tracking |
| `approved_by` / `approved_at` | | Approval tracking |
| `released_by` / `released_at` | | Release tracking |
| `cancelled_by` / `cancelled_at` / `cancel_reason` | | Cancellation tracking |
| `issue_started_at` / `issue_completed_at` | | Issue tracking |
| `issue_error_count` | INT | Failed issue count |
| `notes` | TEXT | Optional notes |

## Batch Item Fields
| Field | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `batch_id` | UUID FK | Parent batch |
| `instruction_id` | UUID FK | Source payable instruction |
| `item_status` | ENUM | INCLUDED, VALIDATED, FAILED_VALIDATION, ISSUED, ISSUE_FAILED, REMOVED, EXCEPTION |
| `sequence_number` | INT | Order within batch |
| `ssn` | TEXT | Denormalized |
| `claim_number` | TEXT | Denormalized |
| `beneficiary_name` | TEXT | Denormalized |
| `amount` | NUMERIC | Payment amount |
| `currency` | TEXT | |
| `payment_method` | TEXT | CHEQUE or DIRECT_DEPOSIT |
| `period_start` / `period_end` | DATE | Payment period |
| `instruction_type` | TEXT | PERIODIC, LUMP_SUM, ARREARS, etc. |
| `validation_errors` | JSONB | Array of error strings |
| `cl_cheque_no` | TEXT | Populated after issue |
| `issued_at` | TIMESTAMP | Issue timestamp |
| `issue_error` | TEXT | Issue failure reason |

## Status Transition Matrix

| From | Allowed Actions | To |
|---|---|---|
| OPEN | VALIDATE, ADD_PAYABLES, REMOVE_PAYABLE, CANCEL | VALIDATED or stay OPEN |
| VALIDATED | APPROVE, REOPEN, CANCEL | APPROVED |
| APPROVED | RELEASE, REOPEN, CANCEL | RELEASED |
| RELEASED | ISSUE | ISSUED or PARTIALLY_ISSUED |
| ISSUED | — | Terminal |
| PARTIALLY_ISSUED | ISSUE (retry), CANCEL | ISSUED |
| CANCELLED | REOPEN | REOPENED |
| REOPENED | (same as OPEN) | VALIDATED |

## Validations
1. **Item-level**: Amount > 0, SSN present, claim_number present, DD requires bank details
2. **Batch-level**: All items must be VALIDATED before batch moves to VALIDATED
3. **Maker-checker**: Approver ≠ Creator
4. **Duplicate**: Payable cannot be in more than one active batch

## Role Permissions
| Action | Roles |
|---|---|
| CREATE | Claims Officer, Supervisor, Manager, Finance Officer |
| ADD_PAYABLES | Claims Officer, Supervisor, Manager, Finance Officer |
| REMOVE_PAYABLE | Supervisor, Manager, Finance Officer |
| VALIDATE | Claims Officer, Supervisor, Manager, Finance Officer |
| APPROVE | Supervisor, Manager |
| RELEASE | Manager, Finance Officer |
| CANCEL | Supervisor, Manager |
| REOPEN | Manager only |
| ISSUE | Manager, Finance Officer |

## Workflow Integration
- Batch creation notifies assigned supervisor
- Batch approval triggers notification to Finance Officer
- Batch release triggers notification to payment operations
- Issue failures generate `bn_payment_exception` records and notify supervisor

## Notification Triggers
| Event | Recipients |
|---|---|
| BATCH_CREATED | Supervisor |
| BATCH_VALIDATED | Supervisor, Finance Officer |
| BATCH_APPROVED | Finance Officer |
| BATCH_RELEASED | Payment Operations |
| BATCH_ISSUE_COMPLETE | Creator, Supervisor |
| BATCH_ISSUE_PARTIAL | Creator, Supervisor, Manager |
| BATCH_CANCELLED | Creator, Supervisor |

## Audit Events
All actions logged to `bn_claim_event` with `entity_type = 'PAYMENT_BATCH'`:
- `BATCH_CREATE`, `BATCH_ADD_PAYABLES`, `BATCH_REMOVE_PAYABLE`
- `BATCH_VALIDATE`, `BATCH_APPROVE`, `BATCH_RELEASE`
- `BATCH_ISSUE`, `BATCH_CANCEL`, `BATCH_REOPEN`

## Issue Process Integration
1. RELEASE sets batch status to RELEASED
2. ISSUE iterates validated items and writes to `cl_cheques`
3. Each successful write links `cl_cheque_no` back to batch item and instruction
4. Failed writes create `bn_payment_exception` records
5. Final batch status = ISSUED (all success) or PARTIALLY_ISSUED (some failures)

## Backward Compatibility
- All outbound payments persist to `cl_cheques*` — existing reports continue to work
- `cn_payment*` tables are never touched for outbound flows
- Legacy claim numbers and linked-claim semantics are preserved
- Batch number format is distinct from collection batch (`cn_batch`)
