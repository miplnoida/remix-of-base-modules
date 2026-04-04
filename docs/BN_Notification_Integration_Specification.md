# BN Notification Integration Specification

## Business Purpose

Define how the Benefits module integrates with the **existing** enterprise notification system (`notification_templates`, `notification_logs`, `workflow_action_notifications`, `in_app_notifications`, and the `send-notification` edge function) to deliver timely, auditable communications across the full claim-to-payment lifecycle.

---

## How It Fits Into the Existing System

| Platform Asset | BN Integration |
|---|---|
| `notification_templates` | BN-specific templates registered with `module_id` pointing to the Benefits app_module; `trigger_event` set to BN event codes |
| `notification_logs` | Every BN dispatch creates a log row with `module = 'benefit_management'`, `entity_type`, and `entity_id` |
| `workflow_action_notifications` | Workflow-governed transitions (Approval, Disallow) fire notifications via the existing action-notification link |
| `in_app_notifications` | Internal staff alerts (supervisor escalations, batch failures) routed here |
| `send-notification` edge function | Email/SMS dispatch for external (claimant-facing) notifications |
| `notification_queue` (adapter table) | Adapter-level staging for asynchronous dispatch |

### Existing Tables Used

- `notification_templates` — template registry (trigger_event, channel, body, placeholders)
- `notification_logs` — delivery history and status tracking
- `workflow_action_notifications` — workflow-triggered notification bindings
- `in_app_notifications` — staff-facing real-time alerts
- `ip_master` — claimant contact resolution (email, phone_cell)
- `er_master` — employer contact resolution
- `bn_claim` — claim context (claim_number, ssn, product_id, status)
- `bn_entitlement` — entitlement context
- `bn_payment_batch` — batch context
- `bn_payment_instruction` — payable context
- `cl_cheques` — issued payment reference
- `audit_logs` — audit trail for notification dispatch events

### New Tables Introduced

**None.** This integration reuses the existing platform notification infrastructure entirely.

### New Artifacts

| Artifact | Purpose |
|---|---|
| `src/services/bn/bnNotificationIntegrationService.ts` | Comprehensive event dispatcher bridging BN events to platform notification tables |
| `src/hooks/bn/useBnNotifications.ts` | React hooks for triggering and querying BN notifications |
| 22 seed templates (see Event Catalog below) | Pre-configured `notification_templates` rows for all BN lifecycle events |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   BN Module Event                    │
│  (claim submitted, approved, batch created, etc.)   │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│        bnNotificationIntegrationService              │
│  ┌────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │ Resolve    │  │ Resolve    │  │ Log to        │  │
│  │ Template   │  │ Recipient  │  │ audit_logs    │  │
│  │ by Event   │  │ Contacts   │  │               │  │
│  └─────┬──────┘  └─────┬──────┘  └───────┬───────┘  │
│        │               │                 │          │
│        ▼               ▼                 ▼          │
│  ┌─────────────────────────────────────────────┐    │
│  │           Route by Channel                   │    │
│  │  ┌────────┐  ┌────────┐  ┌──────────────┐   │    │
│  │  │ Email  │  │  SMS   │  │  In-App      │   │    │
│  │  │ (ext)  │  │ (ext)  │  │  (internal)  │   │    │
│  │  └───┬────┘  └───┬────┘  └──────┬───────┘   │    │
│  │      │           │              │            │    │
│  └──────┼───────────┼──────────────┼────────────┘    │
└─────────┼───────────┼──────────────┼─────────────────┘
          │           │              │
          ▼           ▼              ▼
  notification_logs   notification_logs   in_app_notifications
  send-notification   send-notification
  (edge function)     (edge function)
```

### Recipient Resolution Strategy

| Recipient Type | Resolution Source | Contact Fields |
|---|---|---|
| **Claimant** (external) | `ip_master` via SSN from `bn_claim.ssn` | `email`, `phone_cell` |
| **Employer** (external) | `er_master` via `bn_claim.employer_regno` | `email`, `phone` |
| **Assigned Officer** | `bn_claim.assigned_to` → `profiles` table | `email` |
| **Supervisor** | Role-based lookup via `user_roles` + `profiles` | In-app notification |
| **Batch Approver** | Workflow task assignee from `workflow_tasks` | In-app notification |
| **Auditor** | Role-based broadcast to `bn_auditor` role holders | In-app notification |

---

## Event Catalog

### 1. CLAIM_CREATED

| Property | Value |
|---|---|
| **Event Code** | `bn.claim.created` |
| **Module** | Claim Workbench |
| **Trigger** | Claim saved with status `DRAFT` or `SUBMITTED` |
| **Recipient Roles** | Claimant (email/SMS), Assigned Officer (in-app) |
| **Message Purpose** | Acknowledge claim receipt; provide claim number and next steps |
| **Message Variables** | `{{ClaimNumber}}`, `{{ClaimantName}}`, `{{BenefitType}}`, `{{SubmissionDate}}`, `{{ReferenceNumber}}` |
| **Priority** | Normal |
| **Retry Behavior** | 3 retries, 60s interval (platform default) |
| **Audit Logging** | `notification_logs` row + `audit_logs` entry with `action=NOTIFICATION_SENT`, `module=benefit_management` |
| **Template Channels** | Email, SMS |

### 2. CLAIM_SUBMITTED

| Property | Value |
|---|---|
| **Event Code** | `bn.claim.submitted` |
| **Module** | Claim Workbench |
| **Trigger** | Claim transitions to `SUBMITTED` status |
| **Recipient Roles** | Claimant (email/SMS), Registration Queue Officers (in-app) |
| **Message Purpose** | Confirm formal submission; set processing expectations |
| **Message Variables** | `{{ClaimNumber}}`, `{{ClaimantName}}`, `{{BenefitType}}`, `{{SubmissionDate}}`, `{{ExpectedProcessingDays}}` |
| **Priority** | Normal |
| **Retry Behavior** | 3 retries, 60s interval |
| **Audit Logging** | Required |
| **Template Channels** | Email, SMS, In-App |

### 3. CLAIM_VERIFIED

| Property | Value |
|---|---|
| **Event Code** | `bn.claim.verified` |
| **Module** | Claim Workbench |
| **Trigger** | Claim transitions to `VERIFIED` status |
| **Recipient Roles** | Claimant (email), Assigned Officer (in-app) |
| **Message Purpose** | Notify claimant that identity and basic eligibility have been confirmed |
| **Message Variables** | `{{ClaimNumber}}`, `{{ClaimantName}}`, `{{VerifiedDate}}`, `{{NextStep}}` |
| **Priority** | Normal |
| **Retry Behavior** | 3 retries, 60s interval |
| **Audit Logging** | Required |
| **Template Channels** | Email |

### 4. EVIDENCE_REQUESTED

| Property | Value |
|---|---|
| **Event Code** | `bn.evidence.requested` |
| **Module** | Claim Workbench / Approval Console |
| **Trigger** | `REQUEST_EVIDENCE` action from approval or verification |
| **Recipient Roles** | Claimant (email/SMS), Assigned Officer (in-app) |
| **Message Purpose** | Request specific documents or information from claimant |
| **Message Variables** | `{{ClaimNumber}}`, `{{ClaimantName}}`, `{{EvidenceType}}`, `{{EvidenceDescription}}`, `{{DueDate}}`, `{{UploadInstructions}}` |
| **Priority** | High |
| **Retry Behavior** | 3 retries, 60s interval; reminder at 72hrs if not received |
| **Audit Logging** | Required |
| **Template Channels** | Email, SMS |

### 5. CALCULATION_COMPLETED

| Property | Value |
|---|---|
| **Event Code** | `bn.calc.completed` |
| **Module** | Benefit Determination |
| **Trigger** | `bn_calc_run` completes with `run_status = 'completed'` |
| **Recipient Roles** | Assigned Officer (in-app), Supervisor (in-app if override applied) |
| **Message Purpose** | Alert processing staff that benefit calculation is ready for review |
| **Message Variables** | `{{ClaimNumber}}`, `{{BenefitType}}`, `{{WeeklyRate}}`, `{{MonthlyRate}}`, `{{LumpSum}}`, `{{CalcDate}}`, `{{OverrideApplied}}` |
| **Priority** | Normal |
| **Retry Behavior** | In-app only — no retry needed |
| **Audit Logging** | Required |
| **Template Channels** | In-App |

### 6. RECOMMENDATION_PENDING_APPROVAL

| Property | Value |
|---|---|
| **Event Code** | `bn.decision.pending` |
| **Module** | Approval Console |
| **Trigger** | Claim transitions to `DECISION` status |
| **Recipient Roles** | Supervisor/Manager based on product approval rules (in-app), Assigned Officer (in-app) |
| **Message Purpose** | Alert approvers that a benefit decision is awaiting their review |
| **Message Variables** | `{{ClaimNumber}}`, `{{ClaimantName}}`, `{{BenefitType}}`, `{{RecommendedRate}}`, `{{LumpSum}}`, `{{AssignedOfficer}}`, `{{SLADeadline}}` |
| **Priority** | High |
| **Retry Behavior** | In-app; escalation if not actioned within SLA |
| **Audit Logging** | Required |
| **Template Channels** | In-App, Email (to approver) |

### 7. CLAIM_APPROVED

| Property | Value |
|---|---|
| **Event Code** | `bn.claim.approved` |
| **Module** | Approval Console |
| **Trigger** | `APPROVE` action executed by authorized approver |
| **Recipient Roles** | Claimant (email/SMS/letter), Assigned Officer (in-app), Finance (in-app) |
| **Message Purpose** | Formal approval notification with benefit details and expected payment timeline |
| **Message Variables** | `{{ClaimNumber}}`, `{{ClaimantName}}`, `{{BenefitType}}`, `{{WeeklyRate}}`, `{{MonthlyRate}}`, `{{LumpSum}}`, `{{EffectiveDate}}`, `{{PaymentMethod}}`, `{{ApproverName}}` |
| **Priority** | High |
| **Retry Behavior** | 3 retries; letter generated as fallback for unreachable claimants |
| **Audit Logging** | Required — mandatory compliance record |
| **Template Channels** | Email, SMS, Letter, In-App |

### 8. CLAIM_DISALLOWED

| Property | Value |
|---|---|
| **Event Code** | `bn.claim.disallowed` |
| **Module** | Approval Console |
| **Trigger** | `DISALLOW` action executed by authorized approver |
| **Recipient Roles** | Claimant (email/SMS/letter), Assigned Officer (in-app) |
| **Message Purpose** | Formal disallowance with reason code, appeal rights, and contact information |
| **Message Variables** | `{{ClaimNumber}}`, `{{ClaimantName}}`, `{{BenefitType}}`, `{{ReasonCode}}`, `{{ReasonDescription}}`, `{{AppealDeadline}}`, `{{AppealInstructions}}`, `{{DecisionDate}}` |
| **Priority** | High |
| **Retry Behavior** | 3 retries; letter generated as mandatory record |
| **Audit Logging** | Required — mandatory compliance record |
| **Template Channels** | Email, SMS, Letter, In-App |

### 9. ENTITLEMENT_CREATED

| Property | Value |
|---|---|
| **Event Code** | `bn.entitlement.created` |
| **Module** | Entitlement Management |
| **Trigger** | `bn_entitlement` row inserted with `status = 'ACTIVE'` |
| **Recipient Roles** | Assigned Officer (in-app), Finance (in-app) |
| **Message Purpose** | Alert that a new entitlement is active and ready for payable generation |
| **Message Variables** | `{{ClaimNumber}}`, `{{EntitlementType}}`, `{{EffectiveDate}}`, `{{EndDate}}`, `{{Rate}}`, `{{Frequency}}` |
| **Priority** | Normal |
| **Retry Behavior** | In-app only |
| **Audit Logging** | Required |
| **Template Channels** | In-App |

### 10. PAYABLE_BLOCKED

| Property | Value |
|---|---|
| **Event Code** | `bn.payable.blocked` |
| **Module** | Payables Queue |
| **Trigger** | `bn_payment_instruction` created with `status = 'BLOCKED'` or transitions to `BLOCKED` |
| **Recipient Roles** | Assigned Officer (in-app), Supervisor (in-app), Finance Manager (in-app) |
| **Message Purpose** | Alert that a payment cannot proceed due to validation failure, missing information, or hold |
| **Message Variables** | `{{ClaimNumber}}`, `{{ClaimantName}}`, `{{Amount}}`, `{{BlockReason}}`, `{{BlockedDate}}`, `{{InstructionId}}` |
| **Priority** | High |
| **Retry Behavior** | In-app; escalation after 24hrs if unresolved |
| **Audit Logging** | Required |
| **Template Channels** | In-App |

### 11. PAYABLE_READY

| Property | Value |
|---|---|
| **Event Code** | `bn.payable.ready` |
| **Module** | Payables Queue |
| **Trigger** | `bn_payment_instruction` transitions to `READY` status |
| **Recipient Roles** | Finance Officer (in-app), Batch Processor (in-app) |
| **Message Purpose** | Signal that a payable is cleared for batch inclusion |
| **Message Variables** | `{{ClaimNumber}}`, `{{Amount}}`, `{{PaymentMethod}}`, `{{Frequency}}`, `{{ReadyDate}}` |
| **Priority** | Normal |
| **Retry Behavior** | In-app only |
| **Audit Logging** | Required |
| **Template Channels** | In-App |

### 12. SCHEDULE_CREATED

| Property | Value |
|---|---|
| **Event Code** | `bn.schedule.created` |
| **Module** | Payment Schedule |
| **Trigger** | `bn_payment_schedule` row inserted |
| **Recipient Roles** | Assigned Officer (in-app), Finance (in-app) |
| **Message Purpose** | Confirm payment schedule generation with period details |
| **Message Variables** | `{{ClaimNumber}}`, `{{SchedulePeriod}}`, `{{Installments}}`, `{{TotalAmount}}`, `{{StartDate}}`, `{{EndDate}}` |
| **Priority** | Normal |
| **Retry Behavior** | In-app only |
| **Audit Logging** | Required |
| **Template Channels** | In-App |

### 13. BATCH_CREATED

| Property | Value |
|---|---|
| **Event Code** | `bn.batch.created` |
| **Module** | Batch Operations |
| **Trigger** | `bn_payment_batch` created with status `OPEN` |
| **Recipient Roles** | Batch Processor (in-app), Finance Manager (in-app) |
| **Message Purpose** | Alert that a new payment batch is open and accumulating instructions |
| **Message Variables** | `{{BatchNumber}}`, `{{BatchType}}`, `{{CreatedDate}}`, `{{InstructionCount}}`, `{{TotalAmount}}` |
| **Priority** | Normal |
| **Retry Behavior** | In-app only |
| **Audit Logging** | Required |
| **Template Channels** | In-App |

### 14. BATCH_APPROVED

| Property | Value |
|---|---|
| **Event Code** | `bn.batch.approved` |
| **Module** | Batch Operations |
| **Trigger** | `bn_payment_batch` transitions to `APPROVED` via maker-checker |
| **Recipient Roles** | Finance Manager (in-app), Payment Processor (in-app), Batch Creator (in-app) |
| **Message Purpose** | Confirm batch authorization; enable payment issue |
| **Message Variables** | `{{BatchNumber}}`, `{{ApprovedBy}}`, `{{ApprovedDate}}`, `{{InstructionCount}}`, `{{TotalAmount}}`, `{{PaymentMethod}}` |
| **Priority** | High |
| **Retry Behavior** | In-app; escalation if not issued within 4hrs |
| **Audit Logging** | Required — financial authorization record |
| **Template Channels** | In-App |

### 15. ISSUE_STARTED

| Property | Value |
|---|---|
| **Event Code** | `bn.issue.started` |
| **Module** | Payment Issue |
| **Trigger** | Batch issue process begins; instructions move to `ISSUING` |
| **Recipient Roles** | Finance Manager (in-app), Payment Processor (in-app) |
| **Message Purpose** | Notify that payment file generation or cheque printing has commenced |
| **Message Variables** | `{{BatchNumber}}`, `{{InstructionCount}}`, `{{TotalAmount}}`, `{{IssueStartTime}}`, `{{PaymentMethod}}` |
| **Priority** | Normal |
| **Retry Behavior** | In-app only |
| **Audit Logging** | Required |
| **Template Channels** | In-App |

### 16. ISSUE_COMPLETED

| Property | Value |
|---|---|
| **Event Code** | `bn.issue.completed` |
| **Module** | Payment Issue |
| **Trigger** | All instructions in batch successfully issued; `cl_cheques` rows written |
| **Recipient Roles** | Claimant (email/SMS per instruction), Finance Manager (in-app), Batch Creator (in-app) |
| **Message Purpose** | Confirm payment issuance to claimants; internal completion alert to finance |
| **Message Variables** | `{{ClaimNumber}}`, `{{ClaimantName}}`, `{{Amount}}`, `{{PaymentMethod}}`, `{{ChequeNumber}}`, `{{IssueDate}}`, `{{BatchNumber}}`, `{{SuccessCount}}`, `{{TotalAmount}}` |
| **Priority** | High |
| **Retry Behavior** | 3 retries for external (email/SMS); in-app for internal |
| **Audit Logging** | Required — financial issuance record |
| **Template Channels** | Email (claimant), SMS (claimant), In-App (staff) |

### 17. ISSUE_FAILED

| Property | Value |
|---|---|
| **Event Code** | `bn.issue.failed` |
| **Module** | Payment Issue |
| **Trigger** | One or more instructions fail during batch issue |
| **Recipient Roles** | Finance Manager (in-app), Supervisor (in-app), Payment Processor (in-app) |
| **Message Purpose** | Critical alert for failed payment issuance requiring immediate attention |
| **Message Variables** | `{{BatchNumber}}`, `{{FailedCount}}`, `{{SuccessCount}}`, `{{ErrorSummary}}`, `{{FailedInstructionIds}}`, `{{IssueDate}}` |
| **Priority** | Critical |
| **Retry Behavior** | In-app with 15-minute re-alert if not acknowledged |
| **Audit Logging** | Required — critical exception record |
| **Template Channels** | In-App, Email (Finance Manager) |

### 18. POST_ISSUE_COMPLETED

| Property | Value |
|---|---|
| **Event Code** | `bn.postissue.completed` |
| **Module** | Post-Issue Review |
| **Trigger** | All mandatory post-issue tasks for a claim marked complete |
| **Recipient Roles** | Assigned Officer (in-app), Supervisor (in-app) |
| **Message Purpose** | Confirm that all post-payment side effects have been executed |
| **Message Variables** | `{{ClaimNumber}}`, `{{TasksCompleted}}`, `{{CompletionDate}}`, `{{ClaimStatus}}` |
| **Priority** | Normal |
| **Retry Behavior** | In-app only |
| **Audit Logging** | Required |
| **Template Channels** | In-App |

### 19. CANCELLATION_REQUESTED

| Property | Value |
|---|---|
| **Event Code** | `bn.payment.cancel_requested` |
| **Module** | Payment Issue / Payables Queue |
| **Trigger** | User requests cancellation of an issued or pending payment |
| **Recipient Roles** | Finance Manager (in-app), Supervisor (in-app), Claimant (email if payment was issued) |
| **Message Purpose** | Alert approvers of cancellation request; notify claimant if payment was expected |
| **Message Variables** | `{{ClaimNumber}}`, `{{ClaimantName}}`, `{{Amount}}`, `{{CancellationReason}}`, `{{RequestedBy}}`, `{{RequestDate}}`, `{{OriginalChequeNumber}}` |
| **Priority** | High |
| **Retry Behavior** | In-app; email 3 retries |
| **Audit Logging** | Required — financial modification record |
| **Template Channels** | In-App, Email |

### 20. REISSUE_REQUESTED

| Property | Value |
|---|---|
| **Event Code** | `bn.payment.reissue_requested` |
| **Module** | Payment Issue |
| **Trigger** | User requests reissue of a cancelled or returned payment |
| **Recipient Roles** | Finance Manager (in-app), Payment Processor (in-app) |
| **Message Purpose** | Alert that a replacement payment needs to be processed |
| **Message Variables** | `{{ClaimNumber}}`, `{{ClaimantName}}`, `{{OriginalAmount}}`, `{{OriginalChequeNumber}}`, `{{ReissueReason}}`, `{{RequestedBy}}` |
| **Priority** | High |
| **Retry Behavior** | In-app; escalation if not actioned within 48hrs |
| **Audit Logging** | Required |
| **Template Channels** | In-App |

### 21. CORRECTION_COMPLETED

| Property | Value |
|---|---|
| **Event Code** | `bn.correction.completed` |
| **Module** | Benefit Determination / Payment Issue |
| **Trigger** | A benefit recalculation or payment correction is finalized |
| **Recipient Roles** | Claimant (email/SMS), Assigned Officer (in-app), Finance (in-app) |
| **Message Purpose** | Notify of adjusted benefit amount, reason for correction, and new payment details |
| **Message Variables** | `{{ClaimNumber}}`, `{{ClaimantName}}`, `{{OldRate}}`, `{{NewRate}}`, `{{CorrectionReason}}`, `{{EffectiveDate}}`, `{{Arrears}}`, `{{Overpayment}}` |
| **Priority** | High |
| **Retry Behavior** | 3 retries for external; in-app for internal |
| **Audit Logging** | Required — financial adjustment record |
| **Template Channels** | Email, SMS, In-App |

### 22. SLA_ESCALATION (Supplementary)

| Property | Value |
|---|---|
| **Event Code** | `bn.sla.escalated` |
| **Module** | Cross-module |
| **Trigger** | Claim or task exceeds configured SLA threshold |
| **Recipient Roles** | Supervisor (in-app), Manager (in-app if 2nd escalation) |
| **Message Purpose** | Alert management of overdue processing requiring intervention |
| **Message Variables** | `{{ClaimNumber}}`, `{{TaskType}}`, `{{AssignedTo}}`, `{{DueDate}}`, `{{DaysOverdue}}`, `{{EscalationLevel}}` |
| **Priority** | Critical |
| **Retry Behavior** | In-app with 30-minute re-alert if not acknowledged |
| **Audit Logging** | Required |
| **Template Channels** | In-App, Email |

---

## Workflow Integration

### Workflow-Governed Notifications

When a BN event is governed by the enterprise workflow engine (i.e., a `workflow_instance` exists for the claim), notifications are triggered through `workflow_action_notifications`:

```
workflow_step_actions → workflow_action_notifications → notification_templates
```

The BN notification service **checks for active workflow governance first**:
1. If governed → delegates to workflow action notifications (no duplicate dispatch)
2. If not governed → dispatches directly via the notification adapter

### Notification-Specific Workflow Steps

| Workflow Template | Step | Notification Action |
|---|---|---|
| `bn_claim_processing` | Verification Complete | `bn.claim.verified` |
| `bn_claim_processing` | Decision Pending | `bn.decision.pending` |
| `bn_claim_processing` | Approved | `bn.claim.approved` |
| `bn_claim_processing` | Disallowed | `bn.claim.disallowed` |
| `bn_payment_processing` | Batch Approved | `bn.batch.approved` |
| `bn_payment_processing` | Issue Complete | `bn.issue.completed` |
| `bn_payment_processing` | Issue Failed | `bn.issue.failed` |

---

## Notification Integration (with Existing Process)

### Template Registration

All BN templates are registered in `notification_templates` with:
- `trigger_event` = BN event code (e.g., `bn.claim.approved`)
- `module_id` = Benefits module ID from `app_modules`
- `channel` = `email`, `sms`, `push`, or `in_app`
- `is_enabled` = `true` (admin-toggleable)
- `placeholders` = JSON array of variable names

### Dispatch Flow

```
1. BN event fires
2. Service checks workflow governance
3. If not workflow-governed:
   a. Look up enabled templates by trigger_event
   b. Resolve recipient contacts (ip_master, profiles, role-based)
   c. Substitute template variables
   d. For external (email/SMS): insert into notification_logs + invoke send-notification
   e. For internal (in-app): insert into in_app_notifications
   f. Log to audit_logs
4. If workflow-governed:
   a. Workflow action handler fires workflow_action_notifications
   b. Platform handles dispatch
   c. BN service logs audit event only
```

### Retry Behavior (Platform Standard)

| Channel | Max Retries | Interval | Escalation |
|---|---|---|---|
| Email | 3 | 60s exponential backoff | Log to `notification_logs` as `failed` |
| SMS | 3 | 60s exponential backoff | Log to `notification_logs` as `failed` |
| In-App | N/A (immediate insert) | N/A | Re-alert after configurable threshold |
| Letter | 1 (generation) | N/A | Flag for manual print queue |

---

## Validations

1. **Template Existence**: Event dispatch fails gracefully if no enabled template exists for the trigger_event
2. **Recipient Resolution**: If recipient contact info is missing, log warning and skip channel (do not block other channels)
3. **Duplicate Prevention**: Idempotency key = `{event_code}:{entity_id}:{timestamp_minute}` prevents duplicate sends within the same minute
4. **Channel Availability**: Check `notification_providers` for active channel before dispatch
5. **Template Variable Completeness**: Warn (but send) if template placeholders cannot all be resolved

---

## Actions

| Action | Description | Role |
|---|---|---|
| `DISPATCH` | Send notification for a BN event | System (automatic) |
| `RETRY` | Re-attempt a failed notification | Officer, Supervisor |
| `CANCEL` | Cancel a queued notification before send | Officer, Supervisor |
| `SUPPRESS` | Suppress future notifications for a specific claim | Supervisor |
| `ESCALATE` | Manually trigger escalation notification | Supervisor, Manager |
| `ACKNOWLEDGE` | Mark in-app notification as read/actioned | Any assigned role |

---

## Statuses (notification_logs)

| Status | Meaning |
|---|---|
| `queued` | Notification created, awaiting dispatch |
| `sending` | Dispatch in progress |
| `sent` | Successfully delivered to channel provider |
| `failed` | All retries exhausted |
| `cancelled` | Manually cancelled before dispatch |
| `suppressed` | Blocked by suppression rule |

---

## Audit Events

Every notification dispatch creates an `audit_logs` entry:

| Field | Value |
|---|---|
| `action` | `NOTIFICATION_DISPATCHED`, `NOTIFICATION_FAILED`, `NOTIFICATION_RETRIED`, `NOTIFICATION_SUPPRESSED` |
| `module` | `benefit_management` |
| `entity_type` | `claim`, `entitlement`, `payment_batch`, `payment_instruction` |
| `entity_id` | The related entity's ID |
| `after_value` | `{ event_code, channel, recipient, template_id, notification_log_id }` |
| `user_id` | System or triggering user |

---

## Backward Compatibility Notes

1. **No new tables**: All notifications use existing `notification_templates`, `notification_logs`, `in_app_notifications`
2. **Adapter preserved**: The existing `notificationAdapter.ts` remains functional; the new integration service wraps it with richer event handling
3. **Workflow coexistence**: When workflow governance is active, notifications flow through `workflow_action_notifications` exactly as other modules do
4. **Template seeding**: BN templates are additive — they do not modify or conflict with existing module templates
5. **Channel fallback**: If email/SMS is unavailable, in-app notification is always sent as fallback for internal recipients
6. **Legacy claim events**: Claims originating from `cl_head` (legacy) can trigger notifications using the same event codes by mapping `cl_head.status` changes to BN events
