

# Add "Reporting To" Dropdown Based on Designation Hierarchy

## Overview
When a user selects a Designation on the Create/Edit User screens, the system checks the `designation_hierarchy` table. If the selected designation has a parent (higher) designation, a "Reporting To" dropdown appears next to it showing all users who hold that higher designation. Selection is optional. If no parent designation exists or no users hold the parent designation, the dropdown stays hidden.

## Database Migration

Add a `reporting_to_user_id` column to the `profiles` table:

```sql
ALTER TABLE profiles ADD COLUMN reporting_to_user_id uuid REFERENCES profiles(id);
```

## New Hook — `useHigherDesignationUsers`

**File: `src/hooks/useDesignations.ts`** — Add a new hook:

```typescript
export function useHigherDesignationUsers(designationId: string | undefined)
```

Logic:
1. Query `designation_hierarchy` to find the `parent_designation_id` for the given `designation_id`
2. If a parent exists, walk UP the hierarchy collecting all ancestor designation IDs
3. Query `profiles` where `designation_id` is in the ancestor designation IDs AND `is_active = true`
4. Return `{ users, isLoading }` — users array with `id`, `full_name`, `designation_id`, and the designation name
5. If no parent or no users found, return empty array

## UI Changes — Both `UserCreate.tsx` and `UserEdit.tsx`

### Form State
- Add `reporting_to_user_id: ""` to `formData`

### Designation Section
Replace the single Designation field with a 2-column grid:

```
| Designation (dropdown)          | Reporting To (dropdown, conditional) |
```

- When `designation_id` changes, call `useHigherDesignationUsers(designation_id)`
- Clear `reporting_to_user_id` when designation changes
- If `higherUsers.length > 0`, show the "Reporting To" `SearchableSelect` with user names
- If `higherUsers.length === 0`, hide the "Reporting To" dropdown entirely
- Selection is NOT mandatory

### Data Submission
- **UserCreate.tsx**: Add `reporting_to_user_id` to the edge function request body
- **UserEdit.tsx**: Include `reporting_to_user_id` in the update payload (already handled by `useUpdateUserProfile` generic spread)

## Edge Function Update

**File: `supabase/functions/create-user/index.ts`**
- Accept `reporting_to_user_id` from request body
- Include it in the profile insert: `reporting_to_user_id: reporting_to_user_id || null`

## Files Changed

| File | Action |
|------|--------|
| Database migration | Add `reporting_to_user_id` column to `profiles` |
| `src/hooks/useDesignations.ts` | Add `useHigherDesignationUsers` hook |
| `src/pages/admin/users/UserCreate.tsx` | Add reporting-to dropdown logic |
| `src/pages/admin/users/UserEdit.tsx` | Add reporting-to dropdown logic + load existing value |
| `supabase/functions/create-user/index.ts` | Accept and store `reporting_to_user_id` |

