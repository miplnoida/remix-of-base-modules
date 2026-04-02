

# Fix: Payment History Popup Showing Duplicate Transactions

## Problem

The `ExistingPaymentsPopup` filters payment records by `period_month_number` and `period_year` only — it does **not** filter by `schedule_no`. When a C3 period has multiple schedules (e.g., Schedule 1 and Schedule 2), the popup combines payments from all schedules, showing 4 rows instead of the expected 2.

## Fix

**File**: `src/components/c3/ExistingPaymentsPopup.tsx`

Add `schedule_no` to the matching filter (line 63–67):

```typescript
// Current (broken) — matches ALL schedules for the period
const matching = records.filter(
  (r) =>
    r.period_month_number === record.month_number &&
    r.period_year === record.year
);

// Fixed — also match the specific schedule number
const matching = records.filter(
  (r) =>
    r.period_month_number === record.month_number &&
    r.period_year === record.year &&
    r.schedule_no === record.schedule
);
```

- `record.schedule` is already available on `C3ContributionRecord` (number field)
- `r.schedule_no` is already present on `PaymentRecord` (number | null field)
- No other file changes needed

