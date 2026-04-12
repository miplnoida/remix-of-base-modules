

# Fix: Accept/Reject on Employer Application Detail Page

## Problem

On the **Employer Application Review** screen (`/online-applications/employer/:id`), the Accept and Reject buttons use the generic `WorkflowActionButtons` → `useExecuteWorkflowAction` path. When Accept/Reject fires, it:

1. Completes the workflow task
2. Ends the workflow instance (Completed/Rejected)
3. Calls `updateSourceRecordStatus('online-employer-applications', sourceRecordId, ...)`
4. **Silently exits** — there is no handler for `online-employer-applications` in `updateSourceRecordStatus`

**What the meeting flow does differently** (StartMeetingPage):
1. Validates the application data
2. **Converts the external application to an `er_master` record** via `convert_application_to_employer` RPC (creates er_master, er_owner, er_locations, er_notes, documents)
3. Closes the meeting with approval status
4. **Triggers the "Employer Registration Approval Workflow"** via `meeting-api-handler` edge function
5. Navigates to the newly created employer registration

The employer detail page **skips step 2 and 4** entirely — it never creates the er_master record or triggers the approval workflow.

## Solution

Add the same conversion + workflow trigger logic to the Accept/Reject flow on the employer detail page. This requires:

### Step 1: Create a new `EmployerApplicationActions` component

A new component placed on `EmployerApplicationDetailPage.tsx` that replaces the generic `WorkflowActionButtons` for the `online-employer-applications` module. This component will:

- Show Accept and Reject buttons (same styling as the meeting flow)
- On **Accept**: open a confirmation dialog with optional remarks, then:
  1. Call `useConvertToEmployerRegistration` to create the er_master record
  2. Close the workflow (meeting close + workflow instance update) via `meeting-api-handler` edge function's `close_meeting_approved` action OR replicate the same logic directly with Supabase queries
  3. Trigger the "Employer Registration Approval Workflow" via `employerWorkflowTriggerService`
  4. Navigate to the new employer registration page
- On **Reject**: open a dialog requiring remarks, then:
  1. End the workflow instance as Rejected
  2. Complete all pending tasks
  3. Log the rejection

### Step 2: Update `EmployerApplicationDetailPage.tsx`

- Replace the current `WorkflowActionButtons` with the new `EmployerApplicationActions` component
- Pass the application data, workflow instance details, and meeting reference
- Wire up `onActionComplete` for cache invalidation

### Step 3: Handle the "no meeting" case

The detail page may or may not have a meeting linked. The component needs to:
- If a meeting exists and is InProgress → use the meeting-based approval flow (same as StartMeetingPage)
- If a meeting exists but is not InProgress → show meeting action buttons (already working)
- If no meeting exists but workflow is active → perform direct workflow completion with conversion

### Technical Details

**File changes:**

| File | Change |
|------|--------|
| `src/components/online-applications/EmployerApplicationActions.tsx` | New component — Accept/Reject with conversion logic |
| `src/pages/online-applications/EmployerApplicationDetailPage.tsx` | Replace `WorkflowActionButtons` with new component, pass application data |
| `src/hooks/useWorkflowActions.ts` | Add `online-employer-applications` handler in `updateSourceRecordStatus` as a fallback (logs warning, no-ops — conversion handled by component) |

**Accept flow in new component:**
1. Validate application data via `validateEmployerApplicationForConversion`
2. Call `convertToEmployer()` from `useConvertToEmployerRegistration`
3. If meeting exists → invoke `meeting-api-handler` edge function `close_meeting_approved`
4. If no meeting → directly update workflow instance to Completed, complete tasks, trigger employer approval workflow via `employerWorkflowTriggerService`
5. Invalidate caches and navigate

**Reject flow:**
1. Require remarks
2. If meeting exists → invoke `useCloseMeetingWithRejection`
3. If no meeting → directly update workflow instance to Rejected, complete tasks
4. Invalidate caches and navigate back

This replicates the exact same logic as the StartMeetingPage but works from the detail page context, with or without a meeting.

