

# Fix Levy Slabs Audit Log Accuracy

## Root Cause

The screenshot shows a **MutationCache_global** entry where:
- **All "Before" values are "—"** because the global interceptor never sets `beforeValue`
- **"After" values are raw mutation variables** (including internal fields like `oldValues`, `userCode`, `slabId`) because line 63 of `App.tsx` blindly dumps `variables` as `afterValue`
- **`supplementary: false`** despite DB triggers being active — because the mutationKey uses `levy_slabs` but `DB_TRIGGER_TABLES` contains `tb_levy_slabs` (prefix mismatch)

So the audit trail shows misleading data: internal mutation parameters appear as "changed values."

## Fix Strategy

### 1. Fix Global Interceptor in `App.tsx` (lines 56-68)

Extract `oldValues`/`beforeValue` from variables and strip internal/meta fields before logging:

```typescript
// Extract beforeValue if variables contain oldValues
const rawVars = variables && typeof variables === 'object' ? variables as Record<string, any> : {};
const beforeValue = rawVars.oldValues || rawVars.beforeValue || null;

// Strip internal fields from afterValue
const INTERNAL_FIELDS = new Set([
  'oldValues', 'beforeValue', 'userCode', 'userName', 'user_code', 'user_name',
  'slabId', 'slab_id', 'oldValue', 'newValue'
]);
const cleanAfter: Record<string, any> = {};
for (const [k, v] of Object.entries(rawVars)) {
  if (!INTERNAL_FIELDS.has(k)) cleanAfter[k] = v;
}

logAuditEntry({
  ...
  beforeValue,
  afterValue: Object.keys(cleanAfter).length > 0 ? cleanAfter : undefined,
  ...
});
```

### 2. Fix `DB_TRIGGER_TABLES` Name Mismatch in `globalAuditInterceptor.ts`

Add non-prefixed aliases so the supplementary flag works correctly:

```typescript
const DB_TRIGGER_TABLES = new Set([
  // ... existing entries ...
  'tb_levy_slabs', 'tb_levy_slab_details',
  'levy_slabs', 'levy_slab_details',  // aliases from mutationKey
]);
```

### 3. Skip Global Interceptor for Supplementary Entries

Currently supplementary entries are still written (just flagged). Change to **skip writing entirely** when the table has DB triggers, since the DB trigger already captures accurate before/after:

In `globalAuditInterceptor.ts` `logAuditEntry()`:
```typescript
// If DB trigger handles this table, skip app-level logging entirely
if (isDbTriggered && source !== 'db_trigger') return;
```

### 4. Verify Hook-Level `logC3ConfigChange` Accuracy

The hooks in `useLevySlabsManagement.ts` already call `logC3ConfigChange()` with correct `oldValue`/`newValue`. This writes to the C3 audit log via RPC (separate from `system_audit_trail`). The DB trigger on `tb_levy_slab_details` will write accurate field-level diffs to `system_audit_trail` automatically — so the global interceptor entry is pure noise.

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Extract `oldValues` from variables as `beforeValue`, strip internal fields from `afterValue` |
| `src/services/globalAuditInterceptor.ts` | Add alias names to `DB_TRIGGER_TABLES`; skip writing supplementary entries entirely |

## Technical Detail

- The DB trigger `fn_audit_row_change()` on `tb_levy_slab_details` already captures the true PostgreSQL `OLD` and `NEW` row with field-level diff. This is the authoritative audit entry.
- The global MutationCache interceptor was creating a second, inaccurate entry. After this fix, tables with DB triggers will only have one clean entry from the trigger.
- For tables without DB triggers, the global interceptor will now correctly extract `beforeValue` from mutation variables (if passed) and strip internal fields.

