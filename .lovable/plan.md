# BN ↔ Workflow & Communication Integration

I would like you to revist and modify the plan again as system already have communication module -  
Yes. I checked what is visible in the repo.

There is already a communication/notice capability mainly under **Compliance**, including:

```text
/compliance/enforcement/notices
/compliance/notices/notice-register
/compliance/notices/generate
/compliance/notices/pending-approval
/compliance/notices/delivery-tracking
/compliance/notices/communication-history
/compliance/admin/communication-templates

```

The routing file imports those pages and exposes notice/communication routes.

## Recommendation

Do **not** create a separate BN communication module.

Instead, integrate Benefits with the existing communication/template/notice infrastructure.

Use BN only to trigger events like:

```text
bn.claim.submitted
bn.evidence.requested
bn.claim.approved
bn.claim.denied
bn.payment.issued
bn.life_certificate.due

```

Then the communication module handles:

```text
template
letter generation
email
SMS
print queue
delivery tracking
communication history

```

## How to connect it

Add a BN communication adapter:

```text
src/services/bn/communication/bnCommunicationAdapter.ts

```

It should expose:

```text
triggerClaimCommunication(eventCode, claimId, context)
generateClaimLetter(eventCode, claimId)
queueClaimEmail(eventCode, claimId)
queueClaimSms(eventCode, claimId)
getClaimCommunicationHistory(claimId)

```

## Claim Workbench should get a Communication tab

Add:

```text
Communications

```

Inside it show:

```text
Letters
Emails
SMS
Internal notifications
Print status
Delivery status
Failed/retry items

```

## Lovable prompt

```text
Integrate BN Benefits with existing Communication/Notice module.

Goal:
Do not create a separate Benefits communication system. Reuse the existing communication/template/notice infrastructure already available under Compliance/Notices.

Existing routes include:
- /compliance/enforcement/notices
- /compliance/notices/notice-register
- /compliance/notices/generate
- /compliance/notices/pending-approval
- /compliance/notices/delivery-tracking
- /compliance/notices/communication-history
- /compliance/admin/communication-templates

Implement:

1. Create BN communication adapter
src/services/bn/communication/bnCommunicationAdapter.ts

Functions:
- triggerClaimCommunication(eventCode, claimId, context?)
- generateClaimLetter(eventCode, claimId)
- queueClaimEmail(eventCode, claimId)
- queueClaimSms(eventCode, claimId)
- getClaimCommunicationHistory(claimId)

2. Reuse existing templates/notice system
Use existing communication templates and notice generation tables/services.
Do not create BN-only duplicate template tables.

3. Add BN event mappings
Support:
- bn.claim.submitted
- bn.claim.intake.started
- bn.evidence.requested
- bn.eligibility.failed
- bn.calculation.completed
- bn.decision.pending
- bn.claim.approved
- bn.claim.denied
- bn.claim.suspended
- bn.claim.reopened
- bn.payment.ready
- bn.payment.issued
- bn.life_certificate.due
- bn.overpayment.created

4. Add Claim Workbench Communications tab
Show:
- letters
- emails
- SMS
- in-app/internal notifications
- print status
- dispatch status
- delivery status
- failed communications
- resend/reprint actions

5. Workflow integration
When workflow action runs:
- resolve BN communication event
- call bnCommunicationAdapter
- write claim event
- write communication history
- show result in Claim Workbench

6. Product Catalog integration
In Product Catalog, allow product version to configure:
- which communication events are mandatory
- which templates apply
- channels: Email, SMS, Letter, In-App
- whether physical letter is mandatory
- whether supervisor approval is needed before printing

7. Formal letter rules
Mandatory physical letter for:
- approval
- denial/disallowance
- suspension
- overpayment
- appeal/right-to-review notice

8. Verification
- Claim submitted creates acknowledgement communication.
- Evidence request generates claimant communication.
- Approval generates approval letter/email/SMS.
- Denial generates formal denial letter with reason and appeal text.
- Communication history appears inside Claim Workbench.
- No duplicate BN communication tables are created.

```

Short answer: **yes, integrate BN with the existing communication module; do not rebuild it.**  
  
Goal: make BN claim processing 100% driven by the central workflow engine and a configurable communication catalog. No hardcoded letters/emails in screens.

Scope is large; I'll deliver in 5 phases, each independently shippable and TypeScript-clean.

---

## Phase 1 — Schema & Catalog (DB)

New tables (all in `public`, with GRANTs, RLS off per project rule, role-based only):

1. `bn_comm_event` — event catalog
  - `event_code` (PK-ish, e.g. `bn.claim.approved`), `event_name`, `description`, `category` (LIFECYCLE/EVIDENCE/DECISION/PAYMENT/REVIEW), `is_mandatory_letter`, `requires_reason_code`, `active`.
  - Seed with all 19 events from the spec.
2. `bn_comm_mapping` — event → channel → template, scoped by product version + workflow step
  - `event_code`, `bn_product_version_id?`, `workflow_step_id?`, `channel` (EMAIL|SMS|LETTER|IN_APP|INTERNAL_EMAIL), `recipient_type` (CLAIMANT|PAYEE|EMPLOYER|ASSIGNED_OFFICER|SUPERVISOR|FINANCE|MEDICAL_BOARD|AUDITOR), `template_id` (FK→`notification_templates`), `is_required`, `fallback_priority`, `active`.
3. `bn_letter` — physical letter lifecycle
  - `claim_id`, `event_code`, `template_id`, `recipient_type`, `recipient_name`, `recipient_address_snapshot` (jsonb), `status` (DRAFT|GENERATED|PENDING_APPROVAL|APPROVED_TO_PRINT|PRINTED|DISPATCHED|DELIVERED|RETURNED|CANCELLED), `pdf_storage_path`, `merge_context` (jsonb), `printed_at`, `dispatched_at`, `delivered_at`, `returned_at`, `created_by`, `approved_by`.
4. `bn_communication_log` — unified comm history (mirrors per-channel sends with provider IDs)
  - `claim_id`, `event_code`, `channel`, `recipient_type`, `recipient_address`, `template_id`, `status` (QUEUED|SENT|FAILED|RETRYING), `provider_message_id`, `error`, `letter_id?`, `notification_queue_id?`, `created_by`.
5. Add `workflow_definition_id` (or reuse existing `workflow_template_id`) to `bn_product_version` if not already present — verify first.

All tables: `GRANT SELECT,INSERT,UPDATE,DELETE … TO authenticated; GRANT ALL … TO service_role;` per platform rule.

---

## Phase 2 — Communication Service

`src/services/bn/communication/bnCommunicationService.ts`

Pure functions, no UI:

```ts
resolveCommunicationRules(eventCode, claimId, workflowStepId?)
resolveRecipients(claimId, recipientType)           // pulls from bn_claim + ip_master + er_master + assigned officer/queue
renderTemplate(templateId, context)                  // delegates to notification_templates renderer
queueEmail(to, templateId, context, claimId, eventCode)
queueSms(to, templateId, context, claimId, eventCode)
generateLetter(templateId, context, claimId, eventCode, recipientType)
createInAppNotification(userId, templateId, context, claimId)
logCommunication(row)
dispatchEvent(eventCode, claimId, workflowStepId?)   // top-level: resolve → render → queue per channel → log → fallback
```

Merge-field provider: `buildBnMergeContext(claimId)` returns the standard variables (ClaimNumber, ClaimantName, SSNMasked, BenefitType, ReasonCode, AppealDeadline, WeeklyRate, MissingDocuments, OfficerName, …).

Fallback logic (per spec §9): email → sms → letter, plus formal events always generate a letter regardless of digital contact.

---

## Phase 3 — Workflow Integration

- `src/services/bn/communication/workflowCommunicationBridge.ts`
  - `onWorkflowActionExecuted({ claimId, actionCode, stepId, fromStatus, toStatus, userCode })` reads `workflow_action_notifications` + `bn_comm_mapping` and calls `dispatchEvent` for each mapped event, then writes `bn_claim_event` + `workflow_logs`.
- Wire `claimActionRunner.ts` and `claimWorkbenchService.executeClaimAction` to call the bridge after a successful transition.
- Standard action → event mapping table (declared in code, configurable via mapping table):
  - SUBMIT → `bn.claim.submitted`
  - START_INTAKE → `bn.claim.intake.started`
  - VERIFY_IDENTITY → `bn.identity.verified`
  - REQUEST_EVIDENCE → `bn.evidence.requested`
  - RECEIVE_EVIDENCE → `bn.evidence.received`
  - RUN_ELIGIBILITY → `bn.eligibility.passed` | `bn.eligibility.failed`
  - RUN_CALCULATION → `bn.calculation.completed`
  - APPROVE → `bn.claim.approved` (+ approval letter mandatory)
  - DENY / DISALLOW → `bn.claim.denied` / `bn.claim.disallowed` (reason required, letter mandatory, appeal rights merged)
  - SUSPEND → `bn.claim.suspended` (letter mandatory)
  - REOPEN → `bn.claim.reopened`
  - WITHDRAW → `bn.claim.withdrawn`

---

## Phase 4 — UI

A) Product Catalog → Workflow tab (`WorkflowTab.tsx`)

- Add stage preview (steps + actions + SLA) using existing workflow_steps fetch.
- Add Communication-mappings preview grouped by event.
- Add validation panel: missing decision path, missing approval/denial letter template, missing event mappings.
- Disable Publish unless validations pass (or explicit fallback flag set).

B) Claim Workbench → new **Communication** tab

- `src/components/bn/workbench/CommunicationTab.tsx`
  - Timeline (from `bn_communication_log` + `bn_letter`)
  - Sub-sections: Emails / SMS / Letters / In-App / Failed
  - Actions per row: Resend, Reprint, Mark Dispatched/Delivered (permission-gated)
  - "Generate Letter" / "Send Ad-hoc" buttons that call `dispatchEvent` with a manual event.

C) Inline triggers in existing tabs are removed and replaced with calls into the bridge (Request Evidence button, Approve/Deny in `ClaimActionBar`).

D) New BN Communication Catalog admin page `/bn/config/communications` for managing `bn_comm_event` ↔ `bn_comm_mapping` ↔ `notification_templates`.

---

## Phase 5 — Validation Dashboard & Tests

- Extend BN Configuration Validation Dashboard with checks (§10).
- Add Vitest tests for `bnCommunicationService` (recipient resolution, fallback, formal-event letter mandatory, missing-template error).
- Add a test runner script under `src/services/bn/communication/__tests__/` for the 7 scenarios in §11.

---

## Technical Details

- Reuses existing infra: `notification_templates`, `notification_queue`, `notification_logs`, `in_app_notifications`, `workflow_*` tables, `system_audit_trail`.
- Letters rendered via existing `htmlToPdf` lib; PDFs stored in `bn-letters` Supabase bucket (created in Phase 1 migration).
- Address snapshot is taken at letter generation so address changes don't rewrite history.
- All `created_by`/`approved_by` columns store `user_code` per project rule.
- No RLS (per project rule); role-based UI gating via existing permission helpers.
- Shielded errors → user toast; raw error to `system_error_logs` non-blocking.

---

## Deliverable Order

1. Migration (Phase 1) — needs your approval before code that uses new tables.
2. `bnCommunicationService` + bridge (Phases 2–3).
3. Workbench Communication tab + Product Catalog enhancements (Phase 4).
4. Admin catalog page + Validation Dashboard updates + tests (Phase 5).

Approve and I'll start with the migration.