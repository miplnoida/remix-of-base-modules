

## Analysis: Notifications on Card Machine / Cancel Receipt Request Actions

### Current Notification Flow

| Event | Who Gets Notified | Channel | How |
|-------|-------------------|---------|-----|
| **Request submitted** (Pending → InProgress) | **Approvers** (next step) | In-App + Email (queued) | `workflow-notify-approvers` edge function creates `in_app_notifications` + `notification_logs` entries |
| **Multi-step routing** (step → next step) | **Next step approvers** | In-App + Email (queued) | Same `workflow-notify-approvers` call |
| **Approved** (end_workflow) | **Nobody** | — | Status updated on `cn_card_machine_change_requests` / `cn_receipt_cancel_requests`, but **no notification sent back to the requester** |
| **Rejected** (end_workflow) | **Nobody** | — | Same — status updated, **no notification to requester** |
| **Skip/Disregard approved change** (Approved → Cancelled) | **Nobody** | — | Workflow log written with `notification_type: 'approval_skipped'` in metadata, but **no actual notification dispatched** |
| **Change applied** (Approved → Completed) | **Nobody** | — | Workflow log written, **no notification** |

### The Gap

**The requester (applicant/cashier) is never notified when their request is approved, rejected, or cancelled.** The `workflow-notify-approvers` function only fires when moving *to* a next step (to alert the next approver). When the workflow *ends* (approval or rejection), the code in `useWorkflowActions.ts` lines 617–636 closes the workflow and updates the source record status, but does not call any notification function.

Similarly, the "skip/disregard" flow in `useSkipApprovedChange()` writes a workflow log with `notification_type: 'approval_skipped'` metadata but never actually sends an in-app notification or email to anyone.

### What Needs to Be Built

To notify the request applicant on approval/rejection/cancellation, the following is needed:

**1. Create a `workflow-notify-requester` edge function** (new)
- Accepts: `instance_id`, `action` (Approved/Rejected/Cancelled), `action_by`, `comments`
- Looks up `workflow_instances.started_by` to find the requester's user ID
- Inserts an `in_app_notifications` record for the requester (e.g., "Your card machine change request has been approved")
- Queues an email notification in `notification_logs`

**2. Update `useWorkflowActions.ts`** — after `updateSourceRecordStatus` completes for `end_workflow` actions (line 636), invoke the new `workflow-notify-requester` function with the final status

**3. Update `useSkipApprovedChange()`** in `useCardMachineChangeRequests.ts` — after the workflow log insert (line 361), invoke `workflow-notify-requester` with action `Cancelled`

### Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/functions/workflow-notify-requester/index.ts` | **New** — notify the workflow initiator on final action |
| `src/hooks/useWorkflowActions.ts` | Call `workflow-notify-requester` after `end_workflow` actions |
| `src/hooks/useCardMachineChangeRequests.ts` | Call `workflow-notify-requester` in `useSkipApprovedChange` after skip |

### Impact

This is an additive change. All existing workflow modules (card machine, cancel receipt, and any other workflow using `end_workflow`) will automatically benefit from requester notifications.

