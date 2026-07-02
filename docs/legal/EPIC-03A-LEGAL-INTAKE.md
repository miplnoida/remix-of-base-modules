# EPIC-03A — Legal Intake & Qualification

## Business Process

Referrals from Benefits and Compliance no longer become Legal Cases directly.
Every referral is intercepted by a mandatory **Intake & Qualification** stage
so Legal can determine whether the matter is valid, in-jurisdiction, urgent,
sufficiently supported, and worth pursuing.

```
Referral Received ─▶ Intake Review ─▶ Qualification
                                      ├─▶ Info Requested ─▶ Info Received ─▶ Continue Review
                                      ├─▶ Rejected
                                      └─▶ Accepted ─▶ Supervisor Approval (if required) ─▶ Legal Case
```

## Workflow States (`lg_case_intake.qualification_status`)

| Status              | Meaning                                                          |
|---------------------|------------------------------------------------------------------|
| NEW                 | Just arrived, awaiting officer assignment                        |
| IN_REVIEW           | Officer assigned, actively qualifying                            |
| INFO_REQUESTED      | One or more information requests are open                        |
| SUPERVISOR_REVIEW   | Awaiting supervisor decision                                     |
| APPROVED            | Cleared for case creation                                        |
| REJECTED            | Terminated — no case will be created                             |
| RETURNED            | Sent back to submitter for correction                            |
| CONVERTED_TO_CASE   | Legal case created via `lg_create_case_from_intake`              |

`qualification_result` records the human decision (ACCEPTED / REJECTED /
RETURNED / INFO_REQUIRED / ESCALATED / CONVERTED).

## Checklist Rules

Checklist template stored in `lg_intake_checklist_template` and is fully
configurable. Seeded with 13 items covering intake, party identification,
financial, legal, cross-department and governance categories. Items flagged
`mandatory = true` MUST be resolved as `COMPLETE` or `NA` for case creation.

Responses live in `lg_intake_checklist_response` (unique on
`intake_id, template_item_id`) and record completed_by / completed_at.

## Qualification Rules

An intake advances through user actions:

- `assignIntakeOfficer(intakeId, officerId)` — auto-transitions `NEW` → `IN_REVIEW`.
- `officerDecision('ACCEPT'|'REJECT'|'RETURN'|'ESCALATE')` — sets status and
  result, captures `rejection_reason` / `returned_reason`, stamps
  `qualification_completed_at` for terminal outcomes.
- `submitForSupervisor()` — flags `supervisor_required=true`, status →
  `SUPERVISOR_REVIEW`, `supervisor_status='PENDING'`.
- `supervisorDecision('APPROVED'|'REJECTED'|'RETURNED')` — records supervisor
  metadata and flips qualification status accordingly.

## Case Creation Rules

The Postgres RPC `lg_create_case_from_intake(p_intake_id, p_actor)` is the
**only** way to promote an intake to a case. It enforces atomically:

1. Intake exists and is `APPROVED`.
2. Every mandatory checklist item is `COMPLETE` or `NA`.
3. Financial assessment present (`financial_exposure` OR `financial_outstanding`).
4. Legal assessment present (`legal_issue` AND `recovery_type`).
5. If `supervisor_required`, `supervisor_status='APPROVED'`.

A BEFORE INSERT trigger `trg_lg_case_intake_gate` on `lg_case` refuses any
row referencing a `source_intake_id` whose qualification_status is not
`APPROVED`/`CONVERTED_TO_CASE`, closing the back-door path.

## Permissions

Uses the existing `useLgAccess` capabilities:

| Action                        | Required capability          |
|-------------------------------|------------------------------|
| View intake                   | `viewLegalModule`            |
| Officer decisions / edits     | `editCase`                   |
| Reject referral / intake      | `rejectReferral`             |
| Accept & create case          | `createCase` + `acceptReferral` |
| Assign / reassign officer     | `assignOfficer`              |
| Supervisor approval           | `approveNotice` or admin     |
| Request information           | `requestInformation`         |

## Database Tables Used

- `lg_case_intake` (extended by this EPIC)
- `lg_intake_checklist_template` (new, configurable)
- `lg_intake_checklist_response` (new)
- `lg_intake_info_request` (new)
- `lg_intake_decision_audit` (new)
- `legal_referral` (updated on conversion)
- `lg_case` (destination; gated by trigger)

## Services

- `src/services/legal/lgIntakeQualificationService.ts` — CRUD, transitions,
  checklist, info requests, audit, gate validation, RPC caller.
- `src/services/legal/lgIntakeWorkbenchService.ts` — grid aggregation +
  KPI computation.
- `src/hooks/legal/useLgIntake.ts` — React Query hooks.

## UI

- `/legal/lg/intake` — `LgIntakeWorkbench` (18-column grid, 8 KPI chips,
  9 filters).
- `/legal/lg/intake/:id` — `LgIntakeWorkspace` (9 tabs: Overview, Referral,
  Checklist, Documents, Financial, Legal, Communications, Timeline, Audit).

## Known Gaps

- Documents tab currently only surfaces the source referral payload; document
  upload flows continue to live inside the legacy IntakeDetail page pending
  future consolidation.
- Notifications for assignment / approval events are logged in the audit
  trail but the email/push dispatch path is deferred to the shared
  notification service (out of scope for this EPIC).
- Configurable checklist categories per matter type is not yet exposed
  in the UI; template rows are edited directly against
  `lg_intake_checklist_template`.

## UAT Scenarios

1. **Referral arrives → Intake NEW.** Grid shows referral with
   `Recommended Action = "Assign Intake Officer"`.
2. **Officer assignment** transitions to `IN_REVIEW` and stamps
   `qualification_started_at`.
3. **Attempt Create Case without checklist** returns error listing
   outstanding mandatory items; no case row is created.
4. **Complete mandatory checklist + financial + legal assessment**,
   Accept → status `APPROVED`, then Create Case succeeds, RPC returns the
   `lg_case.id`, `legal_referral.status` becomes `LEGAL_CASE_CREATED`.
5. **Supervisor-required intake** cannot be Approved by officer alone —
   status must first pass `SUPERVISOR_REVIEW` and receive `APPROVED`.
6. **Reject intake** with reason → status `REJECTED`, gate trigger prevents
   any future `lg_case` insert against this intake.
7. **Info request created** → status auto-flips to `INFO_REQUESTED`; response
   recorded, request `RESPONDED`, officer may continue review.
8. **Audit trail** shows every state change with actor, timestamp and
   remarks.
