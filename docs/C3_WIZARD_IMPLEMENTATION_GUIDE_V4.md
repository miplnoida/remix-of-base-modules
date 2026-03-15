# C3 Wizard — Comprehensive Implementation & Synchronization Guide

**Version:** 4.0  
**Date:** 2026-03-15  
**Author:** SSB Admin — Senior Architecture Team  
**Audience:** C3 Wizard (Employer Portal) Development Team  
**Purpose:** Complete guide to restore full consistency between SSB Admin and C3 Wizard systems  
**Supersedes:** C3_CALCULATION_GUIDE.md (v1.0), C3_CALCULATION_GUIDE_V2.md (v2.0), c3-wizard-sync-guide.md (v3.0), C3_WIZARD_NWD_LEVY_RATE_GUIDE.md

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Complete Table Inventory — What Must Exist on C3 Wizard](#3-complete-table-inventory)
4. [Database Migration Scripts](#4-database-migration-scripts)
5. [Configuration Sync Protocol (v4.0)](#5-configuration-sync-protocol-v40)
6. [Calculation Logic — Complete Reference](#6-calculation-logic--complete-reference)
7. [Employee Classification & Contribution Rules](#7-employee-classification--contribution-rules)
8. [Filing Deadline & Late Payment System](#8-filing-deadline--late-payment-system)
9. [Penalty & Fine Calculations](#9-penalty--fine-calculations)
10. [Bonus Policy System](#10-bonus-policy-system)
11. [Holiday Pay Policy System](#11-holiday-pay-policy-system)
12. [Other Payments / Income Code Policy System](#12-other-payments--income-code-policy-system)
13. [Non-Working Director (NWD) Calculations](#13-non-working-director-nwd-calculations)
14. [Self-Employed & Voluntary Contributor](#14-self-employed--voluntary-contributor)
15. [Sync Payload Format (v4.0)](#15-sync-payload-format-v40)
16. [Sync API Contract](#16-sync-api-contract)
17. [Discrepancy Register & Migration Checklist](#17-discrepancy-register--migration-checklist)
18. [Test Cases](#18-test-cases)
19. [Glossary & Field Mappings](#19-glossary--field-mappings)

---

## 1. Executive Summary

The SSB Admin system is the **single source of truth** for all C3 calculation configuration. The C3 Wizard (Employer Portal) consumes published configuration and must produce **identical calculation results**.

Since the original guide (v1.0), the SSB Admin system has undergone significant evolution:

| Change Category | Count | Impact |
|---|---|---|
| 🔴 Breaking Changes (P0) | 5 | Filing deadline, penalty thresholds, levy pairing, Other Payments, penalty recalculation |
| 🟡 High Priority (P1) | 4 | Configurable week start, NWD levy rate, SS fine fallback, EIB cap source |
| 🟢 Medium Priority (P2) | 3 | Holiday table naming, distribution suppression, pending holiday pay |
| 🆕 New Tables | 4 | `c3_calculation_config`, `c3_income_code_policy_default`, `c3_income_code_policy_exceptions`, `tb_income_codes` |
| 🆕 New Fields | 1 | `nwd_employee_levy_rate` on `c3_config_details` |

**This guide is the single document the C3 Wizard team needs to achieve full synchronization.**

---

## 2. Architecture Overview

### 2.1 System Context Diagram

```
┌──────────────────────────────────┐              ┌──────────────────────────────────────┐
│         SSB ADMIN SYSTEM         │              │         C3 WIZARD SYSTEM              │
│    (Source of Truth)             │              │    (Employer Portal / Consumer)        │
│                                  │              │                                      │
│  ┌─ Configuration Tables ───┐   │   PUBLISH    │  ┌─ Mirror Tables (wiz_*) ────────┐  │
│  │ c3_config_periods        │   │   ──────>    │  │ wiz_c3_config_periods          │  │
│  │ c3_config_details        │   │   POST /sync │  │ wiz_c3_config_details          │  │
│  │ c3_calculation_config    │   │              │  │ wiz_c3_calculation_config  NEW  │  │
│  │ tb_levy_slabs            │   │              │  │ wiz_levy_slabs                 │  │
│  │ tb_levy_slab_details     │   │              │  │ wiz_levy_slab_details          │  │
│  │ c3_bonus_policy_default  │   │              │  │ wiz_bonus_policy_default       │  │
│  │ c3_bonus_policy_exceptions│  │              │  │ wiz_bonus_policy_exceptions    │  │
│  │ c3_holiday_pay_policy_   │   │              │  │ wiz_holiday_pay_policy_        │  │
│  │   defaults (plural)      │   │              │  │   default                      │  │
│  │ c3_holiday_pay_policy_   │   │              │  │ wiz_holiday_pay_policy_        │  │
│  │   exceptions             │   │              │  │   exceptions                   │  │
│  │ c3_income_code_policy_   │   │              │  │ wiz_income_code_policy_    NEW │  │
│  │   default            NEW │   │              │  │   default                      │  │
│  │ c3_income_code_policy_   │   │              │  │ wiz_income_code_policy_    NEW │  │
│  │   exceptions         NEW │   │              │  │   exceptions                   │  │
│  │ tb_income_codes      NEW │   │              │  │ wiz_income_codes           NEW │  │
│  └──────────────────────────┘   │              │  └────────────────────────────────┘  │
│                                  │              │                                      │
│  ┌─ Calculation Engine ─────┐   │              │  ┌─ Calculation Engine ───────────┐  │
│  │ calculate_c3_contributions│  │              │  │ calculate-c3-contributions     │  │
│  │ _with_other_payments     │   │              │  │ (Edge Function / local logic)  │  │
│  └──────────────────────────┘   │              │  └────────────────────────────────┘  │
└──────────────────────────────────┘              └──────────────────────────────────────┘
```

### 2.2 Key Principles

1. **SSB Admin = Source of Truth** — All configuration is authored and managed here
2. **Identical Schemas** — `wiz_*` mirror tables have identical columns (plus `admin_sync_id`, `synced_at`, `sync_version`)
3. **Idempotent Sync** — SHA-256 payload hash deduplication; re-publishing is safe
4. **Local Calculations** — C3 Wizard performs all calculations locally using synced `wiz_*` tables
5. **No Fallback** — If no `wiz_*` config exists, calculation must error (not use defaults)

---

## 3. Complete Table Inventory

### 3.1 Configuration Tables (Synced from Admin)

| # | Admin Table | Wizard Mirror Table | Status | Sync Required |
|---|---|---|---|---|
| 1 | `c3_config_periods` | `wiz_c3_config_periods` | ✅ Existing | Yes |
| 2 | `c3_config_details` | `wiz_c3_config_details` | ✅ Existing (updated) | Yes |
| 3 | `c3_calculation_config` | `wiz_c3_calculation_config` | 🆕 **NEW** | Yes — Critical |
| 4 | `tb_levy_slabs` | `wiz_levy_slabs` | ✅ Existing | Yes |
| 5 | `tb_levy_slab_details` | `wiz_levy_slab_details` | ✅ Existing | Yes |
| 6 | `c3_bonus_policy_default` | `wiz_bonus_policy_default` | ✅ Existing (v3.0) | Yes |
| 7 | `c3_bonus_policy_exceptions` | `wiz_bonus_policy_exceptions` | ✅ Existing (v3.0) | Yes |
| 8 | `c3_holiday_pay_policy_defaults` | `wiz_holiday_pay_policy_default` | ✅ Existing (v3.0) | Yes |
| 9 | `c3_holiday_pay_policy_exceptions` | `wiz_holiday_pay_policy_exceptions` | ✅ Existing (v3.0) | Yes |
| 10 | `c3_income_code_policy_default` | `wiz_income_code_policy_default` | 🆕 **NEW** | Yes |
| 11 | `c3_income_code_policy_exceptions` | `wiz_income_code_policy_exceptions` | 🆕 **NEW** | Yes |
| 12 | `tb_income_codes` | `wiz_income_codes` | 🆕 **NEW** | Yes |

### 3.2 Deprecated Tables (Remove References)

| Table | Replaced By |
|---|---|
| `wiz_bonus_levy_exemptions` | `wiz_bonus_policy_default` + `wiz_bonus_policy_exceptions` |
| `c3_system_rates` (if existed) | `wiz_c3_config_details` |
| `c3_levy_tiers` (if existed) | `wiz_levy_slab_details` |

### 3.3 Tables NOT Synced (Admin-Only)

| Table | Reason |
|---|---|
| `c3_pending_holiday_pay` | Admin handles holiday distribution; Wizard receives final amounts |
| `c3_config_sync_log` | Admin's own publish log |
| `c3_calculation_config_audit` | Admin audit trail |

---

## 4. Database Migration Scripts

### 4.1 Add `nwd_employee_levy_rate` to Config Details

```sql
-- If column doesn't exist yet
ALTER TABLE public.wiz_c3_config_details
  ADD COLUMN IF NOT EXISTS nwd_employee_levy_rate NUMERIC DEFAULT 0.08;
```

### 4.2 Create `wiz_c3_calculation_config` — **NEW TABLE** (Critical)

```sql
CREATE TABLE public.wiz_c3_calculation_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_sync_id     UUID NOT NULL UNIQUE,
  config_key        VARCHAR(100) NOT NULL,
  config_value      NUMERIC NOT NULL,
  config_type       VARCHAR(20) NOT NULL DEFAULT 'amount',
  category          VARCHAR(50) NOT NULL DEFAULT 'filing',
  display_name      TEXT,
  description       TEXT,
  display_order     INTEGER DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  effective_from    DATE,
  effective_to      DATE,
  synced_at         TIMESTAMPTZ DEFAULT now(),
  sync_version      TEXT
);

CREATE UNIQUE INDEX idx_wiz_calc_config_key ON public.wiz_c3_calculation_config(config_key);
CREATE INDEX idx_wiz_calc_config_sync ON public.wiz_c3_calculation_config(admin_sync_id);
CREATE INDEX idx_wiz_calc_config_category ON public.wiz_c3_calculation_config(category, is_active);
```

**Expected Records After First Sync:**

| config_key | config_value | Description |
|---|---|---|
| `week_start_day` | 1 | 1=Monday, 2=Tuesday, ..., 7=Sunday |
| `filing_window_unit` | 1 | 1=Months, 2=Days |
| `filing_window_value` | 1 | Number of months/days after period end |
| `penalty_initial_threshold` | 1 | Number of delay periods at initial rate |
| `penalty_subsequent_threshold` | 1 | Subsequent period length |

### 4.3 Create `wiz_income_codes` — **NEW TABLE**

```sql
CREATE TABLE public.wiz_income_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_sync_id     UUID NOT NULL UNIQUE,
  code              VARCHAR(10) NOT NULL,
  description       TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  sort_order        INTEGER DEFAULT 0,
  synced_at         TIMESTAMPTZ DEFAULT now(),
  sync_version      TEXT
);

CREATE UNIQUE INDEX idx_wiz_income_codes_code ON public.wiz_income_codes(code);
CREATE INDEX idx_wiz_income_codes_sync ON public.wiz_income_codes(admin_sync_id);
```

### 4.4 Create `wiz_income_code_policy_default` — **NEW TABLE**

```sql
CREATE TABLE public.wiz_income_code_policy_default (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_sync_id         UUID NOT NULL UNIQUE,
  income_code_id        UUID NOT NULL,
  date_entry_mode       TEXT NOT NULL DEFAULT 'no_dates',  -- 'mandatory', 'optional', 'no_dates'
  
  -- Levy Rules
  levy_include          BOOLEAN NOT NULL DEFAULT false,
  
  -- SSC Rules
  ssc_contrib_employee  BOOLEAN NOT NULL DEFAULT false,
  ssc_contrib_employer  BOOLEAN NOT NULL DEFAULT false,
  contrib_eib           BOOLEAN NOT NULL DEFAULT false,
  
  -- Severance
  include_in_severance  BOOLEAN NOT NULL DEFAULT false,
  
  -- Validity
  date_from             DATE NOT NULL DEFAULT CURRENT_DATE,
  date_to               DATE,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit
  created_by            TEXT,
  created_on            TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by           TEXT,
  modified_on           TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at             TIMESTAMPTZ DEFAULT now(),
  sync_version          TEXT
);

CREATE INDEX idx_wiz_ic_policy_sync ON public.wiz_income_code_policy_default(admin_sync_id);
CREATE INDEX idx_wiz_ic_policy_active ON public.wiz_income_code_policy_default(is_active);
CREATE INDEX idx_wiz_ic_policy_income ON public.wiz_income_code_policy_default(income_code_id);
```

### 4.5 Create `wiz_income_code_policy_exceptions` — **NEW TABLE**

```sql
CREATE TABLE public.wiz_income_code_policy_exceptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_sync_id         UUID NOT NULL UNIQUE,
  income_code_id        UUID NOT NULL,
  
  -- Exception Scope
  date_from             DATE NOT NULL,
  date_to               DATE,
  exception_type        TEXT NOT NULL DEFAULT 'onetime',  -- 'onetime' or 'recurring'
  exception_month       INTEGER NOT NULL,
  year_from             INTEGER NOT NULL,
  year_to               INTEGER,
  
  -- Override Flags (NULL = inherit from default)
  override_default      BOOLEAN NOT NULL DEFAULT false,
  date_entry_mode       TEXT,
  levy_include          BOOLEAN,
  ssc_contrib_employee  BOOLEAN,
  ssc_contrib_employer  BOOLEAN,
  contrib_eib           BOOLEAN,
  include_in_severance  BOOLEAN,
  
  -- Metadata
  is_active             BOOLEAN NOT NULL DEFAULT true,
  description           TEXT,
  created_by            TEXT,
  created_on            TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by           TEXT,
  modified_on           TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at             TIMESTAMPTZ DEFAULT now(),
  sync_version          TEXT
);

CREATE INDEX idx_wiz_ic_exc_sync ON public.wiz_income_code_policy_exceptions(admin_sync_id);
CREATE INDEX idx_wiz_ic_exc_active ON public.wiz_income_code_policy_exceptions(is_active);
CREATE INDEX idx_wiz_ic_exc_period ON public.wiz_income_code_policy_exceptions(exception_month, year_from);
```

### 4.6 Update Sync Log

```sql
ALTER TABLE public.wiz_config_sync_log
  ADD COLUMN IF NOT EXISTS calculation_config_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_codes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_code_policies_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_code_exceptions_count INTEGER DEFAULT 0;
```

---

## 5. Configuration Sync Protocol (v4.0)

### 5.1 What Changed from v3.0

| Change | Description |
|---|---|
| **Sync version** | `"4.0"` (protocol version) |
| **New payload arrays** | `calculation_config`, `income_codes`, `income_code_policies`, `income_code_policy_exceptions` |
| **New detail field** | `nwd_employee_levy_rate` in `config_periods[].details` |
| **Backward compatible** | v3.0 payloads still work (missing arrays default to empty) |

### 5.2 UPSERT Processing Order (Updated)

```
1.  UPSERT wiz_c3_config_periods          (admin id → admin_sync_id)
2.  UPSERT wiz_c3_config_details          (re-map config_period_id to wizard period ID)
3.  UPSERT wiz_levy_slabs
4.  UPSERT wiz_levy_slab_details          (re-map slab_id to wizard slab ID)
5.  UPSERT wiz_bonus_policy_default
6.  UPSERT wiz_bonus_policy_exceptions
7.  UPSERT wiz_holiday_pay_policy_default
8.  UPSERT wiz_holiday_pay_policy_exceptions
9.  UPSERT wiz_c3_calculation_config      ← NEW
10. UPSERT wiz_income_codes               ← NEW
11. UPSERT wiz_income_code_policy_default ← NEW
12. UPSERT wiz_income_code_policy_exceptions ← NEW
```

---

## 6. Calculation Logic — Complete Reference

### 6.1 Input Data Structure

#### Main RPC Signature
```
calculate_c3_contributions_with_other_payments(
  p_period_year    INTEGER,     -- e.g., 2026
  p_period_month   INTEGER,     -- 0-indexed (0=January, 11=December)
  p_received_date  DATE,        -- Date C3 was received (determines penalties)
  p_employee_data  JSONB        -- Array of employee objects
)
```

#### Employee Data Object
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
      "income_code_id": "uuid-of-income-code",
      "income_code": "GRT",
      "amount": 1500.00
    }
  ]
}
```

#### Pay Period Code Mapping
| UI Label | Code | Levy Slab Key |
|---|---|---|
| Weekly | W | `W` |
| Bi-Weekly | E2W | `E2W` |
| 2 Monthly (Semi-Monthly) | 2M | `2M` |
| Monthly | M | `M` |

### 6.2 Complete Calculation Pipeline

```
 1. Resolve Config               → get_c3_config_for_period(period_date)
 2. Read Calculation Config       → wiz_c3_calculation_config (week_start_day, filing window, penalty thresholds)
 3. Compute Week Start Dates      → Find all configured-start-day dates in the period month
 4. Resolve Bonus Policy          → Exception first, then default
 5. Compute Filing Deadline       → Using filing_window_unit / filing_window_value
 6. FOR EACH Employee:
    a. Holiday Distribution       → Date-based proportional distribution into weekly slots
    b. Resolve Holiday Policy
    c. Wage Totals                → totalWages, taxableWages
    d. Age Checks                 → SS exempt, Levy exempt
    e. Social Security            → Employee SS, Employer SS (with bonus/holiday adjustments)
    f. EIB Calculation            → Employer EIB (cap: employee_ss_max_wage)
    g. Employee Levy              → Slab-based WITH BI-WEEKLY/SEMI-MONTHLY PAIRING
    h. Employer Levy              → Flat rate on adjusted base
    i. Employer Severance         → Flat rate on adjusted base
 7. Sum Totals across employees
 8. Base Penalty Calculations     → Using configurable threshold system
 9. FOR EACH Employee (Other Payments):
    a. Resolve income code policy
    b. Calculate each OP component
    c. Add to employee totals
10. Recalculate Penalties          → On adjusted totals (base + Other Payments)
```

### 6.3 Step 1: Period & Config Resolution

```javascript
// period_month is 0-indexed (0=January)
const periodDate = `${periodYear}-${String(periodMonth + 1).padStart(2, '0')}-01`;

// Fetch active config for the period date
const config = await getConfigForPeriod(periodDate);
// Returns: min_age_ss, max_age_ss, employee_ss_rate, employee_ss_max_wage, etc.

// NEW: Read calculation config from wiz_c3_calculation_config
const weekStartDay    = calcConfig['week_start_day']    ?? 1;   // 1=Monday
const filingWindowUnit  = calcConfig['filing_window_unit']  ?? 1;   // 1=Months
const filingWindowValue = calcConfig['filing_window_value'] ?? 1;
const penaltyInitialThreshold    = calcConfig['penalty_initial_threshold']    ?? 1;
const penaltySubsequentThreshold = calcConfig['penalty_subsequent_threshold'] ?? 1;
```

#### Week Start Day Conversion
```javascript
// Admin stores: 1=Monday, 2=Tuesday, ..., 7=Sunday
// PostgreSQL DOW: 0=Sunday, 1=Monday, ..., 6=Saturday
// JavaScript getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
const jsDow = weekStartDay === 7 ? 0 : weekStartDay;
```

#### Finding Week Start Dates in Period Month
```javascript
const startDates = [];
let date = new Date(periodYear, periodMonth, 1); // 1st of month (periodMonth is 0-indexed)
while (date.getDay() !== jsDow) {
  date.setDate(date.getDate() + 1);
}
while (date.getMonth() === periodMonth) {
  startDates.push(new Date(date));
  date.setDate(date.getDate() + 7);
}
const mondayCount = startDates.length; // typically 4 or 5
```

### 6.4 Step 2: Wage Totals

```javascript
const totalWages   = week1 + week2 + week3 + week4 + week5 + bonus + holiday;
const taxableWages = totalWages - bonus;
```

### 6.5 Step 3: Social Security (SS)

#### Age Exemption
```javascript
const isAgeExemptSS = (employeeAge < config.min_age_ss) || (employeeAge > config.max_age_ss);
// Default: 16-62
```

#### Employee SS
```javascript
let employeeSSBase = taxableWages;

// Bonus adjustment
if (bonusEligible && bonusPolicy.contrib_employee) {
  employeeSSBase += bonus;
}

// Holiday adjustment
if (holiday > 0 && (!holidayPolicy.ssc_include || !holidayPolicy.ssc_contrib_employee)) {
  employeeSSBase -= holiday;
}

const ssInsurable = Math.min(employeeSSBase, config.employee_ss_max_wage); // Cap: $6,500
const employeeSS = isAgeExemptSS ? 0 : round(ssInsurable * config.employee_ss_rate, 2); // 5%
```

#### Employer SS
```javascript
let employerSSBase = taxableWages;

if (bonusEligible && bonusPolicy.contrib_employer) {
  employerSSBase += bonus;
}
if (holiday > 0 && (!holidayPolicy.ssc_include || !holidayPolicy.ssc_contrib_employer)) {
  employerSSBase -= holiday;
}

const employerSS = isAgeExemptSS ? 0 : round(
  Math.min(employerSSBase, config.employee_ss_max_wage) * config.employer_ss_rate, 2
);
```

**If age exempt:** Employee SS = 0, Employer SS = 0 (but EIB still applies)

### 6.6 Step 4: EIB Calculation

```javascript
let employerEIBBase = taxableWages;

if (bonusEligible && bonusPolicy.contrib_eir) {
  employerEIBBase += bonus;
}
if (holiday > 0 && (!holidayPolicy.ssc_include || !holidayPolicy.ssc_contrib_eib)) {
  employerEIBBase -= holiday;
}

// ⚠️ CRITICAL: EIB uses employee_ss_max_wage as cap, NOT employer_eib_max_wage
const employerEIB = round(
  Math.min(employerEIBBase, config.employee_ss_max_wage) * config.employer_eib_rate, 2
);

// EIB is calculated even when age-exempt from SS
const employerSSTotal = employerSS + employerEIB;
```

> **Note:** Although `employer_eib_max_wage` exists in `c3_config_details`, the SSB Admin RPC uses `employee_ss_max_wage` as the universal cap for Employee SS, Employer SS, AND EIB. The C3 Wizard should use `employee_ss_max_wage` to maintain parity. The `employer_eib_max_wage` field was added to allow future divergence.

### 6.7 Step 5: Employee Levy (Slab-Based) — WITH PAIRING

#### ⚠️ CRITICAL: Bi-Weekly/Semi-Monthly Pairing (New in v2.0+)

For `E2W` (Bi-Weekly) and `2M` (Semi-Monthly) pay periods, weekly wage slots are **paired** before slab evaluation:

```javascript
function evaluateLevyAmounts(amounts, slabId, payPeriodCode) {
  let evalAmounts;
  
  if (payPeriodCode === 'E2W' || payPeriodCode === '2M') {
    // PAIR weeks before slab evaluation
    evalAmounts = [
      (amounts[0] || 0) + (amounts[1] || 0),   // Pair 1: Week 1 + Week 2
      (amounts[2] || 0) + (amounts[3] || 0)    // Pair 2: Week 3 + Week 4
    ];
    // Week 5 standalone (if non-zero)
    if (amounts.length >= 5 && (amounts[4] || 0) > 0) {
      evalAmounts.push(amounts[4]);
    }
    // 6th element (bonus/holiday fallback) standalone
    if (amounts.length >= 6 && (amounts[5] || 0) > 0) {
      evalAmounts.push(amounts[5]);
    }
  } else {
    // Weekly (W) and Monthly (M): evaluate individually
    evalAmounts = [...amounts];
  }
  
  // Evaluate each amount against the slab for the pay period
  let totalLevy = 0;
  for (const amount of evalAmounts) {
    if (amount > 0) {
      const slab = findApplicableSlab(slabId, payPeriodCode, amount);
      if (slab) {
        totalLevy += round(
          slab.base_amt + ((amount - slab.over_amt + 0.01) * slab.tax_rate), 2
        );
      }
    }
  }
  return totalLevy;
}
```

**Why pairing matters:** Without pairing, small individual weekly amounts (e.g., $520 each) may fall below the bi-weekly threshold ($1,040.01) and produce $0 levy. When paired ($1,040), they are correctly evaluated against bi-weekly slabs.

#### Slab Lookup
```javascript
function findApplicableSlab(slabId, payPeriod, amount) {
  // Query wiz_levy_slab_details WHERE slab_id = slabId AND pay_period = payPeriod
  // AND over_amt < amount ORDER BY order_no DESC LIMIT 1
  // Returns: { over_amt, base_amt, tax_rate }
}
```

#### Levy Formula
```
IF wage > over_amt THEN
  levy = base_amt + ((wage - over_amt + 0.01) * tax_rate)
```

#### Levy Paths (based on bonus policy)

**Path A — Merged Bonus** (`bonusEligible AND include_in_levy AND calculation_method = 'merge'`):
1. Build amounts array: `[week1, week2, week3, week4, week5, 0]`
2. Distribute bonus into specific week(s) based on `distribution` config
3. Handle holiday merge into target slot
4. Apply `evaluateLevyAmounts()` with pairing

**Path B — Separate Bonus** (`bonusEligible AND include_in_levy AND calculation_method = 'separate'`):
1. Calculate standard levy on weekly wages using `evaluateLevyAmounts()`
2. Calculate bonus levy separately:
   - If `calc_flat_enabled`: `bonusLevy = round(bonus * (calc_flat_percentage / 100), 2)`
   - If `calc_slab_enabled`: Slab lookup on bonus amount
3. `totalLevy = weeklyLevy + bonusLevy`

**Path C — No Bonus in Levy** (`!include_in_levy`):
Same as Path B without the bonus levy calculation.

**Holiday Levy (Separate):** When `hp_levy_include AND hp_levy_method = 'separate' AND holiday > 0`:
- Flat or slab calculation on holiday amount, added to `employeeLevy`

### 6.8 Step 6: Employer Levy

```javascript
let employerLevyBase = taxableWages;
if (bonusEligible && bonusPolicy.include_in_levy) {
  employerLevyBase += bonus;
}
if (holiday > 0 && !(holidayEligible && holidayPolicy.levy_include)) {
  employerLevyBase -= holiday;
}

const employerLevy = round(employerLevyBase * config.employer_levy_rate, 2); // 3%
```

### 6.9 Step 7: Employer Severance

```javascript
let severanceBase = taxableWages;
if (bonusEligible && (bonusPolicy.include_in_severance || bonusPolicy.contrib_severance)) {
  severanceBase += bonus;
}
if (holiday > 0 && !(holidayEligible && holidayPolicy.include_in_severance)) {
  severanceBase -= holiday;
}

const employerSeverance = round(severanceBase * config.employer_severance_rate, 2); // 1%
```

---

## 7. Employee Classification & Contribution Rules

| Component | Standard Employee | Working Director | Non-Working Director (NWD) |
|---|---|---|---|
| Employee SS | ✅ Calculated | ✅ Same as Standard | ❌ Zero |
| Employer SS | ✅ Calculated | ✅ Same as Standard | ❌ Zero |
| Employer EIB | ✅ Calculated | ✅ Same as Standard | ❌ Zero |
| Employee Levy | ✅ Slab-based | ✅ Same as Standard | ✅ **Flat rate from config** |
| Employer Levy | ✅ Flat rate | ✅ Same as Standard | ❌ Zero |
| Employer Severance | ✅ Flat rate | ✅ Same as Standard | ❌ Zero |

---

## 8. Filing Deadline & Late Payment System

### ⚠️ BREAKING CHANGE from v1.0

The filing deadline is now **independently computed** from the period using configurable parameters from `wiz_c3_calculation_config`. The old `submission_due_day`-based `dueDate` is kept ONLY for legacy display purposes.

### 8.1 Filing Deadline Calculation

```javascript
// Read from wiz_c3_calculation_config
const filingWindowUnit  = calcConfig['filing_window_unit']  ?? 1;  // 1=Months, 2=Days
const filingWindowValue = calcConfig['filing_window_value'] ?? 1;

let filingDeadline;

if (filingWindowUnit === 1) {
  // MONTH-BASED: Last day of (period month + filing window value)
  // periodMonth is 0-indexed
  let targetMonth = periodMonth + 1 + filingWindowValue; // +1 to convert to 1-indexed
  let targetYear = periodYear;
  while (targetMonth > 12) {
    targetMonth -= 12;
    targetYear++;
  }
  filingDeadline = lastDayOfMonth(targetYear, targetMonth);
} else {
  // DAY-BASED: Last day of period month + filing window value days
  const periodLastDay = lastDayOfMonth(periodYear, periodMonth + 1);
  filingDeadline = addDays(periodLastDay, filingWindowValue);
}
```

**Example (Month-based, window=1):**
- Period: February 2026 (periodMonth=1, 0-indexed)
- Target month = 1 + 1 + 1 = 3 (March)
- Filing deadline = March 31, 2026

### 8.2 Late Period Calculation

```javascript
const daysLate = Math.max(0, differenceInDays(receivedDate, filingDeadline));

// Calendar months late (for month-based filing window)
const monthsLateCalendar = Math.max(0,
  (receivedYear * 12 + receivedMonth) - (deadlineYear * 12 + deadlineMonth)
);

// 30-day-period months late (for day-based filing window)
const monthsLate = daysLate > 0 ? Math.ceil(daysLate / 30) : 0;

// Delay periods depend on filing window unit
const delayPeriods = filingWindowUnit === 1 ? monthsLateCalendar : monthsLate;

// Penalty period split
const initialPenaltyPeriods    = Math.min(delayPeriods, penaltyInitialThreshold);
const subsequentPenaltyPeriods = Math.max(0, delayPeriods - penaltyInitialThreshold);
```

### 8.3 Legacy Due Date (Display Only)

```javascript
// Kept for backward-compatible display
let dueDate;
if (config.submission_due_day === 0) {
  dueDate = lastDayOfMonth(periodYear, periodMonth + 2); // +2 because 0-indexed + 1 month ahead
} else {
  dueDate = new Date(periodYear, periodMonth + 2, Math.min(config.submission_due_day, 28));
}
```

---

## 9. Penalty & Fine Calculations

### ⚠️ BREAKING CHANGE from v1.0

The penalty model has changed from a simple formula to a **tiered threshold system**.

### 9.1 Universal Penalty Formula

```
penalty = round(
  base × initial_rate × initial_penalty_periods +
  base × subsequent_rate × subsequent_penalty_periods, 2
)
```

Where:
- `initial_penalty_periods = MIN(delay_periods, penalty_initial_threshold)`
- `subsequent_penalty_periods = MAX(0, delay_periods - penalty_initial_threshold)`

### 9.2 Levy Penalty

```javascript
const levyPenaltyBase = sumEmployeeLevy + sumEmployerLevy;
const levyPenalty = round(
  levyPenaltyBase * config.levy_penalty_initial_rate * initialPenaltyPeriods +
  levyPenaltyBase * config.levy_penalty_subsequent_rate * subsequentPenaltyPeriods, 2
);
```

### 9.3 Severance Penalty

```javascript
const severancePenaltyBase = sumEmployerSeverance;
const severancePenalty = round(
  severancePenaltyBase * config.severance_penalty_initial_rate * initialPenaltyPeriods +
  severancePenaltyBase * config.severance_penalty_subsequent_rate * subsequentPenaltyPeriods, 2
);
```

### 9.4 SS Fine

```javascript
// ⚠️ FALLBACK: If ss_fine_subsequent_rate is NULL, use ss_fine_initial_rate
const ssSubsequentRate = config.ss_fine_subsequent_rate ?? config.ss_fine_initial_rate;

const ssFineBase = sumEmployeeSS + sumEmployerSSTotal; // employerSSTotal = employerSS + employerEIB
const ssFine = round(
  ssFineBase * config.ss_fine_initial_rate * initialPenaltyPeriods +
  ssFineBase * ssSubsequentRate * subsequentPenaltyPeriods, 2
);
```

### 9.5 Total Late Charges

```javascript
const totalLateCharges = levyPenalty + severancePenalty + ssFine;
```

### 9.6 Old v1.0 Formula (DEPRECATED — Do Not Use)

```
// ❌ OUTDATED — was in v1.0
levyPenalty = base * initial_rate + base * subsequent_rate * MAX(months - 1, 0)
```

---

## 10. Bonus Policy System

### 10.1 Policy Resolution Order

```javascript
async function resolveBonusPolicy(filingYear, filingMonth1Indexed) {
  // 1. Check exceptions first
  const exception = await supabase
    .from('wiz_bonus_policy_exceptions')
    .select('*')
    .eq('is_active', true)
    .eq('override_default', true)
    .eq('exception_month', filingMonth1Indexed)
    .lte('year_from', filingYear)
    .or(`year_to.gte.${filingYear},year_to.is.null`)
    .order('date_from', { ascending: false })
    .limit(1)
    .single();
  
  if (exception) {
    const defaultPolicy = await getDefaultBonusPolicy();
    return mergeWithDefaults(defaultPolicy, exception); // NULL fields inherit from default
  }
  
  // 2. Fall back to default
  return await getDefaultBonusPolicy();
}
```

### 10.2 Bonus Eligibility

```javascript
let bonusEligible = bonus > 0;
if (bonusPolicy.min_bonus_amount != null && bonus < bonusPolicy.min_bonus_amount) {
  bonusEligible = false;
}
if (bonusPolicy.max_bonus_amount != null && bonus > bonusPolicy.max_bonus_amount) {
  bonusEligible = false;
}
```

### 10.3 Exception Types

| Type | Behavior |
|---|---|
| `onetime` | Applies ONLY in the specific `year_from` year |
| `recurring` | Applies every year from `year_from` through `year_to` (or indefinitely if null) |

### 10.4 December Exemption Example

December bonuses are exempted via a policy exception with explicit `false` flags:
```json
{
  "exception_type": "recurring",
  "exception_month": 12,
  "year_from": 2026,
  "year_to": null,
  "override_default": true,
  "include_in_levy": false,
  "contrib_employee": false,
  "contrib_employer": false,
  "contrib_eir": false,
  "contrib_severance": false
}
```

---

## 11. Holiday Pay Policy System

### 11.1 Policy Types

| Type | Behavior |
|---|---|
| `with_dates` | Date-based distribution of holiday pay across weeks |
| `without_dates` | Treated as current-period income; specific policy rules apply |

### 11.2 Distribution Logic (with_dates)

When `policy_type = 'with_dates'` AND `distribution_enabled = true`:

1. Holiday pay is split proportionally across weeks based on date overlap
2. Distributed amounts are added to weekly wage slots (week1–week5)
3. **ALL policy rules are SUPPRESSED** — `levy_include`, `ssc_include`, `include_in_severance` are forced to `false`
4. The holiday amount is zeroed out (already folded into weekly wages)

**C3 Wizard does NOT need to perform distribution** — Admin handles it and sends final amounts. The Wizard only needs to handle `without_dates` policies.

### 11.3 Without-Dates Policy Rules

When `policy_type = 'without_dates'`:
- **Levy:** Based on `levy_include`, `levy_calculation_method`, `levy_distribution`
- **SSC:** Based on `ssc_include`, `ssc_contrib_employee`, `ssc_contrib_employer`, `ssc_contrib_eib`
- **Severance:** Based on `include_in_severance`

### 11.4 Admin Table Name Note

The Admin table is `c3_holiday_pay_policy_defaults` (plural). The Wizard mirror is `wiz_holiday_pay_policy_default` (singular). This naming difference is handled by the sync — no action needed.

---

## 12. Other Payments / Income Code Policy System

### ⚠️ ENTIRELY NEW — Not in v1.0 or v3.0

### 12.1 Overview

Each employee can have an `otherPayments` array (e.g., Gratuity/GRT). These are processed AFTER base calculations.

### 12.2 Policy Resolution

```javascript
async function getIncomeCodePolicy(incomeCodeId, filingYear, filingMonth1Indexed) {
  // 1. Check exceptions
  const exception = await supabase
    .from('wiz_income_code_policy_exceptions')
    .select('*')
    .eq('is_active', true)
    .eq('override_default', true)
    .eq('income_code_id', incomeCodeId)
    .eq('exception_month', filingMonth1Indexed)
    .lte('year_from', filingYear)
    .or(`year_to.gte.${filingYear},year_to.is.null`)
    .limit(1)
    .single();
  
  if (exception) {
    const defaultPolicy = await getDefaultIncomeCodePolicy(incomeCodeId);
    return mergeWithDefaults(defaultPolicy, exception);
  }
  
  // 2. Fall back to default
  return await getDefaultIncomeCodePolicy(incomeCodeId);
}
```

### 12.3 Component Calculation

For each Other Payment with `amount > 0`:

```javascript
const policy = await getIncomeCodePolicy(payment.income_code_id, year, month);

const opEmployeeSS      = policy.ssc_contrib_employee  ? round(amount * config.employee_ss_rate, 2) : 0;
const opEmployeeLevy    = policy.levy_include          ? round(amount * config.employer_levy_rate, 2) : 0;
const opEmployerSS      = policy.ssc_contrib_employer  ? round(amount * config.employer_ss_rate, 2) : 0;
const opEmployerEIB     = policy.contrib_eib           ? round(amount * config.employer_eib_rate, 2) : 0;
const opEmployerLevy    = policy.levy_include          ? round(amount * config.employer_levy_rate, 2) : 0;
const opEmployerSeverance = policy.include_in_severance ? round(amount * config.employer_severance_rate, 2) : 0;
```

### 12.4 Aggregation & Penalty Recalculation

After processing all Other Payments:

1. **Sum** all OP components per employee → add to employee totals
2. **Sum** all OP amounts across employees → add to C3-level totals
3. **Recalculate penalties** on adjusted bases:

```javascript
const adjustedLevyBase = (baseSumEmployeeLevy + opSumEmployeeLevy) 
                       + (baseSumEmployerLevy + opSumEmployerLevy);
const adjustedSeveranceBase = baseSumEmployerSeverance + opSumEmployerSeverance;
const adjustedSSBase = (baseSumEmployeeSS + opSumEmployeeSS) 
                     + (baseSumEmployerSS + opSumEmployerSS + opSumEmployerEIB);

// Re-apply same penalty formula with adjusted bases
const adjustedLevyPenalty = round(
  adjustedLevyBase * config.levy_penalty_initial_rate * initialPenaltyPeriods +
  adjustedLevyBase * config.levy_penalty_subsequent_rate * subsequentPenaltyPeriods, 2
);
// ... same for severance and SS fine
```

---

## 13. Non-Working Director (NWD) Calculations

### 13.1 NWD Employee Levy (Flat Rate)

```javascript
// Read from synced config
const nwdLevyRate = config.nwd_employee_levy_rate ?? 0.08; // Default 8%

const nwdEmployeeLevy = round(totalWages * nwdLevyRate, 2);
```

### 13.2 NWD Penalty

```javascript
// Legacy formula: only applies when late months >= 2
if (lateMonths >= 2) {
  const penaltyRate = nwdLevyRate + (lateMonths / 100);
  const nwdPenalty = round(nwdEmployeeLevy * penaltyRate, 2);
}
```

**Example:** NWD with $650 wages, 8% rate, 3 months late:
- Employee Levy = $650 × 0.08 = $52.00
- Penalty Rate = 0.08 + 0.03 = 0.11
- Penalty = $52.00 × 0.11 = $5.72

### 13.3 All Other NWD Components

All set to zero: Employee SS, Employer SS, Employer EIB, Employer Levy, Employer Severance.

---

## 14. Self-Employed & Voluntary Contributor

### 14.1 Key Differences from Employer

| Aspect | Employer | Self-Employed (SE) / Voluntary Contributor (VC) |
|---|---|---|
| `payer_type` | `'ER'` | `'SE'` or `'VC'` |
| Employees | Multiple per C3 | 1 (the person themselves) |
| Weekly wages | Week1-5, Bonus, Holiday | Week1-5 only |
| Pay period | Variable | Monthly (`pay_period = 1`) |
| Rate source | `wiz_c3_config_details` | `tb_self_emp_contrib_rate` |
| All contributions | Calculated per formula | Flat rate lookup from rate table |

### 14.2 SE Rate Lookup

```javascript
// Lookup rate from tb_self_emp_contrib_rate
// WHERE effstart <= periodDate AND effend >= periodDate
// AND wage_cat matches the Weekly-Wage value
const seRate = lookupSEContributionRate(periodDate, weeklyWage);
const seContribution = round(weeklyWage * seRate.rate, 2);
```

---

## 15. Sync Payload Format (v4.0)

```json
{
  "sync_version": "4.0",
  "sync_timestamp": "2026-03-15T12:00:00.000Z",
  
  "config_periods": [
    {
      "id": "<admin UUID>",
      "start_date": "2026-01-01",
      "end_date": null,
      "is_active": true,
      "details": {
        "id": "<admin UUID>",
        "config_period_id": "<parent period id>",
        "min_age_ss": 16,
        "max_age_ss": 62,
        "min_age_levy": 16,
        "max_age_levy": 999,
        "employee_ss_rate": 0.05,
        "employee_ss_max_wage": 6500.00,
        "employer_ss_rate": 0.05,
        "employer_eib_rate": 0.01,
        "employer_eib_max_wage": 6500.00,
        "employer_ss_max_wage": 6500.00,
        "employer_levy_rate": 0.03,
        "employer_severance_rate": 0.01,
        "submission_due_day": 0,
        "nwd_employee_levy_rate": 0.08,
        "levy_penalty_initial_rate": 0.10,
        "levy_penalty_subsequent_rate": 0.01,
        "severance_penalty_initial_rate": 0.10,
        "severance_penalty_subsequent_rate": 0.01,
        "ss_fine_initial_rate": 0.05,
        "ss_fine_subsequent_rate": 0.05,
        "levy_slab_id": "<admin slab UUID or null>",
        "levy_monthly_threshold": 6500,
        "levy_use_monthly_when_exceeded": false
      }
    }
  ],
  
  "levy_slabs": [
    {
      "id": "<admin UUID>",
      "start_date": "2026-01-01",
      "end_date": null,
      "is_active": true,
      "details": [
        {
          "id": "<admin UUID>",
          "slab_id": "<parent slab id>",
          "pay_period": "W",
          "over_amt": 520,
          "base_amt": 0,
          "tax_rate": 0.08,
          "order_no": 1,
          "is_active": true
        }
      ]
    }
  ],
  
  "bonus_policies": [ { "...same as v3.0..." } ],
  "bonus_exceptions": [ { "...same as v3.0..." } ],
  "holiday_policies": [ { "...same as v3.0..." } ],
  "holiday_exceptions": [ { "...same as v3.0..." } ],
  
  "calculation_config": [
    {
      "id": "<admin UUID>",
      "config_key": "week_start_day",
      "config_value": 1,
      "config_type": "days",
      "category": "filing",
      "display_name": "Week Start Day",
      "is_active": true
    },
    {
      "id": "<admin UUID>",
      "config_key": "filing_window_unit",
      "config_value": 1,
      "config_type": "amount",
      "category": "filing",
      "display_name": "Filing Window Unit",
      "is_active": true
    },
    {
      "id": "<admin UUID>",
      "config_key": "filing_window_value",
      "config_value": 1,
      "config_type": "months",
      "category": "filing",
      "display_name": "Filing Window Value",
      "is_active": true
    },
    {
      "id": "<admin UUID>",
      "config_key": "penalty_initial_threshold",
      "config_value": 1,
      "config_type": "amount",
      "category": "filing",
      "display_name": "Initial Penalty Threshold",
      "is_active": true
    },
    {
      "id": "<admin UUID>",
      "config_key": "penalty_subsequent_threshold",
      "config_value": 1,
      "config_type": "amount",
      "category": "filing",
      "display_name": "Subsequent Penalty Threshold",
      "is_active": true
    }
  ],
  
  "income_codes": [
    {
      "id": "<admin UUID>",
      "code": "GRT",
      "description": "Gratuity",
      "is_active": true,
      "sort_order": 1
    }
  ],
  
  "income_code_policies": [
    {
      "id": "<admin UUID>",
      "income_code_id": "<admin income code UUID>",
      "date_entry_mode": "no_dates",
      "levy_include": false,
      "ssc_contrib_employee": false,
      "ssc_contrib_employer": false,
      "contrib_eib": false,
      "include_in_severance": true,
      "date_from": "2026-01-01",
      "date_to": null,
      "is_active": true
    }
  ],
  
  "income_code_policy_exceptions": []
}
```

---

## 16. Sync API Contract

### 16.1 Endpoint

```
POST https://<wizard-project-url>/functions/v1/c3-config-sync
Content-Type: application/json
x-sync-api-key: <shared C3_CONFIG_SYNC_API_KEY>
```

### 16.2 Response Formats

**Success (200):**
```json
{
  "status": "success",
  "sync_version": "4.0",
  "applied": {
    "config_periods": 1,
    "config_details": 1,
    "levy_slabs": 1,
    "levy_slab_details": 8,
    "bonus_policies": 1,
    "bonus_exceptions": 1,
    "holiday_policies": 1,
    "holiday_exceptions": 0,
    "calculation_config": 5,
    "income_codes": 1,
    "income_code_policies": 1,
    "income_code_policy_exceptions": 0
  },
  "log_id": "uuid"
}
```

**Duplicate (200):**
```json
{
  "status": "skipped",
  "message": "Payload already applied (matching hash)",
  "existing_log_id": "uuid"
}
```

**Admin accepts both `"duplicate"` and `"skipped"` as duplicate indicators.**

### 16.3 Error Responses

| HTTP Status | Meaning |
|---|---|
| 401 | Invalid or missing `x-sync-api-key` |
| 400 | Validation failure (missing required fields) |
| 500 | Server error (transaction rolled back) |

### 16.4 Agreed Protocol Details

| Item | Value |
|---|---|
| `sync_version` | Static protocol string (`"4.0"`) |
| `sync_timestamp` | ISO 8601 timestamp of publish event |
| `exception_type` values | `"onetime"` or `"recurring"` (NOT `"month"`) |
| Rate format | Decimal (0.05 = 5%) |
| `calc_flat_percentage` | Stored as whole number (3.5 = 3.5%), divided by 100 before use |
| Interest rate fields | **Omitted** from payload (dropped from Admin schema) |

---

## 17. Discrepancy Register & Migration Checklist

### 17.1 Critical Discrepancies (P0 — Immediate)

| # | Issue | What Changed | Action Required |
|---|---|---|---|
| 1 | Filing Deadline | Now uses `filing_window_unit`/`filing_window_value` instead of `due_date` | Replace deadline calculation; sync `wiz_c3_calculation_config` |
| 2 | Penalty Thresholds | Tiered model with `initial_penalty_periods` / `subsequent_penalty_periods` | Update penalty formula |
| 3 | Bi-Weekly/Semi-Monthly Pairing | `evaluateLevyAmounts()` pairs weeks [wk1+wk2, wk3+wk4] for E2W/2M | Add pairing logic to levy calculation |
| 4 | Other Payments | New income code policy system with per-payment components | Create tables, sync, implement calculation |
| 5 | Penalty Recalculation | Wrapper recalculates penalties on adjusted totals (base + OP) | Add recalculation after Other Payments |

### 17.2 High Priority (P1 — Within 1 Week)

| # | Issue | Action |
|---|---|---|
| 6 | Configurable week start day | Read `week_start_day` from `wiz_c3_calculation_config` |
| 7 | NWD employee levy rate | Read `nwd_employee_levy_rate` from `wiz_c3_config_details`; fallback to 0.08 |
| 8 | SS fine subsequent rate fallback | Add `?? ss_fine_initial_rate` fallback |
| 9 | EIB cap uses `employee_ss_max_wage` | Use `employee_ss_max_wage` as EIB ceiling |

### 17.3 Medium Priority (P2 — Within 2 Weeks)

| # | Issue | Action |
|---|---|---|
| 10 | Holiday table name (plural) | Verify Admin table = `c3_holiday_pay_policy_defaults` |
| 11 | Distribution suppresses policy rules | When distributed, force levy_include/ssc_include/include_in_severance to false |
| 12 | Pending holiday pay | Admin handles this; Wizard receives final amounts — no table needed |

### 17.4 Implementation Checklist

```
Phase 1: Database (Day 1)
  □ Run migration: Add nwd_employee_levy_rate to wiz_c3_config_details
  □ Run migration: Create wiz_c3_calculation_config
  □ Run migration: Create wiz_income_codes
  □ Run migration: Create wiz_income_code_policy_default
  □ Run migration: Create wiz_income_code_policy_exceptions
  □ Run migration: Update wiz_config_sync_log with new count columns

Phase 2: Sync Endpoint (Day 2)
  □ Update c3-config-sync edge function to accept v4.0 payload
  □ Add UPSERT logic for calculation_config
  □ Add UPSERT logic for income_codes
  □ Add UPSERT logic for income_code_policies
  □ Add UPSERT logic for income_code_policy_exceptions
  □ Include nwd_employee_levy_rate in config_details UPSERT

Phase 3: Calculation Engine (Days 3-5)
  □ Replace filing deadline calculation (Section 8)
  □ Replace penalty formula with tiered threshold (Section 9)
  □ Add evaluateLevyAmounts() with bi-weekly/semi-monthly pairing (Section 6.7)
  □ Add Other Payments processing loop (Section 12)
  □ Add penalty recalculation on adjusted totals (Section 12.4)
  □ Read week_start_day from wiz_c3_calculation_config
  □ Read nwd_employee_levy_rate from wiz_c3_config_details
  □ Add ss_fine_subsequent_rate fallback
  □ Use employee_ss_max_wage for EIB cap

Phase 4: Testing (Days 6-7)
  □ Test filing deadline with month-based window
  □ Test filing deadline with day-based window
  □ Test penalty thresholds with various late periods
  □ Test bi-weekly levy pairing
  □ Test Other Payments (Gratuity with severance-only policy)
  □ Test penalty recalculation with Other Payments
  □ Test NWD with configurable levy rate
  □ Test December bonus exemption via exception
  □ Request Admin to publish v4.0 payload
```

---

## 18. Test Cases

### TC-1: Standard Monthly Employee (No Late)

**Input:** Week1-4 = $1,200 each, Bonus = $500, Holiday = $0, PayPeriod = Monthly, Age = 40, Received = on time

**Expected:**
```
totalWages    = 4800 + 500 = 5300
taxableWages  = 5300 - 500 = 4800
employeeSS    = round(min(4800+500, 6500) * 0.05, 2) = round(5300 * 0.05) = 265.00
                (if contrib_employee = true)
employerSS    = round(min(5300, 6500) * 0.05, 2) = 265.00
employerEIB   = round(min(5300, 6500) * 0.01, 2) = 53.00
employerLevy  = round(5300 * 0.03, 2) = 159.00
severance     = round(5300 * 0.01, 2) = 53.00
```

### TC-2: Bi-Weekly Employee (Levy Pairing)

**Input:** Week1 = $600, Week2 = $600, Week3 = $600, Week4 = $600, PayPeriod = E2W

**Without Pairing (OLD — WRONG):** Each $600 evaluated individually against E2W slab
**With Pairing (NEW — CORRECT):** $1,200 (wk1+wk2) and $1,200 (wk3+wk4) evaluated against E2W slab

### TC-3: Other Payments (Gratuity)

**Input:** Base wages = $4,800 monthly, Gratuity = $2,000, Policy: `include_in_severance=true`, all others `false`

**Expected OP components:**
```
op_employee_ss      = 0 (ssc_contrib_employee = false)
op_employee_levy    = 0 (levy_include = false)
op_employer_ss      = 0 (ssc_contrib_employer = false)
op_employer_eib     = 0 (contrib_eib = false)
op_employer_levy    = 0 (levy_include = false)
op_employer_severance = round(2000 * 0.01, 2) = 20.00
```

### TC-4: Late Submission with Tiered Penalties

**Input:** Period = Feb 2026, Filing window = 1 month, Received = June 15, 2026

```
Filing deadline = March 31, 2026
Days late = 76
Calendar months late = 3 (April, May, June)
Delay periods = 3 (month-based)
Initial periods = min(3, 1) = 1
Subsequent periods = max(0, 3-1) = 2

Levy penalty = levyBase * 0.10 * 1 + levyBase * 0.01 * 2
             = levyBase * 0.12
```

### TC-5: NWD with Configurable Rate

**Input:** Total wages = $650, nwd_employee_levy_rate = 0.10 (10%), 3 months late

```
Employee Levy = $650 * 0.10 = $65.00
Penalty Rate = 0.10 + 0.03 = 0.13
Penalty = $65.00 * 0.13 = $8.45
```

---

## 19. Glossary & Field Mappings

### 19.1 Output Fields per Employee

| Field | Formula |
|---|---|
| `totalWages` | week1+week2+week3+week4+week5+bonus+holiday + sum(otherPaymentAmounts) |
| `taxableWages` | totalWages - bonus (base only, before OP) |
| `employeeSS` | base_employeeSS + sum(opEmployeeSS) |
| `employerSS` | base_employerSS + sum(opEmployerSS) |
| `employerEIB` | base_employerEIB + sum(opEmployerEIB) |
| `employerSSTotal` | employerSS + employerEIB |
| `employeeLevy` | base_employeeLevy + sum(opEmployeeLevy) |
| `employerLevy` | base_employerLevy + sum(opEmployerLevy) |
| `employerSeverance` | base_employerSeverance + sum(opEmployerSeverance) |

### 19.2 Output Totals

| Field | Formula |
|---|---|
| `periodGross` | SUM(all employee totalWages) |
| `filingDeadline` | Computed from filing_window_unit/value |
| `dueDate` | Legacy: computed from submission_due_day (display only) |
| `daysLate` | MAX(0, receivedDate - filingDeadline) |
| `delayPeriods` | Based on filing_window_unit |
| `initialPenaltyPeriods` | MIN(delayPeriods, penaltyInitialThreshold) |
| `subsequentPenaltyPeriods` | MAX(0, delayPeriods - penaltyInitialThreshold) |
| `levyPenalty` | Recalculated on adjusted base (incl. Other Payments) |
| `severancePenalty` | Recalculated on adjusted base |
| `ssFine` | Recalculated on adjusted base |
| `totalLateCharges` | levyPenalty + severancePenalty + ssFine |

### 19.3 Configuration Value Sources

| Value | Source Table | Field | Default |
|---|---|---|---|
| Employee SS Rate | `wiz_c3_config_details` | `employee_ss_rate` | 0.05 |
| SS Max Wage (universal cap) | `wiz_c3_config_details` | `employee_ss_max_wage` | 6500.00 |
| Employer SS Rate | `wiz_c3_config_details` | `employer_ss_rate` | 0.05 |
| Employer EIB Rate | `wiz_c3_config_details` | `employer_eib_rate` | 0.01 |
| Employer Levy Rate | `wiz_c3_config_details` | `employer_levy_rate` | 0.03 |
| Employer Severance Rate | `wiz_c3_config_details` | `employer_severance_rate` | 0.01 |
| NWD Employee Levy Rate | `wiz_c3_config_details` | `nwd_employee_levy_rate` | 0.08 |
| Week Start Day | `wiz_c3_calculation_config` | `week_start_day` | 1 (Monday) |
| Filing Window Unit | `wiz_c3_calculation_config` | `filing_window_unit` | 1 (Months) |
| Filing Window Value | `wiz_c3_calculation_config` | `filing_window_value` | 1 |
| Initial Penalty Threshold | `wiz_c3_calculation_config` | `penalty_initial_threshold` | 1 |
| Subsequent Penalty Threshold | `wiz_c3_calculation_config` | `penalty_subsequent_threshold` | 1 |
| Levy Slabs | `wiz_levy_slab_details` | per `pay_period` and `order_no` | — |
| Bonus Policy | `wiz_bonus_policy_default` + `_exceptions` | per month/year | — |
| Holiday Pay Policy | `wiz_holiday_pay_policy_default` + `_exceptions` | per month/year | — |
| Income Code Policy | `wiz_income_code_policy_default` + `_exceptions` | per income code + month/year | — |

---

## Document Version History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-03-05 | Initial calculation guide |
| 2.0 | 2026-03-12 | Added filing deadline, penalty thresholds, levy pairing, Other Payments, NWD rate |
| 3.0 | 2026-03-03 | Sync guide: bonus/holiday policy tables, v3.0 payload format |
| **4.0** | **2026-03-15** | **Unified guide: All calculation logic + sync protocol + migration scripts + discrepancy register** |

---

**Contact:** For questions about this guide, contact the SSB Admin team.

*End of C3 Wizard Implementation Guide v4.0*
