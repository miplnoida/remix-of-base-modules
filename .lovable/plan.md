

## Plan: Fix Employer Application Approval and Conversion Flow

### Problem Analysis

When a reviewer clicks "Approve" on an employer application meeting (e.g., MTG-2026-000035), nothing happens. Two root causes:

1. **`useCloseMeetingWithApproval` calls the `meeting-api-handler` edge function** which suffers from cold-start delays (1-5s+). This edge function does 6+ sequential database operations. Combined with the conversion RPC, the total wait exceeds practical timeouts, causing the UI to appear frozen or silently fail.

2. **The conversion RPC (`convert_application_to_employer`) may succeed, but the subsequent meeting-closure edge function call hangs**, so the user never sees a success toast, the meeting status never changes, and navigation never happens. The meeting MTG-2026-000035 is still `InProgress` with no outcome recorded.

3. **No navigation to the new employer registration** — even on success, the page navigates to `/meetings/manage` without telling the user the new registration number or linking to it.

### Fix Strategy

Replace the edge function call in `useCloseMeetingWithApproval` with direct Supabase client queries (same pattern already applied to `useMeetings` data loading). This eliminates the cold-start bottleneck entirely.

### Step 1: Replace `useCloseMeetingWithApproval` with direct queries
**File**: `src/hooks/useMeetings.ts`

Replace the `supabase.functions.invoke('meeting-api-handler', { body: { action: 'close_meeting_approved' } })` call with direct Supabase client operations:

1. Fetch the meeting record (with workflow_instances join)
2. Update the `meetings` table: set `status='Closed'`, `outcome='ClosedWithApproval'`, timestamps, user info
3. Insert a `meeting_history` record
4. If `workflow_instance_id` exists:
   - Update `workflow_instances` status to `Approved`
   - Update pending `workflow_tasks` to `Completed`
   - Insert a `workflow_logs` entry
5. Optionally save `applicationData` to the primary table if the workflow instance has `primary_table` metadata

All DB operations mirrored from the existing edge function logic (lines 844-1007 of `meeting-api-handler/index.ts`). The external API trigger (`triggerActionWorkflowApi`) will be skipped for now since it's non-blocking and not essential.

### Step 2: Replace `useCloseMeetingWithRejection` with direct queries
**File**: `src/hooks/useMeetings.ts`

Same pattern — replace edge function call with direct Supabase operations for rejection flow.

### Step 3: Navigate to new employer registration after approval
**File**: `src/pages/meetings/StartMeetingPage.tsx`

After successful employer conversion + meeting closure, navigate to `/employer-registration/view/{regno}` instead of `/meetings/manage`, so the reviewer sees the newly created registration.

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useMeetings.ts` | Replace `useCloseMeetingWithApproval` and `useCloseMeetingWithRejection` edge function calls with direct Supabase client queries |
| `src/pages/meetings/StartMeetingPage.tsx` | After successful employer conversion, navigate to the new registration view page |

### Expected Result
- Approval completes in ~1-2s (direct DB queries, no edge function cold start)
- Meeting status changes to `Closed` with `ClosedWithApproval` outcome
- `er_master` record is created with `P` (Pending) status
- User is navigated to `/employer-registration/view/{regno}` to see the new registration

