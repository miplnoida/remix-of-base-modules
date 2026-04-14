# Fix: Overpayment Error on NWD Payment (Schedule 6, March 2026)

## Root Cause

The error `Overpayment detected for component LVC: requested=100, balance=0 (original=0, paid=0)` occurs because the overpayment guard in `create_c3_payment_with_receipt` cannot find the C3 record.

**Chain of failure:**

1. `NwDirectorList.tsx` navigates to `/cashier/c3-payments` with `payerType: 'NW'`
2. `C3Payments.tsx` initializes state: `payerType = 'NW'`
3. The `PaymentHeaderForm` dropdown (`PAYER_TYPES`) has no `'NW'` option — only `ER`, `IP`, `SE`, `VC`, `AP`
4. The `<Select>` shows "Employer" as fallback display, but the user may change it — either way, the `payerType` state determines what gets sent to the RPC
5. **Balance loading works correctly** (line 214: `p_payer_type: pType === 'NW' ? 'ER' : pType` and line 217: `p_is_for_director: pType === 'NW'`) — it uses `navState.payerType` directly
6. **Payment submission fails** because it uses `payerType` state (line 402-410), which may have been changed by the dropdown or is `'NW'` which the RPC correctly maps, BUT the dropdown interaction can reset it to `'ER'`
7. With `payerType = 'ER'` → `p_is_for_director = false` → guard looks for `is_for_director = FALSE` → no record exists → `original = 0` → overpayment error

**Core problem:** The C3 Payments page lacks a dedicated NWD payer type option and does not persist the NWD context independently from the dropdown.

## Implementation Plan

### Step 1: Add 'NW' option to PAYER_TYPES in PaymentHeaderForm

**File:** `src/components/payments/PaymentHeaderForm.tsx`

Add `{ value: 'NW', label: 'Non-Working Director' }` to the `PAYER_TYPES` array. This ensures the dropdown correctly displays and retains the NWD selection when navigated from the NWD list.

### Step 2: Verify C3Payments NWD flow is consistent

**File:** `src/pages/cashier/C3Payments.tsx`

The balance-loading effect (line 195-260) and the payment submission (line 400-411) both already have the `'NW' ? 'ER'` mapping and `p_is_for_director` logic. The only issue is that the dropdown was losing the `'NW'` value. With Step 1, this is fixed — the state will remain `'NW'` throughout.

Verify these mappings remain correct:

- `get_c3_component_balances`: `p_payer_type = 'ER'`, `p_is_for_director = true` when NW
- `create_c3_payment_with_receipt`: `p_payer_type = 'ER'`, `p_is_for_director = true` when NW

### Step 3: Update Payer ID placeholder for NW type

**File:** `src/components/payments/PaymentHeaderForm.tsx`

Update the placeholder logic (line 140) to show "Reg. No." for NW type as well (since NWD uses employer registration numbers):

```
placeholder={payerType === 'ER' || payerType === 'NW' ? 'Reg. No.' : 'SSN'}
```

## Files Changed


| File                                            | Change                                         |
| ----------------------------------------------- | ---------------------------------------------- |
| `src/components/payments/PaymentHeaderForm.tsx` | Add 'NW' payer type option, update placeholder |


## What This Fixes

- NWD payments will no longer trigger false overpayment errors
- The payer type dropdown retains the 'NW' selection throughout the payment flow
- The `is_for_director = true` flag is correctly sent to both the balance RPC and the payment RPC
- No changes to database functions, no changes to other payment flows (ER, SE, VC)

## What Stays Unchanged

- All database RPCs (`create_c3_payment_with_receipt`, `get_c3_component_balances`) — no changes needed
- ER, SE, VC payment flows — completely unaffected
- UI layout and structure — only one new dropdown option added  
  
  
**Important Note:** Do not implement this plan, as it is completely incorrect.
  Create a new plan after proper analysis. The **payer_type** should never be **NW**. The payer type is always **ER**, and if **is_for_director = true**, it means the employer is making a payment for a Non-Working Director (NWD).
  Currently, the plan incorrectly uses **payer_type = NW**, which is not correct. Instead, always use **payer_type = ER**, and use the **is_for_director** flag to determine whether the payment is related to NWD or regular employees.
  Please review this carefully and create a proper new plan after analysis.