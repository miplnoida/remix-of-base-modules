# Compliance E2E — Batch 4 Execution Report

**Date:** 2026-07-15
**Scope:** Arrangements + Waivers lifecycle for UAT employers `U01001`–`U01003`.
**Prereqs:** Batch 1 (ledger) ✅, Batch 2 (violations + notices) ✅, Batch 3 (cases) ✅.

---

## 1. Objective

Provide testers with concrete, real data to exercise **payment arrangements** and
**waivers** end-to-end, and close open configuration gap **G1** (`ce_waiver_rules`
was empty).

## 2. Actions performed

### 2.1 Waiver rules — closes Gap G1

Seeded 3 baseline rules into `ce_waiver_rules`:

| Code | Waiver type | Max % | Purpose |
|------|-------------|:-----:|---------|
| `WR-PENALTY-PARTIAL` | PENALTY  | 50%  | First-offence / hardship penalty relief (≤ $10 000) |
| `WR-INTEREST-FULL`   | INTEREST | 100% | Full interest waiver when arrangement is signed |
| `WR-FEE-DISCRETION`  | FEE      | 100% | Discretionary admin-fee waiver (≤ $1 000) |

All three are `enabled = true`, require approval workflow, and require audit.

### 2.2 Payment arrangements

Created on the three UAT PAYMENT cases so each lifecycle branch is testable:

| Arrangement | Employer | Case | Status | Debt | Down | Instalment × N | Notes |
|-------------|:--------:|------|:------:|-----:|-----:|:---------------|-------|
| `PA-UAT-2026-0001` | U01001 | `CC-2026-f3856b` | **ACTIVE**   | 9 300.00 | 930.00 | 697.50 × 12 | Approved, signed, on-time |
| `PA-UAT-2026-0002` | U01002 | `CC-2026-210a99` | **DRAFT**    | 9 300.00 | 500.00 | 733.33 × 12 | Awaiting approval + signature |
| `PA-UAT-2026-0003` | U01003 | `CC-2026-0d41e6` | **BREACHED** | 7 750.00 | 775.00 | 580.00 × 12 | 3 missed instalments, breach flagged |

### 2.3 Waivers

Created 3 waiver applications, one per lifecycle branch, all linked to a UAT
LATE_FILING violation and their parent case:

| Waiver | Employer | Type | Rule | Status | Requested | Approved |
|--------|:--------:|------|------|:------:|----------:|---------:|
| `WV-UAT-2026-0001` | U01001 | PENALTY  | `WR-PENALTY-PARTIAL` | **PENDING**  | 2 500 | — |
| `WV-UAT-2026-0002` | U01002 | INTEREST | `WR-INTEREST-FULL`   | **APPROVED** | 1 800 | 1 800 |
| `WV-UAT-2026-0003` | U01003 | PENALTY  | `WR-PENALTY-PARTIAL` | **REJECTED** | 3 000 | 0 |

Reviewer/approver actor codes: `UAT_REV` / `UAT_APR`.

## 3. Verification SQL (for testers)

```sql
-- Waiver rules
SELECT code, name, waiver_type, max_percentage, enabled FROM ce_waiver_rules ORDER BY sort_order;

-- UAT arrangements
SELECT arrangement_number, employer_id, status, total_debt, installment_amount,
       number_of_installments, missed_payments, breach_detected
FROM ce_payment_arrangements
WHERE employer_id LIKE 'U010%' ORDER BY arrangement_number;

-- UAT waivers linked to rules + violations
SELECT w.waiver_number, w.employer_id, w.waiver_type, r.code AS rule_code,
       w.status, w.amount_requested, w.amount_approved,
       v.violation_number, c.case_number
FROM ce_waivers w
LEFT JOIN ce_waiver_rules r  ON r.id = w.waiver_rule_id
LEFT JOIN ce_violations v    ON v.id = w.violation_id
LEFT JOIN ce_cases c         ON c.id = w.case_id
WHERE w.employer_id LIKE 'U010%'
ORDER BY w.waiver_number;
```

## 4. Manual acceptance checklist

- [ ] `Compliance → Admin → Waiver Rules` shows the 3 seeded rules.
- [ ] `Compliance → Arrangements` lists the 3 UAT arrangements with correct status badges (ACTIVE / DRAFT / BREACHED).
- [ ] Open **PA-UAT-2026-0002** and exercise: approve → sign → activate. Confirm status transitions and `approved_at` / `signed_at` are set.
- [ ] Open **PA-UAT-2026-0003** (BREACHED) — verify breach banner, breach date, `missed_payments = 3`. Trigger the breach-monitoring workflow if the UI exposes it.
- [ ] `Compliance → Waivers` shows the 3 UAT waivers on the correct case cards.
- [ ] Open **WV-UAT-2026-0001** (PENDING) and complete: reviewer decision → approver decision → applied. Confirm `applied_at` populates and `ce_case_history` / audit tables receive rows.
- [ ] Confirm **WV-UAT-2026-0002** displays as fully APPROVED with reviewer + approver comments visible.
- [ ] Confirm **WV-UAT-2026-0003** displays REJECTED with `rejected_reason` visible on the detail screen.

## 5. Batch 4 results

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| `ce_waiver_rules` populated | 3 | 3 | ✅ |
| UAT arrangements created  | 3 | 3 | ✅ |
| Arrangement status coverage | ACTIVE / DRAFT / BREACHED | all present | ✅ |
| UAT waivers created | 3 | 3 | ✅ |
| Waiver status coverage | PENDING / APPROVED / REJECTED | all present | ✅ |
| Waivers linked to rules | 3 | 3 | ✅ |
| Waivers linked to cases + violations | 3 | 3 | ✅ |

## 6. Gaps identified

| ID | Severity | Area | Summary |
|----|:--------:|------|---------|
| G19 | Low | Config UX | `ce_waiver_rules` has no admin CRUD surface yet (Gap G3 still open). Rules were seeded via SQL. |
| G20 | Medium | Breach engine | Setting `breach_detected = true` did not automatically insert a `ce_arrangement_breaches` row — the monitoring routine is either scheduled or not wired to the flag change. Needs confirmation. |
| G21 | Low | Waivers → ledger | Approved waiver `WV-UAT-2026-0002` (1 800) has `applied_at` set but no offsetting entry in `ce_employer_financial_ledger`. Confirm whether waiver application should create a credit line. |

Gaps G1 (empty waiver_rules) is now **Fixed**. G20 and G21 added to the register.

## 7. Status

**Batch 4 (Arrangements + Waivers): ✅ Complete.**
Ready for manual acceptance and (once approved) **Batch 5 — Legal handoff, reports, and regression**.

Files produced:
- Inserts recorded under `UAT_B4` `created_by` tag on: `ce_waiver_rules`, `ce_payment_arrangements`, `ce_waivers`.
- This report: `docs/compliance/uat/BATCH_4_EXECUTION_REPORT.md`.
