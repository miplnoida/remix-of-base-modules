

# Fix: Payment Amount Field Mismatch — `amount` vs `paymentAmount`

## Problem

The `public_api_payment_save` RPC reads each payment header's amount using `v_header->>'amount'`, but the C3-Wizard sends the field as `paymentAmount` (camelCase). This causes `COALESCE((v_header->>'amount')::NUMERIC, 0)` to always resolve to `0`, resulting in:

- `cn_payment.payment_amount = 0` for every synced line
- `cn_receipt.receipt_total = 0` (sum of zero lines)
- `c3_payment_components.component_amount = 0`

This affects **all** C3-Wizard synced payments (ER and SE), confirming the root cause for Payment IDs 53, 59, and likely others.

## Root Cause

In the latest migration (`20260408124826`), lines 90, 99, and 114:
```sql
COALESCE((v_header->>'amount')::NUMERIC, 0)   -- reads 'amount'
-- C3-Wizard sends: { "paymentAmount": 50.00, "paymentCode": "SSC", ... }
```

The field name mismatch means the amount is never extracted.

## Fix — Single Database Migration

Update `public_api_payment_save` to read `paymentAmount` instead of `amount` in all three locations:

```sql
-- Line 90 (cn_payment insert)
COALESCE((v_header->>'paymentAmount')::NUMERIC, 0)

-- Line 99 (total accumulator)
v_total := v_total + COALESCE((v_header->>'paymentAmount')::NUMERIC, 0);

-- Line 114 (c3_payment_components insert)
COALESCE((v_header->>'paymentAmount')::NUMERIC, 0)
```

No other files need changes. The edge function (`public-api/index.ts`) passes the raw payload through to the RPC without transformation, which is correct.

## Confirmation to C3-Wizard Team

The C3-Wizard team's analysis is **correct**:
- The field name is `paymentAmount` (camelCase) ✓
- Our RPC was reading `amount` instead — now fixed ✓
- This is the same root cause for Payment 53 (SE) and Payment 59 (ER) ✓
- All future synced payments will reflect correct amounts after this fix

## Post-Fix: Existing Data

Payments already synced with `amount = 0` (IDs 53, 59, and any others) will need a one-time data correction to update `cn_payment.payment_amount`, `c3_payment_components.component_amount`, and `cn_receipt.receipt_total` with the correct values. This can be done via a targeted migration or by asking the C3-Wizard to resend those payments.

## Files Modified

| File | Change |
|---|---|
| New SQL migration | Recreate `public_api_payment_save` reading `paymentAmount` instead of `amount` |

