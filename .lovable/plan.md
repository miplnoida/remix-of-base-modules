

# Fix: Head Cashier Assignment Query — PostgREST Relationship Error

## Root Cause

Line 43 of `HeadCashierAssignment.tsx` uses PostgREST embedded resource syntax:
```
.select('*, profiles:user_id(full_name, user_code, office_code)')
```

This requires a **foreign key** from `cn_head_cashier_assignment.user_id` → `profiles.id`. Either this FK doesn't exist in the database, or PostgREST's schema cache doesn't recognize it. Since the table already stores `user_code` directly, and the RPC `assign_head_cashier` also stores `user_code`, we don't actually need the join — the data is redundant.

## Fix

### `src/pages/cashier/HeadCashierAssignment.tsx`

**Query (line 41-48)**: Remove the PostgREST join. Select only direct columns:
```typescript
.select('id, user_id, user_code, assignment_date, office_code, is_active, assigned_by')
```

**Display (lines 150-167)**: Instead of reading from `assignment.profiles.full_name`, look up the cashier's name from the already-loaded `cashierUsers` array using `assignment.user_id` or `assignment.user_code`. This eliminates the FK dependency entirely.

```text
Before: assignedProfile = assignment?.profiles
        display: assignedProfile.full_name

After:  matchedUser = cashierUsers?.find(u => u.user_code === assignment?.user_code)
        display: matchedUser?.full_name || assignment?.user_code
```

### No migration needed
The fix is purely frontend — removing the broken join and using data already available in client state.

### Files Changed
| File | Change |
|------|--------|
| `src/pages/cashier/HeadCashierAssignment.tsx` | Remove PostgREST join, use `cashierUsers` for display names |

