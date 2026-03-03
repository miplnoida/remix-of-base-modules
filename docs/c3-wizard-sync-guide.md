# C3-Wizard Sync Implementation Guide

> **Version:** 3.0  
> **Last Updated:** 2026-03-03  
> **Author:** Senior Backend Architecture Team  
> **Status:** Implementation Ready — Updated for Bonus & Holiday Pay Policies

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Database Design & SQL Scripts](#2-database-design--sql-scripts)
3. [Sync API Design (C3-Wizard Side)](#3-sync-api-design-c3-wizard-side)
4. [Publish Flow (Admin → C3-Wizard)](#4-publish-flow-admin--c3-wizard)
5. [Calculation Logic Strategy](#5-calculation-logic-strategy)
6. [Migration Guide (v2.0 → v3.0)](#6-migration-guide-v20--v30)
7. [FAQ & Decision Guidance](#7-faq--decision-guidance)

---

## 1. Overview & Architecture

### System Context

```
┌──────────────────────────────┐         ┌──────────────────────────────────┐
│       ADMIN SYSTEM           │         │       C3-WIZARD SYSTEM           │
│   (C3 Configuration)        │         │   (Employer Portal)              │
│                              │         │                                  │
│  c3_config_periods           │  POST   │  wiz_c3_config_periods           │
│  c3_config_details           │ ──────> │  wiz_c3_config_details           │
│  tb_levy_slabs               │  /sync  │  wiz_levy_slabs                  │
│  tb_levy_slab_details        │         │  wiz_levy_slab_details           │
│  c3_bonus_policy_default     │         │  wiz_bonus_policy_default    NEW │
│  c3_bonus_policy_exceptions  │         │  wiz_bonus_policy_exceptions NEW │
│  c3_holiday_pay_policy_default│        │  wiz_holiday_pay_policy_default NEW│
│  c3_holiday_pay_policy_exceptions│     │  wiz_holiday_pay_policy_exceptions NEW│
│  c3_config_sync_log          │         │  wiz_config_sync_log             │
└──────────────────────────────┘         └──────────────────────────────────┘
```

### Key Principles

- **Identical Schemas**: C3-Wizard tables mirror Admin tables exactly (same columns, types, defaults) — zero transformation needed during sync.
- **Idempotent Sync**: Uses `admin_sync_id` (maps to Admin's `id`) as the conflict key for UPSERT operations. Re-publishing the same data is safe.
- **Local Calculations**: C3-Wizard performs all contribution calculations locally using its own synced config tables — no runtime dependency on Admin APIs.
- **Audit Trail**: Every sync is logged on both sides (Admin: `c3_config_sync_log`, Wizard: `wiz_config_sync_log`).

### What Changed in v3.0

| Change | Description |
|---|---|
| **Removed** `wiz_bonus_levy_exemptions` | Old table is deprecated. Bonus handling is now policy-based. |
| **Removed** `bonus_exempt_from_levy`, `bonus_levy_rate` from `wiz_c3_config_details` | These legacy columns are no longer in Admin. Bonus logic is in policy tables. |
| **Added** `employer_eib_max_wage` to `wiz_c3_config_details` | New EIB wage ceiling field. |
| **Added** `wiz_bonus_policy_default` | Full bonus policy with levy/SSC rules, distribution, contribution flags. |
| **Added** `wiz_bonus_policy_exceptions` | Month/year overrides for bonus policy. |
| **Added** `wiz_holiday_pay_policy_default` | Holiday pay policy with separate levy & SSC rules, distribution, severance. |
| **Added** `wiz_holiday_pay_policy_exceptions` | Month/year overrides for holiday pay policy. |
| **Updated** payload format | `bonus_exemptions` array replaced by `bonus_policies`, `bonus_exceptions`, `holiday_policies`, `holiday_exceptions`. |

---

## 2. Database Design & SQL Scripts

### 2.1 Admin Source Tables (Current)

| Admin Table | Purpose |
|---|---|
| `c3_config_periods` | Period definitions (date ranges, active flag) |
| `c3_config_details` | All rates, age limits, thresholds (1:1 with period) — includes `employer_eib_max_wage` |
| `tb_levy_slabs` | Levy slab header (date range, active flag) |
| `tb_levy_slab_details` | Levy bracket rows (over_amt, base_amt, tax_rate) |
| `c3_bonus_policy_default` | Default bonus policy: levy/severance inclusion, calculation method, distribution, contribution flags |
| `c3_bonus_policy_exceptions` | Month/year overrides for bonus policy |
| `c3_holiday_pay_policy_default` | Default holiday pay policy: policy type, distribution, levy/SSC/severance rules |
| `c3_holiday_pay_policy_exceptions` | Month/year overrides for holiday pay policy |
| `c3_config_sync_log` | Publish history (payload, status, hash) |

### 2.2 C3-Wizard Mirror Tables — SQL Scripts

> **IMPORTANT**: These scripts are for the **C3-Wizard database** (separate from Admin). Each table adds `admin_sync_id` (UNIQUE), `synced_at`, and `sync_version` for tracking.

#### Table 1: `wiz_c3_config_periods` (No changes from v2.0)

```sql
-- Already exists. No migration needed.
```

#### Table 2: `wiz_c3_config_details` (UPDATED — add `employer_eib_max_wage`, remove legacy bonus fields)

```sql
-- Migration: Add new column and remove deprecated columns
ALTER TABLE public.wiz_c3_config_details 
  ADD COLUMN IF NOT EXISTS employer_eib_max_wage NUMERIC DEFAULT 6500.00 NOT NULL;

-- Remove deprecated bonus columns (no longer in Admin schema)
ALTER TABLE public.wiz_c3_config_details 
  DROP COLUMN IF EXISTS bonus_exempt_from_levy,
  DROP COLUMN IF EXISTS bonus_levy_rate;
```

**Full column list after migration:**
- `id`, `config_period_id`, `admin_sync_id`
- Age: `min_age_ss`, `max_age_ss`, `min_age_levy`, `max_age_levy`
- Employee SS: `employee_ss_rate`, `employee_ss_max_wage`
- Employer: `employer_ss_rate`, `employer_eib_rate`, `employer_eib_max_wage` (NEW), `employer_ss_max_wage`, `employer_levy_rate`, `employer_severance_rate`
- Submission: `submission_due_day`
- Penalties: `levy_penalty_initial_rate`, `levy_penalty_subsequent_rate`, `severance_penalty_initial_rate`, `severance_penalty_subsequent_rate`, `ss_fine_initial_rate`, `ss_fine_subsequent_rate`
- Levy Threshold: `levy_slab_id`, `levy_monthly_threshold`, `levy_use_monthly_when_exceeded`
- Audit: `created_by`, `created_on`, `modified_by`, `modified_on`, `synced_at`, `sync_version`

#### Table 3: `wiz_levy_slabs` (No changes from v2.0)

```sql
-- Already exists. No migration needed.
```

#### Table 4: `wiz_levy_slab_details` (No changes from v2.0)

```sql
-- Already exists. No migration needed.
```

#### Table 5: `wiz_bonus_policy_default` (NEW — replaces `wiz_bonus_levy_exemptions`)

```sql
-- =============================================================
-- C3-Wizard: Bonus Policy Default (mirrors c3_bonus_policy_default)
-- =============================================================
CREATE TABLE public.wiz_bonus_policy_default (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_sync_id         UUID NOT NULL UNIQUE,

  -- Levy & Severance
  include_in_levy       BOOLEAN NOT NULL DEFAULT true,
  include_in_severance  BOOLEAN NOT NULL DEFAULT false,
  contrib_severance     BOOLEAN NOT NULL DEFAULT false,

  -- Calculation Method
  calculation_method    TEXT NOT NULL DEFAULT 'merge',   -- 'merge' or 'separate'
  calc_flat_enabled     BOOLEAN NOT NULL DEFAULT false,
  calc_flat_percentage  NUMERIC,
  calc_slab_enabled     BOOLEAN NOT NULL DEFAULT true,

  -- Distribution (JSONB: weekly/biweekly/semimonthly/monthly radio selections)
  distribution          JSONB NOT NULL DEFAULT '{"weekly":{"w1":false,"w2":false,"w3":false,"w4":false,"divide":false},"monthly":{"m1":true},"biweekly":{"b1":false,"b2":false,"divide":true},"semimonthly":{"s1":false,"s2":false,"divide":false}}',

  -- Bonus Amount Range
  min_bonus_amount      NUMERIC DEFAULT 1000,
  max_bonus_amount      NUMERIC DEFAULT 75000,

  -- SSC Contribution Flags
  contrib_employee      BOOLEAN NOT NULL DEFAULT true,
  contrib_employer      BOOLEAN NOT NULL DEFAULT true,
  contrib_eir           BOOLEAN NOT NULL DEFAULT false,

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

CREATE INDEX idx_wiz_bonus_policy_default_active ON public.wiz_bonus_policy_default(is_active);
CREATE INDEX idx_wiz_bonus_policy_default_dates ON public.wiz_bonus_policy_default(date_from, date_to);
CREATE INDEX idx_wiz_bonus_policy_default_sync ON public.wiz_bonus_policy_default(admin_sync_id);
```

#### Table 6: `wiz_bonus_policy_exceptions` (NEW)

```sql
-- =============================================================
-- C3-Wizard: Bonus Policy Exceptions (mirrors c3_bonus_policy_exceptions)
-- =============================================================
CREATE TABLE public.wiz_bonus_policy_exceptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_sync_id         UUID NOT NULL UNIQUE,

  -- Exception Scope
  date_from             TEXT NOT NULL,
  date_to               TEXT,
  exception_type        TEXT NOT NULL DEFAULT 'onetime',  -- 'onetime' or 'recurring'
  exception_month       INTEGER NOT NULL DEFAULT 1,
  year_from             INTEGER NOT NULL DEFAULT 2025,
  year_to               INTEGER,

  -- Override Flags (NULL = inherit from default)
  override_default      BOOLEAN NOT NULL DEFAULT false,
  include_in_levy       BOOLEAN,
  include_in_severance  BOOLEAN,
  calculation_method    TEXT,
  calc_flat_enabled     BOOLEAN,
  calc_flat_percentage  NUMERIC,
  calc_slab_enabled     BOOLEAN,
  distribution          JSONB,
  min_bonus_amount      NUMERIC,
  max_bonus_amount      NUMERIC,
  contrib_employee      BOOLEAN,
  contrib_employer      BOOLEAN,
  contrib_eir           BOOLEAN,
  contrib_severance     BOOLEAN,

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

CREATE INDEX idx_wiz_bonus_exc_active ON public.wiz_bonus_policy_exceptions(is_active);
CREATE INDEX idx_wiz_bonus_exc_period ON public.wiz_bonus_policy_exceptions(exception_month, year_from);
CREATE INDEX idx_wiz_bonus_exc_sync ON public.wiz_bonus_policy_exceptions(admin_sync_id);
```

#### Table 7: `wiz_holiday_pay_policy_default` (NEW)

```sql
-- =============================================================
-- C3-Wizard: Holiday Pay Policy Default (mirrors c3_holiday_pay_policy_default)
-- =============================================================
CREATE TABLE public.wiz_holiday_pay_policy_default (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_sync_id             UUID NOT NULL UNIQUE,

  -- Policy Type
  policy_type               TEXT NOT NULL DEFAULT 'without_dates',  -- 'with_dates' or 'without_dates'
  distribution_enabled      BOOLEAN NOT NULL DEFAULT true,

  -- Levy Rules
  levy_include              BOOLEAN NOT NULL DEFAULT true,
  levy_calculation_method   TEXT NOT NULL DEFAULT 'merge',
  levy_calc_flat_enabled    BOOLEAN NOT NULL DEFAULT false,
  levy_calc_flat_percentage NUMERIC,
  levy_calc_slab_enabled    BOOLEAN NOT NULL DEFAULT false,
  levy_distribution         JSONB NOT NULL DEFAULT '{"weekly":{"w1":false,"w2":false,"w3":false,"w4":false,"divide":false},"monthly":{"m1":true},"biweekly":{"b1":false,"b2":false,"divide":true},"semimonthly":{"s1":false,"s2":false,"divide":false}}',

  -- SSC Rules
  ssc_include               BOOLEAN NOT NULL DEFAULT true,
  ssc_contrib_employee      BOOLEAN NOT NULL DEFAULT true,
  ssc_contrib_employer      BOOLEAN NOT NULL DEFAULT true,
  ssc_contrib_eib           BOOLEAN NOT NULL DEFAULT false,

  -- Severance
  include_in_severance      BOOLEAN NOT NULL DEFAULT false,

  -- Amount Range
  min_holiday_amount        NUMERIC,
  max_holiday_amount        NUMERIC,

  -- Validity
  date_from                 DATE NOT NULL DEFAULT CURRENT_DATE,
  date_to                   DATE,
  is_active                 BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_by                TEXT,
  created_on                TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by               TEXT,
  modified_on               TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at                 TIMESTAMPTZ DEFAULT now(),
  sync_version              TEXT
);

CREATE INDEX idx_wiz_holiday_policy_active ON public.wiz_holiday_pay_policy_default(is_active);
CREATE INDEX idx_wiz_holiday_policy_dates ON public.wiz_holiday_pay_policy_default(date_from, date_to);
CREATE INDEX idx_wiz_holiday_policy_sync ON public.wiz_holiday_pay_policy_default(admin_sync_id);
```

#### Table 8: `wiz_holiday_pay_policy_exceptions` (NEW)

```sql
-- =============================================================
-- C3-Wizard: Holiday Pay Policy Exceptions (mirrors c3_holiday_pay_policy_exceptions)
-- =============================================================
CREATE TABLE public.wiz_holiday_pay_policy_exceptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_sync_id             UUID NOT NULL UNIQUE,

  -- Exception Scope
  date_from                 DATE NOT NULL,
  date_to                   DATE,
  exception_type            TEXT NOT NULL DEFAULT 'onetime',
  exception_month           INTEGER NOT NULL,
  year_from                 INTEGER NOT NULL,
  year_to                   INTEGER,

  -- Policy Type Override
  policy_type               TEXT NOT NULL DEFAULT 'without_dates',
  override_default          BOOLEAN NOT NULL DEFAULT false,

  -- Levy Overrides (NULL = inherit from default)
  levy_include              BOOLEAN,
  levy_calculation_method   TEXT,
  levy_calc_flat_enabled    BOOLEAN,
  levy_calc_flat_percentage NUMERIC,
  levy_calc_slab_enabled    BOOLEAN,
  levy_distribution         JSONB,

  -- SSC Overrides
  ssc_include               BOOLEAN,
  ssc_contrib_employee      BOOLEAN,
  ssc_contrib_employer      BOOLEAN,
  ssc_contrib_eib           BOOLEAN,

  -- Other Overrides
  distribution_enabled      BOOLEAN,
  include_in_severance      BOOLEAN,
  min_holiday_amount        NUMERIC,
  max_holiday_amount        NUMERIC,

  -- Metadata
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  description               TEXT,
  created_by                TEXT,
  created_on                TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by               TEXT,
  modified_on               TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at                 TIMESTAMPTZ DEFAULT now(),
  sync_version              TEXT
);

CREATE INDEX idx_wiz_holiday_exc_active ON public.wiz_holiday_pay_policy_exceptions(is_active);
CREATE INDEX idx_wiz_holiday_exc_period ON public.wiz_holiday_pay_policy_exceptions(exception_month, year_from);
CREATE INDEX idx_wiz_holiday_exc_sync ON public.wiz_holiday_pay_policy_exceptions(admin_sync_id);
```

#### Sync Log Update

```sql
-- Add new count columns to wiz_config_sync_log
ALTER TABLE public.wiz_config_sync_log
  ADD COLUMN IF NOT EXISTS bonus_policies_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_exceptions_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS holiday_policies_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS holiday_exceptions_count INTEGER DEFAULT 0;
```

#### Deprecate Old Table

```sql
-- Rename deprecated table to prevent accidental usage
ALTER TABLE IF EXISTS public.wiz_bonus_levy_exemptions 
  RENAME TO nu_wiz_bonus_levy_exemptions;
```

### 2.3 Schema Mapping Reference (v3.0)

| Admin Table | Admin Column | Wizard Table | Wizard Column | Notes |
|---|---|---|---|---|
| `c3_config_periods` | `id` | `wiz_c3_config_periods` | `admin_sync_id` | UPSERT key |
| `c3_config_details` | `id` | `wiz_c3_config_details` | `admin_sync_id` | UPSERT key |
| `c3_config_details` | `config_period_id` | `wiz_c3_config_details` | `config_period_id` | Re-mapped to Wizard period ID |
| `c3_config_details` | `employer_eib_max_wage` | `wiz_c3_config_details` | `employer_eib_max_wage` | **NEW** in v3.0 |
| `tb_levy_slabs` | `id` | `wiz_levy_slabs` | `admin_sync_id` | UPSERT key |
| `tb_levy_slab_details` | `id` | `wiz_levy_slab_details` | `admin_sync_id` | UPSERT key |
| `tb_levy_slab_details` | `slab_id` | `wiz_levy_slab_details` | `slab_id` | Re-mapped to Wizard slab ID |
| `c3_bonus_policy_default` | `id` | `wiz_bonus_policy_default` | `admin_sync_id` | **NEW** table in v3.0 |
| `c3_bonus_policy_exceptions` | `id` | `wiz_bonus_policy_exceptions` | `admin_sync_id` | **NEW** table in v3.0 |
| `c3_holiday_pay_policy_default` | `id` | `wiz_holiday_pay_policy_default` | `admin_sync_id` | **NEW** table in v3.0 |
| `c3_holiday_pay_policy_exceptions` | `id` | `wiz_holiday_pay_policy_exceptions` | `admin_sync_id` | **NEW** table in v3.0 |

> **Key Point**: All business columns are identical — no transformation. Only the `id` → `admin_sync_id` mapping and parent FK re-mapping are needed.

---

## 3. Sync API Design (C3-Wizard Side)

### 3.1 API Endpoint

```
POST /functions/v1/c3-config-sync
Content-Type: application/json
x-sync-api-key: <the shared C3_CONFIG_SYNC_API_KEY value>
```

### 3.2 Request Payload Format (v3.0)

```json
{
  "sync_version": "2026-03-03T12:00:00.000Z",
  "config_periods": [
    {
      "id": "<admin c3_config_periods.id>",
      "start_date": "2026-01-01",
      "end_date": "2026-12-31",
      "description": "2026 Active Period",
      "is_active": true,
      "created_by": "ADM01",
      "created_on": "2026-01-15T10:00:00Z",
      "modified_by": "ADM01",
      "modified_on": "2026-02-20T14:30:00Z",
      "details": {
        "id": "<admin c3_config_details.id>",
        "config_period_id": "<same as parent>",
        "min_age_ss": 16,
        "max_age_ss": 62,
        "min_age_levy": 16,
        "max_age_levy": 62,
        "employee_ss_rate": 0.05,
        "employee_ss_max_wage": 6500.00,
        "employer_ss_rate": 0.05,
        "employer_eib_rate": 0.01,
        "employer_eib_max_wage": 6500.00,
        "employer_ss_max_wage": 6500.00,
        "employer_levy_rate": 0.03,
        "employer_severance_rate": 0.01,
        "submission_due_day": 0,
        "levy_penalty_initial_rate": 0.10,
        "levy_penalty_subsequent_rate": 0.01,
        "severance_penalty_initial_rate": 0.10,
        "severance_penalty_subsequent_rate": 0.01,
        "ss_fine_initial_rate": 0.05,
        "ss_fine_subsequent_rate": 0.05,
        "levy_slab_id": "<admin tb_levy_slabs.id or null>",
        "levy_monthly_threshold": 6500,
        "levy_use_monthly_when_exceeded": true
      }
    }
  ],
  "levy_slabs": [
    {
      "id": "<admin tb_levy_slabs.id>",
      "start_date": "2026-01-01",
      "end_date": "2026-12-31",
      "is_active": true,
      "details": [
        {
          "id": "<admin tb_levy_slab_details.id>",
          "slab_id": "<parent slab id>",
          "pay_period": "W",
          "over_amt": 0,
          "base_amt": 0,
          "tax_rate": 0.00,
          "order_no": 1,
          "is_active": true
        }
      ]
    }
  ],
  "bonus_policies": [
    {
      "id": "<admin c3_bonus_policy_default.id>",
      "include_in_levy": true,
      "include_in_severance": false,
      "contrib_severance": false,
      "calculation_method": "merge",
      "calc_flat_enabled": false,
      "calc_flat_percentage": null,
      "calc_slab_enabled": true,
      "distribution": {"weekly":{"w1":false,...},"monthly":{"m1":true},...},
      "min_bonus_amount": 1000,
      "max_bonus_amount": 75000,
      "contrib_employee": true,
      "contrib_employer": true,
      "contrib_eir": false,
      "date_from": "2026-01-01",
      "date_to": null,
      "is_active": true
    }
  ],
  "bonus_exceptions": [
    {
      "id": "<admin c3_bonus_policy_exceptions.id>",
      "date_from": "2026-12-01",
      "date_to": "2026-12-31",
      "exception_type": "onetime",
      "exception_month": 12,
      "year_from": 2026,
      "year_to": null,
      "override_default": true,
      "include_in_levy": false,
      "include_in_severance": null,
      "calculation_method": null,
      "distribution": null,
      "contrib_employee": null,
      "contrib_employer": null,
      "contrib_eir": null,
      "contrib_severance": null,
      "is_active": true,
      "description": "December bonus exempt from levy"
    }
  ],
  "holiday_policies": [
    {
      "id": "<admin c3_holiday_pay_policy_default.id>",
      "policy_type": "without_dates",
      "distribution_enabled": true,
      "levy_include": true,
      "levy_calculation_method": "merge",
      "levy_calc_flat_enabled": false,
      "levy_calc_flat_percentage": null,
      "levy_calc_slab_enabled": false,
      "levy_distribution": {"weekly":{...},"monthly":{...},...},
      "ssc_include": true,
      "ssc_contrib_employee": true,
      "ssc_contrib_employer": true,
      "ssc_contrib_eib": false,
      "include_in_severance": false,
      "min_holiday_amount": null,
      "max_holiday_amount": null,
      "date_from": "2026-01-01",
      "date_to": null,
      "is_active": true
    }
  ],
  "holiday_exceptions": [
    {
      "id": "<admin c3_holiday_pay_policy_exceptions.id>",
      "date_from": "2026-06-01",
      "date_to": "2026-06-30",
      "exception_type": "onetime",
      "exception_month": 6,
      "year_from": 2026,
      "year_to": null,
      "policy_type": "without_dates",
      "override_default": true,
      "levy_include": false,
      "ssc_include": null,
      "distribution_enabled": null,
      "include_in_severance": null,
      "is_active": true,
      "description": "June holiday pay exempt from levy"
    }
  ]
}
```

### 3.3 Response Format

**Success (200):**
```json
{
  "status": "success",
  "sync_version": "2026-03-03T12:00:00.000Z",
  "applied": {
    "config_periods": 1,
    "config_details": 1,
    "levy_slabs": 1,
    "levy_slab_details": 4,
    "bonus_policies": 1,
    "bonus_exceptions": 1,
    "holiday_policies": 1,
    "holiday_exceptions": 1
  },
  "log_id": "uuid"
}
```

**Duplicate (200 — idempotent, no DB changes):**
```json
{
  "status": "duplicate",
  "message": "Payload already applied (matching hash)",
  "existing_log_id": "uuid"
}
```

### 3.4 UPSERT Processing Order

```
1. UPSERT wiz_c3_config_periods (using admin id → admin_sync_id)
2. UPSERT wiz_c3_config_details (re-map config_period_id to wizard period ID)
3. UPSERT wiz_levy_slabs
4. UPSERT wiz_levy_slab_details (re-map slab_id to wizard slab ID)
5. UPSERT wiz_bonus_policy_default (direct 1:1 mapping)
6. UPSERT wiz_bonus_policy_exceptions (direct 1:1 mapping)
7. UPSERT wiz_holiday_pay_policy_default (direct 1:1 mapping)
8. UPSERT wiz_holiday_pay_policy_exceptions (direct 1:1 mapping)
```

Steps 5-8 are simple direct UPSERTs — no parent-child FK re-mapping needed since these are standalone tables.

---

## 4. Publish Flow (Admin → C3-Wizard)

### 4.1 Step-by-Step Flow

```
Step 1: Admin User clicks "Publish to C3-Wizard" button
          │
Step 2: Confirmation dialog shows payload summary
        (X periods, Y slabs, Z bonus policies, W holiday policies, ...)
          │
Step 3: Admin frontend calls buildSyncPayload()
        - Fetches all active c3_config_periods + c3_config_details
        - Fetches all active tb_levy_slabs + tb_levy_slab_details
        - Fetches all active c3_bonus_policy_default
        - Fetches all active c3_bonus_policy_exceptions
        - Fetches all active c3_holiday_pay_policy_default
        - Fetches all active c3_holiday_pay_policy_exceptions
        - Generates payload_hash for deduplication
          │
Step 4: Insert c3_config_sync_log entry with status='pending'
          │
Step 5: POST payload to C3-Wizard sync API
        POST ${C3_WIZARD_API_URL}/functions/v1/c3-config-sync
        x-sync-api-key: <API_KEY>
        Body: { sync_version, config_periods, levy_slabs,
                bonus_policies, bonus_exceptions,
                holiday_policies, holiday_exceptions }
          │
Step 6: C3-Wizard processes the payload:
        a. Check payload_hash against last successful sync (dedup)
        b. Log received sync in wiz_config_sync_log
        c. Begin transaction:
           - UPSERT wiz_c3_config_periods
           - UPSERT wiz_c3_config_details (with FK re-mapping)
           - UPSERT wiz_levy_slabs
           - UPSERT wiz_levy_slab_details (with FK re-mapping)
           - UPSERT wiz_bonus_policy_default
           - UPSERT wiz_bonus_policy_exceptions
           - UPSERT wiz_holiday_pay_policy_default
           - UPSERT wiz_holiday_pay_policy_exceptions
        d. Commit transaction
        e. Update wiz_config_sync_log status → 'applied'
          │
Step 7: Admin receives success response:
        a. Update c3_config_sync_log status → 'success'
        b. Update last_published_at on ALL config tables
        c. UI shows "Synced" badge with timestamp
        d. Toast notification with counts
```

### 4.2 Error Handling

| Scenario | Admin Behavior | C3-Wizard Behavior |
|---|---|---|
| Network timeout | Set sync_log status='failed', show error toast | No action (never received) |
| 4xx validation error | Log error_message, show specific field errors | Return validation details, log attempt |
| 5xx server error | Set status='failed', allow retry | Log error, rollback transaction |
| Duplicate payload | Set status='success' (idempotent) | Return 'duplicate' status, no DB changes |
| Partial failure | Set status='failed' with error details | Rollback entire transaction (atomic) |

---

## 5. Calculation Logic Strategy

### 5.1 Bonus Calculation (using wiz_bonus_policy_default + exceptions)

```
1. Resolve policy: Check wiz_bonus_policy_exceptions for the filing month/year
   - If exception exists with override_default=true, use overridden fields
   - Otherwise, fall back to wiz_bonus_policy_default
2. Check capping: If bonus < min_bonus_amount or > max_bonus_amount, skip inclusion
3. Apply calculation_method:
   - 'merge': Distribute bonus into weekly wages using distribution config
   - 'separate': Apply flat rate (calc_flat_percentage) and/or slab calculation
4. Levy: If include_in_levy=true, apply levy brackets
5. SSC: Based on contrib_employee, contrib_employer, contrib_eir flags
6. Severance: If contrib_severance=true, apply employer_severance_rate
```

### 5.2 Holiday Pay Calculation (using wiz_holiday_pay_policy_default + exceptions)

```
1. Resolve policy: Check wiz_holiday_pay_policy_exceptions for the filing month/year
2. Check policy_type:
   - 'with_dates': If distribution_enabled=true, distribute holiday pay across weeks
     spanned by the dates. All specific rules (levy/SSC/severance) are IGNORED;
     distributed amounts are added to regular weekly wages.
   - 'without_dates': Treat as current-period income, apply specific rules:
     a. Levy: Based on levy_include, levy_calculation_method, levy_distribution
     b. SSC: Based on ssc_include, ssc_contrib_employee/employer/eib
     c. Severance: Based on include_in_severance
3. Amount capping: Enforce min_holiday_amount / max_holiday_amount if set
```

### 5.3 Config Lookup Pattern (Updated)

```typescript
// Get bonus policy for a given filing period
async function getBonusPolicy(filingYear: number, filingMonth: number) {
  // Check for exception first
  const { data: exception } = await supabase
    .from('wiz_bonus_policy_exceptions')
    .select('*')
    .eq('is_active', true)
    .eq('exception_month', filingMonth)
    .lte('year_from', filingYear)
    .or(`year_to.gte.${filingYear},year_to.is.null`)
    .single();

  if (exception?.override_default) {
    return { ...await getDefaultBonusPolicy(), ...filterNulls(exception) };
  }

  return await getDefaultBonusPolicy();
}

// Same pattern for holiday pay policy
async function getHolidayPayPolicy(filingYear: number, filingMonth: number) {
  // Check exception → fallback to default
}
```

---

## 6. Migration Guide (v2.0 → v3.0)

### For C3-Wizard Team: Step-by-Step

1. **Run the migration scripts** from Section 2.2 above in this order:
   - Update `wiz_c3_config_details` (add `employer_eib_max_wage`, remove legacy bonus columns)
   - Create `wiz_bonus_policy_default`
   - Create `wiz_bonus_policy_exceptions`
   - Create `wiz_holiday_pay_policy_default`
   - Create `wiz_holiday_pay_policy_exceptions`
   - Update `wiz_config_sync_log` (add new count columns)
   - Rename `wiz_bonus_levy_exemptions` to `nu_wiz_bonus_levy_exemptions`

2. **Update the `c3-config-sync` edge function** to:
   - Accept the new payload arrays: `bonus_policies`, `bonus_exceptions`, `holiday_policies`, `holiday_exceptions`
   - UPSERT into the 4 new tables
   - Remove handling for `bonus_exemptions` array
   - Include `employer_eib_max_wage` in config_details UPSERT
   - Log new counts in `wiz_config_sync_log`

3. **Update `calculate-c3-contributions` function** to:
   - Read from `wiz_bonus_policy_default` + `wiz_bonus_policy_exceptions` instead of `wiz_bonus_levy_exemptions`
   - Read from `wiz_holiday_pay_policy_default` + `wiz_holiday_pay_policy_exceptions` for holiday rules
   - Use `employer_eib_max_wage` for EIB wage ceiling calculations
   - Remove references to `bonus_exempt_from_levy` and `bonus_levy_rate`

4. **Request Admin to publish** — After migration, the Admin team must publish configuration so the new `wiz_` tables get populated.

### Validation Checklist Before Publishing

| Check | Description |
|---|---|
| ✅ At least one active config period | `c3_config_periods WHERE is_active = true` |
| ✅ Each period has details | Every active period has a linked `c3_config_details` |
| ✅ Levy slabs have details | Each active slab has at least one `tb_levy_slab_details` row |
| ✅ Bonus policy exists | At least one active `c3_bonus_policy_default` record |
| ✅ Holiday pay policy exists | At least one active `c3_holiday_pay_policy_default` record |
| ✅ Rates are in decimal form | e.g., 5% = `0.05`, not `5` |

---

## 7. FAQ & Decision Guidance

### Q: What happened to `bonus_exempt_from_levy` and `bonus_levy_rate`?

**A**: These legacy fields in `c3_config_details` have been replaced by the full bonus policy system (`c3_bonus_policy_default` + exceptions). The policy system provides:
- Month/year-specific overrides via exceptions
- Separate calculation methods (merge vs. separate)
- Per-component contribution flags (employee, employer, EIB, severance)
- Distribution rules per payroll cycle
- Amount range capping

### Q: What happened to `wiz_bonus_levy_exemptions`?

**A**: This table is deprecated and renamed to `nu_wiz_bonus_levy_exemptions`. Its simple `is_exempt` flag per month/year has been replaced by the comprehensive `wiz_bonus_policy_default` + `wiz_bonus_policy_exceptions` system.

### Q: Do the interest rate fields still exist?

**A**: The `interest_rate_*` fields (`interest_rate_ss_principal`, `interest_rate_levy_principal`, etc.) are **not present** in the current Admin `c3_config_details` schema. If they existed in the Wizard table from v2.0, they should be kept for backward compatibility but will receive `0.00` values. They may be re-added in a future version.

### Q: How does holiday pay distribution work with pending pay?

**A**: When `policy_type = 'with_dates'` and `distribution_enabled = true`:
1. Holiday pay is split equally across weeks spanned by the provided dates
2. Portions allocated to **future months** are stored in Admin's `c3_pending_holiday_pay` table
3. These pending amounts are automatically applied during future C3 submissions for that SSN/period
4. The C3-Wizard does NOT need a `c3_pending_holiday_pay` mirror — pending pay tracking is managed by the Admin system

---

## Appendix: File References

| File | Purpose |
|---|---|
| `src/hooks/useC3ConfigPublish.ts` | Admin: Sync status, payload builder, publish mutation |
| `src/components/admin/c3-configuration/C3PublishButton.tsx` | Admin: Publish button UI with confirmation dialog |
| `src/components/admin/c3-configuration/C3SyncHistoryTab.tsx` | Admin: Sync history view |
| `docs/c3-wizard-sync-guide.md` | This document |

---

*End of C3-Wizard Sync Implementation Guide v3.0*
