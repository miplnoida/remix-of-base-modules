

# Fix: Card Machine Change Request — Missing Reporting Manager Resolution

## Root Cause

The workflow instance `285b2223-...` was created by `useCardMachineChangeRequests.ts`, which **bypasses** all approver resolution logic. At lines 136-144, it creates the task with a bare insert — no `assigned_to`, no `assigned_role`, no call to `resolveReportingManagerForTask()`.

The step `c6d8db29-...` is configured with `approver_type = 'reporting_manager'`, and the initiator (SAdmin) **does** have a valid, active reporting manager (Kendra Manning). The resolution simply was never attempted.

This is the 9th task-creation code path discovered — it was missed during the original implementation because it manually hardcodes workflow/step IDs rather than using the shared trigger service.

## Data Verification

- **Initiator**: SAdmin (`62c928c3-...`)
- **Reporting Manager**: Kendra Manning (`6db7b141-...`) — active ✓
- **Task Status**: Pending, `assigned_to = NULL` — resolution never ran

## Fix

### Step 1: Update `useCardMachineChangeRequests.ts` — Add Reporting Manager Resolution

In the task creation block (lines 135-146), add approver resolution logic before inserting the task:

1. Query the workflow step to get `approver_type`
2. If `approver_type === 'reporting_manager'`, call `resolveReportingManagerForTask()` with the current user's ID
3. Set `assigned_to` and `assigned_to_name` on the task insert from the resolved manager
4. If resolution fails, leave task unassigned (existing fallback behavior)

```typescript
// Before creating the task, resolve the approver
let assignedTo: string | null = null;
let assignedToName: string | null = null;

// Fetch step config to check approver_type
const { data: stepConfig } = await supabase
  .from('workflow_steps')
  .select('approver_type')
  .eq('id', FIRST_STEP_ID)
  .single();

if (stepConfig?.approver_type === 'reporting_manager' && user.id) {
  const { resolveReportingManagerForTask } = await import('@/services/resolveReportingManager');
  const resolved = await resolveReportingManagerForTask(
    user.id, instance.id, FIRST_STEP_ID, FIRST_STEP_NAME
  );
  if (resolved) {
    assignedTo = resolved.managerId;
    assignedToName = resolved.managerName;
  }
}

// Then use assignedTo/assignedToName in the task insert
```

### Step 2: Data Fix — Assign the Existing Pending Task

Run a migration to assign the existing unassigned task to Kendra Manning so the current workflow instance unblocks without needing to be recreated:

```sql
UPDATE workflow_tasks
SET assigned_to = '6db7b141-0f84-4f15-a52c-94218d2afe8c',
    assigned_to_name = 'Kendra Manning'
WHERE id = '2e991597-16fd-4f7b-97aa-8b6a8bd11937'
  AND assigned_to IS NULL;
```

Also insert the missing audit log entry for traceability.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useCardMachineChangeRequests.ts` | Add reporting manager resolution before task creation |
| Database migration | Fix existing task assignment + audit log |

