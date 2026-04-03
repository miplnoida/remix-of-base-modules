# Fix: SE Detail API NOT_FOUND + Employer Empty ipWages

## Bug 1: SE SSN 100039 — Detail API Period Mismatch

**Root Cause:** The `cn_c3_reported` record for SSN 100039 stores `period = 2026-03-31` (last day of month). The Detail API constructs `v_period := make_date(2026, 3, 1)` and does an exact match (`r.period = v_period`). Since `2026-03-31 ≠ 2026-03-01`, it returns NOT_FOUND.

The Range API works because it uses `>=` / `<=` comparisons, catching any day within the month.

**Fix:** Change the Detail API's period matching from exact date to month-range matching, consistent with the Range API:

```sql
-- Instead of: AND r.period = v_period
-- Use:
AND r.period >= v_period
AND r.period < (v_period + interval '1 month')::DATE
```

Apply the same fix to the `ip_wages` query within `public_api_c3_detail` (line 174).

**Additionally:** Fix the underlying data inconsistency — SE records stored via the C3 save flow should use `date_trunc('month', period)` (first of month) for consistency. This is a secondary fix in `c3Service.ts` to prevent future mismatches.

---

## Bug 2: Employer 658852 — Empty ipWages (Data Issue)

**Root Cause:** This is NOT a code bug. The `cn_c3_reported` headers for 658852 are correctly at `VAC` status, but the corresponding `ip_wages` rows are all `DEL` (deleted) — except for Feb 2026 seq 5 which has one VAC wage row.

Current data state:

- April 2026, seq 1: Header=VAC, Wages=4 rows all DEL
- March 2026, seq 1: Header=VAC, Wages=1 row DEL
- Feb 2026, seq 1-4: Headers=VAC, Wages=all DEL
- Feb 2026, seq 5: Header=VAC, Wages=1 row VAC ← only working one

**Resolution Options:**

1. **Data fix** — Update ip_wages posting_status to 'VAC' for records that have a corresponding VAC header (recommended for test data)
2. **Code investigation** — Check why the C3 acceptance/verification workflow promotes headers to VAC but leaves wages at DEL

---

## Plan

### Step 1: Database Migration — Fix Period Matching in Detail RPC

Update `public_api_c3_detail` to use month-range matching instead of exact date match for both the header lookup and wages query. Also apply the same fix to `public_api_employees_by_last_c3` and `public_api_c3_last_submitted` for consistency.

### Step 2: Data Fix — Promote Employer 658852 Wages to VAC

Run a targeted UPDATE to set `posting_status = 'VAC'` on ip_wages rows where a corresponding VAC header exists for payer 658852, so the C3-Wizard team can validate their integration.

### Step 3: Preventive Fix — Normalize SE Period Storage

In `c3Service.ts`, ensure SE/VC C3 saves always store period as first-of-month (`date_trunc`) to prevent future period mismatches.  
  
  
important Note: Please create a proper message to share with the c3-wizard for this fixes and correct the required things their side.

also, please attach this information asked by the C3-wizard team in the same response.

- Please share the raw JSON response for:
  1. `GET /api/v1/C3/100039/C3Submitted/SE/range/{start}/{end},EE`
  2. `GET /api/v1/C3/100039/C3Submitted/{month},{year},{seq},SE,EE`
  3. `GET /api/v1/Employee/employeesByLastC3/658852`
- We need the exact values/field names for:
  - `payerType`
  - `month`
  - `year`
  - `seqNo`
  - `c3Status`
  - `receivedBy`
  - whether employee rows are expected only under detail `ipWages` when the employee endpoint is empty

---

## Files Changed


| File                        | Change                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Database migration          | Fix period matching in `public_api_c3_detail`, `public_api_employees_by_last_c3`; data fix for 658852 wages |
| `src/services/c3Service.ts` | Normalize SE/VC period to first-of-month                                                                    |
