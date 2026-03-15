# C3 Wizard — Self-Employed Configuration & Calculation Implementation Guide

**Version:** 1.0  
**Date:** 2026-03-15  
**Author:** SSB Admin — Senior Architecture Team  
**Audience:** C3 Wizard (Employer Portal) Development Team  
**Purpose:** Enable the C3 Wizard to support Self-Employed (SE) contribution calculations using configuration published by SSB Admin  
**Related:** C3_WIZARD_IMPLEMENTATION_GUIDE_V4.md (Employer module guide)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [SSB Admin Source Tables — Full Schema Reference](#3-ssb-admin-source-tables)
4. [C3 Wizard Mirror Tables — Required Schema](#4-c3-wizard-mirror-tables)
5. [Self-Employed Calculation Logic — Complete Reference](#5-self-employed-calculation-logic)
6. [Voluntary Contributor Calculation Logic](#6-voluntary-contributor-calculation-logic)
7. [Penalty Calculation](#7-penalty-calculation)
8. [Configuration Sync Protocol — Self-Employed Extension](#8-configuration-sync-protocol)
9. [Updated Sync Payload Format (v4.1)](#9-updated-sync-payload-format)
10. [SSB Admin Publish Mechanism — SE Extension](#10-ssb-admin-publish-mechanism)
11. [C3 Wizard Consumption Guide](#11-c3-wizard-consumption-guide)
12. [Database Migration Scripts for C3 Wizard](#12-database-migration-scripts)
13. [Test Cases](#13-test-cases)
14. [Implementation Checklist](#14-implementation-checklist)
15. [Glossary & Field Mappings](#15-glossary--field-mappings)

---

## 1. Executive Summary

The C3 Wizard portal supports two user types: **Employer** and **Self-Employed**. The Employer module is already fully synchronized with SSB Admin via the Config Sync Protocol (v4.0). This guide extends that architecture to cover the **Self-Employed (SE)** and **Voluntary Contributor (VC)** modules.

### Key Principles

1. **SSB Admin = Source of Truth** — All SE/VC configuration is authored and managed in SSB Admin
2. **No Hardcoded Values** — The C3 Wizard must read ALL rates, categories, and penalty percentages from synced configuration tables
3. **Same Sync Architecture** — SE configuration follows the same publish → sync → mirror pattern as Employer configuration
4. **Identical Calculations** — Both systems must produce byte-identical results for the same inputs

### What Changes for C3 Wizard

| Component | Current State | Required State |
|---|---|---|
| SE contribution rates | Possibly hardcoded or local | Read from `wiz_self_emp_contrib_rate` (synced from SSB Admin) |
| Income categories (wage brackets) | Possibly hardcoded | Read from `wiz_income_cat` (synced from SSB Admin) |
| SE penalty rates | Possibly hardcoded | Read from `wiz_self_emp_contrib_rate.sep_penalty_percent` |
| VC contribution amounts | Possibly hardcoded | Read from `wiz_vol_contrib_config` (synced from SSB Admin) |
| Sync endpoint | Handles Employer only | Extended to handle SE/VC configuration tables |

---

## 2. Architecture Overview

### 2.1 System Context — Self-Employed Extension

```
┌──────────────────────────────────────┐              ┌──────────────────────────────────────────┐
│         SSB ADMIN SYSTEM             │              │         C3 WIZARD SYSTEM                  │
│    (Source of Truth)                 │              │    (Employer Portal / Consumer)            │
│                                      │              │                                          │
│  ┌─ EMPLOYER Config Tables ──────┐  │              │  ┌─ EMPLOYER Mirror Tables ────────────┐ │
│  │ c3_config_periods             │  │   PUBLISH    │  │ wiz_c3_config_periods               │ │
│  │ c3_config_details             │  │   ──────>    │  │ wiz_c3_config_details               │ │
│  │ c3_calculation_config         │  │              │  │ wiz_c3_calculation_config            │ │
│  │ tb_levy_slabs / _details      │  │              │  │ wiz_levy_slabs / _details            │ │
│  │ c3_bonus_policy_*             │  │              │  │ wiz_bonus_policy_*                   │ │
│  │ c3_holiday_pay_policy_*       │  │              │  │ wiz_holiday_pay_policy_*             │ │
│  │ c3_income_code_policy_*       │  │              │  │ wiz_income_code_policy_*             │ │
│  └───────────────────────────────┘  │              │  └──────────────────────────────────────┘ │
│                                      │              │                                          │
│  ┌─ SELF-EMPLOYED Config Tables ─┐  │   PUBLISH    │  ┌─ SE Mirror Tables ──────────── NEW ─┐ │
│  │ tb_self_emp_contrib_rate      │  │   ──────>    │  │ wiz_self_emp_contrib_rate            │ │
│  │ tb_income_cat                 │  │              │  │ wiz_income_cat                       │ │
│  └───────────────────────────────┘  │              │  └──────────────────────────────────────┘ │
│                                      │              │                                          │
│  ┌─ Publish Engine ──────────────┐  │              │  ┌─ SE Calculation Engine ──────────────┐ │
│  │ useC3ConfigPublish.ts         │  │              │  │ Uses wiz_self_emp_contrib_rate       │ │
│  │ c3-config-sync-publish (EF)   │  │              │  │ Uses wiz_income_cat                  │ │
│  └───────────────────────────────┘  │              │  └──────────────────────────────────────┘ │
└──────────────────────────────────────┘              └──────────────────────────────────────────┘
```

### 2.2 Data Flow

```
1. Admin user manages SE contribution rates in SSB Admin UI
   (Administration > Master Data > SEP Contribution Rates)

2. Admin user manages Income Categories in SSB Admin UI
   (Administration > Master Data > Income Categories)

3. Admin clicks "Publish to C3-Wizard" button (same button used for Employer config)

4. SSB Admin builds payload including SE tables alongside Employer tables

5. Payload is sent to C3-Wizard sync endpoint via c3-config-sync-publish edge function

6. C3-Wizard sync endpoint upserts data into wiz_self_emp_contrib_rate and wiz_income_cat

7. Self-Employed user logs in to C3-Wizard, fills C3 form

8. C3-Wizard calculation engine reads rates from wiz_self_emp_contrib_rate
   (period-based lookup: effstart <= period <= effend AND wage_cat = selected category)

9. Contributions and penalties are calculated using synced configuration values
```

---

## 3. SSB Admin Source Tables — Full Schema Reference

### 3.1 `tb_self_emp_contrib_rate` (SE Contribution Rates)

This is the **primary configuration table** for Self-Employed calculations. It stores SS contribution rates and penalty rates per wage category per effective period.

| Column | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `effstart` | `timestamp` | NO | — | Effective period start date (inclusive) |
| `effend` | `timestamp` | NO | — | Effective period end date (inclusive) |
| `wage_cat` | `numeric` | NO | `0.0` | Wage category amount (matches `tb_income_cat.wage_upper`) |
| `sep_ss_percent` | `numeric` | NO | — | Social Security contribution rate (e.g., `5.00` = 5%, `10.00` = 10%) |
| `sep_penalty_percent` | `numeric` | YES | — | Late payment penalty rate (e.g., `5.00` = 5%) |

**Composite Primary Key:** `(effstart, effend, wage_cat)`

**Current Data Sample (2 effective periods):**

| effstart | effend | wage_cat | sep_ss_percent | sep_penalty_percent |
|---|---|---|---|---|
| 2020-01-01 | 2030-12-31 | 1.00 | 5.00 | 5.00 |
| 2020-01-01 | 2030-12-31 | 2.00 | 5.00 | 5.00 |
| 2020-01-01 | 2030-12-31 | 3.00 | 5.00 | 5.00 |
| 2020-01-01 | 2030-12-31 | 4.00 | 5.00 | 5.00 |
| 2020-01-01 | 2030-12-31 | 5.00 | 5.00 | 5.00 |
| 1984-01-01 | 2099-12-31 | 100.00 | 10.00 | 5.00 |
| 1984-01-01 | 2099-12-31 | 200.00 | 10.00 | 5.00 |
| 1984-01-01 | 2099-12-31 | 300.00 | 10.00 | 5.00 |
| ... | ... | ... | ... | ... |
| 1984-01-01 | 2099-12-31 | 1500.00 | 10.00 | 5.00 |

**Important Notes:**
- `sep_ss_percent` is stored as a **whole number** (5.00 = 5%, 10.00 = 10%). Divide by 100 before use in calculations.
- `sep_penalty_percent` is also stored as a **whole number**. Divide by 100 before use.
- The `wage_cat` values correspond to the `wage_upper` field in `tb_income_cat`.
- Edit operations use a **delete-and-insert** transaction due to the composite primary key.

### 3.2 `tb_income_cat` (Income Categories / Wage Brackets)

This table defines the wage category brackets that Self-Employed persons can be assigned to.

| Column | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `category_code` | `varchar` | NO | — | Single-letter code (S, A, B, C, ... M) |
| `wage_upper` | `numeric` | YES | — | Weekly wage upper limit for this category |
| `appeal` | `varchar` | YES | — | Appeal reference (usually empty) |

**Primary Key:** `category_code`

**Full Data:**

| category_code | wage_upper | Description |
|---|---|---|
| S | 100.00 | Category S — up to $100/week |
| A | 200.00 | Category A — up to $200/week |
| B | 300.00 | Category B — up to $300/week |
| C | 400.00 | Category C — up to $400/week |
| D | 500.00 | Category D — up to $500/week |
| E | 600.00 | Category E — up to $600/week |
| F | 700.00 | Category F — up to $700/week |
| G | 800.00 | Category G — up to $800/week |
| H | 900.00 | Category H — up to $900/week |
| I | 1000.00 | Category I — up to $1,000/week |
| J | 1100.00 | Category J — up to $1,100/week |
| K | 1200.00 | Category K — up to $1,200/week |
| L | 1350.00 | Category L — up to $1,350/week |
| M | 1500.00 | Category M — up to $1,500/week |

**Relationship:** `tb_income_cat.wage_upper` is referenced by `tb_self_emp_contrib_rate.wage_cat`. Referential integrity is enforced.

### 3.3 `ip_self_category` (Self-Employed Person's Assigned Wage Categories)

This table stores the **actual wage category assignments** per self-employed person per activity. This is NOT a configuration table — it is transactional data. It is included here for context on how the SE person's `wage_cat` is determined.

| Column | Data Type | Nullable | Description |
|---|---|---|---|
| `ssn` | `varchar` | NO | Social Security Number |
| `self_ref_no` | `varchar` | NO | Self-employment reference number |
| `activity_seq_no` | `varchar` | NO | Activity sequence number |
| `effective_start_date` | `timestamp` | NO | Category start date |
| `effective_end_date` | `timestamp` | YES | Category end date (auto: start + 6 months) |
| `wage_category` | `numeric` | YES | Assigned wage amount (matches `tb_income_cat.wage_upper`) |

**This table is NOT synced** — it exists locally on both systems. The SE user's wage category is determined by this table and then used to look up rates from the synced `wiz_self_emp_contrib_rate`.

### 3.4 `ip_self_weeks_paid` (SE Contribution History)

This is the **output/transaction table** where calculated SE contributions are stored.

| Column | Data Type | Nullable | Description |
|---|---|---|---|
| `ssn` | `varchar` | NO | Social Security Number |
| `payer_id` | `varchar` | NO | Self-employment reference number |
| `payer_type` | `varchar` | NO | Always `'SE'` for self-employed |
| `sequence_no` | `integer` | NO | Sequence number |
| `period` | `timestamp` | NO | Filing period (month-year) |
| `pay_period` | `varchar` | YES | Payment period type |
| `paid_code1..7` | `char` | YES | Weekly paid status codes |
| `sep_ss_amt` | `numeric` | YES | Calculated SS contribution amount |

**This table is NOT synced** — it is local transactional data.

### 3.5 RPC: `get_sep_contribution_rate`

SSB Admin provides a database function to look up the applicable SE rate:

```sql
CREATE FUNCTION get_sep_contribution_rate(p_wage_category NUMERIC, p_period TIMESTAMP)
RETURNS TABLE (sep_ss_percent NUMERIC, sep_penalty_percent NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT r.sep_ss_percent, r.sep_penalty_percent
  FROM tb_self_emp_contrib_rate r
  WHERE r.wage_cat = p_wage_category
    AND p_period BETWEEN r.effstart AND r.effend
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

The C3 Wizard must implement equivalent logic using its local `wiz_self_emp_contrib_rate` table.

---

## 4. C3 Wizard Mirror Tables — Required Schema

### 4.1 `wiz_self_emp_contrib_rate` (NEW — Must Create)

Mirror of SSB Admin's `tb_self_emp_contrib_rate` with sync metadata columns.

```sql
CREATE TABLE wiz_self_emp_contrib_rate (
  effstart        TIMESTAMP NOT NULL,
  effend          TIMESTAMP NOT NULL,
  wage_cat        NUMERIC NOT NULL DEFAULT 0.0,
  sep_ss_percent  NUMERIC NOT NULL,
  sep_penalty_percent NUMERIC,

  -- Sync metadata (standard for all wiz_ tables)
  admin_sync_id   TEXT,           -- Source identifier from SSB Admin
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  sync_version    TEXT,           -- Protocol version (e.g., '4.1')

  PRIMARY KEY (effstart, effend, wage_cat)
);
```

### 4.2 `wiz_income_cat` (NEW — Must Create)

Mirror of SSB Admin's `tb_income_cat`.

```sql
CREATE TABLE wiz_income_cat (
  category_code   VARCHAR NOT NULL PRIMARY KEY,
  wage_upper      NUMERIC,
  appeal          VARCHAR,

  -- Sync metadata
  admin_sync_id   TEXT,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  sync_version    TEXT
);
```

### 4.3 Permissions (CRITICAL)

The sync endpoint uses the service role. Ensure grants exist:

```sql
GRANT INSERT, UPDATE, DELETE ON wiz_self_emp_contrib_rate TO service_role;
GRANT INSERT, UPDATE, DELETE ON wiz_income_cat TO service_role;
```

---

## 5. Self-Employed Calculation Logic — Complete Reference

### 5.1 Overview

Self-Employed C3 contributions are fundamentally different from Employer contributions:

| Aspect | Employer | Self-Employed |
|---|---|---|
| Contributor | Multiple employees per C3 | Single person (the SE individual) |
| Weekly wages | Week1-5 + Bonus + Holiday + Other Payments | Week1-5 only (no Bonus/Holiday/OP) |
| Pay period | Variable (W, E2W, 2M, M) | Monthly (`pay_period = 1`) |
| Rate source | `wiz_c3_config_details` (employee/employer rates) | `wiz_self_emp_contrib_rate` (flat rate lookup) |
| Rate type | Percentage of wages (5% employee, 5% employer, etc.) | Flat rate based on wage category |
| EIB | Employer pays | **NULL** — Does not apply |
| Severance | Employer pays | **NULL** — Does not apply |
| Levy | Slab-based calculation | **NULL** — Does not apply |
| Penalty | Tiered (initial/subsequent periods) | Simple percentage from `sep_penalty_percent` |

### 5.2 Calculation Steps

#### Step 1: Determine the SE Person's Wage Category

```javascript
// Query the SE person's current wage category from ip_self_category
// (This is LOCAL data, not synced)
const wageCategory = await getActiveWageCategory(ssn, selfRefNo, activitySeqNo, periodDate);
// Example result: { wage_category: 300.00 }
```

**Rule:** The `ip_self_category` record must have:
- `effective_start_date <= periodDate`  
- `effective_end_date >= periodDate` (or `effective_end_date IS NULL`)

If no valid wage category exists for the period, **halt calculation** and display error.

#### Step 2: Look Up Contribution Rate

```javascript
// Query wiz_self_emp_contrib_rate for the matching rate
// CRITICAL: Use synced mirror table, NOT hardcoded values
const rateResult = await lookupSEContributionRate(wageCategory.wage_category, periodDate);

// Equivalent SQL:
// SELECT sep_ss_percent, sep_penalty_percent
// FROM wiz_self_emp_contrib_rate
// WHERE wage_cat = $wageCategory
//   AND effstart <= $periodDate
//   AND effend >= $periodDate
// LIMIT 1;

if (!rateResult) {
  // HALT: No matching configuration found
  throw new Error(`No SE contribution rate found for wage category ${wageCategory} and period ${periodDate}`);
}

const ssRate = rateResult.sep_ss_percent / 100;       // e.g., 10.00 → 0.10
const penaltyRate = rateResult.sep_penalty_percent / 100; // e.g., 5.00 → 0.05
```

**CRITICAL:** `sep_ss_percent` and `sep_penalty_percent` are stored as **whole numbers** (e.g., 5.00 = 5%, 10.00 = 10%). Always **divide by 100** before using in calculations.

#### Step 3: Calculate Weekly SS Contributions

```javascript
// For each week with a paid code
const weeklyWage = wageCategory.wage_category; // The wage_upper amount IS the weekly wage

// Weekly contribution = weeklyWage * (sep_ss_percent / 100)
const weeklyContribution = round(weeklyWage * ssRate, 2);

// Process each of the 5 possible weeks
const weeks = [paid_code1, paid_code2, paid_code3, paid_code4, paid_code5];
let totalSSContribution = 0;
let weeksContributed = 0;

weeks.forEach((paidCode, index) => {
  if (paidCode && paidCode !== ' ' && paidCode !== '') {
    totalSSContribution += weeklyContribution;
    weeksContributed++;
  }
});
```

**Paid Code Logic:**
- A non-empty paid code indicates a contributed week
- Empty or space (`' '`) indicates no contribution for that week
- The exact paid code values are defined by business rules (typically `'P'` for paid)

#### Step 4: Calculate Monthly Total

```javascript
// Monthly SS amount = sum of all contributed weeks
const sep_ss_amt = totalSSContribution;

// Example: Category B ($300/week), 10% rate, 4 weeks paid
// Weekly contribution = round(300 * 0.10, 2) = $30.00
// Monthly total = 4 * $30.00 = $120.00
```

#### Step 5: Set Employer-Specific Components to NULL

```javascript
// These components DO NOT APPLY to Self-Employed
const employerSS = null;
const employerEIB = null;
const employerLevy = null;
const employerSeverance = null;
const employeeLevy = null;
```

### 5.3 Complete Calculation Formula

```
INPUT:
  - ssn: Social Security Number
  - selfRefNo: Self-employment reference
  - activitySeqNo: Activity sequence
  - periodDate: Filing period (month/year)
  - paid_codes[1..5]: Weekly paid status codes
  - receivedDate: Date C3 was received (for penalty calculation)

STEP 1: Get wage_category from ip_self_category
  WHERE ssn = $ssn AND self_ref_no = $selfRefNo AND activity_seq_no = $activitySeqNo
  AND effective_start_date <= $periodDate AND effective_end_date >= $periodDate

STEP 2: Get rates from wiz_self_emp_contrib_rate
  WHERE wage_cat = $wage_category AND effstart <= $periodDate AND effend >= $periodDate
  → sep_ss_percent, sep_penalty_percent

STEP 3: Calculate
  ssRate = sep_ss_percent / 100
  weeklyContribution = round(wage_category * ssRate, 2)
  weeksContributed = count(non-empty paid_codes)
  sep_ss_amt = weeksContributed * weeklyContribution

STEP 4: Penalty (if late)
  → See Section 7

OUTPUT:
  sep_ss_amt: Numeric (SS contribution)
  sep_penalty_amt: Numeric (penalty if late, else 0)
  employer components: ALL NULL
```

### 5.4 Display Requirements

The C3 Wizard UI **must display** the active rate information to the SE user:

```
┌──────────────────────────────────────────────┐
│ Contribution Summary                          │
│                                              │
│ Wage Category: B ($300/week)                 │
│ SS Rate: 10.00%          ← from config      │
│ Weeks Contributed: 4                         │
│ Weekly Contribution: $30.00                  │
│ Monthly SS Total: $120.00                    │
│                                              │
│ Penalty Rate: 5.00%      ← from config      │
│ Penalty Amount: $0.00                        │
│                                              │
│ Total Due: $120.00                           │
└──────────────────────────────────────────────┘
```

**If no matching configuration exists:**

```
┌──────────────────────────────────────────────┐
│ ⚠ WARNING                                    │
│ No contribution rate configuration found     │
│ for wage category $300 and period March 2026 │
│                                              │
│ Please contact SSB administration.           │
└──────────────────────────────────────────────┘
```

---

## 6. Voluntary Contributor Calculation Logic

### 6.1 Overview

Voluntary Contributors (VC) use a **fixed monthly contribution amount** rather than a rate-based calculation. The contribution amount is determined by their assigned wage category, similar to SE.

| Aspect | Self-Employed | Voluntary Contributor |
|---|---|---|
| `payer_type` | `'SE'` | `'VC'` |
| Rate source | `wiz_self_emp_contrib_rate` | Same table (same rates apply) |
| Eligibility | Active SE registration | Must be SKN resident, age 16-62 |
| Filing restriction | None | Cannot file before `date_commenced` |
| EIB/Severance/Levy | NULL | NULL |

### 6.2 VC Calculation

The calculation logic is **identical** to Self-Employed (Section 5). The only differences are:

1. `payer_type = 'VC'` instead of `'SE'`
2. **Eligibility validation** before allowing filing:
   - Residence must be `'SKN'` (St. Kitts & Nevis)
   - Age must be between 16 and 62 (configurable)
   - Filing period must not precede `date_commenced` from `ip_vol_contrib`

### 6.3 VC Configuration Table (Reference Only)

The `ip_vol_contrib` table stores VC registration data. This is **transactional, NOT synced**.

| Column | Data Type | Description |
|---|---|---|
| `ssn` | `varchar` | Social Security Number |
| `date_commenced` | `timestamp` | VC registration start date |
| `date_ceased` | `timestamp` | VC end date (if ceased) |
| `contrib_amt` | `numeric` | Monthly contribution amount |
| `payment_interval` | `varchar` | Payment frequency |
| `last_payment_date` | `timestamp` | Last payment date |
| `due_date` | `timestamp` | Next due date |
| `date_registered` | `timestamp` | Registration date |
| `avg_weekly_wage` | `numeric` | Average weekly wage for category |

---

## 7. Penalty Calculation

### 7.1 SE/VC Late Payment Penalty

The SE penalty is simpler than the Employer tiered system. It uses a **flat penalty rate** from the configuration table.

```javascript
// Determine if filing is late
const filingDeadline = getLastDayOfMonth(addMonths(periodDate, 1));
// Example: Period = March 2026 → Deadline = April 30, 2026

const isLate = receivedDate > filingDeadline;

if (isLate) {
  // Calculate months late
  const monthsLate = differenceInCalendarMonths(receivedDate, filingDeadline);
  // Minimum 1 month late if past deadline
  const effectiveMonthsLate = Math.max(1, monthsLate);
  
  // Penalty = SS contribution × penalty rate × months late
  const penaltyRate = rateResult.sep_penalty_percent / 100; // e.g., 5.00 → 0.05
  const sep_penalty_amt = round(sep_ss_amt * penaltyRate * effectiveMonthsLate, 2);
} else {
  const sep_penalty_amt = 0;
}
```

### 7.2 Penalty Formula

```
sep_penalty_amt = round(sep_ss_amt × (sep_penalty_percent / 100) × monthsLate, 2)
```

**Example:**
- SS contribution = $120.00
- Penalty rate = 5% (from config: `sep_penalty_percent = 5.00`)
- Months late = 3

```
Penalty = round($120.00 × 0.05 × 3, 2) = round($18.00, 2) = $18.00
Total Due = $120.00 + $18.00 = $138.00
```

### 7.3 Key Difference from Employer Penalties

| Feature | Employer | Self-Employed |
|---|---|---|
| Penalty structure | Tiered (initial + subsequent rates) | Flat rate × months late |
| Rate source | `c3_config_details` (levy/severance/SS penalty rates) | `tb_self_emp_contrib_rate.sep_penalty_percent` |
| Filing window | Configurable via `filing_window_unit/value` | End of month following period |
| Components penalized | Levy, Severance, SS separately | SS only (single penalty) |

---

## 8. Configuration Sync Protocol — Self-Employed Extension

### 8.1 Extended Sync Flow

The existing sync protocol (v4.0) is extended to include SE configuration tables. The same publish button, edge function, and sync endpoint are used.

```
┌─────────────────────────┐
│  SSB Admin Publish      │
│  (useC3ConfigPublish)   │
├─────────────────────────┤
│  1. Build payload       │
│     - Employer tables   │  ← Existing (v4.0)
│     - SE tables    NEW  │  ← Added in v4.1
│  2. Hash payload        │
│  3. Log to sync_log     │
│  4. POST to Wizard      │
│  5. Update timestamps   │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│  c3-config-sync-publish │
│  (Edge Function)        │
│  Proxies to Wizard      │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│  C3 Wizard Sync         │
│  Endpoint               │
├─────────────────────────┤
│  1. Validate payload    │
│  2. Check hash (dedup)  │
│  3. UPSERT Employer     │
│  4. UPSERT SE tables    │  ← NEW
│     - wiz_self_emp_     │
│       contrib_rate      │
│     - wiz_income_cat    │
│  5. Log sync            │
│  6. Return result       │
└─────────────────────────┘
```

### 8.2 Sync Strategy for SE Tables

#### `wiz_self_emp_contrib_rate`

- **Sync method:** Full replace (DELETE all + INSERT all)
- **Reason:** The composite primary key `(effstart, effend, wage_cat)` makes UPSERT complex. A full replace is cleaner and the table is small (~20 rows).

```sql
-- Inside sync transaction
DELETE FROM wiz_self_emp_contrib_rate;
INSERT INTO wiz_self_emp_contrib_rate (effstart, effend, wage_cat, sep_ss_percent, sep_penalty_percent, admin_sync_id, synced_at, sync_version)
VALUES ($1, $2, $3, $4, $5, $6, NOW(), '4.1'),
       ($1, $2, $3, $4, $5, $6, NOW(), '4.1'),
       ...;
```

#### `wiz_income_cat`

- **Sync method:** UPSERT on `category_code`
- **Reason:** Simple primary key, standard UPSERT works.

```sql
INSERT INTO wiz_income_cat (category_code, wage_upper, appeal, admin_sync_id, synced_at, sync_version)
VALUES ($1, $2, $3, $4, NOW(), '4.1')
ON CONFLICT (category_code) DO UPDATE SET
  wage_upper = EXCLUDED.wage_upper,
  appeal = EXCLUDED.appeal,
  admin_sync_id = EXCLUDED.admin_sync_id,
  synced_at = NOW(),
  sync_version = EXCLUDED.sync_version;
```

---

## 9. Updated Sync Payload Format (v4.1)

The sync payload is extended with two new arrays. All existing v4.0 fields remain unchanged.

```json
{
  "sync_version": "4.1",
  "sync_timestamp": "2026-03-15T12:00:00.000Z",

  "config_periods": [ "... (unchanged from v4.0)" ],
  "levy_slabs": [ "... (unchanged)" ],
  "bonus_policies": [ "... (unchanged)" ],
  "bonus_exceptions": [ "... (unchanged)" ],
  "holiday_policies": [ "... (unchanged)" ],
  "holiday_exceptions": [ "... (unchanged)" ],
  "calculation_config": [ "... (unchanged)" ],
  "income_codes": [ "... (unchanged)" ],
  "income_code_policies": [ "... (unchanged)" ],
  "income_code_policy_exceptions": [ "... (unchanged)" ],

  "self_emp_contrib_rates": [
    {
      "effstart": "2020-01-01T00:00:00",
      "effend": "2030-12-31T00:00:00",
      "wage_cat": 1.00,
      "sep_ss_percent": 5.00,
      "sep_penalty_percent": 5.00
    },
    {
      "effstart": "2020-01-01T00:00:00",
      "effend": "2030-12-31T00:00:00",
      "wage_cat": 2.00,
      "sep_ss_percent": 5.00,
      "sep_penalty_percent": 5.00
    },
    {
      "effstart": "1984-01-01T00:00:00",
      "effend": "2099-12-31T00:00:00",
      "wage_cat": 100.00,
      "sep_ss_percent": 10.00,
      "sep_penalty_percent": 5.00
    },
    "... (all rows from tb_self_emp_contrib_rate)"
  ],

  "income_categories": [
    {
      "category_code": "S",
      "wage_upper": 100.00,
      "appeal": ""
    },
    {
      "category_code": "A",
      "wage_upper": 200.00,
      "appeal": ""
    },
    {
      "category_code": "B",
      "wage_upper": 300.00,
      "appeal": ""
    },
    "... (all rows from tb_income_cat)"
  ]
}
```

### 9.1 Payload Field Reference

| Payload Array | Source Table (SSB Admin) | Target Table (C3 Wizard) | Sync Method |
|---|---|---|---|
| `self_emp_contrib_rates` | `tb_self_emp_contrib_rate` | `wiz_self_emp_contrib_rate` | Full replace |
| `income_categories` | `tb_income_cat` | `wiz_income_cat` | UPSERT on `category_code` |

### 9.2 Backward Compatibility

The C3 Wizard sync endpoint must handle both v4.0 and v4.1 payloads:
- If `self_emp_contrib_rates` is missing/empty → skip SE sync (v4.0 behavior)
- If `income_categories` is missing/empty → skip income cat sync

---

## 10. SSB Admin Publish Mechanism — SE Extension

### 10.1 Changes to `buildSyncPayload()` in `useC3ConfigPublish.ts`

The existing `buildSyncPayload()` function must be extended to include SE tables:

```typescript
// ADD to buildSyncPayload() after existing queries:

// 7. Self-Employed Contribution Rates
const { data: seRates, error: seErr } = await supabase
  .from('tb_self_emp_contrib_rate')
  .select('*')
  .order('effstart', { ascending: false })
  .order('wage_cat', { ascending: true });
if (seErr) throw seErr;

// 8. Income Categories
const { data: incomeCats, error: icErr } = await supabase
  .from('tb_income_cat')
  .select('*')
  .order('wage_upper', { ascending: true });
if (icErr) throw icErr;

// Add to payload:
const payload = {
  sync_version: '4.1',  // Updated from '3.0'
  sync_timestamp: syncTimestamp,
  // ... existing fields ...
  self_emp_contrib_rates: seRates || [],
  income_categories: incomeCats || [],
};

// Add to counts:
const counts = {
  // ... existing counts ...
  seContribRates: (seRates || []).length,
  incomeCategories: (incomeCats || []).length,
};
```

### 10.2 Changes to `useC3SyncStatus()` — Pending Changes Detection

Add SE table modification tracking:

```typescript
// Add to the modification check promises:
const { count: seRateMod } = await supabase
  .from('tb_self_emp_contrib_rate')
  // Note: tb_self_emp_contrib_rate doesn't have modified_on/last_published_at yet
  // This will need a schema update (see Section 10.3)
  .select('*', { count: 'exact', head: true });
```

### 10.3 Schema Update Needed on SSB Admin `tb_self_emp_contrib_rate`

To support pending-changes detection, add tracking columns:

```sql
ALTER TABLE tb_self_emp_contrib_rate
  ADD COLUMN modified_on TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN modified_by VARCHAR,
  ADD COLUMN last_published_at TIMESTAMPTZ;
```

### 10.4 Changes to `C3PublishButton.tsx` — Display SE Counts

Update the confirmation dialog to show SE counts:

```tsx
// Add to payload summary:
<li>{syncStatus.pendingCounts.seContribRates} SE contribution rate(s)</li>
<li>{syncStatus.pendingCounts.incomeCategories} income category/categories</li>
```

### 10.5 Changes to `c3_config_sync_log` — Track SE Counts

Add columns to the sync log:

```sql
ALTER TABLE c3_config_sync_log
  ADD COLUMN se_contrib_rates_count INTEGER DEFAULT 0,
  ADD COLUMN income_categories_count INTEGER DEFAULT 0;
```

---

## 11. C3 Wizard Consumption Guide

### 11.1 Rate Lookup Function (C3 Wizard Side)

```javascript
/**
 * Look up SE contribution rate from synced configuration.
 * This replaces any hardcoded rates.
 *
 * @param wageCategory - The wage_upper amount (e.g., 300.00)
 * @param periodDate - The filing period date
 * @returns { ssRate: number, penaltyRate: number } as decimals
 */
async function getSEContributionRate(wageCategory, periodDate) {
  const { data, error } = await supabase
    .from('wiz_self_emp_contrib_rate')
    .select('sep_ss_percent, sep_penalty_percent')
    .eq('wage_cat', wageCategory)
    .lte('effstart', periodDate)
    .gte('effend', periodDate)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(
      `No SE contribution rate found for wage category ${wageCategory} ` +
      `and period ${periodDate}. Configuration may not be synced.`
    );
  }

  return {
    ssRate: data.sep_ss_percent / 100,           // 10.00 → 0.10
    penaltyRate: data.sep_penalty_percent / 100,  // 5.00  → 0.05
  };
}
```

### 11.2 Income Category Lookup

```javascript
/**
 * Get all available income categories for the SE user to select from.
 * Returns ordered list from synced configuration.
 */
async function getIncomeCategories() {
  const { data, error } = await supabase
    .from('wiz_income_cat')
    .select('category_code, wage_upper')
    .order('wage_upper', { ascending: true });

  if (error || !data || data.length === 0) {
    throw new Error('No income categories found. Configuration may not be synced.');
  }

  return data;
  // Returns: [{ category_code: 'S', wage_upper: 100 }, { category_code: 'A', wage_upper: 200 }, ...]
}
```

### 11.3 Complete SE C3 Calculation Flow (C3 Wizard)

```javascript
async function calculateSEContribution(input) {
  const {
    ssn, selfRefNo, activitySeqNo,
    periodDate,           // Filing period (e.g., '2026-03-01')
    paidCodes,            // Array of 5 weekly paid codes
    receivedDate,         // Date the C3 was received
  } = input;

  // 1. Get the SE person's wage category (LOCAL table)
  const wageCategory = await getActiveWageCategory(ssn, selfRefNo, activitySeqNo, periodDate);
  if (!wageCategory) {
    return { error: 'No active wage category for this period' };
  }

  // 2. Get rates from synced config (MIRROR table)
  const { ssRate, penaltyRate } = await getSEContributionRate(
    wageCategory.wage_category,
    periodDate
  );

  // 3. Calculate weekly contribution
  const weeklyWage = wageCategory.wage_category; // wage_upper IS the weekly wage
  const weeklyContribution = Math.round(weeklyWage * ssRate * 100) / 100;

  // 4. Count contributed weeks
  const weeksContributed = paidCodes.filter(code => code && code.trim() !== '').length;

  // 5. Calculate SS total
  const sep_ss_amt = Math.round(weeksContributed * weeklyContribution * 100) / 100;

  // 6. Calculate penalty (if late)
  const filingDeadline = getLastDayOfMonth(addMonths(new Date(periodDate), 1));
  const received = new Date(receivedDate);
  let sep_penalty_amt = 0;

  if (received > filingDeadline) {
    const monthsLate = Math.max(1, differenceInCalendarMonths(received, filingDeadline));
    sep_penalty_amt = Math.round(sep_ss_amt * penaltyRate * monthsLate * 100) / 100;
  }

  // 7. Return results
  return {
    wage_category: weeklyWage,
    category_code: wageCategory.category_code,
    ss_rate_percent: ssRate * 100,        // For display (e.g., 10.00)
    penalty_rate_percent: penaltyRate * 100, // For display (e.g., 5.00)
    weeks_contributed: weeksContributed,
    weekly_contribution: weeklyContribution,
    sep_ss_amt,
    sep_penalty_amt,
    total_due: Math.round((sep_ss_amt + sep_penalty_amt) * 100) / 100,

    // Employer components — ALL NULL for SE/VC
    employer_ss: null,
    employer_eib: null,
    employer_levy: null,
    employer_severance: null,
    employee_levy: null,
  };
}
```

### 11.4 Error Handling Requirements

| Scenario | Action |
|---|---|
| No `wiz_self_emp_contrib_rate` data exists | Display: "SE configuration not synced. Contact SSB." |
| No matching rate for wage_cat + period | Display: "No rate found for category X and period Y." Halt calculation. |
| No `wiz_income_cat` data exists | Display: "Income categories not synced. Contact SSB." |
| Rate lookup returns multiple rows | Use first match (LIMIT 1). Log warning. |

---

## 12. Database Migration Scripts for C3 Wizard

### 12.1 Create Mirror Tables

```sql
-- Migration: Create SE configuration mirror tables for C3 Wizard

-- 1. SE Contribution Rates (mirror of tb_self_emp_contrib_rate)
CREATE TABLE IF NOT EXISTS wiz_self_emp_contrib_rate (
  effstart          TIMESTAMP NOT NULL,
  effend            TIMESTAMP NOT NULL,
  wage_cat          NUMERIC NOT NULL DEFAULT 0.0,
  sep_ss_percent    NUMERIC NOT NULL,
  sep_penalty_percent NUMERIC,
  admin_sync_id     TEXT,
  synced_at         TIMESTAMPTZ DEFAULT NOW(),
  sync_version      TEXT,
  PRIMARY KEY (effstart, effend, wage_cat)
);

-- 2. Income Categories (mirror of tb_income_cat)
CREATE TABLE IF NOT EXISTS wiz_income_cat (
  category_code     VARCHAR NOT NULL PRIMARY KEY,
  wage_upper        NUMERIC,
  appeal            VARCHAR,
  admin_sync_id     TEXT,
  synced_at         TIMESTAMPTZ DEFAULT NOW(),
  sync_version      TEXT
);

-- 3. Grant permissions to service role for sync operations
GRANT INSERT, UPDATE, DELETE ON wiz_self_emp_contrib_rate TO service_role;
GRANT INSERT, UPDATE, DELETE ON wiz_income_cat TO service_role;

-- 4. Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_wiz_se_rate_lookup 
  ON wiz_self_emp_contrib_rate (wage_cat, effstart, effend);
```

### 12.2 Update Sync Log Table

```sql
-- Add SE tracking columns to config sync log
ALTER TABLE wiz_config_sync_log
  ADD COLUMN IF NOT EXISTS se_contrib_rates_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS income_categories_count INTEGER DEFAULT 0;
```

---

## 13. Test Cases

### TC-SE-1: Standard SE Monthly Contribution (Category B, 4 Weeks)

**Input:**
- Wage Category: B ($300/week)
- Period: March 2026
- Paid Codes: ['P', 'P', 'P', 'P', ''] (4 weeks paid)
- Received: April 15, 2026 (on time — before April 30)

**Config Lookup:**
- `wiz_self_emp_contrib_rate` WHERE wage_cat=300, effstart<=2026-03-01, effend>=2026-03-01
- Result: `sep_ss_percent=10.00, sep_penalty_percent=5.00`

**Expected:**
```
ssRate = 10.00 / 100 = 0.10
weeklyContribution = round(300 × 0.10, 2) = $30.00
weeksContributed = 4
sep_ss_amt = 4 × $30.00 = $120.00
isLate = false (April 15 < April 30)
sep_penalty_amt = $0.00
total_due = $120.00

employer_ss = null
employer_eib = null
employer_levy = null
employer_severance = null
employee_levy = null
```

### TC-SE-2: Late Filing with Penalty (Category D, 3 Months Late)

**Input:**
- Wage Category: D ($500/week)
- Period: January 2026
- Paid Codes: ['P', 'P', 'P', 'P', 'P'] (5 weeks paid)
- Received: June 15, 2026 (late — deadline was Feb 28, 2026)

**Config Lookup:**
- Result: `sep_ss_percent=10.00, sep_penalty_percent=5.00`

**Expected:**
```
ssRate = 0.10
weeklyContribution = round(500 × 0.10, 2) = $50.00
weeksContributed = 5
sep_ss_amt = 5 × $50.00 = $250.00
monthsLate = differenceInCalendarMonths(June 15, Feb 28) = 4 (March, April, May, June)
sep_penalty_amt = round($250.00 × 0.05 × 4, 2) = round($50.00, 2) = $50.00
total_due = $250.00 + $50.00 = $300.00
```

### TC-SE-3: Small Category (Category S, 2 Weeks)

**Input:**
- Wage Category: S ($100/week)
- Period: March 2026
- Paid Codes: ['P', 'P', '', '', ''] (2 weeks paid)
- Received: April 20, 2026 (on time)

**Config Lookup:**
- For category wage_cat=100 in period 2026-03-01:
  - Matches: effstart=1984-01-01, effend=2099-12-31, sep_ss_percent=10.00

**Expected:**
```
weeklyContribution = round(100 × 0.10, 2) = $10.00
weeksContributed = 2
sep_ss_amt = 2 × $10.00 = $20.00
sep_penalty_amt = $0.00
total_due = $20.00
```

### TC-SE-4: New Period Rates (Category 1-5, Different Rate)

**Input:**
- Wage Category: wage_cat=3.00 (new-style small categories)
- Period: June 2025
- Paid Codes: ['P', 'P', 'P', '', ''] (3 weeks)
- Received: July 25, 2025

**Config Lookup:**
- Matches: effstart=2020-01-01, effend=2030-12-31, sep_ss_percent=**5.00** (different rate!)

**Expected:**
```
ssRate = 5.00 / 100 = 0.05
weeklyContribution = round(3.00 × 0.05, 2) = $0.15
weeksContributed = 3
sep_ss_amt = 3 × $0.15 = $0.45
sep_penalty_amt = $0.00
total_due = $0.45
```

### TC-SE-5: No Config Found (Error Case)

**Input:**
- Wage Category: Z ($9999/week — does not exist in config)
- Period: March 2026

**Expected:**
```
Error: "No SE contribution rate found for wage category 9999 and period 2026-03-01"
Calculation halted. Warning banner displayed.
```

### TC-SE-6: Sync Verification

**Input:** After SSB Admin publishes v4.1 payload

**Verify on C3 Wizard:**
```sql
SELECT COUNT(*) FROM wiz_self_emp_contrib_rate;
-- Expected: 19 rows (matching SSB Admin)

SELECT COUNT(*) FROM wiz_income_cat;
-- Expected: 14 rows (S through M)

-- Verify rate consistency
SELECT wage_cat, sep_ss_percent, sep_penalty_percent 
FROM wiz_self_emp_contrib_rate 
WHERE wage_cat = 300.00 AND effstart <= '2026-03-01' AND effend >= '2026-03-01';
-- Expected: sep_ss_percent=10.00, sep_penalty_percent=5.00
```

---

## 14. Implementation Checklist

```
Phase 1: Database (Day 1)
  □ Create wiz_self_emp_contrib_rate table on C3 Wizard
  □ Create wiz_income_cat table on C3 Wizard
  □ Grant INSERT/UPDATE/DELETE to service_role
  □ Create indexes for rate lookup queries
  □ Update wiz_config_sync_log with SE count columns

Phase 2: Sync Endpoint (Day 2)
  □ Update C3 Wizard sync endpoint to accept v4.1 payload
  □ Add FULL REPLACE logic for wiz_self_emp_contrib_rate
  □ Add UPSERT logic for wiz_income_cat
  □ Handle backward compatibility (missing SE arrays = skip)
  □ Update sync response to include SE counts

Phase 3: SSB Admin Publish Updates (Day 2)
  □ Update buildSyncPayload() to include SE tables
  □ Update sync_version to '4.1'
  □ Add schema columns to tb_self_emp_contrib_rate (modified_on, last_published_at)
  □ Update useC3SyncStatus() to detect SE table changes
  □ Update C3PublishButton.tsx to show SE counts
  □ Update c3_config_sync_log table with SE count columns

Phase 4: C3 Wizard Calculation Engine (Days 3-4)
  □ Implement getSEContributionRate() using wiz_self_emp_contrib_rate
  □ Implement getIncomeCategories() using wiz_income_cat
  □ Remove ALL hardcoded SE rates
  □ Implement penalty calculation using sep_penalty_percent
  □ Add error handling for missing configuration
  □ Display rate information (ss_rate, penalty_rate) on C3 form

Phase 5: Testing (Day 5)
  □ TC-SE-1: Standard 4-week contribution
  □ TC-SE-2: Late filing with penalty
  □ TC-SE-3: Small category
  □ TC-SE-4: Different rate period
  □ TC-SE-5: Missing config error case
  □ TC-SE-6: Full sync verification
  □ Request SSB Admin to publish v4.1 payload
  □ Verify identical results between Admin and Wizard
```

---

## 15. Glossary & Field Mappings

### 15.1 Table Mapping (SSB Admin → C3 Wizard)

| SSB Admin Table | C3 Wizard Mirror Table | Sync Method |
|---|---|---|
| `tb_self_emp_contrib_rate` | `wiz_self_emp_contrib_rate` | Full replace |
| `tb_income_cat` | `wiz_income_cat` | UPSERT on PK |
| `ip_self_category` | *(local, not synced)* | — |
| `ip_self_weeks_paid` | *(local, not synced)* | — |
| `ip_self_employ` | *(local, not synced)* | — |

### 15.2 Rate Format Convention

| Value in DB | Actual Rate | Usage |
|---|---|---|
| `sep_ss_percent = 10.00` | 10% | Divide by 100: `10.00 / 100 = 0.10` |
| `sep_ss_percent = 5.00` | 5% | Divide by 100: `5.00 / 100 = 0.05` |
| `sep_penalty_percent = 5.00` | 5% | Divide by 100: `5.00 / 100 = 0.05` |

### 15.3 Payer Type Codes

| Code | Description | Rate Source |
|---|---|---|
| `ER` | Employer | `wiz_c3_config_details` (period-based) |
| `SE` | Self-Employed | `wiz_self_emp_contrib_rate` (category + period) |
| `VC` | Voluntary Contributor | `wiz_self_emp_contrib_rate` (same as SE) |

### 15.4 Category Code to Wage Mapping

| Code | Wage Upper ($XCD/week) |
|---|---|
| S | 100 |
| A | 200 |
| B | 300 |
| C | 400 |
| D | 500 |
| E | 600 |
| F | 700 |
| G | 800 |
| H | 900 |
| I | 1,000 |
| J | 1,100 |
| K | 1,200 |
| L | 1,350 |
| M | 1,500 |

### 15.5 Output Fields for SE C3

| Field | Type | Description |
|---|---|---|
| `sep_ss_amt` | Numeric | Total SS contribution for the period |
| `sep_penalty_amt` | Numeric | Late payment penalty (0 if on time) |
| `total_due` | Numeric | `sep_ss_amt + sep_penalty_amt` |
| `employer_ss` | NULL | Does not apply |
| `employer_eib` | NULL | Does not apply |
| `employer_levy` | NULL | Does not apply |
| `employer_severance` | NULL | Does not apply |
| `employee_levy` | NULL | Does not apply |

---

## Document Version History

| Version | Date | Changes |
|---|---|---|
| **1.0** | **2026-03-15** | Initial SE implementation guide — complete configuration, calculation, sync, and publish architecture |

---

**Contact:** For questions about this guide, contact the SSB Admin team.

*End of C3 Wizard Self-Employed Implementation Guide v1.0*
