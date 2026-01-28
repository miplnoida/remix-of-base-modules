# Workflow Approver Type Implementation - Complete Fix

## Summary
The workflow system has been updated to **exclusively use `approver_type` and corresponding approver fields** instead of the legacy `assigned_role` field. This ensures consistent task assignment and permission checking based on the workflow step's approver configuration.

## Changes Made

### 1. Task Creation Functions Updated

All workflow task creation functions now use `approver_type` logic:

#### Files Modified:
1. **`src/hooks/useIPRegistrationSubmit.ts`**
   - `triggerWorkflow()` function
   - Creates first task based on `approver_type`

2. **`src/hooks/useWorkflowActions.ts`**
   - `createNextStepTask()` function
   - Creates next step tasks based on `approver_type`

3. **`src/hooks/useWorkflows.ts`**
   - `useProcessWorkflowTask()` - Next step task creation
   - `useStartWorkflow()` - First task creation

4. **`src/hooks/useSampleApplications.ts`**
   - `useSubmitSampleApplication()` - First task creation

5. **`src/hooks/useApplicationsReview.ts`**
   - `useProcessReviewAction()` - Next step task creation (2 places: specific_step and next_step cases)

### 2. Permission Checking Updated

**File:** `src/hooks/useWorkflowActions.ts`

**Changes:**
- **Removed** fallback to `assigned_role`
- **Only** checks `approver_type` and corresponding approver fields
- Enhanced role matching with database role checking
- Added comprehensive logging

### 3. Task Assignment Logic

When creating a workflow task, the system:

1. **Checks `approver_type`** from workflow step
2. **Determines assignment** based on type:

   **For `approver_type = 'role'`:**
   - Uses `approver_role_ids` (UUID array)
   - If single role → Gets role name and sets `assigned_role` (for display)
   - If multiple roles → `assigned_role` stays null (permission check uses `approver_role_ids`)

   **For `approver_type = 'designation'`:**
   - Uses `approver_designation_ids` (UUID array)
   - Sets `assigned_designation` to first designation ID

   **For `approver_type = 'user'` or `'specific_users'`:**
   - Uses `approver_user_ids` (UUID array)
   - Sets `assigned_to` to first user ID

### 4. Permission Check Logic

The permission check **ONLY** uses approver configuration:

1. **`approver_type = 'user'` or `'specific_users'`**:
   ```typescript
   if (step.approver_user_ids.includes(userId)) return true;
   ```

2. **`approver_type = 'role'`**:
   ```typescript
   // Check if user's role IDs match approver_role_ids
   const userRoleIds = getUserRolesFromDatabase(userId);
   if (approver_role_ids.some(id => userRoleIds.includes(id))) return true;
   ```
   - **No fallback** - if `approver_role_ids` is empty, access is denied

3. **`approver_type = 'designation'`**:
   ```typescript
   const userDesignation = getUserDesignationFromProfile(userId);
   if (approver_designation_ids.includes(userDesignation)) return true;
   ```

## Database Configuration

### To Assign Step 1 to Clerk Role:

```sql
-- Step 1: Find Clerk role ID
SELECT Id, Name FROM AspNetRoles WHERE LOWER(Name) = 'clerk';

-- Step 2: Update workflow step
UPDATE workflow_steps
SET 
  approver_type = 'role',
  approver_role_ids = ARRAY['<clerk-role-uuid>'::uuid]
WHERE 
  workflow_id = '<your-workflow-id>' 
  AND step_number = 1;
```

### Verify Configuration:

```sql
SELECT 
  step_number,
  step_name,
  approver_type,
  approver_role_ids,
  approver_designation_ids,
  approver_user_ids
FROM workflow_steps
WHERE workflow_id = '<your-workflow-id>'
ORDER BY step_number;
```

## How It Works

### Example: Clerk Role Assignment

1. **Workflow Step Configuration:**
   ```json
   {
     "step_number": 1,
     "step_name": "Clerk Review",
     "approver_type": "role",
     "approver_role_ids": ["<clerk-role-uuid>"]
   }
   ```

2. **Task Creation:**
   - System checks `approver_type = 'role'`
   - Gets role name from `approver_role_ids[0]`
   - Creates task with `assigned_role = 'Clerk'` (for display)

3. **Permission Check:**
   - User logs in as Clerk
   - System fetches user's roles from `AspNetUserRoles`
   - Checks if Clerk role ID matches any ID in `approver_role_ids`
   - If match → `canPerformActions = true`
   - Approve/Reject buttons appear

## Testing

1. **Check Workflow Step:**
   ```sql
   SELECT * FROM workflow_steps 
   WHERE workflow_id = '<workflow-id>' AND step_number = 1;
   ```
   - Verify `approver_type = 'role'`
   - Verify `approver_role_ids` contains Clerk role UUID

2. **Check User Roles:**
   ```sql
   SELECT r.Name 
   FROM AspNetUserRoles ur
   JOIN AspNetRoles r ON ur.RoleId = r.Id
   WHERE ur.UserId = '<clerk-user-id>';
   ```
   - Should return 'Clerk' or similar

3. **Test in Application:**
   - Submit IP registration
   - Login as Clerk
   - Check browser console for permission logs
   - Verify Approve/Reject buttons appear and are enabled

## Console Logging

The system logs detailed information:
- `checkUserPermission called` - Input parameters
- `Checking permission based on approver_type` - Approver configuration
- `Role-based permission granted/denied` - Role matching result
- `Permission check result` - Final decision

## Important Notes

1. **No Legacy Support**: The system no longer uses `assigned_role` for permission checking. Only `approver_type` and approver fields are used.

2. **Empty approver_role_ids**: If `approver_type = 'role'` but `approver_role_ids` is empty, access will be **denied**.

3. **Multiple Roles**: If `approver_role_ids` has multiple role IDs, the task's `assigned_role` may be null, but permission checking will work correctly by checking all role IDs.

4. **Consistency**: All 6 task creation functions now use the same approver_type logic.

## Migration Required

If you have existing workflows, you need to migrate them:

```sql
-- Migrate existing steps to use approver_role_ids
UPDATE workflow_steps ws
SET 
  approver_type = 'role',
  approver_role_ids = ARRAY[
    (SELECT Id FROM AspNetRoles WHERE Name = ws.assigned_role LIMIT 1)
  ]::uuid[]
WHERE 
  assigned_role IS NOT NULL 
  AND (approver_type IS NULL OR approver_role_ids IS NULL OR array_length(approver_role_ids, 1) = 0);
```

## Files Modified Summary

1. `src/hooks/useIPRegistrationSubmit.ts` - Task creation in workflow trigger
2. `src/hooks/useWorkflowActions.ts` - Permission checking + next step task creation
3. `src/hooks/useWorkflows.ts` - 2 task creation functions
4. `src/hooks/useSampleApplications.ts` - Sample app workflow
5. `src/hooks/useApplicationsReview.ts` - 2 task creation functions

**Total: 7 task creation functions updated + 1 permission check function updated**
