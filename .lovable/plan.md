
# Calculation Tab Rebuild + Eligibility Rule Backfill

Two tracks. Track A finishes what the eligibility rebuild started (so we can honestly say "all products work"). Track B is the calculation-tab redesign you just asked for. Both share the same fact-registry + diagnostics infrastructure already built.

---

## Track A — Backfill executable eligibility rules (must ship first)

**Why first**: today only SKN-EI-INJ has real date-difference / document-status rules. Four service products have zero rules. Without this, "all rules work" cannot be claimed.

### A1. Re-seed SKN core benefit products
Rewrite the LITERAL-only rules to executable ones per the SKN benefit-parameters memory:

- **SKN-SICK** — add `SICK-WAIT-3D` (DATE_DIFFERENCE: incapacity_start → claim.submission_date, ≤ 14 days late), `SICK-MEDCERT-VERIFIED` (DOCUMENT_STATUS), `SICK-MIN-26W` (LITERAL on contribution.total_paid_weeks ≥ 26), `SICK-NOT-WORKING` (EXISTS: no active wage in claim week).
- **SKN-AGE** — `AGE-MIN-62` (LITERAL person.age ≥ 62), `AGE-CONTRIB-500W` (≥ 500 paid+credited weeks), `AGE-LIFE-CERT` (DOCUMENT_STATUS).
- **SKN-INV** — `INV-MEDBOARD-CONFIRMED` (DOCUMENT_STATUS on medical board recommendation), `INV-MIN-150W` contribution, `INV-NO-AGE-PENSION` (CROSS_PRODUCT).
- **SKN-NCP** — `NCP-AGE-65`, `NCP-NO-CONTRIB-PENSION` (CROSS_PRODUCT), `NCP-RESIDENCE-10Y` (DATE_DIFFERENCE on person.residence_start_date), `NCP-MEANS-TEST` (DOCUMENT_STATUS stub).
- **SKN-MAT** — add `MAT-CONFINEMENT-CERT` (DOCUMENT_STATUS), `MAT-MIN-26W` contribution.
- **SKN-EI-DIS / DTH / MED / FUN / SUR** — add the missing document and existence checks (death cert, dependant proof, funeral receipt cap, beneficiary share check).

### A2. Seed rules for the four service products
- **SKN-SVC-EFT** — `EFT-PAYEE-MATCH` (FACT_TO_FACT: bn_payment_profile.account_holder matches person name), `EFT-BANK-VERIFIED` (DOCUMENT_STATUS).
- **SKN-SVC-EIR** — `EIR-REPORT-7D` (DATE_DIFFERENCE).
- **SKN-SVC-LIFE** — `LIFE-CERT-WITHIN-12M` (DATE_DIFFERENCE).
- **SKN-SVC-SCH** — `SCH-AGE-RANGE` (LITERAL dependant age 16–25), `SCH-SCHOOL-CERT` (DOCUMENT_STATUS).

### A3. Build a Coverage Dashboard
Read-only panel on Product Catalog list view: per product, show rule count by `rule_kind`, flag products with 0 rules or all-LITERAL rules. One badge per product on the catalog grid.

### A4. Smoke-test runner
Reuse the `TestRulePanel` already in the wizard. Add a "Test all rules" button on the Eligibility tab that runs every rule against a chosen test claim and shows the diagnostic grid.

---

## Track B — Calculation Tab Rebuild

### B1. Discovery (what exists today)

```text
Product Catalog → Calculation tab
  └─ CalculationTab.tsx  →  edits bn_product_version.calculation_config (raw JSON)
Formula Library
  └─ FormulaLibrary.tsx  →  CRUD on bn_formula_template
                            (template_code, formula_expression, input_variables, output_type)
Runtime
  └─ services/bn/calculation/*  →  reads calculation_config JSON, no formula lookup
```

The two systems are not connected. Product version stores a JSON blob; library has 8 templates that nothing references.

### B2. Schema additions (single migration)

Add to `bn_product_version`:
- `formula_template_id uuid REFERENCES bn_formula_template(id)`
- `formula_version_id uuid` (nullable, for snapshotting)
- `formula_parameter_values jsonb` — `{ replacement_rate: 0.75, ... }`
- `cap_rules jsonb` — `{ min: 200, max: 1500, frequency_cap: 'WEEKLY' }`
- `rounding_rule text` — `NEAREST_CENT | UP | DOWN | NEAREST_DOLLAR`
- `effective_date_rule text` — `CLAIM_DATE | INCAPACITY_START | DECISION_DATE`
- `payment_frequency_resolved text` — derived display

Add `bn_formula_template`:
- `template_version int default 1`
- `status text default 'DRAFT'` — DRAFT / PUBLISHED / DEPRECATED
- `input_facts jsonb` — array of `{ fact_key, required: bool, default? }`
- `parameter_schema jsonb` — `[{ key, label, type: 'percent|currency|int', min, max, default }]`
- `output_fact_key text` — e.g. `weekly_benefit_amount`
- `category text` — PERCENT_WAGE | FLAT | TIERED | SHARE | …

Add `bn_calc_legacy_snapshot.formula_template_id uuid` so migrations can be audited.

### B3. Formula Library expansion

Seed/refresh the 8 existing templates and add the missing ones from your list, using fact-registry keys:

| Template Code | Expression | Inputs | Parameters |
|---|---|---|---|
| `PCT-AVG-WAGE` | `average_weekly_wage * replacement_rate` | contribution.average_weekly_wage | replacement_rate |
| `FLAT-GRANT` | `fixed_amount` | — | fixed_amount |
| `TIERED-PENSION` | piecewise on paid_weeks | contribution.total_paid_credited_weeks, contribution.average_weekly_wage | tier_table |
| `AGE-GRANT-LUMP` | `fixed_amount` (NCP) | — | fixed_amount |
| `FUNERAL-GRANT` | `min(actual_expense, cap)` | medical.approved_expense_amount | cap_amount |
| `SURVIVOR-SPLIT` | `base * beneficiary_share_percent` | award.base_amount, award.beneficiary_share_percent | — |
| `EI-DISABLEMENT` | `base * disablement_percentage` | contribution.average_weekly_wage, medical.disablement_percentage | replacement_rate |
| `INVALIDITY-PCT` | `average_weekly_wage * replacement_rate` | contribution.average_weekly_wage | replacement_rate |
| `MED-REIMBURSE` | `min(approved_expense, schedule_cap)` | medical.approved_expense_amount | schedule_table |
| `ARREARS` | `weekly_amount * weeks_since(effective_date, today)` | award.effective_date, computed.weekly_amount | — |
| `MIN-MAX-CAP` (composite wrapper) | `clamp(base, min, max)` | computed.base | min, max |

### B4. Replace the JSON editor with `CalculationBuilder.tsx`

Sections rendered top-to-bottom, all using shadcn `SearchableSelect` / `Input` / `Switch`:

```text
A. Formula Selection
   ├─ Calculation Type chip (auto from template.category)
   ├─ Formula Template picker (lists active templates in library)
   ├─ "Create new formula"  →  opens FormulaWizardDialog
   ├─ "Clone & customize"   →  copies template into a product-scoped draft
   └─ Expression preview (read-only, monospace)

B. Input Mapping
   ├─ One row per required fact: fact_key → resolver/source_table
   ├─ Green/red badge: resolved / missing fact in registry
   └─ Override resolver (advanced)

C. Product Parameters
   └─ Rendered from template.parameter_schema (percent slider, currency input, etc.)

D. Caps & Rounding
   ├─ Min / Max amount, frequency cap
   ├─ Rounding rule
   ├─ Payment frequency
   ├─ Arrears rule (toggle + formula link)
   └─ Effective date rule

E. Simulation
   ├─ Pick a real claim (reuses TestRulePanel pattern)
   ├─ Override SSN / parameters
   └─ Shows CalculationTrace (formula, inputs, params, intermediate, final, caps applied, rounding)

F. Advanced (Admin only) ▾
   └─ Raw calculation_config JSON view (read-only by default; "Edit JSON" gated by has_role('admin'))
```

### B5. Runtime engine update

`services/bn/calculation/runCalculation.ts`:

1. Load `bn_product_version` → grab `formula_template_id`, parameters, caps.
2. Load template; if `formula_template_id IS NULL` → fall back to legacy JSON path with a `legacy_mode=true` flag on the trace.
3. For each `input_fact` → call `resolveFact` (Track A infrastructure).
4. Evaluate `formula_expression` in a sandboxed evaluator (mathjs, expression already supported in library).
5. Apply caps → apply rounding → produce result.
6. Write a `bn_calc_trace` row capturing template id, version, every input value, every parameter, intermediate result, caps applied, rounding applied, final amount.

### B6. Configuration validator

Extend `validateProductChannelConfig.ts`:
- product version requires a formula when `payment_type IS NOT NULL`
- every `input_fact` must be in the registry and have a resolver
- every `parameter_schema` entry must have a value in `formula_parameter_values`
- caps must be numeric and `min ≤ max`
- output fact key must match an award/payment column
- warn when legacy `calculation_config` JSON is still present without a template

### B7. Migration of existing JSON calcs

One-shot migration script (idempotent, run via insert tool):
- Read `bn_product_version.calculation_config` JSON.
- Map shape → template (`{"type":"percentage","rate":0.75}` → `PCT-AVG-WAGE` with `replacement_rate: 0.75`).
- Write `formula_template_id`, `formula_parameter_values`, `cap_rules`, `rounding_rule`.
- Copy original JSON into `bn_calc_legacy_snapshot` for audit.
- Report unmapped rows for manual review (UI badge "Migration: needs review").

### B8. Tests

- Unit: `formulaEvaluator.test.ts` covering PCT-AVG-WAGE (75% rule), FLAT-GRANT, MED-REIMBURSE (cap), ARREARS (weeks math).
- Integration: end-to-end simulation against a seeded SKN-SICK claim — expected weekly amount matches manual calculation.

---

## Out of scope for this pass

- Wiring calculation into the actual claim decision/payment pipeline (still simulation-only)
- Means-test and medical-board resolvers (still stubs, flagged `notImplemented`)
- Multi-currency / FX
- Approval workflow for formula publishing (will reuse existing `bn_version_approval` table later)

## Decision needed before I start

1. **Order**: ship Track A (rule backfill) first, then Track B? Or interleave so each product gets rules + calc together?
2. **Legacy JSON**: hard-migrate now and drop the column post-publish, or keep both paths indefinitely with a feature flag?
3. **Formula expression sandbox**: OK to use `mathjs` (already friendly with our parameter shape) or do you want a custom whitelist evaluator?
