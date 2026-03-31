

# Implement Weighted Function Risk for Audit Module

## Summary
The `ia_department_functions` table currently lacks a `weight_percentage` column, and the "Weighted Risk" option in Risk Settings is disabled with a "Coming Soon" badge. This plan adds the column, implements the weighted calculation logic, and updates all affected UI screens.

## 1. Database Migration

Add `weight_percentage` column to `ia_department_functions`:

```sql
ALTER TABLE public.ia_department_functions
  ADD COLUMN IF NOT EXISTS weight_percentage NUMERIC(5,2) DEFAULT 0;
```

No additional tables are needed. The `ia_departments` table already has `risk_rating`; the calculated department risk score/rating will be derived in the frontend from function data + risk config (consistent with existing architecture where risk scoring is done client-side via `useRiskRatingCalculator`).

## 2. Update `useRiskRatingCalculator` Hook (`src/hooks/useRiskConfig.ts`)

Add a `calculateDeptRisk` function that takes an array of functions and returns the department risk score based on the configured method:

- **maximum**: highest function risk score
- **average**: mean of all function risk scores
- **weighted**: sum of (function_risk_score * weight_percentage / 100)

Each function's risk score is calculated using the existing `calculateScore(likelihood, impact)` method. The likelihood/impact currently stored as text ("Low"/"Medium"/"High") will need a mapping to numeric values (Low=1, Medium=3, High=5 — matching the 1-5 scale in risk config).

Also add a `getLikelihoodImpactScore` helper that maps text labels to the configured parameter scores from `ia_risk_likelihood_params` / `ia_risk_impact_params`.

## 3. Update Function Master (`src/pages/audit/FunctionMaster.tsx`)

### Form Changes
- Add **Weightage %** numeric input field (0-100) to the function add/edit form
- Show a **Department Total Weight** indicator below the field showing current total for the selected department
- Validation: block save if adding this weight would push department total above 100%
- Warning: if weighted method is active and department total is below 100%, show amber warning

### Table/Grouped View Changes
- Add **Weight %** column to the grouped table and flat list
- Add **Risk Score** column (calculated from likelihood × impact using centralized calculator)
- Show department total weight in the collapsible header (e.g., "5 functions • 85% allocated")

### View Modal Changes
- Display Weight %, Risk Score, and Risk Rating (from centralized bands)

### Risk Calculation
- Replace the local `calculateInherentRisk` function with the centralized `useRiskRatingCalculator` hook
- Map existing text-based likelihood/impact ("Low"/"Medium"/"High") to numeric scores

## 4. Update Department View (`src/pages/audit/DepartmentView.tsx`)

- Add a **Calculated Department Risk** card showing:
  - Current calculation method (from risk config)
  - Calculated risk score and rating (using `calculateDeptRisk`)
  - Breakdown showing how the score was derived
  - Total allocated weight % (when weighted method is active)
- Add weight % column to the functions table
- Add tooltip/help text explaining the active formula

## 5. Update Risk Settings — Department Method Tab (`src/pages/audit/RiskSettings.tsx`)

- Remove `disabled: true` and "Coming Soon" badge from the Weighted Risk option
- Update the description to reflect that it is now fully functional
- Change value from `'weighted'` to remain `'weighted'` (already matches the config)

## 6. Update `useAuditData.ts` — Function Mutations

- Include `weight_percentage` in create/update mutations
- Invalidate department-level risk queries when functions change

## 7. Validation Logic

Implemented in the Function Master form:
- `weight_percentage` must be >= 0 and <= 100
- Sum of all `weight_percentage` values for the same `department_id` must not exceed 100
- Before save: query existing functions for the department, sum their weights (excluding the current function if editing), add the new value, reject if > 100

## Files Changed

| File | Change |
|------|--------|
| `ia_department_functions` (migration) | Add `weight_percentage` column |
| `src/hooks/useRiskConfig.ts` | Add `calculateDeptRisk`, likelihood/impact text-to-score mapping |
| `src/pages/audit/FunctionMaster.tsx` | Add weight field, risk score column, department weight totals, centralized risk calc |
| `src/pages/audit/DepartmentView.tsx` | Add calculated department risk card with method-aware scoring |
| `src/pages/audit/RiskSettings.tsx` | Enable weighted method option, remove "Coming Soon" |
| `src/hooks/useAuditData.ts` | Include `weight_percentage` in function mutations |

