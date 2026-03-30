

# Fix ER & SE Master Detail RPCs — Column Name Mismatches

## Root Cause

The RPCs reference column names that don't exist in the actual database tables.

### ER Master (`public_api_er_master_details`)

| RPC Uses | Actual Column | Fix |
|----------|--------------|-----|
| `reg_no` | `regno` | Rename reference |
| `comp_name` | `name` | Rename reference |
| `date_registered` | `registration_date` | Rename reference |
| `prnt_reg_no` | `parent_regno` | Rename reference |
| `c3_reg_status` | Does not exist | Remove / use empty default |

### SE Master (`public_api_se_master_details`)

| RPC Uses | Actual Column | Fix |
|----------|--------------|-----|
| `ip_master.address1` | `resident_addr1` | Rename reference |
| `ip_master.address2` | `resident_addr2` | Rename reference |
| `ip_self_category.effective_date` | `effective_start_date` | Rename reference |
| `TRIM(wage_category)` on numeric | `wage_category` is `numeric` | Cast to TEXT first |

## Fix

One migration that drops both functions and recreates them with corrected column references:

**ER Master changes:**
- `reg_no` → `regno`
- `comp_name` → `name`  
- `date_registered` → `registration_date`
- `prnt_reg_no` → `parent_regno`
- `c3_reg_status` → hardcoded empty default (column doesn't exist)

**SE Master changes:**
- `address1` → `resident_addr1`
- `address2` → `resident_addr2`
- `effective_date` → `effective_start_date`
- `TRIM(wage_category)` → `TRIM(wage_category::TEXT)`

## Files Modified

| File | Change |
|------|--------|
| New migration SQL | Drop + recreate both RPCs with correct column names |

No edge function or application code changes needed — the RPCs return the same JSON shape.

