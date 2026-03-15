# C3 Wizard — Official Calculation Validation Test Cases

**Document Version:** 1.0  
**Date:** 2026-03-15  
**Prepared by:** SSB Admin — QA Coordination & System Integration  
**Purpose:** Validate C3 Wizard calculation parity against SSB Admin source-of-truth

---

## 1. Reference Configuration Values

All test cases below use the **active configuration period** (effective from `2025-01-01`).

### 1.1 Social Security & EIB Rates

| Parameter | Value |
|---|---|
| Employee SS Rate | 5% (0.05) |
| Employer SS Rate | 5% (0.05) |
| Employer EIB Rate | 1% (0.01) |
| Employee SS Max Wage (Monthly) | $6,500.00 |
| Employer SS Max Wage (Monthly) | $6,500.00 |
| Employer EIB Max Wage (Monthly) | $6,500.00 |
| SS Eligible Age Range | 16–62 |
| Levy Eligible Age Range | 16–62 |

### 1.2 Employer Rates

| Parameter | Value |
|---|---|
| Employer Levy Rate | 3% (0.03) |
| Employer Severance Rate | 1% (0.01) |

### 1.3 NWD Employee Levy Rate

| Parameter | Value |
|---|---|
| NWD Flat Levy Rate | 8% (0.08) |

### 1.4 Employee Levy Slab Tables (Progressive)

**Formula:** `levy = ROUND(base_amt + ((wage_amount − over_amt + 0.01) × tax_rate), 2)`

**Thresholds (below these = $0 levy):**

| Pay Period | Threshold |
|---|---|
| Weekly (W) | ≤ $520.00 |
| Bi-Weekly (E2W) | ≤ $1,040.00 |
| Semi-Monthly (2M) | ≤ $1,126.67 |
| Monthly (M) | ≤ $2,253.33 |

**Weekly (W) Slabs:**

| Slab | Over Amount | Base Amount | Tax Rate |
|---|---|---|---|
| 1 | $520.01 | $18.20 | 3.5% |
| 2 | $6,500.01 | $227.50 | 10% |
| 3 | $8,000.01 | $377.50 | 12% |

**Bi-Weekly (E2W) Slabs:**

| Slab | Over Amount | Base Amount | Tax Rate |
|---|---|---|---|
| 1 | $1,040.01 | $36.40 | 3.5% |
| 2 | $6,500.01 | $227.50 | 10% |
| 3 | $8,000.01 | $377.50 | 12% |

**Semi-Monthly (2M) Slabs:**

| Slab | Over Amount | Base Amount | Tax Rate |
|---|---|---|---|
| 1 | $1,126.68 | $39.434 | 3.5% |
| 2 | $6,500.01 | $227.50 | 10% |
| 3 | $8,000.01 | $377.50 | 12% |

**Monthly (M) Slabs:**

| Slab | Over Amount | Base Amount | Tax Rate |
|---|---|---|---|
| 1 | $2,253.34 | $78.867 | 3.5% |
| 2 | $6,500.01 | $227.50 | 10% |
| 3 | $8,000.01 | $377.50 | 12% |

### 1.5 Levy Slot Aggregation Rules

| Pay Period | Levy Evaluation Method |
|---|---|
| Weekly (W) | Each week evaluated individually against W slabs |
| Bi-Weekly (E2W) | Paired: (W1+W2) and (W3+W4) evaluated against E2W slabs |
| Semi-Monthly (2M) | Paired: (W1+W2) and (W3+W4) evaluated against 2M slabs |
| Monthly (M) | All weeks summed → single evaluation against M slabs |

### 1.6 Bonus Policy (Active Default)

| Parameter | Value |
|---|---|
| Calculation Method | Merge |
| Include in Levy | Yes |
| Include in Severance | No |
| Contrib Employee SS | Yes |
| Contrib Employer SS | Yes |
| Contrib EIB | Yes |
| Calc Slab Enabled | Yes (use slab-based levy) |
| Distribution (Weekly) | W4 only |
| Distribution (Bi-Weekly) | B2 only |
| Distribution (Semi-Monthly) | S2 only |
| Distribution (Monthly) | M1 |

### 1.7 Holiday Pay Policy (Active — Without Dates)

| Parameter | Value |
|---|---|
| Policy Type | without_dates |
| Distribution Enabled | Yes |
| Levy Include | Yes |
| Levy Method | Merge |
| SSC Include | Yes (Employee, Employer, EIB) |
| Include in Severance | Yes |
| Distribution (Weekly) | W4 only |
| Distribution (Bi-Weekly) | B2 only |
| Distribution (Semi-Monthly) | S2 only |
| Distribution (Monthly) | M1 |

### 1.8 Filing & Penalty Configuration

| Parameter | Value |
|---|---|
| Week Start Day | 1 (Monday) |
| Filing Window Unit | 1 (Months) |
| Filing Window Value | 1 month |
| Initial Penalty Threshold | 1 |
| Subsequent Penalty Period | 1 |
| Levy Penalty Initial Rate | 10% |
| Levy Penalty Subsequent Rate | 1% per period |
| Severance Penalty Initial Rate | 10% |
| Severance Penalty Subsequent Rate | 1% per period |
| SS Fine Initial Rate | 5% |
| SS Fine Subsequent Rate | 5% per period |

---

## 2. Standard Employee Test Cases

---

### TC-001: Standard Employee — Monthly — Normal Wages (Slab 1)

**Scenario:** Standard employee, age 35, monthly pay period, wages in Slab 1 range.

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Week 1 | $750.00 |
| Week 2 | $750.00 |
| Week 3 | $750.00 |
| Week 4 | $750.00 |
| Week 5 | $0.00 |
| Bonus | $0.00 |
| Holiday | $0.00 |
| Employee Age | 35 |
| Employee Type | Standard |

**Calculation Steps:**

1. **Total Wages:** 750 + 750 + 750 + 750 = **$3,000.00**
2. **SS Insurable:** min(3000, 6500) = **$3,000.00**
3. **Employee SS:** 3000 × 0.05 = **$150.00**
4. **Employer SS:** 3000 × 0.05 = **$150.00**
5. **Employer EIB:** 3000 × 0.01 = **$30.00**
6. **Employee Levy (Monthly slab):**
   - 3000 > 2253.33 → Slab 1 applies
   - `ROUND(78.867 + ((3000 − 2253.34 + 0.01) × 0.035), 2)`
   - `= ROUND(78.867 + (746.67 × 0.035), 2)`
   - `= ROUND(78.867 + 26.13345, 2)`
   - = **$105.00**
7. **Employer Levy:** 3000 × 0.03 = **$90.00**
8. **Employer Severance:** 3000 × 0.01 = **$30.00**

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $3,000.00 |
| SS Insurable | $3,000.00 |
| Employee SS | $150.00 |
| Employer SS | $150.00 |
| Employer EIB | $30.00 |
| Employer SS Total | $180.00 |
| Employee Levy | $105.00 |
| Employer Levy | $90.00 |
| Employer Severance | $30.00 |
| Total Wages + Empl Levy + SS | $3,255.00 |
| Employer 3% Levy + SS | $270.00 |
| Employer 1% Severance | $30.00 |

---

### TC-002: Standard Employee — Weekly — Wages in Slab 1

**Scenario:** Weekly pay, each week $600, age 28.

| Input Field | Value |
|---|---|
| Pay Period | Weekly (W) |
| Week 1 | $600.00 |
| Week 2 | $600.00 |
| Week 3 | $600.00 |
| Week 4 | $600.00 |
| Week 5 | $0.00 |
| Bonus | $0.00 |
| Holiday | $0.00 |
| Employee Age | 28 |

**Calculation Steps:**

1. **Total Wages:** $2,400.00
2. **SS Insurable:** min(2400, 6500) = **$2,400.00**
3. **Employee SS:** 2400 × 0.05 = **$120.00**
4. **Employer SS:** 2400 × 0.05 = **$120.00**
5. **Employer EIB:** 2400 × 0.01 = **$24.00**
6. **Employee Levy (Weekly slab, per week):**
   - Each week = $600, threshold = $520.00
   - $600 > $520.00 → Slab 1
   - `ROUND(18.20 + ((600 − 520.01 + 0.01) × 0.035), 2)`
   - `= ROUND(18.20 + (80.00 × 0.035), 2)`
   - `= ROUND(18.20 + 2.80, 2) = $21.00` per week
   - **Total Levy:** 4 × 21.00 = **$84.00**
7. **Employer Levy:** 2400 × 0.03 = **$72.00**
8. **Employer Severance:** 2400 × 0.01 = **$24.00**

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $2,400.00 |
| Employee SS | $120.00 |
| Employer SS | $120.00 |
| Employer EIB | $24.00 |
| Employer SS Total | $144.00 |
| Employee Levy | $84.00 |
| Employer Levy | $72.00 |
| Employer Severance | $24.00 |
| Total Wages + Empl Levy + SS | $2,604.00 |
| Employer 3% Levy + SS | $216.00 |
| Employer 1% Severance | $24.00 |

---

### TC-003: Standard Employee — Bi-Weekly — Wages in Slab 1

**Scenario:** Bi-weekly pay, age 40.

| Input Field | Value |
|---|---|
| Pay Period | Bi-Weekly (E2W) |
| Week 1 | $700.00 |
| Week 2 | $700.00 |
| Week 3 | $800.00 |
| Week 4 | $800.00 |
| Week 5 | $0.00 |
| Bonus | $0.00 |
| Holiday | $0.00 |
| Employee Age | 40 |

**Calculation Steps:**

1. **Total Wages:** 700 + 700 + 800 + 800 = **$3,000.00**
2. **SS Insurable:** min(3000, 6500) = **$3,000.00**
3. **Employee SS:** $150.00
4. **Employer SS:** $150.00
5. **Employer EIB:** $30.00
6. **Employee Levy (E2W slab, paired):**
   - Slot A (W1+W2) = 700 + 700 = $1,400.00 → > $1,040.00
     - `ROUND(36.40 + ((1400 − 1040.01 + 0.01) × 0.035), 2)`
     - `= ROUND(36.40 + (360.00 × 0.035), 2)`
     - `= ROUND(36.40 + 12.60, 2) = $49.00`
   - Slot B (W3+W4) = 800 + 800 = $1,600.00 → > $1,040.00
     - `ROUND(36.40 + ((1600 − 1040.01 + 0.01) × 0.035), 2)`
     - `= ROUND(36.40 + (560.00 × 0.035), 2)`
     - `= ROUND(36.40 + 19.60, 2) = $56.00`
   - **Total Levy:** 49.00 + 56.00 = **$105.00**
7. **Employer Levy:** 3000 × 0.03 = **$90.00**
8. **Employer Severance:** 3000 × 0.01 = **$30.00**

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $3,000.00 |
| Employee SS | $150.00 |
| Employer SS Total | $180.00 |
| Employee Levy | $105.00 |
| Employer Levy | $90.00 |
| Employer Severance | $30.00 |
| Total Wages + Empl Levy + SS | $3,255.00 |
| Employer 3% Levy + SS | $270.00 |
| Employer 1% Severance | $30.00 |

---

### TC-004: Standard Employee — Monthly — Wages Exceed SS Cap

**Scenario:** Monthly wages $8,000, exceeding SS max wage of $6,500.

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Week 1 | $2,000.00 |
| Week 2 | $2,000.00 |
| Week 3 | $2,000.00 |
| Week 4 | $2,000.00 |
| Employee Age | 45 |

**Calculation Steps:**

1. **Total Wages:** $8,000.00
2. **SS Insurable:** min(8000, 6500) = **$6,500.00** (capped)
3. **Employee SS:** 6500 × 0.05 = **$325.00**
4. **Employer SS:** 6500 × 0.05 = **$325.00**
5. **Employer EIB:** 6500 × 0.01 = **$65.00**
6. **Employee Levy (Monthly slab):**
   - $8,000 > $6,500.01 → Slab 2
   - `ROUND(227.50 + ((8000 − 6500.01 + 0.01) × 0.10), 2)`
   - `= ROUND(227.50 + (1500.00 × 0.10), 2)`
   - `= ROUND(227.50 + 150.00, 2) = $377.50`
7. **Employer Levy:** 8000 × 0.03 = **$240.00**
8. **Employer Severance:** 8000 × 0.01 = **$80.00**

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $8,000.00 |
| SS Insurable | $6,500.00 |
| Employee SS | $325.00 |
| Employer SS | $325.00 |
| Employer EIB | $65.00 |
| Employer SS Total | $390.00 |
| Employee Levy | $377.50 |
| Employer Levy | $240.00 |
| Employer Severance | $80.00 |
| Total Wages + Empl Levy + SS | $8,702.50 |
| Employer 3% Levy + SS | $630.00 |
| Employer 1% Severance | $80.00 |

---

### TC-005: Standard Employee — Monthly — Wages in Slab 3

**Scenario:** Monthly wages $10,000 (above $8,000.01 → Slab 3).

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Week 1 | $2,500.00 |
| Week 2 | $2,500.00 |
| Week 3 | $2,500.00 |
| Week 4 | $2,500.00 |
| Employee Age | 30 |

**Calculation Steps:**

1. **Total Wages:** $10,000.00
2. **SS Insurable:** min(10000, 6500) = **$6,500.00**
3. **Employee SS:** $325.00
4. **Employer SS:** $325.00
5. **Employer EIB:** $65.00
6. **Employee Levy (Monthly slab):**
   - $10,000 > $8,000.01 → Slab 3
   - `ROUND(377.50 + ((10000 − 8000.01 + 0.01) × 0.12), 2)`
   - `= ROUND(377.50 + (2000.00 × 0.12), 2)`
   - `= ROUND(377.50 + 240.00, 2) = $617.50`
7. **Employer Levy:** 10000 × 0.03 = **$300.00**
8. **Employer Severance:** 10000 × 0.01 = **$100.00**

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $10,000.00 |
| SS Insurable | $6,500.00 |
| Employee SS | $325.00 |
| Employer SS Total | $390.00 |
| Employee Levy | $617.50 |
| Employer Levy | $300.00 |
| Employer Severance | $100.00 |
| Total Wages + Empl Levy + SS | $10,942.50 |
| Employer 3% Levy + SS | $690.00 |
| Employer 1% Severance | $100.00 |

---

### TC-006: Standard Employee — Wages Below Levy Threshold

**Scenario:** Monthly wages $2,000 (below $2,253.33 threshold → $0 levy).

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Week 1 | $500.00 |
| Week 2 | $500.00 |
| Week 3 | $500.00 |
| Week 4 | $500.00 |
| Employee Age | 25 |

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $2,000.00 |
| SS Insurable | $2,000.00 |
| Employee SS | $100.00 |
| Employer SS | $100.00 |
| Employer EIB | $20.00 |
| Employee Levy | **$0.00** |
| Employer Levy | $60.00 |
| Employer Severance | $20.00 |
| Total Wages + Empl Levy + SS | $2,100.00 |
| Employer 3% Levy + SS | $180.00 |
| Employer 1% Severance | $20.00 |

---

### TC-007: Standard Employee — Weekly — Wages Below Threshold

**Scenario:** Weekly $500/week (below $520.00 threshold → $0 levy per week).

| Input Field | Value |
|---|---|
| Pay Period | Weekly (W) |
| Week 1 | $500.00 |
| Week 2 | $500.00 |
| Week 3 | $500.00 |
| Week 4 | $500.00 |
| Employee Age | 22 |

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $2,000.00 |
| Employee SS | $100.00 |
| Employee Levy | **$0.00** |
| Employer Levy | $60.00 |
| Employer Severance | $20.00 |

---

### TC-008: Standard Employee — Zero Wages

**Scenario:** All wages are $0.

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| All Weeks | $0.00 |
| Bonus | $0.00 |
| Holiday | $0.00 |
| Employee Age | 30 |

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $0.00 |
| All contributions | **$0.00** |

---

## 3. Age-Based Exemption Test Cases

---

### TC-009: Employee Under SS Min Age (Age 15)

**Scenario:** Employee age 15 — below SS eligible range (16–62).

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Week 1–4 | $750.00 each |
| Employee Age | 15 |

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $3,000.00 |
| Employee SS | **$0.00** (age exempt) |
| Employer SS | **$0.00** |
| Employer EIB | **$0.00** |
| Employee Levy | $105.00 (levy still applies if age-exempt for levy too — verify config) |
| Employer Levy | $90.00 |
| Employer Severance | $30.00 |
| isAgeExemptSS | **true** |

> **Note:** Verify if levy exemption age range (16–62) applies separately. If age < 16, both SS and Levy may be exempt.

---

### TC-010: Employee Over SS Max Age (Age 63)

**Scenario:** Employee age 63 — above SS eligible range.

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Week 1–4 | $750.00 each |
| Employee Age | 63 |

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $3,000.00 |
| Employee SS | **$0.00** |
| Employer SS | **$0.00** |
| Employer EIB | **$0.00** |
| Employee Levy | Verify — depends on levy age range |
| Employer Levy | $90.00 |
| Employer Severance | $30.00 |

---

### TC-011: Employee at Boundary Age 16

**Scenario:** Employee exactly age 16 — minimum eligible.

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Week 1–4 | $750.00 each |
| Employee Age | 16 |

**Expected Results:**

| Output | Amount |
|---|---|
| Employee SS | **$150.00** (eligible) |
| isAgeExemptSS | **false** |

---

### TC-012: Employee at Boundary Age 62

**Scenario:** Employee exactly age 62 — maximum eligible.

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Week 1–4 | $750.00 each |
| Employee Age | 62 |

**Expected Results:**

| Output | Amount |
|---|---|
| Employee SS | **$150.00** (eligible) |
| isAgeExemptSS | **false** |

---

## 4. Bonus Test Cases

---

### TC-013: Standard Employee — Monthly — With Bonus (Merge Method)

**Scenario:** Monthly wages $3,000 + bonus $500. Bonus merges into W4 per distribution policy.

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Week 1 | $750.00 |
| Week 2 | $750.00 |
| Week 3 | $750.00 |
| Week 4 | $750.00 |
| Bonus | $500.00 |
| Employee Age | 35 |

**Calculation Steps:**

1. **Total Wages:** 3000 + 500 = **$3,500.00**
2. **Bonus merges into M1** (monthly distribution) → Total for levy = $3,500.00
3. **SS Insurable:** min(3500, 6500) = **$3,500.00** (bonus included in SS per policy)
4. **Employee SS:** 3500 × 0.05 = **$175.00**
5. **Employer SS:** $175.00
6. **Employer EIB:** 3500 × 0.01 = **$35.00**
7. **Employee Levy (Monthly slab on $3,500):**
   - `ROUND(78.867 + ((3500 − 2253.34 + 0.01) × 0.035), 2)`
   - `= ROUND(78.867 + (1246.67 × 0.035), 2)`
   - `= ROUND(78.867 + 43.63345, 2) = $122.50`
8. **Employer Levy:** 3500 × 0.03 = **$105.00**
9. **Employer Severance:** 3500 × 0.01 = **$35.00** (bonus excluded from severance per policy `include_in_severance: false`)

> **Critical:** Verify if severance base excludes bonus. Policy says `include_in_severance: false`.

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $3,500.00 |
| Employee SS | $175.00 |
| Employee Levy | $122.50 |
| Employer Levy | $105.00 |
| Employer Severance | $30.00 or $35.00 (verify severance base) |

---

### TC-014: Standard Employee — Weekly — With Bonus (Merge into W4)

**Scenario:** Weekly wages, bonus $1,000 merged into W4.

| Input Field | Value |
|---|---|
| Pay Period | Weekly (W) |
| Week 1 | $600.00 |
| Week 2 | $600.00 |
| Week 3 | $600.00 |
| Week 4 | $600.00 |
| Bonus | $1,000.00 |
| Employee Age | 30 |

**Calculation Steps:**

1. **Total Wages:** 2400 + 1000 = **$3,400.00**
2. **Bonus merges into W4:** W4 = 600 + 1000 = $1,600
3. **Employee Levy per week:**
   - W1, W2, W3: $600 each → `18.20 + (80.00 × 0.035) = $21.00` each
   - W4: $1,600 → **Exceeds W slab but uses W slabs**
     - `ROUND(18.20 + ((1600 − 520.01 + 0.01) × 0.035), 2)`
     - `= ROUND(18.20 + (1080.00 × 0.035), 2)`
     - `= ROUND(18.20 + 37.80, 2) = $56.00`
   - **Total Levy:** 21.00 + 21.00 + 21.00 + 56.00 = **$119.00**
4. **SS Insurable:** min(3400, 6500) = $3,400
5. **Employee SS:** 3400 × 0.05 = $170.00

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $3,400.00 |
| Employee SS | $170.00 |
| Employee Levy | $119.00 |
| Employer Levy | $102.00 |

---

### TC-015: Standard Employee — Bi-Weekly — With Bonus (Merge into B2)

**Scenario:** Bi-weekly wages, bonus $500 merged into Slot B (W3+W4).

| Input Field | Value |
|---|---|
| Pay Period | Bi-Weekly (E2W) |
| Week 1 | $600.00 |
| Week 2 | $600.00 |
| Week 3 | $600.00 |
| Week 4 | $600.00 |
| Bonus | $500.00 |
| Employee Age | 35 |

**Calculation Steps:**

1. **Total Wages:** 2400 + 500 = **$2,900.00**
2. **Bonus merges into B2 (W3+W4):**
   - Slot A (W1+W2) = $1,200
   - Slot B (W3+W4+Bonus) = 600 + 600 + 500 = $1,700
3. **Employee Levy (E2W slabs):**
   - Slot A ($1,200): `ROUND(36.40 + ((1200 − 1040.01 + 0.01) × 0.035), 2) = ROUND(36.40 + 5.60, 2) = $42.00`
   - Slot B ($1,700): `ROUND(36.40 + ((1700 − 1040.01 + 0.01) × 0.035), 2) = ROUND(36.40 + 23.10, 2) = $59.50`
   - **Total Levy:** 42.00 + 59.50 = **$101.50**

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $2,900.00 |
| Employee Levy | $101.50 |

---

## 5. Holiday Pay Test Cases

---

### TC-016: Standard Employee — Monthly — Holiday Pay (Without Dates)

**Scenario:** Holiday without dates → merges into M1 per distribution policy.

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Week 1 | $750.00 |
| Week 2 | $750.00 |
| Week 3 | $750.00 |
| Week 4 | $750.00 |
| Holiday | $600.00 |
| Holiday No Dates | true |
| Employee Age | 35 |

**Calculation Steps:**

1. **Total Wages:** 3000 + 600 = **$3,600.00**
2. **Holiday merges into M1** → Total for levy = $3,600
3. **SS Insurable:** min(3600, 6500) = **$3,600.00** (holiday included per SSC policy)
4. **Employee SS:** 3600 × 0.05 = **$180.00**
5. **Employee Levy (Monthly slab):**
   - `ROUND(78.867 + ((3600 − 2253.34 + 0.01) × 0.035), 2)`
   - `= ROUND(78.867 + (1346.67 × 0.035), 2)`
   - `= ROUND(78.867 + 47.13345, 2) = $126.00`
6. **Employer Levy:** 3600 × 0.03 = **$108.00**
7. **Employer Severance:** 3600 × 0.01 = **$36.00** (holiday included in severance per policy)

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $3,600.00 |
| Employee SS | $180.00 |
| Employee Levy | $126.00 |
| Employer Levy | $108.00 |
| Employer Severance | $36.00 |

---

### TC-017: Standard Employee — Weekly — Holiday Pay (Merge into W4)

**Scenario:** Weekly pay, holiday $400 without dates → merges into W4.

| Input Field | Value |
|---|---|
| Pay Period | Weekly (W) |
| Week 1 | $600.00 |
| Week 2 | $600.00 |
| Week 3 | $600.00 |
| Week 4 | $600.00 |
| Holiday | $400.00 |
| Holiday No Dates | true |
| Employee Age | 35 |

**Calculation Steps:**

1. **Total Wages:** 2400 + 400 = **$2,800.00**
2. **W4 with holiday:** 600 + 400 = $1,000
3. **Employee Levy per week:**
   - W1, W2, W3: $600 → $21.00 each
   - W4: $1,000 → `ROUND(18.20 + ((1000 − 520.01 + 0.01) × 0.035), 2) = ROUND(18.20 + 16.80, 2) = $35.00`
   - **Total Levy:** 63.00 + 35.00 = **$98.00**

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $2,800.00 |
| Employee Levy | $98.00 |

---

## 6. Director Test Cases

---

### TC-018: Working Director — Monthly

**Scenario:** Working Director follows exact same logic as Standard Employee.

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Week 1–4 | $1,000.00 each |
| Employee Type | Working Director |
| Employee Age | 50 |

**Expected Results:** Same as a standard employee with $4,000 wages.

| Output | Amount |
|---|---|
| Period Gross | $4,000.00 |
| SS Insurable | $4,000.00 |
| Employee SS | $200.00 |
| Employer SS | $200.00 |
| Employer EIB | $40.00 |
| Employee Levy | `ROUND(78.867 + ((4000 − 2253.34 + 0.01) × 0.035), 2) = ROUND(78.867 + 61.13345, 2) = $140.00` |
| Employer Levy | $120.00 |
| Employer Severance | $40.00 |

---

### TC-019: Non-Working Director (NWD) — Monthly

**Scenario:** NWD only pays Employee Levy at flat 8% rate. All SS, EIB, Employer Levy, and Severance are zeroed.

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Week 1–4 | $1,000.00 each |
| Employee Type | Non-Working Director |
| Employee Age | 50 |

**Calculation Steps:**

1. **Total Wages:** $4,000.00
2. **Employee SS:** **$0.00** (NWD exempt)
3. **Employer SS:** **$0.00**
4. **Employer EIB:** **$0.00**
5. **Employee Levy (NWD flat):** 4000 × 0.08 = **$320.00**
6. **Employer Levy:** **$0.00** (NWD exempt)
7. **Employer Severance:** **$0.00** (NWD exempt)

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $4,000.00 |
| Employee SS | $0.00 |
| Employer SS | $0.00 |
| Employer EIB | $0.00 |
| Employer SS Total | $0.00 |
| Employee Levy | $320.00 |
| Employer Levy | $0.00 |
| Employer Severance | $0.00 |
| Total Wages + Empl Levy + SS | $4,320.00 |
| Employer 3% Levy + SS | $0.00 |
| Employer 1% Severance | $0.00 |

---

### TC-020: Non-Working Director (NWD) — High Wages

**Scenario:** NWD with $10,000 wages.

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Total Wages | $10,000.00 |
| Employee Type | Non-Working Director |

**Expected Results:**

| Output | Amount |
|---|---|
| Employee Levy | 10000 × 0.08 = **$800.00** |
| All other contributions | **$0.00** |

---

## 7. Combined Bonus + Holiday Test Cases

---

### TC-021: Standard Employee — Monthly — Bonus + Holiday

**Scenario:** Wages + bonus + holiday all in one submission.

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Week 1–4 | $750.00 each |
| Bonus | $500.00 |
| Holiday | $400.00 |
| Holiday No Dates | true |
| Employee Age | 35 |

**Calculation Steps:**

1. **Total Wages:** 3000 + 500 + 400 = **$3,900.00**
2. **Bonus and Holiday both merge into M1** → $3,900.00 total
3. **SS Insurable:** min(3900, 6500) = $3,900
4. **Employee SS:** 3900 × 0.05 = **$195.00**
5. **Employee Levy (Monthly slab):**
   - `ROUND(78.867 + ((3900 − 2253.34 + 0.01) × 0.035), 2)`
   - `= ROUND(78.867 + (1646.67 × 0.035), 2)`
   - `= ROUND(78.867 + 57.63345, 2) = $136.50`
6. **Employer Levy:** 3900 × 0.03 = **$117.00**
7. **Employer Severance Base:** 3000 + 400 = $3,400 (bonus excluded from severance)
   - Severance: 3400 × 0.01 = **$34.00**

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $3,900.00 |
| Employee SS | $195.00 |
| Employee Levy | $136.50 |
| Employer Levy | $117.00 |
| Employer Severance | $34.00 (verify bonus exclusion) |

---

## 8. Semi-Monthly Test Cases

---

### TC-022: Standard Employee — Semi-Monthly — Slab 1

**Scenario:** Semi-monthly pay period.

| Input Field | Value |
|---|---|
| Pay Period | Semi-Monthly (2M) |
| Week 1 | $600.00 |
| Week 2 | $700.00 |
| Week 3 | $600.00 |
| Week 4 | $700.00 |
| Employee Age | 35 |

**Calculation Steps:**

1. **Total Wages:** $2,600.00
2. **Levy (2M slabs, paired):**
   - Slot 1 (W1+W2) = $1,300 → `ROUND(39.434 + ((1300 − 1126.68 + 0.01) × 0.035), 2) = ROUND(39.434 + 6.07, 2) = $45.50`
   - Slot 2 (W3+W4) = $1,300 → same = **$45.50**
   - **Total Levy:** $91.00
3. **Employee SS:** 2600 × 0.05 = $130.00

**Expected Results:**

| Output | Amount |
|---|---|
| Period Gross | $2,600.00 |
| Employee SS | $130.00 |
| Employee Levy | $91.00 |

---

## 9. Late Filing / Penalty Test Cases

---

### TC-023: On-Time Filing — No Penalties

**Scenario:** C3 for January 2026, received on February 15, 2026.

| Input Field | Value |
|---|---|
| C3 Period | January 2026 |
| Received Date | 2026-02-15 |
| Filing Window | 1 month |

**Expected:** Filing deadline = end of February 2026 (2026-02-28). Received = Feb 15 < Feb 28.

| Output | Value |
|---|---|
| Days Late | 0 |
| Levy Penalty | $0.00 |
| Severance Penalty | $0.00 |
| SS Fine | $0.00 |

---

### TC-024: Late Filing — 1 Month Late (Initial Penalty)

**Scenario:** C3 for January 2026, received March 15, 2026 (after Feb 28 deadline).

| Input Field | Value |
|---|---|
| C3 Period | January 2026 |
| Received Date | 2026-03-15 |
| Wages | $3,000 (standard employee) |

**Calculation Steps (using TC-001 base contributions):**

1. **Deadline:** 2026-02-28
2. **Days Late:** 15 (March 15 − Feb 28)
3. **Months Late:** 1
4. **Initial penalty applies** (within initial_penalty_threshold = 1)
5. **Levy Penalty:** Employer Levy ($90.00) × 10% = **$9.00**
6. **Severance Penalty:** Employer Severance ($30.00) × 10% = **$3.00**
7. **SS Fine:** Employer SS Total ($180.00) × 5% = **$9.00**
8. **Total Late Charges:** 9.00 + 3.00 + 9.00 = **$21.00**

**Expected Results:**

| Output | Amount |
|---|---|
| Months Late | 1 |
| Levy Penalty | $9.00 |
| Severance Penalty | $3.00 |
| SS Fine | $9.00 |
| Total Late Charges | $21.00 |

---

### TC-025: Late Filing — 3 Months Late (Initial + Subsequent)

**Scenario:** C3 for January 2026, received May 10, 2026.

| Input Field | Value |
|---|---|
| C3 Period | January 2026 |
| Received Date | 2026-05-10 |
| Wages | $3,000 |

**Calculation Steps:**

1. **Deadline:** 2026-02-28
2. **Months Late:** 3 (March, April → initial consumed; May → subsequent starts)
3. **Initial Periods:** 1 (initial_penalty_threshold = 1)
4. **Subsequent Periods:** 2
5. **Levy Penalty:**
   - Initial: $90.00 × 10% = $9.00
   - Subsequent: $90.00 × 1% × 2 = $1.80
   - **Total:** $10.80
6. **Severance Penalty:**
   - Initial: $30.00 × 10% = $3.00
   - Subsequent: $30.00 × 1% × 2 = $0.60
   - **Total:** $3.60
7. **SS Fine:**
   - Initial: $180.00 × 5% = $9.00
   - Subsequent: $180.00 × 5% × 2 = $18.00
   - **Total:** $27.00
8. **Total Late Charges:** 10.80 + 3.60 + 27.00 = **$41.40**

**Expected Results:**

| Output | Amount |
|---|---|
| Months Late | 3 |
| Levy Penalty | $10.80 |
| Severance Penalty | $3.60 |
| SS Fine | $27.00 |
| Total Late Charges | $41.40 |

---

### TC-026: NWD — Late Filing Penalty

**Scenario:** NWD with $4,000 wages, 2 months late.

**NWD Penalty Formula:** `Penalty = Employee Levy × (Levy Rate + Late Months / 100)`

| Input Field | Value |
|---|---|
| Employee Levy | $320.00 (from TC-019) |
| NWD Levy Rate | 0.08 |
| Months Late | 2 |

**Calculation:**
- Penalty = 320.00 × (0.08 + 2/100) = 320.00 × 0.10 = **$32.00**

---

## 10. Edge Cases

---

### TC-027: Week 5 Present

**Scenario:** Monthly period with wages in Week 5.

| Input Field | Value |
|---|---|
| Pay Period | Monthly (M) |
| Week 1–4 | $600.00 each |
| Week 5 | $300.00 |
| Employee Age | 35 |

**Expected:**

| Output | Amount |
|---|---|
| Period Gross | $2,700.00 |
| Employee SS | $135.00 |
| Employee Levy | `ROUND(78.867 + ((2700 − 2253.34 + 0.01) × 0.035), 2) = ROUND(78.867 + 15.63345, 2) = $94.50` |

---

### TC-028: Exact Threshold Amount — Levy Boundary

**Scenario:** Monthly wages exactly $2,253.33 (at threshold, no levy).

| Input | Value |
|---|---|
| Total Wages | $2,253.33 |

**Expected:** Employee Levy = **$0.00** (not above threshold)

---

### TC-029: One Cent Above Threshold

**Scenario:** Monthly wages $2,253.34 (one cent above threshold → minimum levy).

| Input | Value |
|---|---|
| Total Wages | $2,253.34 |

**Calculation:**
- `ROUND(78.867 + ((2253.34 − 2253.34 + 0.01) × 0.035), 2)`
- `= ROUND(78.867 + (0.01 × 0.035), 2)`
- `= ROUND(78.867 + 0.00035, 2) = $78.87`

**Expected:** Employee Levy = **$78.87**

---

### TC-030: Maximum Realistic Wages — All Caps Hit

**Scenario:** Monthly $20,000.

| Input | Value |
|---|---|
| Total Wages | $20,000.00 |

**Expected:**

| Output | Amount |
|---|---|
| SS Insurable | $6,500.00 (capped) |
| Employee SS | $325.00 |
| Employee Levy | `ROUND(377.50 + ((20000 − 8000.01 + 0.01) × 0.12), 2) = ROUND(377.50 + 1440.00, 2) = $1,817.50` |
| Employer Levy | $600.00 |
| Employer Severance | $200.00 |

---

## 11. Validation Checklist

For each test case, the C3 Wizard team must verify:

| # | Check | Status |
|---|---|---|
| 1 | Period Gross matches | ☐ |
| 2 | SS Insurable correctly capped | ☐ |
| 3 | Employee SS amount exact | ☐ |
| 4 | Employer SS amount exact | ☐ |
| 5 | Employer EIB amount exact | ☐ |
| 6 | Employee Levy uses correct slab | ☐ |
| 7 | Employee Levy amount exact | ☐ |
| 8 | Employer Levy (3%) exact | ☐ |
| 9 | Employer Severance (1%) exact | ☐ |
| 10 | Bonus distribution slot correct | ☐ |
| 11 | Holiday distribution slot correct | ☐ |
| 12 | NWD flat levy rate applied | ☐ |
| 13 | NWD other contributions zeroed | ☐ |
| 14 | Age exemption correctly applied | ☐ |
| 15 | Penalty/fine amounts exact | ☐ |
| 16 | All values from config (not hardcoded) | ☐ |

---

## 12. Test Execution Protocol

1. **Environment:** Run all tests against the same configuration period (2025-01-01 onwards)
2. **Method:** Call `calculate_c3_contributions_with_other_payments` RPC with each test case's inputs
3. **Comparison:** Compare output JSON fields against expected values in this document
4. **Tolerance:** All monetary values must match to **2 decimal places** with zero tolerance
5. **Reporting:** Any discrepancy must be documented with: Test Case ID, Expected Value, Actual Value, Field Name

---

*End of Test Case Document*
