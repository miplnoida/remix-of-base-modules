# C3 Contribution Calculation Guide — Implementation Reference for C3 Wizard

**Version:** 2.0  
**Date:** 2026-03-12  
**Source of Truth:** `calculate_c3_contributions` + `calculate_c3_contributions_with_other_payments` PostgreSQL RPCs  
**Audience:** C3 Wizard development team  
**Change from v1.0:** Filing deadline system, penalty thresholds, bi-weekly pairing, Other Payments, configurable week start, NWD levy rate

---

## Table of Contents

1. [Overview](#1-overview)
2. [Configuration Tables & Fields](#2-configuration-tables--fields)
3. [Input Data Structure](#3-input-data-structure)
4. [Calculation Sequence (Pipeline)](#4-calculation-sequence-pipeline)
5. [Step 1: Period & Config Resolution](#5-step-1-period--config-resolution)
6. [Step 2: Filing Deadline & Late Payment](#6-step-2-filing-deadline--late-payment)
7. [Step 3: Holiday Pay Distribution](#7-step-3-holiday-pay-distribution)
8. [Step 4: Bonus Policy Resolution](#8-step-4-bonus-policy-resolution)
9. [Step 5: Wage Totals](#9-step-5-wage-totals)
10. [Step 6: Social Security (SS)](#10-step-6-social-security-ss)
11. [Step 7: EIB Calculation](#11-step-7-eib-calculation)
12. [Step 8: Employee Levy (Slab-Based)](#12-step-8-employee-levy-slab-based)
13. [Step 9: Employer Levy](#13-step-9-employer-levy)
14. [Step 10: Employer Severance](#14-step-10-employer-severance)
15. [Step 11: Penalty / Fine Calculations](#15-step-11-penalty--fine-calculations)
16. [Step 12: Other Payments (NEW)](#16-step-12-other-payments)
17. [Non-Working Director (NWD)](#17-non-working-director-nwd)
18. [Self-Employed Calculations](#18-self-employed-calculations)
19. [Required Tables for C3 Wizard](#19-required-tables-for-c3-wizard)
20. [Test Cases](#20-test-cases)
21. [Summary Field Mappings](#21-summary-field-mappings)
22. [Changelog from v1.0](#22-changelog-from-v10)

---

## 1. Overview

The C3 system calculates contributions for the **St. Kitts & Nevis Social Security Board**. Five contribution components:

| Component | Code | Description |
|-----------|------|-------------|
| Social Security (Employee) | SSC | Employee's SS deduction |
| Social Security (Employer) | SSC | Employer's SS contribution |
| Employment Injury Benefit | EIB | Employer-only contribution |
| Housing & Social Dev. Levy | LVC | Employee (slab-based) + Employer (flat %) |
| Severance | PEC | Employer-only contribution |

Both **SSB Admin** and **C3 Wizard** must call the **same** `calculate_c3_contributions` RPC (or implement identical logic) to ensure identical results.

**NEW in v2.0:** The wrapper `calculate_c3_contributions_with_other_payments` extends the base calculation by injecting Other Payment (e.g., Gratuity) contributions per employee and recalculating penalties on the adjusted totals.

---

## 2. Configuration Tables & Fields

### 2.1 `c3_config_periods`

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `start_date` | DATE | Period start (inclusive) |
| `end_date` | DATE | Period end (inclusive, nullable = open-ended) |
| `is_active` | BOOLEAN | Only active configs are used |
| `description` | TEXT | Human-readable label |

### 2.2 `c3_config_details` (1:1 with periods)

| Field | Default | Description |
|-------|---------|-------------|
| `min_age_ss` | 16 | Minimum age for SS contributions |
| `max_age_ss` | 62 | Maximum age for SS contributions |
| `min_age_levy` | 16 | Minimum age for Levy contributions |
| `max_age_levy` | 999 | Maximum age for Levy (effectively no max) |
| `employee_ss_rate` | 0.05 | Employee SS rate (5%) |
| `employee_ss_max_wage` | 6500.00 | **Universal cap** for employee SS, employer SS, AND EIB calculations |
| `employer_ss_rate` | 0.05 | Employer SS rate (5%) |
| `employer_eib_rate` | 0.01 | Employer EIB rate (1%) |
| `employer_eib_max_wage` | 6500.00 | Exists in table but **NOT used** by RPC — use `employee_ss_max_wage` instead |
| `employer_ss_max_wage` | 6500.00 | Same — **NOT used** by RPC |
| `employer_levy_rate` | 0.03 | Employer levy rate (3%) |
| `employer_severance_rate` | 0.01 | Employer severance rate (1%) |
| `submission_due_day` | 14 | Day of month (0 = last day) — used for legacy `dueDate` display only |
| `levy_slab_id` | UUID | Reference to `tb_levy_slabs` |
| `levy_monthly_threshold` | 6500 | When weekly total exceeds this, switch to monthly slab |
| `levy_use_monthly_when_exceeded` | false | Enable monthly switching logic |
| `nwd_employee_levy_rate` | 0.08 | **NEW** — NWD Employee Levy rate (decimal, e.g., 0.08 = 8%) |
| **Penalty Rates** | | |
| `levy_penalty_initial_rate` | 0.10 | Initial period penalty (10%) |
| `levy_penalty_subsequent_rate` | 0.01 | Subsequent period penalty (1%) |
| `severance_penalty_initial_rate` | 0.10 | Initial period (10%) |
| `severance_penalty_subsequent_rate` | 0.01 | Subsequent period (1%) |
| `ss_fine_initial_rate` | 0.05 | Initial period (5%) |
| `ss_fine_subsequent_rate` | 0.05 | Subsequent period (5%) — **falls back to `ss_fine_initial_rate` if NULL** |

### 2.3 `c3_calculation_config` — **NEW TABLE**

Dynamic calculation parameters (category: `filing`):

| `config_key` | Default | Description |
|--------------|---------|-------------|
| `week_start_day` | 1 | 1=Monday, 2=Tuesday, ..., 7=Sunday |
| `filing_window_unit` | 1 | 1=Months, 2=Days |
| `filing_window_value` | 1 | Number of months/days after period end |
| `penalty_initial_threshold` | 1 | Number of delay periods at initial rate |
| `penalty_subsequent_threshold` | 1 | Subsequent period length (currently informational) |

### 2.4 `tb_levy_slabs` / `tb_levy_slab_details`

| Field | Description |
|-------|-------------|
| `slab_id` | FK to `tb_levy_slabs` |
| `pay_period` | `'W'` (Weekly), `'E2W'` (Bi-Weekly), `'2M'` (Semi-Monthly), `'M'` (Monthly) |
| `order_no` | Slab order |
| `over_amt` | Threshold amount |
| `base_amt` | Base levy at this bracket |
| `tax_rate` | Marginal rate above `over_amt` |

**Levy Formula (per slot):**
```
IF wage > over_amt THEN
  levy = base_amt + ((wage - over_amt + 0.01) * tax_rate)
```

### 2.5 Bonus Policy Tables

`c3_bonus_policy_default` / `c3_bonus_policy_exceptions`

| Field | Description |
|-------|-------------|
| `include_in_levy` | Include bonus in levy calculation |
| `calculation_method` | `'merge'` or `'separate'` |
| `calc_flat_enabled` | Flat % for separate bonus levy |
| `calc_flat_percentage` | Stored as whole number (e.g., 3.5 = 3.5%) |
| `calc_slab_enabled` | Use slab lookup for separate bonus levy |
| `distribution` | JSONB — how bonus distributes across weeks |
| `min_bonus_amount` / `max_bonus_amount` | Eligibility range |
| `contrib_employee` | Include bonus in employee SS base |
| `contrib_employer` | Include bonus in employer SS base |
| `contrib_eir` | Include bonus in EIB base |
| `contrib_severance` | Include bonus in severance base |
| `include_in_severance` | Legacy alias for `contrib_severance` |

**Exception resolution:** `exception_month = periodMonth(1-indexed)` AND `year_from <= year <= year_to`. If found with `override_default = true`, use exception; else default.

### 2.6 Holiday Pay Policy Tables

`c3_holiday_pay_policy_defaults` (NOTE: **plural** table name) / `c3_holiday_pay_policy_exceptions`

Resolved via `resolve_holiday_pay_policy(period_date, month, year, policy_type)` RPC.

| Field | Description |
|-------|-------------|
| `policy_type` | `'with_dates'` or `'without_dates'` |
| `distribution_enabled` | Enable date-based distribution |
| `levy_include` | Include holiday in levy |
| `levy_calculation_method` | `'merge'` or `'separate'` |
| `levy_calc_flat_enabled` / `levy_calc_flat_percentage` | Flat % for separate |
| `levy_calc_slab_enabled` | Slab for separate |
| `levy_distribution` | JSONB target slots |
| `ssc_include` | Include holiday in SS |
| `ssc_contrib_employee` / `ssc_contrib_employer` / `ssc_contrib_eib` | SS base flags |
| `include_in_severance` | In severance base |
| `min_holiday_amount` / `max_holiday_amount` | Eligibility range |

**CRITICAL RULE:** When `distribution_enabled = true` AND `policy_type = 'with_dates'`, ALL policy rules are **suppressed** (levy_include, ssc_include, include_in_severance all forced to `false`). The distributed amounts become regular weekly wages.

### 2.7 Income Code Policy Tables — **NEW**

`c3_income_code_policy_default` / `c3_income_code_policy_exceptions` / `tb_income_codes`

| Field | Description |
|-------|-------------|
| `income_code_id` | FK to `tb_income_codes` |
| `date_entry_mode` | `'mandatory'`, `'optional'`, `'no_dates'` |
| `levy_include` | Include in levy calculation |
| `ssc_contrib_employee` | Include in employee SS |
| `ssc_contrib_employer` | Include in employer SS |
| `contrib_eib` | Include in EIB |
| `include_in_severance` | Include in severance |

---

## 3. Input Data Structure

### Main RPC Signature
```sql
calculate_c3_contributions_with_other_payments(
  p_period_year    INTEGER,   -- e.g., 2026
  p_period_month   INTEGER,   -- 0-indexed (0 = January, 11 = December)
  p_received_date  DATE,      -- Date C3 was received
  p_employee_data  JSONB      -- Array of employee objects
)
```

### Employee Data Object
```json
{
  "ssn": "123456",
  "name": "John Doe",
  "week1": 1200.00,
  "week2": 1200.00,
  "week3": 1200.00,
  "week4": 1200.00,
  "week5": 0,
  "bonus": 500.00,
  "holiday": 600.00,
  "payPeriod": "Monthly",
  "dateOfBirth": "1985-06-15",
  "termStartDate": null,
  "holidayStartDate": "2026-03-10",
  "holidayEndDate": "2026-03-14",
  "holidayNoDates": "false",
  "otherPayments": [
    {
      "income_code_id": "uuid-of-gratuity",
      "amount": 1500.00
    }
  ]
}
```

**Pay Period Codes:**
| UI Label | Code |
|----------|------|
| Weekly | W |
| Bi-Weekly | E2W |
| 2 Monthly | 2M |
| Monthly | M |

---

## 4. Calculation Sequence (Pipeline)

```
1. Resolve Config             → get_c3_config_for_period(period_date)
2. Read Calculation Config     → c3_calculation_config (week_start_day, filing window, penalty thresholds)
3. Compute Week Start Days     → Find all configured-start-day dates in the period month
4. Resolve Bonus Policy        → Exception first, then default
5. Compute Filing Deadline     → NEW: Using filing_window_unit/value
6. FOR EACH Employee:
   a. Holiday Distribution     → Proportional date-based distribution into weekly slots
   b. Resolve Holiday Policy
   c. Wage Totals              → totalWages, taxableWages
   d. Age Checks               → SS exempt, Levy exempt
   e. SS Calculations          → Employee SS, Employer SS (with bonus/holiday adjustments)
   f. EIB Calculation          → Employer EIB (cap: employee_ss_max_wage)
   g. Employee Levy            → Slab-based with BI-WEEKLY/SEMI-MONTHLY PAIRING
   h. Employer Levy            → Flat rate on adjusted base
   i. Employer Severance       → Flat rate on adjusted base
7. Sum Totals
8. Base Penalty Calculations   → Using configurable threshold system
9. FOR EACH Employee:          → NEW: Other Payments processing
   a. Calculate each OP component
   b. Add to employee totals
10. Recalculate Penalties       → On adjusted totals (base + Other Payments)
```

---

## 5. Step 1: Period & Config Resolution

```
period_date = YYYY-(month+1)-01     // month is 0-indexed
config = get_c3_config_for_period(period_date)

// NEW: Read calculation config
week_start_day = c3_calculation_config['week_start_day'] ?? 1
filing_window_unit = c3_calculation_config['filing_window_unit'] ?? 1
filing_window_value = c3_calculation_config['filing_window_value'] ?? 1
penalty_initial_threshold = c3_calculation_config['penalty_initial_threshold'] ?? 1
penalty_subsequent_threshold = c3_calculation_config['penalty_subsequent_threshold'] ?? 1
```

**Week Start Day Conversion:**
```
// PostgreSQL DOW: 0=Sunday, 1=Monday, ..., 6=Saturday
IF week_start_day == 7 THEN pg_dow = 0 ELSE pg_dow = week_start_day
```

**Finding Week Start Dates in Period:**
```
mondays = []
date = period_date  // 1st of month
WHILE DOW(date) != pg_dow: date += 1
WHILE MONTH(date) == period_month:
  mondays.push(date)
  date += 7
monday_count = mondays.length
```

---

## 6. Step 2: Filing Deadline & Late Payment — **CHANGED FROM v1.0**

### Legacy Due Date (kept for display)
```
IF submission_due_day = 0:
  due_date = last day of (period_month + 2)
ELSE:
  due_date = (period_month + 2) / MIN(submission_due_day, 28)
```

### Filing Deadline (NEW — used for penalty calculations)
```
IF filing_window_unit = 1 (Months):
  target_month = (period_month_0indexed) + filing_window_value + 1
  target_year = period_year
  WHILE target_month > 12: target_month -= 12; target_year += 1
  filing_deadline = last_day_of_month(target_year, target_month)

ELSE (Days):
  filing_deadline = last_day_of_month(period_year, period_month_1indexed) + filing_window_value
```

### Late Calculation
```
days_late = MAX(0, received_date - filing_deadline)
months_late_calendar = MAX(0, (recv_year * 12 + recv_month) - (deadline_year * 12 + deadline_month))
months_late = days_late > 0 ? CEIL(days_late / 30) : 0
additional_30_periods = days_late > 30 ? CEIL((days_late - 30) / 30) : 0

// Delay periods depend on filing window unit:
delay_periods = filing_window_unit == 1 ? months_late_calendar : months_late

// Penalty period split:
initial_penalty_periods = MIN(delay_periods, penalty_initial_threshold)
subsequent_penalty_periods = MAX(0, delay_periods - penalty_initial_threshold)
```

---

## 7. Step 3: Holiday Pay Distribution

When an employee has `holiday > 0` AND holiday start/end dates are provided AND `holidayNoDates != "true"` AND `distribution_enabled = true`:

1. **Find week boundaries** using configured week start day
2. **Calculate overlap days** between each payroll week and the holiday range
3. **Distribute proportionally:**
   ```
   FOR each week:
     distributed[week] = ROUND(holiday * overlap_days[week] / total_overlap_days, 2)
   ```
4. **Rounding fix:** Last distributed week absorbs any rounding difference
5. **Add to weekly slots:** `week1 += distributed[1]`, etc.
6. **Zero out standalone holiday:** `holiday = 0`
7. **Suppress policy rules:** When distributed, `hp_levy_include`, `hp_ssc_include`, `hp_include_severance` all forced to `false`

**When NOT distributed** (no dates, or distribution disabled): Holiday remains standalone and is handled by holiday pay policy rules.

---

## 8. Step 4: Bonus Policy Resolution

```
1. Search c3_bonus_policy_exceptions WHERE:
   - is_active = true, override_default = true
   - exception_month = (period_month + 1)  // 1-indexed
   - year_from <= period_year AND (year_to IS NULL OR year_to >= period_year)
   ORDER BY date_from DESC LIMIT 1

2. If NOT found, search c3_bonus_policy_default WHERE:
   - is_active = true
   - date_from <= period_date AND (date_to IS NULL OR date_to >= period_date)
   ORDER BY created_on DESC LIMIT 1

3. Defaults: include_in_levy=false, method='merge', all contrib flags=false
4. flat_rate = calc_flat_percentage / 100.0
```

**Bonus Eligibility:**
```
eligible = bonus > 0
IF min_bonus_amount IS NOT NULL AND bonus < min_bonus_amount → NOT eligible
IF max_bonus_amount IS NOT NULL AND bonus > max_bonus_amount → NOT eligible
```

---

## 9. Step 5: Wage Totals

```
total_wages   = week1 + week2 + week3 + week4 + week5 + bonus + holiday
taxable_wages = total_wages - bonus
```

---

## 10. Step 6: Social Security (SS)

### Age Exemption
```
is_age_exempt_ss = (age < min_age_ss) OR (age > max_age_ss)    // Default: 16-62
```

### Employee SS
```
employee_ss_base = taxable_wages
IF bonus_eligible AND contrib_employee:  employee_ss_base += bonus
IF holiday > 0 AND (NOT hp_ssc_include OR NOT hp_ssc_employee):
  employee_ss_base -= holiday

ss_insurable = MIN(employee_ss_base, employee_ss_max_wage)   // Cap: $6,500
employee_ss = ROUND(ss_insurable * employee_ss_rate, 2)      // 5%
```

### Employer SS
```
employer_ss_base = taxable_wages
IF bonus_eligible AND contrib_employer:  employer_ss_base += bonus
IF holiday > 0 AND (NOT hp_ssc_include OR NOT hp_ssc_employer):
  employer_ss_base -= holiday

employer_ss = ROUND(MIN(employer_ss_base, employee_ss_max_wage) * employer_ss_rate, 2)
```

**If age exempt:** Employee SS = 0, Employer SS = 0 (but EIB still applies)

---

## 11. Step 7: EIB Calculation

```
employer_eib_base = taxable_wages
IF bonus_eligible AND contrib_eir:  employer_eib_base += bonus
IF holiday > 0 AND (NOT hp_ssc_include OR NOT hp_ssc_eib):
  employer_eib_base -= holiday

employer_eib = ROUND(MIN(employer_eib_base, employee_ss_max_wage) * employer_eib_rate, 2)
```

**IMPORTANT:** 
- EIB uses `employee_ss_max_wage` as cap (NOT `employer_eib_max_wage`)
- EIB is calculated even when age-exempt from SS
- `employer_ss_total = employer_ss + employer_eib`

---

## 12. Step 8: Employee Levy (Slab-Based) — **UPDATED**

### Bi-Weekly/Semi-Monthly Pairing — **NEW**

**CRITICAL CHANGE from v1.0:** For `E2W` and `2M` pay periods, weeks are **paired** before slab evaluation:

```
function evaluate_levy_amounts(amounts[], slab_id, pay_period_code):
  IF pay_period_code IN ('E2W', '2M'):
    eval_amounts = [
      amounts[1] + amounts[2],    // Pair 1: Week 1 + Week 2
      amounts[3] + amounts[4]     // Pair 2: Week 3 + Week 4
    ]
    IF amounts[5] > 0: eval_amounts.push(amounts[5])    // Week 5 standalone
    IF amounts[6] > 0: eval_amounts.push(amounts[6])    // Holiday/bonus fallback
  ELSE:
    eval_amounts = amounts    // Weekly: individual slots
  
  total_levy = 0
  FOR EACH amount IN eval_amounts:
    IF amount > 0:
      slab = find_slab(slab_id, pay_period_code, amount)
      IF slab: total_levy += ROUND(slab.base_amt + ((amount - slab.over_amt + 0.01) * slab.tax_rate), 2)
  RETURN total_levy
```

### Path A: Merged Bonus
When `bonus_eligible AND include_in_levy AND calculation_method = 'merge'`:

1. Build merged amounts array: `[week1, week2, week3, week4, week5, 0]`
2. Handle holiday merge into target slot or 6th element
3. **Distribute bonus** across weeks based on pay period and distribution config
4. Check monthly override threshold
5. Apply `evaluate_levy_amounts()` with pairing support

### Path B: Separate Bonus
When `bonus_eligible AND include_in_levy AND calculation_method = 'separate'`:

1. Calculate standard levy on weeks (using `evaluate_levy_amounts()` with pairing)
2. Calculate bonus levy:
   - If `calc_flat_enabled`: `bonus_levy = ROUND(bonus * flat_rate, 2)`
   - If `calc_slab_enabled`: Slab lookup on bonus
3. `total_levy = weekly_levy + bonus_levy`

### Path C: Standard (No Bonus in Levy)
Same as Path B without bonus levy.

### Holiday Levy (Separate)
When `hp_levy_include AND hp_levy_method = 'separate' AND holiday > 0`:
- Flat or slab calculation on holiday amount
- Added to `employee_levy`

---

## 13. Step 9: Employer Levy

```
employer_levy_base = taxable_wages
IF bonus_eligible AND include_in_levy:  employer_levy_base += bonus
IF holiday > 0 AND NOT (hp_eligible AND hp_levy_include):
  employer_levy_base -= holiday

employer_levy = ROUND(employer_levy_base * employer_levy_rate, 2)
```

---

## 14. Step 10: Employer Severance

```
severance_base = taxable_wages
IF bonus_eligible AND (include_in_severance OR contrib_severance):
  severance_base += bonus
IF holiday > 0 AND NOT (hp_eligible AND hp_include_severance):
  severance_base -= holiday

employer_severance = ROUND(severance_base * employer_severance_rate, 2)
```

---

## 15. Step 11: Penalty / Fine Calculations — **CHANGED FROM v1.0**

Penalties apply when `delay_periods > 0`:

### Formula (applies to all three types)
```
penalty = ROUND(
  base * initial_rate * initial_penalty_periods +
  base * subsequent_rate * subsequent_penalty_periods, 2)
```

Where:
- `initial_penalty_periods = MIN(delay_periods, penalty_initial_threshold)`
- `subsequent_penalty_periods = MAX(0, delay_periods - penalty_initial_threshold)`

### Levy Penalty
```
levy_penalty_base = SUM(employee_levy) + SUM(employer_levy)
levy_penalty = base * levy_penalty_initial_rate * initial_periods
             + base * levy_penalty_subsequent_rate * subsequent_periods
```

### Severance Penalty
```
severance_penalty_base = SUM(employer_severance)
severance_penalty = base * severance_penalty_initial_rate * initial_periods
                  + base * severance_penalty_subsequent_rate * subsequent_periods
```

### SS Fine
```
ss_fine_base = SUM(employee_ss) + SUM(employer_ss_total)    // employer_ss_total includes EIB
ss_subsequent_rate = ss_fine_subsequent_rate ?? ss_fine_initial_rate  // FALLBACK
ss_fine = base * ss_fine_initial_rate * initial_periods
        + base * ss_subsequent_rate * subsequent_periods
```

### Total Late Charges
```
total_late_charges = levy_penalty + severance_penalty + ss_fine
```

---

## 16. Step 12: Other Payments — **NEW**

### Overview

The wrapper `calculate_c3_contributions_with_other_payments` processes an `otherPayments` array per employee AFTER the base calculation.

### Per Other Payment Calculation

For each payment with a valid `income_code_id` and `amount > 0`:

1. **Resolve policy:** `get_income_code_policy_for_period(income_code_id, year, month)`
2. **Calculate components using flat rates from config:**

```
employee_ss      = IF ssc_contrib_employee  THEN ROUND(amount * employee_ss_rate, 2) ELSE 0
employee_levy    = IF levy_include          THEN ROUND(amount * employer_levy_rate, 2) ELSE 0
employer_ss      = IF ssc_contrib_employer  THEN ROUND(amount * employer_ss_rate, 2) ELSE 0
employer_eib     = IF contrib_eib           THEN ROUND(amount * employer_eib_rate, 2) ELSE 0
employer_levy    = IF levy_include          THEN ROUND(amount * employer_levy_rate, 2) ELSE 0
employer_severance = IF include_in_severance THEN ROUND(amount * employer_severance_rate, 2) ELSE 0
```

### Aggregation

1. Sum all OP components per employee
2. Add to employee's base calculation results
3. Sum all OP amounts across all employees
4. Add to C3-level totals

### Penalty Recalculation

After adding Other Payments to totals, penalties are **recalculated** on the adjusted bases:

```
adjusted_levy_base = (base_employee_levy + op_employee_levy) + (base_employer_levy + op_employer_levy)
adjusted_severance_base = base_employer_severance + op_employer_severance
adjusted_ss_base = (base_employee_ss + op_employee_ss) + (base_employer_ss + op_employer_ss + op_employer_eib)
```

This ensures penalties correctly reflect the full contribution amounts including Other Payments.

---

## 17. Non-Working Director (NWD) — **UPDATED**

### Key Differences

| Aspect | Standard Employee | NWD |
|--------|-------------------|-----|
| SS Contributions | Calculated | Zero |
| EIB | Calculated | Zero |
| Employer Levy | Calculated | Zero |
| Severance | Calculated | Zero |
| Employee Levy | Slab-based | **Flat rate from config** |

### NWD Employee Levy
```
nwd_levy_rate = config.nwd_employee_levy_rate ?? 0.08    // Default 8%
employee_levy = total_wages * nwd_levy_rate
```

### NWD Penalty
```
IF late_months >= 2:
  penalty_rate = nwd_levy_rate + (late_months / 100)
  penalty = employee_levy * penalty_rate
```

---

## 18. Self-Employed Calculations

### Key Differences from Employer

| Aspect | Employer | Self-Employed |
|--------|----------|---------------|
| `payer_type` | `'ER'` | `'SE'` |
| Employees | Multiple per C3 | 1 (the self-employed person) |
| Weekly wages | Week1-5, Bonus, Holiday | Week1-5 only |
| Pay period | Variable | Monthly (`pay_period = 1`) |
| All contributions | Calculated | NULL |
| Rate lookup | From `c3_config_details` | From `tb_self_emp_contrib_rate` |

### Voluntary Contributor
- Same as Self-Employed except `payer_type = 'VC'`

---

## 19. Required Tables for C3 Wizard

### Via Config Sync (v3.1)

| Table | Purpose | Status |
|-------|---------|--------|
| `c3_config_periods` | Period definitions | ✅ Existing |
| `c3_config_details` | All rates and parameters | ✅ Existing (+ `nwd_employee_levy_rate`) |
| `c3_calculation_config` | Filing window, week start, penalty thresholds | 🆕 **NEW — Must sync** |
| `tb_levy_slabs` / `tb_levy_slab_details` | Levy slab brackets | ✅ Existing |
| `c3_bonus_policy_default` / `_exceptions` | Bonus policies | ✅ Existing |
| `c3_holiday_pay_policy_defaults` / `_exceptions` | Holiday pay policies | ✅ Existing (note: **plural** table name) |
| `c3_income_code_policy_default` / `_exceptions` | Income code policies | 🆕 **NEW — Must sync** |
| `tb_income_codes` | Master income codes | 🆕 **NEW — Must sync** |

### Transaction Tables

| Table | Purpose |
|-------|---------|
| `cn_c3_reported` | C3 submission headers |
| `ip_wages` | Employee wage detail records |
| `c3_pending_holiday_pay` | 🆕 Pending future distributions |

---

## 20. Test Cases

*(Same as v1.0 — refer to Section 18 of the original guide)*

**Additional test case for v2.0:**

### Test Case 9: Other Payments (Gratuity)

**Input:**
```json
{
  "ssn": "TC009", "name": "Test Employee 9",
  "week1": 1200, "week2": 1200, "week3": 1200, "week4": 1200, "week5": 0,
  "bonus": 0, "holiday": 0,
  "payPeriod": "Monthly",
  "dateOfBirth": "1985-06-15",
  "otherPayments": [
    {
      "income_code_id": "gratuity-uuid",
      "amount": 2000.00
    }
  ]
}
```

**Gratuity Policy:** `levy_include=false, ssc_contrib_employee=false, ssc_contrib_employer=false, contrib_eib=false, include_in_severance=true`

**Calculations:**
```
Base: Same as TC001 (periodGross=4800, employeeSS=240, etc.)

Other Payment (Gratuity):
  employee_ss = 0 (ssc_contrib_employee=false)
  employee_levy = 0 (levy_include=false)
  employer_ss = 0 (ssc_contrib_employer=false)
  employer_eib = 0 (contrib_eib=false)
  employer_levy = 0 (levy_include=false)
  employer_severance = ROUND(2000 * 0.01, 2) = 20.00 (include_in_severance=true)

Adjusted totals:
  totalWages = 4800 + 2000 = 6800
  employer_severance = 48.00 + 20.00 = 68.00
  (all other contributions unchanged)
```

---

## 21. Summary Field Mappings

### Output Fields per Employee

| Field | Formula |
|-------|---------|
| `totalWages` | week1+week2+week3+week4+week5+bonus+holiday + otherPaymentAmount |
| `taxableWages` | totalWages - bonus (base only, before OP) |
| `employeeSS` | base_employeeSS + otherPaymentEmployeeSS |
| `employerSS` | base_employerSS + otherPaymentEmployerSS |
| `employerEIB` | base_employerEIB + otherPaymentEmployerEIB |
| `employerSSTotal` | employerSS + employerEIB |
| `employeeLevy` | base_employeeLevy + otherPaymentEmployeeLevy |
| `employerLevy` | base_employerLevy + otherPaymentEmployerLevy |
| `employerSeverance` | base_employerSeverance + otherPaymentEmployerSeverance |

### Output Totals

| Field | Formula |
|-------|---------|
| `periodGross` | SUM(all employee totalWages) |
| `filingDeadline` | Computed from filing_window_unit/value |
| `delayPeriods` | Based on filing_window_unit |
| `initialPenaltyPeriods` | MIN(delayPeriods, penaltyInitialThreshold) |
| `subsequentPenaltyPeriods` | MAX(0, delayPeriods - penaltyInitialThreshold) |
| `levyPenalty` | Recalculated on adjusted base |
| `severancePenalty` | Recalculated on adjusted base |
| `ssFine` | Recalculated on adjusted base |
| `totalLateCharges` | levyPenalty + severancePenalty + ssFine |

---

## 22. Changelog from v1.0

| Change | Category | Impact |
|--------|----------|--------|
| Filing deadline replaces due_date for penalties | 🔴 Breaking | All late penalties recalculated |
| Tiered penalty threshold system | 🔴 Breaking | Penalty amounts change |
| Bi-weekly/semi-monthly week pairing | 🔴 Breaking | Employee levy amounts change for E2W/2M |
| Other Payments system | 🔴 New Feature | New totals and penalty recalculation |
| Configurable week start day | 🟡 Enhancement | Week boundaries may shift |
| NWD employee levy rate from config | 🟡 Enhancement | NWD levy becomes dynamic |
| SS fine subsequent rate fallback | 🟡 Bug Fix | NULL handling improvement |
| EIB uses `employee_ss_max_wage` cap | 🟡 Clarification | Was ambiguous in v1.0 |
| Holiday table name plural | 🟢 Clarification | `c3_holiday_pay_policy_defaults` |
| Distribution suppresses policy rules | 🟢 Clarification | Explicit behavior documentation |
| Pending holiday pay system | 🟢 New Feature | Future-period application |
| Income code policies | 🟢 New Feature | Configurable per income code |

---

*End of Guide v2.0*
