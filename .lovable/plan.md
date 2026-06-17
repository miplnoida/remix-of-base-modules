## BN Configuration Reconciliation — Implementation Plan

Runtime (formulaRunner, resolver, schemas, seeds) is already complete. This plan covers the UI + validation layers across four shippable slices, in order.

---

### Slice 1 — Rate / Matrix Tables management UI

Route: `/bn/config/calculation?tab=rate-tables` (existing tab, currently placeholder).

New files:
- `src/services/bn/rateTableService.ts` — list/get/upsert table, dimensions, rows; bulk import CSV; status transitions.
- `src/hooks/bn/useRateTables.ts` — list + selected-table queries, mutations with cache invalidation.
- `src/pages/bn/config/RateTablesList.tsx` — searchable table grid (code, type, status, version, row count).
- `src/pages/bn/config/RateTableEditor.tsx` — three-pane editor:
  - Header (code, type TIER/RATE_TABLE/MATRIX/CAP_TABLE/SHARE_TABLE/CONDITION_TABLE, country, version, status, effective dates).
  - Dimensions grid (key, label, type, match_type RANGE/EXACT/IN, sequence).
  - Rows grid — dynamic columns per dimension, output_key / output_value / output_type / effective dates.
- `src/components/bn/config/RateTableImportExport.tsx` — CSV export + drag-drop import preview.
- `src/components/bn/config/RateTableValidator.tsx` — runs gap-overlap analyzer for RANGE dimensions, missing combination detector for MATRIX, dup output_key detector. Inline diagnostics.
- `src/components/bn/config/RateTableSimulator.tsx` — input form (one field per dimension) → calls existing `lookupRate()` → shows matched row, value, trace.

Wires into existing `CalculationSetup.tsx` tab.

### Slice 2 — Formula Library steps_json visual builder

New files:
- `src/components/bn/config/FormulaStepsBuilder.tsx` — list of steps with add/reorder/delete.
- `src/components/bn/config/steps/LookupStepEditor.tsx` — picks rate table (from `bn_rate_table`), maps each dimension input to a registered variable (autocomplete from `bn_formula_variable_registry`), names the output variable.
- `src/components/bn/config/steps/MedicalTariffStepEditor.tsx` — picks procedure + location + provider type variables, output binding.
- `src/components/bn/config/steps/ConditionalStepEditor.tsx` — if/elseif/else with expression rows.
- `src/components/bn/config/steps/ExpressionStepEditor.tsx` — final-result expression box reusing existing parser.

Edit:
- `src/pages/bn/config/FormulaConfiguration.tsx` — when `expression_type !== SIMPLE_EXPRESSION`, render `FormulaStepsBuilder` instead of the raw expression textarea; keep `FormulaTestPanel` working by extending the simulator to run multi-step.
- `src/lib/bn/formulaParser.ts` (small extension) — `testFormulaSteps()` that runs `steps_json` through the same client-side resolver used by lookups (calls `lookupRate` with the supplied variable map).

### Slice 3 — Product Catalog Calculation tab mappers

Edit:
- `src/pages/bn/config/ProductEditor.tsx` (Calculation tab):
  - For each step in the bound formula's `steps_json`, render the right mapping row:
    - LOOKUP step → confirm rate table (auto-resolved) + map each dim variable to product parameter / fact / derived fact.
    - MEDICAL_TARIFF step → pick policy scope (defaults to `bn_medical_reimbursement_limit`).
    - EXPRESSION step → variable mapping (existing UI, kept).
  - Remove the legacy `calculation_config` JSON textarea; show a read-only "Legacy config (retired)" hint only when present.
  - Persist into existing `bn_product_formula_variable_mapping` + a new lightweight column `mapping_json` if needed for non-variable bindings (added in migration below).

Migration (small):
- `ALTER TABLE bn_product_formula_binding ADD COLUMN IF NOT EXISTS step_mapping_json jsonb` (medical/rate-table scope overrides per step).

### Slice 4 — Configuration Validation report + retire legacy tariff

New files:
- `src/services/bn/configValidationService.ts` — 7 checks:
  1. Every formula version's referenced variables exist in `bn_formula_variable_registry`.
  2. Every LOOKUP step's `table_code` exists in `bn_rate_table` (ACTIVE).
  3. Each LOOKUP step's dim inputs match the table's dimensions.
  4. `medicalPolicyResolver` source = `bn_medical_reimbursement_limit` (assert legacy tariff tables inactive).
  5. Every ACTIVE product version has complete `bn_product_formula_binding` + mappings.
  6. No ACTIVE product references legacy `calculation_config`.
  7. Each seeded formula simulation passes (`AGE_PENSION`, `AGE_GRANT`, `SURVIVOR_SPLIT`, `MEDICAL_REIMBURSEMENT`).
- `src/pages/bn/config/ConfigurationValidation.tsx` — checklist UI grouped by severity, per-row "fix" deep link.

Migration:
- Mark `bn_medical_tariff_table` and `bn_medical_tariff_row` as legacy: add comment + `UPDATE ... SET is_active = false` and a CHECK preventing new inserts (trigger raising `legacy table — use bn_medical_reimbursement_limit`).

---

### Acceptance per slice

| Slice | Acceptance |
|---|---|
| 1 | Can create/edit/import a TIER and a MATRIX table; gap/overlap warnings appear; simulate returns matched row for AGE_PENSION 1600 weeks → 0.50. |
| 2 | Editing AGE_PENSION_RATE_LOOKUP formula shows a LOOKUP step bound to `AGE_PENSION_RATE_TABLE`; simulator returns same value as Slice 1 simulator. |
| 3 | Editing the Age Pension product shows the bound formula's steps with all variable mappings; saving validates; activation guard already in place blocks incomplete bindings. |
| 4 | Validation page shows all 7 checks green for the seeded set; legacy tariff inserts blocked. |

### Order & safety

Slice 1 → 2 → 3 → 4 (each independently buildable + green before the next). After each slice I will run `bun run build:dev` and the existing `src/__tests__/bn-calc/*` tests.

### Out of scope

- No changes to formulaRunner / resolver / medicalPolicyResolver runtime (already correct).
- No changes to seeded data values.
- No RLS (per project rule).

Estimated: ~22 new files, ~5 edits, 2 small migrations. Will be delivered in 4 separate turns so each can be reviewed.
