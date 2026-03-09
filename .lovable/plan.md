

# Add Configurable NWD Employee Levy Rate to C3 Configuration

## Summary

Add a new `nwd_employee_levy_rate` column to `c3_config_details`, expose it in the Admin Configuration Details dialog (Levy tab), include it in the publish payload to C3-Wizard, and produce a migration guide for the C3-Wizard team.

## Database Change

Add one column to `c3_config_details`:

```sql
ALTER TABLE c3_config_details 
ADD COLUMN nwd_employee_levy_rate numeric DEFAULT 0.08;
-- Stores as decimal (0.08 = 8%), consistent with all other rate columns
```

Default `0.08` ensures backward compatibility — existing periods automatically get the legacy 8% rate.

## Code Changes

### 1. `src/hooks/useC3ConfigManagement.ts`
Add `nwd_employee_levy_rate: number` to the `C3ConfigDetails` interface.

### 2. `src/components/admin/c3-period-config/C3ConfigDetailsDialog.tsx`
Add a new field in the **Levy** tab, after the existing "Employer Levy Rate" field:

```
Label: "NWD Employee Levy Rate (%)"
Helper: "Flat levy rate applied to Non-Working Directors"
Input: number, step 0.01, uses handleRateChange (decimal ↔ percentage display)
```

### 3. `src/hooks/useC3ConfigPublish.ts` — `buildSyncPayload()`
No code change needed. The payload already sends full `c3_config_details` rows via `details: details?.find(...)`. The new column will be automatically included once the migration runs and types regenerate.

### 4. Sync Log Interface (`C3SyncLogEntry`)
No changes needed — the NWD rate travels inside the existing `config_periods[].details` object.

## C3-Wizard Team Integration Guide

A markdown guide will be created at `docs/C3_WIZARD_NWD_LEVY_RATE_GUIDE.md` with:

1. **What changed**: New field `nwd_employee_levy_rate` (decimal, e.g. `0.08` = 8%) in every `config_periods[].details` object of the sync payload.
2. **Payload example**: Show the field location in the published JSON.
3. **Migration steps for Wizard**:
   - Read `nwd_employee_levy_rate` from the synced config for the active period.
   - Replace all hardcoded `0.08` references with the dynamic value.
   - Fallback: if field is `null` or missing (older payloads), default to `0.08`.
4. **Calculation formula** (unchanged logic, dynamic rate):
   ```
   levyRate = config.nwd_employee_levy_rate  // e.g. 0.08
   employeeLevy = totalWages * levyRate
   penalty (if lateMonths >= 2) = employeeLevy * (levyRate + lateMonths/100)
   ```
5. **Testing checklist**: Verify with rate = 8%, then change to another value and republish.

## Files to Change

| File | Change |
|---|---|
| **Migration SQL** | Add `nwd_employee_levy_rate` column to `c3_config_details` |
| `src/hooks/useC3ConfigManagement.ts` | Add field to `C3ConfigDetails` interface |
| `src/components/admin/c3-period-config/C3ConfigDetailsDialog.tsx` | Add NWD rate input in Levy tab |
| `docs/C3_WIZARD_NWD_LEVY_RATE_GUIDE.md` | New file — integration guide for C3-Wizard team |

No changes needed to the publish hook or edge function — the new column flows through automatically.

