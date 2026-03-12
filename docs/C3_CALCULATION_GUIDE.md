# C3 Contribution Calculation Guide — Implementation Reference for C3 Wizard

**Version:** 1.0  
**Date:** 2026-03-05  
**Source of Truth:** `calculate_c3_contributions` PostgreSQL RPC  
**Audience:** C3 Wizard development team  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Configuration Tables & Fields](#2-configuration-tables--fields)
3. [Input Data Structure](#3-input-data-structure)
4. [Calculation Sequence (Pipeline)](#4-calculation-sequence-pipeline)
5. [Step 1: Period & Config Resolution](#5-step-1-period--config-resolution)
6. [Step 2: Due Date & Late Payment Calculation](#6-step-2-due-date--late-payment-calculation)
7. [Step 3: Holiday Pay Distribution](#7-step-3-holiday-pay-distribution)
8. [Step 4: Bonus Policy Resolution](#8-step-4-bonus-policy-resolution)
9. [Step 5: Wage Totals](#9-step-5-wage-totals)
10. [Step 6: Social Security (SS) Calculations](#10-step-6-social-security-ss-calculations)
11. [Step 7: EIB Calculation](#11-step-7-eib-calculation)
12. [Step 8: Employee Levy (Slab-Based)](#12-step-8-employee-levy-slab-based)
13. [Step 9: Employer Levy](#13-step-9-employer-levy)
14. [Step 10: Employer Severance](#14-step-10-employer-severance)
15. [Step 11: Penalty / Fine Calculations](#15-step-11-penalty--fine-calculations)
16. [Self-Employed Calculations](#16-self-employed-calculations)
17. [Required Tables for C3 Wizard](#17-required-tables-for-c3-wizard)
18. [Test Cases](#18-test-cases)
19. [Summary Field Mappings](#19-summary-field-mappings)

---

## 1. Overview

The C3 system calculates contributions for the **St. Kitts & Nevis Social Security Board**. There are four contribution components:

| Component | Code | Description |
|-----------|------|-------------|
| Social Security (Employee) | SSC | Employee's SS deduction |
| Social Security (Employer) | SSC | Employer's SS contribution |
| Employment Injury Benefit | EIB | Employer-only contribution |
| Housing & Social Dev. Levy | LVC | Employee (slab-based) + Employer (flat %) |
| Severance | PEC | Employer-only contribution |

Both **SSB Admin** and **C3 Wizard** must call the **same** `calculate_c3_contributions` RPC to ensure identical results.

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
| `employee_ss_max_wage` | 6500.00 | Cap on wages for employee SS calculation |
| `employer_ss_rate` | 0.05 | Employer SS rate (5%) |
| `employer_eib_rate` | 0.01 | Employer EIB rate (1%) |
| `employer_eib_max_wage` | 6500.00 | Cap on wages for EIB calculation |
| `employer_ss_max_wage` | 6500.00 | Cap on wages for employer SS calculation |
| `employer_levy_rate` | 0.03 | Employer levy rate (3%) |
| `employer_severance_rate` | 0.01 | Employer severance rate (1%) |
| `submission_due_day` | 14 | Day of month submissions are due (0 = last day) |
| `levy_slab_id` | UUID | Reference to `tb_levy_slabs` |
| `levy_monthly_threshold` | 6500 | When weekly total exceeds this, switch to monthly slab |
| `levy_use_monthly_when_exceeded` | false | Enable monthly switching logic |
| **Penalty Rates** | | |
| `levy_penalty_initial_rate` | 0.10 | First month penalty (10%) |
| `levy_penalty_subsequent_rate` | 0.01 | Each additional month (1%) |
| `severance_penalty_initial_rate` | 0.10 | First month (10%) |
| `severance_penalty_subsequent_rate` | 0.01 | Each additional month (1%) |
| `ss_fine_initial_rate` | 0.05 | First month (5%) |
| `ss_fine_subsequent_rate` | 0.05 | Each additional month (5%) |

### 2.3 `tb_levy_slabs` / `tb_levy_slab_details`

Levy slabs define progressive brackets per pay period:

| Field | Description |
|-------|-------------|
| `slab_id` | FK to `tb_levy_slabs` |
| `pay_period` | `'W'` (Weekly), `'E2W'` (Bi-Weekly), `'2M'` (2-Monthly), `'M'` (Monthly) |
| `order_no` | Slab order |
| `over_amt` | Threshold amount (wages must exceed this) |
| `base_amt` | Base levy at this bracket |
| `tax_rate` | Marginal rate above `over_amt` |

**Levy Formula (per slot):**
```
IF wage > over_amt THEN
  levy = base_amt + ((wage - over_amt + 0.01) * tax_rate)
```

### 2.4 `c3_bonus_policy_default` / `c3_bonus_policy_exceptions`

| Field | Description |
|-------|-------------|
| `include_in_levy` | Boolean — include bonus in levy calculation |
| `calculation_method` | `'merge'` or `'separate'` |
| `calc_flat_enabled` | Use flat % for separate bonus levy |
| `calc_flat_percentage` | Flat rate (stored as whole number, e.g., 3.5 = 3.5%) |
| `calc_slab_enabled` | Use slab lookup for separate bonus levy |
| `distribution` | JSONB — how bonus distributes across weeks |
| `min_bonus_amount` | Min eligible bonus (null = no min) |
| `max_bonus_amount` | Max eligible bonus (null = no max) |
| `contrib_employee` | Include bonus in employee SS base |
| `contrib_employer` | Include bonus in employer SS base |
| `contrib_eir` | Include bonus in EIB base |
| `contrib_severance` | Include bonus in severance base |
| `include_in_severance` | Include bonus in severance base (legacy alias) |

**Exception resolution:** Match `exception_month = periodMonth` AND `year_from <= year <= year_to`. If found, use exception; otherwise fall back to default.

### 2.5 Holiday Pay Policy Tables

Resolved via `resolve_holiday_pay_policy()` RPC. Key fields:

| Field | Description |
|-------|-------------|
| `levy_include` | Include holiday in levy |
| `levy_calculation_method` | `'merge'` or `'separate'` |
| `levy_calc_flat_enabled` | Flat % for separate holiday levy |
| `levy_calc_flat_percentage` | The flat rate |
| `levy_calc_slab_enabled` | Use slab for separate holiday levy |
| `ssc_include` | Include holiday in SS |
| `ssc_contrib_employee` | In employee SS base |
| `ssc_contrib_employer` | In employer SS base |
| `ssc_contrib_eib` | In EIB base |
| `include_in_severance` | In severance base |
| `distribution_enabled` | Enable date-based distribution |

---

## 3. Input Data Structure

### RPC Signature
```sql
calculate_c3_contributions(
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
  "holidayNoDates": "false"
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
1. Resolve Config          → get_c3_config_for_period(period_date)
2. Compute Mondays         → Find all Mondays in the period month
3. Resolve Bonus Policy    → Exception first, then default
4. Compute Due Date        → For penalty calculations
5. FOR EACH Employee:
   a. Holiday Distribution → Proportional date-based distribution into weekly slots
   b. Resolve Holiday Policy
   c. Wage Totals          → totalWages, taxableWages
   d. Age Checks           → SS exempt, Levy exempt
   e. SS Calculations      → Employee SS, Employer SS (with bonus/holiday adjustments)
   f. EIB Calculation      → Employer EIB (with bonus/holiday adjustments)
   g. Employee Levy        → Slab-based (merge or separate bonus handling)
   h. Employer Levy        → Flat rate on adjusted base
   i. Employer Severance   → Flat rate on adjusted base
6. Sum Totals
7. Penalty Calculations    → Based on months late
```

---

## 5. Step 1: Period & Config Resolution

```
period_date = YYYY-(month+1)-01     // month is 0-indexed
config = get_c3_config_for_period(period_date)
```

The RPC finds the **active** config period where `start_date <= period_date AND (end_date IS NULL OR end_date >= period_date)`, ordered by `start_date DESC` (most recent first).

---

## 6. Step 2: Due Date & Late Payment Calculation

```
IF submission_due_day = 0:
  due_date = last day of (period_month + 2)   // i.e., end of next month
ELSE:
  due_date = (period_month + 2) / submission_due_day  // 14th of next month

days_late = MAX(0, received_date - due_date)
months_late_calendar = MAX(0, (received_year * 12 + received_month) - (due_year * 12 + due_month))
```

---

## 7. Step 3: Holiday Pay Distribution

When an employee has holiday pay AND holiday start/end dates are provided AND `distribution_enabled = true`:

1. **Find Mondays** in the period month
2. **Calculate overlap days** between each payroll week and the holiday range
3. **Distribute proportionally:**
   ```
   FOR each week:
     distributed[week] = ROUND(holiday * overlap_days[week] / total_overlap_days, 2)
   ```
4. **Add to weekly slots:** `week1 += distributed[1]`, etc.
5. **Zero out standalone holiday** to prevent double-counting: `holiday = 0`

**When NOT distributed** (no dates or distribution disabled): Holiday remains as a standalone amount and is handled by holiday pay policy rules.

---

## 8. Step 4: Bonus Policy Resolution

```
1. Search c3_bonus_policy_exceptions WHERE:
   - is_active = true
   - override_default = true
   - exception_month = (period_month + 1)
   - year_from <= period_year <= year_to

2. If NOT found, search c3_bonus_policy_default WHERE:
   - is_active = true
   - date_from <= period_date
   - date_to IS NULL OR date_to >= period_date

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
taxable_wages = total_wages - bonus    // i.e., week1..5 + holiday
```

**Note:** After holiday distribution, `holiday` may be 0 (already merged into weeks). The formula still works because weeks already contain the distributed amounts.

---

## 10. Step 6: Social Security (SS) Calculations

### Age Exemption
```
is_age_exempt_ss = (age < min_age_ss) OR (age > max_age_ss)
```
Default: age 16–62 are eligible.

### Employee SS
```
employee_ss_base = taxable_wages
IF bonus_eligible AND contrib_employee:  employee_ss_base += bonus
IF holiday > 0 AND (NOT hp_ssc_include OR NOT hp_ssc_employee):  
  employee_ss_base -= holiday

ss_insurable = MIN(employee_ss_base, employee_ss_max_wage)   // Cap at $6,500
employee_ss = ROUND(ss_insurable * employee_ss_rate, 2)      // 5%
```

### Employer SS
```
employer_ss_base = taxable_wages
IF bonus_eligible AND contrib_employer:  employer_ss_base += bonus
IF holiday > 0 AND (NOT hp_ssc_include OR NOT hp_ssc_employer):
  employer_ss_base -= holiday

employer_ss = ROUND(MIN(employer_ss_base, employee_ss_max_wage) * employer_ss_rate, 2)  // 5%
```

**If age exempt:** Employee SS = 0, Employer SS = 0 (but EIB still applies — see below)

---

## 11. Step 7: EIB Calculation

```
employer_eib_base = taxable_wages
IF bonus_eligible AND contrib_eir:  employer_eib_base += bonus
IF holiday > 0 AND (NOT hp_ssc_include OR NOT hp_ssc_eib):
  employer_eib_base -= holiday

employer_eib = ROUND(MIN(employer_eib_base, employee_ss_max_wage) * employer_eib_rate, 2)  // 1%
```

**IMPORTANT:** EIB is calculated even when age-exempt from SS. When exempt:
```
employer_eib = ROUND(MIN(taxable_wages, employee_ss_max_wage) * employer_eib_rate, 2)
```

**Employer SS Total = employer_ss + employer_eib**

---

## 12. Step 8: Employee Levy (Slab-Based)

This is the most complex calculation. Three paths exist:

### Path A: Merged Bonus
When `bonus_eligible AND include_in_levy AND calculation_method = 'merge'`:

1. Build merged amounts array: `[week1, week2, week3, week4, week5, holiday]`
2. If holiday is "separate" in policy, set `merged[6] = 0`
3. **Distribute bonus** across weeks based on pay period:
   - **Weekly (W):** Use `distribution.weekly` config to decide which weeks get bonus. Default: divide equally across 5 weeks.
   - **Bi-Weekly (E2W):** Split into slots 1 and 3 (or per `distribution.biweekly` config)
   - **Monthly/2M:** Add entire bonus to slot 1
4. Check **monthly override threshold**: If total of merged amounts > `levy_monthly_threshold` and `levy_use_monthly_when_exceeded = true`, use Monthly slab on combined total
5. Otherwise: Apply slab formula to each merged slot individually using the appropriate pay period slabs

### Path B: Separate Bonus
When `bonus_eligible AND include_in_levy AND calculation_method = 'separate'`:

1. Calculate standard levy on Week1-5 (+/- holiday) using slab per slot
2. Calculate **bonus levy separately**:
   - If `calc_flat_enabled`: `bonus_levy = ROUND(bonus * flat_rate, 2)`
   - If `calc_slab_enabled`: Use slab lookup on bonus amount
3. `total_levy = weekly_levy + bonus_levy`

### Path C: Standard (No Bonus in Levy)
When bonus is NOT included in levy:

1. Calculate levy on Week1-5 (+ holiday if not handled separately)
2. Per-slot slab calculation using pay period code slabs
3. Monthly override check same as above

### Holiday Levy (Separate)
When `hp_levy_include AND hp_levy_method = 'separate' AND holiday > 0`:
- If `hp_levy_flat_enabled`: `holiday_levy = ROUND(holiday * flat_pct, 2)`
- If `hp_levy_slab_enabled`: Use slab lookup on holiday amount
- Added to `employee_levy`

### Slab Formula (applied per slot)
```sql
SELECT * FROM tb_levy_slab_details 
WHERE slab_id = config.levy_slab_id 
  AND pay_period = pay_period_code 
  AND is_active = true 
  AND amount > over_amt 
ORDER BY over_amt DESC LIMIT 1;

IF found:
  levy = ROUND(base_amt + ((amount - over_amt + 0.01) * tax_rate), 2)
```

### Monthly Override Logic
```
IF pay_period != 'M'
   AND levy_use_monthly_when_exceeded = true
   AND monthly_total > levy_monthly_threshold
   AND levy_monthly_threshold > 0:
   
   → Use 'M' (Monthly) slabs on the combined total instead of per-slot calculation
```

---

## 13. Step 9: Employer Levy

```
employer_levy_base = taxable_wages
IF bonus_eligible AND include_in_levy:  employer_levy_base += bonus
IF holiday > 0 AND NOT (hp_eligible AND hp_levy_include):
  employer_levy_base -= holiday

employer_levy = ROUND(employer_levy_base * employer_levy_rate, 2)   // 3%
```

---

## 14. Step 10: Employer Severance

```
severance_base = taxable_wages
IF bonus_eligible AND (include_in_severance OR contrib_severance):
  severance_base += bonus
IF holiday > 0 AND NOT (hp_eligible AND hp_include_severance):
  severance_base -= holiday

employer_severance = ROUND(severance_base * employer_severance_rate, 2)  // 1%
```

---

## 15. Step 11: Penalty / Fine Calculations

Penalties apply when `months_late_calendar > 0`:

### Levy Penalty
```
levy_penalty_base = employee_levy_total + employer_levy_total
levy_penalty = ROUND(
  base * initial_rate + base * subsequent_rate * MAX(months_late - 1, 0), 2)
```

### Severance Penalty
```
severance_penalty_base = employer_severance_total
severance_penalty = ROUND(
  base * initial_rate + base * subsequent_rate * MAX(months_late - 1, 0), 2)
```

### SS Fine
```
ss_fine_base = employee_ss_total + employer_ss_total  // employer_ss_total includes EIB
ss_fine = ROUND(
  base * initial_rate + base * subsequent_rate * MAX(months_late - 1, 0), 2)
```

### Total Late Charges
```
total_late_charges = levy_penalty + severance_penalty + ss_fine
```

---

## 16. Self-Employed Calculations

### Key Differences from Employer

| Aspect | Employer | Self-Employed |
|--------|----------|---------------|
| `payer_type` | `'ER'` | `'SE'` |
| Employees | Multiple per C3 | 1 (the self-employed person) |
| Weekly wages | Week1-5, Bonus, Holiday | Week1-5 only (no bonus/holiday) |
| Pay period | Variable | Monthly (`pay_period = 1`) |
| Employee SS/Levy | Calculated | NULL (not applicable) |
| Employer SS/EIB/Levy/Severance | Calculated | NULL (not applicable) |
| `paid_code` | 1 if amount > 0, else 0 | 1 if wages exist, else 0 |
| `wages_paid6` (Holiday) | Mapped | NULL |
| `wages_paid7` (Bonus) | Mapped | NULL |

### Self-Employed C3 Calculation

Self-employed contributors pay a **flat contribution rate** based on their registered wage category:

```
1. Look up wage category from ip_self_category table
2. Contribution = wage_category_rate * declared_wages
3. No slab-based levy calculation
4. No employer contributions (SS, EIB, Levy, Severance)
5. No bonus/holiday handling
```

### Voluntary Contributor
- Same as Self-Employed except `payer_type = 'VC'`
- Same calculation logic as SE

### Required Self-Employed Tables

| Table | Purpose |
|-------|---------|
| `ip_self_employ` | Self-employment registrations (SSN, activity, status) |
| `ip_last_self_emp` | Last self-employment reference tracking |
| `ip_self_category` | Wage categories with rates and effective dates |
| `tb_self_emp_contrib_rate` | Master contribution rate table |
| `cn_c3_reported` | C3 submission header (shared with employer) |
| `ip_wages` | Wage detail records (`payer_type = 'SE'` or `'VC'`) |

### `ip_wages` Field Mapping for Self-Employed

| Field | Value |
|-------|-------|
| `ssn` | Self-employed person's SSN |
| `payer_id` | Same as SSN |
| `payer_type` | `'SE'` or `'VC'` |
| `sequence_no` | Schedule from parent C3 |
| `period` | Period date (YYYY-MM-DD) |
| `pay_period` | `1` (Monthly) |
| `wages_paid1..5` | Weekly wages (NULL if week not selected) |
| `wages_paid6` | NULL |
| `wages_paid7` | NULL |
| `paid_code1..5` | 1 if wages exist, else 0 |
| `paid_code6`, `paid_code7` | NULL |
| All contribution amounts | NULL |

---

## 17. Required Tables for C3 Wizard

### Already Shared (via Config Sync)

| Table | Purpose |
|-------|---------|
| `c3_config_periods` | Period definitions |
| `c3_config_details` | All rates and parameters |
| `tb_levy_slabs` | Levy slab headers |
| `tb_levy_slab_details` | Levy slab brackets |
| `c3_bonus_policy_default` | Default bonus policies |
| `c3_bonus_policy_exceptions` | Month/year-specific overrides |
| `c3_holiday_pay_policy_default` | Holiday pay policies |
| `c3_holiday_pay_policy_exceptions` | Holiday pay overrides |

### Employer-Specific

| Table | Purpose |
|-------|---------|
| `cn_c3_reported` | C3 submission headers |
| `ip_wages` | Employee wage detail records |

### Self-Employed-Specific

| Table | Purpose |
|-------|---------|
| `ip_self_employ` | Registration records |
| `ip_self_category` | Wage categories |
| `tb_self_emp_contrib_rate` | Contribution rate master |

---

## 18. Test Cases

### Default Configuration Used in Tests

| Parameter | Value |
|-----------|-------|
| `employee_ss_rate` | 0.05 (5%) |
| `employee_ss_max_wage` | 6500.00 |
| `employer_ss_rate` | 0.05 (5%) |
| `employer_eib_rate` | 0.01 (1%) |
| `employer_eib_max_wage` | 6500.00 |
| `employer_levy_rate` | 0.03 (3%) |
| `employer_severance_rate` | 0.01 (1%) |
| `min_age_ss` | 16 |
| `max_age_ss` | 62 |
| `submission_due_day` | 14 |
| Levy Slab (Weekly) | 0→520: $0 + 0%; >520.00: $0 + 3.5%; >6500: $209.30 + 10%; >8000: $359.30 + 12% |

---

### Test Case 1: Basic Monthly Employee (No Bonus, No Holiday)

**Input:**
```json
{
  "ssn": "TC001", "name": "Test Employee 1",
  "week1": 1200, "week2": 1200, "week3": 1200, "week4": 1200, "week5": 0,
  "bonus": 0, "holiday": 0,
  "payPeriod": "Monthly",
  "dateOfBirth": "1985-06-15"
}
```
**Period:** January 2026 (year=2026, month=0)  
**Received Date:** 2026-02-14 (on time)

**Calculations:**
```
total_wages     = 1200 + 1200 + 1200 + 1200 + 0 + 0 + 0 = 4800.00
taxable_wages   = 4800.00
employee_age    = 40 (eligible for SS and Levy)

Employee SS:
  ss_base       = 4800.00
  ss_insurable  = MIN(4800, 6500) = 4800.00
  employee_ss   = ROUND(4800 * 0.05, 2) = 240.00

Employer SS:
  employer_ss   = ROUND(MIN(4800, 6500) * 0.05, 2) = 240.00

Employer EIB:
  employer_eib  = ROUND(MIN(4800, 6500) * 0.01, 2) = 48.00

employer_ss_total = 240.00 + 48.00 = 288.00

Employee Levy (Monthly slab on $4800):
  Slab: M slab lookup → depends on Monthly slab configuration
  (Using Weekly slabs individually: each $1200 → slab calc per week)
  Per week: $1200 > $520 → base_amt + (($1200 - $520 + $0.01) * 0.035)
           = 0 + (680.01 * 0.035) = $23.80 per week
  Total: 4 weeks × $23.80 = $95.20

Employer Levy:
  employer_levy = ROUND(4800 * 0.03, 2) = 144.00

Employer Severance:
  employer_severance = ROUND(4800 * 0.01, 2) = 48.00
```

**Expected Output:**
| Field | Value |
|-------|-------|
| totalWages | 4800.00 |
| taxableWages | 4800.00 |
| employeeSS | 240.00 |
| employerSS | 240.00 |
| employerEIB | 48.00 |
| employerSSTotal | 288.00 |
| employeeLevy | 95.20 |
| employerLevy | 144.00 |
| employerSeverance | 48.00 |
| Penalties | 0 (on time) |

---

### Test Case 2: Monthly Employee with Bonus (Merge Method)

**Input:**
```json
{
  "ssn": "TC002", "name": "Test Employee 2",
  "week1": 1500, "week2": 1500, "week3": 1500, "week4": 1500, "week5": 0,
  "bonus": 2000, "holiday": 0,
  "payPeriod": "Monthly",
  "dateOfBirth": "1990-03-20"
}
```
**Bonus Policy:** `include_in_levy=true, method='merge', contrib_employee=false, contrib_employer=false, contrib_eir=false, contrib_severance=true`

**Calculations:**
```
total_wages   = 6000 + 2000 = 8000.00
taxable_wages = 6000.00

Employee SS (bonus NOT in SS base):
  ss_insurable = MIN(6000, 6500) = 6000
  employee_ss  = ROUND(6000 * 0.05, 2) = 300.00

Employer SS (bonus NOT in SS base):
  employer_ss  = ROUND(6000 * 0.05, 2) = 300.00

Employer EIB (bonus NOT in EIB base):
  employer_eib = ROUND(6000 * 0.01, 2) = 60.00

employer_ss_total = 360.00

Employee Levy (MERGE):
  Merged amounts = [1500+2000, 1500, 1500, 1500, 0, 0] = [3500, 1500, 1500, 1500, 0, 0]
  (For Monthly: bonus added to slot 1)
  merge_total = 8000
  Since payPeriod = 'M': Use Monthly slab on merge_total = 8000
  Monthly slab: 8000 > 8000.00 threshold → $359.30 + ($8000 - $8000 + $0.01) * 0.12
  = $359.30 + 0.0012 = $359.30 (approximately)
  employee_levy ≈ $359.30

Employer Levy (bonus IN levy):
  employer_levy_base = 6000 + 2000 = 8000
  employer_levy = ROUND(8000 * 0.03, 2) = 240.00

Employer Severance (bonus IN severance):
  severance_base = 6000 + 2000 = 8000
  employer_severance = ROUND(8000 * 0.01, 2) = 80.00
```

---

### Test Case 3: Bonus Separate Method

**Input:** Same wages as TC002  
**Bonus Policy:** `include_in_levy=true, method='separate', calc_flat_enabled=true, calc_flat_percentage=3.5, contrib_employee=true`

**Calculations:**
```
Employee SS (bonus IN SS base):
  ss_base      = 6000 + 2000 = 8000
  ss_insurable = MIN(8000, 6500) = 6500   ← CAPPED
  employee_ss  = ROUND(6500 * 0.05, 2) = 325.00

Employee Levy:
  Standard levy on weekly slots (no bonus): Week1-4 = $1500 each
  Per week slab on $1500 → base_amt + ((1500 - 520 + 0.01) * 0.035) = 0 + 980.01 * 0.035 = $34.30
  Standard levy = 4 × $34.30 = $137.20

  Bonus levy (separate, flat 3.5%):
  bonus_levy = ROUND(2000 * 0.035, 2) = $70.00

  Total employee_levy = 137.20 + 70.00 = $207.20
```

---

### Test Case 4: Weekly Employee with Holiday Distribution

**Input:**
```json
{
  "ssn": "TC004", "name": "Test Employee 4",
  "week1": 800, "week2": 800, "week3": 800, "week4": 800, "week5": 0,
  "bonus": 0, "holiday": 1000,
  "payPeriod": "Weekly",
  "dateOfBirth": "1975-08-10",
  "holidayStartDate": "2026-03-09",
  "holidayEndDate": "2026-03-13",
  "holidayNoDates": "false"
}
```
**Period:** March 2026 (year=2026, month=2)

**Holiday Distribution:**
```
Mondays in March 2026: Mar 2, Mar 9, Mar 16, Mar 23, Mar 30 (5 Mondays)
Holiday: Mar 9 – Mar 13

Week 1 (Mar 2-8):  0 overlap days
Week 2 (Mar 9-15): 5 overlap days (Mar 9,10,11,12,13)
Week 3 (Mar 16-22): 0 overlap days
Week 4 (Mar 23-29): 0 overlap days
Week 5 (Mar 30-31): 0 overlap days

Total overlap = 5 days
Distribution: Week2 gets 100% of $1000 = $1000

After distribution:
  week1 = 800, week2 = 800 + 1000 = 1800, week3 = 800, week4 = 800, week5 = 0
  holiday = 0 (zeroed out)
```

**Calculations after distribution:**
```
total_wages   = 800 + 1800 + 800 + 800 + 0 + 0 + 0 = 4200.00
taxable_wages = 4200.00

Employee SS:
  ss_insurable = MIN(4200, 6500) = 4200
  employee_ss  = ROUND(4200 * 0.05, 2) = 210.00

Employee Levy (Weekly slabs, per slot):
  Week1 ($800): 0 + ((800 - 520 + 0.01) * 0.035) = 280.01 * 0.035 = $9.80
  Week2 ($1800): 0 + ((1800 - 520 + 0.01) * 0.035) = 1280.01 * 0.035 = $44.80
  Week3 ($800): $9.80
  Week4 ($800): $9.80
  Week5 ($0): $0
  Total = 9.80 + 44.80 + 9.80 + 9.80 = $74.20
```

---

### Test Case 5: Age-Exempt Employee (Over 62)

**Input:**
```json
{
  "ssn": "TC005", "name": "Senior Employee",
  "week1": 1000, "week2": 1000, "week3": 1000, "week4": 1000, "week5": 0,
  "bonus": 0, "holiday": 0,
  "payPeriod": "Monthly",
  "dateOfBirth": "1960-01-15"
}
```
**Period:** January 2026 → Age = 66 (> 62 = exempt from SS)

**Calculations:**
```
is_age_exempt_ss = true (66 > 62)
is_age_exempt_levy = false (66 < 999)

Employee SS  = 0 (exempt)
Employer SS  = 0 (exempt)
Employer EIB = ROUND(MIN(4000, 6500) * 0.01, 2) = 40.00  ← EIB STILL APPLIES
employer_ss_total = 0 + 40.00 = 40.00

Employee Levy = normal slab calculation (NOT exempt)
Employer Levy = ROUND(4000 * 0.03, 2) = 120.00
Employer Severance = ROUND(4000 * 0.01, 2) = 40.00
```

---

### Test Case 6: Late Submission with Penalties

**Input:** Same as TC001  
**Received Date:** 2026-04-20 (65 days late)  
**Due Date:** 2026-02-14

**Penalty Calculations:**
```
days_late = 65
months_late_calendar = (2026*12 + 4) - (2026*12 + 2) = 2

Levy penalty base = employee_levy + employer_levy = 95.20 + 144.00 = 239.20
levy_penalty = ROUND(239.20 * 0.10 + 239.20 * 0.01 * (2-1), 2)
             = ROUND(23.92 + 2.39, 2) = 26.31

Severance penalty base = 48.00
severance_penalty = ROUND(48 * 0.10 + 48 * 0.01 * 1, 2)
                  = ROUND(4.80 + 0.48, 2) = 5.28

SS fine base = employee_ss + employer_ss_total = 240.00 + 288.00 = 528.00
ss_fine = ROUND(528 * 0.05 + 528 * 0.05 * 1, 2)
        = ROUND(26.40 + 26.40, 2) = 52.80

total_late_charges = 26.31 + 5.28 + 52.80 = 84.39
```

---

### Test Case 7: December Bonus (Exempt)

**Period:** December 2025 (year=2025, month=11)  
**Bonus Policy Exception for December:** All `contrib_*` flags = false, `include_in_levy` = false, `include_in_severance` = false

**Input:**
```json
{
  "week1": 1500, "week2": 1500, "week3": 1500, "week4": 1500, "week5": 0,
  "bonus": 3000, "holiday": 0, "payPeriod": "Monthly"
}
```

**Calculations:**
```
total_wages   = 6000 + 3000 = 9000.00
taxable_wages = 6000.00

Employee SS: ROUND(MIN(6000, 6500) * 0.05, 2) = 300.00
Employer SS: 300.00
Employer EIB: ROUND(MIN(6000, 6500) * 0.01, 2) = 60.00

Employee Levy: Calculated on $6000 only (bonus excluded)
Employer Levy: ROUND(6000 * 0.03, 2) = 180.00  (bonus excluded)
Employer Severance: ROUND(6000 * 0.01, 2) = 60.00 (bonus excluded)
```

---

### Test Case 8: Wage Cap Reached

**Input:**
```json
{
  "week1": 2000, "week2": 2000, "week3": 2000, "week4": 2000, "week5": 0,
  "bonus": 0, "holiday": 0, "payPeriod": "Monthly",
  "dateOfBirth": "1985-01-01"
}
```

**Calculations:**
```
total_wages = taxable_wages = 8000.00

Employee SS:
  ss_insurable = MIN(8000, 6500) = 6500  ← CAPPED
  employee_ss  = ROUND(6500 * 0.05, 2) = 325.00

Employer SS:
  employer_ss  = ROUND(6500 * 0.05, 2) = 325.00

Employer EIB:
  employer_eib = ROUND(6500 * 0.01, 2) = 65.00

Employer Levy: ROUND(8000 * 0.03, 2) = 240.00  ← NO cap on levy base
Employer Severance: ROUND(8000 * 0.01, 2) = 80.00
```

---

## 19. Summary Field Mappings

### Output Fields per Employee

| Field | Formula |
|-------|---------|
| `totalWages` | week1+week2+week3+week4+week5+bonus+holiday |
| `taxableWages` | totalWages - bonus |
| `employeeSS` | MIN(adjusted_base, ss_max_wage) × employee_ss_rate |
| `employerSS` | MIN(adjusted_base, ss_max_wage) × employer_ss_rate |
| `employerEIB` | MIN(adjusted_base, ss_max_wage) × employer_eib_rate |
| `employerSSTotal` | employerSS + employerEIB |
| `employeeLevy` | Slab-based (see Step 8) |
| `bonusLevy` | Bonus-specific levy (separate method only) |
| `holidayLevy` | Holiday-specific levy (separate method only) |
| `employerLevy` | adjusted_base × employer_levy_rate |
| `employerSeverance` | adjusted_base × employer_severance_rate |
| `totalWagesPlusEmployeeLevyPlusSS` | totalWages + employeeLevy + employeeSS |
| `employersThreePercentLevyPlusSS` | employerLevy + employerSSTotal |
| `employersOnePercentSeverancePay` | employerSeverance |

### Output Totals

| Field | Formula |
|-------|---------|
| `periodGross` | SUM of all employee totalWages |
| `levyPenalty` | (employee_levy + employer_levy) × penalty formula |
| `severancePenalty` | employer_severance × penalty formula |
| `ssFine` | (employee_ss + employer_ss_total) × fine formula |
| `totalLateCharges` | levyPenalty + severancePenalty + ssFine |

---

## Implementation Checklist for C3 Wizard

- [ ] Call `calculate_c3_contributions` RPC (same function as SSB Admin)
- [ ] Sync configuration tables via the config sync protocol (v3.0)
- [ ] Implement `ip_wages` upsert on save with correct field mappings
- [ ] Handle all pay period types: W, E2W, 2M, M
- [ ] Support bonus merge/separate modes
- [ ] Support holiday date-based distribution
- [ ] Handle age exemptions (SS exempt but EIB still applies)
- [ ] Apply wage cap ($6,500 default) for SS and EIB
- [ ] Calculate penalties based on calendar months late
- [ ] For Self-Employed: Set all contribution fields to NULL, `payer_type = 'SE'`
- [ ] For Voluntary: Same as SE but `payer_type = 'VC'`
- [ ] December bonus exemption via policy exceptions
- [ ] Verify test cases produce identical results in both systems
