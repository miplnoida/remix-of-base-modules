

# NWD Support: `is_for_director` Column in `cn_c3_reported`

## Problem
The `cn_c3_reported` table has no way to distinguish Non-Working Director (NWD) contributions from standard Employer (ER) records. Both share `payer_type = 'ER'`. The C3-Wizard team needs the system to accept, store, filter, and return `is_for_director` correctly across all ingestion and query APIs.

---

## Changes

### 1. Database Migration

Add column to `cn_c3_reported`:
```sql
ALTER TABLE cn_c3_reported ADD COLUMN is_for_director BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_cn_c3_reported_director ON cn_c3_reported(is_for_director);
```

### 2. RPC: `public_api_insert_c3_reported`

Add parameter `p_is_for_director BOOLEAN DEFAULT FALSE` and include it in the INSERT statement. Return it in the success response.

### 3. RPC: `public_api_c3_range`

Filter by `is_for_director` based on `p_c3_type`:
- `p_c3_type = 'NW'` → only `is_for_director = TRUE`
- `p_c3_type = 'EE'` → only `is_for_director = FALSE`

Include `is_for_director` in the response object.

### 4. RPC: `public_api_c3_detail`

Add `is_for_director` filter to the `cn_c3_reported` lookup (same logic as range). Include the field in the `c3Header` response.

### 5. RPC: `public_api_c3_last_submitted`

This delegates to `public_api_c3_detail`. The parent query that finds the latest record must also filter by `is_for_director` based on `p_c3_type`.

### 6. RPC: `get_c3_component_balances`

For NWD records (`is_for_director = TRUE`), only return LVC and LVF components (levy + levy fines), excluding SSC, PEC, SSF, PEF. Add an `p_is_for_director BOOLEAN DEFAULT FALSE` parameter, or detect from the stored record.

### 7. RPC: `public_api_payment_save`

Accept optional `isForDirector` (camelCase) from the payload. Store it on `cn_payment_header` as a new column `is_for_director BOOLEAN DEFAULT FALSE` so payment records are also tagged.

### 8. Edge Function: `sync-c3-payment`

When building the outbound payload to C3-Wizard, read `is_for_director` from `cn_payment_header` and include `is_for_director: true` in the sync payload when applicable.

### 9. Edge Function: `public-api/index.ts`

Update `handleC3ReportedInsert` to pass the new `is_for_director` field to the RPC:
```typescript
p_is_for_director: payload.is_for_director != null ? Boolean(payload.is_for_director) : false,
```

### 10. RPC: `public_api_verify_c3`

The duplicate-check query inside `public_api_verify_c3` uses `payer_id + payer_type + period + sequence_no`. This remains unchanged since `is_for_director` is stored at row level and doesn't affect verification uniqueness.

---

## Files to Create/Modify

| Item | Type | Purpose |
|---|---|---|
| Migration SQL | New | Add `is_for_director` to `cn_c3_reported` and `cn_payment_header` |
| `public_api_insert_c3_reported` | Recreate RPC | Accept + store `is_for_director` |
| `public_api_c3_range` | Recreate RPC | Filter by `is_for_director` based on `c3_type` |
| `public_api_c3_detail` | Recreate RPC | Filter + return `is_for_director` |
| `public_api_c3_last_submitted` | Recreate RPC | Filter latest record by NWD flag |
| `get_c3_component_balances` | Recreate RPC | Return only LVC/LVF for NWD records |
| `public_api_payment_save` | Recreate RPC | Accept + store `isForDirector` |
| `sync-c3-payment/index.ts` | Edit | Include `is_for_director` in outbound sync |
| `public-api/index.ts` | Edit | Pass `is_for_director` to RPC |

---

## C3-Wizard Integration Message (to share with them)

After implementation, the following message should be shared:

**Subject: NWD `is_for_director` Field Now Supported**

All C3 ingestion and query APIs now support `is_for_director`:

**1. C3 Reported Insert** (`POST /api/v1/c3-reported`):
```json
{
  "payer_id": "658852",
  "payer_type": "ER",
  "is_for_director": true,
  "sequence_no": 1,
  "period": "2026-04-01",
  "total_wages": 500,
  "emp_levy_amt_calc": 40,
  "emp_levy_penalty_amt": 0
}
```
- Send `is_for_director: true` for NWD submissions, `false` or omit for standard ER.

**2. C3 Range Query** (`GET .../range/{start}/{end,c3Type}`):
- Use `c3Type=NW` to get only NWD records: `.../range/012026/042026,NW`
- Use `c3Type=EE` to get only standard ER records (excludes NWD)
- Response now includes `"isForDirector": true/false` per record.

**3. C3 Detail Query** (`GET .../C3Submitted/{month,year,seq,payerType,c3Type}`):
- `c3Type=NW` fetches director record; `c3Type=EE` fetches standard.
- Response `c3Header` includes `"isForDirector": true/false`.

**4. Payment Save** (`POST /api/v1/api/payment/save`):
```json
{
  "payerId": "658852",
  "payerType": "ER",
  "isForDirector": true,
  ...
}
```
- NWD payments are tagged so receipt sync back to C3-Wizard includes `is_for_director: true`.

**5. Component Balances**:
- NWD records return only LVC (Levy) and LVF (Levy Fines) components.
- SSC, PEC, SSF, PEF are excluded for NWD.

**Backward Compatibility**: All fields default to `false` when omitted.

