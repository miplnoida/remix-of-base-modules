# Unified Formula & Calculation Platform — Completion Plan

This finishes the Formula Library → Calculation Setup → Product Catalog → Runtime journey. It reconciles the existing screens, replaces the basic Add Formula dialog with a typed wizard, hardens the lifecycle, and makes Product Catalog consume only ACTIVE formula versions.

## 1. Screen Reconciliation

Single source of truth per concern:

- **Formula Library** (`FormulaConfiguration`) — create, version, govern formulas. Owns the new wizard, version editor, lifecycle actions, test panel.
- **Calculation Setup** (`CalculationSetup`) — manage rate tables, matrix tables, medical tariff source, variable registry, derived facts, product parameters, simulator. No formula CRUD here.
- **Product Catalog → Calculation tab** (`CalculationV2Panel` + `ProductFormulaStepMappings`) — bind ACTIVE formula versions only, map inputs, simulate, save.

Removals / redirects:
- Retire `CalculationBuilder` page route — replace its entry with a deep-link to Formula Library wizard.
- `BindingEditor` becomes an internal component used only by `CalculationV2Panel`.
- `CalculationReadiness` stays as the validation dashboard; rewired to the new checks.

## 2. Add Formula Wizard

New component `AddFormulaWizard.tsx` (8 steps) replaces the current dialog in `FormulaConfiguration`.

Steps:
1. **Type** — SIMPLE_EXPRESSION | RATE_TABLE_LOOKUP | MATRIX_LOOKUP | MEDICAL_TARIFF_LOOKUP | MULTI_STEP | CONDITIONAL.
2. **Identity** — code, name, category, country, legal_ref, description.
3. **Inputs** — multi-source picker (Fact, Derived Fact, Product Parameter, Rate Table, Matrix Table, Medical Tariff, Claim Field, Prior Result, Manual).
4. **Build** — type-specific editor:
   - SIMPLE → existing business expression builder
   - RATE/MATRIX → table + dimension input mapping + output var + post-expression
   - MEDICAL → tariff source + procedure/location/provider/expense mapping
   - MULTI_STEP / CONDITIONAL → reuse `FormulaStepsBuilder` with step palette (LOOKUP / MATRIX / MEDICAL / EXPRESSION / IF / CAP / ROUND).
5. **Output** — variable, type, rounding.
6. **Test data** — sample inputs + expected result.
7. **Validate** — calls `validateFormulaDraft()` (variables registered, tables exist, dimensions match, expression parses, sample simulates).
8. **Save** — inserts `bn_formula_template` + v1 `bn_formula_version` in DRAFT.

Raw `steps_json` editor hidden behind an "Advanced" toggle for power users only.

## 3. Lifecycle Hardening

States: `DRAFT → IN_REVIEW → ACTIVE → RETIRED` (existing RPCs `bn_formula_*`).

Enforced rules:
- Only DRAFT editable (already enforced in `FormulaVersionEditor`).
- ACTIVE never editable; "Edit" on ACTIVE auto-opens New Version → DRAFT (via `LiveVersionGuardDialog`-style prompt).
- Product Catalog binding selector filters to `governance_status = 'ACTIVE'`.
- Retire blocked unless no active bindings reference it OR a replacement ACTIVE version exists.

## 4. Product Catalog Calculation Tab

Update `CalculationV2Panel`:
- Replace any free-text formula JSON with a structured "Add Formula Binding" flow.
- Formula version dropdown shows only ACTIVE versions.
- Use existing `ProductFormulaStepMappings` for per-step variable/table/parameter mapping.
- "Simulate" runs `runProductCalculationV2` with sample variable registry values.
- "Validate" runs reconciliation checks (Section 6) for this product only.
- Persist to `bn_product_formula_binding`, `bn_product_formula_variable_mapping`, `bn_product_parameter`.

## 5. Runtime (`runProductCalculationV2`)

Confirm/extend the existing pipeline:
1. Load `bn_product_formula_binding` for product version + stage.
2. Reject if bound `bn_formula_version.governance_status != 'ACTIVE'`.
3. Resolve facts → derived facts → product parameters → claim fields.
4. Execute rate / matrix / medical lookups via existing resolvers.
5. Run `formulaRunner` for expressions/steps.
6. Apply rounding from output spec.
7. Write `bn_calc_run` + `bn_calc_trace` rows (already wired).

## 6. Validation (`CalculationReadiness` + `BnConfigReconciliationCard`)

Add/confirm checks, surface as FAIL:
- Product still references legacy `calculation_config.formula` JSON.
- Bound formula version not ACTIVE.
- Unmapped variables in `step_mapping_json`.
- Missing product parameters used by formula.
- Referenced rate / matrix / medical tariff source missing or inactive.
- Sample simulation fails for the bound product.

## 7. Seed Examples

Provide migration that ensures these formulas exist as ACTIVE v1 and are bindable:
- **Age Pension** — `RATE_TABLE_LOOKUP(AGE_PENSION_RATE_TABLE)` → `avg_insurable_wage * pension_rate`
- **Age Grant** — `avg_weekly_wage * grant_multiplier * contribution_units`
- **Survivor** — `MATRIX_LOOKUP(SURVIVOR_SHARE_MATRIX)` → `base_pension * share`
- **Medical Reimbursement** — `MEDICAL_TARIFF_LOOKUP` resolver
- **Sickness / Maternity** — `avg_weekly_wage * replacement_rate`

## 8. Acceptance

- Every formula type creatable from the wizard.
- Test panel runs for every type.
- Lifecycle transitions enforced and audited.
- Product Catalog only lists ACTIVE versions.
- Reconciliation surfaces any legacy `calculation_config.formula` usage.
- Seeded examples (Age Pension, Age Grant, Survivor, Medical, Sickness) simulate successfully.
- Workbench trace shows matched rate/matrix/tariff rows.
- TypeScript build passes.

## Technical Details

New / changed files (planned):
- `src/components/bn/config/AddFormulaWizard.tsx` (new)
- `src/components/bn/config/wizard/Step*.tsx` (8 step components)
- `src/services/bn/validateFormulaDraft.ts` (new)
- `src/pages/bn/config/FormulaConfiguration.tsx` (mount wizard, remove old dialog)
- `src/components/bn/config/CalculationV2Panel.tsx` (ACTIVE-only filter, simulate/validate buttons)
- `src/services/bn/calc/runProductCalculationV2.ts` (ACTIVE guard, trace stamping)
- `src/services/bn/bnConfigurationReconciliationService.ts` (add legacy-formula + unmapped-variable checks)
- `src/pages/bn/config/CalculationSetup.tsx` (remove formula CRUD entry points)
- `src/config/routes.ts` (retire `CalculationBuilder` route)
- `supabase/migrations/<ts>_seed_core_active_formulas.sql` (idempotent seed of 5 examples)

Database touch points (no destructive changes):
- `bn_formula_template`, `bn_formula_version` (insert via wizard / seed)
- `bn_product_formula_binding`, `bn_product_formula_variable_mapping`, `bn_product_parameter` (writes from Calc tab)
- `bn_rate_table*`, `bn_medical_reimbursement_limit` (read only)
- `bn_calc_run`, `bn_calc_trace` (writes at runtime)

Knowledge repo: add `docs/bn/formula-platform.md` describing the unified flow + version history entry, plus regenerate test cases for wizard, lifecycle guard, and ACTIVE-only binding (per project knowledge entry 8).

Estimated work: 4 slices — Wizard, Lifecycle/Library wiring, Product Catalog tightening, Validation+Seed. I'll ship them sequentially and stop for review after each.