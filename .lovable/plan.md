
# Workflow Step Notifications & Action Visibility Implementation Plan

## Overview
This plan addresses the complete implementation of workflow-driven notifications and action visibility so that when a workflow is initiated, the correct approver is notified and can see/perform the configured actions in both list and detail views.

## Current State Analysis

### What Works
- Workflow triggers are configured to auto-start workflows on application submit
- `WorkflowActionButtons` component correctly identifies available actions based on step configuration
- Permission checking via `checkUserPermission()` validates approver roles/designations/users
- Task creation correctly assigns `assigned_role`, `assigned_designation`, or `assigned_to`
- `in_app_notifications` table exists with user_id, title, body, link, is_read columns

### What's Missing
1. **No Approver Notification**: When workflow tasks are created, approvers are not notified
2. **WorkflowApprovals uses mock data**: The component uses hardcoded mock approvals instead of real tasks
3. **No notification on step transitions**: When workflow moves to next step, new approver is not notified
4. **Missing notification bell badge for pending tasks**: The notification bell shows generic notifications but not workflow-specific pending tasks

---

## Implementation Plan

### Phase 1: Backend - Notification Service Edge Function

**File: `supabase/functions/workflow-notify-approvers/index.ts`** (new)

Creates a Supabase Edge Function to notify approvers when a workflow task is created or transitions to a new step.

```text
Function Logic:
1. Receive: instance_id, step_id, source_record_name, workflow_name
2. Fetch step configuration (approver_type, approver_role_ids, etc.)
3. Based on approver_type:
   - 'role': Find all users with matching roles
   - 'designation': Find all users with matching designations  
   - 'user': Use specified user IDs
4. For each eligible approver:
   - Insert into in_app_notifications with:
     - user_id: approver's ID
     - title: "Pending Approval: {workflow_name}"
     - body: "Application {source_record_name} requires your approval at step: {step_name}"
     - link: "/workflow/approvals?task={task_id}"
5. Optionally queue email notification via notification_logs table
```

### Phase 2: Hook Updates - Integrate Notification Calls

**File: `src/hooks/useIPRegistrationSubmit.ts`**

Update `triggerWorkflow()` to call notification edge function after task creation:
- After creating the first workflow task, invoke `workflow-notify-approvers` function
- Pass instance_id, step_id, record name, workflow name

**File: `src/hooks/useWorkflowActions.ts`**

Update `createNextStepTask()` function:
- After creating the next step's task, call `workflow-notify-approvers` function
- This ensures each step transition notifies the new approver(s)

### Phase 3: Create Pending Approvals Hook

**File: `src/hooks/useWorkflowPendingApprovals.ts`** (new)

A dedicated hook to fetch pending workflow tasks for the current user:

```text
Interface: PendingApproval {
  id: string;
  instance_id: string;
  workflow_name: string;
  step_name: string;
  source_record_id: string;
  source_record_name: string;
  source_module: string;
  status: string;
  created_at: string;
  due_at: string;
  is_overdue: boolean;
  priority: 'High' | 'Medium' | 'Low';
  actions: WorkflowAction[];
}

Functions:
- useMyPendingApprovals(): Fetches all pending tasks for current user
- usePendingApprovalCount(): Returns count for badge display
- useMarkApprovalNotificationRead(): Marks notification as read when task is viewed
```

### Phase 4: Update WorkflowApprovals Component

**File: `src/components/workflow/WorkflowApprovals.tsx`**

Replace mock data with real database queries:
- Use `useMyPendingApprovals()` hook instead of mock data
- Display actual workflow tasks from `workflow_tasks` table
- Calculate waiting time and overdue status from `created_at` and `due_at`
- Wire up Approve/Reject buttons to `useExecuteWorkflowAction` mutation
- Add navigation to detail view on row click

### Phase 5: Update Notification Bell Component

**File: `src/components/notifications/InAppNotificationBell.tsx`**

Enhance to show pending approval count:
- Add separate query for workflow-specific pending tasks
- Show combined badge count (general notifications + pending approvals)
- Add "Pending Approvals" section in dropdown
- Link directly to WorkflowApprovals page

### Phase 6: Application List Integration

Verify `WorkflowActionButtonsCompact` works correctly in:
- `src/pages/ip-registration/IPRegistrationList.tsx` - Already integrated
- Any other application list pages

The component already:
- Fetches workflow context via `useWorkflowActions`
- Shows action buttons only when `canPerformActions` is true
- Hides buttons for non-approvers

### Phase 7: Application Detail Integration

Verify `WorkflowActionButtons` works correctly in:
- `src/pages/ip-registration/IPRegistrationForm.tsx` - Already integrated

The component already:
- Shows current step name
- Displays action buttons based on user permissions
- Handles action confirmation dialogs
- Calls `onActionComplete` callback after action execution

---

## Database Schema Reference

Existing tables used:

```text
in_app_notifications:
- id, user_id, title, body, link, is_read, read_at, created_at

workflow_tasks:
- id, instance_id, step_id, step_name
- assigned_role, assigned_designation, assigned_to
- status, due_at, created_at, completed_at
- action_taken, comments

workflow_instances:
- id, workflow_id, workflow_name
- source_module, source_record_id, source_record_name
- current_step_id, status, started_by, started_by_name
- started_at, completed_at, due_at, metadata

workflow_steps:
- id, workflow_id, step_number, step_name
- approver_type, approver_role_ids, approver_designation_ids, approver_user_ids
- sla_hours, is_final_step
```

---

## Technical Flow Summary

```text
1. User Submits Application
   ↓
2. useIPRegistrationSubmit.triggerWorkflow()
   ↓
3. Creates workflow_instance + workflow_task (status: Pending)
   ↓
4. Calls workflow-notify-approvers Edge Function
   ↓
5. Edge Function identifies approvers via step config
   ↓
6. Creates in_app_notifications for each approver
   ↓
7. Approver sees notification in bell + Pending Approvals page
   ↓
8. Approver clicks → navigates to list/detail view
   ↓
9. WorkflowActionButtons shows Approve/Reject based on permissions
   ↓
10. Approver takes action → useExecuteWorkflowAction
   ↓
11. Task completed, workflow transitions to next step (or ends)
   ↓
12. If next step exists: createNextStepTask() + workflow-notify-approvers
   ↓
13. Previous approver no longer sees actions (task completed)
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/workflow-notify-approvers/index.ts` | Create | Edge function to notify approvers |
| `src/hooks/useWorkflowPendingApprovals.ts` | Create | Hook for fetching pending approvals |
| `src/hooks/useIPRegistrationSubmit.ts` | Modify | Add notification call after task creation |
| `src/hooks/useWorkflowActions.ts` | Modify | Add notification call in createNextStepTask |
| `src/components/workflow/WorkflowApprovals.tsx` | Modify | Replace mock data with real queries |
| `src/components/notifications/InAppNotificationBell.tsx` | Modify | Add pending approvals section |
| `supabase/config.toml` | Modify | Register new edge function |

---

## Verification Checklist

After implementation, verify:

1. Submit a new IP Registration → workflow instance created
2. Check workflow_tasks table → task with correct assigned_role
3. Check in_app_notifications → notification created for approver
4. Log in as approver → see notification in bell
5. Navigate to Pending Approvals → see the task in list
6. Navigate to IP Registration List → see action buttons on pending row
7. Click View → navigate to detail form
8. See WorkflowActionButtons with Approve/Reject options
9. Take action (e.g., Approve) → workflow transitions
10. Check workflow_logs → action logged correctly
11. If next step exists → new task created, new approver notified
12. Log in as original submitter → no action buttons visible (only status)
13. Previous approver no longer sees actions for that application

---

## Security Considerations

- Edge function uses service role to create notifications for any user
- RLS on in_app_notifications ensures users only see their own notifications
- Permission checks in useWorkflowActions prevent unauthorized action execution
- All actions are logged in workflow_logs for audit trail
