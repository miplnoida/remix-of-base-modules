

## Issue: False "workflow initiated" success on `/ip-registration/view/:uuid`

### Root cause (verified in DB and code)

For record `Deacon Moody` (`unique_uuid 64a5b904-…`, `status='P'`), there is already a workflow instance in `workflow_instances` with **`status='Completed'`** (id `7f016d3a-…`, `started_by=NULL`, `started_by_name='System'`).

The flow has two separate, inconsistent guards that interact badly:

1. **`src/services/workflowEligibilityService.ts`** — only treats existing instances with status `InProgress` or `Pending` as blocking. A `Completed` (or `Rejected`, `Cancelled`, `Approved`, `Escalated`, `Query`, `AwaitingMeeting`) instance is silently ignored, and the function returns `eligible: true`. The dialog therefore opens even though a terminal instance exists.
2. **`src/services/workflowTriggerService.ts` (`triggerIPRegistrationWorkflow`)** — its own duplicate check at the top is wider: ANY existing row for the same `source_module + source_record_id` causes it to **return the existing instance's id** instead of inserting a new one.

The hook (`useWorkflowInitialization.confirmWorkflow`) treats any non-null return as success and shows `toast.success("Workflow … initiated successfully")` and writes a `WORKFLOW_INITIATED` audit row — **but no new workflow instance, task, or log is created**. Hence the false success.

A secondary issue: `started_by` is being inserted as `auth user.id`, which is sometimes `undefined` (the older row has `NULL`). When undefined, the `.insert` still succeeds with `started_by_name='System'`, masking the auth context loss.

### Fix plan

**1. Make the two guards agree on one rule (single source of truth for "is there an active instance?")**

In `workflowEligibilityService.ts`:
- Treat the following statuses as **blocking** (an instance exists and is not closed): `Pending`, `InProgress`, `Escalated`, `Query`, `AwaitingMeeting`.
- Treat `Completed`, `Approved`, `Rejected`, `Cancelled` as **closed** — eligible to re-initiate, BUT return the previous instance id/status in the result so the UI can warn ("a previous workflow ended as Completed/Rejected; a new one will be created").
- Return `existingInstanceId` / `existingInstanceStatus` in BOTH branches (currently nulled out in the eligible branch).

In `workflowTriggerService.ts` (`triggerIPRegistrationWorkflow`):
- Replace the blanket "return existing.id if anything exists" with the same status-aware check. Only short-circuit when an **active** instance exists. Otherwise proceed to insert a fresh instance.
- Add an explicit `allowReinitiate` boolean param (default `false`) so callers can opt in to creating a new instance after a closed one. The view-page confirmation flow will pass `true`.

**2. Make success truly mean "a new row was created"**

In `useWorkflowInitialization.confirmWorkflow`:
- Change `triggerIPRegistrationWorkflow` to return a richer result: `{ instanceId: string; created: boolean; reason?: string }` instead of `string | null`.
- Only show `toast.success(...)` when `created === true`. When `created === false` (active duplicate) show `toast.info("A workflow is already in progress for this record")`. On any thrown/returned error show `toast.error(reason)`.
- Only insert the `WORKFLOW_INITIATED` audit row when `created === true`. Use a new `WORKFLOW_REUSED` action when an existing instance is returned.

**3. Persist the correct creator on the instance**

- `started_by` is `uuid NOT NULL`-ish (currently nullable but should be populated). Look up the user via `auth.getUser()` inside the service and fall back to `null` only if truly unauthenticated. Always set `started_by_name` from `profiles.full_name` when possible, else from `useUserCode`'s `user_code`, else `'System'`.
- Block initiation entirely (return `created:false, reason:'Not authenticated'`) if no auth user is found, instead of silently inserting `NULL`.

**4. Verify the insert actually committed before declaring success**

After the `workflow_instances` insert returns, do a follow-up `select id from workflow_instances where id = $newId` round trip. If the row is missing, throw — this catches any silent RLS/policy rejection. Same for `workflow_tasks` insert.

**5. Update the confirmation dialog copy**

In `WorkflowInitiationDialog`, when `eligibility.existingInstanceId` is set AND its status is closed, render a small amber notice: "A previous workflow ended as `<status>`. Confirming will start a NEW workflow instance." This eliminates user surprise.

**6. Remove the broken success path on the view route specifically**

In `IPRegistrationForm.tsx` line ~1238–1248, no UI change needed beyond reflecting the new `created` flag in toasts (the hook handles it).

### Files to change

- `src/services/workflowEligibilityService.ts` — status-aware blocking, always populate `existingInstanceId`/`existingInstanceStatus`.
- `src/services/workflowTriggerService.ts` — return `{ instanceId, created, reason }`, status-aware duplicate check, post-insert verification, proper `started_by` resolution.
- `src/hooks/useWorkflowInitialization.ts` — handle the new return shape, only toast success when `created`, only audit `WORKFLOW_INITIATED` when `created`.
- `src/components/workflow/WorkflowInitiationDialog.tsx` — show "previous workflow ended as X" notice when applicable.
- (Other call sites already importing `triggerIPRegistrationWorkflow` — `useIPRegistrationSubmit`, `useConvertToIPRegistration`, `StartMeetingPage`, `ApplicationDetailPage` — will be updated to read `.instanceId` from the new return shape; behaviour unchanged for them.)

### Verification after implementation

1. Open `/ip-registration/view/64a5b904-318c-4fbf-9b73-3fa171b9a8c8` (status `P`, has Completed instance). Dialog opens with the amber re-initiation notice. Click **Confirm & Initiate**.
2. Confirm a NEW row in `workflow_instances` (`status='InProgress'`, `started_by` populated, fresh `started_at`).
3. Confirm a NEW row in `workflow_tasks` for the first step, and a `workflow_started` row in `workflow_logs`.
4. Confirm a `WORKFLOW_INITIATED` row in `ip_audit_log`.
5. Re-open the page — dialog should NOT appear (the new InProgress instance now blocks eligibility).
6. Force a failure (e.g. temporarily break the RPC) and confirm the toast says **error**, not success.

No DB schema migrations are required.

