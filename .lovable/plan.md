

# Fix: Remove Duplicate Accept/Reject Buttons on Employer Application Detail Page

## Problem

After adding `WorkflowActionButtons`, the page now shows **two** Accept and **two** Reject buttons:
1. **Workflow buttons** — from `WorkflowActionButtons` (generic workflow engine actions)
2. **Hardcoded buttons** — from `EmployerApplicationActions` (with employer conversion logic)

They are **not the same**:
- The workflow Accept only updates workflow status (Approve step, move to next step)
- The hardcoded Accept converts the application to an employer registration record (`er_master`), closes the meeting/workflow, triggers the next approval workflow, and navigates to the new employer

## Solution

Remove `EmployerApplicationActions` from rendering and move its critical business logic (employer conversion) into the `WorkflowActionButtons` `onActionComplete` callback. This way:
- Only one set of Accept/Reject buttons appears (workflow-driven)
- When the workflow Accept completes, the employer conversion logic runs automatically
- Schedule Meeting and any other workflow-configured actions continue to work

### File: `src/pages/online-applications/EmployerApplicationDetailPage.tsx`

**Replace** the current `WorkflowActionButtons` + `EmployerApplicationActions` block with a single `WorkflowActionButtons` that handles employer conversion in its `onActionComplete`:

```tsx
<WorkflowActionButtons
  sourceModule="online-employer-applications"
  sourceRecordId={applicationId || application?.registration_id || null}
  onActionComplete={async (action, endState) => {
    handleActionComplete();
    
    if (endState === 'Approved' || action === 'Approve') {
      // Trigger the same employer conversion logic that was in EmployerApplicationActions
      try {
        const result = await convertToEmployer({
          applicationData: application,
          userId: user?.id || '',
          userCode: userCode || '',
          applicationReference: applicationId || application?.id || '',
          meetingId: meeting?.id,
        });
        if (result.success && result.regno) {
          toast.success(`Employer Registration ${result.regno} created successfully.`);
          // Trigger next workflow
          await triggerEmployerRegistrationWorkflow(result.regno, ...);
          navigate(`/employer-registration/view/${result.regno}`);
        }
      } catch (err) {
        toast.error('Failed to convert application');
      }
    } else if (endState === 'Rejected' || action === 'Reject') {
      // Close meeting if exists
      if (meeting?.id) { /* close meeting with rejection */ }
      navigate(-1);
    }
  }}
/>
```

**Remove** the `<EmployerApplicationActions>` component rendering entirely.

**Add** the necessary imports/hooks that were previously only in `EmployerApplicationActions`:
- `useConvertToEmployerRegistration` hook
- `triggerEmployerRegistrationWorkflow` service
- `useUserCode` hook (if not already imported)

### What changes

| File | Change |
|------|--------|
| `src/pages/online-applications/EmployerApplicationDetailPage.tsx` | Remove `EmployerApplicationActions` rendering; move conversion logic into `WorkflowActionButtons.onActionComplete` |

### What stays unchanged

- `EmployerApplicationActions` component file — kept for potential reuse but no longer rendered on this page
- `WorkflowActionButtons` component — untouched
- All workflow configuration — no database changes
- Meeting logic — meeting close is handled in the callback
- IP and Doctor application pages — unaffected

