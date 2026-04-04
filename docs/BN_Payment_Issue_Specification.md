# BN Payment Issue Specification

## Business Purpose
Issues outbound benefit disbursements by persisting to the correct claims-side payment structures (`cl_cheques`, `cl_cheques_holding`, `cl_cheques_survivor`). This is the final step in the benefit payment pipeline, downstream of Batch Operations.

## Pipeline Position
```
Entitlement → Payable Instruction → Schedule → Batch → [PAYMENT ISSUE] → cl_cheques*
```

## Existing Tables Used

### WRITE Targets (Outbound Benefit Payments)
| Table | When Used |
|---|---|
| `cl_cheques` | **Standard** benefit payments: Sickness, Maternity, Injury, Employment Injury, Pension, Lump Sum, Grant, Medical |
| `cl_cheques_holding` | Payments **withheld** pending: outstanding documentation, legal hold, court order, address verification, manual review |
| `cl_cheques_survivor` | **Survivor/death** benefit payments where the payee is a named survivor/dependent, not the insured person |

### READ Sources
| Table | Purpose |
|---|---|
| `bn_payment_batch` | Source batch (RELEASED status) |
| `bn_batch_item` | Individual validated items |
| `bn_payment_instruction` | Payable context |
| `bn_entitlement` | Entitlement context |
| `bn_claim` | Claim context |
| `cl_head` | Legacy claim header validation |
| `bn_claim_event` | Audit trail |

### NEVER Used for Outbound
| Table | Reason |
|---|---|
| `cn_payment*` | Incoming collections only |
| `cn_receipt` | Incoming receipts only |
| `cn_refund` | Incoming refunds only |
| `cn_return_payment` | Incoming returns only |

## New Table: `bn_issue_record`
Orchestration table tracking each individual issue attempt.

### Fields
| Field | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `batch_id` | UUID FK | Source batch |
| `batch_item_id` | UUID FK | Source batch item |
| `instruction_id` | UUID FK | Source payable instruction |
| `ssn` | TEXT | Insured person |
| `claim_number` | TEXT | Claim reference |
| `beneficiary_name` | TEXT | Payee name |
| `survivor_id` | UUID | Survivor FK (for cl_cheques_survivor routing) |
| `amount` | NUMERIC | Payment amount |
| `currency` | TEXT | Default: XCD |
| `issue_method` | ENUM | CHEQUE, DIRECT_DEPOSIT |
| `period_start` / `period_end` | DATE | Payment period |
| `instruction_type` | TEXT | PERIODIC, LUMP_SUM, ARREARS, etc. |
| `target_table` | ENUM | cl_cheques, cl_cheques_holding, cl_cheques_survivor |
| `status` | ENUM | PENDING, ISSUING, ISSUED, FAILED, VOIDED, REISSUE_PENDING, STALE_DATED, STOPPED |
| `cheque_number` | TEXT | Generated cheque number |
| `dd_reference` | TEXT | Direct deposit reference |
| `issued_at` / `issued_by` | | Issue tracking |
| `error_message` | TEXT | Failure reason |
| `retry_count` / `max_retries` | INT | Retry control (default max: 3) |
| `voided_at` / `voided_by` / `void_reason` | | Void tracking |
| `reissue_of` | UUID | Links to voided record for reissue chain |
| `hold_reason` | TEXT | Why payment is in holding |
| `hold_released_at` / `hold_released_by` | | Holding release tracking |

## Target Table Routing Rules

```
IF survivor_id IS NOT NULL → cl_cheques_survivor
ELSE IF hold_reason IS NOT NULL → cl_cheques_holding
ELSE → cl_cheques
```

## Status Lifecycle

| Status | Description | Available Actions |
|---|---|---|
| PENDING | Awaiting issue | ISSUE |
| ISSUING | Write in progress | — |
| ISSUED | Successfully written to cl_cheques* | VOID, STOP, STALE_DATE |
| FAILED | Write failed (retryable up to max_retries) | RETRY, VOID |
| VOIDED | Cheque voided | REISSUE |
| REISSUE_PENDING | Pending reissue after void | ISSUE |
| STALE_DATED | Cheque expired | REISSUE |
| STOPPED | Payment stopped by manager | REISSUE |

## Duplicate Prevention
Composite key check: `ssn + claim_number + period_start + period_end + amount`
- Blocks if matching record exists with status IN (ISSUED, PENDING, ISSUING)
- Duplicates route to `bn_payment_exception` with type `DUPLICATE_PAYMENT`

## Issue Process Flow
1. **PREPARE**: `prepareIssueFromBatch(batchId)` creates `bn_issue_record` rows from validated batch items
2. **DUPLICATE CHECK**: Each item checked against composite key before record creation
3. **TARGET ROUTING**: Each item assigned to correct cl_cheques* table
4. **EXECUTE**: `executeIssue(issueIds)` writes to legacy tables one-by-one
5. **INSTRUMENT GENERATION**: Cheque numbers or DD references generated at write time
6. **BACK-LINK**: cheque_number/dd_reference written back to issue record, batch item, and instruction
7. **FAILURE HANDLING**: Failed writes increment retry_count; at max_retries creates bn_payment_exception

## Holding Payment Release
When conditions are satisfied for a held payment:
1. Copy record from `cl_cheques_holding` to `cl_cheques` with new cheque number
2. Mark holding record as RELEASED
3. Update issue record with new cheque number and release timestamp

## Role Permissions
| Action | Roles |
|---|---|
| ISSUE | Manager, Finance Officer |
| VOID | Manager, Finance Officer |
| REISSUE | Manager, Finance Officer |
| STOP | Manager only |
| STALE_DATE | Supervisor, Manager, Finance Officer |
| RETRY | Supervisor, Manager, Finance Officer |

## Notification Triggers
| Event | Recipients |
|---|---|
| ISSUE_COMPLETE | Batch creator, Supervisor |
| ISSUE_PARTIAL_FAILURE | Supervisor, Manager |
| PAYMENT_VOIDED | Supervisor, Finance Officer |
| REISSUE_CREATED | Finance Officer |
| HOLDING_RELEASED | Supervisor |

## Audit Events
All logged to `bn_claim_event` with `entity_type = 'PAYMENT_ISSUE'`:
- `ISSUE_PREPARE`, `ISSUE_ISSUE`, `ISSUE_VOID`, `ISSUE_REISSUE`
- `ISSUE_STOP`, `ISSUE_STALE_DATE`, `ISSUE_RETRY`, `ISSUE_RELEASE_HOLD`

## Post-Issue Handoff
After successful issue:
- `bn_payment_instruction.status` → `ISSUED_PENDING`
- `bn_batch_item.item_status` → `ISSUED`
- `bn_batch_item.cl_cheque_no` populated
- Legacy `cl_head` side effects preserved (claim status updates, linked-claim handling)
- Existing support-table updates (if any) triggered by cl_cheques insert triggers

## Backward Compatibility
- All outbound payments persist to `cl_cheques*` — existing reports continue to work
- Cheque number format and sequence preserved
- Legacy claim number and linked-claim semantics unchanged
- cn_payment* tables never touched for outbound flows
- Existing post-issue triggers on cl_cheques* remain active
