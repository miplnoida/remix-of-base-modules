

# Fix: Payment History Showing Duplicate Rows

## Problem
The `ExistingPaymentsPopup` uses the external `getPaymentDetailsList` wiz-admin-api, which returns broadly-matched payment records. Client-side filtering by `period_month_number`, `period_year`, and `schedule_no` is insufficient — it still picks up duplicates (e.g., multiple payment detail lines from the same header, or records that should be excluded by status).

## Solution
Replace the wiz-admin-api call with a direct Supabase query that precisely joins `cn_payment_header` → `cn_payment` → `cn_receipt`, filtering by all required criteria.

### Query Logic
```sql
cn_payment_header (payer_id = reg_no, payer_type = 'ER', status != 'deleted')
  → cn_payment (payment_id, period matches month/year, payment_code in ALLOWED_CODES)
  → cn_receipt (payment_id, status != 'C')
```

### Changes

**File: `src/components/c3/ExistingPaymentsPopup.tsx`**

1. Replace `getPaymentDetailsList` import with `supabase` client import
2. Add `regNo` and `payerType` props (passed from parent alongside `companyId`)
3. Rewrite the `useEffect` data-fetch to:
   - Query `cn_payment_header` filtered by `payer_id = regNo`, `payer_type = payerType`, and `status` not equal to `'deleted'`
   - Get matching `payment_id`s
   - Query `cn_receipt` for those `payment_id`s where `status != 'C'` (not cancelled) — get receipt info (receipt_number, created_at)
   - Query `cn_payment` for valid `payment_id`s, filter by `period` matching the C3 month/year, restrict `payment_code` to allowed codes (`CON`, `LVC`, `LVF`, `PEC`, `PEF`, `SSE`, `SSF`, `SSC`, `VOC`, `VOL`)
   - Aggregate payment amounts and build display rows
4. Display table with: Payment ID, Date, Amount, Payment Code, MOP, Receipt #, Status

**File: `src/pages/c3Management/c3Details/C3ContributionList.tsx`**

- Pass `regNo={company.registration_number}` and `payerType="ER"` as new props to `ExistingPaymentsPopup`

### Key Filter Criteria
| Field | Source | Filter |
|-------|--------|--------|
| `payer_id` | `company.registration_number` | exact match |
| `payer_type` | `'ER'` | exact match |
| `period` | C3 `month_number` + `year` | date range for that month |
| `schedule_no` | Not on payment tables — filter by header matching | via period precision |
| `status` (header) | `cn_payment_header.status` | `!= 'deleted'` |
| `status` (receipt) | `cn_receipt.status` | `!= 'C'` |
| `payment_code` | `cn_payment.payment_code` | in allowed codes list |

### No Database Changes Required
All needed tables and columns already exist.

