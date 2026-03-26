

# Conditionally Show MOP Detail Icon & Remove Columns

## Changes

### 1. `PaymentDetailGrid.tsx` — Add config props, remove columns, conditionally show icon

- Add `showChequeDetails` and `showCardDetails` boolean props to the component interface
- Remove the "Period" and "Bank / Card" `<TableHead>` columns and their corresponding `<TableCell>` entries
- Update `colSpan` on the empty-state row from 8 to 6
- Update the MOP detail icon visibility logic: instead of just `needsMopDetail(row.mop_code)`, check:
  - For `CHQ`/`CHK` mop codes: show icon only if `showChequeDetails` is true
  - For `CRD` mop code: show icon only if `showCardDetails` is true
  - If neither config is true for the row's MOP code, hide the icon
- Update `needsMopDetail` and `hasMopDetail` to also respect the config flags (so the amber highlight row is also suppressed when the detail is not required)

### 2. `PaymentDataEntry.tsx` — Pass config props to grid

- Pass `showChequeDetails` and `showCardDetails` (already available from `useMopDetailConfig()`) as props to `<PaymentDetailGrid>`

## Logic Summary

```
showMopIcon = (mop is CHQ/CHK AND showChequeDetails) OR (mop is CRD AND showCardDetails)
```

When both configs are false, no MOP detail icon appears for any row. When one is enabled, only matching MOP codes show the icon.

No backend changes needed — the config is already database-driven via `payment_module_config` table.

