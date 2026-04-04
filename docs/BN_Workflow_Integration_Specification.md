# BN Workflow Integration Specification

## 1. Design Principle: Wrap, Don't Replace

The Benefits module integrates with the **existing enterprise workflow engine** (`workflow_definitions`, `workflow_instances`, `workflow_tasks`, `workflow_step_actions`, `workflow_logs`). It does **not** create a parallel workflow system.

### Dual-Mode Operation

Every BN sub-module operates in one of two modes, determined at runtime:

| Mode | When Active | Behavior |
|---|---|---|
| **Workflow-Governed** | A `workflow_definition` is configured for the BN `source_module` and a trigger fires | Generic engine owns instance lifecycle, task routing, SLA, escalation. BN domain hooks fire on end-state. |
| **Transition-Matrix** | No workflow configured | BN's own `CLAIM_TRANSITIONS` map (in `claimWorkbenchService.ts`) and `bn_claim_transition_rule` table govern status changes directly. |

The `checkWorkflowGovernance()` function determines which mode applies at runtime by querying `workflow_instances` for an active instance matching `source_module + source_record_id`.

---

## 2. Existing Workflow Tables Reused

| Table | Role in BN Integration |
|---|---|
| `workflow_definitions` | Defines BN approval/review workflows (optional per sub-module) |
| `workflow_triggers` | Fires workflow on BN domain actions (e.g., `submit` on `bn_claim`) |
| `workflow_instances` | Tracks each claim/entitlement/batch through the workflow |
| `workflow_tasks` | Assigns review/approval tasks to roles/users |
| `workflow_steps` | Step sequence with SLA, approver configuration |
| `workflow_step_actions` | Available actions per step (Approve, Reject, Send Back, etc.) |
| `workflow_logs` | Immutable audit trail of all workflow events |
| `roles` / `profiles` | Role resolution, maker-checker, reporting manager lookup |

### No new workflow tables are introduced.

BN-specific audit events are logged to `bn_claim_event` with `event_type = 'WORKFLOW'` to maintain domain traceability alongside the generic `workflow_logs`.

---

## 3. Source Module Registry

| BN Sub-Module | `source_module` Value | Entity Table |
|---|---|---|
| Claim Workbench | `bn_claim` | `bn_claim` |
| Benefit Determination | `bn_determination` | `bn_claim` |
| Approval Console | `bn_approval` | `bn_claim` |
| Entitlement Management | `bn_entitlement` | `bn_entitlement` |
| Payables Queue | `bn_payable` | `bn_payment_instruction` |
| Payment Schedule | `bn_schedule` | `bn_payment_schedule` |
| Batch Operations | `bn_batch` | `bn_payment_batch` |
| Payment Issue | `bn_issue` | `bn_payment_instruction` |
| Post-Issue Review | `bn_post_issue` | `bn_post_issue_task` |

---

## 4. Per-Module Workflow States

### 4.1 Claim Workbench (`bn_claim`)

```
DRAFT → SUBMITTED → INTAKE_REVIEW → ELIGIBILITY_CHECK → EVIDENCE_REVIEW → CALCULATION → DECISION → APPROVED → IN_PAYMENT → CLOSED
                                                                                            ↘ DENIED → CLOSED
                            ↕ PENDING_INFO (any stage)
                            ↕ SUSPENDED (any stage, Supervisor+)
                            ↕ WITHDRAWN (pre-decision stages)
```

| State | Entry Condition | Exit Condition | Allowed Actions | Roles |
|---|---|---|---|---|
| DRAFT | Claim created | SSN + Product selected | SUBMIT, WITHDRAW | Claims Officer, Supervisor |
| SUBMITTED | Submit action | — | START_REVIEW | Claims Officer, Supervisor |
| INTAKE_REVIEW | Start Review | Identity verified | CHECK_ELIGIBILITY, REQUEST_EVIDENCE, REQUEST_INFO, SUSPEND, WITHDRAW | Claims Officer, Supervisor |
| ELIGIBILITY_CHECK | Check Eligibility | Eligibility rules pass/fail | RUN_CALCULATION, REQUEST_EVIDENCE, DENY, REQUEST_INFO, SUSPEND | Claims Officer, Supervisor |
| EVIDENCE_REVIEW | Evidence requested | All required evidence verified | RUN_CALCULATION, REQUEST_INFO | Claims Officer, Supervisor |
| CALCULATION | Run Calculation | Calculation completed | SUBMIT_DECISION | Claims Officer, Supervisor |
| DECISION | Submit for Decision | Supervisor reviews | APPROVE, DENY, REQUEST_INFO, SUSPEND | Supervisor, Manager, Director |
| APPROVED | Approve action | Entitlement created | SUSPEND, CLOSE | Supervisor |
| DENIED | Deny action | — | REOPEN, CLOSE | Supervisor |
| SUSPENDED | Suspend action | — | REOPEN | Supervisor |
| PENDING_INFO | Request Info | Info provided | Resume to previous status | Claims Officer |
| IN_PAYMENT | Entitlement activated | All payments complete | CLOSE | System, Supervisor |
| CLOSED | Close action | Terminal | — | Supervisor |
| WITHDRAWN | Withdraw action | Terminal | — | Claims Officer |

**Workflow-Governed Enhancement**: When a `workflow_definition` is configured for `bn_claim`:
- SUBMIT triggers `triggerBnWorkflow()`, creating a `workflow_instance`
- The DECISION → APPROVED/DENIED transition is governed by the generic engine's step actions
- Maker-checker enforcement via `workflow_definitions.maker_checker_enabled`
- SLA tracking via `workflow_tasks.due_at`
- Generic end-state `Approved` maps to BN `APPROVED`; `Rejected` maps to `DENIED`

**Legacy Status Mapping**:
| BN Status | cl_head.status Equivalent |
|---|---|
| DRAFT | `D` |
| SUBMITTED | `S` |
| APPROVED | `A` |
| DENIED | `R` |
| SUSPENDED | `H` |
| CLOSED | `C` |
| IN_PAYMENT | `P` |

---

### 4.2 Benefit Determination (`bn_determination`)

Operates within the claim lifecycle (ELIGIBILITY_CHECK → CALCULATION → DECISION).

| Action | Entry | Exit | Roles | Audit Event |
|---|---|---|---|---|
| CALCULATE | Eligibility passed | Snapshot created | Claims Officer | CALCULATION_EXECUTED |
| RECOMMEND | Calculation done | Decision queued | Claims Officer | RECOMMENDATION_MADE |
| APPROVE_READY | Recommendation made | Claim enters DECISION | Claims Officer | APPROVE_READY |
| DISALLOW_READY | Eligibility failed | Claim enters DECISION for denial | Claims Officer | DISALLOW_READY |
| REQUEST_EVIDENCE | Missing docs | Claim enters EVIDENCE_REVIEW | Claims Officer | EVIDENCE_REQUESTED |
| OVERRIDE | Manual override | Requires narrative + reason code | Supervisor+ | CALCULATION_OVERRIDDEN |

**Routing**: Claims with `OVERRIDE` action route to the next senior role (Supervisor → Manager if already Supervisor).

---

### 4.3 Approval Console (`bn_approval`)

| Action | Entry | Exit | Roles | Maker-Checker |
|---|---|---|---|---|
| APPROVE | Claim in DECISION | Creates bn_entitlement + bn_payment_instruction(PENDING) | Supervisor, Manager, Director | entered_by ≠ approver |
| DISALLOW | Claim in DECISION | Status → DENIED | Supervisor, Manager, Director | entered_by ≠ approver |
| REQUEST_EVIDENCE | Missing evidence | Status → EVIDENCE_REVIEW | Supervisor | — |
| OVERRIDE | Override calculation | Requires reason code | Manager, Director | — |
| SEND_BACK | Incomplete review | Status → CALCULATION or ELIGIBILITY_CHECK | Supervisor | — |
| BULK_APPROVE | Multiple claims in DECISION | Batch approval | Manager, Director | Per-claim maker-checker |

**Workflow Integration**: If `bn_approval` has a workflow configured, the APPROVE/DISALLOW actions are step actions in the workflow. `useWorkflowActions('bn_approval', claimId)` returns available actions. The generic engine's `end_state = 'Approved'` triggers `syncWorkflowEndState()` which maps to BN `APPROVED` and activates the entitlement.

**Escalation**: Claims in DECISION for > SLA hours trigger `workflow-notify-approvers` edge function. After 2× SLA, auto-escalate to next role tier.

---

### 4.4 Entitlement Management (`bn_entitlement`)

| Status | Entry | Exit | Actions | Roles |
|---|---|---|---|---|
| DRAFT | Claim approved (auto-created) | — | ACTIVATE | Supervisor |
| ACTIVE | Activate action | — | SUSPEND, TERMINATE, ADJUST | Supervisor, Manager |
| SUSPENDED | Suspend action | — | RESUME, TERMINATE | Supervisor |
| EXHAUSTED | Balance depleted (system) | Terminal | REOPEN | Manager |
| TERMINATED | Terminate action | Terminal | — | Manager, Director |
| CANCELLED | Cancel action | Terminal | — | Supervisor |
| CLOSED | Manual close | Terminal | — | Supervisor |
| REOPENED | Reopen action | Enters ACTIVE | — | Manager |

**Side Effects**:
- ACTIVATE → Creates `bn_payment_instruction` (PENDING), updates `bn_claim.status` → `IN_PAYMENT`
- SUSPEND → Holds linked `bn_payment_instruction` records
- TERMINATE → Cancels pending `bn_payment_instruction` records

---

### 4.5 Payables Queue (`bn_payable`)

| Status | Entry | Exit | Actions | Roles |
|---|---|---|---|---|
| PENDING | Entitlement activated / Schedule generated | — | VALIDATE | System |
| READY | Validation passed (score 100) | — | HOLD, INCLUDE_IN_BATCH | Claims Officer |
| BLOCKED | Validation failed | — | RESOLVE, CANCEL | Claims Officer |
| HELD | Manual hold | — | RELEASE, CANCEL | Supervisor |
| EXCEPTION | Duplicate or rule violation | — | RESOLVE, OVERRIDE, CANCEL | Supervisor |
| SCHEDULED | Included in batch | — | REMOVE_FROM_BATCH | Claims Officer |
| ISSUED_PENDING | Batch released | — | — | System |
| CANCELLED | Cancel action | Terminal | — | Supervisor |
| REISSUE_PENDING | Reissue requested | — | VALIDATE | Supervisor |

**Exception Routing**: Validation failures with score < 50 auto-route to Supervisor via `routeBnException()`.

---

### 4.6 Payment Schedule (`bn_schedule`)

| Status | Entry | Exit | Actions | Roles |
|---|---|---|---|---|
| PROJECTED | Schedule created | — | CONFIRM | Claims Officer |
| DUE | Period date reached | — | GENERATE_INSTRUCTION | System / Claims Officer |
| GENERATED | Instruction created | — | — | System |
| ARREARS | Missed due date | — | GENERATE_INSTRUCTION (catch-up) | Supervisor |
| ADJUSTED | Manual adjustment | — | CONFIRM | Supervisor |
| SUSPENDED | Entitlement suspended | — | RESUME | System |
| CANCELLED | Cancel action | Terminal | — | Supervisor |
| SKIPPED | Skip action | Terminal | — | Supervisor (requires narrative) |
| EXHAUSTED | Entitlement balance depleted | Terminal | — | System |

---

### 4.7 Batch Operations (`bn_batch`)

| Status | Entry | Exit | Actions | Roles |
|---|---|---|---|---|
| OPEN | Batch created | — | ADD_ITEMS, REMOVE_ITEMS, VALIDATE | Claims Officer |
| VALIDATED | All items pass validation | — | SUBMIT_FOR_APPROVAL | Claims Officer |
| APPROVED | Approval granted | — | RELEASE | Supervisor, Manager (maker-checker) |
| RELEASED | Release action | — | ISSUE | Supervisor |
| ISSUED | All items issued | Terminal | — | System |
| PARTIALLY_ISSUED | Some items failed | — | RETRY_FAILED, CANCEL_REMAINING | Supervisor |
| CANCELLED | Cancel action | Terminal | — | Supervisor |
| REOPENED | Reopen action | Enters OPEN | — | Manager |

**Workflow Integration**: If `bn_batch` has a workflow configured:
- SUBMIT_FOR_APPROVAL triggers `triggerBnWorkflow()`
- Approval step enforces maker-checker (creator ≠ approver)
- Generic `Approved` end-state maps to BN `APPROVED` via `syncWorkflowEndState()`

---

### 4.8 Payment Issue (`bn_issue`)

| Status | Entry | Exit | Actions | Roles |
|---|---|---|---|---|
| ISSUING | Batch released | — | — | System |
| ISSUED | cl_cheques record created | — | VOID, STOP, REISSUE | System |
| VOIDED | Void action | Terminal | REISSUE | Supervisor (requires narrative) |
| STOPPED | Stop action | Terminal | REISSUE | Supervisor (requires narrative) |
| STALE_DATED | System date check | Terminal | REISSUE | System |
| FAILED | Issue attempt failed | — | RETRY | System / Supervisor |
| REISSUE_PENDING | Reissue requested | — | ISSUE | Supervisor |

**Persistence Mapping**:
| Condition | Target Table |
|---|---|
| Standard payment | `cl_cheques` |
| Payment on hold | `cl_cheques_holding` |
| Survivor payment | `cl_cheques_survivor` |

**Legacy Behaviors Preserved**:
- Cheque number sequencing unchanged
- Duplicate check hash: `ssn|claim_number|period_start|period_end|amount`
- `cl_cheque_no` written back to `bn_payment_instruction`
- Retry max: 3 attempts before permanent exception

---

### 4.9 Post-Issue Review (`bn_post_issue`)

| Status | Entry | Exit | Actions | Roles |
|---|---|---|---|---|
| PENDING | Payment issued | — | EXECUTE, SKIP, DEFER | Claims Officer |
| IN_PROGRESS | Execute started | — | COMPLETE, FAIL | System |
| COMPLETED | Task executed successfully | Terminal | — | System |
| FAILED | Execution error | — | RETRY, MANUAL_COMPLETE | Supervisor |
| SKIPPED | Skip action | Terminal | — | Supervisor (mandatory tasks require Manager) |
| DEFERRED | Defer action | — | EXECUTE | Claims Officer |

**Task Types**: `CL_HEAD_UPDATE`, `CLAIM_CLOSURE`, `WAGES_CREDITED`, `POSTAL_REG_UPDATE`, `HOLDING_RELEASE`, `SURVIVOR_UPDATE`, `ENTITLEMENT_UPDATE`, `CONTRIBUTION_LINK`, `PENSION_SETUP`, `NOTIFICATION_SEND`, `AUDIT_COMPLETION`, `LEGACY_SYNC`.

---

## 5. Workflow Routing & Assignment Rules

### Role Hierarchy
```
CLAIMS_OFFICER → SUPERVISOR → MANAGER → DIRECTOR → ADMIN
```

### Assignment Resolution (reuses existing `resolveReportingManagerForTask`)
1. **Role-based**: Task assigned to a role pool (e.g., `SUPERVISOR`)
2. **Designation-based**: Task assigned to specific designation
3. **User-specific**: Task assigned to named user(s)
4. **Reporting Manager**: Dynamic resolution via `profiles.reporting_to_user_id`

### Workbasket Integration
BN's `bn_workbasket` / `bn_claim_queue_assignment` provides domain-specific queue assignment. When a workflow task is created, BN can optionally synchronize the assignment to `bn_claim.assigned_to`.

---

## 6. Escalation Rules

| Condition | Action | Mechanism |
|---|---|---|
| Task overdue by 1× SLA | Send reminder notification | `workflow-notify-approvers` edge function |
| Task overdue by 2× SLA | Auto-escalate to next role tier | `checkBnEscalations()` |
| Task overdue by 3× SLA | Flag for management dashboard | `bn_escalation_event` |
| Financial exception | Route to Supervisor immediately | `routeBnException()` |
| Calculation override | Route to Manager | `bn_claim_transition_rule.required_role` |

---

## 7. Notification Triggers

| Event | Notification Key | Recipients |
|---|---|---|
| Claim submitted | `bn_claim_registered` | Assigned officer |
| Evidence requested | `bn_evidence_requested` | Claimant (if external) |
| Claim approved | `bn_claim_approved` | Claimant, Assigned officer |
| Claim denied | `bn_claim_denied` | Claimant, Assigned officer |
| Batch ready for approval | `bn_batch_pending_approval` | Batch approver role |
| Payment issued | `bn_payment_issued` | Claimant |
| Exception raised | `bn_exception_raised` | Supervisor |
| SLA breach | `bn_sla_breach` | Current assignee + Supervisor |

All notifications flow through the existing `workflow-notify-approvers` edge function.

---

## 8. Audit Events

Every status transition logs to **both**:
1. `workflow_logs` (generic engine — instance_id, step_id, action, performed_by, details)
2. `bn_claim_event` (BN domain — claim_id, event_type='WORKFLOW', action, entity_type, metadata)

| Event Category | Examples |
|---|---|
| Workflow lifecycle | WORKFLOW_TRIGGERED, WORKFLOW_APPROVED, WORKFLOW_REJECTED |
| Claim transitions | CLAIM_SUBMITTED, CLAIM_APPROVED, CLAIM_DENIED, CLAIM_SUSPENDED |
| Financial | PAYMENT_ISSUED, PAYMENT_VOIDED, BATCH_RELEASED |
| Exceptions | EXCEPTION_ISSUE_FAILED, EXCEPTION_DUPLICATE_PAYMENT |
| Inquiry | INQUIRY_ACCESS (read-only historical views) |

---

## 9. Backward Compatibility

| Concern | Resolution |
|---|---|
| No workflow configured | BN's `CLAIM_TRANSITIONS` map handles all status changes directly |
| Legacy `cl_head.status` codes | Mapped automatically via `BN_LEGACY_STATUS_MAP` on claim update |
| Existing `workflow_triggers` format | `triggerBnWorkflow()` follows same pattern as `triggerIPRegistrationWorkflow()` |
| Existing `useWorkflowActions` hook | Reused directly via `useBnWorkflowActions()` wrapper |
| Existing maker-checker | Leveraged via `workflow_definitions.maker_checker_enabled` |
| Existing role resolution | Reuses `resolveReportingManagerForTask()` |
| Existing notification edge function | All BN notifications route through `workflow-notify-approvers` |

---

## 10. Integration Summary

```
┌─────────────────────────────────────────────────────────────┐
│  BN Domain Layer                                            │
│  ┌──────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐  │
│  │ Claim    │ │ Entitlement│ │ Payable    │ │ Batch     │  │
│  │ Workbench│ │ Mgmt       │ │ Queue      │ │ Ops       │  │
│  └────┬─────┘ └─────┬──────┘ └─────┬──────┘ └─────┬─────┘  │
│       │             │              │              │         │
│  ┌────▼─────────────▼──────────────▼──────────────▼─────┐  │
│  │  bnWorkflowIntegrationService.ts                      │  │
│  │  • checkWorkflowGovernance()                          │  │
│  │  • triggerBnWorkflow()                                │  │
│  │  • syncWorkflowEndState()                             │  │
│  │  • routeBnException()                                 │  │
│  │  • logBnWorkflowEvent()                               │  │
│  └────┬──────────────────────────────────────────────────┘  │
│       │                                                     │
├───────▼─────────────────────────────────────────────────────┤
│  Enterprise Workflow Engine (EXISTING — no changes)         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐│
│  │workflow_     │ │workflow_     │ │workflow_step_actions ││
│  │definitions   │ │instances     │ │                      ││
│  │workflow_steps│ │workflow_tasks│ │workflow_logs         ││
│  │workflow_     │ │              │ │workflow_triggers     ││
│  │triggers      │ │              │ │                      ││
│  └──────────────┘ └──────────────┘ └──────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Shared Services (EXISTING — no changes)                    │
│  • useWorkflowActions()         • resolveReportingManager() │
│  • useExecuteWorkflowAction()   • workflow-notify-approvers │
│  • WorkflowActionButtons        • maker-checker validation  │
└─────────────────────────────────────────────────────────────┘
```
