# Fix: "Payer Not Found" for NW Director Payments

## Root Cause

The NW Director list page navigates to C3 Payments with `payerType: 'NW'` (line 119 of `NwDirectorList.tsx`). However, `lookupPayer` in `usePaymentEntry.ts` only handles `'ER'`, `'SE'`, and `'AP'` explicitly. `'NW'` falls through to the `else` branch, which queries `ip_master` by SSN. Since the payer ID is an employer registration number (e.g., `658852`), it finds no match in `ip_master` and returns `null` — triggering "Payer not found."

**This is a mapping issue, not a data issue.** NWD contributions are filed under `payer_type = 'ER'` in the database. The payer is a valid employer in `er_master`. The `'NW'` type is only a UI/routing distinction to filter `is_for_director = TRUE` records.

## Fix

### 1. `src/hooks/usePaymentEntry.ts` — Add `'NW'` case to `lookupPayer`

Treat `'NW'` the same as `'ER'` — look up the payer in `er_master`:  
Note: NW should not be payer_type as payer_type is ER but is_for_director = true means employer is paying or contributing for their non-wokring director.

```typescript
if (payerType === 'ER' || payerType === 'NW') {
  // Both standard Employer and Non-Working Director resolve from er_master
  const { data, error } = await supabase
    .from('er_master')
    .select('regno, name, status')
    .eq('regno', payerId)
    .single();
  if (error || !data) return null;
  return { id: data.regno, name: data.name, status: data.status };
}
```

### 2. `src/hooks/usePaymentEntry.ts` — Add `'NW'` case to `searchPayers`

Same pattern — the `searchPayers` function likely also needs to handle `'NW'` as `'ER'`.

### 3. No other changes needed

- The `get_c3_component_balances` RPC already receives `p_payer_type: 'NW'` and handles NWD filtering server-side via `is_for_director`.
- The `create_c3_payment_with_receipt` RPC will receive the correct payer type.
- No database or migration changes required.

## Files Modified


| File                           | Change                                                   |
| ------------------------------ | -------------------------------------------------------- |
| `src/hooks/usePaymentEntry.ts` | Add `'NW'` to `lookupPayer` and `searchPayers` ER branch |
