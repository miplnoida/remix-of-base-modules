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

## Phase 1 — Foundation Cleanup

- Audit every Legal screen; strip hardcoded rows (ABC Construction, XYZ Services, John Doe, sample SSB/LGL numbers, mock charts, mock "recent orders").
- Wire every screen to real Supabase queries or a real empty-state.
- Standardise: `LgLoadingState`, `LgErrorState`, `LgEmptyState`, permission gate (`useLgAccess`), `LgDataGrid` (filter/sort/group/export/row actions), audit hook.
- Reorganise sidebar to the 13-section structure.

## Phase 2 — Legal Recovery Workbench (primary screen)

- New route `/legal/recovery-workbench` built on `LgDataGrid`.
- Union view over `lg_case` + `core_legal_referral_item` + `ce_legal_referrals` + `bn_legal_referral` + `ce_payment_arrangements` + `lg_fee_charge` exposing every column listed in the brief (Matter No … Last Activity).
- Server-side filters, multi-column sort, grouping (officer / territory / status / party type / recovery type / ageing bucket).
- Summary cards: Total Recoverable, Outstanding, Recovered, Recovery %, Overdue, Breached Arrangements, Hearings Due, Cases Awaiting Action.
- Row drill-down to Legal Case 360 or source Compliance/Benefit case.
- Export current filtered view: Excel, CSV, PDF, Word. Saved views via existing `explorer_saved_view`.

## Phase 3 — Referral to Legal Workflow

- Complete lifecycle: Compliance/Benefits referral → Legal Assessment → Info Request → Accept/Reject → Intake → Case → Assign → SLA tracking.
- Actions: view, accept, reject, request info, receive info, create intake, create case, assign/reassign, escalate, close.
- Central `lgReferralStateMachine.ts` enforces allowed transitions; every action = permission check + audit + cache invalidate + toast.
- Docs: `/docs/legal/referral-workflow.md`, `/docs/legal/referral-state-machine.md`.

## Phase 4 — Legal Case 360 Workspace

- `LgCaseDetail` restructured into 13 tabs (Overview, Party, Source Link, Recovery Financials, Hearings, Orders & Judgments, Payment Arrangements, Settlements, Notices & Letters, Documents/Evidence, Tasks, Timeline, Audit).
- Overview header: number, source, party, type, status, stage, officer, territory, financial snapshot, next action, next hearing, SLA, recovery %, open tasks, missing documents.
- Full action ribbon (edit, assign, reassign, stage change, add task/hearing/order/arrangement/settlement, generate notice, upload doc, record recovery, close).

## Phase 5 — Hearings

- Full capture: court, court case no, date/time, type, judge, venue, officer, attendees, witnesses, required docs, outcome, adjournment reason, next date, follow-up tasks, related order, notes.
- Hearing calendar + list, conflict check, reminders, notice generation, outcome recording, audit.

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