# Fix: C3 Detail API Field Mapping + Payment Sync for NWD

## Context

The C3-Wizard team raised two isolated queries about SSB Admin's public APIs. These are independent fixes.

---

## Query 1: Missing Aggregate SS/Levy/Severance Fields in C3 Detail API

### Problem

The `public_api_c3_detail` RPC returns only header-level calculated fields (`calcEmpSsAmt`, `calcEmpLevyAmt`, `calcEmpPeAmt`) but does NOT return per-contributor-type breakdowns that the C3-Wizard needs:


| Expected Field              | Source                               | Currently Returned? |
| --------------------------- | ------------------------------------ | ------------------- |
| `totalEmpSsContributions`   | SUM of `ip_ss_amt` from `ip_wages`   | No                  |
| `totalErSsContributions`    | SUM of `er_ss_amt` from `ip_wages`   | No                  |
| `totalEmpLevyContributions` | SUM of `ip_levy_amt` from `ip_wages` | No                  |
| `totalErLevyContributions`  | SUM of `er_levy_amt` from `ip_wages` | No                  |
| `totalEmpPeContributions`   | SUM of `ip_pe_amt` from `ip_wages`   | No                  |
| `totalErPeContributions`    | SUM of `er_ei_amt` from `ip_wages`   | No                  |


The C3-Wizard currently receives `$0` for aggregate totals and has to compute them client-side from granular wage data. This is fragile and should be provided server-side.

### Fix

Update `public_api_c3_detail` RPC to compute and include these 6 aggregate fields in the `c3Header` response by summing from the `ip_wages` records for that C3 period. Add them alongside the existing `calcEmpSsAmt` fields:

```sql
-- Add to v_result -> c3Header:
'totalEmpSsContributions', v_total_ip_ss,
'totalErSsContributions', v_total_er_ss,
'totalEmpLevyContributions', v_total_ip_levy,
'totalErLevyContributions', v_total_er_levy,
'totalEmpPeContributions', v_total_ip_pe,
'totalErPeContributions', v_total_er_pe
```

These are computed from the same `ip_wages` query already being built for the `ipWages` array. We just add a pre-aggregation step.

### File

- **Database migration**: Update `public_api_c3_detail` RPC

---

## Query 2: Payment Sync Gap — NWD Payments Not Syncing

### Problem

The `sync-c3-payment` edge function only includes `schedule_number` when `payer_type === 'ER'`. Since NWD records ARE stored as `payer_type = 'ER'` in the database, this is not the issue.

The actual gap is that the C3-Wizard's `/receive-payment` endpoint expects to be called after every SSB Admin payment. The sync IS triggered from the C3 Payments page (`triggerPaymentSync`), but:

1. The sync URL is configured in `api_settings` under key `c3_received_payment_sync`. If this is pointed at the wrong URL or not configured to call the C3-Wizard's `/receive-payment` endpoint, payments won't reach the C3-Wizard.
2. The `sync-c3-payment` payload uses `registration_number` (from `payer_id`) but the C3-Wizard expects this exact field name — this matches.
3. The payload includes `payment_components` array with `fund_code`, `payment_code`, `amount` — this matches the C3-Wizard's expected format.

### Fix

The sync mechanism already exists and the payload format matches. The issue is likely the `api_settings` configuration. We need to:

1. **Verify/update the `api_settings` row** for `c3_received_payment_sync` to point to the C3-Wizard's `/receive-payment` endpoint
2. **Add `amount` field to sync payload** — the C3-Wizard expects a top-level `amount` field (the total payment amount), which is currently sent as `receipt_amount` but not as `amount`
3. **Add `payment_method` field** — the C3-Wizard expects `payment_method` (e.g., "CSH") but the current sync only sends `receipt_amount`, not the MOP code

### Changes to `sync-c3-payment/index.ts`

- Add `amount` field mapped from `receipt.receipt_total`
- Fetch and include `payment_method` (MOP code) from `cn_payment` table
- Add `payment_date` field (already present as `receipt_date`, but C3-Wizard expects `payment_date`)

```typescript
// Add to payload:
amount: Number(receipt.receipt_total || 0),
payment_method: mopCode,  // fetched from cn_payment.mop_code
payment_date: receiptDate,
```

### Files

- `**supabase/functions/sync-c3-payment/index.ts**`: Add missing fields to sync payload

---

## Summary


| #   | Change                                                                                                                                                         | File                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | Add 6 aggregate contribution fields to C3 Detail API                                                                                                           | Database migration (update `public_api_c3_detail`) |
| 2   | Important note: for now, fix only the query 1 chnages required not the query 2 ad provide the proper message to share with the c3-wizard for this query 1 fix. | &nbsp;                                             |
