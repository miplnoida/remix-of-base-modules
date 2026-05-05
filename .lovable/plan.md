## Goal

Make `ia_departments.risk_rating` an auto-derived value computed from the risk ratings of that department's functions (same logic shown on `/audit/functions` top-right "Dept: score — label" badge). Remove the manual Risk Rating control from the Departments CRUD, and keep the column in sync whenever any function under the department changes.

## Current Behavior

- `/audit/functions` (FunctionMaster.tsx) already calculates department risk via `calculateDeptRisk(functions)` from `useRiskRatingCalculator()` (in `src/hooks/useRiskConfig.ts` → `src/lib/audit/riskEngine.ts`). Methods supported: `maximum`, `average`, `weighted`, configured by `getDeptRiskMethod()`.
- `/audit/departments` (DepartmentMaster.tsx) lets users pick `Risk Rating` (High/Medium/Low) manually in Add/Edit modal and persists to `ia_departments.risk_rating`.
- `ia_department_functions` rows hold `likelihood`, `impact`, `weight_percentage`, `risk_rating` per function.

## Approach

Compute department risk on the client using the same engine, write the resulting label back to `ia_departments.risk_rating` whenever functions change, and remove the manual selector. Keep DB column as-is (no schema change) so existing reads and stat cards keep working.

### 1. Centralize the recompute

Create a small helper hook `useSyncDepartmentRiskRating` (under `src/hooks/`) that:
- Accepts `departmentId`.
- Loads all active `ia_department_functions` for that department.
- Calls `calculateDeptRisk(functions)` (same engine the Functions page uses → guarantees parity with the badge).
- Maps `deptRisk.label` to the allowed values stored today: `High` / `Medium` / `Low` (treat `Critical` as `High`, `N/A` → leave as `Medium` default when no functions).
- Updates `ia_departments.risk_rating` only if it changed (skip no-op writes), stamping `updated_by` with the current `user_code`.
- Invalidates `['ia_departments']` and related queries.

### 2. Trigger points (client-side, since RLS/triggers aren't used here)

Wire the recompute into every mutation that can change a function's risk inputs. All of these live in `useAuditData` / `useAuditDataPhase2` / `FunctionMaster.tsx`:

- Function create
- Function update (likelihood / impact / weight / risk_rating / department_id change — recompute for both old and new department on move)
- Function archive / delete
- Bulk imports of functions (if any)

Implementation: in the function-mutation `onSuccess` handlers, call the new hook's recompute for the affected `department_id`(s).

### 3. Departments page changes (`src/pages/audit/DepartmentMaster.tsx`)

- Remove the `Risk Rating` `<Select>` block (lines ~318–329) from the Add/Edit modal.
- Remove `risk_rating` from `DeptForm`, `emptyForm`, `getSubmitData`, `openEdit` defaulting.
- Stop sending `risk_rating` in `create.mutate` / `update.mutate` payloads (DB column stays; backend simply won't overwrite it from the form).
- Keep the `risk_rating` column in the table and the High/Medium/Low stat cards — they will now reflect the auto-computed value.
- Keep the Risk filter on the list (still filters by stored value).
- On opening the Departments page, run a one-pass reconciliation: for each department lacking a synced value or where functions changed since last write, recompute and persist. (Cheap: one SELECT of functions grouped by dept + targeted UPDATEs only on diffs.)

### 4. Display badge consistency

Department list/detail views read `risk_rating` directly from `ia_departments`, so once #1–#3 are in place the badge will match the Functions page. `DepartmentView.tsx` already uses `calculateDeptRisk` for its own header — leave as-is; it stays consistent.

### 5. Edge cases

- Department with zero functions → keep existing stored value untouched (don't overwrite with `N/A`); stat cards keep counting it.
- Risk engine config changes (bands / method) → not auto-rebroadcast; document that admins can trigger a recompute by editing any function, or we can add a "Recalculate All" admin button on the Departments page (small button in `actions`). Include this button in the implementation.
- Concurrency: use `if-changed` guard before update to avoid write storms.

## Files to Change

- `src/pages/audit/DepartmentMaster.tsx` — remove manual Risk Rating field; add "Recalculate Risk" action button; trigger reconciliation on mount.
- `src/hooks/useDepartmentRiskSync.ts` (new) — `recomputeDepartmentRisk(departmentId)` and `recomputeAllDepartments()`.
- `src/pages/audit/FunctionMaster.tsx` — after function create/update/delete success, call `recomputeDepartmentRisk` for the affected department(s).
- `src/hooks/useAuditData.ts` (or wherever function mutations live) — same hook integration if mutations are called from elsewhere.

## Out of Scope

- No DB schema changes. No migrations. No DB triggers (project rule: role-based security only, logic stays in app layer).
- `/audit/functions` page logic and the existing badge are unchanged.
