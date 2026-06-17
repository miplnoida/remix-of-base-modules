# Product Catalogue → Formula Library Migration

Scope is large enough that I want sign-off before shipping. The plan below is sequenced so each phase is independently reviewable, with the build staying green between phases.

## Current state (audit)

Legacy calc still lives in these files (all to be quarantined out of runtime):

- `src/types/benefitRulesConfig.ts` — `calculationRules.formula`, `variables[]`, `tiers[]`, `rateTables[]`
- `src/services/benefitRulesConfigService.ts` — `MOCK_BENEFIT_RULES` with `{AWE}`, `{AIW}`, `{PensionRate}`, `{TotalContributions}`, hardcoded `0.65`, `6`, tier table for Age Pension
- `src/components/nbenefit/config/FormulaBuilder.tsx`, `CalculationRulesTab.tsx`, `AddCalculationDialog.tsx` — legacy editors
- `src/pages/nbenefit/config/BenefitRulesList.tsx`, `BenefitRuleEditor.tsx`, `src/components/nbenefit/config/PreviewTestTab.tsx` — legacy consumers

The new engine (Phases 1–5 already shipped) provides: `bn_formula_template`, `bn_formula_version`, `bn_formula_variable_registry`, `bn_product_formula_binding`, `bn_product_formula_variable_mapping`, `bn_rate_table*`, `bn_medical_tariff_*`, `runProductCalculationV2`, `medicalTariffLookup`. Phase 4 added `CalculationV2Panel` as the default Calculation tab on Product Catalogue.

What's missing: the legacy `nbenefit/config` editor surface still references `benefitRulesConfigService`, and there are no `bn_product_formula_binding` rows seeded for the standard products (Sickness, Maternity, EI Temp, EI Disablement, Age Pension, Age Grant, Survivor, Funeral, NCP, Medical Reimbursement). So Product Catalogue is "ready" but no product is actually bound.

## Phase A — Fact + parameter registry (migration + seed)

- Verify/extend `bn_formula_variable_registry` with the contribution / derived / medical facts listed in section 3.
- Insert missing rows in `bn_derived_fact` for `contribution.units`, `contribution.additional_units`, `claim.payable_weeks`, `claim.approved_days`, `claim.days_payable`.
- Insert `bn_product_parameter` definitions for the per-product parameters (`sickness_replacement_rate`, `maternity_replacement_rate`, `ei_temporary_replacement_rate`, `payable_days_per_week`, `waiting_days`, `max_duration_weeks`, `age_grant_weeks_multiplier`, `contribution_unit_size`, `funeral_grant_amount`, `ncp_flat_weekly_rate`, caps).

## Phase B — Rate / matrix tables (seed data, `SEED-` prefix)

- `AGE_PENSION_RATE_TABLE` rows for the 500–2000+ tiers (configurable, no hardcoding in TS).
- `DISABLEMENT_RATE_TABLE` rows (already partially seeded — top up if missing).
- `SURVIVOR_SHARE_MATRIX` rows for beneficiary type × count.
- Medical tariff rows already seeded in earlier phase; verify MRI / cardiac / dialysis examples remain.

## Phase C — Formula templates + versions

For each benefit, ensure a `bn_formula_template` + active `bn_formula_version` exists with the right `steps_json`:

| Benefit | Template code | Steps |
|---|---|---|
| Sickness | `PCT_AVG_WEEKLY_WAGE` | `awe * replacement_rate`, daily proration |
| Maternity | `PCT_AVG_WEEKLY_WAGE` | same |
| EI Temporary | `EI_TEMPORARY_DISABLEMENT` | `awe * rate * approved_days/days_per_week` |
| EI Disablement | `EI_DISABLEMENT` | `RATE_LOOKUP` → multiply |
| Age Pension | `AGE_PENSION_RATE_LOOKUP` | `RATE_LOOKUP(total_weeks)` → `aiw * rate` → caps → monthly conversion |
| Age Grant | `AGE_GRANT` | `awe * multiplier * floor(weeks/unit_size)` |
| Survivor | `SURVIVOR_SPLIT` | `MATRIX_LOOKUP` → `base * share` → family cap |
| Funeral | `FIXED_GRANT_AMOUNT` | `grant_amount` |
| NCP | `NCP_FLAT_RATE` | `flat_weekly_rate` (+ monthly conv) |
| Medical Reimbursement | `MEDICAL_REIMBURSEMENT` | `MEDICAL_TARIFF_LOOKUP` (already implemented) |

## Phase D — Product formula bindings + variable mappings

For every active product version: insert `bn_product_formula_binding` + `bn_product_formula_variable_mapping` + `bn_product_parameter` values + linked rate/matrix/tariff table refs. Reference data only — no hardcoded numbers leave the DB.

## Phase E — Runtime cutover

- Delete (or move under `src/services/bn/_legacy/`) `benefitRulesConfigService.ts`, `FormulaBuilder.tsx`, `CalculationRulesTab.tsx`, `AddCalculationDialog.tsx`, `BenefitRulesList.tsx`, `BenefitRuleEditor.tsx`, `PreviewTestTab.tsx`, `types/benefitRulesConfig.ts`. Remove their routes from `AppRoutes`.
- Strengthen `src/__tests__/bn-calc/legacy-guard.test.ts` to fail if any active file outside `_legacy/` imports `benefitRulesConfig*`, contains `MOCK_BENEFIT_RULES`, or uses `{AWE}/{AIW}/{PensionRate}/{TotalContributions}` placeholders.

## Phase F — Product Calculation Readiness report

New screen `src/pages/bn/config/CalculationReadiness.tsx` listing per active product: formula selected, version, required vs mapped variables, missing parameters, linked rate/matrix/tariff tables, last simulation result, "legacy still used" flag. Backed by a single read-only RPC.

## Phase G — Simulation acceptance suite

Add Vitest specs in `src/__tests__/bn-calc/product-bindings.test.ts` covering exactly the cases in section 8:

- Sickness 600 × 0.65 → 390
- Age Pension AIW 1000, weeks 1200 → 400 weekly
- Age Grant AWW 500, weeks 250, size 50, mult 6 → 15 000
- Funeral 2500 → 2500
- Survivor base 400, share 0.5 → 200
- Medical MRI expense 3000 @ 0.80 cap 2000 → 2000

Build must pass and all tests green.

## Technical notes

- All seed rows tagged `SEED-` per project rule.
- No RLS; only role-based security (per project memory).
- Migrations follow the GRANT-first pattern for any new public tables.
- Audit columns use `user_code` VARCHAR(50).
- Phases delivered in order, one at a time, each as its own migration + code drop so you can reject before the next.

## Question before I start

1. Phase E will **delete** the legacy nbenefit/config editor pages entirely (`BenefitRulesList`, `BenefitRuleEditor`, `PreviewTestTab`, `FormulaBuilder`, `CalculationRulesTab`, `AddCalculationDialog`, `benefitRulesConfigService`, `types/benefitRulesConfig.ts`) and remove their sidebar routes — users will only have the new Product Catalogue Calculation tab. Confirm delete vs quarantine to `_legacy/`.
2. Run all phases A–G sequentially without stopping, or pause after each for review?
