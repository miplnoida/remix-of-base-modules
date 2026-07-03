# Legal V1 — UAT Financial Validation

**Version:** 1.0  
**Source of truth:** `v_lg_case_financials` (rolled up from `lg_recoverable_liability`).

---

## 1. Invariants (must hold for every matter)

| Invariant | SQL check | Expected |
|---|---|---|
| Outstanding = Assessed − Paid − Written-off | `select id from lg_recoverable_liability where outstanding <> total_assessed - paid - coalesce(written_off,0)` | 0 rows |
| Paid = Σ allocations | `select liability_id from lg_payment_allocation group by liability_id having sum(amount) <> (select paid from lg_recoverable_liability where id = liability_id)` | 0 rows |
| Case snapshot = view total | `lg_case.total_outstanding = v_lg_case_financials.total_outstanding` | 0 mismatches |
| No negative outstanding | `select id from lg_recoverable_liability where outstanding < 0` | 0 rows |
| Appeal recovery impact excluded from view | Documented — `lg_appeal.recovery_impact_amount` NOT summed into `v_lg_case_financials` | manual |

---

## 2. Seeded matter reconciliation

| Matter | Liabs | Assessed | Paid | Outstanding | Reconciled? |
|---|---|---|---|---|---|
| SEED-LG-2026-0001 | 3 | 51,750.00 | 25,875.00 | 25,875.00 | ☐ |
| SEED-LG-2026-0002 | 2 | 34,500.00 | 11,500.00 | 23,000.00 | ☐ |
| SEED-LG-2026-0003 | 1 |  8,500.00 |  8,500.00 |      0.00 | ☐ |
| LG-SKN-2026-000017 | expected from CE-2024-0002 | see referral | 0 | = assessed | ☐ |
| LG-SKN-2026-000018 | expected from CE-2024-0007 | see referral | 0 | = assessed | ☐ |
| LG-SKN-2026-000019 | 5 | 19,000.00 | 0 | 19,000.00 | ☐ |

---

## 3. Financial UAT tests

### FIN-001 · Assessed total after intake acceptance matches referral sum
- **Matter:** LG-SKN-2026-000019
- **Steps:** Sum `core_legal_referral_item.amount` where referral = CMP-LR-SKN-2026-000004.
- **Expected:** = `v_lg_case_financials.total_assessed`.

### FIN-002 · Partial payment reduces outstanding
- **Matter:** SEED-LG-2026-0001
- **Expected:** Outstanding = 25,875.00.

### FIN-003 · Fully paid liability shows zero outstanding
- **Matter:** SEED-LG-2026-0003.

### FIN-004 · Enforcement partial recovery updates paid
- **Matter:** SEED-LG-2026-0002; verify allocations sum.

### FIN-005 · Consent order installment payment allocates to liability
- **Matter:** SEED-LG-2026-0003.

### FIN-006 · Interest liability accrual respects parent period

### FIN-007 · Penalty computed from policy rate (spot check)

### FIN-008 · Write-off flow updates `total_written_off`

### FIN-009 · Legal costs excluded from `v_lg_case_financials`
- **Expected:** `lg_legal_cost.amount` NOT summed into case totals.

### FIN-010 · Appeal `recovery_impact_amount` excluded from view

### FIN-011 · Snapshot refresh (`refreshFinancialSnapshot`) uses view first
- **Method:** disable view row → confirm fallback reads `lg_recoverable_liability` directly.

### FIN-012 · Dashboard total matches SUM(v_lg_case_financials.total_outstanding)

### FIN-013 · Currency formatting matches system config (2dp, thousands sep)

### FIN-014 · Payment cannot exceed outstanding — see UAT-N-007

### FIN-015 · Concurrent enrichment is idempotent — see UAT-N-018

---

## 4. Sign-off

Financial validation is **PASS** when:
- All invariants in §1 return 0 rows.
- Every seeded matter in §2 reconciles to the view.
- FIN-001..015 all pass in `UAT_EXECUTION_TRACKER.md`.
