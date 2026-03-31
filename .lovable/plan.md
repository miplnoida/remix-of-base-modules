# Fix: ER & SE Validation Endpoints — Active-Only Enforcement

## Problem Analysis

After reviewing the current RPC functions (`public_api_er_master_details` and `public_api_se_master_details`), the root causes are clear:

### ER Endpoint Issues

- **No active status check**: The function returns employer data regardless of status (Active, Inactive, Closed, Pending, etc.). It maps the status into the response but never blocks non-active employers.

### SE Endpoint Issues

1. **No active status check**: Same as ER — returns data for any status including Pending, Inactive, Ceased.
2. **No SE existence validation**: The function first looks up `ip_master` by SSN, which will find ANY insured person. It then tries to find a matching `ip_self_employ` record, but if none exists, it still returns data (with empty SE fields). This means a regular employee SSN would pass SE validation.
3. **Status fallback is wrong**: `COALESCE(v_se.status, v_ip.status)` falls back to ip_master status when no SE record exists, masking the fact that the person is not actually a self-employer.

## Plan

### Step 1: Fix `public_api_er_master_details` — Reject Non-Active Employers

Update the RPC to return an error if `er_master.status` is not `'A'` (Active):

```text
After finding the employer record:
  → If status ≠ 'A', return error:
    "Employer is not active (Status: [status])"
  → Only return full data for active employers
```

### Step 2: Fix `public_api_se_master_details` — Validate SE Existence + Active Status

Three fixes in one migration:

1. **Require `ip_self_employ` record exists**: After looking up `ip_master`, if no `ip_self_employ` record is found, return error: `"Person is not registered as Self-Employed"`.
2. **Check SE is active**: The `ip_self_employ.status` must be `'A'`. If not, return error: `"Self-Employed person is not active (Status: [status])"`.
3. **Remove ip_master status fallback**: Use only `v_se.status` for the status determination — never fall back to `v_ip.status`.

### Step 3: Single Database Migration

One migration file that drops and recreates both functions with the fixes above. No edge function code changes needed — the handlers already pass errors through correctly.

## Technical Detail

```text
ER Flow (after fix):
  1. Find er_master by regno        → NOT FOUND → error
  2. Validate email match            → MISMATCH  → error
  3. Check status = 'A'             → NOT ACTIVE → error  ← NEW
  4. Return full data

SE Flow (after fix):
  1. Find ip_master by ssn           → NOT FOUND → error
  2. Validate email match            → MISMATCH  → error
  3. Find ip_self_employ by ssn      → NOT FOUND → error  ← NEW
  4. Check ip_self_employ.status='A' → NOT ACTIVE → error  ← NEW
  5. Return full data
```

### Files Changed

- **1 new migration file**: Updates both `public_api_er_master_details` and `public_api_se_master_details` RPC functions
- **No edge function changes**: The `public-api/index.ts` handler already surfaces RPC errors correctly  
  
Make sure to create a changes or validation message for the c3-wizard team to validate everything based on these chnages.