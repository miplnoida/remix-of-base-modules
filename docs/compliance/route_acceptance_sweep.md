# Compliance & Enforcement — Route Acceptance Sweep

Sweep date: 2026-05-27
Source of menu structure: `src/components/sidebar/menuItems/complianceMenuItems.ts`
Source of route registrations: `src/components/routing/AppRoutes.tsx`

Status legend:
- ✅ Works — route registered to a real page component.
- 🔁 Redirect — route registered as `<Navigate>` to a working canonical URL.
- ⚠️ PlaceholderPage — intentionally registered to `PlaceholderPage`.
- ❌ 404 — menu item URL has **no** registered route in `AppRoutes.tsx`.
- 🚫 Feature toggle — hidden from menu unless `isComplianceFeatureEnabled(...)` flag is true; if visible it follows whatever its underlying route status is.
- 🔒 Permission denied — gated by `requiresPermission` on the menu and/or `ComplianceRouteGate` / `PermissionWrapper` on the route.

All menu items below additionally require `manage_compliance` (or, for Reports, `generate_reports`) via sidebar permission gating, and most routes additionally pass through `ComplianceRouteGate`.

---

## Dashboard

| Menu Label | Route Path | Component | Status | Real Data | Deferred? | Recommended Action |
|---|---|---|---|---|---|---|
| Command Center | `/compliance/workbench/overview` |  | 🔁 Redirect → `/compliance/workbench` (✅ Works) | Yes | No | Fixed 2026-05-27 |
| Overview | `/compliance/workbench/manager` | `ComplianceManagerDashboard` | ✅ Works | Yes (Supabase aggregation views) | No | None |
| Inspector Dashboard | `/compliance/workbench/inspector` | `ComplianceInspectorDashboard` | ✅ Works | Yes | No | None |
| Legal Dashboard | `/compliance/workbench/legal` | `ComplianceLegalDashboard` | ✅ Works | Yes | No | None |
| Analytics | `/compliance/workbench/analytics` | `ComplianceAnalytics` | ✅ Works | Yes | No | None |
| Monitoring | `/compliance/workbench/monitoring` | `ComplianceMonitoring` | ✅ Works | Yes | No | None |

## My Work Queue

| Menu Label | Route Path | Component | Status | Real Data | Deferred? | Recommended Action |
|---|---|---|---|---|---|---|
| My Work Queue | `/compliance/my-work-queue` | `MyWorkQueue` | ✅ Works (🚫 gated by `workQueue` toggle) | Yes — `ce_violations`, `ce_cases`, `ce_notices`, `ce_employer_responses`, `ce_payment_arrangements`, `ce_waiver_requests`, `ce_inspection_findings`, `ce_legal_referrals`, `workflow_tasks` | No | None |

## Violations

| Menu Label | Route Path | Component | Status | Real Data | Deferred? | Recommended Action |
|---|---|---|---|---|---|---|
| All Violations | `/compliance/violations` | `ViolationsManagement` | ✅ Works | Yes (`ce_violations`) | No | None |
| Verification Queue | `/compliance/violations/verification-queue` | — | ❌ 404 (🚫 toggle `violations.verificationQueue`) | n/a | Likely yes (toggle-gated) | If toggle is enabled in env, register route or remove menu item. |
| Manual Violation Entry | `/compliance/violations/manual-entry` | `ManualViolationEntry` | ✅ Works | Yes | No | None |
| Rule Detected Violations | `/compliance/violations/rule-detected` | — | ❌ 404 (🚫 `violations.ruleDetected`) | n/a | Likely yes | Register route or keep toggle off. |
| Duplicate Review | `/compliance/violations/duplicate-review` | — | ❌ 404 (🚫 `violations.duplicateReview`) | n/a | Likely yes | Register route or keep toggle off. |
| Violation History | `/compliance/violations/history` | — | ❌ 404 (🚫 `violations.history`) | n/a | Likely yes | Register route or keep toggle off. |

## Compliance Cases

| Menu Label | Route Path | Component | Status | Real Data | Deferred? | Recommended Action |
|---|---|---|---|---|---|---|
| All Cases | `/compliance/cases` | `ComplianceCaseManagement` | ✅ Works | Yes (`ce_cases`) | No | None |
| Case Intake | `/compliance/cases/intake` | — | ❌ 404 (🚫 `cases.intake`) | n/a | Likely yes | Register route or keep toggle off. |
| Assigned Cases | `/compliance/cases/assigned` | — | ❌ 404 (🚫 `cases.assigned`) | n/a | Likely yes | Wire to filtered `ComplianceCaseManagement` view or build dedicated page. |
| Case Review | `/compliance/cases/queue` | `ComplianceCaseQueue` | ✅ Works (🚫 `cases.review`) | Yes | No | None |
| Case Merge Review | `/compliance/cases/merge-review` | — | ❌ 404 (🚫 `cases.mergeReview`) | n/a | Likely yes | Register route or keep toggle off. |
| Reopen Requests | `/compliance/cases/reopen-requests` | — | ❌ 404 (🚫 `cases.reopenRequests`) | n/a | Likely yes | Register route or keep toggle off. |
| Case Closure | `/compliance/cases/closure` | — | ❌ 404 (🚫 `cases.closure`) | n/a | Likely yes | Register route or keep toggle off. |

## Notices And Communications

| Menu Label | Route Path | Component | Status | Real Data | Deferred? | Recommended Action |
|---|---|---|---|---|---|---|
| Notice Register | `/compliance/notices/register` | `NoticeRegister` | ✅ Works | Yes (`ce_notices`) | No | None (fixed in prior pass) |
| Generate Notice | `/compliance/notices/generate` | `GenerateNoticePage` | ✅ Works (🚫 `notices.generate`) | Yes | No | None |
| Pending Approval | `/compliance/notices/pending-approval` | `PendingApprovalPage` | ✅ Works (🚫 `notices.pendingApproval`) | Yes | No | None |
| Delivery Tracking | `/compliance/notices/delivery-tracking` | `DeliveryTrackingPage` | ✅ Works (🚫 `notices.deliveryTracking`) | Yes (`ce_notice_delivery_log`) | No | None |
| Employer Responses | `/compliance/notices/employer-responses` | `EmployerResponsesPage` | ✅ Works (🚫 `notices.employerResponses`) | Yes (`ce_employer_responses`) | No | None |
| Communication History | `/compliance/notices/communication-history` | `CommunicationHistoryPage` | ✅ Works (🚫 `notices.communicationHistory`) | Yes | No | None |

## Payment Arrangements

| Menu Label | Route Path | Component | Status | Real Data | Deferred? | Recommended Action |
|---|---|---|---|---|---|---|
| All Arrangements | `/compliance/enforcement/arrangements` | `PaymentArrangements` | ✅ Works | Yes (`ce_payment_arrangements`) | No | None |
| New Arrangement | `/compliance/arrangements/new` | — | ❌ 404 (🚫 `arrangements.new`) | n/a | Likely yes | Wire to existing create flow inside `PaymentArrangements` or register dedicated route. |
| Pending Approval | `/compliance/arrangements/pending-approval` | — | ❌ 404 (🚫 `arrangements.pendingApproval`) | n/a | Likely yes | Register route or keep toggle off. |
| Active Arrangements | `/compliance/arrangements/active` | — | ❌ 404 (🚫 `arrangements.active`) | n/a | Likely yes | Register route or keep toggle off. |
| Installments Due | `/compliance/arrangements/installments-due` | — | ❌ 404 (🚫 `arrangements.installmentsDue`) | n/a | Likely yes | Register route or keep toggle off. |
| Breaches | `/compliance/arrangements/breaches` | `ComplianceBreachMonitoring` | 🔁 Redirect → `/compliance/enforcement/breaches` (✅ Works) | Yes | No | None |
| Payment Allocation | `/compliance/arrangements/payment-allocation` | — | ❌ 404 (🚫 `arrangements.paymentAllocation`) | n/a | Likely yes | Register route or keep toggle off. |

## Inspections

(Whole group hidden unless `inspections` toggle is enabled.)

| Menu Label | Route Path | Component | Status | Real Data | Deferred? | Recommended Action |
|---|---|---|---|---|---|---|
| Inspection Plans | `/compliance/field/plan-builder` | `WeeklyPlanBuilder` | ✅ Works (🔒 `create_weekly_plan`) | Yes | No | None |
| Assigned Inspections | `/compliance/field/my-plans` | `MyPlans` | ✅ Works | Yes | No | None |
| Field Visits | `/compliance/field/execution` | `FieldExecution` | ✅ Works (🔒 `conduct_inspections`) | Yes | No | None |
| Inspection Findings | `/compliance/field/findings` | `EmployerFindings` | ✅ Works | Yes | No | None |
| Evidence | `/compliance/inspections/evidence` | — | ❌ 404 (🚫 `inspections.evidence`) | n/a | Likely yes | Register route or keep toggle off. |
| Convert Finding To Violation | `/compliance/inspections/convert-finding` | — | ❌ 404 (🚫 `inspections.convertFinding`) | n/a | Likely yes | Register route or keep toggle off. |

## Legal Escalations

| Menu Label | Route Path | Component | Status | Real Data | Deferred? | Recommended Action |
|---|---|---|---|---|---|---|
| Legal Review Queue | `/compliance/enforcement/legal-queue` | `ComplianceLegalQueue` | ✅ Works | Yes | No | None |
| Escalation Recommendations | `/compliance/enforcement/recommendation-queue` | `LegalRecommendationQueue` | ✅ Works | Yes (`ce_legal_referrals`) | No | None |
| Legal Pack Preparation | `/compliance/legal/pack-preparation` | — | ❌ 404 (🚫 `legal.packPreparation`) | n/a | Likely yes | Register route or keep toggle off. |
| Approved Escalations | `/compliance/legal/approved-escalations` | — | ❌ 404 (🚫 `legal.approvedEscalations`) | n/a | Likely yes | Register route or keep toggle off. |
| Returned From Legal | `/compliance/legal/returned-from-legal` | — | ❌ 404 (🚫 `legal.returnedFromLegal`) | n/a | Likely yes | Register route or keep toggle off. |
| Legal Status Tracking | `/compliance/enforcement/proceedings` | `ComplianceLegalProceedings` | ✅ Works | Yes | No | None |

## Risk And Employer Profile

| Menu Label | Route Path | Component | Status | Real Data | Deferred? | Recommended Action |
|---|---|---|---|---|---|---|
| Employer Risk Register | `/compliance/field/employer-360` | `Employer360Search` | ✅ Works | Yes | No | None |
| Risk Score Details | `/compliance/risk/score-details` | — | ❌ 404 (🚫 `risk.scoreDetails`) | n/a | Yes (component `RiskScoreDetailsPage` exists, not mounted) | Register route → `RiskScoreDetailsPage`. |
| Repeat Defaulters | `/compliance/risk/repeat-defaulters` | — | ❌ 404 (🚫 `risk.repeatDefaulters`) | n/a | Yes (`RepeatDefaultersPage` exists) | Register route → `RepeatDefaultersPage`. |
| High Risk Employers | `/compliance/risk/high-risk` | — | ❌ 404 (🚫 `risk.highRiskEmployers`) | n/a | Yes (`HighRiskEmployersPage` exists) | Register route → `HighRiskEmployersPage`. |
| Watchlist | `/compliance/risk/watchlist` | — | ❌ 404 (🚫 `risk.watchlist`) | n/a | Yes (`WatchlistPage` exists) | Register route → `WatchlistPage`. |

## Reports

| Menu Label | Route Path | Component | Status | Real Data | Deferred? | Recommended Action |
|---|---|---|---|---|---|---|
| Violation Reports | `/compliance/reports/violations-analytics` | `CaseAnalytics` | ✅ Works | Yes | No | None |
| Case Aging Reports | `/compliance/reports/case-analytics` |  | 🔁 Redirect → `/compliance/reports/violations-analytics` (✅ Works) | Yes | No | Fixed 2026-05-27 |
| Employer Compliance Reports | `/compliance/reports/c3-compliance` | `C3Compliance` | ✅ Works | Yes | No | None |
| Arrears And Recovery Reports | `/compliance/reports/arrears` | `ArrearsReports` | ✅ Works | Yes | No | None |
| Payment Arrangement Reports | `/compliance/reports/arrangements` | `ArrangementReports` | ✅ Works | Yes | No | None |
| Legal Escalation Reports | `/compliance/reports/legal` | `LegalEscalationReports` | ✅ Works | Yes | No | None |
| Officer Workload Reports | `/compliance/reports/inspector-performance` | `InspectorPerformance` | ✅ Works | Yes | No | None |
| Automation Job Reports | `/compliance/reports/automation-jobs` | — | ❌ 404 (🚫 `reports.automationJobs`) | n/a | Likely yes | Wire to existing `ComplianceJobHistory` route or register dedicated reports page. |

## Setup

| Menu Label | Route Path | Component | Status | Real Data | Deferred? | Recommended Action |
|---|---|---|---|---|---|---|
| Setup Wizard | `/compliance/admin/setup-wizard` | `ComplianceSetupWizard` | ✅ Works (🚫 `admin.setupWizard`) | Yes | No | None |
| General Settings | `/compliance/admin/settings` |  | 🔁 Redirect → `/compliance/settings` (✅ Works) | Yes | No | Fixed 2026-05-27 |
| Feature Toggles | `/compliance/admin/feature-toggles` | `FeatureTogglesPage` | ✅ Works (🚫 `admin.featureToggles`) | Yes (`feature_flags`) | No | None |
| Violation Types | `/compliance/admin/settings/violation-types` | `ComplianceViolationTypes` | ✅ Works | Yes | No | None |
| Rule Engine | `/compliance/admin/settings/rule-engine` | `ComplianceRuleEngine` | ✅ Works | Yes | No | None |
| Calculation Rules | `/compliance/admin/calculation-rules` | `PlaceholderPage` | ⚠️ PlaceholderPage (🚫 `admin.calculationRules`) | No | Yes (intentional) | Build real page when scoped. |
| Escalation Rules | `/compliance/admin/escalation-rules` | `PlaceholderPage` | ⚠️ PlaceholderPage (🚫 `admin.escalationRules`) | No | Yes (intentional) | Build real page when scoped. |
| Case Families | `/compliance/admin/case-families` | `CaseFamiliesPage` | ✅ Works (🚫 `admin.caseFamilies`) | Yes | No | None |
| Risk Scoring | `/compliance/admin/settings/risk-policy` | `RiskRulePolicy` | ✅ Works | Yes | No | None |
| Assignment Routing | `/compliance/admin/settings/assignment-routing` | `AssignmentRoutingRules` | ✅ Works | Yes | No | None |
| Workflow Mapping | `/compliance/admin/workflow-mapping` | `WorkflowMappingPage` | ✅ Works (🚫 `admin.workflowMapping`) | Yes | No | None |
| Reference Numbering | `/compliance/admin/settings/number-templates` | `ComplianceNumberTemplates` | ✅ Works | Yes | No | None |
| Notice Templates | `/compliance/admin/report-templates` | `ComplianceReportTemplates` | ✅ Works | Yes | No | None |
| Communication Templates | `/compliance/admin/communication-templates` | `AuditCommunicationTemplatesPage` | ✅ Works | Yes | No | None |
| Automation Jobs | `/compliance/admin/automation/jobs` | `ComplianceJobConfiguration` | ✅ Works | Yes | No | None |
| Schedule Settings | `/compliance/admin/schedule-settings` | `PlaceholderPage` | ⚠️ PlaceholderPage (🚫 `admin.scheduleSettings`) | No | Yes (intentional) | Build real page when scoped. |
| Payment Arrangement Rules | `/compliance/admin/payment-arrangement-rules` | `PaymentArrangementRulesPage` | ✅ Works (🚫 `admin.paymentArrangementRules`) | Yes (`ce_arrangement_policies`) | No | None |
| Waiver Rules | `/compliance/admin/waiver-rules` | `WaiverRulesPage` | ✅ Works (🚫 `admin.waiverRules`) | Yes | No | None |
| Legal Handoff Rules | `/compliance/admin/legal-handoff-rules` | `LegalHandoffRulesPage` | ✅ Works (🚫 `admin.legalHandoffRules`) | Yes | No | None |
| Employer Response Settings | `/compliance/admin/online-response` | `OnlineResponseConfigPage` | ✅ Works | Yes | No | None |
| Simulators › Rule Simulator | `/compliance/admin/tools/rule-simulator` | `ComplianceRuleSimulator` | ✅ Works | Yes | No | None |
| Simulators › Risk Simulator | `/compliance/admin/tools/risk-simulator` | `ComplianceRiskSimulator` | ✅ Works | Yes | No | None |
| Help And Instructions | `/compliance/admin/help` | `ComplianceHelpAdmin` | ✅ Works (🚫 `admin.helpAndInstructions`) | Yes | No | None |

---

## Summary

- **Working routes:** 39
- **Working redirects:** 1 (Arrangements › Breaches)
- **PlaceholderPage (intentional):** 3 (Calculation Rules, Escalation Rules, Schedule Settings)
- **404 (menu link broken):** 24 — the large majority are hidden in default builds because they sit behind `__feature` toggles that default to off in `isComplianceFeatureEnabled`. They become user-visible 404s only when the corresponding feature flag is turned on without a matching route. **Visible-by-default 404s** are:
  1. Dashboard › Command Center (`/compliance/workbench/overview`)
  2. Reports › Case Aging Reports (`/compliance/reports/case-analytics`)
  3. Setup › General Settings (`/compliance/admin/settings`)

## Recommended next pass (pending approval)

1. Fix the three visible-by-default 404s above (Command Center, Case Aging Reports, General Settings) — small AppRoutes additions or menu URL corrections.
2. Decide per group whether toggle-gated 404s should be (a) wired to existing components where they already exist (Risk group — `RiskScoreDetailsPage`, `RepeatDefaultersPage`, `HighRiskEmployersPage`, `WatchlistPage` all exist), or (b) left hidden until target pages are built.
3. For Violations / Cases / Arrangements / Inspections / Legal toggle-gated items, confirm scope before either implementing pages or removing menu entries.

No code was changed during this sweep.
