# SSB Legal Module — Enterprise Recovery & Case Management (Master Plan)

Business anchor: The Legal module exists primarily to **recover money owed to the Social Security Board** (contribution arrears, penalties, interest, benefit overpayments, court costs, legal costs) through referrals from Compliance and Benefits, litigation, judgments, payment arrangements and settlements. Advisory/contract review is a secondary function. **No AI in this phase. also as you will be changing menu structure so as well guie the impacts too.**

Delivery is phased. Each phase ends with a working, testable increment on the same code branch. I will not skip ahead or do random work between phases.

---

## Module Navigation (target structure)

```
Legal
├── Command Centre          (live dashboard)
├── My Work                 (personal queue)
├── Legal Recovery Workbench (primary operational grid)
├── Referrals to Legal
├── Legal Cases
├── Hearings
├── Orders & Judgments
├── Recovery & Payments
├── Settlements / Payment Arrangements
├── Documents & Notices
├── Advisory & Contract Review
├── Analytics Explorer
└── Administration
```

Sidebar (`app_modules`) is reorganised in Phase 1 to match.

---

## Phase 1 — Foundation Cleanup  (in progress — safe cleanup track)

Decision (user): **A** — hold sidebar 13-section reorg until end of Phase 4.
Decision (user): **B** — keep legacy pages alive in parallel; redirect only
obvious duplicate report/dashboard pages this phase.

Shipped:
- Purged mock charts/rows from `ReportsAnalytics.tsx`, `LegalReports.tsx`,
  `SSBLegalReports.tsx` (now redirect to `/legal/reports`).
- Cleaned `TerritorySettings.tsx` sample mappings.
- Stripped sample parties from legacy `LegalCaseView.tsx`.
- New: `docs/legal/deprecation-notes.md` (living inventory of legacy pages
  + retirement gates).
- New: `docs/legal/route-retirement-plan.md` (Phase 4 cutover waves).

Deferred to Phase 4 (per decisions A/B):
- Sidebar reorg / `app_modules` migration.
- Retirement or redirect of `SSB*`, `NewLegalModule`,
  `LegalUnifiedWorkbench`, `CaseIntake`, `CaseView` routes.
- Deletion of `mockLegalWorkflow.ts` / `mockLegalIntake.ts` /
  `mockLegalData.ts` / `mockLegalCases.ts` (still imported by legacy
  screens we promised to keep alive).

## Phase 2 — Legal Recovery Workbench (primary screen)

- New route `/legal/lg/recovery` (`LgRecoveryWorkbench`) built on
  `LgDataGrid` — **shipped**.
- Buckets: Active recovery, Overdue / at risk, Settled, All.
- Live figures from `lg_case` financial snapshot columns
  (`claim_amount`, `outstanding_amount_snapshot`, `next_hearing_date`,
  `status_code`, `current_stage_code`). No per-row RPCs, no mocks.
- Summary chips: Cases, Claim, Outstanding, Recovered, Recovery %.
- Row actions drill into the case detail Recovery tab or the case.
- Export via built-in grid toolbar (CSV/Excel).
- Follow-ups (Phase 2b once new referral/arrangement views land):
  - Union with `core_legal_referral_item` + `ce_payment_arrangements` +
    `lg_fee_charge` for full multi-source columns.
  - Server-side filters, grouping (officer/territory/ageing), saved views
    via `explorer_saved_view`.



## Phase 3 — Referral to Legal Workflow  (shipped)

- Full lifecycle wired through `referralLifecycleService.ts` +
  `useReferralLifecycle` hook + `ReferralLifecycleDialogs`. Actions
  covered: view, receive, accept, reject, request info, receive info
  response, create intake, create case, assign/reassign, escalate, close.
- **New:** `src/services/legal/lgReferralStateMachine.ts` — single
  source of truth for allowed transitions, terminal states, and
  action→capability mapping. `referralLifecycleService` now imports
  from it (no duplicated transition tables).
- Every mutation: capability guard (`useLegalCapability`) → state
  machine assertion → DB update → `legal_referral_audit` insert →
  mirror to `lg_case_activity` when a case exists → cache invalidate
  + toast.
- Realtime refresh via `useLegalReferralsRealtime` (already in place).
- **New docs:** `docs/legal/referral-workflow.md` (end-to-end flow)
  and `docs/legal/referral-state-machine.md` (states, transitions,
  action → capability table).


## Phase 4 — Legal Case 360 Workspace  (shipped)

- `LgCaseDetail` (`/legal/lg/case/:id`) is the single Case 360 Workspace.
- Structured as a two-level nav: 6 groups (Overview, Work, Litigation,
  Recovery, Documents, Governance) × sub-tabs, covering all 13 functional
  areas required by the master prompt. Mapping in
  `docs/legal/case-360-workspace.md`.
- Overview header shows number, party, type, status, stage, officer,
  territory, financial snapshot, next hearing, SLA, recovery %, open tasks
  and missing-documents warnings; action ribbon covers edit, assign,
  reassign, add task/hearing/order/arrangement/settlement, generate notice,
  upload doc, record recovery, close.
- All sub-tabs pull from live `lg_*` / `core_legal_*` /
  `ce_payment_arrangements` tables via the hooks in `src/hooks/legal/`; no
  mock imports. Loading/error/empty states via `LgDataGrid`. Mutations
  gated by `useLgAccess()` and audited through
  `lgAuditService.logLgActivity()`.
- Legacy `LegalCaseView` / `SSBCaseView` / `CaseView` remain alive in
  parallel per Phase-1 decision B; retirement scheduled in
  `route-retirement-plan.md`.
- **New doc:** `docs/legal/case-360-workspace.md`.

## Phase 5 — Hearings  (shipped)

- Live calendar + list at `/legal/lg/hearings` (`LgHearingCalendar`) — team/mine scope, `LgDataGrid` list view, capability-gated Add Hearing, row actions for outcome / documents / case drill-down.
- Case 360 Hearings tab reads live `lg_hearing` rows; `HearingOutcomeDialog` handles both scheduling and outcome recording, with automatic follow-up hearing + task creation and `HEARING_SCHEDULED` fee-event trigger.
- New `src/services/legal/lgHearingStateMachine.ts` codifies `SCHEDULED → COMPLETED | ADJOURNED | CANCELLED | NO_SHOW`, with capability mapping consumed by `useLgAccess` / `useLgHearingPermissions`.
- Legacy `CaseHearingsTab` stripped of mock hearings — now shows deep-link to the live workspace only (route retirement continues per Phase 4 waves).
- Docs: `docs/legal/hearings-workflow.md`, `docs/legal/hearing-state-machine.md`.

## Phase 6 — Orders & Judgments

- Capture full order set incl. appeal-till date, enforcement flag, compliance due.
- Status machine: Draft → Filed → Granted → Active → Complied / Breached / Under Appeal → Closed.
- Auto-link to recovery balance, payment arrangement, enforcement task, timeline, documents, audit.

## Phase 7 — Recovery & Payments

- Deterministic financial engine per matter:
  ```text
  Total Recoverable = Principal + Interest + Penalties + Court Cost + Legal Cost
  Outstanding       = Total Recoverable − Payments Received
  Recovery %        = Payments Received / Total Recoverable
  ```
- Sources: `core_legal_referral_item`, `lg_fee_charge`, `ce_payment_arrangements` + `ce_installments`, `cn_payment`, `bn_overpayment`.
- Track payment history, missed installments, breach, next follow-up, write-off recommendation flag, closure eligibility. Zero hardcoded values.

## Phase 8 — Settlements / Payment Arrangements

- Extend `lg_settlement` + link to `core_payment_arrangement`.
- Lifecycle: Draft → Submitted → Under Review → Approved / Rejected → Active → Breached / Completed / Cancelled.
- Capture proposal, waiver, installment plan, approval, breach rules, documents. Permission + audit on every state change.

## Phase 9 — Documents & Notices

- Documents: upload / link DMS, type, confidentiality, evidence flag, version, preview, link to case/hearing/order/settlement.
- Notices: demand letter, hearing notice, payment-default notice, settlement letter. Preview → draft → approve → dispatch → mirror to DMS → timeline entry. Uses SSB branding tokens (no hardcoded logos/addresses).

## Phase 10 — Advisory & Contract Review (secondary)

- NDA / contract / MOU / vendor / opinion / policy advice on `lg_contract_review` + `la_matter`.
- Lifecycle: Submitted → Assigned → Under Review → Info Requested → Comments Issued → Approved / Rejected → Closed.
- Capture requesting dept, counterparty, value, dates, renewal, risk, comments, versions, decision, docs. Surfaces in My Work but separated from recovery cases.

## Phase 11 — Analytics Explorer (replaces static reports)

- Retire the 11 static report pages. Register 13 datasets in `legalDatasets.tsx` on the existing Enterprise Data Explorer framework: Recovery, Case Ageing, By Stage, By Officer, By Territory, Hearing Calendar, Orders & Judgments, Arrangement Breach, Settlements, Referral Source, Closed Cases, Outstanding Balance, Officer Workload.
- Each dataset: live grid first, filters, sort, grouping, aggregations, drill-down, KPI cards, charts, saved views, export (Excel/CSV/PDF/Word), print.

## Phase 12 — Command Centre Dashboard

- Replace `LegalDashboard` with live Command Centre. Widgets: My Urgent Work, Active Matters, Outstanding Recovery, Recovered MTD/YTD, Recovery %, Overdue Matters, SLA Breached, Hearings This Week, Orders Awaiting Compliance, Breached Arrangements, Officer Workload, Matters by Territory, Ageing Buckets, Recent Activity. Every widget click deep-links into a pre-filtered Workbench / Analytics view.

## Phase 13 — Permissions, Audit, Validation

- Consolidate 20+ capabilities in `useLgAccess`, publish `/docs/legal/permission-matrix.md`.
- Every mutation writes `lg_case_activity` with user, ts, entity_type, entity_id, action, old_value, new_value, remarks.
- State-machine guards for referral, case, hearing, order, settlement, arrangement.

## Phase 14 — Enterprise Readiness Report

- Produce `/docs/legal/LEGAL_ENTERPRISE_READINESS_REPORT.md`: what was built, screens changed, tables used, gaps, limitations, UAT checklist, business-process checklist, test scenarios, permissions matrix, export matrix, outstanding risks.

---

## Technical Notes (for reviewers)

- **Data sources (existing tables, no new domain tables unless noted):** `lg_case`, `lg_case_intake`, `lg_case_activity`, `lg_case_task`, `lg_hearing`, `lg_order`, `lg_notice`, `lg_document_link`, `lg_settlement`, `lg_fee_charge`, `lg_payment_arrangement_link`, `lg_contract_review`, `la_matter`, `core_legal_referral_item`, `core_legal_reference`, `ce_legal_referrals`, `bn_legal_referral`, `ce_payment_arrangements`, `ce_installments`, `ce_arrangement_breaches`, `cn_payment`, `bn_overpayment`.
- **Views/RPCs to add:** `v_lg_recovery_matter` (union recovery workbench), `v_lg_case_financials` (per-case recoverable/paid/outstanding/%), `v_lg_matter_ageing`. Migrations delivered in the phase that first needs them.
- **Framework reuse:** `LgDataGrid`, `useLgAccess`, `useBlockingMutation`, Enterprise Data Explorer (`ExplorerShell`), `explorer_saved_view`, `system_audit_trail`, notice templating via `core_template`.
- **Non-goals this phase:** no AI insights, no external court API integrations, no mobile-specific UI, no changes to Compliance/Benefits source screens beyond referral hand-off buttons.
- **Definition of done per phase:** no dummy rows, real queries + empty/loading/error states, permission-gated actions, audit on mutations, exports working, docs updated.

Please approve to start Phase 1. After each phase I will report changed files + remaining gaps before moving to the next.