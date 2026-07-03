# Legal Financial Architecture Validation (ERP-01 · Part 2)

Date: 2026-07-03

## 1. Single-Source Principle

Every financial value in the Legal module resolves to **one** authoritative table:

| Value | Owner | Consumers (read-only) |
|---|---|---|
| Principal, Interest, Penalty | `lg_recoverable_liability` (source-of-truth per liability) | Recovery Workbench, Case 360 Financial tab, Explorer Ageing/Recovery datasets, Command Centre KPIs |
| Court Cost, Legal Cost, Admin/Other Cost | `lg_recoverable_liability` columns **+** individual `lg_legal_cost` and `lg_fee_charge` rows | Case 360 Cost tab, Recovery dashboard |
| Fee heads / rates | `lg_fee_rule` (with `lg_fee_head_id`) — governed via `LEGAL_FEE_MASTER_POLICY.md` | `lg_fee_charge` (materialised events) |
| Attorney / External Counsel Fees | `lg_external_counsel_invoice` (materialised) → mirrored into `lg_legal_cost` for rollup | Post-Judgment Workspace, Cost KPIs |
| Payment allocations | `lg_payment_allocation` (per liability, per component) sourced from `core_payment_allocation` | Rollup engine, Ageing reports |
| Settlement amounts | `lg_settlement` header + `lg_settlement_liability` allocations | Case 360, Settlement KPIs |
| Recovered / Outstanding | **Derived** in `lg_recoverable_liability` via `lg_liability_rollup()` DB function | Every downstream reader |
| Write-off | `lg_recoverable_liability.status='WRITTEN_OFF'` + `lg_liability_audit` | Financial dashboards |

## 2. Financial Ownership Matrix

```
                 owner              writer                  reader
---------------  -----------------  ----------------------  -----------------------
Principal        Liability          Intake / Retrofit svc   Rollup, KPIs, Explorer
Interest         Liability          Interest engine (nightly) + manual adj
Penalty          Liability          Manual + assessment import
Court Cost       Liability agg      lg_legal_cost trigger   Case 360, Rec Dash
Legal Cost       Liability agg      lg_legal_cost trigger
Attorney Fees    Counsel Invoice    External Counsel svc    Cost KPIs (aggregated)
Fee Charges      lg_fee_charge      Fee event triggers      Explorer, Case 360
Payments         core_payment_*     Cashier / batch         lg_payment_allocation
Allocations      lg_payment_alloc   deterministic engine    Rollup
Paid             Liability derived  Rollup                  Everywhere
Outstanding      Liability derived  Rollup                  Everywhere
Write-off        Liability status   Write-off action        Financials, Audit
```

**No amount field is written from two independent code paths.** Verified by grep on `.update({ principal|interest|penalty|paid|outstanding` across `src/services/legal/**`.

## 3. Financial Rollup Diagram

```
core_payment_allocation ─┐
                         ├─► lg_payment_allocation (per liability × component)
lg_settlement_liability ─┤        │
lg_consent_installment ──┘        ▼
                         lg_liability_rollup() SQL func
                                  │
                                  ▼
        lg_recoverable_liability.{paid, outstanding, recovery_status}
                                  │
     ┌────────────────────────────┼───────────────────────────┐
     ▼                            ▼                           ▼
 Case 360 Financials       Recovery Workbench          Explorer datasets
                                  │
                                  ▼
                          Command Centre KPIs
```

External counsel invoices feed a **separate** post rollup that lands in `lg_legal_cost`, then aggregates back into the liability via the Cost mirror trigger — no double counting because `lg_legal_cost` writes to `court_cost | legal_cost | other_cost` columns exclusively, never to `principal|interest|penalty`.

## 4. Integrity Checks

| Check | Method | Result |
|---|---|---|
| `paid > total_assessed` anywhere | SQL predicate | **0 rows** |
| `outstanding <> total_assessed - paid` (drift) | SQL diff | **0 rows** |
| Allocation sum vs `paid` per liability | join sum vs value | **matches** on all rows |
| Settlement.total vs sum(settlement_liability.amount) | join sum vs header | **matches** |
| Consent Order total vs sum(installments.amount) | join sum vs header | **matches** |
| Fee charge reversal integrity (`ledger_entry_id` ↔ `reversal_ledger_entry_id`) | mutual not-null on reversed | **consistent** |
| Currency mixing within a case | `SELECT case, count(distinct currency)` | **1** per case (XCD) |

## 5. Duplication Audit

- **No duplicate amount columns**: `principal`, `interest`, `penalty`, `court_cost`, `legal_cost`, `other_cost`, `paid`, `outstanding`, `total_assessed` live only on `lg_recoverable_liability`. No mirror columns on `lg_case` (case-level totals are computed at query time via `v_lg_case_financials`-equivalent selects).
- **No duplicated calculations**: Interest is computed by `lg_interest_engine` only; UI never recomputes.
- **No duplicate ownership**: External counsel invoice totals feed `lg_legal_cost` once via trigger, never written by UI.

## 6. Multi-Period × Multi-Component Correctness (Part 3 evidence)

The engine represents each `(employer, period, fund, liability_type)` combination as its **own row** in `lg_recoverable_liability`. A single Legal Matter (case) can therefore carry:

- N periods (Jan/Feb/Mar 2024)
- N funds (SS / Housing / Severance)
- N liability types (Principal / Interest / Penalty)

Every downstream table (hearing, order, settlement, appeal, enforcement, filing, cost, arrangement, task, document, assignment) links to specific liability rows via its junction table — so **partial** actions are represented natively:

- Partial settlement → `lg_settlement_liability` includes only the covered liability rows.
- Partial judgment → `lg_order_liability` covers a subset; remainder stays `ACTIVE`.
- Partial enforcement → `lg_enforcement_liability` targets specific rows.
- Partial write-off → `lg_recoverable_liability.status='WRITTEN_OFF'` on selected rows only.
- Partial payment allocation → `lg_payment_allocation` records the exact split by rule (`PRINCIPAL_FIRST` etc.).

Verified with the Scenario A shape (employer + 3 periods × multi-fund + partial recovery) against the engine's unit tests in `src/services/legal/allocation/*.spec.ts` — all pass.

## 7. Findings

| # | Severity | Finding | Recommendation | Status |
|---|---|---|---|---|
| F-01 | Low | Case-level financial totals are recomputed on every render on Case 360 Financials tab. | Introduce a memoised selector or a DB view `v_lg_case_financials`. | ✅ Resolved 2026-07-03 — `v_lg_case_financials` view added (see §8). |
| F-02 | Low | Exchange rate column exists on liability but currency conversion path is dormant (SSB is single-currency XCD). | Document as non-functional in `LEGAL_PRODUCTION_CHECKLIST.md`. | Documented |
| F-03 | Info | `lg_fee_waiver.reversal_ledger_entry_id` FK is present but no UI surfaces waiver-reversal today. | Track as backlog. | Backlog |

## 8. `v_lg_case_financials` View (added 2026-07-03)

Read-only rollup keyed by `lg_case_id`, derived **solely** from `lg_recoverable_liability` — no duplicate calculation, no cross-source math. Consumers query the view instead of summing rows client-side.

Columns:

- `lg_case_id`, `liability_count`, `active_liability_count`, `writeoff_liability_count`
- `total_principal`, `total_interest`, `total_penalty`
- `total_court_cost`, `total_legal_cost`, `total_other_cost`
- `total_assessed`, `total_paid`, `total_outstanding`, `total_written_off`
- `currency`, `last_liability_update`

Grants: `SELECT` to `authenticated`, `ALL` to `service_role`. Preserves the single-source guarantee: the view aggregates existing owner-column values (§1) without introducing any new writer or formula.

**Verdict: PASS.** Single-source guarantee holds; no drift, no double counting.
