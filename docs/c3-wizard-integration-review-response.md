# SSB Admin → C3-Wizard Team: Integration Guide Review & Response

> **From:** SSB Admin Team (C3 Configuration)  
> **To:** C3-Wizard Team  
> **Date:** 2026-03-03  
> **Re:** Review of "C3 Configuration Sync — SSB Admin Integration Guide (v3.0)"  
> **Status:** Reviewed — 4 corrections, 6 confirmations, test cases attached

---

## Executive Summary

We have thoroughly reviewed the integration guide you shared. The implementation is **largely correct and well-structured**. However, we identified **4 items requiring correction** before integration testing can proceed safely.

---

## 🔴 CORRECTIONS REQUIRED (4 items)

### Correction 1: `exception_type` Values — MISMATCH

**Your Document (Section 3.3):**
```json
"exception_type": "month"
```

**Our Admin Schema (Actual Values):**
```json
"exception_type": "onetime"   // applies only in year_from
"exception_type": "recurring" // applies every year from year_from to year_to
```

**Action Required:** The C3-Wizard sync endpoint and calculation engine must accept `"onetime"` and `"recurring"` — NOT `"month"`. The value `"month"` was never defined in the Admin schema.

**Resolution Logic:**
| Value | Meaning |
|---|---|
| `onetime` | Exception applies ONLY in the specific `year_from` year |
| `recurring` | Exception applies every year from `year_from` through `year_to` (or indefinitely if `year_to` is NULL) |

The `exception_month` field (1–12) still determines WHICH month the exception applies to. The `exception_type` determines WHETHER it repeats across years.

---

### Correction 2: `sync_version` Format — ALIGNMENT NEEDED

**Your Document (Section 2):**
```json
"sync_version": "3.0"
```

**Our Admin Sends:**
```json
"sync_version": "2026-03-03T12:00:00.000Z"
```

**Resolution:** We will update our Admin payload to include BOTH:
```json
{
  "sync_version": "3.0",
  "sync_timestamp": "2026-03-03T12:00:00.000Z"
}
```

- `sync_version`: Static protocol version string (`"3.0"`) — use this for version compatibility checks
- `sync_timestamp`: ISO 8601 timestamp of when the publish was triggered — use this for `synced_at` column

**Action for Wizard:** Accept both fields. Use `sync_version` for protocol validation and `sync_timestamp` for the `synced_at` audit field.

---

### Correction 3: Response Format — Key Name Alignment

**Your Document (Section 4):**
```json
{
  "status": "success",
  "sync_log_id": "uuid",
  "summary": {
    "config_periods_synced": 1,
    "levy_slab_details_synced": 8,
    ...
  }
}
```

**Our Admin Expects (from sync guide Section 3.3):**
```json
{
  "status": "success",
  "sync_version": "...",
  "applied": {
    "config_periods": 1,
    "levy_slab_details": 4,
    ...
  },
  "log_id": "uuid"
}
```

**Resolution:** We will adapt our Admin code to accept YOUR response format. Please keep your format as documented. We will parse:
- `status` → same
- `sync_log_id` → maps to our `log_id` 
- `summary.*_synced` → maps to our `applied.*` counts

**No action required from Wizard team on this item** — we will adapt.

---

### Correction 4: Duplicate Response `status` Value

**Your Document:**
```json
{ "status": "skipped" }
```

**Our Sync Guide:**
```json
{ "status": "duplicate" }
```

**Resolution:** We will update our Admin code to accept `"skipped"` as the duplicate indicator. Please keep `"skipped"` as documented.

**No action required from Wizard team** — we will adapt.

---

## ✅ CONFIRMATIONS (6 items)

### ✅ Confirmed: API Endpoint & Authentication
- Endpoint: `POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/c3-config-sync`
- Header: `x-sync-api-key` with shared secret `C3_CONFIG_SYNC_API_KEY`
- **Agreed.** We will store this secret on our side and coordinate the shared value with your team.

### ✅ Confirmed: Payload Structure
- `config_periods` with nested `details` object — **Correct**
- `levy_slabs` with nested `details` array — **Correct**
- `bonus_policies`, `bonus_exceptions`, `holiday_policies`, `holiday_exceptions` as flat arrays — **Correct**
- All `id` fields map to `admin_sync_id` on Wizard side — **Correct**

### ✅ Confirmed: Rate Format
- All rates as decimals (0.05 = 5%) — **Correct**
- `calc_flat_percentage` as decimal (0.08 = 8%) — **Correct**

### ✅ Confirmed: Field Reference Tables (Sections 3.1–3.4)
- All field names, types, and descriptions match our Admin schema — **Correct**
- `employer_eib_max_wage` is correctly listed as the NEW EIB-specific wage ceiling — **Correct**

### ✅ Confirmed: Interest Rate Fields Omitted
- Interest rate fields are NOT in the payload — **Correct, as per our Answer #4**

### ✅ Confirmed: Error Response Handling
- HTTP 401 for auth failures — **Correct**
- HTTP 400 for validation errors — **Correct**
- HTTP 500 for server errors — **Correct**
- Idempotent behavior on duplicate payloads — **Correct**

---

## 📝 ADDITIONAL CLARIFICATIONS

### December Bonus Exception — Your Example Payload

Your Section 2 example shows:
```json
{
  "exception_type": "month",         // ← Must be "recurring" (Correction #1)
  "contrib_employee": false,
  "contrib_employer": false,
  "contrib_eir": false,
  "contrib_severance": false
}
```

**Clarification on explicit `false` vs `null`:**
- Setting `contrib_employee: false` explicitly means "do NOT include bonus in employee SS" — this is a **deliberate override**
- Setting `contrib_employee: null` means "inherit from the default policy" — the default policy's `contrib_employee` value will be used
- Your example explicitly sets ALL contribution flags to `false` for December — this means December bonuses would have **zero SS, zero EIB, zero severance** — which may be the intended business rule. Please confirm with your business team.

### Bonus Policy: `contrib_severance` vs `include_in_severance`

Both fields exist on `wiz_bonus_policy_default`:
- `include_in_severance`: Whether the bonus amount is included in the severance **wage base**
- `contrib_severance`: Whether the employer severance **contribution** is calculated on the bonus

These are NOT redundant — `include_in_severance` controls the wage base inclusion, while `contrib_severance` controls whether the rate is applied. In practice, `contrib_severance = true` implies `include_in_severance = true`. Your payload correctly includes both — **confirmed correct**.

---

## 🔑 API Key Coordination

We need to establish the shared `C3_CONFIG_SYNC_API_KEY` value. Please:

1. Generate a strong API key (minimum 32 characters, alphanumeric + special characters)
2. Share it with us via a secure channel (NOT in documentation or email)
3. We will configure it as a secret on our Admin system
4. Both sides must match exactly

---

## 📊 Calculation Test Cases

**Attached separately:** See `docs/c3-wizard-calculation-test-cases.md` for the complete set of test cases (TC-A through TC-I) with:
- All input values
- Step-by-step intermediate calculations
- Expected output values
- Active configuration rates used

---

## Summary of Actions

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Fix `exception_type` to accept `onetime`/`recurring` | **Wizard Team** | Required |
| 2 | Accept both `sync_version` and `sync_timestamp` | **Both Teams** | Required |
| 3 | Response format adaptation | **Admin Team** | We will adapt |
| 4 | Duplicate status `"skipped"` adaptation | **Admin Team** | We will adapt |
| 5 | Coordinate shared API key | **Both Teams** | Pending |
| 6 | Confirm December contrib flags intent | **Wizard Team** | Please confirm |
| 7 | Review test cases | **Wizard Team** | Attached |

---

*End of Review Response — SSB Admin Team*
