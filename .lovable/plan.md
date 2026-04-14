Goal: make the NWD March 2026 Schedule 6 screen show only levy and levy fine values, with all non-NWD deductions displayed as 0, without changing the existing UI layout.

What I found

- `EmployerC3Form` already detects NWD and already filters payments by `is_for_director` and `sequence_no`.
- The remaining problem is that the screen still uses the generic `useC3ServerCalculations()` totals as its display source. That calculator still returns regular ER-style values (including severance / other totals), and those values leak into the summary cards and balance display.
- The form fixes only the final balance formula in one place, but other displayed totals still read directly from `overall.*`, so NWD can still show severance and an incorrect derived balance like `95.94`.
- The C3-Wizard guide confirms NWD must use only:
  - Levy
  - Levy fine
  Everything else must be treated as 0.

Implementation plan

1. Lock NWD display values to NWD-only totals in `EmployerC3Form.tsx`

- Add a derived “display totals” layer for NWD.
- When `isNWD = true`, map values as:
  - employeeSS = 0
  - employerSS = 0
  - employerSeverance = 0
  - severancePenalty = 0
  - fines = 0
  - any SS/PE/composite totals = 0
  - levy fields only remain active
- Use these derived values everywhere the form renders amounts, instead of raw generic `overall` values.

2. Fix the balance source of truth for NWD

- For NWD, calculate balance strictly from:
`levy total + levy penalty - payments`
- Do not let any SS, PE, severance, or combined helper totals participate.
- If available from the loaded record, prefer persisted C3 values for NWD display:
  - `initialData.empLevyAmtCalc`
  - `initialData.empLevyPenaltyAmt`
- This ensures the view matches the synced record truth (`255.84`) instead of the generic calculator’s regular-employee interpretation.

3. Zero out non-NWD deductions everywhere on the form

- Keep the same UI sections/cards/tables.
- Replace only the values for NWD:
  - SS contribution due for month → `0`
  - Employer levy + SS composite card → levy-only-compatible value or `0` if composite wording cannot be supported safely
  - Employer severance card → `0`
  - Severance penalty → `0`
  - Fine on Social Security → `0`
  - Any combined explanatory subtotals must also reflect zeroed values

4. Keep payment filtering unchanged, but verify NWD payment isolation

- Retain the existing `useC3Payments` filters:
  - `payer_id`
  - `payer_type`
  - `sequence_no`
  - `is_for_director`
- Confirm the NWD balance path uses that filtered payment total and no alternative totals.

5. Preserve current UI structure

- No layout, label placement, card arrangement, or badge styling changes.
- Only value sourcing / calculation logic changes.
- The existing NWD badge remains as-is.

6. Verify no regression to regular ER/SE flows

- Regular ER records must continue using the generic calculation flow.
- NWD override must be gated strictly behind `is_for_director === true`.
- Confirm Schedule 6 NWD shows:
  - Payments: `0.00`
  - Balance: `255.84`
  - Severance: `0.00`
  - SS-related amounts: `0.00`

Files to update

- `src/pages/c3Management/forms/EmployerC3Form.tsx`
- Possibly `src/hooks/useC3ServerCalculations.ts` only if a small helper/type adjustment is needed, but the preferred fix is to keep the change localized to the form.

Technical note

- The safest approach is not to alter the shared calculation RPC behavior for all contributors.
- Instead, build an NWD-specific display adapter in `EmployerC3Form` that overrides the generic totals with NWD-compliant values using the synced record fields as the authoritative source when present.  
  
Make sure other existing functionality should not be hamper.