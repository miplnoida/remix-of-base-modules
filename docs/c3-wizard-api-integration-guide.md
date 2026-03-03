# C3 Configuration Sync — SSB Admin Integration Guide (v3.0)

**Date:** March 3, 2026  
**Purpose:** Technical guide for SSB Admin team to implement Publish & Sync  
**Status:** Ready for integration testing

---

## 1. API Endpoint

```
POST https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/c3-config-sync
```

### Authentication

| Header | Value | Description |
|--------|-------|-------------|
| `x-sync-api-key` | `<shared secret>` | Pre-shared API key (stored as `C3_CONFIG_SYNC_API_KEY` in C3-Wizard) |
| `Content-Type` | `application/json` | Required |

> **Note:** The `C3_CONFIG_SYNC_API_KEY` secret must match on both sides. Coordinate with the C3-Wizard team to set the shared value.

---

## 2. Request Payload Structure (v3.0)

```json
{
  "sync_version": "3.0",
  
  "config_periods": [
    {
      "id": "uuid-from-admin-db",
      "start_date": "2026-01-01",
      "end_date": null,
      "description": "2026 Configuration",
      "is_active": true,
      "created_by": "admin@ssb.gov",
      "created_on": "2026-01-01T00:00:00Z",
      "modified_by": "admin@ssb.gov",
      "modified_on": "2026-03-01T00:00:00Z",
      "details": {
        "id": "uuid-detail-record",
        "config_period_id": "uuid-from-admin-db",
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
        "submission_due_day": 15,
        "levy_penalty_initial_rate": 0.10,
        "levy_penalty_subsequent_rate": 0.01,
        "severance_penalty_initial_rate": 0.10,
        "severance_penalty_subsequent_rate": 0.01,
        "ss_fine_initial_rate": 0.05,
        "ss_fine_subsequent_rate": 0.05,
        "levy_slab_id": "uuid-of-levy-slab",
        "levy_monthly_threshold": 6500,
        "levy_use_monthly_when_exceeded": false
      }
    }
  ],
  
  "levy_slabs": [
    {
      "id": "uuid-levy-slab",
      "start_date": "2026-01-01",
      "end_date": "2026-12-31",
      "is_active": true,
      "created_by": "admin@ssb.gov",
      "created_on": "2026-01-01T00:00:00Z",
      "modified_by": "admin@ssb.gov",
      "modified_on": "2026-01-01T00:00:00Z",
      "details": [
        {
          "id": "uuid-slab-detail-1",
          "slab_id": "uuid-levy-slab",
          "pay_period": "weekly",
          "over_amt": 0,
          "base_amt": 0,
          "tax_rate": 0.0,
          "order_no": 1,
          "is_active": true
        },
        {
          "id": "uuid-slab-detail-2",
          "slab_id": "uuid-levy-slab",
          "pay_period": "weekly",
          "over_amt": 385,
          "base_amt": 0,
          "tax_rate": 0.08,
          "order_no": 2,
          "is_active": true
        }
      ]
    }
  ],
  
  "bonus_policies": [
    {
      "id": "uuid-bonus-policy",
      "include_in_levy": true,
      "include_in_severance": false,
      "contrib_severance": false,
      "calculation_method": "separate",
      "calc_flat_enabled": true,
      "calc_flat_percentage": 0.08,
      "calc_slab_enabled": false,
      "distribution": {
        "weekly": { "w1": false, "w2": false, "w3": false, "w4": false, "divide": false },
        "monthly": { "m1": true },
        "biweekly": { "b1": false, "b2": false, "divide": true },
        "semimonthly": { "s1": false, "s2": false, "divide": false }
      },
      "min_bonus_amount": null,
      "max_bonus_amount": null,
      "contrib_employee": true,
      "contrib_employer": true,
      "contrib_eir": true,
      "date_from": "2026-01-01",
      "date_to": null,
      "is_active": true,
      "created_by": "admin@ssb.gov",
      "created_on": "2026-01-01T00:00:00Z",
      "modified_by": "admin@ssb.gov",
      "modified_on": "2026-01-01T00:00:00Z"
    }
  ],
  
  "bonus_exceptions": [
    {
      "id": "uuid-bonus-exception-dec",
      "date_from": "2026-01-01",
      "date_to": null,
      "exception_type": "month",
      "exception_month": 12,
      "year_from": 2026,
      "year_to": null,
      "override_default": true,
      "include_in_levy": false,
      "include_in_severance": false,
      "calculation_method": null,
      "calc_flat_enabled": null,
      "calc_flat_percentage": null,
      "calc_slab_enabled": null,
      "distribution": null,
      "min_bonus_amount": null,
      "max_bonus_amount": null,
      "contrib_employee": false,
      "contrib_employer": false,
      "contrib_eir": false,
      "contrib_severance": false,
      "is_active": true,
      "description": "December bonus exemption",
      "created_by": "admin@ssb.gov",
      "created_on": "2026-01-01T00:00:00Z",
      "modified_by": "admin@ssb.gov",
      "modified_on": "2026-01-01T00:00:00Z"
    }
  ],
  
  "holiday_policies": [
    {
      "id": "uuid-holiday-policy",
      "policy_type": "without_dates",
      "distribution_enabled": true,
      "levy_include": true,
      "levy_calculation_method": "merge",
      "levy_calc_flat_enabled": false,
      "levy_calc_flat_percentage": null,
      "levy_calc_slab_enabled": false,
      "levy_distribution": {
        "weekly": { "w1": false, "w2": false, "w3": false, "w4": false, "divide": false },
        "monthly": { "m1": true },
        "biweekly": { "b1": false, "b2": false, "divide": true },
        "semimonthly": { "s1": false, "s2": false, "divide": false }
      },
      "ssc_include": true,
      "ssc_contrib_employee": true,
      "ssc_contrib_employer": true,
      "ssc_contrib_eib": false,
      "include_in_severance": false,
      "min_holiday_amount": null,
      "max_holiday_amount": null,
      "date_from": "2026-01-01",
      "date_to": null,
      "is_active": true,
      "created_by": "admin@ssb.gov",
      "created_on": "2026-01-01T00:00:00Z",
      "modified_by": "admin@ssb.gov",
      "modified_on": "2026-01-01T00:00:00Z"
    }
  ],
  
  "holiday_exceptions": []
}
```

---

## 3. Field Reference

### 3.1 Config Details — Rate Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `employee_ss_rate` | decimal | Employee SS rate (0.05 = 5%) | 0.05 |
| `employee_ss_max_wage` | decimal | Monthly wage ceiling for EE SS | 6500.00 |
| `employer_ss_rate` | decimal | Employer SS rate | 0.05 |
| `employer_eib_rate` | decimal | EIB rate | 0.01 |
| `employer_eib_max_wage` | decimal | **NEW** EIB-specific wage ceiling | 6500.00 |
| `employer_ss_max_wage` | decimal | Monthly wage ceiling for ER SS | 6500.00 |
| `employer_levy_rate` | decimal | Employer levy rate | 0.03 |
| `employer_severance_rate` | decimal | Severance rate | 0.01 |
| `levy_monthly_threshold` | decimal | Switching threshold (weekly→monthly) | 6500 |

### 3.2 Bonus Policy Fields

| Field | Type | Description |
|-------|------|-------------|
| `include_in_levy` | boolean | Include bonus in levy calculation |
| `include_in_severance` | boolean | Include bonus in severance |
| `calculation_method` | string | `"merge"` or `"separate"` |
| `calc_flat_enabled` | boolean | Use flat rate for separate calc |
| `calc_flat_percentage` | decimal? | Flat rate (e.g., 0.08 = 8%) |
| `calc_slab_enabled` | boolean | Use levy slab for separate calc |
| `distribution` | JSONB | How bonus distributes across pay periods |
| `contrib_employee` | boolean | Include in employee SS wage base |
| `contrib_employer` | boolean | Include in employer SS wage base |
| `contrib_eir` | boolean | Include in EIB wage base |
| `min_bonus_amount` | decimal? | Below = skip policy rules |
| `max_bonus_amount` | decimal? | Above = skip policy rules |

### 3.3 Bonus Exception Fields

| Field | Type | Description |
|-------|------|-------------|
| `exception_type` | string | `"month"` (currently only supported) |
| `exception_month` | integer | 1-12 (e.g., 12 for December) |
| `year_from` | integer | Start year for exception |
| `year_to` | integer? | End year (null = indefinite) |
| `override_default` | boolean | If true, overrides default policy |
| All other fields | | Same as bonus policy, nullable (null = use default) |

### 3.4 Holiday Pay Policy Fields

| Field | Type | Description |
|-------|------|-------------|
| `policy_type` | string | `"with_dates"` or `"without_dates"` |
| `distribution_enabled` | boolean | Enable distribution logic |
| `levy_include` | boolean | Include in levy |
| `levy_calculation_method` | string | `"merge"` or `"separate"` |
| `ssc_include` | boolean | Include in SSC |
| `ssc_contrib_employee` | boolean | Employee SS flag |
| `ssc_contrib_employer` | boolean | Employer SS flag |
| `ssc_contrib_eib` | boolean | EIB flag |
| `include_in_severance` | boolean | Include in severance |

---

## 4. Response Format

### Success Response (HTTP 200)

```json
{
  "status": "success",
  "message": "Configuration sync completed successfully",
  "sync_log_id": "uuid-of-sync-log-entry",
  "summary": {
    "config_periods_synced": 1,
    "config_details_synced": 1,
    "levy_slabs_synced": 1,
    "levy_slab_details_synced": 8,
    "bonus_policies_synced": 1,
    "bonus_exceptions_synced": 1,
    "holiday_policies_synced": 1,
    "holiday_exceptions_synced": 0
  }
}
```

### Duplicate Payload (HTTP 200)

```json
{
  "status": "skipped",
  "message": "This exact payload was already synced",
  "existing_sync_log_id": "uuid-of-previous-sync"
}
```

### Auth Error (HTTP 401)

```json
{
  "status": "error",
  "error": "Unauthorized: Invalid or missing API key"
}
```

### Validation Error (HTTP 400)

```json
{
  "status": "error",
  "error": "Validation failed: sync_version is required"
}
```

### Server Error (HTTP 500)

```json
{
  "status": "error",
  "error": "Sync failed: <specific error message>",
  "sync_log_id": "uuid-if-log-was-created"
}
```

---

## 5. Integration Steps for SSB Admin

### Step 1: Build the Payload

When the admin clicks "Publish", gather all active configuration from the Admin DB and build the JSON payload matching the structure in Section 2.

### Step 2: Call the API

```csharp
// C# Example (SSB Admin)
var client = new HttpClient();
client.DefaultRequestHeaders.Add("x-sync-api-key", "YOUR_SHARED_SECRET");

var payload = BuildSyncPayload(); // Your method to build the JSON
var content = new StringContent(
    JsonConvert.SerializeObject(payload),
    Encoding.UTF8,
    "application/json"
);

var response = await client.PostAsync(
    "https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/c3-config-sync",
    content
);

var result = await response.Content.ReadAsStringAsync();
```

### Step 3: Handle Responses

```csharp
if (response.IsSuccessStatusCode)
{
    var result = JsonConvert.DeserializeObject<SyncResponse>(body);
    if (result.Status == "success")
    {
        // Show success message with summary counts
        ShowSuccess($"Synced: {result.Summary.ConfigPeriodsSynced} periods, " +
                    $"{result.Summary.LevySlabsSynced} slabs, " +
                    $"{result.Summary.BonusPoliciesSynced} bonus policies");
    }
    else if (result.Status == "skipped")
    {
        // Payload already synced (idempotent)
        ShowInfo("Configuration already published. No changes detected.");
    }
}
else if (response.StatusCode == HttpStatusCode.Unauthorized)
{
    ShowError("Authentication failed. Check API key configuration.");
}
else if (response.StatusCode == HttpStatusCode.BadRequest)
{
    ShowError($"Validation error: {result.Error}");
}
else
{
    ShowError($"Sync failed: {result.Error}");
    // Log for investigation
}
```

### Step 4: Idempotency

The API is **idempotent** — sending the same payload twice returns `"status": "skipped"`. This means:
- Safe to retry on network failures
- No duplicate data will be created
- Each unique payload is identified by SHA-256 hash

---

## 6. Important Notes

1. **All `id` fields are UUIDs** — The `id` in each object becomes `admin_sync_id` in C3-Wizard. This is the conflict resolution key.
2. **`details` in `config_periods` is a single object** (not array) — Each period has exactly one detail record.
3. **`details` in `levy_slabs` is an array** — Each slab can have multiple bracket rows.
4. **Interest rate fields are omitted** from the payload. DB columns are preserved with defaults.
5. **Rate format**: All rates are decimals (0.05 = 5%), NOT percentages.

---

## 7. Calculation Test Cases Request

**We need the SSB Admin team to provide detailed test cases** to verify the calculation engine end-to-end.

### What We Need:

#### TC-A: Standard Employee (Weekly Wages Only)
```
Input:
- Employee age: [e.g., 35]
- 4-week month
- Week 1 wages: $[amount]
- Week 2 wages: $[amount]
- Week 3 wages: $[amount]
- Week 4 wages: $[amount]
- No bonus, no holiday pay

Expected Output:
- SS Employee: $[amount]
- SS Employer: $[amount]
- EIB: $[amount]
- SS_Employer (combined SS_ER + EIB): $[amount]
- Total Social Security: $[amount]
- Levy Employee (per week + total): $[amount]
- Levy Employer: $[amount]
- Severance: $[amount]
- Grand Total: $[amount]
```

#### TC-B: High Earner (Exceeds Monthly Caps)
```
Input:
- Employee age: [e.g., 40]
- Weekly wages that cause monthly SS to exceed $750 cap
- Expected capped values for SS EE, SS ER, EIB
```

#### TC-C: Age >= 62 (SS Exempt)
```
Input:
- Employee age: 62 or older
- Expected: SS EE = $0, SS ER = $0, EIB still calculated
```

#### TC-D: Bonus — Merged with Wages
```
Input:
- calculation_method = "merge"
- Employee wages + bonus amount
- Expected: How bonus is distributed into weekly slots
- Expected levy calculation on merged amounts
- Expected SS contributions with contrib flags
```

#### TC-E: Bonus — Separate (Flat Rate)
```
Input:
- calculation_method = "separate", calc_flat_enabled = true, calc_flat_percentage = 0.08
- Bonus amount
- Expected flat levy on bonus
- Expected SS contributions per contrib flags
```

#### TC-F: Bonus — December Exemption
```
Input:
- Month = 12, bonus_exception active with include_in_levy = false
- Bonus amount
- Expected: $0 levy on bonus, $0 SS on bonus (if contrib flags false)
```

#### TC-G: Holiday Pay Scenarios
```
Input:
- Holiday pay amount
- policy_type = "without_dates"
- SSC and severance flags
- Expected contributions
```

#### TC-H: Penalty Calculations
```
Input:
- Late months = 3 (for example)
- Base levy + SS amounts
- Expected penalty and fine amounts
```

#### TC-I: 5-Week Month
```
Input:
- 5-week month wages
- Expected weekly amount calculation (total / 5)
- Expected per-week and total contributions
```

### Format Preference

For each test case, please provide:
1. **All input values** (wages, bonus, holiday pay, age, month, flags)
2. **Step-by-step intermediate values** (weekly amounts, per-week SS, per-week levy)
3. **Final expected output values** (all contribution components)
4. **The active configuration rates** used in the calculation

This will allow us to validate the calculation engine line by line.

---

**Last Updated:** March 3, 2026
