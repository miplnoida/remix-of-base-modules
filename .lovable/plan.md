

# Add Payment Components to External Sync API Call

## Summary

Update the `sync-c3-payment` edge function to fetch ALL `c3_payment_components` for the payment and include them as a `payment_components` array in the outbound request payload to the external API.

## Current State

The edge function at `supabase/functions/sync-c3-payment/index.ts` (lines 106-111) fetches only the **first** component to extract `period` and `sequence_no`. No component details are sent in the payload.

## Change: `supabase/functions/sync-c3-payment/index.ts`

**1. Fetch all components instead of just one** (replace lines 105-111):

Replace the single-component fetch with a full fetch:
```typescript
const { data: components, error: compErr } = await supabase
  .from("c3_payment_components")
  .select("fund_code, payment_code, component_amount, period, sequence_no")
  .eq("payment_id", payment_id)
  .order("sort_order", { ascending: true });
```

Use the first component for `period` and `sequence_no` (same as before), but also derive `payment_components` from all rows.

**2. Build `payment_components` array** (after line 193, before clean payload):

```typescript
const payment_components = (components || []).map(c => ({
  fund_code: c.fund_code,
  payment_code: c.payment_code,
  amount: Number(c.component_amount) || 0,
}));
```

**3. Add to payload** (line 173 area):

Add `payment_components` to the payload object so it becomes part of `cleanPayload` sent to the external API.

## No Other File Changes

- The C3Payments page (`src/pages/cashier/C3Payments.tsx`) calls `triggerPaymentSync(paymentId, receiptId)` which invokes the edge function — no change needed there.
- Components are already persisted in `c3_payment_components` by the `create_c3_payment_with_receipt` RPC before sync runs.
- No database changes required.

## Final Payload Shape

```json
{
  "registration_number": "ER-001",
  "payer_type": "ER",
  "period_month": "3",
  "period_year": "2026",
  "receipt_number": "REC-0001",
  "payment_id": "123",
  "receipt_date": "2026-04-03",
  "currency": "XCD",
  "receipt_amount": "200.00",
  "schedule_number": "5",
  "payment_components": [
    { "fund_code": "SS", "payment_code": "SSC", "amount": 150.00 },
    { "fund_code": "LV", "payment_code": "LVC", "amount": 50.00 }
  ]
}
```

## Error Handling

- If the components query fails, log the error and send the payload without `payment_components` (graceful degradation — don't break the sync).
- Component data is included in `request_payload` logged to `payment_sync_log` for traceability.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/sync-c3-payment/index.ts` | Fetch all components, build `payment_components` array, include in sync payload |

