## Goal

Make every risk number displayed on `/audit/functions` (per-function Risk Score badge, stored `risk_rating`, the per-department "Dept: score — label" badge in the top-right of each group, and the High/Medium/Low stat cards) recompute using the formula currently selected on `/audit/risk-settings` → **Formula** tab, instead of the value that happened to be in effect when the function was created/edited.

## Current state (verified)

- `useRiskRatingCalculator()` in `src/hooks/useRiskConfig.ts` already pulls `formula_type` and `dept_risk_method` from `ia_risk_config_master` and wires them into the engine. So `calculateFunctionRiskScore(...)` and `calculateDeptRisk(...)` *are* technically formula-aware at render time.
- BUT the per-function `ia_department_functions.risk_rating` column is computed and persisted only at create/edit time using the formula in effect *then*. Several UIs (stat cards on FunctionMaster, `highCount` in the dept header subtitle, Departments page, downstream modules) read this stored column, so changing the Formula on `/audit/risk-settings` does **not** update them.
- The dept badge (`Dept: <score> — <label>`) is already live-derived, but the per-function stored values it displays alongside (column `risk_rating` in the inner table) are stale.

## Proposed fix

### 1. Centralize a "recompute on formula change"

Add a new helper hook `useFunctionRiskSync()` (in `src/hooks/`) with:

- `recomputeFunction(funcId)` — recomputes `risk_rating` (and persists) for a single function using the current engine config.
- `recomputeAllFunctions()` — pages through `ia_department_functions` (1k chunks per pagination standard), recomputes `risk_rating` for each row whose value would change, batches updates.
- After running, calls `useDepartmentRiskSync().recomputeAll()` so all dept ratings re-derive too.
- Invalidates `['ia_department_functions']`, `['ia_departments']`.

### 2. Auto-trigger on Formula save

In `src/pages/audit/RiskSettings.tsx` → `RiskFormulaTab.handleSave` (around line 152):

- After `update.mutate({...formula_type...})` succeeds, call `useFunctionRiskSync().recomputeAllFunctions()`.
- Show a toast: "Recalculated N functions and M departments using the new formula."
- Same hook should also be called from the existing **Risk Bands** save (band thresholds change → labels change).

### 3. Manual "Recalculate Now" control

Add a small "Recalculate All Risks" button in:
- `RiskSettings.tsx` Formula tab (admin safety net).
- `FunctionMaster.tsx` page header (next to the existing Print/Export actions) so an auditor can force a refresh after a config change without navigating to settings.

### 4. Make all displayed values consistent

In `src/pages/audit/FunctionMaster.tsx`:

- Replace the High/Medium/Low stat cards' filter (lines ~333–335) so they count using the **live engine** (`getRiskRating(calculateFunctionRiskScore(f.likelihood, f.impact)).label`) instead of `f.risk_rating`.
- Replace `highCount` (line 363) with the same live derivation.
- Inner table column `risk_rating` (currently implicit via `f.risk_rating`) — render with the live engine.

This way the UI is correct *immediately* even before the persisted column is rewritten, and the persisted column is brought in sync in the background by step 1.

### 5. Guardrails

- Skip writes when the new label equals the stored label (no-op suppression, like `useDepartmentRiskSync` already does).
- Stamp `updated_by = userCode` on every update (project rule).
- No DB triggers; all logic in app layer (project rule: role-based security only, no RLS / no triggers).
- No schema changes.

## Files to change

- `src/hooks/useFunctionRiskSync.ts` *(new)*
- `src/hooks/useDepartmentRiskSync.ts` — expose its `recomputeAll` for chaining (already does).
- `src/pages/audit/RiskSettings.tsx` — chain recompute into Formula save and Bands save; add "Recalculate" button.
- `src/pages/audit/FunctionMaster.tsx` — switch stat cards / `highCount` / inner column to live engine values; add "Recalculate" button.

## Out of scope

- DB triggers, migrations, or schema changes.
- Touching `/audit/risk-settings` Likelihood/Impact tabs (they only edit master labels, not formula).
- Other modules that read `ia_department_functions.risk_rating` — they will pick up the corrected values automatically once step 1 runs.
