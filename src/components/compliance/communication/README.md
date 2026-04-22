# Audit Communications — Stage-Aware Orchestration Layer

This module is **not** a standalone "send a template" feature. It is an
orchestration layer that lives inside the Audit Visit Workspace and
coordinates templates, stages, triggers, approvals, history, and the
visit-completion gate.

## Architectural goals (and where each is implemented)

| Goal | Layer | Files |
|---|---|---|
| Reuse existing templates from Settings | Template store | `src/services/auditCommunicationTemplateService.ts` (reads `ce_audit_communication_templates` — managed in Settings) |
| Central template-to-stage mapping | Stage mapping | `src/types/fieldStageMapping.ts`, `src/services/fieldStageTemplateMapService.ts`, admin UI: `src/pages/compliance/admin/FieldStageTemplateMappingPage.tsx`, table: `ce_audit_field_stage_template_map` |
| Visit-aware communication instances | Instance store | `src/services/auditCommunicationService.ts`, table: `ce_audit_communications` (keyed by `inspection_id`) |
| Rule-driven triggers | Trigger engine | `src/lib/compliance/commTriggerEngine.ts` (pure), `src/services/commTriggerRuleService.ts`, `src/hooks/useVisitTriggerEvaluation.ts`, table: `ce_audit_comm_trigger_rules`. Reminder/escalation cron: `fn_ce_audit_run_reminder_escalation()` (every 15 min) |
| Approval-aware sending | Approval workflow | `src/services/auditCommunicationApprovalService.ts` — status flow `draft → pending_approval → approved/rejected → sent`; records author, approver, timestamps, comments, rejection reason |
| Timeline / history integration | Intelligence + history | `src/hooks/useVisitCommunicationStatus.ts`, `VisitCommunicationsIntelligenceCard.tsx`, `CommunicationHistoryDialog.tsx` |
| Completion-gate validation | Gate | `CommunicationGateChecks.tsx` + `useVisitCommunicationOrchestrator.completionGate` |
| Extensible for future audit types | Façade hook | `src/hooks/compliance/useVisitCommunicationOrchestrator.ts` — single hook other audit types (desk audit, follow-up, themed review) can consume |

## How a visit screen wires it up

```tsx
import { useVisitCommunicationOrchestrator } from '@/hooks/compliance/useVisitCommunicationOrchestrator';

const { status, triggers, completionGate, nextRecommended } =
  useVisitCommunicationOrchestrator({
    inspectionId,
    employerId,
    employerName,
    triggerContext: {
      sessionStarted, sessionClosed, reportStatus,
      hasViolations, hasMissingDocuments, maxSeverity, /* ... */
    },
    userCode,
  });
```

That single object is enough to power:

- the KPI strip (`status.drafts`, `status.pendingApproval`, `status.sent`)
- the intelligence card (`status.overdueResponses`, `status.maxEscalationLevel`, `nextRecommended`)
- contextual action visibility (filter by `triggers.suggestions`)
- the visit completion gate (`completionGate.ready`, `completionGate.blockers`)

## Adding a new audit type

1. Reuse the same `ce_audit_communications` table — set `inspection_id` to the new audit's primary key (or extend with a discriminator column if needed).
2. Map any new stages via the existing `ce_audit_field_stage_template_map`. Stages are an enum in `src/types/fieldStageMapping.ts`; extend the enum + DB CHECK constraint together.
3. Add trigger rules in the admin grid; the engine is generic.
4. Mount `useVisitCommunicationOrchestrator` in the new workspace screen — no new orchestration code needed.

## Status flow (approval-aware)

```
draft ──submit──▶ pending_approval ──approve──▶ approved ──send──▶ sent
   ▲                       │                                          │
   └───────reject──────────┘                                          ▼
                                                       (delivered_at, acknowledged_at,
                                                        responded_at populated by
                                                        webhooks / ack endpoints)
```

Each transition records: `created_by`, `approved_by`, `rejected_by`,
timestamps, approver comments, rejection reason. See
`auditCommunicationApprovalService.ts`.
