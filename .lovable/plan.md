

# Analysis: API-Submitted C3 Data Visibility

## Finding

The data **is being saved correctly** in the database. The API flow (c3-reported → c3-wages → c3-verify) works as designed:
1. `c3-reported` inserts with `posting_status = 'DEL'`
2. `c3-wages` inserts wage rows linked to the DEL parent
3. `c3-verify` transitions both to `posting_status = 'VAC'` (Verified)

## Why It's Not Visible

The `/c3-management/manage` page uses the `get_c3_records_filtered` RPC, which **defaults to showing only `DFT` (Draft) and `PEN` (Pending)** records when no status filter is selected (line 40 of the RPC). Since the API sets status to `VAC` after verification, these records are excluded from the default view.

**Current workaround**: Select **"All"** or the verified status in the Status filter dropdown on the manage page to see API-submitted records.

## Proposed Fix

Update the `get_c3_records_filtered` RPC to include `VAC` in the default status filter, so verified records (including API-submitted ones) appear by default alongside Draft and Pending records.

### Database change
In the `get_c3_records_filtered` function, change:
```sql
-- Current (line 40):
(p_status IS NULL AND c.posting_status IN ('DFT', 'PEN'))

-- Updated:
(p_status IS NULL AND c.posting_status IN ('DFT', 'PEN', 'VAC'))
```
This appears in two places in the function (count query and data query).

### No frontend changes needed
The manage page already handles VAC records correctly in its UI (status badges, edit restrictions, etc.). Only the default filter scope needs widening.

