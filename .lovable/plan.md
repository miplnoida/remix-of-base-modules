

## Fix: Accept Action Buttons Not Showing for Employer 658852

### Root Cause

Two separate issues are causing the Accept buttons to be missing for the two records:

**1. Sep 2026 SCH-1 (instance `08240b18`)**: The workflow instance is `InProgress` but its task is `Completed` with `assigned_role: NULL` and `assigned_to: NULL`. The previous migration to reset this either failed or was overwritten. Since the task is `Completed`, the `useWorkflowActions` query (which filters for `Pending`/`InProgress` tasks) finds nothing → no buttons rendered.

**2. Mar 2026 SCH-4 (instance `0b6bcf43`)**: The workflow instance itself is `Completed` (with task also `Completed` and `assigned_role: FinanceManager`). However, the `posting_status` is still `PEN` — the workflow completed but the Accept action failed due to the `status` vs `posting_status` trigger bug (now fixed). Since the instance is `Completed`, it's filtered out at line 98 of `useWorkflowActions.ts` → no buttons.

**3. Workflow logs are empty** for both instances because `useC3Submit.ts` inserts using wrong column names (`performed_by`, `performed_by_name`, `details`) instead of the actual columns (`user_id`, `user_name`, `comments`). These inserts silently fail.

### Fix Plan

**1. Migration SQL** — Reset both workflow instances and tasks:
- Instance `08240b18` (Sep 2026 SCH-1): Keep `InProgress`, reset task `d7f85a25` to `Pending`, set `assigned_role = 'FinanceManager'`
- Instance `0b6bcf43` (Mar 2026 SCH-4): Reset to `InProgress`, reset task `c3d2f517` to `Pending` (already has `assigned_role = 'FinanceManager'`)

**2. Code fix** — `src/hooks/useC3Submit.ts` line 251-261: Fix workflow_logs insert to use correct column names:
- `performed_by` → `user_id`
- `performed_by_name` → `user_name`
- `details` → `comments`

### Files to Modify

| File | Change |
|------|--------|
| Migration SQL | Reset both workflow instances/tasks to allow Accept retry |
| `src/hooks/useC3Submit.ts` | Fix workflow_logs column names (lines 251-261) |

