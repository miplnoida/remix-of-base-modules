# BN Configurable Calculation Framework

Goal: every rate, tier, matrix, band, share, cap, threshold, and grant scale lives in DB tables and is editable via UI. Formula Library holds logic only; Product Catalog binds products to formulas + tables + parameters; Calculation Engine resolves at runtime via a safe parser. Legacy in-product `calculationRules.formula` / hardcoded tiers become demo-only and stop driving Workbench.

Delivered in 7 phases. Each phase ends with a working slice; legacy paths stay readable until Phase 7 flips Workbench to the new engine.

---

## Phase 1 — Legacy audit & quarantine

Files already touching legacy calc surface (from scan):
- `src/services/bn/calculationEngine.ts`, `simulationService.ts`, `runProductCalculation.ts`, `productCalculationLoader.ts`, `determinationService.ts`, `productActivationValidator.ts`, `configurationValidationService.ts`
- `src/components/bn/config/CalculationBuilder.tsx`, `bn/determination/CalculationLinesPanel.tsx`, `bn/simulation/*`
- `src/pages/bn/config/FormulaConfiguration.tsx`, `bn/engine/CalculationWorkspace.tsx`, `bn/approval/AdjudicationWorkspace.tsx`, `bn/claims/BenefitDetermination.tsx`, `nbenefit/config/BenefitRuleEditor.tsx`, `nbenefit/config/CalculationRulesTab.tsx`
- `src/types/benefitRulesConfig.ts`, `services/benefitRulesConfigService.ts`, `MOCK_BENEFIT_RULES`

Deliverables:
- Produce `docs/bn/calc-legacy-inventory.md` enumerating every reference, marking each as `KEEP-READ`, `MIGRATE`, or `RETIRE`.
- Tag legacy `bn_product_version.calculation_config` / `calculation_config_legacy` reads with `[LEGACY]` console warning in dev only.
- Compliance module's `CalculationRuleDialog` / `RuleSimulator` are **out of scope** — they belong to compliance, not BN.

## Phase 2 — Schema (single migration set)

Existing tables to extend: `bn_formula_template`, `bn_formula_variable_registry`, `bn_product_parameter`, `bn_derived_fact`.

New tables (all with GRANTs to `authenticated` + `service_role`, RLS off per project rule):

1. `bn_formula_version` — versioned formula bodies. Cols: `id`, `formula_template_id` FK, `formula_code`, `version_no`, `expression_type` (SIMPLE_EXPRESSION | RATE_TABLE_LOOKUP | MATRIX_LOOKUP | MULTI_STEP | CONDITIONAL), `expression` (text — single expr) or `steps_json` (jsonb — for MULTI_STEP/CONDITIONAL), `output_variable`, `rounding_rule`, `governance_status`, `effective_from/to`, `is_active`, audit cols.
2. `bn_rate_table` — header: `table_code` (UNIQUE per country+version), `table_name`, `table_type` (TIER | RATE_TABLE | MATRIX | FLAT | LOOKUP | CAP_TABLE | SHARE_TABLE | CONDITION_TABLE), `lookup_mode` (FIRST_MATCH | EXACT_MATCH | RANGE_MATCH | MATRIX_MATCH), `country_code`, `version_no`, `effective_from/to`, `status`, `legal_reference`, audit.
3. `bn_rate_table_dimension` — `rate_table_id` FK, `dimension_key`, `dimension_label`, `dimension_type` (NUMBER|DATE|TEXT|ENUM|BOOLEAN), `match_type` (RANGE|EXACT|IN), `sequence_no`.
4. `bn_rate_table_row` — `rate_table_id`, `row_order`, `dimension_values_json`, `output_key`, `output_value` (numeric), `output_text`, `output_type` (PERCENTAGE|AMOUNT|RATE|MULTIPLIER|FLAG|TEXT), `effective_from/to`, `notes`.
5. `bn_product_formula_binding` — `product_id`, `product_version_id`, `formula_template_id`, `formula_version_id`, `calculation_stage` (PRIMARY|CAP|ARREARS|PRORATION|BENEFICIARY_SPLIT|FINAL), `sequence_no`, `output_variable`, `rounding_rule`, `is_active`.
6. `bn_product_formula_variable_mapping` — `binding_id` FK, `variable_name`, `source_type` (FACT|DERIVED_FACT|PRODUCT_PARAMETER|RATE_TABLE|MATRIX_TABLE|PRIOR_FORMULA_RESULT|CLAIM_FIELD|MANUAL_INPUT|CONSTANT), `source_key`, `rate_table_code`, `required`, `default_value`.
7. `bn_calculation_trace` — runtime trace: `claim_id`, `product_version_id`, `formula_binding_id`, `formula_code`, `formula_version`, `input_values_json`, `lookup_trace_json`, `expression_trace_json`, `result_value`, `rounded_value`, `created_at`, `created_by`.

Validation triggers (not CHECK) on `bn_rate_table_row` for effective-date sanity. Standard `updated_at` triggers.

## Phase 3 — Calculation Engine v2

New module `src/services/bn/calc/` (does not replace `calculationEngine.ts` yet):
- `safeExpressionParser.ts` — wrap `expr-eval` (already common) or hand-rolled; whitelist ops: `+ - * / %`, `min max floor ceil round abs if`, comparisons, parentheses. Never `eval`.
- `rateTableLookup.ts` — resolves `lookup_rate(code, ...dims)` and `lookup_matrix(code, ...dims)` using `bn_rate_table` + dimensions + rows; honours RANGE/EXACT/IN per dimension `match_type`.
- `variableResolver.ts` — given a binding, resolves each variable per its `source_type` (FACT pulls from claim snapshot, DERIVED_FACT from `bn_derived_fact` runner, PRODUCT_PARAMETER from `bn_product_parameter`, RATE_TABLE returns a callable, PRIOR_FORMULA_RESULT from in-run scope, CONSTANT inline).
- `formulaRunner.ts` — executes by `expression_type`:
  - SIMPLE_EXPRESSION → parse + eval
  - RATE_TABLE_LOOKUP / MATRIX_LOOKUP → lookup → assign to `output_variable`
  - MULTI_STEP → ordered `steps_json` (each step is one of the above; results scoped per step)
  - CONDITIONAL → `if cond then formulaA else formulaB`
- `runProductCalculationV2.ts` — orchestrates all bindings for a product in `sequence_no` order, applies stage logic (CAP after PRIMARY, BENEFICIARY_SPLIT for survivors), writes `bn_calculation_trace`.

Rounding centralised; output coerced to `output_type` (percentage stored as decimal 0.65 not 65).

## Phase 4 — Seed data (migration + data-only inserts)

- Variable registry: seed the 28 variables listed in the request (idempotent upsert by `variable_code`).
- Derived facts: `contribution.units`, `contribution.additional_units`, `claim.payable_weeks`, `survivor.total_share`.
- Rate tables:
  - `AGE_PENSION_RATE_TABLE` (7 rows, RANGE on `total_contribution_weeks`)
  - `SURVIVOR_SHARE_MATRIX` (EXACT on `beneficiary_type`, RANGE on `beneficiary_count`)
  - `DISABLEMENT_RATE_TABLE` (RANGE on `disablement_percentage`, two bands seeded)
  - `MEDICAL_REIMBURSEMENT_CAP_TABLE` (EXACT on `expense_type` + `provider_type`)
- Formula templates + versions: `PCT_AVG_WEEKLY_WAGE`, `AGE_PENSION_RATE_LOOKUP`, `AGE_GRANT`, `SURVIVOR_SPLIT`, `FUNERAL_GRANT`, `NCP_FLAT_RATE`, `EI_DISABLEMENT`, `MEDICAL_REIMBURSEMENT`.
- Product bindings + variable mappings for SKN: Age Pension, Age Grant, Sickness, Maternity, Survivors, Funeral, NCP, Employment Injury per spec section 9.

All seed rows tagged with `SEED-` prefix in `notes` / codes per project rule.

## Phase 5 — Configuration UI

New route group under `Benefits Management → Configuration → Calculation Setup` (`/bn/config/calculation`). Tabs:

1. **Formula Library** — list templates, version drawer, simulate-on-sample, governance status flow.
2. **Variable Registry** — table of `bn_formula_variable_registry` with CRUD.
3. **Rate / Tier Tables** — list + editor:
   - Header form (code, type, dates, legal ref)
   - Dimensions sub-grid (add/remove/order)
   - Rows grid driven by dimensions; per-row editor with range pickers
   - CSV/Excel import (paste or upload → preview → commit)
   - Gap/overlap validator (ranges per dimension)
   - Version / retire actions
   - Preview lookup: input dims → show matched row
4. **Matrix Tables** — same editor flagged `MATRIX_MATCH`.
5. **Product Parameters** — per-product parameter editor (already partly exists; extend with effective dating + legal ref).
6. **Product Formula Bindings** — per-product version:
   - Pick formula → stage → sequence
   - Variable mapping grid (auto-rows from formula's required variables)
   - Cap/min/max + rounding
   - "Run simulation" using sample values
   - Trace viewer (step-by-step)
7. **Simulation** — standalone scenario runner that writes to existing `bn_sim_*` tables, now driven by v2 engine.
8. **Validation** — runs the validators below, shows blockers.

All forms follow project standards: `SearchableSelect`, `noValidate`, `ValidationSummary`, character counters, configurable date format, audit fields use logged-in `user_code`.

## Phase 6 — Product Catalog tab replacement

In `bn_product_version` editor, replace raw JSON / formula-string editor with a "Calculation" panel that lists bindings (read-write via the screens from Phase 5). Show a read-only `[LEGACY]` accordion for any product still carrying `calculation_config_legacy`. Block activation if validators fail.

## Phase 7 — Workbench cutover + retirement

- Switch `BenefitDetermination`, `AdjudicationWorkspace`, `CalculationWorkspace` to call `runProductCalculationV2`.
- Workbench Calculation Lines panel renders from `bn_calculation_trace` (matched row, expression trace, rounded value).
- Remove `MOCK_BENEFIT_RULES` reads from active code paths (keep file with a banner exporting empty for any demo screen that still imports it).
- Audit hooks: rate table create/edit/version, matrix row CRUD, formula change, binding change, simulation run, calc execution — all into `system_audit_trail` via existing audit interceptor.
- Final validators added to product activation pipeline:
  - Formula vars all registered; expression parses; lookup tables exist; dimensions match
  - Rate tables: no overlap, no gap (unless `allow_gaps` flag), active table has rows, dates valid, output type matches variable
  - Product: binding exists; all vars mapped; parameters populated; simulation passes; no legacy `calculation_config.formula` in use
- Test fixtures (vitest) for the five sample cases (Age Pension=400, Age Grant=15000, Sickness=390, Survivor=200, Medical=1000).

## Technical notes

- Knowledge repo + auto test cases per project rule: every new screen gets a knowledge entry and a generated vitest case under `src/__tests__/bn-calc/`.
- No RLS; role gate via existing `benefits_management` / new `manage_calculation_setup` permission added to `app_modules` + `role_permissions`.
- Sidebar entry added to `benefitsMenuItems.ts` under "Settings".
- All audit `*_by` cols populated with logged-in `user_code` per project rule.
- Number/date handling uses existing `format-config` utilities; effective dates stored `yyyy-MM-dd`.

## Open question before build

1. **Scope of cutover in this build pass** — implement Phases 1-5 (foundation + UI + seed) and stub Phase 6/7 Workbench wiring behind a feature flag, or push straight through all 7 phases in one go? Recommend Phases 1-5 first so legacy Workbench keeps working while testers exercise the new config screens.

If you say "all 7", I'll proceed with the full cutover and ship the Workbench flip in the same build.
