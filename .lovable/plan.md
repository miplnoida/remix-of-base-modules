# EPIC-06D — Recovery Assignment & Operational Work Management

Goal: Ship a dedicated `lg_recovery_assignment` operational domain that sits between Legal Matters/Liabilities and the future Collections module (EPIC-07). Recovery Officers work exclusively from Assignments, not Matters or Liabilities.

No AI. No mock data. No duplicate services or tables — reuse `lgLiabilityService`, `lgRecoveryHealth`, `lgOrderService`, `lgAppealService`, `lgEnforcementService`, `lgUnifiedTimelineService`, `lgSlaPolicyService`, `lgNotificationRuleEngine`, `lgAuditService`, `lgJudicialTaskAutomation`, `Liability360Drawer`.

Delivered in 6 sequenced phases. Each phase leaves the app typecheck-clean.

---

## Phase 1 — Data Foundation

Single migration (approval-gated). All tables in `public`, RLS OFF per project rule, no CHECK constraints on time-dependent rules — use validation triggers instead.

Tables:
- `lg_recovery_assignment` — core; owner officer, team, status (`DRAFT|ASSIGNED|ACTIVE|SUSPENDED|ESCALATED|COMPLETED|CLOSED`), health, priority, strategy_type_code, campaign_id, target_recovery_amount, target_date, rollups (principal/paid/outstanding/liability_count/order_count/appeal_count/enforcement_count), sla_policy_code, next_action_code, next_action_due_at, escalation_reason, transfer_pending flag, timestamps + audit user_codes.
- `lg_recovery_assignment_liability` — junction (assignment_id, liability_id, added_at, added_by, remarks). Unique.
- `lg_recovery_assignment_history` — every status change, transfer, escalation.
- `lg_recovery_assignment_action` — diary entries (call, visit, letter, meeting, negotiation-note); links optionally to `lg_case_task`, `core_generated_document`, `lg_hearing`.
- `lg_recovery_assignment_transfer` — pending transfers (from_user, to_user, requested_by, reason, approval_state).
- `lg_recovery_campaign` — campaign master (code, name, campaign_type_code, from_date, to_date, target_amount, target_liability_count, owner_team, status).
- `lg_recovery_strategy_type` — admin config (code, name, description, playbook_json, default_sla_policy_code).
- `lg_recovery_campaign_type` — admin config.
- `lg_recovery_workload_rule` — admin config (max_active_assignments, max_high_priority, capacity_thresholds, escalation_rules).
- `lg_recovery_assignment_audit` — value-diff audit (entity, action, before/after JSON, actor).

Triggers:
- `trg_lg_assignment_rollup` — recompute financials + counts from linked liabilities on junction insert/delete/update.
- `trg_lg_assignment_health` — deterministic health (Healthy/At-Risk/Critical) from outstanding %, missed installments, breached orders, days-since-last-action.
- `trg_lg_assignment_audit` — write to `lg_recovery_assignment_audit` on any update.

GRANTs (authenticated + service_role) on every new table.

## Phase 2 — Services & Types

- `src/types/legal/recoveryAssignment.ts` — full type surface.
- `src/services/legal/lgRecoveryAssignmentService.ts` — CRUD, link/unlink liabilities, status transitions (state-machine), bulk assign, workload lookup.
- `src/services/legal/lgRecoveryAssignmentWorkbenchService.ts` — grid aggregation reusing rollups + `lgRecoveryHealth`.
- `src/services/legal/lgRecoveryStrategyService.ts` — rule-based Next Recommended Action engine (Demand → Phone → Visit → Negotiation → Installment → Court Follow-up → Escalation) sourced from `lg_recovery_strategy_type.playbook_json`.
- `src/services/legal/lgRecoveryCampaignService.ts` — campaign CRUD + membership + rollups.
- `src/services/legal/lgRecoveryTransferService.ts` — request/approve/reject transfer with audit.
- `src/services/legal/lgRecoveryAssignmentAutomation.ts` — auto-create `lg_case_task` on escalation/breach; dispatch via `lgNotificationRuleEngine`; SLA via `lgSlaPolicyService`.

State machine `assignmentStateMachine.ts` gating every transition + capability check.

## Phase 3 — Assignment Workbench

- `src/pages/legal/recovery/LgRecoveryAssignmentWorkbench.tsx` — high-density `LgDataGrid`:
  - KPI chips: Active, At-Risk, Critical, Overdue Actions, Pending Transfers, Recovery %, Workload Capacity.
  - Filters: status, health, strategy, campaign, officer, team, priority, next-action-due, outstanding range.
  - Grouping: Officer, Team, Campaign, Strategy, Health.
  - Bulk actions: Assign, Reassign, Change Strategy, Add to Campaign, Escalate, Suspend, Close.
  - Workload balancing side-panel using `lg_recovery_workload_rule` + officer capacity.
- `LgRecoveryDashboard.tsx` widgets: campaign performance, officer leaderboard, health distribution, aging buckets.
- Route: `/legal/recovery/assignments`.

## Phase 4 — Assignment Workspace

- `src/pages/legal/recovery/LgRecoveryAssignmentWorkspace.tsx` — snapshot rail + tabs:
  1. **Overview** — header (officer, status, health, next action), financial summary, KPI chips.
  2. **Liabilities** — grid opening the shared `Liability360Drawer`; add/remove with capability gate.
  3. **Strategy** — current strategy + playbook steps + Next Recommended Action card (rule-based).
  4. **Communications** — reuses `lgNotificationRuleEngine` dispatch log for this assignment.
  5. **Diary** — `lg_recovery_assignment_action` entries (call/visit/letter/meeting notes).
  6. **Negotiations** — negotiation-typed diary + payment arrangement links (via existing `lg_payment_arrangement_link`).
  7. **Tasks** — reuses `LgTasksList` scoped to assignment.
  8. **Documents** — reuses `lg_document_link`.
  9. **Payments** — payment allocations across linked liabilities (reuses `lgLiabilityService`).
  10. **Timeline** — reuses `GroupedOperationalTimeline` filtered by assignment.
  11. **Audit** — reuses `lgAuditService` view of `lg_recovery_assignment_audit`.
- Route: `/legal/recovery/assignments/:id`.

## Phase 5 — Admin, Integration & Permissions

Admin screens under `/legal/admin/`:
- `LgAssignmentStatusesAdmin.tsx` (view — statuses are enum-driven, allows label/description overrides via `lg_reference_value`).
- `LgRecoveryStrategyTypesAdmin.tsx` — CRUD `lg_recovery_strategy_type` with playbook editor.
- `LgRecoveryCampaignTypesAdmin.tsx`.
- `LgRecoveryWorkloadRulesAdmin.tsx`.

Cross-module integration (read-only badges + drawer links, no duplicated data):
- Matter Workspace: new "Recovery Assignments" tab listing assignments for that matter.
- Recovery Workbench: adds `assignment_officer` + `assignment_status` columns; row action "Open Assignment".
- Court Ops, Orders, Appeals, Enforcement: hearing/order rows show assignment chip when linked liabilities are covered.
- `Liability360Drawer`: new "Assignment" section showing owning assignment(s).

Permissions — extend `useLgAccess` with 12 capabilities:
`viewRecoveryAssignment`, `createRecoveryAssignment`, `editRecoveryAssignment`, `assignRecoveryOfficer`, `bulkAssignRecovery`, `transferRecoveryAssignment`, `approveRecoveryTransfer`, `escalateRecoveryAssignment`, `closeRecoveryAssignment`, `configureRecoveryStrategy`, `configureRecoveryCampaign`, `configureWorkloadRules`.

Update `docs/legal/permission-matrix.md`.

## Phase 6 — Docs, UAT, Typecheck & Closure

- `docs/legal/EPIC-06D-RECOVERY-ASSIGNMENT.md` — architecture, tables, state machine, integration map, deprecation notes (Recovery Officers no longer open Matters/Liabilities directly).
- `docs/legal/EPIC-06D-UAT-SCENARIOS.md` — 4 end-to-end scenarios:
  1. Bulk assign 50 arrears liabilities into campaign → Active → Officer works diary → Payment arrangement → Completed.
  2. Escalation: missed installments trigger health=Critical → auto task → transfer approved → Reassigned.
  3. Court-linked assignment: hearing outcome updates linked liabilities → strategy switches to Court Follow-up.
  4. Campaign rollup: officer leaderboard reflects recoveries; workload balancer redistributes.
- `bunx tsgo --noEmit` clean.
- Update `.lovable/plan.md`; mark EPIC-06D delivered.

---

## Technical notes

- ~10 new tables, 3 triggers, ~9 new services, ~2 workbench pages, 1 workspace page, 4 admin pages, ~10 cross-module touch-ups.
- Zero destructive changes. Additive only.
- Reuses `Liability360Drawer`, `GroupedOperationalTimeline`, `LgDataGrid`, `LgTasksList`, `lgSlaPolicyService`, `lgNotificationRuleEngine`, `lgAuditService`, `lgRecoveryHealth`, `lgJudicialTaskAutomation` end-to-end.
- Recovery Officers see only the Assignment Workbench in the sidebar; Matter/Liability access hidden behind existing legal capabilities.

Approve to start Phase 1 (data foundation migration).
