Fix the remaining NWD bug by changing only the value source, not the UI.

What I found

- The screen still shows 95.94 because `EmployerC3Form` is using `useC3ServerCalculations()` as the source for NWD levy totals.
- That calculator derives regular employer-style levy from wages (`3198 * 3% = 95.94`), which is correct for normal ER logic but wrong for NWD.
- For synced NWD records, the correct amount already exists on the loaded record:
  - `initialData.empLevyAmtCalc` = correct levy total
  - `initialData.empLevyPenaltyAmt` = correct levy fine
- Current code zeroes SS/severance for NWD, but it still keeps the wrong levy source, so the final balance remains wrong.

Plan

1. Update `EmployerC3Form.tsx` to create an NWD-specific display totals object sourced from persisted record values, not server wage calculations:
  - levy = `initialData.empLevyAmtCalc`
  - levy fine = `initialData.empLevyPenaltyAmt`
  - SS = 0
  - severance = 0
  - PE = 0
  - SS fine = 0
  - severance penalty = 0
2. Use those NWD display totals everywhere the form renders values:
  - header balance
  - payments/balance summary
  - calculation summary cards
  - totals section
  - penalties section
  - any helper text totals currently reading from `overall.*`
3. Keep the existing UI exactly as-is:
  - no layout changes
  - no card changes
  - no label changes
  - no badge changes
  - only value substitution for NWD rows
4. Keep the existing payment filters unchanged:
  - `payer_id`
  - `payer_type`
  - `sequence_no`
  - `is_for_director`

- Only the displayed charge side will change.

5. Add a safe fallback for add/edit scenarios:
  - if a persisted NWD levy value is not available yet, fall back carefully to current calculated values
  - but for synced/viewed NWD records, always prefer persisted record fields
6. Verify non-NWD behavior stays untouched:
  - ER and SE continue using current calculation flow
  - NWD override remains gated strictly by `is_for_director === true`

Expected result after fix

- NWD March 2026 Schedule 6 displays:
  - Payments: `0.00`
  - Balance: `255.84`
  - SS-related values: `0.00`
  - Severance-related values: `0.00`
  - Only levy and levy fine contribute to the displayed payable amount

Files to update

- `src/pages/c3Management/forms/EmployerC3Form.tsx`

Technical note

- The bug is not the payment filter anymore.
- The bug is that NWD is still reading levy from the generic wage calculator instead of the synced record’s persisted NWD totals.  
  
make sure other functionality cannot be impacted by this.