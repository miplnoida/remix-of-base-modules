# Formula Library Cutover — Audit

Goal: Formula Library (`bn_formula_template`) is the only place an executable
calculation expression lives. Product Catalog (`bn_product_version`) is
configuration only.

## 1. Storage surfaces (executable formula JSON / expressions)

| Source                                          | Column / field                                   | Status                  | Action                                |
|-------------------------------------------------|--------------------------------------------------|-------------------------|---------------------------------------|
| `bn_formula_template`                           | `formula_expression`, `required_parameters`      | ✅ Canonical             | Keep — single source of truth         |
| `bn_product_version`                            | `formula_template_id`                            | ✅ Canonical reference   | Keep                                  |
| `bn_product_version`                            | `formula_parameter_values` (jsonb)               | ✅ Configuration         | Keep                                  |
| `bn_product_version`                            | `cap_rules`, `rounding_rule`, `effective_date_rule` | ✅ Configuration       | Keep                                  |
| `bn_product_version`                            | `calculation_config` (jsonb)                     | ⚠️ Legacy bag            | Read-only; remove writes; drop in G   |
| `bn_product_version`                            | `calculation_config_legacy` (jsonb)              | ⚠️ Legacy snapshot       | Drop in Phase G                       |
| `bn_calculation_rule`                           | per-rule formula_template_id                     | OK                       | Already references library            |

## 2. Code references to legacy columns (from `rg`)

| File                                                    | Reads | Writes | Action                                |
|---------------------------------------------------------|:-----:|:------:|---------------------------------------|
| `src/components/bn/config/CalculationBuilder.tsx`       |  ✅   |   —    | Phase C — remove legacy panel         |
| `src/services/bn/simulationService.ts`                  |  ✅   |   —    | Phase B — route through loader        |
| `src/services/bn/calculationEngine.ts`                  |  ✅   |   —    | Phase B — route through loader        |
| `src/services/bn/awards/awardCreationService.ts`        |  ✅   |   —    | Phase B                               |
| `src/services/bn/entitlementService.ts`                 |  ✅   |   —    | Phase B                               |
| `src/services/bn/claimWorkbenchService.ts`              |  ✅   |   —    | Phase B                               |
| `src/services/bn/payment/payableValidationService.ts`   |  ✅   |   —    | Phase B                               |
| `src/integrations/supabase/types.ts`                    |  ✅   |   —    | Auto-generated; drops when column drops |

## 3. Runtime consumers

| Consumer                          | Today                                              | Target                                       |
|-----------------------------------|----------------------------------------------------|----------------------------------------------|
| Claim Workbench (simulate panel)  | Reads `formula_template_id` + parameters           | `runProductCalculation()` helper             |
| Entitlement Engine                | Mixed                                              | `runProductCalculation()`                    |
| Award Engine (`computeBaseAmount`) | Mixed                                              | `runProductCalculation()`                    |
| Payment Preparation               | Reads caps & rounding from `bn_product_version`    | `runProductCalculation()`                    |
| Simulation                        | Reads template directly                            | `runProductCalculation()`                    |

## 4. Parameter-name drift (Phase E corrections)

Current `formula_parameter_values` use legacy short names that don't match the
updated `formula_expression` variables. Re-seed to align:

| Product   | Template            | Old params                                | Corrected params                                                        |
|-----------|---------------------|-------------------------------------------|-------------------------------------------------------------------------|
| SKN-SICK  | PCT-AVG-WAGE        | `{rate: 65}`                              | `{replacement_rate: 0.65}`                                              |
| SKN-EI-DIS| EI-DISABLEMENT      | `{rate: 75, degree: 100}`                 | `{replacement_rate: 0.75}` (disablement_percentage is a Fact)           |
| SKN-MAT   | MATERNITY-RATE      | `{rate: 65}`                              | `{}` (formula is fixed at 65/100)                                       |
| SKN-SUR   | SURVIVOR-SPLIT      | `{share_pct: 50}`                         | `{beneficiary_share_percent: 0.50}`                                     |
| SKN-AGE   | TIERED-PENSION      | `{base_rate: 30, increment_rate: 1,…}`    | `{base_rate: 0.30, base_weeks: 500, increment_rate: 0.01, increment_unit_size: 50}` |
| SKN-INV   | TIERED-PENSION      | same                                      | same as SKN-AGE                                                         |
| SKN-FUN   | FUNERAL-GRANT       | `{grant_amount: 7500}`                    | `{grant_amount: 2500}` (per SKN policy)                                 |
| SKN-NCP   | NCP-FLAT-RATE       | `{flat_weekly_rate: 300}`                 | `{flat_weekly_rate: 250}`                                               |
| SKN-EI-MED| FLAT-GRANT          | `{flat_amount: 0}`                        | `{flat_amount: 1500}` (medical expense cap)                             |
| SKN-EI-INJ| *(unset)*           | —                                         | bind to `SHORT_TERM_WITH_WAITING_DAYS`; params: `{waiting_days: 3}`     |

## 5. Acceptance gates

- [ ] `CalculationBuilder` no longer renders a legacy panel.
- [ ] Formula Usage Analysis panel shows all required vs mapped variables.
- [ ] Product activation blocked when any blocker present.
- [ ] All ACTIVE SKN versions have aligned `formula_parameter_values`.
- [ ] Simulation script (Phase F) runs green for every ACTIVE product.
- [ ] `calculation_config_legacy` column dropped (Phase G).
