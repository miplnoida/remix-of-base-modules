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

---

## EPIC-03A.1 — Enterprise Decision Support

Non-invasive presentation layer on top of EPIC-03A. No workflow, schema,
or write-path change. All aggregation is read-only against existing tables.

### Readiness calculation

`computeReadiness` in `src/services/legal/lgIntakeDecisionService.ts`
returns a `{ score, level, criteria[] }` object. Weighted criteria:

| Weight | Criterion                          | Rule                                                                                     |
|--------|------------------------------------|------------------------------------------------------------------------------------------|
| 25 %   | Mandatory checklist completed      | `mandatoryComplete >= mandatoryTotal` (COMPLETE or NA)                                   |
| 15 %   | Financial assessment complete      | `financial_exposure` OR `financial_outstanding` present                                  |
| 15 %   | Legal assessment complete          | `legal_issue` AND `recovery_type`                                                        |
| 10 %   | Documents present                  | at least one document link OR referral payload attached                                  |
| 10 %   | Information requests closed        | `openInfoCount === 0`                                                                    |
| 10 %   | Supervisor approval complete       | `!supervisor_required` OR `supervisor_status = APPROVED`                                 |
|  8 %   | Duplicate check reviewed           | zero open duplicates OR internal remarks recorded                                        |
|  7 %   | Jurisdiction confirmed             | `country_code` present                                                                   |

Levels: `READY` ≥ 90, `ALMOST` ≥ 70, `ATTENTION` ≥ 40, else `INCOMPLETE`.

### Recommendation rules (deterministic)

`computeRecommendation` produces one of:
`ACCEPT_REFERRAL`, `REJECT_REFERRAL`, `REQUEST_INFORMATION`,
`SUPERVISOR_REVIEW`, `ESCALATE`, `CONVERT_TO_CASE`, `RETURN_TO_SOURCE`.

Decision tree (first match wins):

1. Already `CONVERTED_TO_CASE` → surface CONVERT_TO_CASE (informational).
2. Already `REJECTED` → REJECT_REFERRAL.
3. `APPROVED` and supervisor ok → CONVERT_TO_CASE.
4. Open information requests → REQUEST_INFORMATION.
5. Supervisor required, not approved, readiness ≥ 70 → SUPERVISOR_REVIEW.
6. Readiness < 40 → REQUEST_INFORMATION.
7. Readiness < 70 → REQUEST_INFORMATION (complete assessment).
8. Below high-value threshold AND recovery previously failed → RETURN_TO_SOURCE.
9. Otherwise → ACCEPT_REFERRAL.

Each recommendation carries `reasons[]` and `blockers[]` sourced from
the readiness criteria plus the exposure/threshold flag.

### Duplicate analysis

`loadDuplicateAnalysis` (read-only) queries:

- `lg_case_party` and `lg_case.primary_entity_id` — open vs closed cases
- `lg_settlement`, `lg_payment_arrangement_link`, `lg_order`, `lg_case_action`
  scoped to the discovered case ids.

Returns counts, outstanding recovery total, and quick-navigation routes.
Case creation is never blocked; this panel is informational.

### Business context

`loadBusinessContext` sources from existing modules:

- Employer: `er_master`, `ce_employer_compliance_status`, `lg_case` count.
- Insured Person: `ip_master`, `bn_overpayment` count, `lg_case` count.

Read-only summary card only. No duplication of source data.

### Referral source context

`loadSourceContext` renders the payload the referring module supplied,
enriched where possible from:

- Compliance → `ce_cases`
- Benefits   → `bn_claim`
- Finance / Cashier → in-payload debt ledger fields
- Manual → summary + referral notes

### Operational alerts

`computeAlerts` produces deterministic alert badges:

| Alert                        | Severity | Trigger                                                           |
|------------------------------|----------|-------------------------------------------------------------------|
| High Value Referral          | high     | exposure ≥ configurable threshold (default 10,000)                |
| Existing Open Legal Matter   | high     | `duplicates.totalOpen > 0`                                        |
| Existing Court Order         | medium   | `duplicates.orders.length > 0`                                    |
| Existing Settlement          | medium   | `duplicates.settlements.length > 0`                               |
| Existing Payment Arrangement | medium   | `duplicates.arrangements.length > 0`                              |
| Outstanding Information      | medium   | `openInfoCount > 0`                                               |
| Mandatory Checklist Incomplete | medium | `mandatoryComplete < mandatoryTotal`                              |
| Supervisor Approval Needed   | low      | `supervisor_required && supervisor_status != APPROVED`            |

### Supervisor queue & management KPIs

`computeSupervisorKpis` and `computeManagementKpis` power new KPI cards on
`/legal/lg/intake`: pending approval, urgent, high-value, breached SLA
(> 48 h in `SUPERVISOR_REVIEW`), waiting information, returned, rejected,
converted today, avg review / approval hours, source distribution,
officer throughput, average financial exposure.

### Smart filter presets

Workbench chips: Ready for Case Creation, Needs Supervisor Review,
High Value, Awaiting Information, Compliance / Benefits / Finance
Referrals, Converted Today. Fully client-side over the loaded rows.

### Cross-module navigation

Business Context and Duplicate cards deep-link to
`/employers-management/view/:regno`, `/ip-management/view/:ssn`, and
`/legal/lg/cases/:id`. No screen duplication.

### Known limitations

- Documents count is derived from the referral payload only; the legacy
  `IntakeDetail` document upload has not yet been migrated to the new
  workspace and does not contribute to the readiness weight beyond the
  payload-present fallback.
- Business context relies on `er_master.regno` / `ip_master.ssn` matches;
  intakes with non-standard `primary_entity_id` values fall back to the
  identifier only, with no metrics.
- Statutory-limitation alert is a placeholder — surfaced when the
  intake's payload contains a `limitation_date` field but no active
  batch job monitors this yet.
- Supervisor SLA breach uses a hard-coded 48h default; per-priority SLA
  policies are out of scope for this EPIC and will be revisited with the
  Legal SLA policy module.
