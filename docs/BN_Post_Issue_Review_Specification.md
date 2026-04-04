# BN Post-Issue Review Specification

## Business Purpose
Captures and controls all claim-side and support-table updates that occur after payment issue. Payment issue is **NOT fully complete** until all required post-issue tasks reach COMPLETED status. This preserves all legacy post-issue side effects within the modern orchestration pipeline.

## Pipeline Position
```
Entitlement → Payable → Schedule → Batch → Issue → [POST-ISSUE REVIEW] → Final Completion
```

## Existing Tables Written (Post-Issue Side Effects)
| Table | Update Type | When |
|---|---|---|
| `cl_head` | Status, last payment date, last cheque no | Every issued payment |
| `cl_wages_credited` | Wage credit records | PERIODIC and ARREARS payments |
| `tb_postal_reg` | Postal dispatch tracking | Cheque payments (cl_cheques) |
| `cl_cheques_holding` | Hold status checks | Holding payments |
| `cl_cheques_survivor` | Beneficiary confirmation | Survivor payments |
| `bn_entitlement` | amount_paid, status (EXHAUSTED) | Every issued payment |
| `bn_payment_instruction` | Final status | Every issued payment |
| `bn_payment_batch` | Completion status | When all items complete |
| `bn_claim` | Status updates | Closure or continuation |

## New Table: `bn_post_issue_task`
| Field | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `issue_record_id` | UUID FK | Source issued payment |
| `batch_id` | UUID FK | Parent batch |
| `task_type` | ENUM | 12 defined task types |
| `task_order` | INT | Execution order |
| `status` | ENUM | PENDING, IN_PROGRESS, COMPLETED, FAILED, SKIPPED, DEFERRED, CANCELLED |
| `is_required` | BOOL | If true, must complete before issue finalization |
| `ssn` | TEXT | Denormalized |
| `claim_number` | TEXT | Denormalized |
| `cheque_number` | TEXT | Denormalized |
| `amount` | NUMERIC | Payment amount |
| `target_table` | TEXT | Which cl_cheques* table |
| `executed_at` / `executed_by` | | Execution tracking |
| `error_message` | TEXT | Failure reason |
| `retry_count` / `max_retries` | INT | Retry control (default max: 3) |
| `result_data` | JSONB | Execution result |
| `deferred_reason` / `skip_reason` / `notes` | TEXT | Action reasons |

## 12 Task Types

| # | Type | Target Table | Required | Applies When |
|---|---|---|---|---|
| 1 | `CL_HEAD_UPDATE` | cl_head | ✓ | Always |
| 2 | `WAGES_CREDITED` | cl_wages_credited | ✓ | PERIODIC, ARREARS types |
| 3 | `POSTAL_REG_UPDATE` | tb_postal_reg | ○ | Standard cheques |
| 4 | `PENSION_SUPPORT` | pension tables | ✓ | Recurring + PERIODIC |
| 5 | `SURVIVOR_FOLLOWUP` | cl_cheques_survivor | ✓ | Survivor payments |
| 6 | `HOLDING_FOLLOWUP` | cl_cheques_holding | ✓ | Holding payments |
| 7 | `ENTITLEMENT_UPDATE` | bn_entitlement | ✓ | Always |
| 8 | `CLAIM_CLOSURE` | cl_head, bn_claim | ✓ | Final payment |
| 9 | `CLAIM_CONTINUATION` | cl_head | ✓ | Recurring + not final |
| 10 | `INSTRUCTION_FINALIZE` | bn_payment_instruction | ✓ | Always |
| 11 | `BATCH_COMPLETION_CHECK` | bn_payment_batch | ○ | Always |
| 12 | `AUDIT_COMPLETION` | bn_claim_event | ✓ | Always |

## Status Transitions
| From | Available Actions |
|---|---|
| PENDING | EXECUTE, SKIP, DEFER, CANCEL |
| IN_PROGRESS | — (in-flight) |
| COMPLETED | — (terminal) |
| FAILED | RETRY, SKIP, DEFER, CANCEL |
| SKIPPED | — (terminal) |
| DEFERRED | EXECUTE, COMPLETE_MANUAL, SKIP, CANCEL |
| CANCELLED | — (terminal) |

## Retry/Recovery Model
- Each task has `retry_count` and `max_retries` (default: 3)
- Failed tasks can be retried manually or via bulk execution
- At max_retries, task stays FAILED and creates `bn_payment_exception`
- Deferred tasks support manual completion with result data input

## Validation Rules
- **Required tasks** cannot be skipped by Claims Officers (Supervisor+ only)
- Skip requires narrative
- Defer requires reason
- Issue is not "complete" until `allRequiredDone = true`

## Role Permissions
| Action | Roles |
|---|---|
| EXECUTE / RETRY | Claims Officer, Supervisor, Manager, Finance Officer |
| SKIP | Supervisor, Manager |
| DEFER | Supervisor, Manager |
| CANCEL | Manager only |
| COMPLETE_MANUAL | Supervisor, Manager |

## Workflow Integration
- Post-issue tasks auto-generated after `ISSUED` status in bn_issue_record
- Batch completion check updates bn_payment_batch.status when all required tasks done
- Claim closure/continuation updates both cl_head and bn_claim

## Notification Triggers
| Event | Recipients |
|---|---|
| ALL_REQUIRED_COMPLETE | Batch creator, Supervisor |
| TASK_FAILED_MAX_RETRIES | Supervisor, Manager |
| TASK_DEFERRED | Supervisor |
| BATCH_FULLY_COMPLETE | Finance Officer |

## Audit Events
Logged to `bn_claim_event` with `entity_type = 'POST_ISSUE'`:
- `POST_ISSUE_GENERATE`, `POST_ISSUE_EXECUTE`, `POST_ISSUE_RETRY`
- `POST_ISSUE_SKIP`, `POST_ISSUE_DEFER`, `POST_ISSUE_CANCEL`
- `POST_ISSUE_COMPLETE_MANUAL`, `POST_ISSUE_BULK_EXECUTE`
- `POST_ISSUE_LIFECYCLE_COMPLETE`

## Backward Compatibility
- All legacy cl_head updates preserved (status, dates, cheque references)
- cl_wages_credited inserts match legacy format
- tb_postal_reg updates match legacy dispatch tracking
- Existing cl_cheques* insert triggers remain active
- cn_payment* tables never touched
- Claim number and linked-claim semantics unchanged
