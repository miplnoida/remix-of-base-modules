# C3 Calculation Test Cases — SSB Admin → C3-Wizard

> **Date:** 2026-03-03 (Corrected)  
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
| 1 | $520.01 | $18.20 | 3.5% | Exempt below $520.01; 3.5% on entire amount when above |
| 2 | $6,500.01 | $227.50 | 10.0% | $227.50 base + 10% on amount over $6,500 |
| 3 | $8,000.01 | $377.50 | 12.0% | $377.50 base + 12% on amount over $8,000 |

**Slab Interpretation:**
- If weekly wage ≤ **$520.01** → Levy = **$0** (exempt)
- If wage > $520.01 and ≤ $6,500.01 → Levy = wage × **3.5%**
- If wage > $6,500.01 and ≤ $8,000.01 → Levy = **$227.50** + (wage − $6,500) × **10%**
- If wage > $8,000.01 → Levy = **$377.50** + (wage − $8,000) × **12%**

> **Source:** `tb_levy_slab_details` table, slab_id `09b80144-8eda-4425-94ed-6c70b0201db8`, pay_period = 'W'

### Other Pay Period Slabs (Reference)

| Pay Period | Code | Exempt Threshold | Bracket 1 Rate | Bracket 2 Over | Bracket 3 Over |
|---|---|---|---|---|---|
| Weekly | W | $520.01 | 3.5% | $6,500.01 (10%) | $8,000.01 (12%) |
| Bi-Weekly | E2W | $1,040.01 | 3.5% | $6,500.01 (10%) | $8,000.01 (12%) |
| 2-Monthly | 2M | $1,126.68 | 3.5% | $6,500.01 (10%) | $8,000.01 (12%) |
| Monthly | M | $2,253.34 | 3.5% | $6,500.01 (10%) | $8,000.01 (12%) |
| Annual | A | $27,040.01 | 3.5% | — | — |

> **Note:** Levy is calculated per individual weekly payment using the slab, then summed for the month. For Monthly pay period, slab is applied once to total.

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
- Each week: $1,200 > $520.01 → Apply 3.5% on entire amount
- Week 1: $1,200.00 × 0.035 = $42.00
- Week 2: $1,200.00 × 0.035 = $42.00
- Week 3: $1,200.00 × 0.035 = $42.00
- Week 4: $1,200.00 × 0.035 = $42.00
- **Total Levy = $168.00**

**Severance:**
- Severance = $4,800.00 × 0.01 = **$48.00**

### Expected Output

| Component | Amount |
|---|---|
| SS Employee | $240.00 |
| SS Employer | $240.00 |
| EIB | $48.00 |
| Levy (Total) | $168.00 |
| Severance | $48.00 |
| **Grand Total Contributions** | **$744.00** |

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
- Each week: $2,000 > $520.01 and ≤ $6,500.01 → Apply 3.5%
- Week 1: $2,000.00 × 0.035 = $70.00
- Week 2: $2,000.00 × 0.035 = $70.00
- Week 3: $2,000.00 × 0.035 = $70.00
- Week 4: $2,000.00 × 0.035 = $70.00
- **Total Levy = $280.00**

**Severance:**
- Severance = $8,000.00 × 0.01 = **$80.00**

### Expected Output

| Component | Amount |
|---|---|
| SS Employee | $325.00 |
| SS Employer | $325.00 |
| EIB | $65.00 |
| Levy (Total) | $280.00 |
| Severance | $80.00 |
| **Grand Total** | **$1,075.00** |

---

## TC-C: Age ≥ 62 (SS Exempt, Levy Still Applies Based on Config)

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
- Age 63 > max_age_ss (62) → **SS EXEMPT**
- Age 63 > max_age_levy (62) → **Levy EXEMPT**

**Social Security:** Age > 62 → Employee SS = **$0.00**, Employer SS = **$0.00**

**EIB:** Age > 62 → **EIB = $0.00** (EIB follows SS age rules)

**Levy:** Age > 62 → **Levy = $0.00** (levy age limit applies)

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
- Each week: $1,500 > $520.01 and ≤ $6,500.01 → Apply 3.5%
- Week 1: $1,500.00 × 0.035 = $52.50
- Week 2: $1,500.00 × 0.035 = $52.50
- Week 3: $1,500.00 × 0.035 = $52.50
- Week 4: $1,500.00 × 0.035 = $52.50
- **Total Levy = $210.00**

**Severance (bonus NOT in severance since include_in_severance = false):**
- Severance base = $4,000.00 (regular wages only)
- Severance = $4,000.00 × 0.01 = **$40.00**

### Expected Output

| Component | Amount |
|---|---|
| SS Employee | $300.00 |
| SS Employer | $300.00 |
| EIB | $60.00 |
| Levy (Total) | $210.00 |
| Severance | $40.00 |
| **Grand Total** | **$910.00** |

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

**Regular Wage Levy (Weekly Slab — bonus excluded from slab):**
- Each week: $1,000 > $520.01 and ≤ $6,500.01 → Apply 3.5%
- Week 1: $1,000.00 × 0.035 = $35.00
- Week 2: $1,000.00 × 0.035 = $35.00
- Week 3: $1,000.00 × 0.035 = $35.00
- Week 4: $1,000.00 × 0.035 = $35.00
- Regular Levy = $140.00

**Bonus Levy (Flat Rate — separate calculation):**
- Bonus Levy = $5,000 × 0.08 = **$400.00**

**Total Levy = $140.00 + $400.00 = $540.00**

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
| Levy Regular | $140.00 |
| Levy Bonus (Flat) | $400.00 |
| **Levy Total** | **$540.00** |
| Severance | $40.00 |
| **Grand Total** | **$1,295.00** |

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
- Each week: $1,200 > $520.01 and ≤ $6,500.01 → Apply 3.5%
- Week 1: $1,200.00 × 0.035 = $42.00
- Week 2: $1,200.00 × 0.035 = $42.00
- Week 3: $1,200.00 × 0.035 = $42.00
- Week 4: $1,200.00 × 0.035 = $42.00
- **Regular Levy = $168.00**

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
| Levy Regular | $168.00 |
| Levy Bonus | $0.00 |
| **Levy Total** | **$168.00** |
| Severance | $48.00 |
| **Grand Total** | **$744.00** |

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
- For levy (merge), holiday pay is distributed equally and added to each week's wages.
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
- Each week: $1,000 + $200 = $1,200 → $1,200 > $520.01 → Apply 3.5%
- Week 1: $1,200.00 × 0.035 = $42.00
- Week 2: $1,200.00 × 0.035 = $42.00
- Week 3: $1,200.00 × 0.035 = $42.00
- Week 4: $1,200.00 × 0.035 = $42.00
- **Total Levy = $168.00**

**Severance:**
- Severance base = $4,000.00 (holiday pay NOT in severance)
- Severance = $4,000.00 × 0.01 = **$40.00**

### Expected Output

| Component | Amount |
|---|---|
| SS Employee | $240.00 |
| SS Employer | $240.00 |
| EIB | $40.00 |
| Levy (Total) | $168.00 |
| Severance | $40.00 |
| **Grand Total** | **$728.00** |

---

## TC-H: Penalty Calculation (3 Months Late)

### Input
| Field | Value |
|---|---|
| Filing Month | March 2026 (submitted June 2026) |
| Months Late | 3 |
| Total SS (EE+ER) | $480.00 |
| Total Levy | $168.00 |
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
- Initial (month 1): $168.00 × 0.10 = $16.80
- Subsequent (month 2): $168.00 × 0.01 = $1.68
- Subsequent (month 3): $168.00 × 0.01 = $1.68
- **Total Levy Penalty = $20.16**

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
| Levy Penalty | $20.16 |
| Severance Penalty | $5.76 |
| SS Fine | $72.00 |
| **Total Penalties/Fines** | **$97.92** |
| Original Contributions | $744.00 |
| **Grand Total with Penalties** | **$841.92** |

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
- Each week: $900 > $520.01 and ≤ $6,500.01 → Apply 3.5%
- Week 1: $900.00 × 0.035 = $31.50
- Week 2: $900.00 × 0.035 = $31.50
- Week 3: $900.00 × 0.035 = $31.50
- Week 4: $900.00 × 0.035 = $31.50
- Week 5: $900.00 × 0.035 = $31.50
- **Total Levy = $157.50**

**Severance:**
- Severance = $4,500.00 × 0.01 = **$45.00**

### Expected Output

| Component | Amount |
|---|---|
| SS Employee | $225.00 |
| SS Employer | $225.00 |
| EIB | $45.00 |
| Levy (Total) | $157.50 |
| Severance | $45.00 |
| **Grand Total** | **$697.50** |

---

## Summary of All Test Cases

| TC | Scenario | Total Wages | Bonus | Holiday | Levy | Grand Total |
|---|---|---|---|---|---|---|
| A | Standard 4-week | $4,800 | — | — | $168.00 | $744.00 |
| B | High earner (cap hit) | $8,000 | — | — | $280.00 | $1,075.00 |
| C | Age ≥ 62 (SS exempt) | $4,000 | — | — | $0.00 | $40.00 |
| D | Bonus merged | $4,000 | $2,000 | — | $210.00 | $910.00 |
| E | Bonus separate (flat 8%) | $4,000 | $5,000 | — | $540.00 | $1,295.00 |
| F | December exemption | $4,800 | $3,000 | — | $168.00 | $744.00 |
| G | Holiday pay (without dates) | $4,000 | — | $800 | $168.00 | $728.00 |
| H | 3 months late penalties | $4,800 | — | — | $168.00 | $841.92 |
| I | 5-week month | $4,500 | — | — | $157.50 | $697.50 |

---

**Configuration Notes:**
- All rates are as per the 2026 default configuration
- Rounding: All final amounts are rounded to 2 decimal places (ROUND(..., 2))
- SS capping is applied at the monthly level (not per-week)
- Levy is calculated per-week using the 3-bracket progressive slab, then summed for the month
- Levy exempt threshold (Weekly): $520.01 — below this, levy = $0
- Levy bracket 1: 3.5% on entire amount (when above threshold)
- Levy bracket 2: $227.50 + 10% on portion above $6,500
- Levy bracket 3: $377.50 + 12% on portion above $8,000
- Severance applies to all ages (no age limit)

---

**Correction Log:**
- 2026-03-03: Fixed incorrect levy slab. Was showing "$385 exempt / 8% above" — corrected to actual DB values: $520.01 exempt / 3.5% / 10% / 12% progressive brackets from `tb_levy_slab_details`.

---

*End of Test Cases — SSB Admin Team*
