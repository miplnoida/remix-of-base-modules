

## Plan: Fix C3 Penalty Month-Delay Calculation

### Root Cause

The bug is in the `calculate_c3_contributions` RPC. Currently:

1. `v_due_date` = last day of month after period (for Feb 2025 → March 31, 2025)
2. `v_filing_deadline` = `v_due_date` + filing_window (1 month) = **April 30, 2025**

This **double-counts** the filing window. The `v_due_date` already represents "1 month after period end," and then the filing window adds another month on top. The user expects Feb 2025 with a 1-month filing window to have a deadline of **March 31, 2025**.

With the current bug, for received date March 2026:
- `v_months_late_calendar` = (2026×12+3) − (2025×12+4) = **11** (wrong)

With the fix (filing deadline = March 31):
- `v_months_late_calendar` = (2026×12+3) − (2025×12+3) = **12** (correct)

### Changes

#### 1. Fix RPC: `calculate_c3_contributions` (database migration)

Replace the filing deadline calculation. Instead of adding the filing window to `v_due_date`, compute it directly from the period:

```sql
-- Filing deadline = last day of (period_month + filing_window_value) for Months unit
IF v_filing_window_unit = 1 THEN
  v_filing_deadline := (
    make_date(
      p_period_year + ((p_period_month + v_filing_window_value) / 12),
      ((p_period_month + v_filing_window_value) % 12) + 1,
      1
    ) + INTERVAL '1 month' - INTERVAL '1 day'
  )::DATE;
ELSE
  -- Days unit: add days to period end date
  v_filing_deadline := (
    make_date(
      CASE WHEN p_period_month > 11 THEN p_period_year + 1 ELSE p_period_year END,
      p_period_month + 1,
      1
    ) + INTERVAL '1 month' - INTERVAL '1 day'
  )::DATE + v_filing_window_value;
END IF;
```

This ensures for Feb 2025 (p_period_month=1) with filing_window=1 month: last day of month index (1+1)=2 → March = March 31, 2025.

The `v_due_date` remains unchanged (used for other purposes), but `v_filing_deadline` is now computed from the period directly.

#### 2. Update frontend utility `sknPenaltyCalculations.ts`

Update `calculatePenalties` to accept a `filingWindowMonths` parameter and compute months late from the period-based filing deadline instead of using `dueDate` directly. This keeps frontend preview calculations consistent with the RPC.

#### 3. Update frontend utility `selfContributorPenaltyCalculations.ts`

Apply the same period-based filing deadline logic for self-employed penalty calculations.

#### 4. Update tests in `sknPenaltyCalculations.test.ts`

Fix expected values to match the corrected calculation.

### Verification (Feb 2025 period, 1-month filing window, received March 2026)

| Date Range | Status | Months Late |
|---|---|---|
| Up to March 31, 2025 | No penalty | 0 |
| April 1–30, 2025 | Initial penalty | 1 |
| May 1–31, 2025 | Subsequent | 2 |
| ... | ... | ... |
| March 1–31, 2026 | Subsequent | **12** |

The badge will correctly display **"12m late"**.

