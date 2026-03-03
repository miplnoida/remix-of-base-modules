# C3 Calculation Test Cases — SSB Admin → C3-Wizard

> **Date:** 2026-03-03  
> **Purpose:** End-to-end calculation verification for C3-Wizard engine  
> **Config Used:** Default 2026 Configuration (rates below)

---

## Active Configuration Rates (2026)

```
Employee SS Rate:              5%   (0.05)
Employee SS Max Wage:          $6,500.00 / month
Employer SS Rate:              5%   (0.05)
Employer SS Max Wage:          $6,500.00 / month
Employer EIB Rate:             1%   (0.01)
Employer EIB Max Wage:         $6,500.00 / month
Employer Levy Rate:            3%   (0.03)  — used only for simple levy (not slab-based)
Employer Severance Rate:       1%   (0.01)
Min Age SS:                    16
Max Age SS:                    62
Min Age Levy:                  16
Max Age Levy:                  62
Levy Monthly Threshold:        $6,500.00
```

### Levy Slab (Weekly — Pay Period "W")

| Order | Over Amount | Base Amount | Tax Rate | Description |
|-------|------------|-------------|----------|-------------|
| 1 | $0.00 | $0.00 | 0.00% | First $385 exempt |
| 2 | $385.00 | $0.00 | 8.00% | 8% on amount over $385 |

> **Note:** Levy is calculated weekly per employee using the slab. Monthly threshold ($6,500) triggers monthly-rate switching when total monthly wages exceed it.

### Bonus Policy (Default)

```
calculation_method:    "separate"
calc_flat_enabled:     true
calc_flat_percentage:  0.08 (8%)
calc_slab_enabled:     false
include_in_levy:       true
include_in_severance:  false
contrib_severance:     false
contrib_employee:      true
contrib_employer:      true
contrib_eir:           true
min_bonus_amount:      null (no minimum)
max_bonus_amount:      null (no maximum)
```

### December Bonus Exception

```
exception_type:        "recurring"
exception_month:       12
override_default:      true
include_in_levy:       false
contrib_employee:      false
contrib_employer:      false
contrib_eir:           false
contrib_severance:     false
```

---

## TC-A: Standard Employee (Weekly Wages Only, 4-Week Month)

### Input
| Field | Value |
|---|---|
| Employee Age | 35 |
| Month | March 2026 |
| Weeks | 4 |
| Week 1 Wages | $1,200.00 |
| Week 2 Wages | $1,200.00 |
| Week 3 Wages | $1,200.00 |
| Week 4 Wages | $1,200.00 |
| Bonus | $0.00 |
| Holiday Pay | $0.00 |

### Step-by-Step Calculation

**Monthly Totals:**
- Total Wages = $4,800.00

**Social Security (Employee):**
- Monthly wage base = $4,800.00
- Capped at max_wage = MIN($4,800, $6,500) = $4,800.00
- Employee SS = $4,800.00 × 0.05 = **$240.00**

**Social Security (Employer):**
- Employer SS = $4,800.00 × 0.05 = **$240.00**

**EIB (Employer):**
- EIB wage base = MIN($4,800, $6,500) = $4,800.00
- EIB = $4,800.00 × 0.01 = **$48.00**

**Levy (Weekly Slab Calculation):**
- Week 1: $1,200 − $385 = $815 × 0.08 = $65.20
- Week 2: $1,200 − $385 = $815 × 0.08 = $65.20
- Week 3: $1,200 − $385 = $815 × 0.08 = $65.20
- Week 4: $1,200 − $385 = $815 × 0.08 = $65.20
- **Total Levy = $260.80**

**Severance:**
- Severance = $4,800.00 × 0.01 = **$48.00**

### Expected Output

| Component | Amount |
|---|---|
| SS Employee | $240.00 |
| SS Employer | $240.00 |
| EIB | $48.00 |
| Levy (Total) | $260.80 |
| Severance | $48.00 |
| **Grand Total Contributions** | **$836.80** |

---

## TC-B: High Earner (Exceeds Monthly SS Cap, 4-Week Month)

### Input
| Field | Value |
|---|---|
| Employee Age | 40 |
| Month | March 2026 |
| Weeks | 4 |
| Week 1 Wages | $2,000.00 |
| Week 2 Wages | $2,000.00 |
| Week 3 Wages | $2,000.00 |
| Week 4 Wages | $2,000.00 |
| Bonus | $0.00 |
| Holiday Pay | $0.00 |

### Step-by-Step Calculation

**Monthly Totals:**
- Total Wages = $8,000.00

**Social Security (Employee):**
- Monthly wage base = $8,000.00
- Capped at max_wage = MIN($8,000, $6,500) = **$6,500.00**
- Employee SS = $6,500.00 × 0.05 = **$325.00**

**Social Security (Employer):**
- Employer SS = $6,500.00 × 0.05 = **$325.00**

**EIB (Employer):**
- EIB wage base = MIN($8,000, $6,500) = **$6,500.00**
- EIB = $6,500.00 × 0.01 = **$65.00**

**Levy (Weekly Slab — wages exceed monthly threshold $6,500):**
- Since $8,000 > $6,500 monthly threshold and `levy_use_monthly_when_exceeded = false`, continue using weekly slabs:
- Week 1: ($2,000 − $385) × 0.08 = $1,615 × 0.08 = $129.20
- Week 2: $129.20
- Week 3: $129.20
- Week 4: $129.20
- **Total Levy = $516.80**

**Severance:**
- Severance = $8,000.00 × 0.01 = **$80.00**

### Expected Output

| Component | Amount |
|---|---|
| SS Employee | $325.00 |
| SS Employer | $325.00 |
| EIB | $65.00 |
| Levy (Total) | $516.80 |
| Severance | $80.00 |
| **Grand Total** | **$1,311.80** |

---

## TC-C: Age ≥ 62 (SS Exempt, Levy Still Applies)

### Input
| Field | Value |
|---|---|
| Employee Age | 63 |
| Month | March 2026 |
| Weeks | 4 |
| Week 1 Wages | $1,000.00 |
| Week 2 Wages | $1,000.00 |
| Week 3 Wages | $1,000.00 |
| Week 4 Wages | $1,000.00 |
| Bonus | $0.00 |

### Step-by-Step Calculation

**Age Check:**
- Age 63 ≥ max_age_ss (62) → **SS EXEMPT**
- Age 63 ≥ max_age_levy (62) → **Levy EXEMPT**

**Social Security:** Age ≥ 62 → Employee SS = **$0.00**, Employer SS = **$0.00**

**EIB:** Age ≥ 62 → **EIB = $0.00** (EIB follows SS age rules)

**Levy:** Age ≥ 62 → **Levy = $0.00** (levy age limit applies)

**Severance:** Severance still applies regardless of age
- Severance = $4,000.00 × 0.01 = **$40.00**

### Expected Output

| Component | Amount |
|---|---|
| SS Employee | $0.00 |
| SS Employer | $0.00 |
| EIB | $0.00 |
| Levy (Total) | $0.00 |
| Severance | $40.00 |
| **Grand Total** | **$40.00** |

---

## TC-D: Bonus — Merged with Wages (4-Week Month)

### Input
| Field | Value |
|---|---|
| Employee Age | 35 |
| Month | June 2026 |
| Weeks | 4 |
| Week 1 Wages | $1,000.00 |
| Week 2 Wages | $1,000.00 |
| Week 3 Wages | $1,000.00 |
| Week 4 Wages | $1,000.00 |
| Bonus | $2,000.00 |

**Policy Override for this test (merge scenario):**
```
calculation_method:    "merge"
distribution:          { weekly: { w1: false, w2: false, w3: false, w4: false, divide: true } }
contrib_employee:      true
contrib_employer:      true
contrib_eir:           true
include_in_levy:       true
```

### Step-by-Step Calculation

**Bonus Distribution (divide = true, 4 weeks):**
- Bonus per week = $2,000 / 4 = $500.00
- Merged Week 1 = $1,000 + $500 = $1,500.00
- Merged Week 2 = $1,000 + $500 = $1,500.00
- Merged Week 3 = $1,000 + $500 = $1,500.00
- Merged Week 4 = $1,000 + $500 = $1,500.00
- Total Merged Wages = $6,000.00

**Social Security (Employee):**
- Wage base = $6,000.00 (includes bonus since contrib_employee = true)
- Capped = MIN($6,000, $6,500) = $6,000.00
- Employee SS = $6,000.00 × 0.05 = **$300.00**

**Social Security (Employer):**
- Employer SS = $6,000.00 × 0.05 = **$300.00**

**EIB:**
- EIB base = MIN($6,000, $6,500) = $6,000.00
- EIB = $6,000.00 × 0.01 = **$60.00**

**Levy (Weekly Slab on MERGED wages):**
- Week 1: ($1,500 − $385) × 0.08 = $1,115 × 0.08 = $89.20
- Week 2: $89.20
- Week 3: $89.20
- Week 4: $89.20
- **Total Levy = $356.80**

**Severance (bonus NOT in severance since include_in_severance = false):**
- Severance base = $4,000.00 (regular wages only)
- Severance = $4,000.00 × 0.01 = **$40.00**

### Expected Output

| Component | Amount |
|---|---|
| SS Employee | $300.00 |
| SS Employer | $300.00 |
| EIB | $60.00 |
| Levy (Total) | $356.80 |
| Severance | $40.00 |
| **Grand Total** | **$1,056.80** |

---

## TC-E: Bonus — Separate (Flat Rate 8%)

### Input
| Field | Value |
|---|---|
| Employee Age | 35 |
| Month | June 2026 |
| Weeks | 4 |
| Week 1 Wages | $1,000.00 |
| Week 2 Wages | $1,000.00 |
| Week 3 Wages | $1,000.00 |
| Week 4 Wages | $1,000.00 |
| Bonus | $5,000.00 |

**Policy (default — separate with flat):**
```
calculation_method:    "separate"
calc_flat_enabled:     true
calc_flat_percentage:  0.08
include_in_levy:       true
contrib_employee:      true
contrib_employer:      true
contrib_eir:           true
```

### Step-by-Step Calculation

**Regular Wage Levy (Weekly Slab — bonus excluded):**
- Week 1: ($1,000 − $385) × 0.08 = $615 × 0.08 = $49.20
- Week 2: $49.20
- Week 3: $49.20
- Week 4: $49.20
- Regular Levy = $196.80

**Bonus Levy (Flat Rate — separate calculation):**
- Bonus Levy = $5,000 × 0.08 = **$400.00**

**Total Levy = $196.80 + $400.00 = $596.80**

**Social Security (Employee):**
- Wage base = $4,000 + $5,000 = $9,000 (bonus added since contrib_employee = true)
- Capped = MIN($9,000, $6,500) = $6,500.00
- Employee SS = $6,500.00 × 0.05 = **$325.00**

**Social Security (Employer):**
- Employer SS = $6,500.00 × 0.05 = **$325.00**

**EIB:**
- EIB base = MIN($9,000, $6,500) = $6,500.00
- EIB = $6,500.00 × 0.01 = **$65.00**

**Severance (bonus NOT in severance):**
- Severance = $4,000.00 × 0.01 = **$40.00**

### Expected Output

| Component | Amount |
|---|---|
| SS Employee | $325.00 |
| SS Employer | $325.00 |
| EIB | $65.00 |
| Levy Regular | $196.80 |
| Levy Bonus (Flat) | $400.00 |
| **Levy Total** | **$596.80** |
| Severance | $40.00 |
| **Grand Total** | **$1,351.80** |

---

## TC-F: Bonus — December Exemption (Month 12)

### Input
| Field | Value |
|---|---|
| Employee Age | 35 |
| Month | December 2026 |
| Weeks | 4 |
| Week 1 Wages | $1,200.00 |
| Week 2 Wages | $1,200.00 |
| Week 3 Wages | $1,200.00 |
| Week 4 Wages | $1,200.00 |
| Bonus | $3,000.00 |

**Active Exception (December):**
```
exception_month: 12, override_default: true
include_in_levy: false
contrib_employee: false, contrib_employer: false, contrib_eir: false, contrib_severance: false
```

### Step-by-Step Calculation

**Policy Resolution:** December exception found → bonus is FULLY EXEMPT from all contributions.

**Regular Wage Levy (Weekly Slab — bonus excluded):**
- Week 1: ($1,200 − $385) × 0.08 = $65.20
- Week 2: $65.20
- Week 3: $65.20
- Week 4: $65.20
- **Regular Levy = $260.80**

**Bonus Levy:** include_in_levy = false → **$0.00**

**Social Security (Employee):**
- Wage base = $4,800.00 (bonus NOT added — contrib_employee = false)
- Employee SS = MIN($4,800, $6,500) × 0.05 = $4,800 × 0.05 = **$240.00**

**Social Security (Employer):**
- Employer SS = $4,800.00 × 0.05 = **$240.00** (contrib_employer = false for bonus)

**EIB:**
- EIB base = $4,800.00 (bonus NOT added — contrib_eir = false)
- EIB = $4,800.00 × 0.01 = **$48.00**

**Severance:**
- Severance base = $4,800.00 (bonus NOT in severance — contrib_severance = false)
- Severance = $4,800.00 × 0.01 = **$48.00**

### Expected Output

| Component | Amount |
|---|---|
| SS Employee | $240.00 |
| SS Employer | $240.00 |
| EIB | $48.00 |
| Levy Regular | $260.80 |
| Levy Bonus | $0.00 |
| **Levy Total** | **$260.80** |
| Severance | $48.00 |
| **Grand Total** | **$836.80** |

> **Note:** The $3,000 bonus is present but contributes $0 in all categories due to the December exception.

---

## TC-G: Holiday Pay — Without Dates (Current Period Income)

### Input
| Field | Value |
|---|---|
| Employee Age | 35 |
| Month | June 2026 |
| Weeks | 4 |
| Week 1 Wages | $1,000.00 |
| Week 2 Wages | $1,000.00 |
| Week 3 Wages | $1,000.00 |
| Week 4 Wages | $1,000.00 |
| Holiday Pay | $800.00 |
| Policy Type | without_dates |

**Holiday Pay Policy (default):**
```
policy_type:          "without_dates"
levy_include:         true
levy_calculation_method: "merge"
ssc_include:          true
ssc_contrib_employee: true
ssc_contrib_employer: true
ssc_contrib_eib:      false
include_in_severance: false
```

### Step-by-Step Calculation

**Holiday Pay Treatment (without_dates → current-period income):**
- Holiday pay is treated as additional income for the period.
- For levy (merge), holiday pay is added to the wage base.
- Total wage base for SS = $4,000 + $800 = $4,800 (since ssc_include = true)

**Social Security (Employee):**
- Wage base = $4,800.00 (holiday pay included via ssc_contrib_employee = true)
- Employee SS = MIN($4,800, $6,500) × 0.05 = **$240.00**

**Social Security (Employer):**
- Employer SS = $4,800.00 × 0.05 = **$240.00**

**EIB:**
- EIB base = $4,000.00 (holiday pay NOT included — ssc_contrib_eib = false)
- EIB = $4,000.00 × 0.01 = **$40.00**

**Levy (Merge — holiday pay distributed equally across weeks):**
- Holiday per week = $800 / 4 = $200
- Week 1: $1,000 + $200 = $1,200 → ($1,200 − $385) × 0.08 = $65.20
- Week 2: $65.20
- Week 3: $65.20
- Week 4: $65.20
- **Total Levy = $260.80**

**Severance:**
- Severance base = $4,000.00 (holiday pay NOT in severance)
- Severance = $4,000.00 × 0.01 = **$40.00**

### Expected Output

| Component | Amount |
|---|---|
| SS Employee | $240.00 |
| SS Employer | $240.00 |
| EIB | $40.00 |
| Levy (Total) | $260.80 |
| Severance | $40.00 |
| **Grand Total** | **$820.80** |

---

## TC-H: Penalty Calculation (3 Months Late)

### Input
| Field | Value |
|---|---|
| Filing Month | March 2026 (submitted June 2026) |
| Months Late | 3 |
| Total SS (EE+ER) | $480.00 |
| Total Levy | $260.80 |
| Total Severance | $48.00 |

**Penalty Rates:**
```
levy_penalty_initial_rate:        10%  (0.10) — first month
levy_penalty_subsequent_rate:     1%   (0.01) — each additional month
severance_penalty_initial_rate:   10%  (0.10)
severance_penalty_subsequent_rate: 1%  (0.01)
ss_fine_initial_rate:             5%   (0.05) — first month
ss_fine_subsequent_rate:          5%   (0.05) — each additional month
```

### Step-by-Step Calculation

**Levy Penalty:**
- Initial (month 1): $260.80 × 0.10 = $26.08
- Subsequent (month 2): $260.80 × 0.01 = $2.61
- Subsequent (month 3): $260.80 × 0.01 = $2.61
- **Total Levy Penalty = $31.30**

**Severance Penalty:**
- Initial (month 1): $48.00 × 0.10 = $4.80
- Subsequent (month 2): $48.00 × 0.01 = $0.48
- Subsequent (month 3): $48.00 × 0.01 = $0.48
- **Total Severance Penalty = $5.76**

**SS Fine:**
- Initial (month 1): $480.00 × 0.05 = $24.00
- Subsequent (month 2): $480.00 × 0.05 = $24.00
- Subsequent (month 3): $480.00 × 0.05 = $24.00
- **Total SS Fine = $72.00**

### Expected Output

| Component | Amount |
|---|---|
| Levy Penalty | $31.30 |
| Severance Penalty | $5.76 |
| SS Fine | $72.00 |
| **Total Penalties/Fines** | **$109.06** |
| Original Contributions | $788.80 |
| **Grand Total with Penalties** | **$897.86** |

---

## TC-I: 5-Week Month

### Input
| Field | Value |
|---|---|
| Employee Age | 35 |
| Month | January 2026 (5 weeks) |
| Week 1 Wages | $900.00 |
| Week 2 Wages | $900.00 |
| Week 3 Wages | $900.00 |
| Week 4 Wages | $900.00 |
| Week 5 Wages | $900.00 |
| Bonus | $0.00 |

### Step-by-Step Calculation

**Monthly Totals:**
- Total Wages = $4,500.00

**Social Security (Employee):**
- Wage base = MIN($4,500, $6,500) = $4,500.00
- Employee SS = $4,500.00 × 0.05 = **$225.00**

**Social Security (Employer):**
- Employer SS = $4,500.00 × 0.05 = **$225.00**

**EIB:**
- EIB = MIN($4,500, $6,500) × 0.01 = $4,500.00 × 0.01 = **$45.00**

**Levy (Weekly Slab — 5 weeks):**
- Week 1: ($900 − $385) × 0.08 = $515 × 0.08 = $41.20
- Week 2: $41.20
- Week 3: $41.20
- Week 4: $41.20
- Week 5: $41.20
- **Total Levy = $206.00**

**Severance:**
- Severance = $4,500.00 × 0.01 = **$45.00**

### Expected Output

| Component | Amount |
|---|---|
| SS Employee | $225.00 |
| SS Employer | $225.00 |
| EIB | $45.00 |
| Levy (Total) | $206.00 |
| Severance | $45.00 |
| **Grand Total** | **$746.00** |

---

## Summary of All Test Cases

| TC | Scenario | Total Wages | Bonus | Holiday | Grand Total |
|---|---|---|---|---|---|
| A | Standard 4-week | $4,800 | — | — | $836.80 |
| B | High earner (cap hit) | $8,000 | — | — | $1,311.80 |
| C | Age ≥ 62 (SS exempt) | $4,000 | — | — | $40.00 |
| D | Bonus merged | $4,000 | $2,000 | — | $1,056.80 |
| E | Bonus separate (flat 8%) | $4,000 | $5,000 | — | $1,351.80 |
| F | December exemption | $4,800 | $3,000 | — | $836.80 |
| G | Holiday pay (without dates) | $4,000 | — | $800 | $820.80 |
| H | 3 months late penalties | $4,800 | — | — | $897.86 |
| I | 5-week month | $4,500 | — | — | $746.00 |

---

**Configuration Notes:**
- All rates are as per the 2026 default configuration
- Rounding: All final amounts are rounded to 2 decimal places (ROUND(..., 2))
- SS capping is applied at the monthly level (not per-week)
- Levy is calculated per-week using the slab, then summed for the month
- Severance applies to all ages (no age limit)

---

*End of Test Cases — SSB Admin Team*
