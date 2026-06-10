# Formula Library — Real Source Mapping (No Hidden Warnings)

## Goal
Every variable referenced by a Formula Library template resolves to a registered source. The validator keeps showing errors until each variable is bound to one of:
`FACT` · `DERIVED_FACT` · `PRODUCT_PARAMETER` · `PRIOR_FORMULA_RESULT` · `CLAIM_FIELD` · `MANUAL_INPUT`.

No warning hiding. No silent fallbacks.

---

## 1. Database — new sources + seeds (single migration)

### 1a. Extend variable source enum
Update `bn_formula_variable_registry.source_type` allowed values to include:
`FACT`, `DERIVED_FACT`, `PRODUCT_PARAMETER`, `PRIOR_FORMULA_RESULT`, `CLAIM_FIELD`, `MANUAL_INPUT`.

### 1b. Seed Product Parameters (`bn_product_parameter`, status=APPROVED, SEED-)
`contribution_unit_size`, `base_weeks`, `increment_unit_size`, `payable_days_per_week`,
`rate`, `replacement_rate`, `base_rate`, `increment_rate`, `flat_weekly_rate`,
`grant_amount`, `unit_rate`, `pension_rate`, `disablement_rate`.

### 1c. Seed Derived Facts (`bn_derived_fact`, status=APPROVED, SEED-)
| code | expression | sources |
|---|---|---|
| `contribution_units` | `floor(total_weeks / contribution_unit_size)` | FACT `total_weeks`, PARAM `contribution_unit_size` |
| `additional_contribution_units` | `max(floor((total_weeks - base_weeks) / increment_unit_size), 0)` | FACT `total_weeks`, PARAMs `base_weeks`,`increment_unit_size` |
| `payable_weeks` | `approved_days / payable_days_per_week` | CLAIM `approved_days`, PARAM `payable_days_per_week` |
| `survivor_total_share` | `sum(beneficiary_share_percent)` | FACT collection |

### 1d. Seed Facts (`bn_eligibility_fact`, where missing)
`average_weekly_wage` (`contribution.average_weekly_wage`),
`average_insurable_wage` (`contribution.average_insurable_wage`),
`disablement_percentage` (`medical.disablement_percentage`),
`total_weeks`, `beneficiary_share_percent`.

### 1e. Seed Claim Fields
Add `bn_eligibility_fact` rows with `source_type='CLAIM_FIELD'` (re-use fact table; resolver routes via source_type) for `approved_days`.

### 1f. Update seeded Formula Templates to use registered codes only
| template | new expression |
|---|---|
| `AGE_GRANT` | `contribution_units * unit_rate` |
| `PCT_AVG_WAGE` | `average_weekly_wage * replacement_rate` |
| `TIERED_PENSION` | `base_rate + (increment_rate * additional_contribution_units)` |
| `SURVIVOR_SPLIT` | `base_pension * beneficiary_share_percent` |
| `NCP_FLAT_RATE` | `flat_weekly_rate` |
| `FUNERAL_GRANT` | `grant_amount` |
| `EI_DISABLEMENT` | `average_weekly_wage * disablement_percentage * replacement_rate` |

`base_pension` is registered as `PRIOR_FORMULA_RESULT` (output of TIERED_PENSION / PCT_AVG_WAGE).

### 1g. Persist required-parameters map on each template
`bn_formula_template.required_parameters jsonb` (array of product_parameter codes) populated for each seeded template:
- AGE_GRANT → `["contribution_unit_size","unit_rate"]`
- PCT_AVG_WAGE → `["replacement_rate"]`
- TIERED_PENSION → `["base_rate","base_weeks","increment_rate","increment_unit_size"]`
- NCP_FLAT_RATE → `["flat_weekly_rate"]`
- FUNERAL_GRANT → `["grant_amount"]`
- EI_DISABLEMENT → `["replacement_rate"]`
- SURVIVOR_SPLIT → `[]` (uses prior result + fact)

---

## 2. Variable Resolver — extend to all 6 sources
`src/services/bn/variableResolverService.ts`
- Add `CLAIM_FIELD` and `MANUAL_INPUT` to `VariableSource`.
- Load CLAIM_FIELD entries from `bn_eligibility_fact` where `source_type='CLAIM_FIELD'`.
- Recognize PRIOR_FORMULA_RESULT for any `output_variable` of an active template.
- Resolver returns structured `{ source, refId, resolverPath }` so the trace UI can render it.

---

## 3. Formula Validator
`src/lib/bn/formulaParser.ts` already returns structured `unresolved`. Extend `validateTemplate(template, resolverMap)`:
1. parse → variable list
2. each variable must be in resolverMap (else `UNREGISTERED`)
3. each PRODUCT_PARAMETER must appear in `required_parameters`
4. each PRIOR_FORMULA_RESULT must reference an upstream template in same product version
5. sample simulation runs without NaN

Errors surface in UI exactly as today — no suppression — but disappear because every variable now resolves.

---

## 4. Product Catalog — Calculation tab
`src/pages/bn/product/...CalculationTab.tsx` (existing file used by Product Catalog):
- On formula select, read `required_parameters` and render an input per parameter pulled from `bn_product_parameter` defaults.
- Save writes overrides to `bn_product_channel_config.parameter_overrides jsonb`.
- Activation guard: `canActivate = required_parameters.every(p => overrides[p] != null || param.default_value != null)`. Disabled "Activate" button with tooltip listing missing params.

---

## 5. Runtime Calculation Engine
`src/services/bn/calculationEngine.ts` (extend existing):
```
loadProductVersion → loadFormula → buildResolver(facts, params, priorResults, claim)
  → evaluate(expression, resolver)
  → persist bn_calc_trace rows: { variable, source, value, resolver_path }
```
Trace UI (`bn_calc_trace` viewer) renders columns: Variable | Source | Value | Resolver.

---

## 6. Simulator alignment
Simulator already uses the resolver — once the registry seeds land, the same expressions evaluate identically in simulator and runtime (single engine).

---

## 7. Acceptance checklist
- [ ] No "Unknown variable" warnings on any seeded template.
- [ ] AGE_GRANT evaluates: `contribution_units * unit_rate` returns numeric.
- [ ] Every variable used by seeded templates has a `bn_eligibility_fact` / `bn_derived_fact` / `bn_product_parameter` / template-output row.
- [ ] Product Catalog Calculation tab forces required parameter entry before activation.
- [ ] Simulator and runtime produce the same number for the same inputs.
- [ ] Calc trace shows Variable | Source | Value | Resolver for every variable.
- [ ] `tsc` passes.

---

## Technical notes
- All seeds idempotent (`ON CONFLICT (code) DO NOTHING`) and `SEED-` tagged.
- No RLS (project rule); GRANT on every new/altered public table.
- `bn_calc_trace` already exists — add `source_type` + `resolver_path` columns if missing.
- Backfill existing `bn_formula_template.variable_bindings` from new resolver on migration.
- `bn_formula_variable_registry` becomes a thin view over the four real sources (read-only) after cutover.

## Out of scope
- Rebuilding calculation engine outside the variable layer.
- Rewriting Product Catalog UI beyond the Calculation tab additions.
- Migrating non-seeded historical templates (flagged INVALID, surfaced in admin report).
