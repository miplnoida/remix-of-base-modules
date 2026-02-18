
## Plan: Remove Stale Dependant Staging Warning from Validation RPC

### Root Cause

The `validate_application_for_conversion` database function contains a hardcoded warning block (lines 641–648 of migration `20260218012947`) that states dependants will be staged and require manual SSN linking. This warning was accurate under the old architecture but is now **factually wrong**.

The conversion now uses `convert_application_atomic` which inserts all dependants directly into `ip_depend` within the same database transaction as `ip_master`, immediately after the permanent SSN is generated. No staging table is used. No manual action is required.

### What Needs to Change

**1. Database: Update `validate_application_for_conversion` RPC**

Create a new migration that uses `CREATE OR REPLACE FUNCTION` to redefine `validate_application_for_conversion` with the stale staging warning block removed. The rest of the validation logic (missing fields, length checks, date checks, dependant name and DOB checks) remains unchanged and correct.

The block to remove is:

```sql
-- THIS BLOCK MUST BE DELETED:
IF p_dependants IS NOT NULL AND jsonb_array_length(p_dependants) > 0 THEN
  v_warnings := v_warnings || jsonb_build_object(
    'field', 'dependants',
    'type', 'INFO',
    'message', jsonb_array_length(p_dependants) || 
      ' dependant(s) will be staged pending SSN assignment...'
  );
END IF;
```

Also update the relationship-not-found warning message (line 620–622) which says "Dependant will be staged for manual review" — this should instead say "relation code will be stored as null" to reflect the actual behavior in `useConvertToIPRegistration.ts` (`buildDependantsJson` sets `relationCode` to `null` when not found in `validRelationCodes`).

**2. No Frontend Changes Needed**

The `ConversionValidationPanel` component correctly renders whatever warnings come back from the RPC. Once the stale warning is removed from the RPC, it will no longer appear on screen. No UI code changes are required.

### Technical Details

**Migration**: `CREATE OR REPLACE FUNCTION public.validate_application_for_conversion(...)` — full function body republished with the two stale descriptions corrected:

- Remove the dependant staging INFO warning entirely.
- Change the relationship warning message from "will be staged for manual review" to "will be stored as null in the system".

**Scope of impact**: Only the validation pre-flight display. The actual conversion (`convert_application_atomic`) is unaffected and continues to work correctly as an atomic transaction.

**Risk**: Zero — this is a warning message correction. No conversion logic, no data path, no transaction handling is touched.
