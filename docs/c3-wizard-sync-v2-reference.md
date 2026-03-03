# C3 Configuration Sync - Implementation Summary & Admin Integration Guide

**Date:** 2026-02-26  
**Status:** ✅ Implemented  
**Version:** 2.0

---

## 1. What Has Been Implemented on C3-Wizard

### 1.1 Database Tables (6 `wiz_` tables)

| Table | Purpose | Conflict Key |
|---|---|---|
| `wiz_c3_config_periods` | Period definitions (date ranges, active flag) | `admin_sync_id` (UNIQUE) |
| `wiz_c3_config_details` | All rates, age limits, penalties, thresholds | `admin_sync_id` (UNIQUE) |
| `wiz_levy_slabs` | Levy slab headers | `admin_sync_id` (UNIQUE) |
| `wiz_levy_slab_details` | Levy bracket rows (over_amt, base_amt, tax_rate, order_no) | `admin_sync_id` (UNIQUE) |
| `wiz_bonus_levy_exemptions` | Month/year bonus levy exemption flags | `admin_sync_id` (UNIQUE) |
| `wiz_config_sync_log` | Tracks each sync event (status, hash, counts, timestamps) | N/A |

All `admin_sync_id` values map to the Admin Portal's record `id` (UUID).

### 1.2 Edge Function: `c3-config-sync`

- **Endpoint:** `POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/c3-config-sync`
- **Authentication:** `x-sync-api-key` header validated against `C3_CONFIG_SYNC_API_KEY` secret
- **JWT Verification:** Disabled (uses shared secret instead)
- **Features:**
  - SHA-256 payload hash deduplication
  - Transactional UPSERTs for all 5 data tables
  - Parent-child FK re-mapping (periods→details, slabs→slab_details)
  - Levy slab reference resolution in config_details
  - Full sync event logging

### 1.3 Calculation Engine — wiz_ Tables Only

The `calculate-c3-contributions` function reads **exclusively** from `wiz_` tables:
- `wiz_c3_config_periods` + `wiz_c3_config_details` for rates, caps, age limits
- `wiz_levy_slab_details` for levy bracket calculations
- `wiz_bonus_levy_exemptions` for bonus exemption flags

**There is NO fallback to legacy tables.** If no `wiz_` config exists, the calculation engine returns an error instructing the Admin to publish configuration first.

### 1.4 RLS Policy

Row-Level Security (RLS) is **disabled** across all tables in C3-Wizard. Access control is enforced at the Edge Function and application layer via JWT claims (`role_id`, `company_id`, `user_type`).

The Admin Portal should follow the same approach for the sync endpoint — the `x-sync-api-key` header provides authentication.

### 1.5 Secret Configured

- `C3_CONFIG_SYNC_API_KEY` — shared secret for Admin→Wizard sync authentication

---

## 2. Admin Portal Integration Instructions

### 2.1 Prerequisites

1. **Obtain the shared API key** — The `C3_CONFIG_SYNC_API_KEY` value must match on both Admin and Wizard sides. Coordinate with the C3-Wizard team to set the same value.

2. **Ensure Admin tables have UUIDs as primary keys** — The sync uses Admin's `id` (UUID) as `admin_sync_id` in Wizard tables.

### 2.2 API Endpoint

```
POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/c3-config-sync
```

### 2.3 Request Headers

```
Content-Type: application/json
x-sync-api-key: <the shared C3_CONFIG_SYNC_API_KEY value>
```

### 2.4 Payload Format

```json
{
  "sync_version": "2026-02-26T12:00:00.000Z",
  "config_periods": [
    {
      "id": "<admin c3_config_periods.id — UUID>",
      "start_date": "2026-01-01",
      "end_date": "2026-12-31",
      "description": "2026 Active Period",
      "is_active": true,
      "created_by": "ADM01",
      "created_on": "2026-01-15T10:00:00Z",
      "modified_by": "ADM01",
      "modified_on": "2026-02-20T14:30:00Z",
      "details": {
        "id": "<admin c3_config_details.id — UUID>",
        "config_period_id": "<same as parent period id>",
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
        "levy_slab_id": "<admin tb_levy_slabs.id or null>",
        "levy_monthly_threshold": 6500,
        "levy_use_monthly_when_exceeded": false
      }
    }
  ],
  "levy_slabs": [
    {
      "id": "<admin tb_levy_slabs.id — UUID>",
      "start_date": "2026-01-01",
      "end_date": "2026-12-31",
      "is_active": true,
      "details": [
        {
          "id": "<admin tb_levy_slab_details.id — UUID>",
          "slab_id": "<same as parent slab id>",
          "pay_period": "W",
          "over_amt": 0,
          "base_amt": 0,
          "tax_rate": 0.00,
          "order_no": 1,
          "is_active": true
        },
        {
          "id": "<uuid>",
          "slab_id": "<parent slab id>",
          "pay_period": "W",
          "over_amt": 1625,
          "base_amt": 0,
          "tax_rate": 0.08,
          "order_no": 2,
          "is_active": true
        },
        {
          "id": "<uuid>",
          "slab_id": "<parent slab id>",
          "pay_period": "M",
          "over_amt": 0,
          "base_amt": 0,
          "tax_rate": 0.00,
          "order_no": 1,
          "is_active": true
        },
        {
          "id": "<uuid>",
          "slab_id": "<parent slab id>",
          "pay_period": "M",
          "over_amt": 6500,
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
      "id": "<admin c3_bonus_levy_exemptions.id — UUID>",
      "period_year": 2026,
      "period_month": 12,
      "is_exempt": true,
      "description": "December bonus exempt",
      "is_active": true
    }
  ]
}
```

### 2.5 Response Formats

**Success (200):**
```json
{
  "status": "success",
  "sync_version": "2026-02-26T12:00:00.000Z",
  "applied": {
    "config_periods": 1,
    "config_details": 1,
    "levy_slabs": 1,
    "levy_slab_details": 4,
    "bonus_exemptions": 1
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

**Auth Error (401):**
```json
{ "status": "error", "error": "Unauthorized: Invalid or missing API key" }
```

**Validation Error (400):**
```json
{ "status": "error", "error": "Validation failed: sync_version is required" }
```

**Server Error (500):**
```json
{ "status": "error", "error": "Period upsert failed: ..." }
```

### 2.6 What the Admin Team Must Implement

#### Step 1: Configure the Shared API Key
Set `C3_CONFIG_SYNC_API_KEY` as an environment secret in your Admin Portal. Use the **exact same value** that was configured in C3-Wizard.

#### Step 2: Build `buildSyncPayload()` Function
Create a function that:
1. Fetches all active `c3_config_periods` with their `c3_config_details`
2. Fetches all active `tb_levy_slabs` with their `tb_levy_slab_details`
3. Fetches all active `c3_bonus_levy_exemptions`
4. Structures the data in the payload format shown above
5. Generates a `sync_version` (ISO 8601 timestamp)

#### Step 3: Create "Publish to C3-Wizard" Button
The Publish flow:
1. Show confirmation dialog with payload summary (X periods, Y slabs, Z exemptions)
2. On confirm: call `buildSyncPayload()`
3. Insert a `c3_config_sync_log` entry with `status = 'pending'`
4. POST the payload to the C3-Wizard endpoint
5. On success: update sync log to `status = 'success'`, show success toast
6. On duplicate: update sync log to `status = 'success'` (idempotent), show "Already synced" toast
7. On error: update sync log to `status = 'failed'` with error message, show error toast

#### Step 4: Add Sync Status UI
- Show "Last Published" timestamp from `c3_config_sync_log`
- Show "Changes Pending Sync" indicator when config has been modified since last publish
- Provide a "Retry" button for failed syncs

### 2.7 Validation Checklist Before Publishing

| Check | Description |
|---|---|
| ✅ At least one active config period | `c3_config_periods WHERE is_active = true` must have records |
| ✅ Each period has details | Every active period must have a linked `c3_config_details` record |
| ✅ Levy slabs have details | Each active slab must have at least one `tb_levy_slab_details` row |
| ✅ Slab details reference valid slab | `slab_id` in details must match a slab `id` in the payload |
| ✅ Pay periods include W and M | Levy slab details should cover both Weekly (W) and Monthly (M) pay periods |
| ✅ Rates are in decimal form | e.g., 5% should be `0.05`, not `5` |

### 2.8 Post-Publish Validation

After a successful publish, the Admin team should verify:
1. Response `status` is `"success"` or `"duplicate"`
2. The `applied` counts match expected numbers
3. Optionally: query `wiz_config_sync_log` in C3-Wizard to confirm the log entry

---

## 3. Legacy Tables Status

| Legacy Table | Status | Notes |
|---|---|---|
| `c3_system_rates` | **DEPRECATED** | No longer read by any code. Pending `NU_` prefix rename. |
| `c3_levy_tiers` | **DEPRECATED** | No longer read by any code. Pending `NU_` prefix rename. |
| `c3_bonus_exemptions` | **Active for reference** | Still used for historical 4-flag granularity; wiz_ uses single `is_exempt` flag |
| `c3_employer_codes` | **DEPRECATED** | Rates consolidated into `wiz_c3_config_details` |

---

## 4. Important Notes

### 4.1 No Fallback Policy
C3-Wizard's calculation engine will **error out** if no `wiz_` configuration exists. The Admin team **must publish configuration before any employer can file C3 contributions**.

### 4.2 Idempotency
Re-publishing the same payload is safe — the SHA-256 hash deduplication prevents duplicate processing. Different payloads with the same `admin_sync_id` values will update (UPSERT) existing records.

### 4.3 NWD Calculations
Non-Working Director calculations use the **same** `wiz_` configuration tables. There are no separate NWD config tables.

### 4.4 Levy Allowances
Levy allowances (`c3_levy_allowances`) are managed locally in C3-Wizard and are **NOT** part of the config sync. They remain separately maintained.

---

**Last Updated**: February 26, 2026  
**Status**: Production-ready, awaiting first Admin publish
