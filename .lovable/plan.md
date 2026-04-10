

# Fix: NWD Overpayment Guard Missing `is_for_director` Filter

## Root Cause

The `create_c3_payment_with_receipt` RPC has **two problems** for NWD payments:

1. **Overpayment guard** (lines 87-109): Queries `cn_c3_reported` and `cn_payment` without filtering by `is_for_director`. For employer `658852`, it sums **all** LVC payments (regular ER: $3,637.13 + NWD: $100 = $3,737.13) against the NWD original of $202.56, computing balance=0 → "Overpayment detected."

2. **INSERT into `cn_payment_header`** (line 153-157): Does not set `is_for_director = TRUE` for NWD payments, so even after fix #1, future NWD payments would be invisible to the director filter.

3. **C3Payments.tsx** (line 400-410): Does not pass `is_for_director` to the RPC — the RPC doesn't even accept it yet.

This is the same class of bug as the `get_c3_component_balances` fix — the `is_for_director` discriminator is missing from payment creation.

## Fix

### 1. Database Migration — Update `create_c3_payment_with_receipt` RPC

Add `p_is_for_director BOOLEAN DEFAULT FALSE` parameter, then:

- **Overpayment guard `cn_c3_reported` lookup** (line 87-92): Add `AND is_for_director = COALESCE(p_is_for_director, FALSE)`
- **Overpayment guard paid-amount query** (line 98-109): Add `AND COALESCE(h.is_for_director, FALSE) = COALESCE(p_is_for_director, FALSE)`
- **INSERT into `cn_payment_header`** (line 153-157): Include `is_for_director` column with value `COALESCE(p_is_for_director, FALSE)`

### 2. `src/pages/cashier/C3Payments.tsx` — Pass `is_for_director` to RPC

Map `payerType === 'NW'` to pass `p_is_for_director: true` and `p_payer_type: 'ER'`:

```typescript
const { data: result, error: rpcErr } = await supabase.rpc('create_c3_payment_with_receipt' as any, {
  p_batch_number: batchSel.selectedBatch.batch_number,
  p_payer_type: payerType === 'NW' ? 'ER' : payerType,
  p_payer_id: payerId.trim(),
  p_date_received: dateRcvd,
  p_remarks: remarks || null,
  p_components: componentsJson,
  p_methods: methodsJson,
  p_receipt_total: totalPaymentReceived,
  p_user_code: uCode,
  p_is_for_director: payerType === 'NW',
});
```

### Impact

- **No regression**: `p_is_for_director` defaults to `FALSE`, so all existing ER/SE/VC flows are unaffected.
- Fixes both the overpayment false-positive and ensures NWD payments are correctly tagged in `cn_payment_header`.

## Files Modified

| What | Change |
|---|---|
| **Migration** | Recreate `create_c3_payment_with_receipt` with `p_is_for_director` parameter and filtered guards |
| **C3Payments.tsx** | Pass `p_is_for_director: payerType === 'NW'` and map payer type to `'ER'` |

