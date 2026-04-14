

# Fix: Missing Workflow Action Buttons (Schedule Meeting) on Employer Application Detail Page

## Root Cause

The `EmployerApplicationDetailPage` imports `WorkflowActionButtons` but **never renders it**. Instead, it only renders `EmployerApplicationActions`, which has hardcoded Accept and Reject buttons — completely bypassing the workflow engine.

By contrast, the IP Application Detail page and Doctor Application Detail page both render `<WorkflowActionButtons>` alongside their custom action components, which is how workflow-configured actions like "Schedule a Meeting" appear dynamically.

## Plan

### File: `src/pages/online-applications/EmployerApplicationDetailPage.tsx`

**Add `<WorkflowActionButtons>` to the header action area** (around line 218, before `<EmployerApplicationActions>`):

```tsx
<WorkflowActionButtons
  sourceModule="online-employer-applications"
  sourceRecordId={applicationId || application?.registration_id || null}
  onActionComplete={async (action, endState) => {
    handleActionComplete();
    if (endState === 'Approved' || endState === 'Completed') {
      // Trigger existing accept logic if needed
    }
  }}
/>
```

This will:
- Query the workflow engine for the current step's configured actions (including Schedule Meeting)
- Render them dynamically based on workflow configuration
- Keep the existing hardcoded Accept/Reject buttons from `EmployerApplicationActions` as-is (they serve as direct action shortcuts)

### What changes
| File | Change |
|------|--------|
| `src/pages/online-applications/EmployerApplicationDetailPage.tsx` | Add `<WorkflowActionButtons>` rendering in header actions area |

### What stays unchanged
- `EmployerApplicationActions` component — untouched
- `WorkflowActionButtons` component — already supports employer module
- All other pages (IP, Doctor) — unaffected
- Workflow configuration — no database changes needed

