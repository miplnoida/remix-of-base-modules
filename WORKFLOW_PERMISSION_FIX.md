# Workflow Permission Fix - Clerk Role Assignment

## Issue
- Approval/Rejection buttons were not enabled for Clerk role users on step 1 of workflow
- Workflow instance showed step 1 as "unassigned" even though it should be assigned to 'Clerk' role
- Tasks were being created but permission checking was failing

## Root Cause
1. **Permission Check Logic**: The permission check was prioritizing `approver_role_ids` (UUID array) over `assigned_role` (text field)
2. **Role Matching**: When `approver_role_ids` was empty/null, the code wasn't falling back to check `assigned_role` from the step
3. **User Role Retrieval**: The code wasn't properly fetching and comparing user's database roles against the workflow step's role assignment

## Fixes Applied

### 1. Enhanced Permission Checking (`src/hooks/useWorkflowActions.ts`)

**Changes:**
- Added database role fetching at the start of permission check
- Enhanced `checkUserPermission` to accept `userRoleNames` array
- Added fallback logic: if `approver_role_ids` is empty, check `assigned_role` from step
- Improved role matching with case-insensitive comparison
- Added comprehensive console logging for debugging

**Key Updates:**
```typescript
// Now fetches user roles from database
const { data: userRolesData } = await supabase
  .from('AspNetUserRoles')
  .select('RoleId, role:AspNetRoles!AspNetUserRoles_RoleId_fkey(Name)')
  .eq('UserId', user.id);

// Falls back to step's assigned_role if approver_role_ids is empty
if ((!step.approver_role_ids || step.approver_role_ids.length === 0) && step.assigned_role) {
  return await checkTaskLevelAssignment(userId, step.assigned_role, ...);
}
```

### 2. Improved Role Matching (`checkTaskLevelAssignment`)

**Changes:**
- Now accepts `userRoleNames` array for better role comparison
- Checks database roles first, then falls back to mock auth role
- Case-insensitive matching for "Clerk" vs "clerk" vs "CLERK"
- Added detailed logging for debugging

### 3. Enhanced Step Data Fetching (`src/hooks/useIPRegistrationSubmit.ts`)

**Changes:**
- Now fetches `approver_type` and `approver_role_ids` when getting workflow steps
- This ensures we have all necessary data for permission checking

## How It Works Now

### Permission Check Flow:
1. **Check Direct Assignment**: If task is assigned to specific user ID → Allow
2. **Check Step Approver Configuration**:
   - If `approver_type = 'user'` and user ID in `approver_user_ids` → Allow
   - If `approver_type = 'role'`:
     - If `approver_role_ids` is set → Check if user's role IDs match
     - If `approver_role_ids` is empty → **Fall back to `assigned_role`** (NEW)
   - If `approver_type = 'designation'` → Check designation match
3. **Fallback to Task-Level Assignment**:
   - Check `task.assigned_role` against user's roles
   - If task role is null, check `step.assigned_role` (NEW)
   - Case-insensitive matching for role names

### Role Matching Logic:
- **Database Roles**: Checks user's roles from `AspNetUserRoles` table
- **Role Name Matching**: Case-insensitive comparison
  - "Clerk" matches "clerk", "CLERK", "Clerk "
  - Handles spaces and underscores
- **Fallback**: If database check fails, uses role from AuthContext

## Testing Checklist

1. **Verify Workflow Step Configuration**:
   - [ ] Step 1 has `assigned_role = 'Clerk'` OR
   - [ ] Step 1 has `approver_type = 'role'` and `approver_role_ids` includes Clerk role ID

2. **Verify User Role**:
   - [ ] User has 'Clerk' role in `AspNetUserRoles` table
   - [ ] Role name in database matches exactly (case-insensitive)

3. **Test Permission Check**:
   - [ ] Login as Clerk user
   - [ ] Submit an IP registration application
   - [ ] Check browser console for permission check logs
   - [ ] Verify Approve/Reject buttons appear
   - [ ] Verify buttons are enabled (not disabled)

4. **Check Console Logs**:
   Look for these log messages:
   ```
   Workflow permission check: { taskAssignedRole: "Clerk", userRoleName: "Clerk", ... }
   checkUserPermission called: { assignedRole: "Clerk", ... }
   Role match found in userRoleNames: { assignedRole: "Clerk", ... }
   Permission check result: { canPerformActions: true, ... }
   ```

## Database Verification

Run these queries to verify configuration:

```sql
-- Check workflow step configuration
SELECT 
  id, 
  step_name, 
  step_number,
  assigned_role,
  approver_type,
  approver_role_ids
FROM workflow_steps
WHERE workflow_id = '<your-workflow-id>'
ORDER BY step_number;

-- Check user's roles
SELECT 
  ur.UserId,
  r.Name as RoleName
FROM AspNetUserRoles ur
JOIN AspNetRoles r ON ur.RoleId = r.Id
WHERE ur.UserId = '<user-id>';

-- Check workflow task assignment
SELECT 
  id,
  step_name,
  assigned_role,
  assigned_to,
  status
FROM workflow_tasks
WHERE instance_id = '<workflow-instance-id>';
```

## Expected Behavior

### When Step Has `assigned_role = 'Clerk'`:
1. Task is created with `assigned_role = 'Clerk'`
2. Permission check finds step's `assigned_role = 'Clerk'`
3. User's role "Clerk" matches (case-insensitive)
4. `canPerformActions = true`
5. Approve/Reject buttons appear and are enabled

### When Step Has `approver_type = 'role'` and `approver_role_ids`:
1. Task is created with `assigned_role` from step
2. Permission check uses `approver_role_ids` (UUID array)
3. User's role IDs are checked against `approver_role_ids`
4. If match found → `canPerformActions = true`
5. Approve/Reject buttons appear and are enabled

## Debugging

If buttons still don't appear, check browser console for:
1. **"Workflow permission check"** log - shows task assignment
2. **"checkUserPermission called"** log - shows what's being checked
3. **"Role match found"** or **"No role match found"** - shows matching result
4. **"Permission check result"** - final permission decision

Common issues:
- Step's `assigned_role` is null or empty
- User doesn't have Clerk role in database
- Role name mismatch (e.g., "Clerk" vs "clerk" - should be handled now)
- `approver_role_ids` is set but doesn't include Clerk role ID

## Files Modified

1. `src/hooks/useWorkflowActions.ts`
   - Enhanced permission checking
   - Added database role fetching
   - Added fallback to step's assigned_role
   - Improved role matching logic
   - Added comprehensive logging

2. `src/hooks/useIPRegistrationSubmit.ts`
   - Enhanced step data fetching to include approver fields

## Next Steps

1. Test with a Clerk user
2. Check browser console for permission check logs
3. Verify workflow step configuration in database
4. If still not working, check the console logs to identify the exact failure point
