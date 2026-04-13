

## Fix: Notification Recipient Resolution for All Approver Types

### Problem

The `resolveRecipients` function in `workflow-process-notifications` only handles three step `approver_type` values: `user`, `role`, and `designation`. When a step uses `reporting_manager`, `department_head`, or any other custom approver type, **no recipients are resolved** and notifications silently fail.

Additionally, for **action notifications** with `recipient_type = 'next_step_approver'`, the function currently resolves from the *current* step's approver config instead of the *next* step — which is incorrect for decision-based notifications (e.g., "notify the next reviewer after approval").

### Root Cause

The task creation logic (in `useWorkflowActions`, `useC3Submit`, etc.) correctly resolves reporting managers and assigns them to `workflow_tasks.assigned_to`. But the edge function never checks this already-resolved assignment.

### Fix (single file)

**File: `supabase/functions/workflow-process-notifications/index.ts`**

#### 1. Add task-based fallback in `resolveRecipients`

After the existing `step_approver`/`next_step_approver`/`current_step_approver` block (line 321), add a fallback that queries `workflow_tasks` for already-assigned users when the standard resolution returns empty:

```typescript
// Fallback: resolve from already-assigned workflow task
// Handles reporting_manager, department_head, and any future approver types
if (userIds.length === 0) {
  const { data: tasks } = await supabase
    .from('workflow_tasks')
    .select('assigned_to')
    .eq('instance_id', instance.id)
    .eq('step_id', step.id)
    .in('status', ['Pending', 'InProgress']);
  if (tasks) {
    userIds.push(...tasks.map((t: any) => t.assigned_to).filter(Boolean));
  }
}
```

This is the most robust approach because:
- It automatically works for `reporting_manager`, `department_head`, and any future approver types
- The task assignment logic has already resolved the correct user — we reuse that result
- No duplication of complex resolution logic (reporting manager chain, etc.)

#### 2. Handle `next_step_approver` for action notifications

For `recipient_type = 'next_step_approver'`, the function must resolve the *next* step's approver, not the current step. Update `resolveRecipients` to:
- Accept the full step data including `step_number` and `workflow_id`
- When `recipient_type === 'next_step_approver'` and `trigger === 'action_taken'`, fetch the next step by `step_number + 1` and resolve from that step's approver config
- Apply the same task-based fallback if the next step's approver type is unhandled

This requires fetching `step_number` and `workflow_id` in the step query (line 70) and passing them through.

#### 3. Fix `notification_logs` insert schema

The `notification_logs` inserts include a `type` column that may not exist. Check schema and fix column name or remove it to prevent silent insert failures.

### Summary of Changes

| Area | Change |
|------|--------|
| `resolveRecipients` | Add `workflow_tasks` fallback for all unresolved approver types |
| `resolveRecipients` | Handle `next_step_approver` by fetching the next workflow step |
| Step query (line 70) | Include `step_number, workflow_id` in select |
| `notification_logs` inserts | Fix or remove invalid `type` column |

### Impact

- All existing recipient types (`step_approver`, `initiator`, `specific_role`) continue unchanged
- `reporting_manager`, `department_head`, and any custom types now resolve via task fallback
- `next_step_approver` in action notifications correctly targets the next step's assignee
- Both Step Entry Notifications and Action Notifications benefit from the same fix

