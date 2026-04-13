

## Fix: "Value too long for character varying(10)" on C3 Accept

### Root Cause

The `process_c3_employer_verification` trigger on `cn_c3_reported` fires when `posting_status` transitions to `VAC`. Inside the trigger function, there is:

```sql
v_verifier_code VARCHAR(10);
...
v_verifier_code := COALESCE(NEW.verified_by, 'SYSTEM');
```

The workflow action sets `verified_by = userId` (a UUID, 36 characters). Assigning this 36-char UUID to a `VARCHAR(10)` variable causes PostgreSQL error 22001: "value too long for type character varying(10)".

### Secondary Issue

Per project conventions, `verified_by` and `modified_by` fields should store the **UserCode** (e.g., "SAdmin"), not the UUID. The `updateSourceRecordStatus` function in `useWorkflowActions.ts` currently stores the raw UUID.

### Fix Plan

**1. Migration SQL** — Update the `process_c3_employer_verification` trigger function:
- Change `v_verifier_code VARCHAR(10)` to `VARCHAR(50)` to match the `verified_by` column width
- Also update `v_current_occupation VARCHAR(10)` to a safe size if needed

**2. Code change** — In `src/hooks/useWorkflowActions.ts`, the C3 branch of `updateSourceRecordStatus` (around line 1193):
- Change `modified_by: userId` → `modified_by: profile?.user_code || 'SYSTEM'`
- Change `verified_by: userId` → `verified_by: profile?.user_code || 'SYSTEM'`
- Same for the `ip_wages` update block below it

This ensures the UserCode is stored (per project conventions) and the trigger variable won't overflow.

**3. Migration SQL** — Reset the broken workflow instance for employer 658852 back to `InProgress`/`Pending` so the Accept action can be retried (the previous migration for this appears not to have applied correctly).

### Files to Modify

| File | Change |
|------|--------|
| Migration SQL | Fix trigger variable size; reset broken workflow instance |
| `src/hooks/useWorkflowActions.ts` | Store `user_code` instead of UUID in `verified_by`/`modified_by` for C3 records |

