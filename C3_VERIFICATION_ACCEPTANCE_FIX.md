# C3 Verification & Acceptance Logic Fix

## Summary
Fixed C3 submission, verification, acceptance, and rejection logic to follow the correct business rules across all three C3 types (Employer, Self-Employed, Voluntary Contributor).

## Business Rules Implemented

### 1. Submission
- **When**: User completes C3 form and clicks Submit
- **Effect**: Changes posting_status from `DFT` → `PEN`
- **Result**: Makes both Accept and Reject options available
- **No verification required** for submission

### 2. Rejection
- **When**: Any submitted C3 (posting_status = `PEN` or `VAC`)
- **Requirements**: NONE related to verification
- **Effect**: Changes posting_status to `REJ`
- **Key Rule**: Rejection does NOT check verification status
- **Can reject**: Unverified submitted C3s immediately

### 3. Acceptance (Verify/Approve)
- **When**: Submitted C3 with all wage records verified
- **Requirements**: 
  - posting_status must be `PEN`
  - ALL ip_wages records must have is_verified = true
- **Effect**: Changes posting_status to `VAC` (Verified/Accepted)
- **Validation**: Server-side check prevents acceptance if any wage record is unverified

### 4. Employer C3 Auto-Verification
- **Parent C3 Verification Status**: Determined by employee detail lines
- **Rule**: Parent C3 can ONLY be accepted when ALL employee lines are verified
- **Trigger**: Database trigger `trg_auto_verify_parent_c3` maintains consistency
- **No Manual Override**: Cannot bypass the "all employees verified" requirement

## Changes Made

### Database Changes (Migration)

#### 1. Updated `reject_c3_record` Function
```sql
-- BEFORE: Only allowed rejection from PEN status
IF v_record.posting_status NOT IN ('PEN', 'P') THEN
    RAISE EXCEPTION '...';
END IF;

-- AFTER: Allows rejection from PEN or VAC status (no verification check)
IF v_record.posting_status NOT IN ('PEN', 'P', 'VAC', 'V') THEN
    RAISE EXCEPTION 'Only submitted or verified records can be rejected...';
END IF;
```

#### 2. Created Auto-Verification Trigger
```sql
CREATE TRIGGER trg_auto_verify_parent_c3
    AFTER INSERT OR UPDATE OF is_verified
    ON ip_wages
    FOR EACH ROW
    EXECUTE FUNCTION auto_verify_parent_c3_on_wage_update();
```
- Ensures parent C3 verification state stays consistent
- Only affects Employer C3 (payer_type = 'ER')
- Tracks when all employee lines are verified

#### 3. Created Helper Function
```sql
CREATE FUNCTION public.is_c3_ready_for_acceptance(p_c3_id uuid)
```
- Checks if C3 is ready for acceptance
- Validates: submitted status + all wages verified
- Used by frontend to show acceptance readiness

### Frontend Changes

#### 1. Updated `c3Service.ts`
- Added detailed comments to submission, verification, and rejection functions
- Added `isC3ReadyForAcceptance()` helper function
- Clarified that rejection does NOT require verification

#### 2. Updated `C3Management.tsx`
- Modified WorkflowActionButtons visibility logic
- **BEFORE**: Showed buttons when `postingStatus !== 'DFT' && postingStatus !== 'Z'`
- **AFTER**: Shows buttons when `postingStatus === 'PEN' || postingStatus === 'P'`
- Added comments explaining submission is the ONLY requirement for button visibility

### Validation Flow

```
┌─────────────┐
│   Draft     │  posting_status = 'DFT'
│   (DFT)     │  • Can Submit
└──────┬──────┘
       │ Submit
       ↓
┌─────────────┐
│  Submitted  │  posting_status = 'PEN'
│   (PEN)     │  • Accept and Reject buttons BOTH visible
└──────┬──────┘  • Reject works immediately (no verification check)
       │          • Accept blocked until all wages verified
       │
       ├─────────────────────┐
       │                     │
       │ Reject (no check)   │ Accept (requires all wages verified)
       ↓                     ↓
┌─────────────┐      ┌─────────────┐
│  Rejected   │      │  Accepted   │
│   (REJ)     │      │   (VAC)     │
└─────────────┘      └─────────────┘
```

## Testing Checklist

### Test Case 1: Submit Each C3 Type
- [ ] Submit Employer C3 → Verify Accept and Reject options appear
- [ ] Submit Self-Employed C3 → Verify Accept and Reject options appear
- [ ] Submit Voluntary C3 → Verify Accept and Reject options appear

### Test Case 2: Reject Unverified C3
- [ ] Submit C3 without verifying any employee lines
- [ ] Click Reject
- [ ] **EXPECT**: Rejection succeeds immediately
- [ ] **VERIFY**: posting_status changes to 'REJ'

### Test Case 3: Accept Unverified C3 (Should Fail)
- [ ] Submit C3 without verifying any employee lines
- [ ] Click Accept
- [ ] **EXPECT**: Acceptance blocked with validation message
- [ ] **MESSAGE**: "Cannot approve C3 record. X employee wage row(s) are not yet verified..."

### Test Case 4: Employer C3 Auto-Verification
- [ ] Submit Employer C3 with 3 employees
- [ ] Verify all 3 employee lines (is_verified = true)
- [ ] **VERIFY**: Can now accept the C3
- [ ] Click Accept
- [ ] **EXPECT**: Acceptance succeeds, posting_status → 'VAC'

### Test Case 5: Partial Verification (Should Fail)
- [ ] Submit Employer C3 with 3 employees
- [ ] Verify only 2 out of 3 employee lines
- [ ] Click Accept
- [ ] **EXPECT**: Acceptance blocked
- [ ] **MESSAGE**: "Cannot approve C3 record. 1 employee wage row(s) are not yet verified..."

### Test Case 6: Self-Employed and Voluntary Verification
- [ ] Submit Self-Employed C3
- [ ] Verify the single wage record
- [ ] Click Accept → Should succeed
- [ ] Submit Voluntary C3
- [ ] Verify the single wage record
- [ ] Click Accept → Should succeed

## Key Files Modified

1. **Database Functions**:
   - `public.reject_c3_record` - Updated validation logic
   - `public.auto_verify_parent_c3_on_wage_update` - New trigger function
   - `public.is_c3_ready_for_acceptance` - New helper function

2. **Backend Services**:
   - `src/services/c3Service.ts` - Updated comments and added helper

3. **Frontend Components**:
   - `src/pages/c3Management/C3Management.tsx` - Updated button visibility logic

## Server-Side Enforcement

All validation logic is enforced at the database level via:
- PostgreSQL functions with `SECURITY DEFINER`
- `SET search_path TO 'public'` for security
- Explicit checks in `verify_c3_record` function
- Database triggers for consistency

**Client-side checks are informational only** - the server is authoritative.

## Integration with Workflow System

The WorkflowActionButtons component now correctly:
1. Shows Accept/Reject for all submitted C3s (posting_status = 'PEN')
2. Allows Reject to execute without verification checks
3. Blocks Accept until verification requirements met (server-side)
4. Provides clear error messages when acceptance is blocked

## Notes

- Parent C3 record uses `posting_status` field, NOT `is_verified` boolean
- `is_verified` boolean exists only on `ip_wages` child records
- Employer C3 acceptance depends on ALL child `ip_wages.is_verified = true`
- Database trigger maintains verification state consistency
- UI buttons visibility based on `posting_status === 'PEN'` only
- Actual acceptance validation happens server-side in `verify_c3_record` function
