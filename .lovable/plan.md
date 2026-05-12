## Problem

On Admin → C3 Configuration → Bonus, the section header "BONUS DISTRIBUTION BY PAYROLL CYCLE" overlaps with its helper sentence ("Select which payroll week/payment the bonus should be included in for each frequency...").

Root cause: the helper `<p>` directly below `<SectionLabel>` uses the negative margin class `-mt-4`, which pulls the paragraph upward and on top of the uppercase label. The same pattern is used elsewhere in the same file and in the Exceptions tab.

## Fix (UI only — no logic changes)

Remove the `-mt-4` negative margin and replace with normal spacing (`mt-1`) so the helper line sits cleanly under the section label.

### Files to edit

1. `src/components/admin/c3-configuration/BonusPolicyDefaultTab.tsx`
   - Line 348: helper under "Bonus Distribution by Payroll Cycle" — change `-mt-4` → `mt-1`, then add `mb-3` for breathing room above the cycle blocks.
   - Line 372: helper under "Contribution Base Calculation" — same change for consistency (it has the same overlap risk).

2. `src/components/admin/c3-configuration/BonusPolicyExceptionsTab.tsx`
   - Line 379 area (helper under "Bonus Distribution by Payroll Cycle") and any sibling `-mt-4` helper paragraphs — apply the same `-mt-4` → `mt-1` fix.

No changes to:
- `SectionLabel` component itself (used elsewhere correctly)
- Form logic, validation, mutations, schema, RLS, or DB
- Any other tab or screen

## Verification

- Reload Admin → C3 Configuration → Bonus default policy form.
- Confirm "BONUS DISTRIBUTION BY PAYROLL CYCLE" sits on its own line with the helper text rendered cleanly below it (no overlap).
- Confirm "CONTRIBUTION BASE CALCULATION" section also renders cleanly.
- Repeat for the Exceptions tab.
