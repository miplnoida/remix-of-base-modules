

# Sync C3 Detail Screens with C3-Wizard API Changes

## Summary

The C3-Wizard team added partial payment detection. The API now returns a new `Partial` status (alongside existing `Paid`, `$ Pay`, `BEMA`) plus new fields: `payment_amount`, `pending_amount`, `is_partially_paid`. All three C3 Detail screens need to handle this new status.

## Current Behavior

All three screens (C3 Contribution, NW Director, Self-Employed) handle three payment statuses:
- `Paid` → Green badge with print icon
- `$ Pay` → Blue "Payment" button
- `BEMA` → Static badge

They do NOT handle `Partial`, so partially-paid records show nothing in the Payment column.

## Changes

### 1. Update TypeScript Types (`wizC3DetailsService.ts`)

Add new fields to all three record interfaces:
- `C3ContributionRecord`: add `payment_amount`, `pending_amount`, `is_partially_paid`
- `NwdContributionRecord`: add `payment_amount`, `pending_amount`, `is_partially_paid`
- `SeContributionRecord`: add `payment_amount`, `pending_amount`, `is_partially_paid`

### 2. Update Payment Column Logic (all 3 screens)

Add `Partial` status handling between the existing `Paid` and `$ Pay` checks:

```
Paid    → Green "Paid" badge + print icon (no change)
Partial → Blue "Payment" button + orange "Pending: $XX.XX" text below
$ Pay   → Blue "Payment" button (no change)
BEMA    → Static badge (no change)
```

For `Partial`, the "Payment" button navigates to the same C3 Payments cashier screen (same as `$ Pay`), but passes `pendingAmount` in the navigation state so the payment form can pre-fill with the remaining balance instead of the full total.

### 3. Files Modified

| File | Change |
|------|--------|
| `src/services/wizC3DetailsService.ts` | Add `payment_amount`, `pending_amount`, `is_partially_paid` to 3 interfaces |
| `src/pages/c3Management/c3Details/C3ContributionList.tsx` | Add `Partial` status rendering in Payment column |
| `src/pages/c3Management/c3Details/NwDirectorList.tsx` | Same `Partial` handling |
| `src/pages/c3Management/c3Details/SelfEmployedContributionList.tsx` | Same `Partial` handling |

### 4. No Backend Changes

The API changes are already deployed by C3-Wizard. This is frontend-only sync work.

