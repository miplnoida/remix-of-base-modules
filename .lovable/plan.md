# Formula Library — Registry-Enforced Variables

## Goal
Every variable referenced in any Formula Library template must resolve to exactly one of four registered sources:
1. **Fact Registry** (`bn_eligibility_fact`)
2. **Derived Fact Registry** (new — `bn_derived_fact`)
3. **Product Parameter Registry** (new — `bn_product_parameter`)
4. **Prior Formula Result** (an upstream `bn_formula_template` output in the same calculation chain)

Today `bn_formula_variable_registry` is a flat, hand-edited list and the parser only checks against it (`Unknown variable "x"`). We replace that with a unified, source-attributed Variable Resolver.

---

## 1. Database — new registries (migration)

### `bn_derived_fact`
- `code` (unique), `display_name`, `description`, `unit`, `data_type`
- `expression` (text — uses Fact / Product Parameter codes)
- `source_fact_codes text[]`, `source_parameter_codes text[]`
- `effective_from`, `effective_to`
- `status` (DRAFT / IN_REVIEW / APPROVED / RETIRED), `version`, `previous_version_id`
- `created_by`, `approved_by`, `approved_at`
- governance audit table `bn_derived_fact_event`

### `bn_product_parameter`
- `code` (unique), `display_name`, `data_type`, `unit`, `default_value`
- `product_id` (nullable for global), `scheme_id` (nullable)
- `effective_from`, `effective_to`, `status`, `version`
- audit table `bn_product_parameter_event`

### `bn_formula_template` additions
- `variable_bindings jsonb` — `{ varCode: { source: 'FACT'|'DERIVED_FACT'|'PRODUCT_PARAMETER'|'PRIOR_RESULT', ref: '<code>' } }`
- `validation_status` (VALID / INVALID), `last_validation_at`, `validation_errors jsonb`

All four tables: GRANT to authenticated + service_role, RLS off (project rule).

---

## 2. Variable Resolver (new service)
`src/services/bn/variableResolverService.ts`

Loads, caches and merges entries from the four sources into a single map:
```
{ code -> { source, refId, displayName, unit, dataType, sampleValue?, status } }
```
- Only ACTIVE / APPROVED entries with current effective dates are returned.
- Used by:
  - Formula parser (replaces `isValidFormulaVariableKey`)
  - Calculation Builder variable picker
  - Simulation engine sample-value lookup

`formulaParser.parseFormula` accepts a resolver map and rejects any token not present, returning **structured** errors:
```ts
{ variable: 'rate_pct', reason: 'UNREGISTERED', suggestedSources: ['DERIVED_FACT','PRODUCT_PARAMETER'] }
```

---

## 3. UI — Formula Library

### Validation panel (FormulaConfiguration.tsx / CalculationBuilder.tsx)
For each variable used:
- ✅ source badge (Fact / Derived Fact / Param / Prior Result) + ref code
- ❌ red row with: variable name, "No registered source", **"Create as Derived Fact"** / **"Create as Product Parameter"** / **"Map to existing Fact"** quick actions that deep-link to the relevant editor pre-filled with the variable code.
- Save is blocked while any variable is unresolved.

### Variable picker
Combobox grouped by source with search. No free typing of unknown identifiers.

### New pages
- `/bn/config/derived-facts` — list + editor + governance (Draft → Submit → Approve, with diff vs previous version, simulation tab using existing `bn_sim_*` infra).
- `/bn/config/product-parameters` — list + editor + effective-date timeline.

Both reuse the existing approval policy (`bn_approval_policy`) and audit pattern.

---

## 4. Simulation
- Extend `bn_sim_run` to capture which source each variable resolved to at run-time.
- Derived Fact editor has a "Simulate" tab: pick sample fact/parameter values → evaluate expression → show result + dependency trace.
- Formula Library "Test Formula" pulls sample values via the resolver instead of the hard-coded `sample` field on the legacy registry.

---

## 5. Seed data (executed in the migration)
Seed APPROVED Derived Facts and Product Parameters for every SKN/SS benefit family currently referenced by formula templates, tagged `SEED-`:

**Product Parameters** — contribution_rate_employer, contribution_rate_employee, contribution_rate_self_employed, pension_base_rate_pct, pension_increment_rate_pct, pension_qualifying_years, survivor_widow_share_pct, survivor_child_share_pct, funeral_grant_amount, ncp_flat_weekly_rate, ei_disablement_min_pct, maternity_replacement_rate, sickness_replacement_rate, sickness_waiting_days, maternity_max_weeks, …

**Derived Facts** — avg_weekly_wage, avg_annual_wage, paid_weeks, credited_weeks, total_weeks, extra_qualifying_years, disablement_degree_pct, base_pension, beneficiary_share_pct, family_cap_pct, deceased_paid_weeks_156, deceased_avg_weekly_wage, ncp_flat_amount, funeral_grant_amount, …

Each seeded entry binds back to existing `bn_eligibility_fact` rows where applicable (e.g. `avg_weekly_wage` is a derived fact whose `source_fact_codes` include the paid-weeks / wage facts). Every variable currently in `bn_formula_variable_registry` is migrated to its appropriate new home, then that table is marked deprecated (kept read-only for one release).

---

## 6. Cutover
1. Run migration (tables + seed + backfill `variable_bindings` on existing templates by matching codes → seeded entries).
2. Run resolver-based validator across all existing `bn_formula_template` rows; templates that still have unresolved variables are flagged `INVALID` and surfaced in an "Unknown Variables" admin report (replaces ad-hoc warnings).
3. Existing parser path that throws `Unknown variable "x"` is replaced by the new structured error UI — warnings disappear naturally once every variable is bound.

---

## Technical notes
- No RLS (per project rule); access control via existing role permissions on `/bn/config/*` routes.
- Governance reuses `bn_approval_policy`, `bn_version_approval`, `bn_module_events`.
- All new tables include `created_by` / `updated_by` populated with logged-in `user_code` (per project standard).
- No mock data — seeds use `SEED-` prefix and are idempotent (`ON CONFLICT (code) DO NOTHING`).
- Edit-time validator runs client-side via the resolver cache; authoritative validation runs in a Postgres function `bn_validate_formula(template_id)` invoked on save and on publish.

---

## Out of scope
- Rewriting actual benefit calculations (the migration only re-homes variable *definitions* — calculations continue to run against the same numbers).
- Changing Rule Engine / Eligibility Fact editor UX beyond adding the "used by formulas" back-reference.
