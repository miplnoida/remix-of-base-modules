
# EPIC-06C Finalization — Enterprise Completion

Goal: ship every remaining EPIC-06C deferred item, close out EPIC-06, and prepare the platform for EPIC-07. No AI, no mock data, reuse existing services/tables, preserve backwards compatibility.

Given the scope (12 major items across dashboards, workspaces, drawers, admin screens, documents, timelines, KPIs, performance, permissions, UAT), I will deliver in **6 sequenced phases**, each leaving the app typecheck-clean and shippable. Requesting your approval before I start.

---

## Phase 1 — Reusable Liability 360 Drawer + Recovery Workbench integration

Single canonical liability drawer replaces the duplicate liability views across Hearings, Orders, Appeals, Enforcement, Recovery and Matter Workspace.

- New `src/components/legal/liability/Liability360Drawer.tsx` — tabs: Overview · Financials · Orders · Appeals · Enforcement · Payments · Timeline · Audit.
- Backed by existing `lgLiabilityService`, `lgRecoveryHealth`, `lgOrderService`, `lgAppealService`, `lgEnforcementService`, `lgUnifiedTimelineService`. No new DB.
- Recovery Workbench row expansion, Order/Appeal/Enforcement Linked Liabilities tabs, Hearing liability chips and Matter Workspace all open the same drawer.
- Recovery Workbench columns extended with Order/Appeal/Enforcement status pills sourced from `lgRecoveryHealth` next-action hints (no new calculations).

## Phase 2 — Executive Legal Command Centre (20 widgets)

- New `src/services/legal/lgCommandCentreService.ts` — one aggregated query returning all 20 metrics, cached via React Query.
- 20 widgets grouped in `src/components/legal/dashboard/CommandCentre/`:
  - Judicial: Active Orders, Compliance Due (7d), Breaches, Appeals Filed (30d), Appeals Pending Decision, Enforcement In Progress, Enforcement Completed (30d), Orders Awaiting Issue.
  - Recovery: Total Outstanding, Recovery %, Recovery Delta (30d), Breached Arrangements, High-Risk Liabilities.
  - Operational: SLA On-Time %, At-Risk Tasks, Overdue Tasks, Escalated Items, My Actions, Team Queue Depth, Avg Judicial Cycle Days.
- Every widget deep-links via URL filters into the correct workbench.

## Phase 3 — Executive Matter Workspace header + Executive Judicial Order Workspace summary

- Matter Workspace header: live financial (principal / paid / outstanding / recovery %) + judicial KPI chips (Active Orders, Appeals, Enforcement, Breaches, Next Deadline, High-Risk Count). Sourced from existing rollups.
- Order Workspace: summary cards (Order Status, Compliance %, Days to Deadline, Linked Liabilities Outstanding, Linked Appeals, Enforcement Progress).
- Snapshot rail extended with judicial context (upcoming deadlines, appeal window, compliance due, recent 5 judicial activities from unified timeline).

## Phase 4 — Admin screens (SLA, Notification Rules, Template Registry) + Judicial Document Workflow

- Under `/legal/admin/`:
  - `LgSlaPoliciesAdmin.tsx` — CRUD on `lg_sla_policy`.
  - `LgNotificationRulesAdmin.tsx` — CRUD on `lg_notification_rule` with event catalog picker + channels toggles + template picker.
  - `LgTemplateRegistryAdmin.tsx` — map judicial template codes to `core_template`.
- Full judicial document preview workflow in new `src/components/legal/order/JudicialDocumentWorkflow.tsx`:
  Preview (rendered HTML) → Word (`.docx` via existing template engine) → PDF → Approve (audit log + status transition) → Issue (persists `core_generated_document`, dispatches notification rule, records timeline event).
- Preview drawer reused for orders, judgments, appeals, compliance/breach/enforcement/settlement/closure notices.

## Phase 5 — Grouped operational timelines + expanded KPI metrics + performance/permissions

- `UnifiedMatterTimeline` upgraded to grouped operational timeline: filter chips (All · Judicial · Financial · Compliance · Communication · Task · Audit), grouping by day/week/month, category badges. Same data source (single `lg_case_activity` projection).
- KPI calculations expanded in `lgTeamMetricsService` + `lgCommandCentreService`:
  - Operational productivity: actions/day, tasks closed, avg handling time.
  - Judicial efficiency: order cycle time, appeal resolution time, enforcement completion rate, compliance adherence %.
  - Recovery performance: recovery velocity (30d), collection efficiency, breach rate, arrangement compliance %.
- Performance: `React.lazy` for Appeals/Enforcement/Compliance/Timeline tabs in Order/Matter/Case Detail; `useMemo`/`useCallback` on heavy grids; shared `useLgLiabilityRollup(caseId)` cached hook; consolidated query keys to eliminate refetches.
- Permission model: extend `useLgAccess.ts` with `viewCommandCentre`, `configureSlaPolicy`, `configureNotificationRule`, `configureTemplateRegistry`, `previewJudicialDocument`, `approveJudicialDocument`, `issueJudicialDocument`, `viewJudicialTimeline`. Update `docs/legal/permission-matrix.md`.

## Phase 6 — UAT scenarios + documentation + typecheck + EPIC-06 closure

- New `docs/legal/EPIC-06-UAT-SCENARIOS.md` covering full lifecycle:
  1. Compliance Referral → Intake → Qualification → Matter → Hearing → Order → Compliance → Breach → Enforcement → Recovery Closure.
  2. Benefit Overpayment → Matter → Judgment → Payment Arrangement → Compliance → Closure.
  3. Multi-liability Employer → Consolidated Matter → Multiple Orders → Partial Appeal → Enforcement on non-appealed portion → Full Recovery.
  Each scenario lists preconditions, actor role, exact steps, expected UI/DB outcomes, and rollback.
- Update `EPIC-06A/06B/06C` docs with final delivery notes and cross-links. Mark `EPIC-06` as **Fully Completed** with maturity 10.0.
- Final `bunx tsgo --noEmit` pass + fix any regressions.

---

## Technical notes

- No new DB migrations required — Phase 1 admin screens use `lg_sla_policy`, `lg_notification_rule`, `lg_document_template_registry` already created in earlier phases.
- No AI, no mock data — every widget/KPI/timeline entry is DB-derived.
- Backwards compatibility preserved: existing tabs/services untouched externally; duplicate liability views deleted only after the shared drawer is wired and typechecks pass.
- Permission model changes are additive (defaults granted to existing admin/legal roles).
- Estimated diff: ~30 new files, ~25 modified files, 0 destructive DB changes.

Please approve to proceed with Phase 1.
