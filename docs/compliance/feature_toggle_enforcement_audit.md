# Compliance & Enforcement — Feature Toggle Enforcement Audit

Date: 2026-06-01
Scope: Audit only. **No functional code is changed by this document.**
Goal: Establish a single source of truth for which Compliance & Enforcement
feature toggles are actually enforced today, which are persistence-only,
and a safe phased plan to close the gap.

---

## 0. Executive summary

There are **two parallel and disconnected toggle mechanisms** in the
Compliance module today. This is the root cause of the manual-test
finding that "toggle persists but UI/route/action still works".

| # | Mechanism | Storage | Keys | Used by Admin → Feature Toggles page? | Consumed by menu/routes/pages? |
|---|---|---|---|---|---|
| A | DB-backed `feature_flags` table (read/written by `useReleaseManagement.ts` → `useCheckFeatureFlag`, `useUpdateFeatureFlag`) | Postgres `feature_flags` | `compliance.core.*`, `compliance.employer.*`, `compliance.payment.*`, `compliance.inspection.*`, `compliance.legal.*`, `compliance.risk.*`, `compliance.reports.*`, `compliance.integration.*` (see `FeatureTogglesPage.tsx` CATALOG) | **Yes** — this is what the Feature Toggles UI writes to | **No call sites in compliance code.** `rg useCheckFeatureFlag` returns the hook itself only; `rg "compliance\.(core|employer|payment|inspection|legal|risk|reports|integration)"` outside `FeatureTogglesPage.tsx` and `types.ts` matches **zero** runtime call sites. |
| B | Static client helper `isComplianceFeatureEnabled` in `src/lib/compliance/featureToggles.ts` | In-memory `DEFAULT_TOGGLES` map + `VITE_COMPLIANCE_DISABLED_FEATURES` env CSV | `workQueue`, `violations.*`, `cases.*`, `notices.*`, `arrangements.*`, `inspections`, `inspections.*`, `legal.*`, `risk.*`, `reports.automationJobs`, `admin.*` (different namespace from A) | **No** — the Feature Toggles UI does not read or write this map | Yes — 39 call sites across menu (`complianceMenuItems.ts`), Routes, several pages and 2 action components |

Net effect:
- The Feature Toggles admin page toggles rows in `feature_flags`, but
  nothing in the running Compliance UI reads `feature_flags.compliance.*`.
- The runtime gating that *does* exist uses a separate static map whose
  default is `true` for every key and which can only be flipped via an
  env var at build time. Operators cannot change it from the UI.
- Therefore every toggle in the Admin → Feature Toggles page is, at
  best, **persistence-only**. The four examples reported in QA
  (Verification Queue, Payment Arrangement, Rule Simulator, Automation
  Jobs) match this exactly.

The remediation is *not* a new toggle system. It is to bridge
mechanism A → mechanism B (or replace B's static defaults with a
cached read of A) and then audit each call site. Details below.

---

## 1. Toggle catalog (Admin → Feature Toggles page)

Source: `src/pages/compliance/admin/FeatureTogglesPage.tsx` (`CATALOG`).
Storage: `public.feature_flags` (boolean `is_enabled`, key `flag_key`).
Default ON/OFF: rows are seeded from migrations; UI shows current
`is_enabled` per row. All 34 keys are visible in the Feature Toggles
page filtered by the `compliance.` prefix.

| # | Feature key (DB) | Display name | Group | Source table/service | Visible in Feature Toggles page |
|---|---|---|---|---|---|
| 1 | compliance.core.verification_queue | Verification Queue | Core Case Flow | `feature_flags` | Yes |
| 2 | compliance.core.case_merge | Case Merge | Core Case Flow | `feature_flags` | Yes |
| 3 | compliance.core.case_reopen | Case Reopen | Core Case Flow | `feature_flags` | Yes |
| 4 | compliance.core.notice_approval | Notice Approval | Core Case Flow | `feature_flags` | Yes |
| 5 | compliance.core.case_closure_approval | Case Closure Approval | Core Case Flow | `feature_flags` | Yes |
| 6 | compliance.employer.online_response | Employer Online Response | Employer Interaction | `feature_flags` | Yes |
| 7 | compliance.employer.self_service | Employer Self Service Compliance | Employer Interaction | `feature_flags` | Yes |
| 8 | compliance.employer.evidence_upload | Evidence Upload | Employer Interaction | `feature_flags` | Yes |
| 9 | compliance.employer.dispute_submission | Dispute Submission | Employer Interaction | `feature_flags` | Yes |
| 10 | compliance.employer.arrangement_request | Arrangement Request | Employer Interaction | `feature_flags` | Yes |
| 11 | compliance.payment.arrangement | Payment Arrangement | Payment And Recovery | `feature_flags` | Yes |
| 12 | compliance.payment.allocation | Payment Allocation | Payment And Recovery | `feature_flags` | Yes |
| 13 | compliance.payment.installment_breach_detection | Installment Breach Detection | Payment And Recovery | `feature_flags` | Yes |
| 14 | compliance.payment.waiver_requests | Waiver Requests | Payment And Recovery | `feature_flags` | Yes |
| 15 | compliance.inspection.field | Field Inspection | Inspection | `feature_flags` | Yes |
| 16 | compliance.inspection.planning | Inspection Planning | Inspection | `feature_flags` | Yes |
| 17 | compliance.inspection.evidence | Inspection Evidence | Inspection | `feature_flags` | Yes |
| 18 | compliance.inspection.convert_finding | Convert Finding To Violation | Inspection | `feature_flags` | Yes |
| 19 | compliance.legal.handoff | Legal Handoff | Legal | `feature_flags` | Yes |
| 20 | compliance.legal.pack_generation | Legal Pack Generation | Legal | `feature_flags` | Yes |
| 21 | compliance.legal.court_monitoring | Court Or Judgment Monitoring | Legal | `feature_flags` | Yes |
| 22 | compliance.legal.returned_handling | Returned From Legal Handling | Legal | `feature_flags` | Yes |
| 23 | compliance.risk.scoring | Risk Scoring | Risk And Automation | `feature_flags` | Yes |
| 24 | compliance.risk.automation_jobs | Automation Jobs | Risk And Automation | `feature_flags` | Yes |
| 25 | compliance.risk.automated_escalation | Automated Escalation | Risk And Automation | `feature_flags` | Yes |
| 26 | compliance.risk.rule_simulator | Rule Simulator | Risk And Automation | `feature_flags` | Yes |
| 27 | compliance.risk.risk_simulator | Risk Simulator | Risk And Automation | `feature_flags` | Yes |
| 28 | compliance.reports.standard | Standard Reports | Reporting And Analytics | `feature_flags` | Yes |
| 29 | compliance.reports.dashboards | Management Dashboards | Reporting And Analytics | `feature_flags` | Yes |
| 30 | compliance.reports.advanced_analytics | Advanced Analytics And Forecasting | Reporting And Analytics | `feature_flags` | Yes |
| 31 | compliance.integration.employer_portal | Employer Portal | External Integrations | `feature_flags` | Yes |
| 32 | compliance.integration.legal_module | Legal Module | External Integrations | `feature_flags` | Yes |
| 33 | compliance.integration.finance_cashier | Finance Or Cashier Integration | External Integrations | `feature_flags` | Yes |
| 34 | compliance.integration.external_agency | External Agency Referral | External Integrations | `feature_flags` | Yes |

For the same 34 toggles there is also the parallel static map
(`DEFAULT_TOGGLES` in `src/lib/compliance/featureToggles.ts`) using a
different namespace (e.g. `cases.mergeReview`, `arrangements.new`,
`risk.watchlist`). This audit treats the DB key as the canonical key.

---

## 2. Expected affected areas (per toggle)

Compiled from `complianceMenuItems.ts`, `Routes.tsx`,
`ComplianceRouteGate.tsx`, page components under `src/pages/compliance/`
and `src/components/compliance/`. "Mapped helper key" is the key in
the static `isComplianceFeatureEnabled` map (B) that *should* be driven
by the DB flag (A) once bridged.

| Feature key | Menu items | Routes | Page components | Action buttons | Workflow / mutation | Automation jobs | Reports | Setup screens | Mapped helper key (B) |
|---|---|---|---|---|---|---|---|---|---|
| compliance.core.verification_queue | Violations → Verification Queue | `/compliance/violations/verification-queue` | `MyWorkQueue.tsx` (tab), `VerificationQueuePage` (placeholder) | "Send to verification" on violation row | Insert into `ce_violations` with `status='pending_verification'`; transition to case | n/a | Verification throughput report | Admin → Violation Types | `violations.verificationQueue` |
| compliance.core.case_merge | Cases → Merge Review | `/compliance/cases/merge-review` | `CaseRequestsQueue.tsx` (merge filter), `CaseRequestActions.tsx` (merge button) | Merge button on case row | Mutation: merge two `ce_cases` | n/a | — | Admin → Case Families | `cases.mergeReview` |
| compliance.core.case_reopen | Cases → Reopen Requests | `/compliance/cases/reopen-requests` | `CaseRequestsQueue.tsx`, `CaseRequestActions.tsx` (reopen button) | Reopen button on closed cases | Mutation: status → `reopened` | n/a | — | Admin → Workflow Mapping | `cases.reopenRequests` |
| compliance.core.notice_approval | Notices → Pending Approval | `/compliance/notices/pending-approval` | `PendingApprovalPage.tsx`, `GenerateNoticeDialog.tsx` (requires-approval checkbox) | Approve / Reject buttons | Mutation: `ce_notices.approval_status` | Approval reminders | Notice approval SLA | Admin → Communication Templates | `notices.pendingApproval` |
| compliance.core.case_closure_approval | Cases → Closure | `/compliance/cases/closure` | `CaseRequestActions.tsx` (close button) | Close-case button | Mutation: `ce_cases.status='closed'` | n/a | Case closure report | Admin → Workflow Mapping | `cases.closure` |
| compliance.employer.online_response | (Employer portal — outside admin sidebar) | `/employer-portal/notices/respond` | `EmployerResponsesPage.tsx` (admin side) | "Reply online" CTA on employer portal | Insert into `ce_employer_responses` | n/a | Online response volume | — | `notices.employerResponses` |
| compliance.employer.self_service | Employer portal landing | n/a | — | All self-service CTAs in employer portal | n/a | n/a | — | — | (no helper key today) |
| compliance.employer.evidence_upload | (Employer portal) | `/employer-portal/evidence` | — | Evidence upload widget | Storage write + `ce_evidence` row | n/a | — | — | (no helper key today) |
| compliance.employer.dispute_submission | (Employer portal) | `/employer-portal/disputes` | — | "Submit dispute" CTA | Insert into `ce_disputes` | n/a | — | — | (no helper key today) |
| compliance.employer.arrangement_request | (Employer portal) | `/employer-portal/arrangements/request` | — | "Request arrangement" CTA | Insert into `ce_arrangement_requests` | n/a | — | — | (no helper key today) |
| compliance.payment.arrangement | Payment Arrangements (whole group) | `/compliance/enforcement/arrangements`, `/arrangements/new`, `/arrangements/pending-approval`, `/arrangements/active`, `/arrangements/installments-due`, `/arrangements/breaches`, `/arrangements/payment-allocation` | `ArrangementListPage`, `NewArrangementPage`, `InstallmentsDuePage`, `PaymentAllocationPage`, etc. | "New Arrangement", "Approve", "Allocate" buttons | Insert/update `ce_payment_arrangements`, `ce_installments` | Breach detection job | Arrangement aging report | Admin → Payment Arrangement Rules | `arrangements.new`, `arrangements.active`, `arrangements.pendingApproval`, `arrangements.installmentsDue`, `arrangements.paymentAllocation` |
| compliance.payment.allocation | Arrangements → Payment Allocation | `/arrangements/payment-allocation` | `PaymentAllocationPage.tsx` | "Allocate" button | Mutation: `ce_payment_allocations` | Auto-allocation job | — | Admin → Payment Arrangement Rules | `arrangements.paymentAllocation` |
| compliance.payment.installment_breach_detection | Arrangements → Breaches | `/arrangements/breaches` | Breach list page | "Mark breach" button | Status update on installment + case escalation | Daily breach scan in `ce_automation_jobs` | Breach incidence report | Admin → Calculation Rules | (no helper key) |
| compliance.payment.waiver_requests | Arrangements → Waivers | `/compliance/enforcement/waivers` | `WaiverRequestsQueue.tsx`, `WaiverRulesPage.tsx` | Approve/Reject waiver buttons | Mutation: `ce_waiver_requests` | n/a | Waivers granted report | Admin → Waiver Rules | `admin.waiverRules` (used) |
| compliance.inspection.field | Inspections (whole top-level group) | `/compliance/field/*`, `/compliance/inspections/*` | All Field/Inspector pages | "Add visit", "Record violation" buttons | Insert into `ce_inspections`, `ce_inspection_findings` | Weekly plan generator | Field activity report | Admin → Assignment Routing | `inspections` |
| compliance.inspection.planning | Inspections → Weekly Plan / Plans | `/compliance/field/plan-builder`, `/my-plans` | `InspectorWeeklyPlan.tsx`, plan builder | "Build plan", "Assign" buttons | Insert into `ce_weekly_plans` | Plan rollover job | Plan coverage report | Admin → Assignment Routing | (no helper key) |
| compliance.inspection.evidence | Inspections → Evidence | `/compliance/inspections/evidence` | `InspectionEvidencePage.tsx`, `EvidenceDialog.tsx` | "Attach evidence" button | Storage write + `ce_inspection_evidence` | n/a | — | — | `inspections.evidence` |
| compliance.inspection.convert_finding | Inspections → Convert Finding | `/compliance/inspections/convert-finding` | `ConvertFindingToViolationPage.tsx` | "Convert to violation" button | Insert into `ce_violations` from finding | n/a | — | — | `inspections.convertFinding` |
| compliance.legal.handoff | Legal → Pack Preparation / Approved Escalations | `/compliance/enforcement/recommendation-queue`, `/legal/pack-preparation`, `/legal/approved-escalations` | Recommendation queue, pack prep | "Hand off to legal" button | Insert into `legal_cases`, update `ce_cases.escalated` | Escalation watcher | Escalation funnel report | Admin → Legal Handoff Rules | `legal.packPreparation`, `legal.approvedEscalations`, `admin.legalHandoffRules` (used) |
| compliance.legal.pack_generation | Legal → Pack Preparation | `/legal/pack-preparation` | Pack generator UI | "Generate pack" button | Document generation + storage write | n/a | — | Admin → Communication Templates | (no helper key) |
| compliance.legal.court_monitoring | Legal → Status Tracking | `/compliance/enforcement/proceedings` | Proceedings page | "Update court status" | Mutation: `legal_proceedings` | Periodic court sync | Court status report | — | (no helper key) |
| compliance.legal.returned_handling | Legal → Returned From Legal | `/compliance/enforcement/legal-returned` | Returned-from-legal queue (placeholder) | "Re-route" button | Mutation: case back to compliance state | n/a | — | — | `legal.returnedFromLegal` |
| compliance.risk.scoring | Risk → Score Details / Risk Register | `/compliance/risk/score-details`, `/compliance/field/employer-360` | `RiskScoreDetailsPage.tsx` | "Recompute score" | Insert into `ce_risk_scores` | Nightly risk score job | Risk distribution report | Admin → Risk Scoring | `risk.scoreDetails` |
| compliance.risk.automation_jobs | Reports → Automation Jobs; Admin → Automation Jobs | `/compliance/admin/automation/*`, `/compliance/reports/automation-jobs` | `ComplianceJobsPage`, job-history | "Run now", "Dry run" buttons | `run-compliance-job` edge function via `useRunComplianceJob` | Every entry in `ce_automation_jobs` | Automation runs report | Admin → Automation Jobs | `reports.automationJobs` |
| compliance.risk.automated_escalation | Admin → Escalation Rules | `/compliance/admin/escalation-rules` | Escalation rules page | "Activate rule" | Mutation: `ce_escalation_rules.is_enabled` | Escalation evaluator job | Escalations triggered report | Admin → Escalation Rules | `admin.escalationRules` |
| compliance.risk.rule_simulator | Admin → Rule Engine → Simulator | `/compliance/admin/rule-engine/simulator` | Simulator UI | "Simulate" button | Read-only RPC; no writes | n/a | — | Admin → Rule Engine | (no helper key) |
| compliance.risk.risk_simulator | Admin → Risk Scoring → Simulator | `/compliance/admin/risk-scoring/simulator` | Risk simulator UI | "Simulate" button | Read-only RPC | n/a | — | Admin → Risk Scoring | (no helper key) |
| compliance.reports.standard | Reports → all 7 standard reports | `/compliance/reports/*` | All report pages | "Export", "Run" buttons | Read-only RPCs | Scheduled report jobs | Yes (every report) | — | (no helper key) |
| compliance.reports.dashboards | Dashboard → Overview / Manager / Inspector / Legal | `/compliance/workbench/*` | `ComplianceCommandCenter.tsx` and siblings | — | Read-only | n/a | Dashboard tiles | — | (no helper key) |
| compliance.reports.advanced_analytics | Dashboard → Analytics / Monitoring | `/compliance/workbench/analytics`, `/monitoring` | Analytics pages | "Forecast" controls | Read-only | n/a | Forecast reports | — | (no helper key) |
| compliance.integration.employer_portal | Cross-app deep links + employer portal availability | `/employer-portal/*` | Employer portal shell | "Open portal" CTAs | All employer-side writes | n/a | Portal usage report | — | (no helper key) |
| compliance.integration.legal_module | Legal Handoff group; satellite routing | `/compliance/enforcement/legal-*` | Pack preparation, recommendation queue | "Send to Legal" | Cross-DB write via satellite | Legal sync job | Legal handoff report | Admin → Legal Handoff Rules | (no helper key) |
| compliance.integration.finance_cashier | Payment Allocation; Cashier postings | `/arrangements/payment-allocation`, finance hooks | Allocation page | "Post to GL" | Finance edge function call | GL posting job | Finance posting report | Admin → Ledger Administration | (no helper key) |
| compliance.integration.external_agency | Cases → External Referral (placeholder) | `/compliance/cases/external-referral` | Placeholder | "Refer to agency" | Insert into `ce_external_referrals` | n/a | Referrals report | — | (no helper key) |

---

## 3. Current enforcement per toggle

Legend: **M** = menu, **R** = route guard, **P** = page component,
**A** = action button, **W** = mutation/write, **J** = job execution,
**Rep** = reports. ✓ = enforced today, ✗ = not enforced,
**(env-only)** = enforced only via the static `DEFAULT_TOGGLES` map and
`VITE_COMPLIANCE_DISABLED_FEATURES`, **not** by the DB toggle the
admin UI writes.

| Feature key | M | R | P | A | W | J | Rep | Notes |
|---|---|---|---|---|---|---|---|---|
| compliance.core.verification_queue | ✗ | ✗ | (env-only via `violations.verificationQueue` in `MyWorkQueue.tsx`) | ✗ | ✗ | n/a | ✗ | DB flag is read by no one. The menu link and route stay live regardless. |
| compliance.core.case_merge | ✗ | ✗ | ✗ | (env-only via `cases.mergeReview` in `CaseRequestActions.tsx`) | ✗ | n/a | ✗ | Action button hides via static map; merge mutation itself is not blocked. |
| compliance.core.case_reopen | ✗ | ✗ | ✗ | (env-only via `cases.reopenRequests`) | ✗ | n/a | ✗ | Same as merge. |
| compliance.core.notice_approval | ✗ | ✗ | (env-only via `notices.pendingApproval` in `GenerateNoticeDialog.tsx`) | (env-only) | ✗ | ✗ | ✗ | Approval requirement is wired to the static map, not the DB. |
| compliance.core.case_closure_approval | ✗ | ✗ | ✗ | (env-only via `cases.closure` in `CaseRequestActions.tsx`) | ✗ | n/a | ✗ | |
| compliance.employer.online_response | ✗ | ✗ | ✗ | ✗ | ✗ | n/a | ✗ | No enforcement anywhere. |
| compliance.employer.self_service | ✗ | ✗ | ✗ | ✗ | ✗ | n/a | ✗ | |
| compliance.employer.evidence_upload | ✗ | ✗ | ✗ | ✗ | ✗ | n/a | ✗ | |
| compliance.employer.dispute_submission | ✗ | ✗ | ✗ | ✗ | ✗ | n/a | ✗ | |
| compliance.employer.arrangement_request | ✗ | ✗ | ✗ | ✗ | ✗ | n/a | ✗ | |
| compliance.payment.arrangement | ✗ | ✗ | (env-only on individual sub-pages via `arrangements.new`, `arrangements.active`, etc.) | (env-only) | ✗ | ✗ | ✗ | The umbrella DB flag has no consumer; sub-page flags exist only in the static map. |
| compliance.payment.allocation | ✗ | ✗ | (env-only `arrangements.paymentAllocation`) | (env-only) | ✗ | ✗ | ✗ | |
| compliance.payment.installment_breach_detection | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | Breach scan job in `ce_automation_jobs` runs irrespective of the DB flag. |
| compliance.payment.waiver_requests | ✗ | ✗ | ✓ (via static `admin.waiverRules` in `WaiverRequestsQueue.tsx` and `WaiverRulesPage.tsx`) | ✓ | ✗ | n/a | ✗ | Page-level gate exists but uses static key, not the DB key. |
| compliance.inspection.field | ✗ | ✗ | (env-only `inspections` in `complianceMenuItems.ts` and `MyWorkQueue.tsx`) | ✗ | ✗ | ✗ | ✗ | Menu can be hidden via env, not via DB toggle. |
| compliance.inspection.planning | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | |
| compliance.inspection.evidence | ✗ | ✗ | (env-only `inspections.evidence`) | (env-only) | ✗ | n/a | ✗ | |
| compliance.inspection.convert_finding | ✗ | ✗ | (env-only `inspections.convertFinding`) | (env-only) | ✗ | n/a | ✗ | |
| compliance.legal.handoff | ✗ | ✗ | (env-only `legal.packPreparation`, `legal.approvedEscalations`) | (env-only) | ✗ | ✗ | ✗ | |
| compliance.legal.pack_generation | ✗ | ✗ | ✗ | ✗ | ✗ | n/a | ✗ | |
| compliance.legal.court_monitoring | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | |
| compliance.legal.returned_handling | ✗ | ✗ | (env-only `legal.returnedFromLegal`) | ✗ | ✗ | n/a | ✗ | |
| compliance.risk.scoring | ✗ | ✗ | (env-only `risk.scoreDetails`, `risk.repeatDefaulters`, `risk.highRiskEmployers`, `risk.watchlist`) | ✗ | ✗ | ✗ | ✗ | |
| compliance.risk.automation_jobs | ✗ | ✗ | (env-only `reports.automationJobs` for the report; not for `/compliance/admin/automation/*`) | ✗ | ✗ | ✗ (`run-compliance-job` edge function does not consult any flag) | ✗ | The "Run now" / "Dry run" buttons execute regardless of DB toggle. |
| compliance.risk.automated_escalation | ✗ | ✗ | (env-only `admin.escalationRules`) | ✗ | ✗ | ✗ | ✗ | |
| compliance.risk.rule_simulator | ✗ | ✗ | ✗ | ✗ | n/a (read-only) | n/a | ✗ | Simulator page is reachable and runnable irrespective of DB toggle. |
| compliance.risk.risk_simulator | ✗ | ✗ | ✗ | ✗ | n/a | n/a | ✗ | |
| compliance.reports.standard | ✗ | ✗ | ✗ | ✗ | n/a | n/a | ✗ | |
| compliance.reports.dashboards | ✗ | ✗ | (env-only `arrangements`, `legal`, `automation` casts in `ComplianceCommandCenter.tsx` toggle dashboard cards) | ✗ | n/a | n/a | ✗ | The cards hide via static map keys that aren't even in the canonical list. |
| compliance.reports.advanced_analytics | ✗ | ✗ | ✗ | ✗ | n/a | n/a | ✗ | |
| compliance.integration.employer_portal | ✗ | ✗ | ✗ | ✗ | ✗ | n/a | ✗ | |
| compliance.integration.legal_module | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | |
| compliance.integration.finance_cashier | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | |
| compliance.integration.external_agency | ✗ | ✗ | ✗ | ✗ | ✗ | n/a | ✗ | |

---

## 4. Toggle category summary

| Category | Count | Toggles |
|---|---:|---|
| Fully enforced (DB toggle drives M+R+P+A+W consistently) | **0** | — |
| Partially enforced (some surfaces gated, but only via static helper, not the DB toggle) | **15** | `core.verification_queue`, `core.case_merge`, `core.case_reopen`, `core.notice_approval`, `core.case_closure_approval`, `payment.arrangement`, `payment.allocation`, `payment.waiver_requests`, `inspection.field`, `inspection.evidence`, `inspection.convert_finding`, `legal.handoff`, `legal.returned_handling`, `risk.scoring`, `risk.automated_escalation` (+ `reports.dashboards` partly) |
| Persistence only (DB row flips, no runtime consumer at all) | **18** | `employer.online_response`, `employer.self_service`, `employer.evidence_upload`, `employer.dispute_submission`, `employer.arrangement_request`, `payment.installment_breach_detection`, `inspection.planning`, `legal.pack_generation`, `legal.court_monitoring`, `risk.automation_jobs`, `risk.rule_simulator`, `risk.risk_simulator`, `reports.standard`, `reports.advanced_analytics`, `integration.employer_portal`, `integration.legal_module`, `integration.finance_cashier`, `integration.external_agency` |
| Informational only | **1** | `reports.dashboards` (the static keys only toggle individual dashboard cards, not the dashboards themselves) |
| Unknown | **0** | — |

The "Partially enforced" entries are technically also persistence-only
with respect to the DB toggle: the static helper happens to gate a
surface, but it is not driven by what an admin flips in the UI.

---

## 5. Critical detachable toggles (enforcement target list)

These are the toggles where lack of enforcement creates a real
operational or compliance risk. Source: the request brief, validated
against section 3 above.

| Group | Toggle | Reason it must be enforced |
|---|---|---|
| Core Case Flow | `verification_queue`, `case_merge`, `case_reopen`, `notice_approval`, `case_closure_approval` | Govern when an officer may bypass review/approval steps. |
| Employer Interaction | `employer.online_response`, `employer.evidence_upload`, `employer.dispute_submission`, `employer.arrangement_request` | Govern what an external employer is allowed to do. |
| Payment And Recovery | `payment.arrangement`, `payment.allocation`, `payment.installment_breach_detection`, `payment.waiver_requests` | Govern money movement and breach handling. |
| Inspection | `inspection.field`, `inspection.planning`, `inspection.evidence`, `inspection.convert_finding` | Govern field operations that create violations. |
| Legal | `legal.handoff`, `legal.pack_generation`, `legal.court_monitoring`, `legal.returned_handling` | Govern downstream legal exposure. |
| Risk And Automation | `risk.scoring`, `risk.automation_jobs`, `risk.automated_escalation`, `risk.rule_simulator`, `risk.risk_simulator` | Govern background writes and auto-escalations. |
| Reporting And Analytics | `reports.standard`, `reports.dashboards`, `reports.advanced_analytics` | Govern visibility of derived/sensitive data. |
| External Integrations | `integration.employer_portal`, `integration.legal_module`, `integration.finance_cashier`, `integration.external_agency` | Govern cross-system side-effects. |

---

## 6. Proposed safe enforcement behaviour (per critical toggle)

In every case the recommendation reuses one of the existing
mechanisms: the menu helper, the `ComplianceRouteGate`, the page-level
`isComplianceFeatureEnabled` gate, or the action button's existing
disabled-state pattern. **No new toggle infrastructure is proposed.**

| Toggle | Menu | Direct URL | Action button | Mutation/write | Job execution | Reports |
|---|---|---|---|---|---|---|
| core.verification_queue | Hide menu item | Show "Feature Disabled" page | Hide action | Block insert with `pending_verification` status | n/a | Keep report visible, empty-state |
| core.case_merge | (item already hidden when no merge tab is configured) | Show "Feature Disabled" page | Hide button | Block merge RPC | n/a | n/a |
| core.case_reopen | Hide menu item | Feature Disabled page | Hide button | Block status→reopened mutation | n/a | n/a |
| core.notice_approval | Hide "Pending Approval" menu | Feature Disabled page | Hide Approve/Reject | Force `approval_status='auto_approved'` and skip queue | Disable approval reminder job | Hide approval SLA report |
| core.case_closure_approval | (no dedicated menu) | n/a | Replace Approve flow with direct close | Skip approval record | n/a | n/a |
| employer.online_response | (employer portal nav) | Show portal "Currently unavailable" page | Hide CTA | Block insert into `ce_employer_responses` | n/a | n/a |
| employer.evidence_upload | (portal) | Portal "Currently unavailable" | Hide upload widget | Block storage write + row insert | n/a | n/a |
| employer.dispute_submission | (portal) | Portal "Currently unavailable" | Hide CTA | Block insert | n/a | n/a |
| employer.arrangement_request | (portal) | Portal "Currently unavailable" | Hide CTA | Block insert | n/a | n/a |
| payment.arrangement | Hide entire Payment Arrangements menu group | Feature Disabled page | Hide all action buttons | Block all arrangement writes | Disable arrangement jobs | Keep historical reports view-only |
| payment.allocation | Hide allocation submenu | Feature Disabled page | Hide Allocate | Block allocation insert | Disable auto-allocation job | n/a |
| payment.installment_breach_detection | n/a | n/a | n/a | n/a | Disable breach scan job | Keep breach report view-only |
| payment.waiver_requests | Hide waivers submenu | Feature Disabled page (already partly enforced) | Hide approve/reject | Block waiver mutation | n/a | Keep historical waivers view-only |
| inspection.field | Hide Inspections top-level | Feature Disabled page | Hide all action buttons | Block all `ce_inspections*` writes | Disable plan rollover job | Keep historical inspections view-only |
| inspection.planning | Hide planning submenu | Feature Disabled page | Hide "Build plan", "Assign" | Block `ce_weekly_plans` writes | Disable plan rollover job | n/a |
| inspection.evidence | Hide submenu | Feature Disabled page | Hide attach button | Block storage + row insert | n/a | n/a |
| inspection.convert_finding | Hide submenu | Feature Disabled page | Hide Convert | Block finding→violation insert | n/a | n/a |
| legal.handoff | Hide Legal Handoff group | Feature Disabled page | Hide handoff button | Block satellite write | Disable escalation watcher | Keep historical handoffs view-only |
| legal.pack_generation | n/a | n/a | Hide Generate | Block document generation | n/a | n/a |
| legal.court_monitoring | Hide Status Tracking | Feature Disabled page | Hide Update | Block proceedings update | Disable court sync job | Keep historical view-only |
| legal.returned_handling | Hide Returned-From-Legal | Feature Disabled page | Hide Re-route | Block re-route mutation | n/a | n/a |
| risk.scoring | Hide risk submenu | Feature Disabled page | Hide Recompute | Block score insert | Disable nightly risk job | Keep risk distribution report view-only |
| risk.automation_jobs | Hide Automation Jobs in Reports and Admin | Feature Disabled page | Disable Run/Dry-run with tooltip | Edge function should reject when flag off | Disable all rows in `ce_automation_jobs` | n/a |
| risk.automated_escalation | n/a | n/a | Disable Activate | Force `is_enabled=false` server-side | Disable escalation evaluator job | n/a |
| risk.rule_simulator | Hide submenu | Feature Disabled page | Disable Simulate | n/a (read-only) | n/a | n/a |
| risk.risk_simulator | Hide submenu | Feature Disabled page | Disable Simulate | n/a | n/a | n/a |
| reports.standard | Hide Reports section | Feature Disabled page | n/a | n/a | Disable scheduled report jobs | Reports page replaced by feature-disabled state |
| reports.dashboards | Hide Dashboard submenu | Feature Disabled page | n/a | n/a | n/a | Dashboard tiles hidden |
| reports.advanced_analytics | Hide Analytics submenu | Feature Disabled page | Disable Forecast controls | n/a | n/a | n/a |
| integration.employer_portal | n/a (no admin menu) | Portal returns "Currently unavailable" | Hide deep links | Block all portal writes | n/a | Keep portal usage report view-only |
| integration.legal_module | Hide Legal Handoff in menu | Feature Disabled page | Hide Send to Legal | Block satellite write | Disable legal sync job | Keep historical view-only |
| integration.finance_cashier | n/a | n/a | Disable Post-to-GL | Block finance edge function | Disable GL posting job | Keep historical posting report view-only |
| integration.external_agency | Hide External Referral | Feature Disabled page | Hide Refer | Block referral insert | n/a | Keep historical referrals view-only |

A reusable `<FeatureDisabled feature="..."/>` page component should be
introduced under `src/components/compliance/` and reused by every
direct-URL gate. The action-button pattern should reuse the existing
shadcn `Button` `disabled` + `Tooltip` pattern already used in
`CaseRequestActions.tsx`.

---

## 7. Risk of enforcing each critical toggle

Risk is the probability that enforcing the toggle breaks an existing
flow that is currently relied upon.

| Risk | Toggles |
|---|---|
| **Low** | `core.case_merge`, `core.case_reopen`, `core.notice_approval`, `core.case_closure_approval`, `employer.online_response`, `employer.evidence_upload`, `employer.dispute_submission`, `employer.arrangement_request`, `payment.waiver_requests`, `inspection.evidence`, `inspection.convert_finding`, `legal.pack_generation`, `legal.returned_handling`, `risk.rule_simulator`, `risk.risk_simulator`, `reports.advanced_analytics`, `integration.external_agency` |
| **Medium** | `core.verification_queue`, `payment.allocation`, `payment.installment_breach_detection`, `inspection.planning`, `legal.handoff`, `legal.court_monitoring`, `risk.scoring`, `risk.automated_escalation`, `risk.automation_jobs`, `reports.standard`, `reports.dashboards`, `integration.legal_module`, `integration.finance_cashier` |
| **High** | `payment.arrangement` (large menu group, many entry points, historical data must remain visible), `inspection.field` (whole module + cross-app inspectors), `integration.employer_portal` (external-facing surface) |

---

## 8. Recommended implementation phases

The bridging change (DB flag → runtime helper) is a prerequisite to
every phase. It is a single, small change: extend
`isComplianceFeatureEnabled` to consult a cached `feature_flags` query
keyed by `compliance.*`, falling back to the static map only when the
flag row is missing. No call sites change; behaviour does not change
until rows are flipped in the admin UI.

### Phase 0 — Bridge (prereq, no behaviour change)
- Add a `useComplianceFeatureFlags()` hook that selects all rows where
  `flag_key LIKE 'compliance.%'` and caches via React Query.
- Extend `isComplianceFeatureEnabled` (or add `useIsComplianceFeatureEnabled`)
  to map static keys → DB keys, read the cache, and fall back to the
  current `DEFAULT_TOGGLES` value.
- Seed the static-helper key ↔ DB key map (see "Mapped helper key"
  column in section 2).
- For each new DB key without a helper key, add the helper key with a
  default of `true` so existing behaviour is preserved.

### Phase 1 — Route/page/action enforcement for three representative toggles
Targets: **`core.verification_queue`**, **`payment.arrangement`**,
**`risk.automation_jobs`** (Rule Simulator is grouped here as a
secondary check of the same Risk family).

For each:
1. Hide the menu item(s) via the existing helper in
   `complianceMenuItems.ts`.
2. Add `ComplianceRouteGate` to render the `<FeatureDisabled/>` page
   when the user lands on the route directly.
3. Hide or disable the relevant action buttons.
4. For `risk.automation_jobs`, also reject `run-compliance-job` edge
   function calls server-side when the flag is off.

### Phase 2 — Remaining critical operational toggles
- Core Case Flow: `case_merge`, `case_reopen`, `notice_approval`,
  `case_closure_approval`.
- Employer Interaction: all 4 (depends on employer portal coordination).
- Payment And Recovery: `payment.allocation`,
  `payment.installment_breach_detection`, `payment.waiver_requests`.
- Inspection: `inspection.field`, `inspection.planning`,
  `inspection.evidence`, `inspection.convert_finding`.
- Legal: `legal.handoff`, `legal.pack_generation`,
  `legal.court_monitoring`, `legal.returned_handling`.
- Risk And Automation: `risk.scoring`, `risk.automated_escalation`,
  `risk.risk_simulator`.

### Phase 3 — Reporting and integration toggles
- `reports.standard`, `reports.dashboards`,
  `reports.advanced_analytics`.
- `integration.employer_portal`, `integration.legal_module`,
  `integration.finance_cashier`, `integration.external_agency`.

---

## 9. Verification checklist

Run for every toggle, in order, after enforcement is delivered for
that toggle:

1. Sign in as a Compliance Admin.
2. Open Admin → Feature Toggles and **turn the toggle OFF**.
3. Hard-refresh the browser (clear React Query cache).
4. **Menu behaviour** — confirm the corresponding menu item(s) no
   longer appear in the Compliance sidebar.
5. **Direct URL behaviour** — paste the route into the browser and
   confirm the `<FeatureDisabled/>` page renders (not a 404, not the
   real page, not the placeholder page).
6. **Action button behaviour** — for any list/detail page that
   normally hosts the action, confirm the button is either hidden or
   visibly disabled with the standard tooltip ("This feature is
   currently disabled").
7. **Mutation/write blocked** — attempt the underlying mutation via
   the UI; if a developer console / tester runs the supabase call
   directly, confirm the call returns a structured "feature_disabled"
   error from the RPC or edge function.
8. **Job execution blocked** (where applicable) — confirm the row in
   `ce_automation_jobs` cannot be triggered (Run/Dry-run buttons
   disabled, edge function returns `{ ok: false, code: 'feature_disabled' }`).
9. **Turn the toggle ON** and hard-refresh.
10. Repeat steps 4–8 in reverse: menu reappears, route renders, action
    buttons enabled, mutations succeed, jobs runnable.
11. Record pass/fail per step in
    `docs/compliance/test_user_verification_checklist.md` under a new
    "Feature Toggle Enforcement" section.

---

## 10. Constraints honoured by this audit

- Reuses the existing `feature_flags` table and
  `useReleaseManagement.ts` hooks; no new toggle system.
- Reuses `ComplianceRouteGate`, `complianceMenuItems.ts`,
  `isComplianceFeatureEnabled`, the `PermissionWrapper`/permission
  RPC chain.
- No role names are hardcoded anywhere in the proposal.
- No unrelated modules are touched.
- **No production behaviour is changed by this document.** Only
  `docs/compliance/feature_toggle_enforcement_audit.md` is created.

---

## 11. Phase 1 Implementation (delivered)

Phase 1 bridges the existing runtime helper to the canonical DB-backed
`public.feature_flags` table for three toggles:

| DB flag_key | Helper key(s) | Scope enforced |
| --- | --- | --- |
| `compliance.core.verification_queue` | `violations.verificationQueue` | Route, action buttons (confirm/reject/mark-duplicate), service mutations |
| `compliance.payment.arrangement` | `arrangements.new`, `arrangements.active`, `arrangements.pendingApproval`, `arrangements.installmentsDue`, `arrangements.paymentAllocation` | Routes (new / active / pending-approval / installments-due / payment-allocation), approve/reject buttons, allocation actions, service writes (create, approve, reject, record installment payment, allocate) |
| `compliance.risk.automation_jobs` | `reports.automationJobs` | Routes (`/admin/automation/jobs`, `/reports/automation-jobs`), run / dry-run / force-run mutations, edge function `run-compliance-job` (server-side block) |

### Files changed

- `src/lib/compliance/featureFlagCache.ts` (new) — module-level cache + subscribe
- `src/hooks/compliance/useComplianceFeatureFlags.ts` (new) — react-query loader that populates the cache (staleTime 30 s, no refetchOnWindowFocus)
- `src/lib/compliance/featureToggles.ts` — added `COMPLIANCE_HELPER_TO_DB_FLAG` map, DB lookup inside `isComplianceFeatureEnabled`, and the new direct accessor `isComplianceDbFlagEnabled(dbKey)`
- `src/pages/compliance/FeatureDisabled.tsx` (new) — disabled-feature page (distinct from `PlaceholderPage`)
- `src/pages/compliance/ComplianceRouteGate.tsx` — mounts the bootstrap hook for every `/compliance/*` route and renders `<FeatureDisabled />` for Phase 1 routes when the flag is OFF
- `src/services/arrangementWorkflowService.ts` — `assertArrangementEnabled()` guards on `submitForApproval`, `approveArrangement`, `rejectArrangement`, `recordInstallmentPayment`, `allocatePayment`
- `src/services/centralPaymentArrangementService.ts` — `assertArrangementEnabled()` guards on `createArrangement` and `createArrangementFromCase`
- `src/services/verificationQueueService.ts` — `assertVerificationQueueEnabled()` guards on `confirmViolation`, `rejectViolation`, `markAsDuplicate`
- `src/hooks/compliance/useComplianceJobs.ts` — client guard on `useRunComplianceJob`
- `supabase/functions/run-compliance-job/index.ts` — server-side check of `feature_flags.compliance.risk.automation_jobs` before any job dispatch

### Fallback behaviour (chosen)

- Cache UNSET (first paint / transient DB error) → `isComplianceFeatureEnabled` falls back to the existing `DEFAULT_TOGGLES` value. The Compliance sidebar/routes therefore do **not** disappear on a transient `feature_flags` query failure.
- Cache LOADED and flag PRESENT → the DB value wins.
- Cache LOADED and flag MISSING → falls back to `DEFAULT_TOGGLES`.
- Server-side edge function check fails closed (job execution blocked) only when the DB row is present and `is_enabled = false`; missing rows do not block (consistent with current admin-row behaviour).

### Verification results

| Toggle | Menu | Direct URL | Action buttons | Write/mutation |
| --- | --- | --- | --- | --- |
| `compliance.core.verification_queue` OFF | helper returns false (post-load) so any future menu binding hides Verification Queue | `/compliance/violations/verification-queue` → `<FeatureDisabled />` | confirm / reject / mark-duplicate throw clear error | `confirmViolation` / `rejectViolation` / `markAsDuplicate` blocked |
| `compliance.payment.arrangement` OFF | helper returns false for all five arrangement sub-items | every Phase 1 arrangement route → `<FeatureDisabled />` | new/approve/reject/allocate actions throw clear error | `createArrangement*`, `submitForApproval`, `approveArrangement`, `rejectArrangement`, `recordInstallmentPayment`, `allocatePayment` blocked |
| `compliance.risk.automation_jobs` OFF | helper returns false for `reports.automationJobs` | `/compliance/admin/automation/jobs` and `/compliance/reports/automation-jobs` → `<FeatureDisabled />` | run / dry-run buttons surface a clear error toast | `useRunComplianceJob` blocked client-side; `run-compliance-job` edge function blocks server-side |

Turning each flag back ON via Setup → Feature Toggles restores normal behaviour after the cache refreshes (≤ 30 s staleTime or via React Query manual invalidation on save — the Feature Toggles page already invalidates `['compliance-feature-flags']`).

### Remaining unmapped toggles (Phase 2 / 3)

All other `compliance.*` flags shown in §3 of this document are **still unmapped** and continue to follow their existing helper behaviour. They are not enforced yet:

- Phase 2 (next): `compliance.core.notice_approval`, `compliance.core.case_closure_approval`, `compliance.core.case_merge`, `compliance.core.case_reopen`, `compliance.payment.allocation` (currently grouped under arrangement; future split), `compliance.payment.installment_breach_detection`, `compliance.payment.waiver_requests`, `compliance.inspection.*`.
- Phase 3 (later): `compliance.legal.*`, `compliance.risk.scoring` / `risk.rule_simulator` / `risk.risk_simulator`, `compliance.reports.*`, `compliance.integration.*`, `compliance.employer.*`.

Add them to `COMPLIANCE_HELPER_TO_DB_FLAG` and (where needed) to `FEATURE_FLAG_ROUTE_MAP` in `ComplianceRouteGate.tsx` plus the corresponding service-level assert.
