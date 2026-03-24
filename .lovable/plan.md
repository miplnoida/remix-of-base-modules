

# Create Three Public APIs for C3 Data Ingestion (Updated)

## Overview

Three POST endpoints in the `public-api` edge function for external C3 data submission. All use PostgreSQL RPC functions for transactional logic and are registered in the API registry.

## API 1: Insert C3 Reported Record — `POST /api/v1/c3-reported`

**No changes from original plan.** Auto-generates `sequence_no` as `MAX(sequence_no) + 1` for the given `payer_id + payer_type + period` using advisory lock. Forces `posting_status = 'DEL'`. Returns `payer_id`, `payer_type`, `sequence_no`, `period`.

## API 2: Insert IP Wages — `POST /api/v1/c3-wages` (Updated)

**New: Parent validation before insert.** Before inserting into `ip_wages`, the RPC checks for a matching row in `cn_c3_reported` with the same `payer_id`, `payer_type`, `period`, `sequence_no` AND `posting_status = 'DEL'`. If no such parent exists, the insert is rejected with:

```json
{
  "status": "error",
  "message": "Cannot insert wages because no matching C3 record with status DEL exists for the given payer_id, payer_type, period, and sequence_no."
}
```

If the parent exists, it also sets `c3_id` on the new `ip_wages` row to the parent's `id`. Forces `posting_status = 'DEL'` on the wages row.

## API 3: Verify C3 — `POST /api/v1/c3-verify` (Updated)

**Updated verification logic with recalculation and nil_return handling:**

### Input
`payer_id`, `payer_type`, `sequence_no`, `period` (all required).

### Flow

1. Find `cn_c3_reported` row by composite key. If not found → error.

2. **Check `nil_return`**: If `cn_c3_reported.nil_return = true`:
   - Check that **zero** `ip_wages` rows exist for this composite key
   - If any wages rows exist → error: "Cannot verify nil-return C3 because wage records exist"
   - If no wages rows → verify: set `posting_status = 'VAC'`, `date_verified = NOW()` on `cn_c3_reported`. Return success.

3. **Non-nil-return path**: Query all `ip_wages` rows for the same composite key. If none exist → error: "No wage records found."

4. **Recalculate and set `cn_c3_reported` fields from `ip_wages` sums**:
   - `total_wages` = SUM of (`wages_paid1 + wages_paid2 + wages_paid3 + wages_paid4 + wages_paid5 + wages_paid6`) across all matching `ip_wages` rows (treating NULLs as 0)
   - `emp_ss_amt_calc` = SUM of (`er_ss_amt + er_ei_amt + ip_ss_amt`) across all matching rows
   - `emp_levy_amt_calc` = SUM of (`er_levy_amt + ip_levy_amt`) across all matching rows
   - `emp_pe_amt_calc` = SUM of (`ip_pe_amt`) across all matching rows

5. **Update `cn_c3_reported`** with the recalculated values, set `posting_status = 'VAC'`, `date_verified = NOW()`, `number_employed` = count of matching `ip_wages` rows.

6. **Mark all matching `ip_wages` rows** as `is_verified = true`, `verified_by = 'API'`, `date_verified = NOW()`.

7. All updates in a single transaction — any failure rolls back everything.

### Response (success)
```json
{
  "status": "success",
  "message": "C3 verified successfully",
  "data": {
    "payer_id": "...",
    "total_wages": 12500.00,
    "emp_ss_amt_calc": 450.00,
    "emp_levy_amt_calc": 200.00,
    "emp_pe_amt_calc": 100.00,
    "number_employed": 5,
    "wages_rows_verified": 5
  }
}
```

### Response (nil_return success)
```json
{
  "status": "success",
  "message": "Nil-return C3 verified successfully. No wages expected.",
  "data": { "payer_id": "...", "nil_return": true }
}
```

## Implementation

### Migration SQL
- **RPC `public_api_insert_c3_reported`**: Advisory lock, sequence generation, insert with `posting_status = 'DEL'`
- **RPC `public_api_insert_ip_wages`**: Parent validation (must exist in `cn_c3_reported` with `posting_status = 'DEL'`), set `c3_id`, insert with `posting_status = 'DEL'`
- **RPC `public_api_verify_c3`**: Transactional function — nil_return check, recalculate totals from `ip_wages`, update `cn_c3_reported` fields, mark wages verified
- **3 API registry inserts**

### Edge Function: `supabase/functions/public-api/index.ts`
- Add 3 POST routes to `matchRoute()`
- Add 3 handler functions that validate required fields and call RPCs
- Add handlers to `executeHandler()` switch

## Files Modified

| File | Action |
|------|--------|
| Migration SQL | Create 3 RPCs + 3 API registry rows |
| `supabase/functions/public-api/index.ts` | Add route matching + handlers for 3 POST endpoints |

