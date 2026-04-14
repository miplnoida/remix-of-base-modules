# Fix: NWD Balance Mismatch and Missing Differentiation on C3 View

## Root Cause Analysis

### Issue 1: Balance Shows $479.70 Instead of $255.84

**Database truth** (Schedule 6, `is_for_director = true`):

- `emp_ss_amt_calc = 0.00`
- `emp_levy_amt_calc = 255.84` (this is the only applicable component for NWD)
- `emp_pe_amt_calc = 0.00`

**What the UI does**: The `EmployerC3Form` uses the local calculation engine (`useC3ServerCalculations`) which computes ALL components (SS + Levy + Severance + penalties) for the 2 employees — it has no concept of NWD. The balance formula is:

```
Balance = (employeeSS + employerSS + fines) + (employeeLevy + employerLevy + severance + penalties) - payments
```

This inflates the balance to $479.70 because SS and Severance amounts are included when they should be zero for NWD records.

**Fix**: For NWD records (where `is_for_director = true`), the balance calculation must use ONLY the levy-related components (employee levy + employer levy + levy penalty), zeroing out SS, Severance, PE, and their penalties. The form needs to detect NWD status from `initialData` and adjust accordingly.

### Issue 2: `is_for_director` Verification

**Confirmed**: The record IS correctly saved with `is_for_director = true` in `cn_c3_reported`. No fix needed here.

### Issue 3: No NWD Visual Differentiation

The `EmployerC3Form` has zero awareness of `is_for_director`. There is no badge, label, or indicator showing that a record is for a Non-Working Director. The C3 Payments screen (`C3Payments.tsx`) does differentiate via `payerType === 'NW'`, but the contribution view/edit form does not.

---

## Implementation Plan

### Step 1: Detect NWD Status in EmployerC3Form

**File**: `src/pages/c3Management/forms/EmployerC3Form.tsx`

- Read `is_for_director` from `initialData` (passed from the parent when loading a record from `cn_c3_reported`)
- Store as a boolean state `isNWD`

### Step 2: Fix Balance Calculation for NWD

**File**: `src/pages/c3Management/forms/EmployerC3Form.tsx`

- When `isNWD = true`, adjust the balance formula:
  - `ssContributionDue = 0` (NWD has no SS)
  - `totalDueToAG = employeeLevy + employerLevy + levyPenalty` (no Severance, no PE)
  - This makes balance = Levy total - payments = $255.84 - $0 = $255.84

### Step 3: Add NWD Visual Indicator

**File**: `src/pages/c3Management/forms/EmployerC3Form.tsx`

- Add a badge next to the Schedule label or Employer Name showing "Non-Working Director" when `isNWD = true`
- Use a distinct color (e.g., amber/orange badge) to differentiate from regular ER submissions
- Optionally hide the SS and Severance sections from the calculation summary when NWD, since those are always zero

### Step 4: Verify initialData Passes `is_for_director`

**Files**: Parent components that load `cn_c3_reported` and pass data to `EmployerC3Form` (likely `EditC3Record.tsx`, `ViewC3Record.tsx`, or the C3 list handler)

- Ensure the `is_for_director` field is included in the query and passed through to `EmployerC3Form` as part of `initialData`

### Step 5: Pass `is_for_director` to useC3Payments

**File**: `src/hooks/useC3Payments.ts`

- Add `isForDirector: boolean` parameter
- Filter `cn_payment_header` by `is_for_director` to match NWD vs regular ER payments
- This ensures NWD payment history is isolated from regular ER payments for the same employer/period

---

## Files Changed


| File                                              | Change                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| `src/pages/c3Management/forms/EmployerC3Form.tsx` | Detect NWD, fix balance calc, add badge, hide irrelevant sections |
| `src/hooks/useC3Payments.ts`                      | Add `isForDirector` filter                                        |
| `src/pages/c3Management/EditC3Record.tsx`         | Pass `is_for_director` in initialData                             |
| `src/pages/c3Management/ViewC3Record.tsx`         | Pass `is_for_director` in initialData                             |


## What This Fixes

- Balance correctly shows $255.84 (levy only) instead of $479.70 (all components) for NWD
- NWD records are visually identifiable on the contribution form
- Payment filtering respects NWD flag  
  
  
Make sure - no other functionality ot UI should be impacted from this change.