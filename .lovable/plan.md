# Root Cause Analysis: Payment Data & Sync Issues

## Issue 1: Payment ID 53 — `payment_amount = 0.00` and `receipt_total = 0.00`

**Root Cause**: Payment 53 was ingested from the C3-Wizard via the `public_api_payment_save` RPC. The RPC reads `amount` from `v_header->>'amount'` in the `paymentHeaders` array. The C3-Wizard sent `amount: 0` (or omitted it), so both `cn_payment.payment_amount` and `cn_receipt.receipt_total` were stored as `0.00`.

**Evidence**:

- `cn_payment`: `payment_amount = 0.00`, `payment_code = SSC`, `mop_code = ONL`
- `cn_receipt`: `receipt_total = 0.00`
- `c3_payment_components`: `component_amount = 0`
- `payment_reference_id = 7757245817596690603812` (CyberSource ID present, meaning user did pay)

**Conclusion**: This is a **C3-Wizard side issue** — the payment amount was not included in the payload sent to SSB Admin. The RPC logic is correct; it faithfully stored what it received.

**Fix**: No SSB Admin code change needed. The C3-Wizard team must verify the payload they send includes the correct `amount` in the `paymentHeaders` array.

---

## Issue 2: Payment ID 53 — No sync log exists

**Root Cause**: Payment 53 was **ingested from** C3-Wizard (not originated from SSB Admin). The `sync-c3-payment` edge function is only triggered from the SSB Admin C3 Payments cashier screen after a locally-created receipt. Since payment 53 was created by the external API, no sync back to C3-Wizard was triggered — nor should it be, because C3-Wizard already knows about its own payment.

**Conclusion**: This is **expected behavior**. No fix needed.

---

## Issue 3: Payment ID 50 — Sync to C3-Wizard rejected

**Root Cause**: The sync was triggered and the C3-Wizard API **responded** successfully (HTTP 200), but with an error:

> `"Invalid payment_code: SSE. Valid codes: SSC, SSF, LVC, LVF, PEC, PEF"`

The SSB Admin C3 Payments screen uses `payment_code = SSE` (Self-Employed SS Employee) for SE payers. However, C3-Wizard only accepts `SSC` (SS Combined).

**Evidence from `payment_sync_log**`:

- `payment_id: 50`, `sync_status: success` (HTTP 200 OK), but `response_payload.success: false`
- Same error also affects payment 57 (most recent SE sync attempt)

**Bug**: The `sync_status` is recorded as `"success"` because the HTTP response was 200, but the *business response* says `success: false`. The sync edge function treats any `resp.ok` (HTTP 2xx) as success, without checking the body's `success` field.

**Fixes needed**:

### Fix A: Payment code mapping for SE sync

In `supabase/functions/sync-c3-payment/index.ts`, map SE payment codes before sending:

- `SSE` → `SSC` (SS Employee → SS Combined)
- `SEF` → `SSF` (SS Employer → SS Fund, if applicable)

### Fix B: Sync status should check business response

The edge function currently sets `syncSuccess = true` when `resp.ok`. It should also check `parsed.success !== false` from the response body. If the API returns `{ success: false }`, that should be treated as a failure.

### Fix C: Data correction for payment 53

Use a data update to set `cn_payment.payment_amount` and `cn_receipt.receipt_total` to the correct value once confirmed by the C3-Wizard team. This requires knowing the actual payment amount from CyberSource transaction `7757245817596690603812`.

---

## Summary of Changes


| File                                          | Change                                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `supabase/functions/sync-c3-payment/index.ts` | Map `SSE→SSC`, `SEF→SSF` in payment_components before sending. Check `parsed.success !== false` for sync status. |


---

## Draft Message for C3-Wizard Team

```text
Subject: Payment Data Issue — Payment ID 53 (SE Payer 100039)

Hi Team,

We've identified a data issue with a Self-Employed payment synced from C3-Wizard to SSB Admin:

Payment ID (SSB Admin): 53
CyberSource Reference: 7757245817596690603812
Payer: 100039 (SE)
Period: August 2026

Issue: The payment was received with amount = 0 in the paymentHeaders array.
As a result, cn_payment.payment_amount and cn_receipt.receipt_total are both 0.00.

Could you please:
1. Confirm the actual payment amount for this transaction
2. Verify if the amount field is being populated in the paymentHeaders array
   sent to our /api/v1/api/payment/save endpoint

Additionally, regarding payment code validation:
- SSB Admin uses payment_code "SSE" for SE contributions
- Your /receive-payment endpoint only accepts: SSC, SSF, LVC, LVF, PEC, PEF
- We will map SSE→SSC on our side going forward

Please confirm the correct mapping so we can re-sync affected payments (IDs: 50, 57).

Thanks
```

---

## Assumptions

- The C3-Wizard `/receive-payment` endpoint is functioning correctly and the rejection is purely a payment_code validation issue
- The correct mapping for SE is `SSE → SSC` (both represent Social Security contributions for Self-Employed)
- Payment 53's missing amount is a C3-Wizard payload issue, not an SSB Admin parsing bug