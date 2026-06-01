# Phase 2 Feature Toggle — Runtime Verification Guide

**Diagnostics URL:** `/compliance/admin/feature-toggle-diagnostics`
**Setup URL:** `/compliance/admin/feature-toggles`

Login as a Compliance Setup/Admin user
(e.g. `mipl.student+compliance.admin@gmail.com`).

---

## Phase 2 mapping (DB flag → helper keys → routes)

| DB flag                                       | Helper key(s)                                | Gated route(s)                                                                                                            |
| --------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `compliance.core.case_merge`                  | `cases.mergeReview`                          | `/compliance/cases/merge-review`                                                                                          |
| `compliance.core.case_reopen`                 | `cases.reopenRequests`                       | `/compliance/cases/reopen-requests`                                                                                       |
| `compliance.core.notice_approval`             | `notices.pendingApproval`                    | `/compliance/notices/pending-approval`                                                                                    |
| `compliance.core.case_closure_approval`       | `cases.closure`                              | `/compliance/cases/closure`                                                                                               |
| `compliance.payment.waiver_requests`          | `enforcement.waivers`                        | `/compliance/enforcement/waivers` (+ legacy `/compliance/waivers`)                                                        |
| `compliance.inspection.field`                 | `inspections`                                | `/compliance/field/execution`, `/findings`, `/employer-statements`, `/employer-statement/:id`, `/visit/:id`               |
| `compliance.inspection.planning`              | `inspections.planning`                       | `/compliance/field/plan-builder*`, `/my-plans`, `/approval-inbox`, `/pending-review*`, `/revisions-pending`, `/revision-review/:id` |
| `compliance.inspection.evidence`              | `inspections.evidence`                       | `/compliance/inspections/evidence`                                                                                        |
| `compliance.inspection.convert_finding`       | `inspections.convertFinding`                 | `/compliance/inspections/convert-finding`                                                                                 |
| `compliance.legal.handoff`                    | `legal.handoff`, `legal.approvedEscalations` | `/compliance/enforcement/legal-referral`, `/recommendation-queue`, `/compliance/legal/approved-escalations`               |
| `compliance.legal.pack_generation`            | `legal.packPreparation`                      | `/compliance/legal/pack-preparation`                                                                                      |
| `compliance.legal.court_monitoring`           | `legal.courtMonitoring`                      | `/compliance/enforcement/proceedings`                                                                                     |
| `compliance.legal.returned_handling`          | `legal.returnedFromLegal`                    | `/compliance/legal/returned-from-legal`                                                                                   |
| `compliance.risk.scoring`                     | `risk.scoring`, `risk.scoreDetails`, `risk.repeatDefaulters`, `risk.highRiskEmployers`, `risk.watchlist` | `/compliance/risk/*` (score-details, repeat-defaulters, high-risk, watchlist) |
| `compliance.risk.rule_simulator`              | `risk.ruleSimulator`                         | `/compliance/admin/tools/rule-simulator` (+ legacy `/compliance/tools/rule-simulator`)                                    |
| `compliance.risk.risk_simulator`              | `risk.riskSimulator`                         | `/compliance/admin/tools/risk-simulator` (+ legacy `/compliance/tools/risk-simulator`)                                    |

Menu visibility for the same routes is handled by the prefix rules in
`src/lib/compliance/menuFeatureFilter.ts` (extended in this phase).

---

## Files changed (Phase 2)

- `src/lib/compliance/featureToggles.ts` — new helper keys (`cases.mergeReview` etc. mapped, plus 7 new keys: `enforcement.waivers`, `inspections.planning`, `legal.handoff`, `legal.courtMonitoring`, `risk.scoring`, `risk.ruleSimulator`, `risk.riskSimulator`); extended `COMPLIANCE_HELPER_TO_DB_FLAG` and `DEFAULT_TOGGLES`.
- `src/lib/compliance/menuFeatureFilter.ts` — 26 new prefix rules covering the Phase 2 surface area.
- `src/components/routing/AppRoutes.tsx` — wrapped 28 Phase 2 routes with `<ComplianceFeatureGate>`.
- `src/pages/compliance/admin/FeatureToggleDiagnosticsPage.tsx` — added `PHASE2_DB_FLAGS`, `PHASE2_HELPER_KEYS`, and 16 new route tests.
- `docs/compliance/feature_toggle_enforcement_audit.md` — Phase 2 section.
- `docs/compliance/final_stabilization_report.md` — Phase 2 entry.

No mutations applied to `app_modules`. No new toggle system introduced.
Phase 1 plumbing (`featureFlagCache`, `useComplianceFeatureFlagsBootstrap`,
`subscribeComplianceDbFlags`) is reused unchanged.

---

## Manual UAT (per representative toggle)

For each toggle below: turn OFF in Setup → Feature Toggles → refresh →
confirm menu hidden + direct URL shows `FeatureDisabled` → turn ON →
confirm restored.

### Core Case Flow

| Toggle / DB key                                | Direct URL                                  | Menu link affected                                  |
| ---------------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| Case Merge / `compliance.core.case_merge`      | `/compliance/cases/merge-review`            | Cases → Case Merge Review                           |
| Case Reopen / `compliance.core.case_reopen`    | `/compliance/cases/reopen-requests`         | Cases → Reopen Requests                             |
| Notice Approval / `compliance.core.notice_approval` | `/compliance/notices/pending-approval` | Notices → Pending Approval                          |
| Case Closure Approval / `compliance.core.case_closure_approval` | `/compliance/cases/closure` | Cases → Case Closure Approval                       |

### Payment & Recovery

| Waiver Requests / `compliance.payment.waiver_requests` | `/compliance/enforcement/waivers` | Enforcement → Waivers |

### Inspection

| Field Inspection / `compliance.inspection.field`       | `/compliance/field/execution`           | Field → Execution / Findings / Employer Statements / Visit |
| Inspection Planning / `compliance.inspection.planning` | `/compliance/field/plan-builder`        | Field → Plan Builder / My Plans / Approval Inbox / Pending Review / Revisions Pending |
| Inspection Evidence / `compliance.inspection.evidence` | `/compliance/inspections/evidence`      | Inspections → Evidence |
| Convert Finding / `compliance.inspection.convert_finding` | `/compliance/inspections/convert-finding` | Inspections → Convert Finding |

### Legal

| Legal Handoff / `compliance.legal.handoff`             | `/compliance/enforcement/legal-referral` | Enforcement → Legal Referral / Recommendation Queue; Legal → Approved Escalations |
| Legal Pack Generation / `compliance.legal.pack_generation` | `/compliance/legal/pack-preparation` | Legal → Pack Preparation |
| Court Monitoring / `compliance.legal.court_monitoring` | `/compliance/enforcement/proceedings`    | Enforcement → Proceedings |
| Returned From Legal / `compliance.legal.returned_handling` | `/compliance/legal/returned-from-legal` | Legal → Returned From Legal |

### Risk & Automation

| Risk Scoring / `compliance.risk.scoring`               | `/compliance/risk/score-details`         | Risk → Score Details / Repeat Defaulters / High Risk / Watchlist |
| Rule Simulator / `compliance.risk.rule_simulator`      | `/compliance/admin/tools/rule-simulator` | Admin → Tools → Rule Simulator |
| Risk Simulator / `compliance.risk.risk_simulator`      | `/compliance/admin/tools/risk-simulator` | Admin → Tools → Risk Simulator |

---

## Expected behavior

- **Cache loaded + flag OFF:** menu link hidden; direct URL renders
  `<FeatureDisabled>` (not generic `PlaceholderPage`).
- **Cache loaded + flag ON:** menu link visible; page renders normally.
- **Cache NOT loaded:** fail-open — links/pages render as today (no UX
  disappearance from transient flag load failures).
- **Setup control plane** (`/compliance/admin/feature-toggles`,
  `/compliance/admin/feature-toggle-diagnostics`) is **never** gated and
  remains reachable for authorized Setup/Admin users.

---

## Action / mutation behaviour notes

For Phase 2 the primary enforcement surface is **route + menu**:

- All listed Phase 2 routes are wrapped in `ComplianceFeatureGate` and
  return `<FeatureDisabled>` when the flag is OFF. This automatically
  prevents the in-page action buttons (merge, reopen, approve notice,
  waiver approve/reject, evidence upload, convert finding, legal handoff
  submit, pack-preparation submit, simulator run, etc.) from being
  reachable from the UI.
- Phase 1 action-level guards (already in place) for
  `arrangementWorkflowService`, `centralPaymentArrangementService`,
  `verificationQueueService`, and the `run-compliance-job` edge function
  remain in effect.

Mutations that live on **shared pages** (e.g. a "Merge" button rendered
inside the case-detail view) are not yet gated at the click-handler
level — those are tracked as **Phase 2.5 remaining work** below. They
are still indirectly protected because the dedicated review/queue routes
that surface those actions to reviewers/approvers are now gated.

---

## Verification checklist (signed-off representative toggles)

For each of these, perform: OFF → refresh → menu hidden + URL shows
FeatureDisabled → ON → restored.

- [ ] Case Merge (`compliance.core.case_merge`)
- [ ] Notice Approval (`compliance.core.notice_approval`)
- [ ] Waiver Requests (`compliance.payment.waiver_requests`)
- [ ] Field Inspection (`compliance.inspection.field`)
- [ ] Legal Handoff (`compliance.legal.handoff`)
- [ ] Risk Scoring (`compliance.risk.scoring`)
- [ ] Rule Simulator (`compliance.risk.rule_simulator`)

---

## Phase 2.5 remaining work (not done this phase)

- Click-handler guards on shared in-page action buttons:
  - "Merge cases" button on case detail
  - "Reopen case" button on case detail / case management
  - "Approve / Reject notice" buttons (where rendered outside the
    pending-approval queue)
  - "Approve / Reject waiver" buttons on case detail
  - "Upload evidence" button on visit workspace
  - "Convert finding to violation" button on findings detail
  - "Send to Legal" / "Generate legal pack" buttons on case detail
  - "Recompute risk score" button on employer-risk profile
- Service-level write guards for the same mutations (analogous to the
  Phase 1 guards in `arrangementWorkflowService` etc.).
- Phase 3 toggles (admin settings, calculation rules, communication
  templates, advanced reports) remain persistence-only.
