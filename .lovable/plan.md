

# Fix: "No C3 Record" for NW Director Payments

## Root Cause

When navigating from the NW Director screen, `navState.payerType` is `'NW'`. The RPC call on line 214 passes `p_payer_type: 'NW'` directly to `get_c3_component_balances`. 

However, NWD records in `cn_c3_reported` are stored with `payer_type = 'ER'` and `is_for_director = TRUE`. The RPC's WHERE clause filters `payer_type = p_payer_type AND is_for_director = p_is_for_director`, so passing `'NW'` finds no match — hence "No C3 Record."

The RPC already accepts a `p_is_for_director` parameter (added in the NWD migration), but C3Payments.tsx never passes it.

## Fix

In `src/pages/cashier/C3Payments.tsx`, when calling the RPC (lines 212-217):

- If `pType === 'NW'`, pass `p_payer_type: 'ER'` and `p_is_for_director: true`
- Otherwise, pass `p_payer_type: pType` and `p_is_for_director: false`

```typescript
const { data, error } = await supabase.rpc('get_c3_component_balances' as any, {
  p_payer_id: regNo,
  p_payer_type: pType === 'NW' ? 'ER' : pType,
  p_period: periodDate,
  p_sequence_no: parseInt(schedule, 10),
  p_is_for_director: pType === 'NW',
});
```

## File Modified

| File | Change |
|---|---|
| `src/pages/cashier/C3Payments.tsx` | Lines 212-217: Map `'NW'` to `'ER'` + `is_for_director: true` in the RPC call |

