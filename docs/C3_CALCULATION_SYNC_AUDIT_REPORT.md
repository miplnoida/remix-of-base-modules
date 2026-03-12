# C3 Calculation Synchronization Audit Report

**Audit Date:** 2026-03-12  
**Auditor:** System Consistency Auditor  
**Scope:** SSB Admin `calculate_c3_contributions` RPC vs. C3 Wizard Guide (v1.0, 2026-03-05)  
**Status:** ⚠️ CRITICAL — Multiple divergences found requiring C3 Wizard updates

---

## Executive Summary

The SSB Admin system has evolved significantly since the original C3 Calculation Guide (v1.0) was published to the C3 Wizard team. **12 critical discrepancies** and **5 enhancement gaps** have been identified. If the C3 Wizard is still implementing based on Guide v1.0, employer submissions will produce **different calculation results** from SSB Admin for late submissions, penalty calculations, and specific edge cases.

---

## 1. CRITICAL DISCREPANCIES

### 1.1 ❌ Filing Deadline Calculation — COMPLETELY CHANGED

| Aspect | Guide v1.0 (What Wizard May Have) | Current SSB Admin RPC |
|--------|-----------------------------------|----------------------|
| **Due Date** | Fixed: `due_date = period_month + 2, day = submission_due_day` | Same (kept for display only) |
| **Filing Deadline** | Same as due_date | **NEW**: Computed independently from period using `filing_window_unit` and `filing_window_value` |
| **Window Unit** | Not documented | `1` = Months, `2` = Days (from `c3_calculation_config`) |
| **Window Value** | Not documented | Configurable (default: 1 month) |
| **Month-based** | N/A | `filing_deadline = last day of (period_month + filing_window_value + 1)` |
| **Day-based** | N/A | `filing_deadline = last day of period month + filing_window_value days` |

**Impact:** If the Wizard still uses `due_date` for penalty calculation, ALL late submission penalties will be different.

**Fix for C3 Wizard:**
```javascript
// READ from synced c3_calculation_config table:
const filingWindowUnit = config.filing_window_unit; // 1=Months, 2=Days
const filingWindowValue = config.filing_window_value; // e.g., 1

if (filingWindowUnit === 1) {
  // Month-based: target month = periodMonth(1-indexed) + windowValue
  let targetMonth = periodMonth + 1 + filingWindowValue; // periodMonth is 0-indexed
  let targetYear = periodYear;
  while (targetMonth > 12) { targetMonth -= 12; targetYear++; }
  filingDeadline = lastDayOfMonth(targetYear, targetMonth);
} else {
  // Day-based: last day of period month + windowValue days
  filingDeadline = addDays(lastDayOfMonth(periodYear, periodMonth + 1), filingWindowValue);
}
daysLate = Math.max(0, differenceInDays(receivedDate, filingDeadline));
```

---

### 1.2 ❌ Penalty Threshold System — NEW (Not in Guide v1.0)

| Aspect | Guide v1.0 | Current SSB Admin RPC |
|--------|------------|----------------------|
| **Penalty Model** | Simple: `initial_rate + subsequent_rate × (months - 1)` | **Tiered**: `initial_rate × initialPeriods + subsequent_rate × subsequentPeriods` |
| **Initial Threshold** | Not documented | Configurable: `penalty_initial_threshold` (from `c3_calculation_config`) |
| **Subsequent Threshold** | Not documented | Configurable: `penalty_subsequent_threshold` |
| **Delay Periods** | `months_late_calendar` always | Depends on `filing_window_unit`: if Months → `months_late_calendar`; if Days → `ceil(days_late / 30)` |

**Current SSB Admin Logic:**
```sql
v_delay_periods := CASE WHEN filing_window_unit = 1 THEN months_late_calendar ELSE months_late END;
v_initial_penalty_periods := LEAST(v_delay_periods, v_penalty_initial_threshold);
v_subsequent_penalty_periods := GREATEST(0, v_delay_periods - v_penalty_initial_threshold);

-- Penalty formula:
levy_penalty := ROUND(
  base * initial_rate * initial_penalty_periods +
  base * subsequent_rate * subsequent_penalty_periods, 2);
```

**Guide v1.0 formula (OUTDATED):**
```
levy_penalty = base * initial_rate + base * subsequent_rate * MAX(months - 1, 0)
```

**Fix for C3 Wizard:**
```javascript
// Read from synced c3_calculation_config:
const penaltyInitialThreshold = config.penalty_initial_threshold; // e.g., 1
const penaltySubsequentThreshold = config.penalty_subsequent_threshold;
const filingWindowUnit = config.filing_window_unit;

const delayPeriods = filingWindowUnit === 1 ? monthsLateCalendar : monthsLate;
const initialPenaltyPeriods = Math.min(delayPeriods, penaltyInitialThreshold);
const subsequentPenaltyPeriods = Math.max(0, delayPeriods - penaltyInitialThreshold);

const levyPenalty = round(
  levyBase * config.levy_penalty_initial_rate * initialPenaltyPeriods +
  levyBase * config.levy_penalty_subsequent_rate * subsequentPenaltyPeriods, 2);
```

---

### 1.3 ❌ Configurable Week Start Day — NEW

| Aspect | Guide v1.0 | Current SSB Admin |
|--------|------------|-------------------|
| **Week Start** | Hardcoded Monday (DOW=1) | Configurable: `week_start_day` from `c3_calculation_config` (1=Mon...7=Sun) |

**Fix for C3 Wizard:** Read `week_start_day` from synced config and use it for Monday-finding logic:
```javascript
const weekStartDay = config.week_start_day || 1; // Default Monday
// Convert to JS DOW: if 7 → 0 (Sunday), else use directly
const pgDow = weekStartDay === 7 ? 0 : weekStartDay;
```

---

### 1.4 ❌ `evaluate_levy_amounts` Helper — NEW (Bi-Weekly/Semi-Monthly Pairing)

| Aspect | Guide v1.0 | Current SSB Admin |
|--------|------------|-------------------|
| **Bi-Weekly Levy** | Individual week slab evaluation | **Paired**: `[wk1+wk2, wk3+wk4]` then slab evaluation per pair |
| **Semi-Monthly** | Individual week slab evaluation | **Paired**: Same as Bi-Weekly `[wk1+wk2, wk3+wk4]` |
| **Week 5** | Part of regular evaluation | Added as separate element if non-zero |
| **6th Element** | Holiday fallback | Handled as separate slab evaluation if present |

**This is CRITICAL**: The Guide v1.0 says \"Per-slot slab calculation using pay period code slabs\" which implies individual weeks. The current RPC **pairs weeks** for E2W and 2M pay periods.

**Fix for C3 Wizard:**
```javascript
function evaluateLevyAmounts(amounts, slabId, payPeriodCode) {
  let evalAmounts;
  
  if (payPeriodCode === 'E2W' || payPeriodCode === '2M') {
    // PAIR weeks: [wk1+wk2, wk3+wk4]
    evalAmounts = [
      (amounts[0] || 0) + (amounts[1] || 0),
      (amounts[2] || 0) + (amounts[3] || 0)
    ];
    // Add wk5 if non-zero
    if (amounts.length >= 5 && (amounts[4] || 0) > 0) {
      evalAmounts.push(amounts[4]);
    }
    // Add 6th element (bonus/holiday) if non-zero
    if (amounts.length >= 6 && (amounts[5] || 0) > 0) {
      evalAmounts.push(amounts[5]);
    }
  } else {
    // Weekly: keep individual
    evalAmounts = [...amounts];
  }
  
  // Evaluate each against slabs using payPeriodCode
  let totalLevy = 0;
  for (const amount of evalAmounts) {
    if (amount > 0) {
      const slab = findApplicableSlab(slabId, payPeriodCode, amount);
      if (slab) {
        totalLevy += round(slab.base_amt + ((amount - slab.over_amt + 0.01) * slab.tax_rate), 2);
      }
    }
  }
  return totalLevy;
}
```

---

### 1.5 ❌ Other Payments / Income Code Policy — ENTIRELY NEW

The `calculate_c3_contributions_with_other_payments` wrapper and `calculate_other_payment_components` RPC are **completely absent** from Guide v1.0.

| Component | Status in Guide v1.0 | Current SSB Admin |
|-----------|---------------------|-------------------|
| `otherPayments` input field | Not documented | Each employee can have an `otherPayments` array |
| `calculate_other_payment_components` | Not documented | Flat-rate calc per income code policy |
| `get_income_code_policy_for_period` | Not documented | Resolves policy → exception chain |
| `c3_income_code_policy_default` | Not documented | New table |
| `c3_income_code_policy_exceptions` | Not documented | New table |
| `tb_income_codes` | Not documented | Master table for income codes (e.g., Gratuity) |

**Impact:** Employers with Other Payments (Gratuity, etc.) will have incorrect totals if the Wizard doesn't implement this.

**Fix for C3 Wizard:**
1. Sync `c3_income_code_policy_default`, `c3_income_code_policy_exceptions`, and `tb_income_codes` tables
2. Implement `get_income_code_policy_for_period` resolution locally
3. For each employee's other payments, calculate components using policy flags and config rates
4. Add OP amounts to employee totals AFTER base calculation
5. Recalculate penalties on the adjusted totals

---

### 1.6 ❌ NWD Employee Levy Rate — NEW (Documented in Separate Guide)

| Aspect | Guide v1.0 | Current SSB Admin |
|--------|------------|-------------------|
| **NWD Levy Rate** | Not mentioned | `nwd_employee_levy_rate` in `c3_config_details` (default 0.08) |
| **Sync** | Not synced | Included in config sync payload |

**Fix:** Already documented in `C3_WIZARD_NWD_LEVY_RATE_GUIDE.md`. Verify Wizard team has implemented it.

---

### 1.7 ❌ Penalty Recalculation in Wrapper — IMPORTANT

The `calculate_c3_contributions_with_other_payments` wrapper **recalculates all penalties** using the adjusted totals (base + other payments). The base `calculate_c3_contributions` also calculates penalties, but the wrapper **overrides** them.

| Aspect | Guide v1.0 | Current SSB Admin |
|--------|------------|-------------------|
| Penalty base | Only standard wages | Standard wages + Other Payment contributions |
| Recalculation | N/A | Wrapper recalculates levyPenalty, severancePenalty, ssFine using adjusted sums |

**Fix:** After adding OP amounts to totals, the Wizard must recalculate:
```javascript
const adjustedLevyBase = adjustedEmployeeLevy + adjustedEmployerLevy;
const adjustedSeveranceBase = adjustedEmployerSeverance;
const adjustedSSBase = adjustedEmployeeSS + adjustedEmployerSS; // includes EIB

// Re-apply same penalty formula with adjusted bases
```

---

### 1.8 ❌ Holiday Pay Policy Resolution — Table Name Difference

| Aspect | Guide v1.0 | Current SSB Admin |
|--------|------------|-------------------|
| Default table | `c3_holiday_pay_policy_default` (singular) | `c3_holiday_pay_policy_defaults` (plural — used in `resolve_holiday_pay_policy`) |

**Fix:** Ensure Wizard syncs to the correct table name: `c3_holiday_pay_policy_defaults`.

---

### 1.9 ❌ Holiday Distribution Suppression of Policy Rules

When `distribution_enabled = true` AND `policy_type = 'with_dates'`, the `resolve_holiday_pay_policy` function returns:
```
levy_include = false, ssc_include = false, include_in_severance = false
```

This means ALL specific holiday policy rules are **suppressed** — the distributed amounts are treated as regular weekly wages. Guide v1.0 mentions this but doesn't make the suppression explicit.

**Fix:** When using date-based distribution, the Wizard must NOT apply any holiday-specific SS/Levy/Severance rules. The holiday is already folded into weekly wages.

---

### 1.10 ❌ SS Fine Subsequent Rate Fallback

```sql
-- Current RPC:
v_ss_fine_base * COALESCE(v_config.ss_fine_subsequent_rate, v_config.ss_fine_initial_rate) * v_subsequent_penalty_periods
```

If `ss_fine_subsequent_rate` is NULL, it falls back to `ss_fine_initial_rate`. Guide v1.0 doesn't document this.

**Fix:**
```javascript
const ssSubsequentRate = config.ss_fine_subsequent_rate ?? config.ss_fine_initial_rate;
```

---

### 1.11 ❌ Employer EIB Max Wage Cap — Uses `employee_ss_max_wage`

The RPC uses `employee_ss_max_wage` (not `employer_eib_max_wage`) as the cap for EIB calculation:
```sql
v_employer_eib := ROUND(LEAST(v_employer_eib_base, v_config.employee_ss_max_wage) * v_config.employer_eib_rate, 2);
```

While `employer_eib_max_wage` exists in `c3_config_details`, the RPC uses `employee_ss_max_wage` as the ceiling for ALL capped components (Employee SS, Employer SS, and EIB).

**Fix:** Wizard must use `employee_ss_max_wage` as the cap for EIB, not `employer_eib_max_wage`.

---

### 1.12 ❌ Pending Holiday Pay System — NOT DOCUMENTED

The `c3_pending_holiday_pay` table stores future-dated holiday distributions that should be auto-applied in subsequent periods.

| Aspect | Guide v1.0 | Current SSB Admin |
|--------|------------|-------------------|
| Pending holiday storage | Not documented | `c3_pending_holiday_pay` table |
| Future application | Not documented | Fetched and applied during future C3 submissions |

**Fix:** Implement pending holiday pay fetch and application logic in the Wizard.

---

## 2. CONFIGURATION TABLES REQUIRING SYNC

### 2.1 New Tables (Not in Original Guide)

| Table | Purpose | Sync Required |
|-------|---------|--------------|
| `c3_calculation_config` | Filing window, week start day, penalty thresholds | ✅ YES — Critical |
| `c3_income_code_policy_default` | Income code policies | ✅ YES |
| `c3_income_code_policy_exceptions` | Income code exceptions | ✅ YES |
| `tb_income_codes` | Master income codes | ✅ YES |
| `c3_pending_holiday_pay` | Pending distributions | ✅ YES |

### 2.2 Updated Tables

| Table | Change | Sync Impact |
|-------|--------|-------------|
| `c3_config_details` | Added `nwd_employee_levy_rate` | ✅ Already in sync payload |
| `c3_holiday_pay_policy_defaults` | Table name plural | ⚠️ Verify table name match |

---

## 3. HARDCODED VALUES THAT MUST BE DYNAMIC

| Value | Guide v1.0 Status | Must Come From |
|-------|-------------------|---------------|
| Week start day (Monday) | Hardcoded | `c3_calculation_config.week_start_day` |
| Filing window (1 month) | Implicit | `c3_calculation_config.filing_window_value` + `filing_window_unit` |
| Penalty initial threshold | Hardcoded (1 period) | `c3_calculation_config.penalty_initial_threshold` |
| Penalty subsequent period | Hardcoded (per month) | `c3_calculation_config.penalty_subsequent_threshold` |
| NWD levy rate (8%) | Hardcoded | `c3_config_details.nwd_employee_levy_rate` |

---

## 4. LOGIC THAT REMAINS UNCHANGED (Verified)

The following logic in Guide v1.0 matches the current SSB Admin RPC:

| Component | Status |
|-----------|--------|
| ✅ Period & Config Resolution | Unchanged |
| ✅ Employee SS base calculation (with bonus/holiday adjustments) | Unchanged |
| ✅ Employer SS base calculation | Unchanged |
| ✅ EIB calculation (including age-exempt still calculates EIB) | Unchanged |
| ✅ Bonus Policy resolution (exception → default fallback) | Unchanged |
| ✅ Bonus eligibility (min/max capping) | Unchanged |
| ✅ Bonus merge distribution (weekly w1-w4, bi-weekly b1/b2) | Unchanged |
| ✅ Bonus separate (flat % or slab) | Unchanged |
| ✅ Holiday date-based distribution (proportional overlap) | Unchanged |
| ✅ Holiday "without dates" standalone handling | Unchanged |
| ✅ Holiday separate levy (flat or slab) | Unchanged |
| ✅ Employer Levy flat rate | Unchanged |
| ✅ Employer Severance flat rate | Unchanged |
| ✅ Slab formula: `base_amt + ((amount - over_amt + 0.01) * tax_rate)` | Unchanged |
| ✅ Monthly override threshold logic | Unchanged |
| ✅ December bonus exemption via policy exceptions | Unchanged |
| ✅ Wage cap ($6,500 default) for SS and EIB | Unchanged |
| ✅ Age exemption ranges | Unchanged |
| ✅ Self-employed calculation (flat rate from `tb_self_emp_contrib_rate`) | Unchanged |

---

## 5. PRIORITY MATRIX

| # | Discrepancy | Severity | Effort | Priority |
|---|-------------|----------|--------|----------|
| 1.1 | Filing Deadline calculation | 🔴 CRITICAL | Medium | P0 |
| 1.2 | Penalty threshold system | 🔴 CRITICAL | Medium | P0 |
| 1.4 | Bi-Weekly/Semi-Monthly pairing | 🔴 CRITICAL | Medium | P0 |
| 1.5 | Other Payments system | 🔴 CRITICAL | High | P0 |
| 1.7 | Penalty recalculation in wrapper | 🔴 CRITICAL | Medium | P0 |
| 1.3 | Configurable week start day | 🟡 HIGH | Low | P1 |
| 1.6 | NWD levy rate | 🟡 HIGH | Low | P1 |
| 1.10 | SS fine fallback rate | 🟡 HIGH | Low | P1 |
| 1.11 | EIB max wage cap source | 🟡 HIGH | Low | P1 |
| 1.8 | Holiday table name | 🟢 MEDIUM | Low | P2 |
| 1.9 | Distribution suppression | 🟢 MEDIUM | Low | P2 |
| 1.12 | Pending holiday pay | 🟢 MEDIUM | High | P2 |

---

## 6. RECOMMENDED ACTION PLAN

### Phase 1: Critical Fixes (Immediate)
1. **Sync new config tables**: Add `c3_calculation_config` to config sync payload
2. **Update filing deadline**: Replace due_date-based penalty calculation with filing_deadline logic
3. **Update penalty formula**: Implement initial/subsequent threshold system
4. **Implement `evaluate_levy_amounts`**: Add bi-weekly/semi-monthly pairing
5. **Implement Other Payments**: Full income code policy system

### Phase 2: High Priority (Within 1 Week)
6. **Configurable week start day**: Read from synced config
7. **NWD levy rate**: Verify implementation per existing guide
8. **SS fine fallback**: Add COALESCE logic
9. **EIB cap source**: Use `employee_ss_max_wage` consistently

### Phase 3: Medium Priority (Within 2 Weeks)
10. **Table name alignment**: Verify `c3_holiday_pay_policy_defaults` (plural)
11. **Distribution suppression**: Explicit null-out of policy rules
12. **Pending holiday pay**: Implement storage and future-period application

---

## 7. UPDATED CONFIG SYNC PAYLOAD REQUIREMENTS

The config sync payload (v3.0) must be extended to include:

```json
{
  "sync_version": "3.1",
  "calculation_config": {
    "week_start_day": 1,
    "filing_window_unit": 1,
    "filing_window_value": 1,
    "penalty_initial_threshold": 1,
    "penalty_subsequent_threshold": 1
  },
  "income_codes": [...],
  "income_code_policies": [...],
  "income_code_policy_exceptions": [...]
}
```

---

*End of Audit Report*
