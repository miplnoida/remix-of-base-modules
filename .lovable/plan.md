

# Benefit Module -- Workflow, Approval & Decision Engine

## Overview

Build a benefit-specific workflow orchestration layer that wraps the existing generic workflow engine (`workflow_definitions`, `workflow_instances`, `workflow_tasks`, `workflow_logs`) with benefit-domain concepts: configurable status transitions, reason codes, narrative requirements, escalation rules, queue/workbasket routing, and an auditable decision timeline.

The generic engine handles step sequencing, task assignment, and maker-checker. This module adds the **domain policy layer** on top.

---

## Architecture

```text
┌─────────────────────────────────────────────────────┐
│               BENEFIT DECISION ENGINE                │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Status Model │  │ Transition   │  │ Reason     │ │
│  │ (bn_claim_   │  │ Rules        │  │ Code       │ │
│  │  status_def) │  │ (bn_claim_   │  │ Registry   │ │
│  │              │  │  transition) │  │            │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Queue /      │  │ Escalation   │  │ Override   │ │
│  │ Workbasket   │  │ Policy       │  │ Checkpoint │ │
│  │              │  │              │  │            │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                      │
│  Uses: workflow_instances, workflow_tasks,            │
│        workflow_logs, workflow_step_actions           │
└─────────────────────────────────────────────────────┘
```

---

## Database Tables (8 new tables)

### 1. `bn_claim_status_def` -- Status Registry
Configurable status definitions per country/product category.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| status_code | varchar(30) UNIQUE | e.g. SUBMITTED, APPROVED |
| status_label | varchar(100) | Display name |
| status_group | varchar(30) | INTAKE, PROCESSING, DECISION, POST_DECISION, TERMINAL |
| is_terminal | boolean | No further transitions allowed |
| requires_effective_date | boolean | Status change needs a specific effective date |
| display_order | int | Sort for dropdowns/timelines |
| color_code | varchar(20) | Badge color |
| is_active | boolean | |
| entered_by / entered_at | audit | |

### 2. `bn_claim_transition_rule` -- Transition Rules
Which status changes are permitted, under what conditions.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| from_status | varchar(30) FK | |
| to_status | varchar(30) FK | |
| action_code | varchar(50) | SUBMIT, VERIFY, APPROVE, DENY, SUSPEND, SEND_BACK, ESCALATE, HOLD, RELEASE, REOPEN, DISCONTINUE, DISALLOW, WITHDRAW |
| action_label | varchar(100) | Display text |
| allowed_roles | text[] | Roles that can execute |
| product_category | varchar(30) NULL | NULL = all categories |
| country_code | varchar(10) NULL | NULL = all countries |
| requires_reason | boolean | Must select a reason code |
| requires_narrative | boolean | Free-text justification mandatory |
| requires_maker_checker | boolean | Needs second approver |
| requires_evidence_complete | boolean | All mandatory docs must be verified |
| requires_eligibility_pass | boolean | Eligibility check must pass |
| requires_calculation | boolean | Calculation must exist |
| min_override_level | int NULL | Minimum override authority level needed |
| sort_order | int | Button display order |
| is_active | boolean | |
| entered_by / entered_at | audit | |

### 3. `bn_reason_code` -- Reason Code Registry

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| reason_code | varchar(30) UNIQUE | |
| reason_label | varchar(200) | |
| reason_category | varchar(50) | DENIAL, SUSPENSION, SEND_BACK, ESCALATION, OVERRIDE, DISCONTINUATION |
| applicable_actions | text[] | Which action_codes this reason applies to |
| requires_narrative | boolean | Additional free text needed |
| is_active | boolean | |
| entered_by / entered_at | audit | |

### 4. `bn_claim_decision` -- Decision Audit Log
Immutable record of every status transition (supplements `bn_claim_event` with richer decision context).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| claim_id | uuid FK | |
| transition_rule_id | uuid FK NULL | Links to the rule that authorized this |
| action_code | varchar(50) | |
| from_status | varchar(30) | |
| to_status | varchar(30) | |
| reason_code_id | uuid FK NULL | |
| narrative | text NULL | Officer's justification |
| effective_date | date NULL | When the status takes effect (can differ from performed_at) |
| override_id | uuid FK NULL | If an override was applied |
| workflow_instance_id | uuid NULL | Generic workflow instance if applicable |
| workflow_task_id | uuid NULL | |
| evidence_snapshot | jsonb | Document verification state at decision time |
| eligibility_snapshot_id | uuid NULL | FK to bn_claim_eligibility |
| calculation_snapshot_id | uuid NULL | FK to bn_claim_calculation |
| performed_by | varchar(50) | user_code |
| performed_at | timestamptz | |
| ip_address | varchar(45) NULL | |

### 5. `bn_workbasket` -- Queue / Workbasket Definitions

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| basket_code | varchar(50) UNIQUE | |
| basket_name | varchar(100) | |
| description | text NULL | |
| assigned_role | varchar(100) | Role that owns this queue |
| product_category | varchar(30) NULL | Filter by category |
| country_code | varchar(10) NULL | |
| priority_rules | jsonb | Auto-priority logic (e.g., claim age, SLA proximity) |
| max_capacity | int NULL | Soft limit for load balancing |
| is_active | boolean | |
| entered_by / entered_at | audit | |

### 6. `bn_claim_queue_assignment` -- Claim-to-Queue Mapping

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| claim_id | uuid FK | |
| workbasket_id | uuid FK | |
| assigned_to | varchar(50) NULL | Specific officer user_code |
| assigned_at | timestamptz | |
| priority | int DEFAULT 5 | 1=highest |
| due_at | timestamptz NULL | SLA deadline |
| picked_at | timestamptz NULL | When officer opened it |
| completed_at | timestamptz NULL | |
| is_active | boolean DEFAULT true | |

### 7. `bn_escalation_policy` -- Escalation Rules

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| policy_code | varchar(50) | |
| policy_name | varchar(100) | |
| trigger_type | varchar(30) | SLA_BREACH, MANUAL, THRESHOLD, EXCEPTION |
| trigger_config | jsonb | e.g. { "hours_overdue": 48 } |
| escalation_target_role | varchar(100) | |
| escalation_target_basket_id | uuid NULL | |
| auto_reassign | boolean | Move claim to escalation queue automatically |
| notification_template_id | uuid NULL | |
| severity | varchar(20) | LOW, MEDIUM, HIGH, CRITICAL |
| product_category | varchar(30) NULL | |
| country_code | varchar(10) NULL | |
| is_active | boolean | |
| entered_by / entered_at | audit | |

### 8. `bn_escalation_event` -- Escalation Audit

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| claim_id | uuid FK | |
| policy_id | uuid FK | |
| trigger_reason | text | |
| escalated_from_user | varchar(50) NULL | |
| escalated_to_role | varchar(100) | |
| escalated_at | timestamptz | |
| resolved_at | timestamptz NULL | |
| resolution_notes | text NULL | |
| resolved_by | varchar(50) NULL | |

---

## Implementation Plan

### Step 1: Database Migration
Create all 8 tables above with audit triggers (`fn_audit_row_change`). Seed `bn_claim_status_def` with the 16 existing statuses from `BnClaimStatus`. Seed `bn_reason_code` with standard codes (Incomplete Evidence, Contribution Shortfall, Age Ineligible, Medical Pending, etc.). Seed `bn_claim_transition_rule` with the full transition matrix covering all 13 action codes.

### Step 2: Types & Services
- Add types to `src/types/bn.ts`: `BnClaimStatusDef`, `BnClaimTransitionRule`, `BnReasonCode`, `BnClaimDecision`, `BnWorkbasket`, `BnClaimQueueAssignment`, `BnEscalationPolicy`, `BnEscalationEvent`
- Add action code enum and label map
- Create `src/services/bn/decisionEngine.ts`:
  - `getAvailableTransitions(claimId, userRoles, productCategory, countryCode)` -- returns permitted actions based on current status + role + evidence state
  - `executeTransition(claimId, actionCode, { reasonCodeId, narrative, effectiveDate, overrideId })` -- validates preconditions, updates `bn_claim.status`, writes `bn_claim_decision`, writes `bn_claim_event`, updates queue assignment
  - `validateTransitionPreconditions(claim, rule)` -- checks evidence, eligibility, calculation requirements
- Create `src/services/bn/workbasketService.ts`: queue CRUD, claim assignment, pick/release, priority recalculation

### Step 3: React Query Hooks
- `src/hooks/bn/useBnDecisionEngine.ts`:
  - `useBnAvailableActions(claimId)` -- fetches permitted transitions for current user
  - `useBnExecuteAction()` -- mutation for executing a transition
  - `useBnClaimDecisions(claimId)` -- decision audit trail
  - `useBnReasonCodes(actionCode)` -- filtered reason codes for a given action
- `src/hooks/bn/useBnWorkbasket.ts`:
  - `useBnWorkbaskets()` -- list all queues
  - `useBnMyQueue()` -- claims assigned to current user
  - `useBnQueueClaims(basketId)` -- claims in a specific queue

### Step 4: Decision Action Panel (Component)
`src/components/bn/claim/ClaimDecisionPanel.tsx` -- renders inside Claim360:
- Shows available action buttons based on `useBnAvailableActions`
- Clicking an action opens a modal with: reason code dropdown (filtered by action), narrative textarea (required/optional per rule), effective date picker (if required), confirmation
- Blocked transitions show tooltip explaining why (e.g., "Documents incomplete", "Eligibility check required")
- Maker-checker actions show "Pending Second Approval" badge after first action

### Step 5: Decision Audit Timeline
`src/components/bn/claim/ClaimDecisionTimeline.tsx` -- read-only chronological view:
- Each decision entry shows: action taken, from/to status, reason, narrative, officer, timestamp, effective date
- Override decisions highlighted with amber indicator
- Escalation events shown inline
- Export button generates JSON/CSV snapshot of full decision history

### Step 6: Workbasket / Queue UI
`src/pages/bn/claims/ClaimQueue.tsx`:
- Left sidebar: list of workbaskets the user has access to (role-filtered)
- Main area: claims in selected queue with priority sorting, SLA countdown, overdue highlighting
- Pick/release buttons for claim assignment
- Bulk reassignment for supervisors

### Step 7: Escalation & SLA Configuration (Admin)
`src/components/bn/config/EscalationPolicyTab.tsx` -- added to Product Editor or standalone admin page:
- CRUD for escalation policies
- Trigger type configuration (SLA breach hours, manual thresholds)
- Target role/queue selection
- Notification template binding

### Step 8: Integration with Existing Workflow Engine
- Register `bn_claim` as a source module in `updateSourceRecordStatus()` inside `useWorkflowActions.ts`
- Map generic workflow end states (Approved/Rejected) to benefit-specific status codes via `bn_claim_transition_rule`
- When generic workflow completes an action, call `executeTransition()` to maintain the BN decision audit trail in parallel

### Step 9: Admin Configuration Screens
- Reason Code Management: CRUD page at `/bn/config/reason-codes`
- Status Definition Management: CRUD page at `/bn/config/statuses`
- Transition Rule Matrix: Visual grid showing from/to status combinations with role assignments
- Workbasket Management: CRUD at `/bn/config/workbaskets`

### Step 10: Navigation & Permissions
- Add Queue, Escalation, Decision Config to `bnMenuItems.ts`
- Gate admin config screens with `PermissionWrapper`
- Gate action buttons with role checks from `bn_claim_transition_rule.allowed_roles`

---

## Key Design Decisions

1. **No silent status changes**: Every `bn_claim.status` update MUST go through `executeTransition()` which writes a `bn_claim_decision` record. Direct updates to the status column are prohibited in application code.

2. **Dual audit**: `bn_claim_decision` provides the rich domain audit (reason, narrative, snapshots). The DB trigger `fn_audit_row_change` on `bn_claim` provides the technical field-level audit. Both coexist.

3. **Effective date vs performed date**: Some decisions (e.g., suspension) take effect on a future date. `effective_date` captures this; `performed_at` is always the actual action timestamp.

4. **Blocked transition handling**: `getAvailableTransitions()` returns all potentially valid actions but marks blocked ones with a `blocked: true` flag and `blockedReason` string. The UI renders these as disabled buttons with tooltips.

5. **Generic workflow bridge**: The existing `useWorkflowActions` / `useExecuteWorkflowAction` hook is used for step routing. The BN decision engine is called as a side-effect to maintain benefit-specific audit. This avoids duplicating the workflow step machinery.

6. **Exportable audit snapshot**: The decision timeline export includes `bn_claim_decision` rows plus the referenced `bn_claim_eligibility` and `bn_claim_calculation` snapshots, producing a self-contained audit package.

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `supabase/migrations/..._bn_decision_engine.sql` (8 tables + seeds) |
| Create | `src/services/bn/decisionEngine.ts` |
| Create | `src/services/bn/workbasketService.ts` |
| Create | `src/hooks/bn/useBnDecisionEngine.ts` |
| Create | `src/hooks/bn/useBnWorkbasket.ts` |
| Create | `src/components/bn/claim/ClaimDecisionPanel.tsx` |
| Create | `src/components/bn/claim/ClaimDecisionTimeline.tsx` |
| Create | `src/pages/bn/claims/ClaimQueue.tsx` |
| Create | `src/pages/bn/config/ReasonCodes.tsx` |
| Create | `src/pages/bn/config/TransitionMatrix.tsx` |
| Create | `src/pages/bn/config/WorkbasketConfig.tsx` |
| Create | `src/pages/bn/config/EscalationConfig.tsx` |
| Modify | `src/types/bn.ts` -- add 8 new interfaces + action enum |
| Modify | `src/pages/bn/claims/Claim360.tsx` -- integrate DecisionPanel + DecisionTimeline |
| Modify | `src/hooks/useWorkflowActions.ts` -- add `bn_claim` to `updateSourceRecordStatus` |
| Modify | `src/components/routing/AppRoutes.tsx` -- add new routes |
| Modify | `src/components/sidebar/menuItems/bnMenuItems.ts` -- add nav items |

