

# Fix: Type Mismatch in C3 Public API RPCs — `date = text` Error

## Root Cause

The `period` column in both `cn_c3_reported` and `ip_wages` is of type **`date`** in PostgreSQL. However, all three RPC functions cast the period to `TEXT` (`v_period_ts::TEXT`) when comparing and inserting, causing the error: `"operator does not exist: date = text"`.

## Fix

Create a migration that replaces all three RPCs. Change the internal variable from `TIMESTAMP` to `DATE`, and remove all `::TEXT` casts when comparing or inserting into the `period` column.

### Changes across all 3 RPCs

| Current (broken) | Fixed |
|---|---|
| `v_period_ts TIMESTAMP` | `v_period_ts DATE` |
| `v_period_ts := p_period::TIMESTAMP` | `v_period_ts := p_period::DATE` |
| `AND period = v_period_ts::TEXT` | `AND period = v_period_ts` |
| `v_period_ts::TEXT` in INSERT VALUES | `v_period_ts` |
| `NOW()::TEXT` for date_entered/date_verified | `NOW()::TEXT` (keep — these are text columns) |
| `v_period_ts::TEXT` in response JSON | `v_period_ts::TEXT` (keep — JSON needs text) |

### Specific locations in each RPC

**RPC 1 (`public_api_insert_c3_reported`):**
- Line 32: `v_period_ts TIMESTAMP` → `v_period_ts DATE`
- Line 46: `::TIMESTAMP` → `::DATE`
- Line 57: `period = v_period_ts::TEXT` → `period = v_period_ts`
- Line 67: `v_period_ts::TEXT` in INSERT → `v_period_ts`

**RPC 2 (`public_api_insert_ip_wages`):**
- Line 136: `v_period_ts TIMESTAMP` → `v_period_ts DATE`
- Line 156: `::TIMESTAMP` → `::DATE`
- Line 164: `period = v_period_ts::TEXT` → `period = v_period_ts`
- Line 186: `v_period_ts::TEXT` in INSERT → `v_period_ts`

**RPC 3 (`public_api_verify_c3`):**
- Line 235: `v_period_ts TIMESTAMP` → `v_period_ts DATE`
- Line 252: `::TIMESTAMP` → `::DATE`
- Lines 261, 278, 342, 364: `period = v_period_ts::TEXT` → `period = v_period_ts`

### Files
| File | Action |
|---|---|
| Migration SQL | `CREATE OR REPLACE` all 3 RPCs with `DATE` type fix |

### Expected Input Format (unchanged)
External apps still send `"period": "2026-03-01"` (ISO date string). The `::DATE` cast handles this correctly.

