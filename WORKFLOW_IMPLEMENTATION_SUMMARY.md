# Workflow Implementation Summary - Insured Person Registration

## Changes Made

### 1. Submit Action Consistency ✅
**Issue**: Submit action on list screen should call the same function as edit mode.

**Solution**: Both screens now use the unified `submitIPRegistration` function from `useIPRegistrationSubmit` hook:
- **List Screen** (`IPRegistrationList.tsx`): Line 288 - Uses `submitIPRegistration(submitRecord.unique_uuid, user.id)`
- **Edit Screen** (`IPRegistrationForm.tsx`): Line 541 - Uses `submitIPRegistration(formData.unique_uuid, user?.id)`

**Result**: Both screens execute the same validation, SSN generation, workflow trigger, and audit logging logic.

### 2. Workflow Action Buttons in View Mode ✅
**Issue**: Review buttons (Approve/Reject) should be visible in view mode when user has permission.

**Solution**: Removed the status check (`formData.status === 'P'`) that was limiting workflow buttons. The `WorkflowActionButtons` component now handles permission checking internally and will show/hide buttons based on:
- Whether a workflow instance exists
- Whether there's an active task
- Whether the current user has permission to perform actions

**File Changed**: `src/pages/ip-registration/IPRegistrationForm.tsx`
- **Before**: Workflow buttons only showed when `formData.status === 'P'`
- **After**: Workflow buttons always render (component handles visibility internally)

**Result**: Users with appropriate permissions (e.g., Clerk role) can see and use Approve/Reject buttons in both edit and view modes.

### 3. Clerk Role Permission Matching ✅
**Issue**: Workflow action buttons not showing for Clerk role users.

**Solution**: Improved role matching logic in `useWorkflowActions.ts` to handle role name variations:
- Case-insensitive matching (e.g., "clerk" matches "Clerk")
- Normalized matching (handles spaces and underscores)
- Database role matching with case-insensitive comparison

**Files Changed**: `src/hooks/useWorkflowActions.ts`
- Enhanced `checkTaskLevelAssignment` function for better role matching
- Enhanced role name matching in `checkUserPermission` function

**Result**: Clerk role users can now see workflow action buttons when:
- A workflow step is assigned to "Clerk" role
- The workflow step has `assigned_role = 'Clerk'` or `approver_role_ids` includes Clerk role ID
- The user's role matches (case-insensitive)

## How It Works

### Workflow Trigger on Submit
1. User clicks "Submit" on either list or edit screen
2. `submitIPRegistration` function is called
3. Function validates all required fields
4. Backend RPC `submit_ip_registration` is called (generates SSN, updates status to 'P')
5. `triggerWorkflow` function is called:
   - Looks up workflow trigger for `insured_person_registration` module with action `submit`
   - Creates workflow instance
   - Creates first task assigned to the configured role (e.g., Clerk)
   - Logs workflow start

### Workflow Action Buttons Display
1. `WorkflowActionButtons` component calls `useWorkflowActions` hook
2. Hook checks for active workflow instance for the record
3. Hook finds pending/in-progress task for current step
4. Hook checks user permission via `checkUserPermission`:
   - Checks if task is assigned to user
   - Checks if user's role matches `assigned_role` or `approver_role_ids`
   - Checks if user's designation matches `assigned_designation` or `approver_designation_ids`
5. If user has permission, hook fetches available actions for the step
6. Component renders action buttons (Approve, Reject, etc.)

### Permission Checking Logic
The system checks permissions in this order:
1. **Direct Assignment**: Task assigned to specific user ID
2. **Step-Level Approver Configuration**:
   - `approver_type = 'user'`: Check if user ID in `approver_user_ids`
   - `approver_type = 'role'`: Check if user's role matches `approver_role_ids`
   - `approver_type = 'designation'`: Check if user's designation matches `approver_designation_ids`
3. **Task-Level Assignment** (fallback):
   - Check if `assigned_role` matches user's role
   - Check if `assigned_designation` matches user's designation

## Testing Checklist

- [ ] Submit from list screen triggers workflow
- [ ] Submit from edit screen triggers workflow
- [ ] Workflow instance is created with correct step assignment
- [ ] Clerk role user can see Approve/Reject buttons in list view
- [ ] Clerk role user can see Approve/Reject buttons in edit view
- [ ] Clerk role user can see Approve/Reject buttons in view mode
- [ ] Approve action updates record status to 'V' (Verified)
- [ ] Reject action updates record status to 'R' (Rejected)
- [ ] Workflow moves to next step after action
- [ ] Workflow completes when final step is approved

## Database Requirements

Ensure the workflow is configured correctly:
1. **Workflow Trigger**: 
   - Module ID: `305eaff7-8446-47e0-a7ac-186da08b91ee` (Insured Person Registration)
   - Action Name: `submit`
   - Is Active: `true`

2. **Workflow Steps**:
   - First step should have `assigned_role = 'Clerk'` OR
   - First step should have `approver_type = 'role'` and `approver_role_ids` includes Clerk role ID

3. **Workflow Step Actions**:
   - Step should have actions configured (e.g., "Approve", "Reject")
   - Actions should have proper `next_step_type` and `end_state` configuration

## Files Modified

1. `src/pages/ip-registration/IPRegistrationForm.tsx`
   - Removed status check for workflow buttons
   - Workflow buttons now always render (component handles visibility)

2. `src/hooks/useWorkflowActions.ts`
   - Enhanced role matching in `checkTaskLevelAssignment`
   - Enhanced role name matching in `checkUserPermission`
   - Improved case-insensitive and normalized matching

## Notes

- The `WorkflowActionButtons` component automatically handles visibility - it returns `null` if:
  - No workflow exists
  - No active task exists
  - User doesn't have permission
  - No actions are available

- Role matching is now case-insensitive and handles common variations (spaces, underscores, etc.)

- The submit function is the single source of truth for submission logic, ensuring consistency across all entry points.
