

## Analysis: Employee Levy Calculation is Incorrect

### Root Cause

The migration `20260310195736` **completely rewrote** the `calculate_c3_contributions` RPC with numerous bugs. The patches applied afterward (`203816`, `204447`) only fixed 3 out of 15+ issues. The function currently fails with `"column 'levy_method' does not exist"` and returns an error JSON, which the frontend catches via the `EXCEPTION WHEN OTHERS` handler.

The $119 levy shown in the screenshot is likely being calculated client-side as a fallback, not from the server RPC.

### Complete List of Bugs in the Current Deployed Function

**Holiday Pay Policy column mismatches** (both `c3_holiday_pay_policy_default` and `_exceptions` tables):
| RPC uses | Actual column |
|---|---|
| `levy_method` | `levy_calculation_method` |
| `levy_flat_enabled` | `levy_calc_flat_enabled` |
| `levy_flat_percentage` | `levy_calc_flat_percentage` |
| `levy_slab_enabled` | `levy_calc_slab_enabled` |
| `ssc_employee` | `ssc_contrib_employee` |
| `ssc_employer` | `ssc_contrib_employer` |
| `ssc_eib` | `ssc_contrib_eib` |

**Levy calculation engine is completely rewritten and broken:**
- References non-existent table `c3_levy_slabs` (should be `tb_levy_slab_details`)
- Uses wrong formula: `amount * levy_rate` instead of `base_amt + ((amount - over_amt + 0.01) * tax_rate)`
- Doesn't use `v_config.levy_slab_id` to look up the correct slab period
- Doesn't map pay period codes (`E2W`, `2M`, `W`, `M`) for slab lookup
- Doesn't use policy-driven holiday distribution (`levy_distribution` config from policy)
- Doesn't use `resolve_holiday_pay_policy()` RPC for proper policy resolution
- Holiday "without_dates" adds to "highest week" instead of the configured distribution slot

**What the $119 should actually be (correct calculation):**
- Pay period: Bi-Weekly (E2W), Weeks: 0, 1700, 0, 1700, Holiday: 400 (without_dates, levy_include=true, distribution biweekly b2=true)
- E2W Slot 1 (wk1+wk2): 0 + 1700 = 1700 → Slab: $36.40 + (1700 - 1040.01 + 0.01) × 0.035 = $59.50
- E2W Slot 2 (wk3+wk4): 0 + 1700 + 400 (holiday) = 2100 → Slab: $36.40 + (2100 - 1040.01 + 0.01) × 0.035 = $73.50
- **Correct total levy: $133.00** (not $119.00)

---

## Plan: Restore the Working RPC with Penalty Enhancements

### Single Migration

Deploy a new migration that restores the **proven working version** from migration `20260303203306` with these targeted additions from the newer version:

1. Add `SECURITY DEFINER` and `SET search_path = public` attributes
2. Replace the old hardcoded penalty logic with the **configurable filing/penalty window** logic (reading from `c3_calculation_config` for `week_start_day`, `filing_window_unit`, `filing_window_value`, `penalty_initial_threshold`, `penalty_subsequent_threshold`)
3. Keep the "no cap on subsequent periods" behavior
4. Replace the old hardcoded week-start-day (Monday) with the configurable `v_week_start_day`

The restored version correctly:
- Uses `tb_levy_slab_details` with `v_config.levy_slab_id`
- Uses correct slab formula: `base_amt + ((amount - over_amt + 0.01) * tax_rate)`
- Maps pay periods to slab codes (`E2W`, `2M`, `W`, `M`)
- Calls `resolve_holiday_pay_policy()` for proper policy resolution
- Handles holiday distribution via policy's `levy_distribution` config
- Supports merge/separate bonus and holiday methods correctly

### No Frontend Changes Required

The frontend hook (`useC3ServerCalculations.ts`) already correctly consumes the RPC response format, which is identical between the old and new versions.

