

# Fix: Annual Plan Submission → Approval Flow

## Root Cause

The forms **never save data to the database**. Both `AnnualPlanForm` and `DepartmentAuditForm` only show toast messages and close — they never call any mutation hook. The `ia_annual_plans` table is completely empty.

Additionally, there's a column name mismatch: code references `plan_id` but the actual DB column is `annual_plan_id`.

## Issues Found

1. **`AnnualPlanForm.tsx`** — `handleSaveDraft` and `handleSubmit` only show toasts. No `create.mutate()` or `update.mutate()` call.
2. **`DepartmentAuditForm.tsx`** — `handleSave` only shows a toast. No database insert.
3. **`useAuditDataExtended.ts`** — filters by `r.plan_id` but the DB column is `annual_plan_id`.
4. **`PlanApproval.tsx`** — references `audit.plan_id` but should be `audit.annual_plan_id`.
5. **`AuditPlansNew.tsx`** — references `row.plan_id` and `editDept.plan_id` but should be `annual_plan_id`.

## Plan

### 1. Fix `AnnualPlanForm.tsx`
- Accept `onCreate` and `onUpdate` callback props (mutations passed from parent).
- On "Save Draft": call `onCreate`/`onUpdate` with `status: 'Draft'` and form data mapped to DB columns (`fiscal_year`, `title`, `objective`, `scope`, `methodology`).
- On "Submit for Review": same but with `status: 'Submitted'` and `submitted_date`.
- Map camelCase form state to snake_case DB columns.

### 2. Fix `DepartmentAuditForm.tsx`
- Accept `onCreate`/`onUpdate` callback props.
- On save: call mutation with data mapped to DB columns (`annual_plan_id`, `department_id`, `department_name`, `period`, `month_year`, `functions`, `objective`, `scope`, `risk_rating`, `lead_auditor_id`, `planned_start`, `planned_end`, `team_member_ids`).

### 3. Fix `AuditPlansNew.tsx` (parent page)
- Pass `create.mutate` and `update.mutate` from `useIAAnnualPlanMutations()` / `useIADepartmentAuditMutations()` into the form components.
- Fix all `plan_id` references to `annual_plan_id`.

### 4. Fix `useAuditDataExtended.ts`
- Change `r.plan_id` filter to `r.annual_plan_id`.

### 5. Fix `PlanApproval.tsx`
- Change `audit.plan_id` references to `audit.annual_plan_id`.

### 6. Fix `AuditPlans.tsx` (old page)
- Pass mutations into `AnnualPlanForm` so the old route also works.

No UI redesign. No route changes. Only wiring up the existing mutations to the existing forms.

