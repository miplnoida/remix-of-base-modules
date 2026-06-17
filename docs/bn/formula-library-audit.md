# Formula Library — Current State Audit (Phase A1)

> Read-only inventory. Companion to `.lovable/plan.md` Track A.

## 1. Files in play

| Layer | File | Purpose |
|---|---|---|
| Page | `src/pages/bn/config/FormulaConfiguration.tsx` | Current single-tab grid; Add/Edit dialog only |
| Page | `src/pages/bn/config/BindingEditor.tsx` | Product → formula version binding |
| Page | `src/pages/bn/config/CalculationSetup.tsx` | Bindings tab inside Product Catalog |
| Page | `src/pages/bn/config/CalculationReadiness.tsx` | Migration audit (Phase F) |
| Page | `src/pages/bn/config/SimulationPanel.tsx` | Sim runs |
| Page | `src/pages/bn/config/DerivedFactRegistry.tsx` | Variable registry surface |
| Page | `src/pages/bn/config/ProductParameterRegistry.tsx` | Per-product params |
| Component | `src/components/bn/config/FormulaTestPanel.tsx` | Inline test runner |
| Component | `src/components/bn/smart/FormulaBuilder.tsx` | Expression builder |
| Component | `src/components/bn/config/CalculationBuilder.tsx` | Visual block builder |
| Component | `src/components/bn/config/CalculationV2Panel.tsx` | V2 engine wrapper |
| Service | `src/services/bn/calc/formulaRunner.ts` | Runtime evaluator |
| Service | `src/services/bn/calc/runProductCalculationV2.ts` | Engine entrypoint |
| Service | `src/services/bn/registries/formulaVariableRegistry.ts` | Variable registry access |
| Hook | `src/hooks/bn/useBnConfig.ts` | `useBnFormulaTemplates`, `useUpsertBnFormulaTemplate` |
| Hook | `src/hooks/bn/useBnFormulaVariableRegistry.ts` | Variable registry hook |
| Hook | `src/hooks/bn/useVariableResolver.ts` | Resolver |
| Types | `src/types/bn.ts`, `src/types/bnCalcEngine.ts` | `BnFormulaTemplate`, version, binding |
| Legacy | `src/components/nbenefit/_legacy/*`, `src/types/_legacy/benefitRulesConfig.ts`, `src/services/bn/_legacy/benefitRulesConfigService.ts` | Quarantined |

## 2. Database tables

| Table | Role | Notes |
|---|---|---|
| `bn_formula_template` (30 cols) | Template header | Has `formula_expression` column (legacy inline) |
| `bn_formula_version` (18 cols) | Versioned body | Status lifecycle column present |
| `bn_formula_variable_registry` (18 cols) | Variable catalogue | Seeded |
| `bn_product_formula_binding` (17 cols) | Product → formula version | ✅ correct shape |
| `bn_product_formula_variable_mapping` (10 cols) | Per-binding variable bindings | ✅ |
| `bn_rate_table` / `_dimension` / `_row` | Lookup tables | Used by `rateTableLookup.ts` |

## 3. Gap analysis vs. requested actions

| Required action | Today | Gap |
|---|---|---|
| Add Formula | ✅ Add dialog | No wizard, no calc-type chooser |
| Clone Formula | ❌ | Missing |
| Edit Draft | Partial — edits any row regardless of status | No status guard |
| Create New Version | ❌ | Missing in UI |
| Submit for Review | ❌ | No status transition UI |
| Activate Version | ❌ | No activation flow |
| Retire Formula | ❌ | Missing |
| View Usage | ❌ | No product cross-ref view |
| Safe Delete | ❌ | Plain delete; no usage check |
| Hide raw JSON | ❌ | Raw `formula_expression` visible by default |
| Tabs (Active/Drafts/Retired/…) | ❌ | Single flat grid |

## 4. Risks
- Bindings reference `formula_version_id` but UI lets users edit underlying expression in any status → silent recalculation risk.
- No server-side guard RPC; UI-only enforcement is bypassable.
- Two parallel calculation pages (`CalculationBuilder` visual + `FormulaConfiguration` text) overlap — Phase A3 should make Formula Library the only entrypoint.

## 5. Recommendation (drives Track A)
1. Add `formulaLifecycleService.ts` + DB function `bn_formula_lifecycle_guard`.
2. Replace `FormulaConfiguration.tsx` with tabbed `FormulaLibrary.tsx`.
3. New `AddFormulaWizard.tsx` (8 steps).
4. Gate raw expression behind `bn.config.rules.advanced`.
5. Update Bindings tab to require ACTIVE version.
