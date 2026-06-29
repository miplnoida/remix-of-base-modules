## Problem

In the Violations list (`/compliance/violations`), the **Amount** column renders `-` for most rows. Root cause is two display-layer bugs:

1. `v.total_amount ? ... : '-'` — when `total_amount = 0` (the value most rows currently have), `0` is falsy → renders `-` instead of `$0.00`.
2. No fallback when `total_amount` is null — components (`principal_amount + penalty_amount + interest_amount`) are ignored.

The data fetch (`fetchViolationsPaginated`) already selects all four amount columns — no service or DB changes needed.

## Fix (frontend display only)

### 1. `src/pages/compliance/violations/ViolationsManagement.tsx`
- Add helper `resolveTotal(v)` returning `Number(total_amount)` when non-null, else `principal + penalty + interest`.
- Render Amount cell as `currencyFormatter.format(resolveTotal(v))`.

### 2. `src/pages/compliance/violations/VerificationQueue.tsx`
- Apply `resolveTotal` fallback for the Total cell/field. Principal/Penalty/Interest fields unchanged.

### 3. `src/pages/compliance/violations/DuplicateReview.tsx`
- Apply `resolveTotal` fallback for the Total row.

### 4. `src/pages/compliance/violations/RuleDetectedViolations.tsx` (newly added)
- Add an **Amount** column to the table header and body, populated via `resolveTotal(v)` with currency formatter. The select in `fetchViolationsPaginated` already returns the needed fields.

## Verification

- `/compliance/violations` — `total_amount = 0` rows now show `$0.00`; rows with null total but non-zero components show the summed amount.
- `/compliance/violations/rule-detected` — new Amount column populated.
- Verification Queue + Duplicate Review Total cells reflect the same rule.