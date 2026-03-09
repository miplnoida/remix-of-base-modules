

# Fix: Annual Plan Not Persisting to Database

## Root Cause Analysis

After thorough investigation:
- The `ia_annual_plans` table exists, has correct schema, RLS is **disabled**, and `anon` role has full privileges
- The table is **completely empty** -- no plans have ever been saved
- The form code (`AnnualPlanForm.tsx`) correctly calls `onCreate(payload)` which maps to `createAnnual.mutate(data)`
- The mutation hook correctly calls `supabase.from('ia_annual_plans').insert(plan)`

**The real problem**: The form calls `onClose()` immediately after `onCreate(payload)`, regardless of whether the mutation succeeds or fails. The mutation runs asynchronously, but the modal closes instantly. If the mutation fails (e.g., network issue, Supabase client error), the error toast may never appear because the component unmounts. The user sees the form close and assumes it saved.

Additionally, there is no feedback loop -- the form provides no loading state, no success confirmation tied to actual DB write, and no error recovery.

## Plan

### 1. Fix `AnnualPlanForm.tsx` -- Wait for mutation result before closing

- Change `onCreate` and `onUpdate` props from fire-and-forget callbacks to **async functions** that return a Promise (or use `mutateAsync`)
- Add `isSaving` loading state to disable buttons during submission
- Only call `onClose()` after mutation succeeds
- Show error inline if mutation fails (don't close the form)
- Add `console.error` logging for debugging

### 2. Fix `AuditPlansNew.tsx` -- Pass `mutateAsync` instead of `mutate`

- Change `onCreate={(data) => createAnnual.mutate(data)}` to `onCreate={(data) => createAnnual.mutateAsync(data)}`
- Same for `onUpdate` and all department audit form bindings
- This allows the form to `await` the result

### 3. Fix `DepartmentAuditForm.tsx` -- Same async pattern

- Apply the same fix: await mutation, show loading, only close on success

### 4. Fix `AuditPlans.tsx` (legacy route) -- Same pattern

- Apply same `mutateAsync` wiring

### 5. Add error logging to mutation hooks

- In `useIAAnnualPlanMutations` and `useIADepartmentAuditMutations`, add `console.error` in `onError` callbacks for visibility

## Files to Change

| File | Change |
|---|---|
| `src/components/audit/AnnualPlanForm.tsx` | Make `onCreate`/`onUpdate` async, add loading state, only close on success |
| `src/components/audit/DepartmentAuditForm.tsx` | Same async pattern |
| `src/pages/audit/AuditPlansNew.tsx` | Use `mutateAsync` instead of `mutate` |
| `src/pages/audit/AuditPlans.tsx` | Use `mutateAsync` instead of `mutate` |
| `src/hooks/useAuditData.ts` | Add `console.error` to mutation error handlers |

No database changes needed. No UI redesign.

