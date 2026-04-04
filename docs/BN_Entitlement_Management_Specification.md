# BN Entitlement Management — Specification

## Business Purpose
Represent the approved benefit right separately from claim processing and separately from issued payment. Entitlements are the bridge between an approved claim decision and the payment orchestration layer. They track the total benefit right, utilization, suspension, and closure independently from the payment lifecycle.

## How It Fits Into the Existing System
- **Created only after approval**: The Approval Console (`approvalConsoleService.ts`) creates/activates `bn_entitlement` upon APPROVE or OVERRIDE actions
- **Linked to claim**: Every entitlement references `bn_claim.id` and inherits the claim number
- **Separate from payment**: Entitlements track the right; `bn_payment_instruction` tracks payable staging; `cl_cheques` tracks issued payments
- **Workflow integration**: Entitlement status changes propagate to `bn_claim.status` where applicable
- **Notification integration**: Lifecycle actions trigger notification events through the enterprise notification adapter

## Existing Tables Used
| Table | Purpose |
|-------|---------|
| `bn_claim` | Claim context, linked-claim refs, status sync |
| `bn_claim_calculation` | Calculation snapshot that seeded the entitlement amounts |
| `bn_claim_decision` | Decision that triggered activation |
| `bn_claim_event` | Audit trail (entitlement events logged here with entity_type=ENTITLEMENT) |
| `bn_product` / `bn_product_version` | Benefit type metadata |
| `cl_head` | Legacy claim header (soft join via claim_number) |
| `cl_cheques` / `cl_cheques_holding` / `cl_cheques_survivor` | Outbound payments — read-only from this module |

## New Tables Used
| Table | Purpose |
|-------|---------|
| `bn_entitlement` | Primary entitlement entity (this module) |
| `bn_payment_instruction` | Payable instructions linked to entitlement |
| `bn_payment_schedule` | Recurring schedule linked to entitlement (future) |

---

## Entity Design: bn_entitlement

### Fields
| Field | Type | Source | Editable | Control | Validation | Role Access |
|-------|------|--------|----------|---------|------------|-------------|
| id | UUID | System-generated | No | Hidden | — | All |
| claim_id | UUID FK | bn_claim.id | No | Hidden | Required | All |
| ssn | VARCHAR | From bn_claim.ssn | No | Read-only | Required | All |
| claim_number | VARCHAR | From bn_claim.claim_number | No | Read-only mono | — | All |
| product_id | UUID FK | bn_product.id | No | Read-only | — | All |
| product_version_id | UUID FK | bn_product_version.id | No | Read-only | — | All |
| calculation_id | UUID FK | bn_claim_calculation.id | No | Read-only | — | All |
| entitlement_type | ENUM | PERIODIC / LUMP_SUM / BOTH | No | Badge | Required | All |
| payment_frequency | ENUM | WEEKLY / FORTNIGHTLY / MONTHLY / ONE_TIME | Supervisor+ | Select | Required | Supervisor+ |
| weekly_rate | DECIMAL | From calculation | Supervisor+ | Currency input | ≥ 0 | Supervisor+ |
| monthly_rate | DECIMAL | Derived | No | Currency display | — | All |
| lump_sum_amount | DECIMAL | From calculation | Supervisor+ | Currency input | ≥ 0 | Supervisor+ |
| total_entitlement | DECIMAL | From calculation | Supervisor+ | Currency input | ≥ 0 | Supervisor+ |
| remaining_amount | DECIMAL | Derived (total - disbursed) | No | Currency display | ≥ 0 | All |
| duration_weeks | INTEGER | From calculation | Supervisor+ | Number input | > 0 | Supervisor+ |
| weeks_paid | INTEGER | Derived | No | Read-only | — | All |
| effective_from | DATE | Set on activation | No | Date display | Required | All |
| effective_to | DATE | Optional (open-ended or fixed) | Supervisor+ | DatePicker | Must be > effective_from | Supervisor+ |
| next_review_date | DATE | Optional | Supervisor+ | DatePicker | Must be > today | Supervisor+ |
| status | ENUM | System-managed | No | Badge | Required | All |
| override_applied | BOOLEAN | From approval | No | Badge indicator | — | All |
| override_reason | TEXT | From approval | No | Read-only | — | Manager+ |
| suspended_at | TIMESTAMP | System | No | Read-only | — | All |
| suspended_by | VARCHAR | UserCode | No | Read-only | — | All |
| suspension_reason | TEXT | User input | No | Read-only | — | All |
| suspension_reason_code_id | UUID FK | bn_reason_code | No | Read-only | — | All |
| terminated_at | TIMESTAMP | System | No | Read-only | — | All |
| terminated_by | VARCHAR | UserCode | No | Read-only | — | All |
| termination_reason | TEXT | User input | No | Read-only | — | All |
| termination_reason_code_id | UUID FK | bn_reason_code | No | Read-only | — | All |
| activated_at | TIMESTAMP | System | No | Read-only | — | All |
| activated_by | VARCHAR | UserCode | No | Read-only | — | All |
| legacy_award_id | VARCHAR | From cl_head/Award migration | No | Read-only | — | Admin |
| cl_head_claim_no | VARCHAR | Legacy claim number | No | Read-only mono | — | All |
| entered_by | VARCHAR | UserCode | No | Read-only | — | All |
| entered_at | TIMESTAMP | System | No | Read-only | — | All |
| modified_by | VARCHAR | UserCode | No | Read-only | — | All |
| modified_at | TIMESTAMP | System | No | Read-only | — | All |

---

## Lifecycle Statuses

```
DRAFT ──→ ACTIVE ──→ SUSPENDED ──→ ACTIVE (resume)
  │         │            │
  │         │            └──→ TERMINATED
  │         │
  │         ├──→ EXHAUSTED ──→ REOPENED ──→ ACTIVE
  │         │
  │         └──→ TERMINATED ──→ REOPENED ──→ ACTIVE
  │
  └──→ CANCELLED
```

| Status | Description | Terminal |
|--------|-------------|----------|
| DRAFT | Created but not yet activated | No |
| ACTIVE | Currently in force; payments can be generated | No |
| SUSPENDED | Temporarily halted; payments held | No |
| EXHAUSTED | Benefit fully utilized (remaining = 0) | Yes* |
| TERMINATED | Permanently ended with reason | Yes* |
| CANCELLED | Draft cancelled before activation | Yes |
| CLOSED | Administratively closed | Yes* |
| REOPENED | Reopened from terminal status for correction | No |

*Can be reopened by Manager+ with reason code

---

## Actions

| Action | From Statuses | To Status | Narrative | Reason Code | Roles | Notification | Payable Impact |
|--------|--------------|-----------|-----------|-------------|-------|--------------|----------------|
| ACTIVATE | DRAFT | ACTIVE | No | No | Supervisor+ | entitlement.activated | Creates initial payment instruction |
| SUSPEND | ACTIVE, REOPENED | SUSPENDED | Yes | Yes | Supervisor+ | entitlement.suspended | Holds all PENDING instructions |
| RESUME | SUSPENDED | ACTIVE | Yes | No | Supervisor+ | entitlement.resumed | Releases held instructions |
| TERMINATE | ACTIVE, SUSPENDED, REOPENED | TERMINATED | Yes | Yes | Manager+ | entitlement.terminated | Cancels all pending instructions |
| CANCEL | DRAFT | CANCELLED | Yes | No | Supervisor+ | None | None (no instructions exist) |
| CLOSE | ACTIVE, REOPENED | EXHAUSTED | No | No | Supervisor+ | entitlement.exhausted | Sets remaining=0; final instruction |
| REOPEN | EXHAUSTED, TERMINATED, CLOSED | REOPENED | Yes | Yes | Manager+ | entitlement.reopened | May generate new instructions |

---

## Role Matrix
| Role | View | Act | Available Actions |
|------|------|-----|-------------------|
| CLAIMS_OFFICER | ✓ | ✗ | None (view only) |
| SUPERVISOR | ✓ | ✓ | ACTIVATE, SUSPEND, RESUME, CANCEL, CLOSE |
| MANAGER | ✓ | ✓ | All actions including TERMINATE and REOPEN |
| DIRECTOR | ✓ | ✓ | All actions |
| ADMIN | ✓ | ✓ | All actions |
| AUDITOR | ✓ | ✗ | None (view only) |

---

## Relationship to Payable Instruction (bn_payment_instruction)

- **ACTIVATE** → Creates initial `bn_payment_instruction` with status `PENDING`
- **SUSPEND** → All `PENDING` instructions become `HELD`
- **RESUME** → All `HELD` instructions become `PENDING`
- **TERMINATE/CANCEL** → All `PENDING`/`HELD`/`SCHEDULED` instructions become `CANCELLED`
- Entitlement does NOT write to `cl_cheques` — the payment batch process consumes `bn_payment_instruction` and writes to `cl_cheques`

## Relationship to Payment Schedule (bn_payment_schedule)

- For `PERIODIC` entitlements, a schedule record defines payment cadence
- Schedule is paused on SUSPEND and resumed on RESUME
- Schedule is terminated on TERMINATE
- Future implementation will auto-generate `bn_payment_instruction` records per schedule

---

## Audit Events
| Event | Trigger | Logged To |
|-------|---------|-----------|
| ENTITLEMENT_ACTIVATE | Activation | bn_claim_event (metadata.entity_type=ENTITLEMENT) |
| ENTITLEMENT_SUSPEND | Suspension | bn_claim_event |
| ENTITLEMENT_RESUME | Resumption | bn_claim_event |
| ENTITLEMENT_TERMINATE | Termination | bn_claim_event |
| ENTITLEMENT_CANCEL | Cancellation | bn_claim_event |
| ENTITLEMENT_CLOSE | Exhaustion | bn_claim_event |
| ENTITLEMENT_REOPEN | Reopening | bn_claim_event |
| ENTITLEMENT_UPDATED | Field changes | bn_claim_event (with before/after snapshot) |

All events include: `performed_by`, `performed_at`, `from_status`, `to_status`, `narrative`, `reason_code_id`, and `changed_fields` where applicable.

---

## Notification Triggers
| Trigger | Recipients | Channel |
|---------|-----------|---------|
| entitlement.activated | Claimant, Supervisor | In-app, Email |
| entitlement.suspended | Claimant, Supervisor, Manager | In-app, Email |
| entitlement.resumed | Claimant, Supervisor | In-app |
| entitlement.terminated | Claimant, Supervisor, Manager | In-app, Email |
| entitlement.exhausted | Claimant, Supervisor | In-app |
| entitlement.reopened | Claimant, Supervisor, Manager | In-app, Email |

---

## Backward Compatibility
- No changes to `cl_head`, `cl_detail_*`, or `cl_cheques*` tables
- Entitlement maintains `legacy_award_id` and `cl_head_claim_no` for cross-referencing legacy award records
- Person 360 EntitlementsTab reads from `bn_entitlement` and remains read-only
- Existing approval flow in `approvalConsoleService.ts` continues to create/activate entitlements upon approval
- `cn_payment*` tables are NEVER used — they are for incoming collections only

## Route
- **URL**: `/bn/entitlements`
- **Access**: Authenticated users with `benefits_management` permission
- **Menu**: Added under "Benefit Management" as "Entitlements"
