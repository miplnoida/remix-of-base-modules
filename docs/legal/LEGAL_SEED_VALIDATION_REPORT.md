# Legal Seed Validation Report

**Date:** 2026-07-03
**Environment:** Test / UAT
**Method:** Seed data inserted **directly into the Test database** via Lovable database tool (no script execution needed on the user side). Reference scripts under `scripts/legal/` are retained for documentation only.

## Actual counts (verified post-insert)

| Table | Count |
|---|---|
| lg_case | 3 |
| lg_case_intake | 3 |
| ce_legal_referrals | 2 |
| bn_legal_referral | 1 |
| lg_case_party | 3 |
| lg_recoverable_liability | 6 |
| lg_hearing | 2 |
| lg_order | 2 |
| lg_consent_order | 1 |
| lg_consent_installment | 6 |
| lg_settlement | 1 |
| lg_recovery_assignment | 1 |
| lg_recovery_assignment_liability | 3 |
| lg_payment_allocation | 6 |
| lg_appeal | 1 |
| lg_appeal_liability | 2 |
| lg_enforcement_action | 1 |
| lg_enforcement_liability | 2 |
| lg_external_counsel | 1 |
| lg_external_counsel_engagement | 1 |
| lg_court_filing | 1 |
| lg_legal_cost | 2 |
| lg_case_activity | 18 |

## Referential validation — ALL PASS (0 rows returned)

- cases_no_party, nonadv_cases_no_liab, liab_missing_fund_type, contrib_no_period
- orphan_hearing / order / settlement / appeal / enforcement / filing / engagement / legal_cost
- orphan_recovery_assign_liab
- paid ↔ Σ allocations mismatch
- outstanding = total_assessed − paid
- case snapshot vs `v_lg_case_financials`

## Case-level rollup (verified via v_lg_case_financials)

| Case | Liabs | Assessed | Paid | Outstanding |
|---|---|---|---|---|
| SEED-LG-2026-0001 | 3 | 51,750.00 | 25,875.00 | 25,875.00 |
| SEED-LG-2026-0002 | 2 | 34,500.00 | 11,500.00 | 23,000.00 |
| SEED-LG-2026-0003 | 1 |  8,500.00 |  8,500.00 |      0.00 |

## Runtime deviations from reference scripts

The following schema-driven adjustments were applied during direct insertion (reference scripts have not been rewritten):

- `lg_case_intake.qualification_status` must be `APPROVED` (not `QUALIFIED`) to satisfy the `lg_case_intake_gate` trigger before creating a case.
- Court FK values use existing master rows `MC-BAS` and `HC-SKN` (dash-form), not the `MC_BAS` / `HC_BAS` underscore-form referenced in scripts.
- `lg_recovery_assignment` has no `lg_case_id` / `assigned_officer_id` columns in this schema — case linkage runs solely through `lg_recovery_assignment_liability`.
- `lg_case_activity` uses `performed_at` + `occurred_at` (no `ts` or `created_at`); `entity_id` is `varchar` so UUIDs are cast to text.
- `bn_legal_referral.status` must be `ACCEPTED_BY_LEGAL` (not `ACCEPTED`).

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
| Orphan appeals / enforcement / filings / counsel engagements / legal costs | 0 rows |
| Orders with appeal/enforcement but no case liabilities | 0 rows |

## Case-level rollup (via `v_lg_case_financials`)

| Case | Liabs | Assessed | Paid | Outstanding |
|---|---|---|---|---|
| SEED-LG-2026-0001 | 3 | 51,750.00 | 25,875.00 | 25,875.00 |
| SEED-LG-2026-0002 | 2 | 34,500.00 | 11,500.00 | 23,000.00 |
| SEED-LG-2026-0003 | 1 |  8,500.00 |  8,500.00 |      0.00 |

> Note: Scenarios 4–6 do **not** alter case-level financial totals. Appeal impact (`recovery_impact_amount`) and legal costs (`lg_legal_cost.amount`) are tracked on their own tables and are intentionally excluded from `v_lg_case_financials` to preserve `lg_recoverable_liability` as the single source of financial truth.

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
- Appeals — 1 appeal, `DECIDED / PARTIALLY_ALLOWED`, linked to S1 order.
- Enforcement — 1 `PARTIAL_RECOVERY` garnishment on S2 order.
- External Counsel — 1 active engagement, 1 court filing, 1 pending-award legal cost.
- Legal Costs — 2 rows (enforcement fee + counsel fee) linked to filings/engagements.
- Reports / Financial rollups — reconcile to the table above.

## Typecheck

`tsgo --noEmit` remains clean — no source changes were made by this seed pack.

