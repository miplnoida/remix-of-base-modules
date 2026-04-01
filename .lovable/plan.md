

# Fix: Opening Balance Not Reflecting Per-Branch Configuration

## Root Cause

In `src/pages/cashier/BatchManagement.tsx` line 263:
```typescript
const { headCashierBalance, cashierBalance } = useDefaultOpeningBalance();
```

`useDefaultOpeningBalance()` is called **without an `officeCode`**, so it never queries the `cn_office_opening_balance` table. It always returns the global defaults (`head_cashier: 1000`, `cashier: 500`).

The effective office code IS resolved later (line 344 via IP detection / cashier profile), but it's never fed back into the opening balance hook.

**Database is correct**: STK has `head_cashier_balance: 950, cashier_balance: 450`. The problem is purely in the UI wiring.

## Fix

### File: `src/pages/cashier/BatchManagement.tsx`

1. **Move `effectiveOffice` computation before the opening balance hook** — extract the office code from `selectedCashier.office_code` (and IP-detected office) so it's available as a parameter.

2. **Pass `effectiveOfficeCode` to `useDefaultOpeningBalance(effectiveOfficeCode)`** so the hook queries `cn_office_opening_balance` for the selected cashier's branch.

3. Since `ipDetectedOffice` and `resolvedOffice` are set asynchronously via `useEffect`, derive `effectiveOfficeCode` as a memo:
   ```
   const effectiveOfficeCode = ipDetectedOffice?.code 
     || resolvedOffice?.code 
     || selectedCashier?.office_code 
     || undefined;
   ```

4. Update the hook call:
   ```
   const { headCashierBalance, cashierBalance, isOfficeSpecific } = 
     useDefaultOpeningBalance(effectiveOfficeCode);
   ```

5. Add a visual indicator in the dialog showing whether the balance is branch-specific or default (similar to `BatchCreationModal.tsx`).

### No database or edge function changes needed — this is purely a UI wiring fix.

| File | Change |
|------|--------|
| `src/pages/cashier/BatchManagement.tsx` | Pass resolved office code to `useDefaultOpeningBalance()` hook; add branch indicator in dialog |

