# C3-Wizard Integration Guide: Non-Working Director (NWD) Employee Levy Rate

## Overview

The SSB Admin system now publishes a **configurable NWD Employee Levy Rate** as part of the C3 configuration sync payload. The C3-Wizard Employer system must consume this value dynamically instead of using the hardcoded `0.08` (8%) rate.

---

## What Changed

A new field `nwd_employee_levy_rate` has been added to the `c3_config_details` table and is included in the published configuration payload.

| Field | Type | Default | Description |
|---|---|---|---|
| `nwd_employee_levy_rate` | `numeric` | `0.08` | Decimal rate for NWD Employee Levy (0.08 = 8%) |

---

## Payload Location

The new field is included in each `config_periods[].details` object of the sync payload:

```json
{
  "sync_version": "3.0",
  "sync_timestamp": "2026-03-09T13:00:00.000Z",
  "config_periods": [
    {
      "start_date": "2026-01-01",
      "end_date": null,
      "is_active": true,
      "details": {
        "employee_ss_rate": 0.05,
        "employer_ss_rate": 0.05,
        "employer_eib_rate": 0.01,
        "employer_levy_rate": 0.03,
        "employer_severance_rate": 0.01,
        "nwd_employee_levy_rate": 0.08,
        ...
      }
    }
  ]
}
```

---

## Migration Steps for C3-Wizard Team

### Step 1: Update Database Schema

Add the new column to your local config storage table (if synced configs are persisted):

```sql
ALTER TABLE wiz_c3_config_details 
ADD COLUMN nwd_employee_levy_rate numeric DEFAULT 0.08;
```

### Step 2: Update Sync Ingestion Logic

Ensure the sync endpoint reads and stores `nwd_employee_levy_rate` from the incoming payload's `details` object.

### Step 3: Replace Hardcoded Rate in NWD Calculation

**Before (hardcoded):**
```javascript
// NonDirectorRepo or equivalent
const levyRate = 0.08; // HARDCODED
const employeeLevy = totalWages * levyRate;
```

**After (configurable):**
```javascript
// Read from synced config for the active period
const levyRate = activeConfig.nwd_employee_levy_rate ?? 0.08; // Fallback to 8%
const employeeLevy = totalWages * levyRate;
```

### Step 4: Update Penalty Calculation (if applicable)

The penalty formula for NWD remains the same, but must also use the dynamic rate:

```javascript
// Legacy formula from NonDirectorRepo.Levy_amount() lines 1484-1489
if (lateMonths >= 2) {
  const penaltyRate = (levyRate + lateMonths / 100);
  const penalty = employeeLevy * penaltyRate;
}
```

---

## Calculation Reference

| Scenario | Formula |
|---|---|
| **NWD Employee Levy** | `totalWages × nwd_employee_levy_rate` |
| **NWD Penalty** (lateMonths ≥ 2) | `employeeLevy × (nwd_employee_levy_rate + lateMonths / 100)` |

### Example

| Input | Value |
|---|---|
| Total Wages | $650 |
| `nwd_employee_levy_rate` | 0.08 (8%) |
| **Employee Levy** | $650 × 0.08 = **$52.00** |
| Late Months | 3 |
| **Penalty** | $52.00 × (0.08 + 0.03) = $52.00 × 0.11 = **$5.72** |

---

## Fallback Strategy

If `nwd_employee_levy_rate` is `null` or missing from the payload (e.g., older sync versions), default to `0.08`:

```javascript
const nwdRate = config?.nwd_employee_levy_rate ?? 0.08;
```

This ensures backward compatibility during the transition period.

---

## Testing Checklist

- [ ] Sync a payload containing `nwd_employee_levy_rate: 0.08` — verify NWD levy = `totalWages × 0.08`
- [ ] Change Admin rate to `0.10` (10%), republish — verify NWD levy updates to `totalWages × 0.10`
- [ ] Test with missing field (simulate old payload) — verify fallback to `0.08`
- [ ] Verify penalty calculation uses the dynamic rate
- [ ] Verify Standard Employee and Working Director calculations are **unaffected**

---

## Contact

For questions about this integration, contact the SSB Admin team.
