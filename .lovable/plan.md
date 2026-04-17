

## Plan: Hide Approve/Reject on Employer Edit screen

### Issue
On `/employer-registration/edit/:regno` the screen currently shows both:
- `Submit` button (correctly gated to Draft `status === 'Z'`)
- `Approve` / `Reject` buttons rendered by `<WorkflowActionButtons sourceModule="employers" .../>` (lines 290-296 of `EmployerRegistrationForm.tsx`)

Per requirement, the **Edit** screen is for the applicant/data-entry user. Approve/Reject belong to reviewers and must be performed from the **View** screen (`/employer-registration/view/:regno`) — which is exactly where workflow tasks already deep-link reviewers via `taskRedirect`.

### Fix (single file, surgical)
**File:** `src/pages/employer-registration/EmployerRegistrationForm.tsx`

Wrap the `<WorkflowActionButtons>` block (lines 290-296) so it renders **only in View mode**:

```tsx
{isViewMode && (
  <WorkflowActionButtons
    sourceModule="employers"
    sourceRecordId={formData.regno || null}
    variant="default"
    onActionComplete={handleWorkflowActionComplete}
  />
)}
```

That's the entire change.

### Why this is safe & complete
- **Submit flow unchanged** — already uses `useEmployerRegistrationSubmit` → `submit_er_registration` Supabase RPC → triggers workflow. Fully functional via Supabase endpoints.
- **Approve / Reject still work** — reviewers are already routed to the **View** route by the workflow task system (`taskRedirect` / notification deep links use `/view/`, not `/edit/`). The `WorkflowActionButtons` component itself, the `execute_workflow_action` RPC, and the audit / notification side-effects remain untouched.
- **New mode** (`/employer-registration/new`) — `isViewMode` is false, so Approve/Reject also correctly hidden (they were never useful there anyway since `formData.regno` is null).
- **Edit mode** (`/employer-registration/edit/:regno`) — only `Submit` shows, and only while `status === 'Z'` (Draft), exactly as required.
- **No DB changes, no edge function changes, no permission changes, no route changes.**

### Verification
1. `/employer-registration/edit/T00010` (Draft) → only **Submit** visible. ✅
2. `/employer-registration/edit/<permanent-regno>` (Pending/Active) → no action buttons (Submit hidden by status, Approve/Reject hidden by mode). ✅
3. `/employer-registration/view/<regno>` → **Edit** + **Approve / Reject** still visible for users with the workflow task. ✅
4. Reviewer clicks Approve from notification → still lands on `/view/...` and acts successfully via existing RPC flow. ✅
5. Submit on edit screen → still calls `submit_er_registration` RPC → triggers workflow notification to reviewer. ✅

### Files changed
- `src/pages/employer-registration/EmployerRegistrationForm.tsx` — wrap one JSX block in `{isViewMode && ( ... )}` (≈ 3 lines diff).

### Out of scope
- No memory update needed (existing `mem://features/workflow/employer-registration-flow` already documents the lifecycle; this is a UI scoping refinement, not a flow change).
- No knowledge-repo entry change required beyond noting that Approve/Reject render only in View mode (will add a brief note to that memory after implementation).

