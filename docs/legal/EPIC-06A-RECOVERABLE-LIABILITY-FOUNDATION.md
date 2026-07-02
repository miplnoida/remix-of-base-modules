# EPIC-06A — Recoverable Liability Foundation

**Module:** Legal (SSB St. Kitts & Nevis)
**Status:** Foundation shipped. Retrofit into EPIC-02/03A/04/05 tracked below.
**Rule:** No AI. No RLS (project standard, see `docs/ARCHITECTURE-NO-RLS-RULE.md`). No mock data.

## 1. Concept

Every Legal Matter recovers **one or many Recoverable Liabilities**. A liability is
the atomic unit that carries source traceability, statutory basis, financials, and
its own lifecycle. Hearings, orders, arrangements, settlements, appeals, and
enforcement all attach to liabilities — not directly to the matter.

## 2. Data model

Table | Purpose
--- | ---
`lg_recoverable_liability` | Core liability row (source, fund/period, financials, lifecycle, limitation, merge/split lineage).
`lg_hearing_liability` | Which liabilities are addressed by a hearing.
`lg_order_liability` | Which liabilities an order covers, and the amount ordered.
`lg_arrangement_liability` | Allocation of an arrangement across liabilities.
`lg_settlement_liability` | Settlement split (settled + waived) per liability.
`lg_payment_allocation` | Every payment slice landing on a liability, with `component` (Principal/Interest/…).
`lg_document_liability` | Documents attached to a liability, with `doc_role` (EVIDENCE/ASSESSMENT/COURT/…).
`lg_task_liability` | Tasks scoped to a specific liability.
`lg_liability_note` | Per-liability notes.
`lg_liability_audit` | Immutable audit of every liability action.

### Enforced in the database

* `total_assessed = principal + interest + penalty + court_cost + legal_cost + other_cost` (trigger).
* `outstanding = max(total_assessed − paid, 0)` (trigger).
* All amounts must be ≥ 0.
* `paid` cannot exceed `total_assessed`.
* `contribution_period_from ≤ contribution_period_to`.
* When a payment allocation is inserted, updated, or deleted, `paid`, `outstanding`,
  and `recovery_status` on the parent liability are recomputed automatically
  (`lg_liab_recompute_paid`).

## 3. Source module mapping

Every liability permanently retains:

* `source_module` — `COMPLIANCE | ER | BENEFITS | FINANCE | AUDIT | FRAUD | MANUAL | OTHER`
* `source_record_id` and `source_reference` (human ref such as assessment #)
* `originating_department`, `assessment_number`, `assessment_date`

When Compliance cannot expose a breakdown, the UI shows *"Component Breakdown Not
Available"* and lets the Legal Officer verify/create liabilities manually.
The system never fabricates values.

## 4. Lifecycle

Assessment → Referral → Intake → Legal Matter → Court → Order → Arrangement →
Settlement → Appeal → Enforcement → Recovery → Closure.

Each liability moves through its own `legal_status` / `recovery_status` /
`hearing_status` / `order_status` / `arrangement_status` / `settlement_status` /
`appeal_status` / `enforcement_status` / `writeoff_status` independently.

`status` at the row level takes values `ACTIVE | CLOSED | MERGED | SPLIT | WRITTEN_OFF`.

## 5. Rollup rules

`getCaseLiabilityRollup(caseId)` in `src/services/legal/lgLiabilityService.ts`
aggregates the matter view:

* Total assessed / paid / outstanding
* Recovery % (`paid / total_assessed`)
* Fund-level breakdown
* Liabilities nearing limitation (`limitation_date` within 90 days)
* High-risk liabilities (`risk_level ∈ {HIGH, CRITICAL}`)

`useCaseLiabilityRollup(caseId)` exposes it to the workspace header, Matter
snapshot rail, and Recovery Workbench parent rows.

## 6. Merge / split

* `mergeLiabilities(ids, caseId, patch, userCode)` sums components into a new
  liability, marks sources as `MERGED`, and records lineage in `merged_into_id`.
* `splitLiability(id, parts, userCode)` requires part totals to equal the
  source's `total_assessed`; sources become `SPLIT`; lineage in `split_from_id`.

Both actions write full old/new snapshots to `lg_liability_audit`.

## 7. Payment allocation

Recorded via `allocatePayment(liabilityId, input, userCode)`:

* Enforces amount > 0 and amount ≤ current `outstanding`.
* Persists `component` (`PRINCIPAL/INTEREST/PENALTY/COURT_COST/LEGAL_COST/OTHER`) and
  `allocation_rule` (`PRINCIPAL_FIRST | INTEREST_FIRST | PENALTY_FIRST | OLDEST_FIRST | MANUAL`).
* Trigger recomputes liability totals immediately.

## 8. Permissions (added to `useLgAccess`)

| Capability | Read-only | Assistant | Case Handler | Reviewer | Approver | Admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| viewLiability            | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| createLiability          |   |   | ✅ |   | ✅ | ✅ |
| editLiability            |   |   | ✅ |   | ✅ | ✅ |
| deleteLiability          |   |   |   |   | ✅ | ✅ |
| mergeLiability           |   |   |   |   | ✅ | ✅ |
| splitLiability           |   |   |   |   | ✅ | ✅ |
| allocatePayment          |   |   | ✅ |   | ✅ | ✅ |
| overrideAllocation       |   |   |   |   | ✅ | ✅ |
| overrideLimitation       |   |   |   |   |   | ✅ |
| overrideAmount           |   |   |   |   |   | ✅ |
| writeOffLiability        |   |   |   |   | ✅ | ✅ |
| linkLiability{Hearing…}  |   |   | ✅ |   | ✅ | ✅ |

System administrators (`ADMIN`, `SYSTEMADMIN`, `SUPERADMIN`, `LEGALADMIN`) inherit
every capability via the `isAdmin` short-circuit in `useLgAccess`.

## 9. Validation summary

Checked in DB trigger and/or service layer:

* Negative values → rejected.
* `paid > outstanding` (per allocation) → rejected in `allocatePayment`.
* Period range → rejected in trigger.
* Merge across matters → rejected in `mergeLiabilities`.
* Split total ≠ source total → rejected in `splitLiability`.
* Closed liabilities cannot receive allocations (outstanding = 0).

## 10. Audit

Every action goes to `lg_liability_audit` with `old_value` / `new_value` /
`performed_by`:
`CREATE | UPDATE | DELETE | MERGE | SPLIT | ALLOCATE | ALLOCATE_REVERSE`.

## 11. UI delivered in this EPIC

* `src/components/legal/lg/LgCaseLiabilitiesTab.tsx` — matter workspace tab
  (KPI strip + LgDataGrid + bulk merge + row allocate/delete).
* Recovery group in `LgCaseDetail` now leads with **Recoverable Liabilities**
  ahead of the existing Payments/Recovery, Arrangements, Fees, Settlements tabs.

## 12. Retrofit into prior Epics — status

Epic | Retrofit
--- | ---
EPIC-02 Recovery Workbench | Parent rows continue to read from `lgRecoveryWorkbenchService`. Expand row to render liability children by calling `listLiabilitiesForCase(caseId)` — **wiring available, drilldown UI to be added in follow-up**.
EPIC-03A Intake | `useCaseLiabilities`/`useCreateLiability` are ready; Intake Workspace can call `createLiability` per approved item on gate. **Wiring to `lg_create_case_from_intake` still to be added**.
EPIC-04 Matter Workspace | Rollup available to Matter header + Snapshot rail via `useCaseLiabilityRollup`. **Header rollup replacement is planned; falls back to existing case totals until then (Part 22).**
EPIC-05 Court Operations | Hearing pack should include liability breakdown by joining `lg_hearing_liability`. **Service exposes `linkLiabilityToHearing`; UI selection still to be added.**

## 13. Migration helper (Part 22)

`createLiabilitiesFromExistingMatter(caseId, userCode)` creates a single MANUAL
liability from `lg_case.financial_amount_*` when no liabilities exist and
principal > 0. Never fabricates missing data.

## 14. Known limitations

* Junction UIs (link/unlink from hearing/order/arrangement/settlement) are not
  yet rendered — services are in place; UI panels will follow in EPIC-06B.
* Recovery Workbench child drill-down uses in-place fetch, not a preloaded
  join — acceptable at current scale, to be revisited if needed.
* Analytics dataset in Explorer for liabilities (Part 18) will be added as a
  new dataset in `src/config/explorer/legalDatasets.ts` in a follow-up.

## 15. Files

**Created**
* `src/types/legal/liability.ts`
* `src/services/legal/lgLiabilityService.ts`
* `src/hooks/legal/useLgLiabilities.ts`
* `src/components/legal/lg/LgCaseLiabilitiesTab.tsx`
* `docs/legal/EPIC-06A-RECOVERABLE-LIABILITY-FOUNDATION.md`

**Modified**
* `src/hooks/legal/useLgAccess.ts` — added liability capabilities.
* `src/pages/legal/LgCaseDetail.tsx` — new *Recoverable Liabilities* tab.

**Database migration** — new tables + triggers listed in Section 2.
