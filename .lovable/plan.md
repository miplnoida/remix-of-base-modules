

# Plan: Policy-Driven Employee Levy Calculation for Holiday Pay

## Problem

The current `calculate_c3_contributions` RPC has two issues with how holiday pay interacts with employee levy:

1. **`without_dates` holiday**: Remains as a standalone value. For non-monthly periods, it's appended as a 6th element in the amounts array and evaluated independently against the slab threshold. This ignores the policy's `levy_distribution` target (w4/b2/s2/m1) and usually results in $0 levy because the holiday alone doesn't clear the threshold.

2. **`with_dates` holiday for E2W/2M**: Currently distributes proportionally across all overlapping weeks regardless of payment period boundaries. For bi-weekly (2-week periods) and semi-monthly (2-half periods), it should only split when dates cross a payment period boundary.

## Solution

A single database migration to update `calculate_c3_contributions` with two targeted changes:

### Change 1: `without_dates` — Place Holiday in Policy Target Slot

After the existing holiday distribution block (line 370) and before the levy section (line 467), add a new block that handles undistributed holiday:

- When `v_holiday > 0` and holiday was NOT distributed (no dates / distribution disabled), read the policy's `levy_distribution` JSON for the employee's pay frequency
- Place the full holiday amount into the configured target week slot:
  - **Weekly**: `w1`/`w2`/`w3`/`w4` → maps to `v_week1`..`v_week4`
  - **Bi-Weekly**: `b1` → `v_week2`, `b2` → `v_week4`
  - **Semi-Monthly**: `s1` → `v_week2`, `s2` → `v_week4`
  - **Monthly**: `m1` → `v_week1` (though monthly aggregates anyway)
- Set `v_holiday := 0` to prevent double-counting in levy arrays
- Recalculate `v_total_wages` and `v_taxable_wages` (holiday is already included, just moved between slots)
- Mark `v_holiday_distribution` with metadata so the result tracks where holiday was placed

This ensures that when the levy slab evaluation runs on `v_amounts_array` or `v_merged_amounts`, the holiday amount is part of the wage slot and evaluated against the correct pay-period slab together with wages.

### Change 2: `with_dates` for E2W/2M — Payment Period Boundary Check

Inside the existing date-based distribution block (lines 302-369), add a boundary check for non-weekly periods:

- **E2W**: Define two payment periods — weeks 1+2 (slot 1) and weeks 3+4 (slot 2). If all overlapping weeks are within the same payment period, place the full holiday in that period's target week (week 2 for slot 1, week 4 for slot 2). Only split proportionally if dates cross the boundary.
- **2M**: Same logic — two half-month periods with the same slot mapping.
- **Weekly**: No change — each week is its own period, so the existing proportional distribution is correct.
- **Monthly**: No change — already clips to month boundaries and distributes within.

### Change 3: Clean Up Levy Section

In the levy calculation section (lines 467-693), remove the code that appends `v_holiday` as a standalone 6th element to `v_amounts_array` (lines 483, 598, 663). After Changes 1 and 2, `v_holiday` will always be 0 when we reach the levy section (it's been merged into a week slot), so these become dead code. Clean them up to prevent future confusion.

## What Stays Unchanged

- Monthly holiday date clipping (lines 264-295) — already correct
- Weekly `with_dates` distribution — already correct
- Bonus policy merge/separate logic — untouched
- SS/EIB/Severance calculations — untouched
- Holiday `separate` levy method (flat % or slab on standalone amount, lines 680-693) — still works; for `separate` method, holiday is NOT merged into a slot, it stays standalone and gets its own flat/slab calc
- Employer levy and severance base calculations — untouched
- The `calculate_c3_contributions_with_other_payments` wrapper — untouched
- No frontend changes

## Important Detail: `merge` vs `separate` Method

The policy's `levy_calculation_method` controls whether holiday is merged into wages or calculated independently:

- **`merge`**: Holiday is placed into the target wage slot (Change 1/2). Levy slab evaluates the combined wage+holiday amount.
- **`separate`**: Holiday stays standalone. Levy is calculated on it independently using flat % or slab (existing lines 680-693). Changes 1/2 only apply when method is `merge`.

## Files Changed

| File | Change |
|------|--------|
| New migration SQL | `CREATE OR REPLACE FUNCTION public.calculate_c3_contributions` with 3 targeted changes |

## Verification Scenarios

| # | Scenario | Expected |
|---|----------|----------|
| 1 | E2W, without_dates, w4 holiday $444, weeks 2+4 wages $700 each | Holiday merged into week4 (1144), evaluated against E2W slab |
| 2 | Weekly, without_dates, w4 target, week1-4 wages $500 each | Holiday merged into week4, week4 crosses W slab |
| 3 | E2W, with_dates covering weeks 1+2 only | Full holiday in week2 (same payment period), no split |
| 4 | E2W, with_dates covering weeks 2+3 | Split: portion in week2 (slot 1), portion in week4 (slot 2) |
| 5 | Monthly, without_dates | Holiday merged into week1, monthly total unchanged |
| 6 | Holiday with separate method | Holiday NOT merged, evaluated independently via flat/slab |

