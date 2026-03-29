

# Fix Duplicate & Empty Audit Entries

## Problem Analysis

**Screenshots 1 & 2**: A single `exchange_rate` change on `tb_currencies` creates TWO log entries:
- Entry 1 (image-228, Module "Configuration"): From some source, shows proper data with 1 field changed
- Entry 2 (image-229, Module "Payment Module Configuration"): From `logAuditTrail()` in `PaymentModuleConfig.tsx` line 311 — passes the full `before` object but only the partial `payload` as `after`, causing `id` and `is_active` to appear as "changed" (present in before, missing from after)

Root cause: `PaymentModuleConfig.tsx` manually calls `logAuditTrail()` with mismatched before/after data, AND the table has no guard preventing duplicates.

**Screenshot 3**: Empty "C3 Configuration" entry. The global MutationCache interceptor catches C3 config mutations (mutationKey `['C3Config', 'c3_config_management', ...]`). The entityType resolves to `c3_config_management` which is NOT in `DB_TRIGGER_TABLES`, so the interceptor writes an entry. But variables don't contain meaningful before/after data. The empty-entry guard only checks `update`/`mutation` actions but this entry may use `status_change` or other action strings.

## Fix Steps

### Step 1: Add DB Trigger to `tb_currencies`

New migration: attach `fn_audit_row_change()` to `tb_currencies`. This gives us the authoritative full-row audit entry.

### Step 2: Expand `DB_TRIGGER_TABLES` in `globalAuditInterceptor.ts`

Add:
- `tb_currencies`, `currencies` (alias)
- `c3_config_management`, `c3_config_periods`, `c3_config_details` (C3 config mutation keys)

### Step 3: Expand Empty-Entry Guard

Change the guard from only checking `update`/`mutation` to skipping **any** action when both `beforeValue` and `afterValue` are empty. This catches screenshot 3's empty entries regardless of action type.

### Step 4: Add DB_TRIGGER_TABLES Guard to `auditService.ts`

Import the same set and add a guard at the top of `logAuditTrail()` — if `entityType` is in the DB-triggered set, skip writing. This prevents the manual `auditLog()` calls in `PaymentModuleConfig.tsx` from creating duplicate entries alongside the DB trigger.

## Files to Modify

| File | Change |
|------|--------|
| **New migration SQL** | Add audit trigger to `tb_currencies` |
| `src/services/globalAuditInterceptor.ts` | Expand `DB_TRIGGER_TABLES`; broaden empty-entry guard |
| `src/services/auditService.ts` | Add DB-triggered table guard to `logAuditTrail()` |

