# Compliance & Enforcement — Implementation Inventory

**Generated:** 2026-05-25  
**Scope:** Current state of the Compliance & Enforcement module in this repo.  
**Status legend:** ✅ Existing · 🟡 Partial · ❌ Missing · ❓ Unknown

> Companion documents:
> - `docs/compliance/COMPLIANCE_INVENTORY.md` — module-wide architectural inventory
> - `docs/compliance/access_control_inventory.md` — permission & role model
>
> This document is the **feature-area implementation inventory** used by the
> prompt pack sequence. It does NOT make functional changes; it only records
> what exists today and what is missing.

---

## 1. Existing Route Map

All Compliance routes are mounted under `/compliance/*` from
`src/pages/compliance/Routes.tsx`. Legacy paths are redirected to canonical
paths in the same file.

### 1.1 Workbench (`/compliance/workbench/*`) — ✅ Existing
| Route | Component | Status |
|---|---|---|
| `/workbench/manager` | `dashboards/ManagerDashboard` | ✅ |
| `/workbench/inspector` | `dashboards/InspectorDashboard` | ✅ |
| `/workbench/legal` | `dashboards/LegalDashboard` | ✅ |
| `/workbench/analytics` | `dashboards/ComplianceAnalytics` | ✅ |
| `/workbench/monitoring` | `dashboards/ComplianceMonitoring` | ✅ |
| `/workbench/queues` | `operations/AssignmentQueues` | ✅ |
| `/workbench/review-queue` | `operations/ReviewQueue` | 🟡 (mock-heavy) |
| `/workbench/reassignment` | `operations/Reassignment` | 🟡 |

### 1.2 Violations (`/compliance/violations/*`) — ✅ Existing
| Route | Component | Status |
|---|---|---|
| `/violations` | `violations/ViolationsManagement` | ✅ |
| `/violations/manual-entry` | `violations/ManualViolationEntry` | ✅ |
| `/violations/:id` | `violations/ViolationDetails` | ✅ |
| Verification queue | — | ❌ Missing |
| Duplicate-detection screen | — | ❌ Missing |

### 1.3 Cases (`/compliance/cases/*`) — 🟡 Partial
| Route | Component | Status |
|---|---|---|
| `/cases` | `cases/CaseManagement` | ✅ |
| `/cases/queue` | `cases/CaseQueue` | ✅ |
| `/cases/penalties` | `cases/PenaltyManagement` | 🟡 (mock data) |
| Case grouping / families | — | ❌ Missing |

### 1.4 Field — Inspections & Audit Planning (`/compliance/field/*`) — ✅ Existing
Plan builder, my-plans, pending-review, execution, operations, inspections,
findings, employer statements, visit workspace, employer-360, weekly reports
(submit, all, review), audit details/management, plan-execution-dashboard,
sampling dashboard + candidates + my-upcoming, audit report viewer.

### 1.5 Enforcement (`/compliance/enforcement/*`) — ✅ Existing
| Route | Component | Status |
|---|---|---|
| `/enforcement/notices` | `legal/NoticesManagement` | ✅ |
| `/enforcement/arrangements` | `arrangements/PaymentArrangements` | ✅ |
| `/enforcement/breaches` | `arrangements/BreachMonitoring` | 🟡 |
| `/enforcement/waivers` | `legal/WaiversOverrides` | ✅ |
| `/enforcement/recommendation-queue` | `legal/LegalRecommendationQueue` | ✅ |
| `/enforcement/legal-queue` | `legal/LegalQueue` | ✅ |
| `/enforcement/proceedings` | `legal/LegalProceedingsPage` | ✅ |
| `/enforcement/referral-wizard` | `legal/LegalReferralWizard` | ✅ |
| Legal pack generation page | — | ❌ Missing (component-only) |

### 1.6 Reports (`/compliance/reports/*`) — ✅ Existing
violations-analytics, inspector-performance, c3-compliance, arrears, audit,
arrangements, legal, trends. All bound to the same `manage_compliance` /
`generate_reports` guard.

### 1.7 Admin (`/compliance/admin/*`) — ✅ Existing (large surface)
Settings (rule-engine, violation-types, assignment-routing, number-templates,
risk-policy, templates, sampling, ledger sync/admin/posting/operations/help),
communication templates (list + editor), report templates, document
foundation, online-response config, geography (zones, office/village
mapping), staff (officers, queue-members, supervisors, legacy linking),
automation (jobs, history, employer-jobs), tools (rule-simulator,
risk-simulator), risk-operations.

### 1.8 Broken / Placeholder / Unclear
- `EmployerFinancialStatement`, `EmployerComplianceManagement`,
  `EmployerHierarchy` — removed pending re-validation (see Routes header).
- Several review-queue/reassignment screens render against partially mocked
  data — marked 🟡 above.

---

## 2. Existing Menu Map vs Target Structure

Source: `src/components/sidebar/menuItems/complianceMenuItems.ts` (~600 lines,
single top-level section **"Compliance & Enforcement"**).

| Target Section | Current Menu Section | Status |
|---|---|---|
| Dashboard | `Workbench → Manager / Inspector / Legal / Analytics / Monitoring` | ✅ (multi-dashboard, role-aware) |
| My Work Queue | `Workbench → Review Queue / Reassign`, `Field → My Plans / My Upcoming` | 🟡 (no single "My Work" landing) |
| Violations | `Violations` | ✅ |
| Compliance Cases | `Cases` | ✅ |
| Notices And Communications | `Enforcement → Notices`, `Admin → Communication Templates` | 🟡 (notices yes; unified comms hub no) |
| Payment Arrangements | `Enforcement → Arrangements / Breaches` | ✅ |
| Inspections | `Field → Inspections / Operations / Execution / Plans / Findings` | ✅ |
| Legal Escalations | `Enforcement → Legal Queue / Proceedings / Recommendation Queue / Referral Wizard / Waivers` | ✅ |
| Risk And Employer Profile | `Field → Employer-360`, `Admin → Risk Policy / Risk Simulator / Risk Operations` | 🟡 (split across Field + Admin) |
| Reports | `Reports` | ✅ |
| Administration | `Admin` (settings, geography, staff, automation, tools) | ✅ |

**Permission keys currently used in the menu** (from grep):
`manage_compliance`, `create_weekly_plan`, `approve_weekly_plan`,
`conduct_inspections`, `view_financial_data`, `generate_reports`.

❌ The menu does **not** yet use the capability constants in
`src/lib/compliance/capabilities.ts`. Every leaf is gated on the legacy
`manage_compliance` flag (Phase-1 fallback).

---

## 3. Component Inventory

Location: `src/components/compliance/`

### 3.1 Reusable / Shared — ✅
`EmployerComplianceSummaryCard`, `FinancialSummaryCard`,
`RiskScoreBadge`, `RiskHistoryTimeline`, `ArrangementHealthWidget`,
`OfficeSelect`, `EmployerLocationPicker`, `SuggestedActionsPanel`,
`PendingFollowUpActions`, `WorkboardCaseloadSummary`.

### 3.2 By Feature Area
- **Violations:** `BulkViolationActions`, `ViolationActionConfirmDialog`,
  `ViolationActionPlanTab`, `ViolationCorrespondenceTab`,
  `ViolationFollowUpsTab`, `ViolationMergeDialog`, `ViolationNotesTab`,
  `ViolationNoticesTab`, `ViolationResolutionDialog`, `ViolationSLAMetrics`,
  `ViolationSplitDialog`, `UnlinkedViolationsPanel`,
  `CreateViolationFromFindingDialog`, `ScoutingViolationForm`.
- **Cases / Penalties:** `PenaltyManagementForm`,
  `CasePaymentArrangementDialog`.
- **Arrangements:** `ArrangementDetailPanel`, `ArrangementDetailsCard`,
  `CreateArrangementDialog`.
- **Notices:** `BulkNoticeDialog`.
- **Weekly plan / field:** `AddPlanItemDialog`, `RescheduleVisitDialog`,
  `WeeklyReportSubmitDialog`, `WeeklyReportVisitDetail`,
  `WeeklyReportVisitRow`, `AuditManagementForm`.
- **Subdirectories:** `admin/`, `analytics/`, `audit-report/`, `automation/`,
  `communication/`, `detection/`, `employer-history/`, `inspection/`,
  `risk-policy/`, `simulator/`, `staff/`, `weekly-plan/`, `workbench/`,
  `workboard/`.

### 3.3 Duplicate / Overlap candidates — 🟡
- Two arrangement detail surfaces: `ArrangementDetailPanel` vs
  `ArrangementDetailsCard` — needs consolidation.
- Multiple "workboard"/"workbench" component folders (`workbench/`,
  `workboard/`, plus `WorkboardCaseloadSummary`) — likely overlap.
- Notices live in `legal/` route folder while notice templates live in
  `admin/communication-templates` — consider unified Notices & Comms area.

---

## 4. Supabase Table Inventory

A grep of `src/` produced **~570 unique `ce_*` identifiers** (tables, views,
RPCs, FK names). High-level grouping:

### 4.1 Violations & Cases — ✅
`ce_violations`, `ce_violation_types`, `ce_violation_actions`,
`ce_violation_notes`, `ce_violation_followups`, `ce_violation_evidence`,
`ce_cases`, `ce_case_*`, `ce_penalties`, `ce_calculation_rules`.

### 4.2 Audit / Field — ✅
`ce_audits`, `ce_audit_*` (communications, recipients, attachments,
deliveries, events, secure_tokens, schedule/approval policies, templates,
template_actions/sections, field_stage_template_map, prior_matter_links,
priority_weights, report_*, signatures, versions, disputes,
employer_responses, employer_uploaded_documents, finding_*_submissions,
checklist_responses, run_reminder_escalation, log).

### 4.3 Arrangements / Enforcement — ✅
`ce_arrangements`, `ce_arrangement_installments`,
`ce_arrangement_breaches`, `ce_arrangement_policies`,
`ce_arrangement_report_entries`, `ce_arrears`, `ce_arrears_report_entries`,
`ce_breach_monitoring`.

### 4.4 Notices / Communications — ✅
`ce_audit_communications`, `ce_audit_communication_templates`,
`ce_audit_comm_approval_policies`, `ce_audit_comm_trigger_rules`,
`ce_audit_communication_attachments/deliveries/events/recipients/secure_tokens`.

### 4.5 Legal — 🟡
References observed via `useLegalCases`, `useLegalHearings`,
`useLegalOrders`, `useLegalPaymentPlans`, `useLegalDocuments`,
`useLegalDebtTracking`. **❓** Whether these write to `ce_legal_*` tables or
the older `legal_*` tables needs explicit confirmation.

### 4.6 Risk — ✅
`ce_audit_priority_weights`, `ce_calculation_rules`, hooks
`useRiskConfig`, `useRiskRegister`, `useRiskRecalculation`,
`useRiskRealtimeSync`, `useEngagementRisk`, `useDepartmentRiskSync`,
`useFunctionRiskSync`, `useIARiskCategories`, `useRiskSimulatorData`.

### 4.7 Routing / Queues / Staff — ✅
`ce_assignment_queues`, `ce_assignment_routing_rules`, `ce_calendar`,
plus staff tables surfaced through `staff/` admin pages.

### 4.8 Automation — ✅
`ce_automation_jobs`, `ce_automation_job_runs`, `ce_automation_jobs_list`,
`ce_automation_runs`, RPCs `ce_batch_recompute_compliance`,
`ce_backfill_unassigned_violations`, `ce_calculate_employer_arrears`,
`ce_allocate_employer_payment`, `ce_breach_check_arrangements`.

### 4.9 Related non-`ce_` tables (consumed read-only) — ✅
`profiles`, `user_roles`, `roles`, `app_modules`, `module_actions`,
`role_permissions`, `user_permission_overrides`, `system_audit_trail`,
`workflow_definitions`, `workflow_instances`, `workflow_step_*`,
`employers`, `employer_*`, `c3_*` (consumed via
`ce_v_c3_compliance_summary` and ledger sync), `payment_*`,
`md_*` masters.

### 4.10 Missing / Broken references — ❓
- Some `ce_legal_*` tables referenced by hooks need verification.
- Verification-queue and duplicate-detection tables — **❌ not found**.
- Case-family / case-grouping tables — **❌ not found**.

---

## 5. Service & Hook Inventory

### 5.1 Services (`src/services/compliance/`)
| Service | Purpose | Status |
|---|---|---|
| `breachEvaluationService.ts` | Arrangement breach evaluation | ✅ |
| `complianceSummaryService.ts` | Employer compliance summary aggregator | ✅ |
| `escalationPrerequisiteService.ts` | Legal-escalation gate checks | ✅ |
| `paymentObserverService.ts` | Payment event observer | ✅ |
| `paymentReconciliationService.ts` | Reconcile C3/payments to arrangements | 🟡 (basic) |
| `planExceptionNotifier.ts` | Notify on plan exceptions | ✅ |

### 5.2 Hooks
- **Workbench/Role:** `useComplianceRole`, `useComplianceWorkbench`,
  `useHasCapability` (capability gate, Phase-1 legacy fallback).
- **Employer posture:** `useEmployerCompliancePosture`,
  `useEmployerComplianceSummary`.
- **Ledger:** `useComplianceLedger`.
- **Documents/templates:** `useComplianceDocumentTemplates`.
- **Risk:** `useRiskConfig`, `useRiskRegister`, `useRiskRecalculation`,
  `useRiskRealtimeSync`, `useRiskSimulatorData`, `useEngagementRisk`,
  `useDepartmentRiskSync`, `useFunctionRiskSync`, `useIARiskCategories`.
- **Legal:** `useLegalCases`, `useLegalHearings`, `useLegalOrders`,
  `useLegalPaymentPlans`, `useLegalDocuments`, `useLegalDebtTracking`.
- **Simulator:** `compliance/useSimulatorData.ts`.

### 5.3 Service coverage by feature
| Area | Status |
|---|---|
| Rule services (validate / version / import-export) | ❌ Missing |
| Case services (grouping, lifecycle beyond hooks) | 🟡 |
| Violation services (verification, duplicate detection) | ❌ |
| Notice services (issue, deliver, ack — DB layer exists, dedicated service ❌) | 🟡 |
| Payment-arrangement services | ✅ |
| Legal-escalation services | 🟡 (prerequisites only) |
| Workflow integration helpers | ✅ (uses generic `workflow_*` tables) |
| Automation services | ✅ (edge fns: `ce-violation-scan`, `ce-notice-gen`, `ce-risk-recalculation`) |

---

## 6. Mock Data Inventory

| Screen / Component | Mock Source | Should Use |
|---|---|---|
| `cases/PenaltyManagement` + `PenaltyManagementForm` | Inline mock arrays | `ce_penalties`, `ce_calculation_rules` |
| `operations/ReviewQueue` | Hardcoded list | `ce_review_queue` view + `ce_assignment_queues` |
| `operations/Reassignment` | Mock workload counts | `ce_assignment_queues` + `profiles` |
| `tools/RuleSimulator` partial inputs | Hardcoded scenarios | `ce_calculation_rules` + simulator RPC |
| `tools/RiskSimulator` partial inputs | Hardcoded weights | `ce_audit_priority_weights` |
| `arrangements/BreachMonitoring` | Some mock columns | `ce_arrangement_breaches` + `ce_arrangements` |
| `legal/LegalRecommendationQueue` (subset) | Mock columns | `ce_legal_*` (❓ confirm names) |
| `src/data/mockLegalCases.ts` | Mock file | Replace via `useLegalCases` |
| `src/data/mockInvoices.ts` | Mock file | Out-of-module — leave to Finance |

(All other Compliance screens are wired to live Supabase reads.)

---

## 7. Workflow Integration Inventory

The generic engine lives in `workflow_definitions / workflow_instances /
workflow_step_*` and is consumed via `useWorkflowActions`.

### 7.1 Already using workflow — ✅
- Weekly plan approval (`pending-review/:planId` + `WeeklyPlanReview`).
- Communication-template approval policies
  (`ce_audit_comm_approval_policies` + `ce_audit_communication_approvals`).
- Audit-report acknowledgment / signature flow
  (`ce_audit_report_acknowledgments`, `ce_audit_report_signatures`).
- Legal referral wizard (creates workflow instance on submit).

### 7.2 Should trigger workflow but currently do not — ❌
- **Violation verification / supervisor review** (no maker-checker).
- **Penalty issuance** (currently a direct save).
- **Arrangement approval** (auto-approved on create).
- **Arrangement breach → enforcement escalation** (manual today).
- **Notice issuance** (template approval exists; per-issuance approval ❌).
- **Waivers/overrides** (no second-approver gate).
- **Rule-engine publish** (no approval gate — see §9.1).
- **Legal pack generation / referral finalization** beyond wizard submit.

---

## 8. Permission Inventory

### 8.1 Currently used (legacy keys)
`manage_compliance`, `create_weekly_plan`, `approve_weekly_plan`,
`conduct_inspections`, `view_financial_data`, `generate_reports`.

### 8.2 Capability constants defined but **not seeded** as DB permissions
From `src/lib/compliance/capabilities.ts`:
`compliance.field.execute / plan / approve_plans / report / approve_reports
/ sampling`, `compliance.violations.manage`, `compliance.cases.manage`,
`compliance.enforcement.notices / arrangements / legal`,
`compliance.workbench.team / enterprise`,
`compliance.reports.operational / analytics`.

### 8.3 Missing permissions needed (recommended keys)
Following the existing `<module>_<action>` naming convention used by
`app_modules × module_actions × role_permissions`:

| Module (`app_modules.name`) | Required actions |
|---|---|
| `ce_violations` | `view`, `create`, `edit`, `verify`, `merge`, `split`, `resolve`, `export` |
| `ce_cases` | `view`, `create`, `edit`, `assign`, `close`, `escalate`, `export` |
| `ce_notices` | `view`, `create`, `issue`, `approve`, `void`, `export` |
| `ce_arrangements` | `view`, `create`, `approve`, `restructure`, `void`, `export` |
| `ce_legal` | `view`, `recommend`, `refer`, `record_outcome`, `waive`, `export` |
| `ce_inspections` | `view`, `plan`, `approve_plan`, `execute`, `submit_report`, `approve_report` |
| `ce_risk` | `view`, `simulate`, `recompute`, `edit_policy` |
| `ce_automation` | `view`, `configure`, `run_now`, `view_history` |
| `ce_rules` | `view`, `create`, `edit`, `simulate`, `publish`, `approve_publish`, `import`, `export` |
| `ce_admin_settings` | `view`, `edit` (covers number templates, ledger sync, etc.) |
| `ce_reports` | `view`, `export` (per-report sub-keys if needed) |

All gates must use `useActionPermissions(MODULE).can(ACTION)`; menu items
must declare `requiresPermission` keys that resolve through
`get_user_permissions` / `has_permission`.

---

## 9. Known Gaps

### 9.1 Rule Engine
- ❌ **Approval gate** before publish (rules go live immediately).
- ❌ **Expression validation** (syntax / referenced-field check).
- ❌ **History / versioning** (no audit of who changed what).
- ❌ **Import / export** (JSON or CSV).
- 🟡 **Simulator limitations** — supports single-employer scenarios only,
  no batch/regression run, no diff vs current production.

### 9.2 Violations
- ❌ Verification queue (separate from review queue).
- ❌ Duplicate detection (overlap by employer + period + rule).

### 9.3 Cases
- ❌ Case grouping / families (link related cases of same employer/officer).

### 9.4 Payments & Arrangements
- 🟡 Payment reconciliation (basic only — not all payment heads mapped).
- 🟡 Arrangement breach detection (rule exists; auto-action ❌).

### 9.5 Legal
- ❌ Legal pack generation (assemble notices + ledger + evidence into a
  single output bundle).
- ❌ Structured employer-response handling for legal stage (currently uses
  audit-comm employer responses).

### 9.6 Help / Instructions
- ❌ Per-screen contextual help.
- 🟡 KB articles exist globally but not surfaced inside Compliance pages.

---

## 10. Recommended Implementation Sequence

Aligned to the prompt-pack order. **No functional change in this prompt.**

1. **Access-control seeding.** Add `ce_*` modules + actions, map to
   capability bundles, switch menu/button gates from `manage_compliance` to
   per-module keys. (Foundational — unblocks all later prompts.)
2. **Violations:** verification queue, duplicate detection, supervisor
   maker-checker workflow.
3. **Cases:** case grouping/families, lifecycle workflow.
4. **Notices & Communications:** unified hub, per-issuance approval workflow.
5. **Payment Arrangements:** reconciliation completeness, automated breach
   action, restructure approval workflow.
6. **Legal Escalations:** legal pack generation, structured employer
   response, recommendation→referral→outcome workflow.
7. **Risk & Employer Profile:** consolidate Field/Admin entry points,
   surface Employer-360 risk timeline.
8. **Reports:** add missing export permissions, ensure every report checks
   `ce_reports.export`.
9. **Administration / Rule Engine:** publish-approval gate, expression
   validation, versioning, import/export, simulator batch run.
10. **Help & Instructions:** wire KB articles into each Compliance screen.

---

## Acceptance

- [x] `docs/compliance/implementation_inventory.md` created with all 10
      required sections.
- [x] Each item tagged ✅ Existing / 🟡 Partial / ❌ Missing / ❓ Unknown.
- [x] No functional code changes in this prompt.
