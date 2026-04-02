

# Add Task Assignment on Workflow Instance Detail Screen

## Summary
On the `/admin/workflow-instances/:id` page, when a task is `Pending` and unassigned (`assigned_to` is null), show an "Assign" button. Clicking it opens a dialog with a searchable dropdown of all active users. On selection and confirmation, the task's `assigned_to` and `assigned_to_name` fields are updated via Supabase, and a workflow log entry is created for audit.

---

## Changes

### 1. New Mutation Hook — `src/hooks/useWorkflowInstances.ts`

Add a `useAssignWorkflowTask` mutation hook:

- Accepts `taskId`, `assignToUserId`, `assignToUserName`, `instanceId`, `stepName`, `assignedByUserCode`
- Updates `workflow_tasks` set `assigned_to = userId`, `assigned_to_name = userName` where `id = taskId`
- Inserts a `workflow_logs` entry with action `"Task Assigned"`, `user_name = assignedByUserCode`, `comments = "Assigned to {userName}"`, linked to the instance and step
- Invalidates `workflow-instance-tasks` and `workflow-instance-history` query keys

### 2. UI — `src/pages/admin/workflows/WorkflowInstanceDetail.tsx`

In the Tasks Summary section, for each task card:

- **Condition**: If `task.status === 'Pending'` and `task.assigned_to` is null
- **Show**: An "Assign" button (UserPlus icon)
- **On click**: Opens a `Dialog` with:
  - A `SearchableSelect` populated from `profiles` table (active users: `is_active = true`), showing `full_name`
  - A "Confirm" button that calls the `useAssignWorkflowTask` mutation
- After successful assignment, the task card updates to show the newly assigned user name
- Uses `useUserCode()` to record who performed the assignment

### 3. Active Users Query

Add a `useActiveUsers` query in the same file or hook file:
- Queries `profiles` where `is_active = true`, selects `id, full_name, user_code`
- Used to populate the assignment dropdown

---

## Files Changed

| File | Action |
|------|--------|
| `src/hooks/useWorkflowInstances.ts` | Add `useAssignWorkflowTask` mutation + `useActiveUsers` query |
| `src/pages/admin/workflows/WorkflowInstanceDetail.tsx` | Add assign dialog UI for unassigned pending tasks |

