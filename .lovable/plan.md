# C3-Wizard Integration Fixes — Implementation Plan

The C3-Wizard team has deployed 4 changes that require corresponding updates on the SSB Admin side.

---

## Issue 1: Accept `paymentReferenceId` in Payment Save API

**Problem:** The C3-Wizard now sends a `paymentReferenceId` field (CyberSource transaction ID) in the `POST /api/payment/save` payload. SSB Admin currently ignores it — it needs to be stored for cross-system reconciliation.

**Changes:**

- **Database migration:** Add `payment_reference_id TEXT` column to `cn_payment_header` table
- `**supabase/functions/public-api/index.ts**` — Update `handlePaymentSave` to validate and pass `paymentReferenceId` through to the RPC
- **RPC `public_api_payment_save**` — Update to extract `paymentReferenceId` from the payload JSON and persist it in `cn_payment_header.payment_reference_id`

---

## Issue 2: Show Schedule Column for SE Contribution Records

**Problem:** The C3-Wizard API now returns `schedule` for SE records, but the SSB Admin SE contribution list table has no Schedule column and hardcodes `schedule: '0'` when navigating to payment.

**Changes:**

- `**src/services/wizC3DetailsService.ts**` — Add `schedule?: number | null` to `SeContributionRecord` interface
- `**src/pages/c3Management/c3Details/SelfEmployedContributionList.tsx**`:
  - Add "Schedule" column header to the table
  - Render `c.schedule` with a badge (matching Employer list pattern)
  - Update `handlePayment` to use `record.schedule ?? '0'` instead of hardcoded `'0'`

---

## Issue 3: Fix Payment Status Logic for BIMA-Imported Records

**Problem:** The UI currently treats `is_imported_from_bema` and `payment_status` as coupled — if a record is BIMA-imported, it may not show the Pay button. The fix: use `payment_status` alone for payment buttons; use `is_imported_from_bema` only for the BIMA badge. Currently, all three contribution lists (C3, SE, NW) already use `payment_status` for button logic and `is_imported_from_bema` for the badge — so these are already correctly separated.

**Verification needed:** Confirm no other code path suppresses the Pay button based on `is_imported_from_bema`. If none found, this item requires no code change (already handled correctly).

---

## Issue 4: Add `Completed` and `SUCCESS` to Paid Status Checks

**Problem:** The C3-Wizard now returns `Completed` and `SUCCESS` as valid paid transaction statuses. SSB Admin currently only recognizes `AUTHORIZED` as a success status — other values fall into the orange "unknown" badge.

**Changes:**

- `**src/pages/c3Management/reports/WizPaymentsHistory.tsx**` — Update `PaymentStatusBadge` to treat `COMPLETED` and `SUCCESS` as green/success (same as `AUTHORIZED`)
  &nbsp;

---

## Files Changed Summary


| File                                                                | Change                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Migration (new)**                                                 | Add `payment_reference_id` column to `cn_payment_header`           |
| **Migration (new)**                                                 | Update `public_api_payment_save` RPC to store `paymentReferenceId` |
| `src/services/wizC3DetailsService.ts`                               | Add `schedule` field to `SeContributionRecord`                     |
| `src/pages/c3Management/c3Details/SelfEmployedContributionList.tsx` | Add Schedule column, use dynamic schedule in payment nav           |
| `src/pages/c3Management/reports/WizPaymentsHistory.tsx`             | Expand `PaymentStatusBadge` for `Completed`/`SUCCESS`              |
| `src/pages/c3Management/payments/WizPaymentDetails.tsx`             | Expand transaction status icon logic for `Completed`/`SUCCESS`     |


**No impact** to non-C3 modules. All existing fields and routes preserved.