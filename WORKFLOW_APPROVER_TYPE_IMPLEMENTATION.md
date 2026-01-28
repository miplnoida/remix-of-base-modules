# Workflow Approver Type Implementation

## Overview
The workflow system now uses `approver_type` and corresponding approver fields (`approver_role_ids`, `approver_designation_ids`, `approver_user_ids`) instead of the legacy `assigned_role` field for task assignment and permission checking.

## Changes Made

### 1. Task Creation Based on Approver Type

**Files Updated:**
- `src/hooks/useIPRegistrationSubmit.ts` - IP Registration workflow trigger
- `src/hooks/useWorkflowActions.ts` - Next step task creation
- `src/hooks/useWorkflows.ts` - General workflow task creation (2 places)
- `src/hooks/useSampleApplications.ts` - Sample application workflow
- `src/hooks/useApplicationsReview.ts` - Application review workflow (2 places)

**Logic:**
When creating a workflow task, the system now:
1. Checks `approver_type` from the workflow step
2. Based on `approver_type`, determines assignment:
   - **`approver_type = 'role'`**: Uses `approver_role_ids` (UUID array)
     - If single role → Sets `assigned_role` to role name (for backward compatibility)
     - If multiple roles → `assigned_role` stays null, permission check uses `approver_role_ids`
   - **`approver_type = 'designation'`**: Uses `approver_designation_ids` (UUID array)
     - Sets `assigned_designation` to first designation ID
   - **`approver_type = 'user'` or `'specific_users'`**: Uses `approver_user_ids` (UUID array)
     - Sets `assigned_to` to first user ID

### 2. Permission Checking Based on Approver Type

**File Updated:** `src/hooks/useWorkflowActions.ts`

**New Logic:**
The permission check now **ONLY** uses `approver_type` configuration:

1. **`approver_type = 'user'` or `'specific_users'`**:
   - Checks if `userId` is in `approver_user_ids` array
   - Returns `true` if user ID matches

2. **`approver_type = 'role'`**:
   - Checks if user's role IDs (from `AspNetUserRoles`) match any role ID in `approver_role_ids`
   - Also checks role names for mock auth compatibility
   - **NO fallback to `assigned_role`** - if `approver_role_ids` is empty, access is denied

3. **`approver_type = 'designation'`**:
   - Gets user's `designation_id` from `profiles` table
   - Checks if it matches any designation ID in `approver_designation_ids`
   - Returns `true` if match found

4. **Other approver types** (`department_head`, `designation_hierarchy`):
   - Currently returns `false` (can be implemented based on business rules)

## Key Differences from Previous Implementation

### Before:
- Used `assigned_role` (text field) for task assignment
- Permission check fell back to `assigned_role` if `approver_role_ids` was empty
- Mixed legacy and new approaches

### After:
- **Task Creation**: Uses `approver_type` to determine assignment
- **Permission Check**: **ONLY** uses `approver_type` and corresponding approver fields
- **No Fallback**: If `approver_role_ids` is empty, access is denied (no fallback to `assigned_role`)
- **Consistent**: All task creation functions use the same logic

## Database Configuration Requirements

### For Clerk Role Assignment:

**Option 1: Using approver_role_ids (Recommended)**
```sql
UPDATE workflow_steps
SET 
  approver_type = 'role',
  approver_role_ids = ARRAY['<clerk-role-uuid>'::uuid],
  approver_role_ids = NULL  -- Clear if previously set
WHERE workflow_id = '<workflow-id>' AND step_number = 1;
```

**Option 2: Using approver_user_ids**
```sql
UPDATE workflow_steps
SET 
  approver_type = 'user',
  approver_user_ids = ARRAY['<user1-uuid>'::uuid, '<user2-uuid>'::uuid],
  approver_role_ids = NULL
WHERE workflow_id = '<workflow-id>' AND step_number = 1;
```

**Option 3: Using approver_designation_ids**
```sql
UPDATE workflow_steps
SET 
  approver_type = 'designation',
  approver_designation_ids = ARRAY['<designation1-uuid>'::uuid],
  approver_role_ids = NULL
WHERE workflow_id = '<workflow-id>' AND step_number = 1;
```

## How to Find Clerk Role ID

```sql
-- Find Clerk role ID
SELECT Id, Name 
FROM AspNetRoles 
WHERE LOWER(Name) = 'clerk' OR LOWER(Name) LIKE '%clerk%';
```

## Testing Checklist

1. **Verify Workflow Step Configuration**:
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

2. **Verify User's Roles**:
   ```sql
   SELECT 
     ur.UserId,
     r.Name as RoleName,
     r.Id as RoleId
   FROM AspNetUserRoles ur
   JOIN AspNetRoles r ON ur.RoleId = r.Id
   WHERE ur.UserId = '<user-id>';
   ```

3. **Test Workflow**:
   - [ ] Submit IP registration
   - [ ] Check workflow instance is created
   - [ ] Check workflow task is created with correct assignment
   - [ ] Login as Clerk user
   - [ ] Verify Approve/Reject buttons appear
   - [ ] Verify buttons are enabled
   - [ ] Test Approve action
   - [ ] Test Reject action

## Console Logging

The system now includes comprehensive logging:
- `checkUserPermission called` - Shows what's being checked
- `Checking permission based on approver_type` - Shows approver configuration
- `Role-based permission granted/denied` - Shows role matching result
- `Permission check result` - Final decision

## Important Notes

1. **No Legacy Fallback**: The system no longer falls back to `assigned_role`. If `approver_role_ids` is empty, access is denied.

2. **Multiple Roles**: If `approver_role_ids` contains multiple role IDs, the task's `assigned_role` will be null, but permission check will work correctly by checking all role IDs.

3. **Task Assignment**: For single role/designation/user, the task gets assigned for display purposes. For multiple, permission is checked dynamically.

4. **Consistency**: All workflow task creation functions now use the same approver_type logic.

## Migration Steps

If you have existing workflows using `assigned_role`:

1. **Update Workflow Steps**:
   ```sql
   -- For each step, set approver_type and approver_role_ids based on assigned_role
   UPDATE workflow_steps ws
   SET 
     approver_type = 'role',
     approver_role_ids = ARRAY[
       (SELECT Id FROM AspNetRoles WHERE Name = ws.assigned_role LIMIT 1)
     ]::uuid[]
   WHERE assigned_role IS NOT NULL 
     AND (approver_type IS NULL OR approver_role_ids IS NULL OR array_length(approver_role_ids, 1) = 0);
   ```

2. **Verify Configuration**:
   - Check that all steps have `approver_type` set
   - Check that `approver_role_ids` contains the correct role IDs
   - Test with users having those roles

## Files Modified

1. `src/hooks/useIPRegistrationSubmit.ts` - Task creation in workflow trigger
2. `src/hooks/useWorkflowActions.ts` - Permission checking and next step task creation
3. `src/hooks/useWorkflows.ts` - General workflow task creation (2 functions)
4. `src/hooks/useSampleApplications.ts` - Sample app workflow
5. `src/hooks/useApplicationsReview.ts` - Application review workflow (2 places)
