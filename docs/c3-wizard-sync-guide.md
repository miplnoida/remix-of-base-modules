# C3-Wizard Sync Implementation Guide

> **Version:** 1.0  
> **Last Updated:** 2026-02-25  
> **Author:** Senior Backend Architecture Team  
> **Status:** Implementation Ready

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Database Design & SQL Scripts](#2-database-design--sql-scripts)
3. [Sync API Design (C3-Wizard Side)](#3-sync-api-design-c3-wizard-side)
4. [Publish Flow (Admin → C3-Wizard)](#4-publish-flow-admin--c3-wizard)
5. [Calculation Logic Strategy](#5-calculation-logic-strategy)
6. [FAQ & Decision Guidance](#6-faq--decision-guidance)

---

## 1. Overview & Architecture

### System Context

```
┌─────────────────────────┐         ┌──────────────────────────┐
│     ADMIN SYSTEM        │         │     C3-WIZARD SYSTEM     │
│  (C3 Configuration)     │         │  (Employer Portal)       │
│                         │         │                          │
│  c3_config_periods      │  POST   │  wiz_c3_config_periods   │
│  c3_config_details      │ ──────> │  wiz_c3_config_details   │
│  tb_levy_slabs          │  /sync  │  wiz_levy_slabs          │
│  tb_levy_slab_details   │         │  wiz_levy_slab_details   │
│  c3_bonus_levy_exemptions│        │  wiz_bonus_levy_exemptions│
│  c3_config_sync_log     │         │  wiz_config_sync_log     │
└─────────────────────────┘         └──────────────────────────┘
```

### Key Principles

- **Identical Schemas**: C3-Wizard tables mirror Admin tables exactly (same columns, types, defaults) — zero transformation needed during sync.
- **Idempotent Sync**: Uses `admin_sync_id` (maps to Admin's `id`) as the conflict key for UPSERT operations. Re-publishing the same data is safe.
- **Local Calculations**: C3-Wizard performs all contribution calculations locally using its own synced config tables — no runtime dependency on Admin APIs.
- **Audit Trail**: Every sync is logged on both sides (Admin: `c3_config_sync_log`, Wizard: `wiz_config_sync_log`).

---

## 2. Database Design & SQL Scripts

### 2.1 Admin Source Tables (Already Exist)

| Admin Table | Purpose |
|---|---|
| `c3_config_periods` | Period definitions (date ranges, active flag) |
| `c3_config_details` | All rates, age limits, thresholds (1:1 with period) |
| `tb_levy_slabs` | Levy slab header (date range, active flag) |
| `tb_levy_slab_details` | Levy bracket rows (over_amt, base_amt, tax_rate) |
| `c3_bonus_levy_exemptions` | Month/year exemption flags for bonus levy |
| `c3_config_sync_log` | Publish history (payload, status, hash) |

### 2.2 C3-Wizard Mirror Tables — SQL Scripts

> **IMPORTANT**: These scripts are for the **C3-Wizard database** (separate from Admin). Each table adds an `admin_sync_id` column (UNIQUE) that maps to the Admin table's `id`, plus `synced_at` and `sync_version` for tracking.

#### Table 1: `wiz_c3_config_periods`

```sql
-- =============================================================
-- C3-Wizard: Configuration Periods (mirrors c3_config_periods)
-- =============================================================
CREATE TABLE public.wiz_c3_config_periods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_sync_id   UUID NOT NULL UNIQUE,          -- Maps to Admin c3_config_periods.id
  start_date      DATE NOT NULL,
  end_date        DATE,
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_by      VARCHAR(5),
  created_on      TIMESTAMPTZ DEFAULT now(),
  modified_by     VARCHAR(5),
  modified_on     TIMESTAMPTZ DEFAULT now(),
  synced_at       TIMESTAMPTZ DEFAULT now(),     -- When this row was last synced
  sync_version    TEXT                            -- Sync batch version identifier
);

CREATE INDEX idx_wiz_config_periods_active ON public.wiz_c3_config_periods(is_active);
CREATE INDEX idx_wiz_config_periods_dates ON public.wiz_c3_config_periods(start_date, end_date);
CREATE INDEX idx_wiz_config_periods_sync ON public.wiz_c3_config_periods(admin_sync_id);
```

#### Table 2: `wiz_c3_config_details`

```sql
-- =============================================================
-- C3-Wizard: Configuration Details (mirrors c3_config_details)
-- Exact same columns as Admin — zero transformation required
-- =============================================================
CREATE TABLE public.wiz_c3_config_details (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_period_id                UUID NOT NULL REFERENCES public.wiz_c3_config_periods(id) ON DELETE CASCADE,
  admin_sync_id                   UUID NOT NULL UNIQUE,  -- Maps to Admin c3_config_details.id

  -- Age Limits
  min_age_ss                      INTEGER DEFAULT 16,
  max_age_ss                      INTEGER DEFAULT 62,
  min_age_levy                    INTEGER DEFAULT 16,
  max_age_levy                    INTEGER DEFAULT 62,

  -- Bonus Levy
  bonus_exempt_from_levy          BOOLEAN DEFAULT false,
  bonus_levy_rate                 NUMERIC DEFAULT 0.035,

  -- Employee Social Security
  employee_ss_rate                NUMERIC DEFAULT 0.05,
  employee_ss_max_wage            NUMERIC DEFAULT 6500.00,

  -- Employer Contributions
  employer_ss_rate                NUMERIC DEFAULT 0.05,
  employer_eib_rate               NUMERIC DEFAULT 0.01,
  employer_ss_max_wage            NUMERIC DEFAULT 6500.00,
  employer_levy_rate              NUMERIC DEFAULT 0.03,
  employer_severance_rate         NUMERIC DEFAULT 0.01,

  -- Submission
  submission_due_day              INTEGER DEFAULT 0,

  -- Penalty Rates
  levy_penalty_initial_rate       NUMERIC DEFAULT 0.10,
  levy_penalty_subsequent_rate    NUMERIC DEFAULT 0.01,
  severance_penalty_initial_rate  NUMERIC DEFAULT 0.10,
  severance_penalty_subsequent_rate NUMERIC DEFAULT 0.01,

  -- SS Fines
  ss_fine_initial_rate            NUMERIC DEFAULT 0.05,
  ss_fine_subsequent_rate         NUMERIC DEFAULT 0.05,

  -- Interest Rates
  interest_rate_ss_principal      NUMERIC DEFAULT 0.00,
  interest_rate_levy_principal    NUMERIC DEFAULT 0.00,
  interest_rate_severance_principal NUMERIC DEFAULT 0.00,
  interest_rate_penalties         NUMERIC DEFAULT 0.00,
  interest_rate_fines             NUMERIC DEFAULT 0.00,

  -- Levy Slab Reference
  levy_slab_id                    UUID,  -- Will reference wiz_levy_slabs after sync

  -- Levy Threshold
  levy_monthly_threshold          NUMERIC DEFAULT 6500,
  levy_use_monthly_when_exceeded  BOOLEAN DEFAULT false,

  -- Audit
  created_by                      VARCHAR(5),
  created_on                      TIMESTAMPTZ DEFAULT now(),
  modified_by                     VARCHAR(5),
  modified_on                     TIMESTAMPTZ DEFAULT now(),
  synced_at                       TIMESTAMPTZ DEFAULT now(),
  sync_version                    TEXT
);

CREATE INDEX idx_wiz_config_details_period ON public.wiz_c3_config_details(config_period_id);
CREATE INDEX idx_wiz_config_details_sync ON public.wiz_c3_config_details(admin_sync_id);
```

#### Table 3: `wiz_levy_slabs`

```sql
-- =============================================================
-- C3-Wizard: Levy Slabs (mirrors tb_levy_slabs)
-- =============================================================
CREATE TABLE public.wiz_levy_slabs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_sync_id   UUID NOT NULL UNIQUE,          -- Maps to Admin tb_levy_slabs.id
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_by      VARCHAR(5) DEFAULT '',
  created_on      TIMESTAMPTZ DEFAULT now(),
  modified_by     VARCHAR(5) DEFAULT '',
  modified_on     TIMESTAMPTZ DEFAULT now(),
  synced_at       TIMESTAMPTZ DEFAULT now(),
  sync_version    TEXT
);

CREATE INDEX idx_wiz_levy_slabs_active ON public.wiz_levy_slabs(is_active);
CREATE INDEX idx_wiz_levy_slabs_dates ON public.wiz_levy_slabs(start_date, end_date);
CREATE INDEX idx_wiz_levy_slabs_sync ON public.wiz_levy_slabs(admin_sync_id);
```

#### Table 4: `wiz_levy_slab_details`

```sql
-- =============================================================
-- C3-Wizard: Levy Slab Details (mirrors tb_levy_slab_details)
-- =============================================================
CREATE TABLE public.wiz_levy_slab_details (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slab_id         UUID NOT NULL REFERENCES public.wiz_levy_slabs(id) ON DELETE CASCADE,
  admin_sync_id   UUID NOT NULL UNIQUE,          -- Maps to Admin tb_levy_slab_details.id
  pay_period      VARCHAR,
  over_amt        NUMERIC,
  base_amt        NUMERIC,
  tax_rate        NUMERIC,
  order_no        INTEGER,
  is_active       BOOLEAN DEFAULT true,
  created_by      VARCHAR(5) DEFAULT '',
  created_on      TIMESTAMPTZ DEFAULT now(),
  modified_by     VARCHAR(5) DEFAULT '',
  modified_on     TIMESTAMPTZ DEFAULT now(),
  synced_at       TIMESTAMPTZ DEFAULT now(),
  sync_version    TEXT
);

CREATE INDEX idx_wiz_slab_details_slab ON public.wiz_levy_slab_details(slab_id);
CREATE INDEX idx_wiz_slab_details_sync ON public.wiz_levy_slab_details(admin_sync_id);
CREATE INDEX idx_wiz_slab_details_order ON public.wiz_levy_slab_details(slab_id, order_no);
```

#### Table 5: `wiz_bonus_levy_exemptions`

```sql
-- =============================================================
-- C3-Wizard: Bonus Levy Exemptions (mirrors c3_bonus_levy_exemptions)
-- =============================================================
CREATE TABLE public.wiz_bonus_levy_exemptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_sync_id   UUID NOT NULL UNIQUE,          -- Maps to Admin c3_bonus_levy_exemptions.id
  period_year     INTEGER NOT NULL,
  period_month    INTEGER NOT NULL,
  is_exempt       BOOLEAN NOT NULL DEFAULT true,
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_by      VARCHAR(5),
  created_on      TIMESTAMPTZ DEFAULT now(),
  modified_by     VARCHAR(5),
  modified_on     TIMESTAMPTZ DEFAULT now(),
  synced_at       TIMESTAMPTZ DEFAULT now(),
  sync_version    TEXT
);

CREATE INDEX idx_wiz_bonus_exemptions_period ON public.wiz_bonus_levy_exemptions(period_year, period_month);
CREATE INDEX idx_wiz_bonus_exemptions_sync ON public.wiz_bonus_levy_exemptions(admin_sync_id);
```

#### Table 6: `wiz_config_sync_log`

```sql
-- =============================================================
-- C3-Wizard: Sync Receiving Log (tracks incoming syncs)
-- =============================================================
CREATE TABLE public.wiz_config_sync_log (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_version            TEXT NOT NULL,
  payload_hash            TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'received',  -- received | applied | failed
  config_periods_count    INTEGER DEFAULT 0,
  levy_slabs_count        INTEGER DEFAULT 0,
  bonus_exemptions_count  INTEGER DEFAULT 0,
  error_message           TEXT,
  received_from_admin_at  TIMESTAMPTZ,            -- Admin's published_at timestamp
  received_at             TIMESTAMPTZ DEFAULT now(),
  applied_at              TIMESTAMPTZ,
  source_ip               TEXT
);

CREATE INDEX idx_wiz_sync_log_status ON public.wiz_config_sync_log(status);
CREATE INDEX idx_wiz_sync_log_hash ON public.wiz_config_sync_log(payload_hash);
```

### 2.3 Schema Mapping Reference

| Admin Table | Admin Column | Wizard Table | Wizard Column | Notes |
|---|---|---|---|---|
| `c3_config_periods` | `id` | `wiz_c3_config_periods` | `admin_sync_id` | UPSERT key |
| `c3_config_details` | `id` | `wiz_c3_config_details` | `admin_sync_id` | UPSERT key |
| `c3_config_details` | `config_period_id` | `wiz_c3_config_details` | `config_period_id` | Re-mapped to Wizard period ID |
| `tb_levy_slabs` | `id` | `wiz_levy_slabs` | `admin_sync_id` | UPSERT key |
| `tb_levy_slab_details` | `id` | `wiz_levy_slab_details` | `admin_sync_id` | UPSERT key |
| `tb_levy_slab_details` | `slab_id` | `wiz_levy_slab_details` | `slab_id` | Re-mapped to Wizard slab ID |
| `c3_bonus_levy_exemptions` | `id` | `wiz_bonus_levy_exemptions` | `admin_sync_id` | UPSERT key |

> **Key Point**: All business columns (rates, ages, amounts, dates) are identical — no transformation. Only the `id` → `admin_sync_id` mapping and parent FK re-mapping are needed.

---

## 3. Sync API Design (C3-Wizard Side)

### 3.1 API Endpoint

```
POST /api/c3-config/sync
Content-Type: application/json
Authorization: Bearer <API_KEY>
```

### 3.2 Request Payload Format

The payload is the exact JSON built by `buildSyncPayload()` in `useC3ConfigPublish.ts`:

```json
{
  "sync_version": "2026-02-25T11:30:00.000Z",
  "config_periods": [
    {
      "id": "uuid-period-1",
      "start_date": "2026-01-01",
      "end_date": "2026-12-31",
      "description": "2026 Active Period",
      "is_active": true,
      "created_by": "ADM01",
      "created_on": "2026-01-15T10:00:00Z",
      "modified_by": "ADM01",
      "modified_on": "2026-02-20T14:30:00Z",
      "details": {
        "id": "uuid-detail-1",
        "config_period_id": "uuid-period-1",
        "min_age_ss": 16,
        "max_age_ss": 62,
        "min_age_levy": 16,
        "max_age_levy": 62,
        "bonus_exempt_from_levy": false,
        "bonus_levy_rate": 0.035,
        "employee_ss_rate": 0.05,
        "employee_ss_max_wage": 6500.00,
        "employer_ss_rate": 0.05,
        "employer_eib_rate": 0.01,
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
        "interest_rate_ss_principal": 0.00,
        "interest_rate_levy_principal": 0.00,
        "interest_rate_severance_principal": 0.00,
        "interest_rate_penalties": 0.00,
        "interest_rate_fines": 0.00,
        "levy_slab_id": "uuid-slab-1",
        "levy_monthly_threshold": 6500,
        "levy_use_monthly_when_exceeded": false
      }
    }
  ],
  "levy_slabs": [
    {
      "id": "uuid-slab-1",
      "start_date": "2026-01-01",
      "end_date": "2026-12-31",
      "is_active": true,
      "details": [
        {
          "id": "uuid-slab-detail-1",
          "slab_id": "uuid-slab-1",
          "pay_period": "weekly",
          "over_amt": 0,
          "base_amt": 0,
          "tax_rate": 0.00,
          "order_no": 1,
          "is_active": true
        },
        {
          "id": "uuid-slab-detail-2",
          "slab_id": "uuid-slab-1",
          "pay_period": "weekly",
          "over_amt": 1625,
          "base_amt": 0,
          "tax_rate": 0.08,
          "order_no": 2,
          "is_active": true
        }
      ]
    }
  ],
  "bonus_exemptions": [
    {
      "id": "uuid-exemption-1",
      "period_year": 2026,
      "period_month": 12,
      "is_exempt": true,
      "description": "December bonus exempt",
      "is_active": true
    }
  ]
}
```

### 3.3 Response Format

**Success (200)**:
```json
{
  "status": "success",
  "sync_version": "2026-02-25T11:30:00.000Z",
  "applied": {
    "config_periods": 2,
    "config_details": 2,
    "levy_slabs": 1,
    "levy_slab_details": 5,
    "bonus_exemptions": 3
  },
  "log_id": "uuid-sync-log-entry"
}
```

**Duplicate (200 — idempotent skip)**:
```json
{
  "status": "duplicate",
  "message": "Payload already applied (matching hash)",
  "existing_log_id": "uuid-previous-log"
}
```

**Error (400/500)**:
```json
{
  "status": "error",
  "error": "Validation failed: config_periods[0].start_date is required",
  "sync_version": "2026-02-25T11:30:00.000Z"
}
```

### 3.4 Validation Rules

| Rule | Description |
|---|---|
| `sync_version` required | Must be a valid ISO 8601 timestamp |
| `config_periods` required | Array, can be empty but must exist |
| Each period must have `id`, `start_date` | Core identity/business fields |
| `levy_slabs` required | Array with valid date ranges |
| Each slab detail must have `slab_id` matching a slab `id` | Referential integrity within payload |
| Payload hash dedup | If `payload_hash` matches last successful sync, return `duplicate` |

### 3.5 UPSERT / Idempotency Strategy

```
For each entity type:
1. UPSERT using admin_sync_id as the conflict key
2. ON CONFLICT (admin_sync_id) DO UPDATE SET ... all columns
3. Process in order: periods → details → slabs → slab_details → exemptions
4. Parent-child re-mapping: After upserting periods, map Admin period IDs 
   to Wizard period IDs for details FK. Same for slabs → slab_details.
```

**Pseudocode**:
```sql
-- Step 1: UPSERT config periods
INSERT INTO wiz_c3_config_periods (admin_sync_id, start_date, end_date, ...)
VALUES ($1, $2, $3, ...)
ON CONFLICT (admin_sync_id) DO UPDATE SET
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  ...
  synced_at = now(),
  sync_version = $sync_version
RETURNING id, admin_sync_id;

-- Step 2: Use returned id mapping for details
-- admin_period_id → wizard_period_id
INSERT INTO wiz_c3_config_details (admin_sync_id, config_period_id, ...)
VALUES ($1, $wizard_period_id, ...)
ON CONFLICT (admin_sync_id) DO UPDATE SET ...;
```

---

## 4. Publish Flow (Admin → C3-Wizard)

### 4.1 Step-by-Step Flow

```
Step 1: Admin User clicks "Publish to C3-Wizard" button
          │
Step 2: Confirmation dialog shows payload summary
        (X periods, Y slabs, Z exemptions)
          │
Step 3: Admin frontend calls buildSyncPayload()
        - Fetches all active c3_config_periods + c3_config_details
        - Fetches all active tb_levy_slabs + tb_levy_slab_details
        - Fetches all active c3_bonus_levy_exemptions
        - Generates payload_hash for deduplication
          │
Step 4: Insert c3_config_sync_log entry with status='pending'
          │
Step 5: POST payload to C3-Wizard sync API
        POST ${C3_WIZARD_API_URL}/api/c3-config/sync
        Authorization: Bearer <API_KEY>
        Body: { sync_version, config_periods, levy_slabs, bonus_exemptions }
          │
Step 6: C3-Wizard processes the payload:
        a. Check payload_hash against last successful sync (dedup)
        b. Log received sync in wiz_config_sync_log
        c. Begin transaction:
           - UPSERT wiz_c3_config_periods
           - UPSERT wiz_c3_config_details (with FK re-mapping)
           - UPSERT wiz_levy_slabs
           - UPSERT wiz_levy_slab_details (with FK re-mapping)
           - UPSERT wiz_bonus_levy_exemptions
        d. Commit transaction
        e. Update wiz_config_sync_log status → 'applied'
          │
Step 7: Admin receives success response:
        a. Update c3_config_sync_log status → 'success'
        b. Update last_published_at on all config tables
        c. UI shows "Synced" badge with timestamp
        d. Toast notification: "Published X periods, Y slabs, Z exemptions"
```

### 4.2 Error Handling

| Scenario | Admin Behavior | C3-Wizard Behavior |
|---|---|---|
| Network timeout | Set sync_log status='failed', show error toast | No action (never received) |
| 4xx validation error | Log error_message, show specific field errors | Return validation details, log attempt |
| 5xx server error | Set status='failed', allow retry | Log error, rollback transaction |
| Duplicate payload | Set status='success' (idempotent), update timestamp | Return 'duplicate' status, no DB changes |
| Partial failure | Set status='failed' with error details | Rollback entire transaction (atomic) |

### 4.3 Versioning

- **sync_version**: ISO 8601 timestamp generated at publish time, serves as the batch identifier
- **payload_hash**: Base64 hash of the full payload for deduplication
- Both are stored in sync logs on both Admin and Wizard sides

### 4.4 Logging & Audit

**Admin Side** (`c3_config_sync_log`):
- `status`: pending → success/failed
- `payload`: Full JSON payload (for replay/debugging)
- `payload_hash`: Deduplication key
- `published_by`: UserCode of the admin who clicked Publish
- `published_at`: Timestamp
- `response_data`: C3-Wizard's response

**Wizard Side** (`wiz_config_sync_log`):
- `status`: received → applied/failed
- `payload_hash`: Matches Admin's hash
- `config_periods_count`, `levy_slabs_count`, `bonus_exemptions_count`: Record counts
- `received_at`: When the API received the request
- `applied_at`: When the transaction committed

---

## 5. Calculation Logic Strategy

### 5.1 Architectural Recommendation

> **✅ RECOMMENDED: Local Calculation in C3-Wizard using synced config tables**

This is the industry-standard approach for contribution/payroll systems (used by ADP, SAP HCM, Oracle Payroll, etc.).

### 5.2 Comparison

| Factor | Local Calculation (✅ Recommended) | Centralized API (❌ Not Recommended) |
|---|---|---|
| **Performance** | Instant — local DB lookup | Network round-trip per calculation |
| **Availability** | Works even if Admin is offline | Fails if Admin API is down |
| **Batch Processing** | Can process 1000s of employees locally | API bottleneck at scale |
| **Data Consistency** | Frozen snapshot per sync version | Could change mid-batch |
| **Latency** | <1ms config lookup | 50-200ms per API call |
| **Complexity** | Calculation logic in one place | Logic coupled to API contract |
| **Audit** | Clear: "used config version X" | Hard to trace which config was used |
| **Offline/Disaster** | C3-Wizard keeps working | Complete dependency on Admin uptime |

### 5.3 How C3-Wizard Should Calculate

#### Social Security (Employee)
```
IF employee_age >= min_age_ss AND employee_age < max_age_ss:
  taxable_wages = MIN(gross_wages, employee_ss_max_wage)
  employee_ss = taxable_wages × employee_ss_rate
ELSE:
  employee_ss = 0  (age exempt)
```

#### Social Security (Employer)
```
IF employee_age >= min_age_ss AND employee_age < max_age_ss:
  taxable_wages = MIN(gross_wages, employer_ss_max_wage)
  employer_ss = taxable_wages × employer_ss_rate
  employer_eib = taxable_wages × employer_eib_rate
ELSE:
  employer_ss = 0
  employer_eib = 0
```

#### Levy (Employee — using slabs)
```
IF employee_age >= min_age_levy AND employee_age < max_age_levy:
  1. Get active slab for the period (via levy_slab_id or date range)
  2. Get slab_details ordered by order_no
  3. For each bracket:
     IF wages > over_amt:
       levy += (wages - over_amt) × tax_rate + base_amt
       BREAK (apply highest matching bracket)
  
  IF bonus period AND is_bonus_exempt(year, month):
    bonus_levy = 0
  ELSE:
    bonus_levy = bonus × bonus_levy_rate
ELSE:
  levy = 0
```

#### Levy (Employer)
```
employer_levy = gross_wages × employer_levy_rate
```

#### Severance (Employer only)
```
employer_severance = gross_wages × employer_severance_rate
```

#### Penalty Calculations (Late Filing)
```
IF filing_is_late:
  -- First month
  levy_penalty = levy_amount × levy_penalty_initial_rate
  severance_penalty = severance_amount × severance_penalty_initial_rate
  ss_fine = ss_amount × ss_fine_initial_rate
  
  -- Each subsequent month
  levy_penalty += levy_amount × levy_penalty_subsequent_rate × additional_months
  severance_penalty += severance_amount × severance_penalty_subsequent_rate × additional_months
  ss_fine += ss_amount × ss_fine_subsequent_rate × additional_months
```

### 5.4 Config Lookup Pattern

```typescript
// C3-Wizard: Get active config for a given filing period
async function getActiveConfig(filingDate: Date) {
  const { data: period } = await supabase
    .from('wiz_c3_config_periods')
    .select('*, wiz_c3_config_details(*)')
    .eq('is_active', true)
    .lte('start_date', filingDate)
    .or(`end_date.gte.${filingDate},end_date.is.null`)
    .single();
  
  return period;
}

// Get levy slabs for employee calculation
async function getLevySlabs(slabId: string) {
  const { data: details } = await supabase
    .from('wiz_levy_slab_details')
    .select('*')
    .eq('slab_id', slabId)
    .eq('is_active', true)
    .order('order_no', { ascending: true });
  
  return details;
}

// Check bonus exemption
async function isBonusExempt(year: number, month: number) {
  const { data } = await supabase
    .from('wiz_bonus_levy_exemptions')
    .select('is_exempt')
    .eq('period_year', year)
    .eq('period_month', month)
    .eq('is_active', true)
    .single();
  
  return data?.is_exempt ?? false;
}
```

---

## 6. FAQ & Decision Guidance

### Q: Do we need config tables in C3-Wizard if calculation is centralized?

**A**: If using centralized calculation (not recommended), you would NOT need config tables in C3-Wizard — but you'd need:
- A calculation API endpoint on Admin
- Admin to be always available
- Network calls for every single employee line calculation

**This is fragile and not recommended.** The industry standard is to sync config and calculate locally.

### Q: What is the industry-standard approach?

**A**: **Sync config + local calculation** is the universal standard:
- **ADP** syncs tax tables to local payroll engines
- **SAP HCM** distributes calculation schemas to decentralized systems
- **Oracle Payroll** uses configuration snapshots for each pay run

The pattern is: **"Distribute configuration, calculate locally, audit everything."**

### Q: What happens if Admin publishes mid-batch?

**A**: The C3-Wizard uses the config version that was synced at the start of the batch. New publishes only affect future batches. This is guaranteed by the `sync_version` field — each batch records which version it used.

### Q: Can we replay a failed sync?

**A**: Yes. The Admin stores the full `payload` in `c3_config_sync_log`. A "Retry" button can re-send the exact same payload. The Wizard's idempotency check (via `payload_hash`) ensures no duplicate processing.

### Q: How do we handle schema evolution?

**A**: When adding new config fields:
1. Add the column to Admin table (with migration)
2. Add the same column to Wizard table (with migration)
3. Update `buildSyncPayload()` to include the new field
4. Update Wizard's UPSERT to handle the new field
5. Both sides stay in sync — no transformation needed

---

## Appendix: File References

| File | Purpose |
|---|---|
| `src/hooks/useC3ConfigPublish.ts` | Admin: Sync status, payload builder, publish mutation |
| `src/components/admin/c3-configuration/C3PublishButton.tsx` | Admin: Publish button UI with confirmation dialog |
| `src/components/admin/c3-configuration/C3SyncHistoryTab.tsx` | Admin: Sync history view |
| `docs/c3-wizard-sync-guide.md` | This document |

---

*End of C3-Wizard Sync Implementation Guide*
