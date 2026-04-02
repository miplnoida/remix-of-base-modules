

# Fix: Approve/Reject Buttons Not Working on Card Machine Change Requests Detail Modal

## Root Cause

In `src/pages/cashier/CardMachineChangeRequests.tsx`, the `handleWorkflowAction` function (lines 86-99) is a **no-op stub** — it contains only comments and no actual logic. The Approve/Reject buttons call this empty function, so nothing happens when clicked.

The fix is to import and use the existing `useExecuteWorkflowAction` mutation hook from `useWorkflowActions.ts`, which handles the full workflow execution lifecycle (task completion, logging, status updates, source record updates).

Additionally, the `onSuccess` of the mutation needs to invalidate the change-requests queries so the list and detail modal refresh after an action.

---

## Changes

### File: `src/pages/cashier/CardMachineChangeRequests.tsx`

1. **Import** `useExecuteWorkflowAction` from `@/hooks/useWorkflowActions`
2. **Add** `useExecuteWorkflowAction()` mutation inside `RequestDetailModal`
3. **Replace** the empty `handleWorkflowAction` function body with a call to `executeAction.mutateAsync()`, passing:
   - `taskId` from `workflowCtx.taskId`
   - `actionId` from the clicked action
   - `comments` from the remarks textarea
   - `sourceModule: 'batch_card_machine_change'`
   - `sourceRecordId: request.id`
4. **On success**: close the dialog, reset remarks, invalidate `card-machine-change-requests-approver` and `workflow-logs-for-request` queries
5. **Use** `executeAction.isPending` instead of local `actionLoading` state to disable buttons during execution
6. **Add** `DialogDescription` to fix the console warning about missing Description

---

## Technical Details

The `useExecuteWorkflowAction` mutation already handles:
- Completing the workflow task
- Creating workflow log entries
- Routing to next step or ending workflow
- Calling `updateSourceRecordStatus` which handles `batch_card_machine_change` module (updating `cn_card_machine_change_requests.status`)

No database changes or new hooks are needed — only wiring the existing mutation into the UI.

