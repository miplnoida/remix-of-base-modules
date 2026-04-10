

# Fix: Payment History Popup Must Filter by Schedule/Sequence Number

## Root Cause

`ExistingPaymentsPopup.tsx` fetches payment history using only `payer_id`, `payer_type`, and period month/year. It ignores the `sequence_no` (schedule number) of the selected C3 record. When multiple C3 records exist for the same payer and period with different schedules, all payments show up in every popup — displaying unrelated transactions.

The `c3_payment_components` table already stores `sequence_no` per payment, but it's never queried.

## Fix

### 1. Create an RPC — `get_c3_payment_history_by_schedule`

Create a database function that performs the correct join:

```sql
-- Joins: cn_payment_header → cn_receipt → cn_payment → c3_payment_components
-- Filters: payer_id, payer_type, period (month/year), sequence_no, non-cancelled receipts, non-deleted headers
-- Returns: payment_id, payment_date, payment_amount, payment_code, mop_code, receipt_number, receipt_status
```

Parameters: `p_payer_id`, `p_payer_type`, `p_period_month` (1-based), `p_period_year`, `p_sequence_no`

The RPC will:
- Join `cn_payment_header` (payer_id, payer_type, status != 'deleted')
- Join `cn_receipt` (status != 'C') for receipt info
- Join `cn_payment` (period in month/year range, payment_code in allowed list)
- **Join `c3_payment_components`** on `payment_id` filtering `sequence_no = p_sequence_no`
- Return DISTINCT payment rows to avoid duplicates from multiple components

### 2. Update `ExistingPaymentsPopup.tsx`

Replace the 4-step client-side query chain with a single RPC call:

```typescript
const { data, error } = await supabase.rpc('get_c3_payment_history_by_schedule', {
  p_payer_id: regNo,
  p_payer_type: payerType,
  p_period_month: record.month_number,
  p_period_year: parseInt(record.year),
  p_sequence_no: record.schedule,
});
```

Map the RPC results directly to `PaymentDisplayRow[]`. No UI changes needed — same table, same columns, same footer.

### 3. Add Index for Performance

```sql
CREATE INDEX IF NOT EXISTS idx_c3_payment_components_seq 
  ON c3_payment_components(payment_id, sequence_no);
```

## Files Modified

| File | Change |
|---|---|
| **Migration** | Create `get_c3_payment_history_by_schedule` RPC + index on `c3_payment_components` |
| `src/components/c3/ExistingPaymentsPopup.tsx` | Replace 4-step client queries with single RPC call using `record.schedule` |

## Impact

- No regression: existing payment data unchanged, only query filtering is tightened
- Fallback: if RPC returns empty, the "No previous payments found" empty state already handles it
- Backward compatible: existing payments with `sequence_no` populated will filter correctly

