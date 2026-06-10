# Formula Library as Single Source of Calculation Truth

## Current state (audit)
`bn_product_version` already has the modern columns: `formula_template_id`, `formula_parameter_values`, `cap_rules`, `rounding_rule`, `effective_date_rule`, plus the legacy `calculation_config` and `calculation_config_legacy` jsonb. Most consumers were migrated; the legacy columns linger as fallback. `CalculationBuilder.tsx` still reads & displays `calculation_config_legacy`. Runtime services (`calculationEngine`, `simulationService`, `awardCreationService`, `entitlementService`, `claimWorkbenchService`, `paymentBoundaryService`) need to be inventoried to confirm none branch on legacy JSON.

## Goal
1. Formula Library (`bn_formula_template`) is the only place an executable expression lives.
2. `bn_product_version` is configuration only: picks a formula, supplies parameters, caps, rounding, variable bindings.
3. Every runtime path (Workbench, Entitlement, Award, Payment, Simulation) loads the formula by `formula_template_id` and resolves variables via the resolver — no other code path.
4. Validation blocks product activation when anything is missing.
5. Every seeded SKN product runs a successful simulation.

## Work plan

### Phase A — Audit & freeze legacy (read-only sweep)
1. `rg` every reference to `calculation_config`, `calculation_config_legacy`, `formula_expression` outside `bn_formula_template`. Produce a checklist file `docs/bn/formula-cutover-audit.md`:
   | File | Symbol | Reads legacy? | Writes legacy? | Action |
2. For each writer, replace with writes to `formula_template_id` + `formula_parameter_values` + `cap_rules` + `rounding_rule`.
3. For each reader, route through a single helper `loadProductCalculationConfig(productVersionId)` in `src/services/bn/productCalculationLoader.ts` which returns:
   ```ts
   { template, parameters, capRules, rounding, effectiveDateRule, variableBindings }
   ```
   Reading the legacy columns is removed.

### Phase B — Runtime convergence
Single function `runProductCalculation(productVersionId, claimContext)`:
1. Load config via the helper.
2. Build resolver map (Facts + Derived Facts + Product Parameters + Prior Results + Claim Fields).
3. Apply parameter overrides from `formula_parameter_values`.
4. Evaluate expression via `formulaParser.evaluateFormula`.
5. Apply caps and rounding from configuration.
6. Persist a `bn_calc_trace` row per variable: `{variable, source, value, resolver_path}` plus the final result.
Wire `calculationEngine`, `simulationService`, `awardCreationService.computeBaseAmount`, `entitlementService.recalc`, `claimWorkbenchService.simulate`, `paymentBoundaryService.dryRun` to call only this function.

### Phase C — Product Catalog UI cleanup (`CalculationBuilder.tsx`)
- Drop the "Legacy calculation_config" panel.
- Keep three sections: **Formula**, **Parameter values**, **Caps & Rounding**.
- Add new **Formula Usage Analysis** panel (read-only):
  | Field | Source |
  |---|---|
  | Current Formula | `bn_formula_template.template_name` |
  | Formula Version | `bn_formula_template.governance_status` + `entered_at` |
  | Variables Required | parsed from expression |
  | Variables Mapped | from resolver + `formula_parameter_values` |
  | Missing Variables | required − mapped |
  | Product Parameters Required | `bn_formula_template.required_parameters` |
  | Product Parameters Missing | required − (overrides ∪ defaults) |
- "Activate" button disabled while anything in the analysis is missing (tooltip lists each gap).

### Phase D — Product activation validator
New service `productActivationValidator.ts`:
- formula selected
- formula `governance_status` ∈ {`READY_FOR_PRODUCT_USE`,`ACTIVE`}
- every required variable resolves
- every required parameter has value (override or default)
- simulator run succeeds with no `unresolved` and finite numeric result
Returns `{ canActivate, blockers[] }`. Called from `productApprovalService.activate` and from the UI activation button.

### Phase E — Seed SKN parameter values per product
Migration `seed_skn_product_parameters.sql`:
For each SKN product version (Sickness, Maternity, Funeral, Age Pension, Age Grant, Invalidity, Survivors, EI Temporary, EI Permanent, Disablement, NCP):
- set `formula_template_id` to the appropriate seeded template
- write realistic `formula_parameter_values` jsonb (e.g. Sickness `replacement_rate=0.65`, `waiting_days=3`; Age Pension `base_rate=0.30`, `increment_rate=0.01`, `base_weeks=500`, `increment_unit_size=50`; Funeral `grant_amount=2500`; NCP `flat_weekly_rate=250`; …)
- set `cap_rules` (min/max) and `rounding_rule` per SKN policy
All idempotent (`ON CONFLICT (product_id, version_number)` → `UPDATE`), tagged in `description` as `SEED-FORMULA`.

### Phase F — Simulation sweep
Script `scripts/bn/simulate-all-products.ts` (run-once via `bunx tsx`):
- iterate every APPROVED product version
- call `runProductCalculation(version.id, sampleClaim)`
- assert: `unresolved.length===0`, parameters fully bound, numeric result, no NaN
- emit a markdown report under `/mnt/documents/bn-product-simulation-report.md`

### Phase G — Legacy column retirement
Once Phases A–F land and report is clean:
- migration drops `bn_product_version.calculation_config_legacy`
- `calculation_config` becomes a generated jsonb (or also dropped) — keep one release as read-only and remove next.

---

## Acceptance
- [ ] `rg` finds no live reads of `calculation_config_legacy` (only the dropped types entry).
- [ ] Every runtime calc path goes through `runProductCalculation`.
- [ ] `CalculationBuilder` shows Formula Usage Analysis with no missing items for each seeded product.
- [ ] Product Activation fails with a clear blockers list when formula/params/variables are missing.
- [ ] `simulate-all-products.ts` report shows green for all 11 SKN products.
- [ ] TypeScript build passes.

## Technical notes
- No RLS (project rule); GRANT preserved on all touched tables.
- Seeds idempotent, tagged with `SEED-FORMULA`.
- `bn_calc_trace` schema check before Phase B; add `source_type` + `resolver_path` if missing.
- Audit report written to `docs/bn/formula-cutover-audit.md` first so each step is reviewable.

## Out of scope
- Rewriting the Formula Library editor.
- Replacing the eligibility rule engine.
- Migrating historical `bn_calc_run` rows (kept for audit).

## Suggested execution order (one PR per phase)
A audit → B runtime helper → C UI panel → D validator → E seeds → F simulation sweep → G drop legacy columns.
