

# Make Employer Applications Fully Functional (Matching IP Applications Pattern)

## Summary

The Employer Applications screens already exist but have gaps compared to the Insured Person implementation. The main work is: updating the workflow binding config to use "V2", activating that workflow, aligning the list page filtering with the IP pattern, and adding meeting integration to the detail page.

## Current State

- **List page** (`EmployerApplications.tsx`): Working — fetches from external API via proxy, has workflow binding, workflow status display, sorting, pagination. Uses simple search + status dropdown.
- **Detail page** (`EmployerApplicationDetailPage.tsx`): Working — fetches detail via proxy, shows tabs (Business, Profile, Contact, Address, Workforce, Officials, Owners, Locations, Documents, Declaration), has WorkflowActionButtons and approve/reject dialog.
- **Hooks**: `useEmployerApplications`, `useEmployerApplicationDetail`, workflow binding all functional.
- **Workflow Config**: Currently points to `72795139...` ("Online Employer Registration Review Workflow", **inactive**). The user wants V2: `bf8e92bc-527f-4c67-8c65-1ed5df59fb84` (also inactive, has 1 step).

## Changes

### 1. Activate "Online Employer Registration Review Workflow V2" and update config

- **Database**: Set `is_active = true` on workflow `bf8e92bc-527f-4c67-8c65-1ed5df59fb84`.
- **Code** (`useOnlineApplicationWorkflowBinding.ts`): Update the `'employer'` entry in `WORKFLOW_CONFIGS` to point to the V2 workflow ID and name.

### 2. Align list page filtering with IP pattern

Update `EmployerApplications.tsx` to match `InsuredPersonApplications.tsx` filtering:
- Replace the single search bar with separate **Name**, **Reference Number** filter fields (matching IP pattern).
- Change status filter to use **Pending** (default, excludes closed/approved/rejected), **Closed**, **Rejected** options matching IP.
- Use workflow status (from `workflowStatusMap`) as the effective status for filtering (same logic as IP).
- Add exclusion of approved/completed employer applications from the list (fetch from `workflow_instances` like IP does with `fetchApprovedConvertedRefs`).

### 3. Add meeting integration to detail page

Update `EmployerApplicationDetailPage.tsx`:
- Import and use `useApplicationMeeting` hook to fetch active meetings for the application.
- Add `MeetingActionButtons` in the header (same as IP detail page).
- Add "Go to Meeting" button when an active meeting is in progress.
- Wire `WorkflowActionButtons.onActionComplete` to refresh meeting state after actions.

### 4. Enhance detail page to fully match IP behavior

- Add a **Remarks** tab (already has `application.remarks` in declaration — extract to standalone tab like IP).
- Remove the standalone approve/reject dialog from the detail page (workflow actions handle this via `WorkflowActionButtons`).
- Ensure `WorkflowActionButtons` uses the correct `sourceModule` (`'online-employer-applications'`) and `sourceRecordId` (reference_number or id).

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useOnlineApplicationWorkflowBinding.ts` | Update employer config to V2 workflow ID and name |
| `src/pages/online-applications/EmployerApplications.tsx` | Align filtering with IP pattern (name/ref fields, Pending/Closed/Rejected, exclude approved) |
| `src/hooks/useEmployerApplications.ts` | Add `fetchApprovedConvertedEmployerRefs()` to exclude completed apps |
| `src/pages/online-applications/EmployerApplicationDetailPage.tsx` | Add meeting integration, remarks tab, clean up redundant approve/reject dialog |
| **Database migration** | `UPDATE workflow_definitions SET is_active = true WHERE id = 'bf8e92bc-527f-4c67-8c65-1ed5df59fb84'` |

