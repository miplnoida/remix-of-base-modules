# EPIC-06 — End-to-End UAT Scenarios

_Last updated: 2026-07-02_

This document defines the acceptance scenarios that certify the Legal platform (Intake → Recovery → Closure) covering all of EPIC-02 through EPIC-06C.

Every scenario runs against real Supabase data (no mock data, no AI). Each step lists the actor, the expected UI outcome, and the expected database state so a tester can verify from either angle.

---

## Scenario 1 — Compliance Referral → Recovery Closure (full lifecycle)

**Preconditions**
- Employer `SEED-EMP-001` exists with an active compliance case referring an outstanding SSC balance.
- Actors: Compliance Officer, Legal Case Handler, Legal Approver, Cashier.

| # | Actor | Step | Expected UI | Expected DB |
|---|-------|------|-------------|-------------|
| 1 | Compliance Officer | Refer the case from Compliance → Legal (Refer to Legal). | Toast "Referral created". Case appears in Legal Intake Workbench. | Row in `lg_case_referral`; case status `IN_INTAKE`. |
| 2 | Legal Case Handler | Open Intake Workbench, run qualification checklist, decide **ACCEPT**. | Snapshot rail shows readiness score 100%. | `lg_case_intake.decision_code = 'ACCEPT'`; `lg_case.status = 'ACTIVE'`. |
| 3 | Legal Case Handler | Confirm proposed liabilities materialize as `lg_recoverable_liability` rows. | Matter Workspace header shows Assessed / Paid / Outstanding and 1 High-Risk chip. | Rows in `lg_recoverable_liability`; rollup matches. |
| 4 | Legal Case Handler | Schedule a first hearing, record outcome `ORDER_ISSUED`, embed draft order via Embedded Draft Order Drawer. | Order appears in Judicial Orders Workbench in DRAFT. | `lg_order` row + `lg_order_liability` junctions. |
| 5 | Legal Approver | Open Judicial Document Workflow on the order: Preview → Word → PDF → Approve → Issue. | Stepper walks 1–5, ends "Issued". Notification appears in-app. | `core_generated_document` row with status `ISSUED`; `lg_case_activity` rows for each stage. |
| 6 | Legal Case Handler | Mark order status `ACTIVE`; compliance deadline set. | Order Workspace Summary shows Compliance % and Days-to-Deadline. Command Centre widget "Compliance Due (7d)" increments. | `lg_order.status='ACTIVE'`, `compliance_date` populated. |
| 7 | Cashier | Record a partial payment; allocate via allocation rule. | Recovery Workbench recovery % rises; Liability 360 drawer Payments tab shows allocation. | `lg_payment_allocation`; liability `paid`/`outstanding` recomputed. |
| 8 | Legal Case Handler | Order breaches deadline (simulate by advancing date). | Command Centre "Breaches" widget increments; Recovery Workbench row shows Breach health badge. | `lg_order.status='BREACHED'`; task auto-created via `lg_notification_rule` (`COMPLIANCE_BREACHED`). |
| 9 | Legal Approver | Start enforcement (`Enforcement Action → Initiate`). | Enforcement tab shows action IN_PROGRESS. Notification `ENFORCEMENT_STARTED` dispatched. | `lg_enforcement_action` row; `lg_enforcement_liability` junctions. |
| 10 | Cashier | Recovery reaches 100% via full payment. | Recovery Workbench shows recovery 100%, health OK. | Liability `recovery_status='RECOVERED'`. |
| 11 | Legal Approver | Close matter with reason "Fully Recovered". | Matter closed banner shown; Command Centre "Active Orders" decrements. | `lg_case.closed_date`, `closure_reason`; `MATTER_CLOSED` notification dispatched. |

**Pass criteria**: all 11 rows verify; typecheck clean; Command Centre widgets return to steady state within 30s of closure.

---

## Scenario 2 — Benefit Overpayment → Judgment → Payment Arrangement → Closure

**Preconditions**
- Beneficiary `SEED-BEN-002` has a recorded overpayment in Benefits module.

| # | Actor | Step | Expected DB |
|---|-------|------|-------------|
| 1 | Benefits Officer | Refer overpayment to Legal. | `lg_case_referral` row (source_module `BENEFITS`). |
| 2 | Legal Case Handler | Accept intake; liability created with `liability_type='BN_OVERPAYMENT'`. | `lg_recoverable_liability` (fund `BENEFIT`). |
| 3 | Legal Approver | Draft judgment order via workflow; issue. | `lg_order.order_type_code='JUDGMENT'`; `ORDER_GRANTED` notification. |
| 4 | Legal Case Handler | Attach a payment arrangement with 12 installments. | `lg_payment_arrangement_link`; `arrangement_status='ACTIVE'`. |
| 5 | Cashier | Beneficiary pays all installments on time. | Recovery % reaches 100. |
| 6 | Legal Approver | Close matter. | `MATTER_CLOSED` event. |

---

## Scenario 3 — Multi-Liability Employer with Partial Appeal

**Preconditions**
- Employer `SEED-EMP-003` with 3 separate liabilities (SS_CONTRIB, HOUSING_LEVY, PENALTY).

| # | Actor | Step | Expected outcome |
|---|-------|------|-----------------|
| 1 | Legal Case Handler | Consolidate 3 liabilities into a single matter. | Matter Workspace header sums all three. |
| 2 | Legal Approver | Issue one order per liability. | 3 orders linked; Recovery Workbench shows outstanding split by fund. |
| 3 | Employer | File appeal against PENALTY order only. | `lg_appeal` linked via `lg_appeal_liability` to the penalty liability only. Command Centre "Appeals Filed (30d)" increments. |
| 4 | Legal Approver | Enforce the non-appealed orders (SS_CONTRIB + HOUSING_LEVY). | 2 enforcement actions, linked only to the un-appealed liabilities. |
| 5 | Legal Approver | Appeal decision returned `DISMISSED`. | Penalty liability status remains ACTIVE; `APPEAL_DECISION` event dispatched. |
| 6 | Cashier | Employer pays all 3 in full. | Recovery 100% across matter; each Liability 360 drawer shows RECOVERED. |
| 7 | Legal Approver | Close matter. | Matter closed; `avgJudicialCycleDays` KPI updates. |

---

## Cross-cutting checks

- **Timeline**: Every mutation above is visible in the Grouped Operational Timeline under the correct category (Judicial / Financial / Compliance / Communication / Task / Audit).
- **Liability 360 Drawer**: Opening the drawer from each surface (Recovery Workbench, Order tab, Appeal tab, Enforcement tab, Matter Workspace) returns identical data.
- **Notifications**: Each `dispatch(...)` fires only when the matching rule row in `lg_notification_rule` is active.
- **Permissions**: A `LG_READ_ONLY` user can see every screen listed above but cannot approve, issue, or start enforcement.
- **Performance**: On a matter with ≥ 50 liabilities and ≥ 100 timeline events, Matter Workspace TTI ≤ 1.5 s (React.lazy on tabs; memoized rollups).

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Legal Product Owner | | |
| Compliance Lead | | |
| QA Lead | | |
| Engineering Lead | | |

---

# EPIC-07 — Post-Judgment Legal Recovery UAT

Prerequisite: at least one matter with an active judgment (`lg_order`
row where `order_type = 'JUDGMENT'` and `status = 'ACTIVE'`) and one or
more linked `lg_recoverable_liability` rows.

## 07-UAT-01 · Judgment Compliance monitoring

1. Open `/legal/lg/post-judgment/:caseId` → **Judgment Compliance** tab.
2. Record ordered / interest / costs; set compliance due date.
3. Post partial compliance amount; verify outstanding recalculates and
   health flips from `Healthy` → `ComplianceDue` when < 30 days remain.
4. Attempt **Close Compliance** while liabilities remain unresolved —
   blocked unless the user has `overrideComplianceClosure`.

## 07-UAT-02 · Consent Order breach

1. Create a consent order (6 monthly installments).
2. Miss two consecutive installments (advance system date or backdate
   the schedule).
3. Confirm health flips to `ConsentBreached`, next action reads
   *"Issue variation or escalate to enforcement"*, and a breach event
   appears in the unified timeline.

## 07-UAT-03 · Court Filing lifecycle

1. From **Court Filings**, create a `DRAFT` variation application.
2. Advance FILED → SERVED → ACCEPTED, capturing filing/service dates.
3. Verify each transition appears in the audit tab and unified timeline.

## 07-UAT-04 · Legal Costs & recovery

1. Add court fee, service fee and attorney fee against the case,
   linking each to a liability.
2. Post a `recovered_amount` for one line; confirm the Costs KPI on the
   dashboard drops by exactly that amount.

## 07-UAT-05 · External Counsel

1. Create a law-firm record + engagement for the matter.
2. Upload an invoice; verify permissions
   (`manageExternalCounsel` required to create firms / engagements).

## 07-UAT-06 · Dashboard KPIs & deep-links

1. Open `/legal/lg/legal-recovery-dashboard`.
2. Click every KPI card — each must land on a pre-filtered workbench or
   workspace (no dead links).
3. Log in as `LG_READ_ONLY` — every mutation button hidden; deep-links
   still work read-only.

## 07-UAT-07 · Cross-module context

1. Open `LgCaseDetail` for the matter — confirm
   `PostJudgmentSnapshotStrip` shows health, 8 KPI cells and
   *Next Legal Action*.
2. Open the linked assignment in the Recovery Assignment Workspace —
   confirm `LegalRecoveryContextPanel` shows the same current
   instruments and next-action guidance.

## Sign-off

| Role | Name | Date |
|------|------|------|
| Legal Product Owner | | |
| Recovery Ops Lead | | |
| QA Lead | | |
| Engineering Lead | | |
