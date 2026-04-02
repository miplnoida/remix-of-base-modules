

# Card Machine Change Approval Workflow — Implementation Plan

## Summary
Remove the direct card machine edit from Batch Closing. Replace with a workflow-controlled change request process using the existing "Payment-Batch Changes Approval Workflow" (ID: `8983e6e8-6df7-4a04-9d19-0a7e563bde2a`). Add a dedicated approver management screen.

---

## Database Changes

### New Table: `cn_card_machine_change_requests`
Tracks each change request with full audit context.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Request ID |
| `batch_number` | text | Batch reference |
| `payment_id` | integer | cn_payment.payment_id |
| `payment_sequence_no` | integer | cn_payment.payment_sequence_no |
| `current_card_machine_id` | uuid FK → cn_card_machine | Current machine |
| `requested_card_machine_id` | uuid FK → cn_card_machine (nullable) | Desired machine (set after approval) |
| `workflow_instance_id` | uuid FK → workflow_instances | Linked workflow |
| `status` | text | Pending, InProgress, Approved, Rejected, Completed, Cancelled |
| `comment` | text | Cashier's reason for change |
| `skip_comment` | text (nullable) | Comment when cashier skips an approved change |
| `requested_by` | text | UserCode of cashier |
| `requested_at` | timestamptz | Submission time |
| `completed_at` | timestamptz (nullable) | When change was applied or skipped |
| `completed_by` | text (nullable) | UserCode who applied the change |

No RLS per project policy.

---

## New Hook: `src/hooks/useCardMachineChangeRequests.ts`

Provides:
- `useCardMachineChangeRequests(batchNumber)` — fetch all requests for a batch
- `useCreateCardMachineChangeRequest()` — mutation to create request + trigger workflow
- `useApplyCardMachineChange()` — mutation to save new machine after approval (one-time)
- `useSkipApprovedChange()` — mutation to disregard approval with comment, notifies approver
- `useCardMachineChangeRequestsForApprover(filters)` — query for the approver screen with status/date/cashier filters

### Workflow Trigger Logic (inside create mutation):
1. Insert row into `cn_card_machine_change_requests` with status `Pending`
2. Create `workflow_instances` row linked to workflow `8983e6e8-6df7-4a04-9d19-0a7e563bde2a`, `source_module = 'batch_card_machine_change'`, `source_record_id = request.id`
3. Create first `workflow_tasks` row for step `c6d8db29-3671-4857-b5bb-d99b48b7dbb6` (Approval Pending)
4. Insert `workflow_logs` entry
5. Update request status to `InProgress`

### One-Time Edit Logic (apply mutation):
1. Verify request status is `Approved`
2. Verify no prior completion (`completed_at IS NULL`)
3. Update `cn_payment.card_machine_id` for the specific payment_id + sequence_no
4. Update request status to `Completed`, set `completed_at`, `completed_by`, `requested_card_machine_id`
5. Close the workflow instance (`status = 'Completed'`)

### Skip Approval Logic:
1. Verify request status is `Approved`
2. Update request status to `Cancelled`, store `skip_comment`
3. Close workflow instance
4. Send notification to approver via `workflow_logs` entry with action `approval_skipped`

---

## Modified File: `src/pages/cashier/BatchClosing.tsx`

### Transaction Detail Modal Changes
1. **Remove** the `<Select>` dropdown for card machine (lines 789-808) and `handleCardMachineChange` function
2. **Replace** with read-only display of current card machine name
3. **Add** a "Request Card Machine Change" button for CRD/DRD lines
4. **Add** inline status indicator per transaction line showing active request status (badge: Pending/InProgress/Approved/Rejected/Completed)
5. When status is `Approved`, show an "Apply Change" button that opens a modal with:
   - Card machine dropdown (one-time selection)
   - Save button → calls `useApplyCardMachineChange`
6. When status is `Pending` or `InProgress`, disable any edit and show "Approval Pending" badge

### Request Card Machine Change Flow (new dialog):
- Opens a dialog with mandatory comment textarea
- Submit creates the change request and triggers workflow
- Validation: comment must not be empty

### Batch Close Guard:
- Before allowing "Close & Post Batch", check `cn_card_machine_change_requests` for the batch
- If any request has status `Pending` or `InProgress` → **block** batch close with message
- If any request has status `Approved` (not yet applied) → show option to either apply or skip
- Skip requires mandatory comment and triggers notification to approver

---

## New File: `src/pages/cashier/CardMachineChangeRequests.tsx`

Approver/manager screen at route `/cashier/card-machine-change-requests`.

### Features:
- **Filters**: Status (multi-select), Date Range, Cashier (text), Batch Number (text)
- **Table columns**: Request ID, Batch #, Payment ID, Current Machine, Status, Requested By, Date, Actions
- **Row expand/click**: Shows full details including comment, workflow history, approval actions
- **Approval Actions**: Uses existing `useWorkflowActions` hook with `source_module = 'batch_card_machine_change'` to render Approve/Reject buttons per workflow step configuration
- **Audit trail**: Shows workflow logs for each request
- Uses `PermissionWrapper` with `cashier_operations` permission

---

## Routing & Navigation

### `src/components/routing/AppRoutes.tsx`
Add route: `/cashier/card-machine-change-requests` → `CardMachineChangeRequests`

### `src/components/sidebar/menuItems/cashierMenuItems.ts`
Add menu item under Day-End section:
```
{ title: "Card Machine Change Requests", url: "/cashier/card-machine-change-requests", icon: CreditCard }
```

---

## Workflow Integration

The existing workflow definition has:
- **1 step**: "Approval Pending" with `approver_type = 'designation_hierarchy'`
- **1 action**: "Approve" → `end_workflow` with `end_state = 'Approved'`

When workflow completes with `Approved`, the `updateSourceRecordStatus` in `useWorkflowActions.ts` needs to handle the new `source_module = 'batch_card_machine_change'`:
- Update `cn_card_machine_change_requests.status` to `Approved` where `id = source_record_id`

When workflow completes with `Rejected`:
- Update request status to `Rejected`

### Addition to `useWorkflowActions.ts`:
Add `'batch_card_machine_change'` to the `updateSourceRecordStatus` function's module handling.

---

## Audit Trail
- All mutations use `useUserCode()` for `created_by`/`modified_by`
- Workflow logs capture every action (request, approve, reject, apply, skip)
- The `cn_card_machine_change_requests` table stores before/after values and all user actions with timestamps

---

## Files Summary

| File | Action |
|------|--------|
| Database migration | Create `cn_card_machine_change_requests` table |
| `src/hooks/useCardMachineChangeRequests.ts` | **Create** — all CRUD + workflow trigger hooks |
| `src/pages/cashier/BatchClosing.tsx` | **Edit** — remove direct edit, add request/apply/skip flow |
| `src/pages/cashier/CardMachineChangeRequests.tsx` | **Create** — approver management screen |
| `src/hooks/useWorkflowActions.ts` | **Edit** — add `batch_card_machine_change` to `updateSourceRecordStatus` |
| `src/components/routing/AppRoutes.tsx` | **Edit** — add new route |
| `src/components/sidebar/menuItems/cashierMenuItems.ts` | **Edit** — add menu item |

