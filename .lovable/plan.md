

# Fix Payment Mismatch and Missing Data on C3 View

## Root Cause Analysis

### Issue 1: Payment Amount Mismatch ($460 shown on Schedule 5 which has zero payments)

**Root cause**: The `useC3Payments` hook (used in `EmployerC3Form.tsx`) filters payments by `payer_id`, `payer_type`, and `period` — but **does NOT filter by `sequence_no` (schedule number)**. 

**Evidence from database**:
- Payments 219 ($250) and 220 ($210) exist for employer 658852, March 2026, but their `c3_payment_components.sequence_no = 1` (Schedule 1)
- Schedule 5 has zero payments against it
- The hook sums ALL payments for the payer+period regardless of schedule, so viewing Schedule 5 incorrectly shows $460

**Fix**: Add `sequenceNo` parameter to `useC3Payments`. Join through `c3_payment_components` to filter by `sequence_no`, matching the pattern already used by `get_c3_payment_history_by_schedule` RPC.

### Issue 2: Missing Address and Employee Names

**Root cause**: The database shows:
- `cn_c3_reported` for Schedule 5: `payer_address = NULL`
- `ip_wages` for Schedule 5: `employee_name = NULL` for all 4 employees

The C3-Wizard sync (via `public-api` edge function) passes these fields through, but the **Wizard is sending NULL values** for `payer_address` and `employee_name`. This is a data quality issue on the C3-Wizard side.

**Fix (SSB-Admin side)**: When `payer_address` is null, look it up from `er_master` using `payer_id`. When `employee_name` is null, look it up from `ip_master` using the employee's `ssn`. This makes the display resilient to incomplete sync data.

---

## Implementation Plan

### Step 1: Fix `useC3Payments` — Add Schedule Filter

**File**: `src/hooks/useC3Payments.ts`

- Add `sequenceNo: number | null` to `UseC3PaymentsParams`
- After getting `validPaymentIds`, query `c3_payment_components` to get only payment_ids matching the specific `sequence_no`
- Sum only those filtered payment amounts
- This ensures each schedule view shows only its own payments

### Step 2: Pass Schedule Number to the Hook

**File**: `src/pages/c3Management/forms/EmployerC3Form.tsx`

- Extract `sequence_no` from `initialData` (already available as `initialData.scheduleNo` = "SCH-5")
- Parse to numeric and pass as `sequenceNo` to `useC3Payments`

### Step 3: Fix Missing Address — Fallback Lookup from `er_master`

**File**: `src/pages/c3Management/forms/EmployerC3Form.tsx`

- In the `useEffect` that loads initial data, if `payer_address` is null/empty and `employerId` is available, query `er_master` for the employer's address and populate the form field
- This already partially exists (the employer validation fetches name+address), but needs to trigger for view/edit mode when address is null

### Step 4: Fix Missing Employee Names — Fallback Lookup from `ip_master`

**File**: `src/hooks/useC3Management.ts` or `src/services/c3Service.ts`

- In `fetchC3WithWages` (the function that loads wages for a C3 record), after fetching `ip_wages`, check for any rows where `employee_name` is null
- For those SSNs, batch-query `ip_master` to get `first_name` + `surname`
- Merge names back into the wage records before returning

### Step 5: Communication to C3-Wizard Team

Draft a message requesting the Wizard team to include `payer_address` and `employee_name` in their sync payloads, as these fields are arriving as NULL for employer-portal-submitted C3s (e.g., Schedule 5 for employer 658852, March 2026).

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useC3Payments.ts` | Add `sequenceNo` filter via `c3_payment_components` join |
| `src/pages/c3Management/forms/EmployerC3Form.tsx` | Pass `sequenceNo` to hook; add address fallback from `er_master` |
| `src/services/c3Service.ts` | Add `ip_master` name lookup fallback when `employee_name` is null |

## Routes Changed
None — both routes remain the same.

## What Was Previously Wrong
- Payment aggregation ignored schedule number, summing ALL payments for a payer+period
- Sync data from C3-Wizard arrives without `payer_address` and `employee_name`

## What Now Works Correctly
- Payments shown per-schedule, not cross-schedule
- Address falls back to `er_master` if not in `cn_c3_reported`
- Employee names fall back to `ip_master` if not in `ip_wages`

## What Remains Before Production
- C3-Wizard team should fix their sync to include `payer_address` and `employee_name` (eliminates need for fallback lookups)
- The known balance discrepancy between local component balances and Wizard `pending_amount` (separate issue, already documented in memory)

