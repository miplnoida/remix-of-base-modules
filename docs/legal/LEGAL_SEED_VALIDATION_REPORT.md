# Legal Seed Validation Report

**Date:** 2026-07-03
**Environment:** Test / UAT
**Script set:** `scripts/legal/01_reset.sql` → `02_master_seed.sql` → `03_uat_seed.sql` → `05_extra_scenarios.sql` → `04_validate.sql`

## Expected counts after seeding

| Table | Expected |
|---|---|
| `lg_case` | 3 |
| `lg_case_intake` | 3 |
| `ce_legal_referrals` | 2 |
| `bn_legal_referral` | 1 |
| `lg_case_party` | 3 |
| `lg_recoverable_liability` | 6 |
| `lg_hearing` | 2 |
| `lg_order` | 2 |
| `lg_consent_order` | 1 |
| `lg_consent_installment` | 6 |
| `lg_settlement` | 1 |
| `lg_recovery_assignment` | 1 |
| `lg_payment_allocation` | 6 |
| `lg_appeal` | 1 |
| `lg_appeal_liability` | 2 |
| `lg_enforcement_action` | 1 |
| `lg_enforcement_liability` | 2 |
| `lg_external_counsel` | 1 |
| `lg_external_counsel_engagement` | 1 |
| `lg_court_filing` | 1 |
| `lg_legal_cost` | 2 |
| `lg_case_activity` | 16 |
| junction rows (all) | ≥ 19 |


## Referential checks (from `04_validate.sql`)

| Check | Expected |
|---|---|
| Cases with no party | 0 rows |
| Non-advisory cases with no liability | 0 rows |
| Liabilities missing fund/liability type | 0 rows |
| Contribution liabilities missing period | 0 rows |
| Orphan hearings / orders / settlements | 0 rows |
| Liability `paid` ≠ Σ allocations | 0 rows |
| Liability `outstanding` ≠ `total_assessed - paid` | 0 rows |
| Case snapshot ≠ `v_lg_case_financials.total_outstanding` | 0 rows |

## Case-level rollup (via `v_lg_case_financials`)

| Case | Liabs | Assessed | Paid | Outstanding |
|---|---|---|---|---|
| SEED-LG-2026-0001 | 3 | 51,750.00 | 25,875.00 | 25,875.00 |
| SEED-LG-2026-0002 | 2 | 34,500.00 | 11,500.00 | 23,000.00 |
| SEED-LG-2026-0003 | 1 |  8,500.00 |  8,500.00 |      0.00 |

## Screens to validate

Sign off after visually confirming seeded data appears correctly on:

- Legal Dashboard / Command Centre — 3 cases visible with correct outstanding totals.
- Referrals — 2 CE + 1 BN referrals, all `ACCEPTED`/`APPROVED`.
- Intake & Qualification — 3 intakes, all `APPROVED` / `QUALIFIED`.
- Matter Workspace / Case 360 — each case shows party, liabilities, timeline.
- Recoverable Liabilities tab — 6 liabilities with fund + period.
- Recovery Workbench — 1 active assignment (SKN Construction).
- Court Operations / Hearings — 2 completed hearings.
- Judicial Orders — 2 orders (1 JUDGMENT, 1 CONSENT_ORDER).
- Consent Orders — 1 order, `BREACHED`, 6 installments.
- Legal Settlements — 1 `AGREED` settlement.
- Reports / Financial rollups — reconcile to the table above.

## Typecheck

`tsgo --noEmit` remains clean — no source changes were made by this seed pack.
