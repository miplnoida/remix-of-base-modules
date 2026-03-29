

# Fix Levy Slabs Audit Trail — Before Values & DB Trigger Coverage

## Problem Analysis

From the screenshots:
1. **App interceptor entry (image-223)**: Shows field-level changes but ALL "Before" values are "—". This happens because `LevySlabDetailForm.tsx` calls `useUpdateLevySlabDetail` without passing `oldValues` — the `detail` prop contains the original record but is never forwarded.
2. **DB trigger entry (image-224)**: Shows no before/after values at all. Root cause: `tb_levy_slabs` and `tb_levy_slab_details` are NOT in the DB trigger list — the migration only covers 18 tables and these two are missing.

## Implementation Steps

### Step 1: Add DB Triggers for Levy Slab Tables

Create a migration to attach `fn_audit_row_change()` to both `tb_levy_slabs` and `tb_levy_slab_details`. Also add them to `DB_TRIGGER_TABLES` set in `globalAuditInterceptor.ts`.

### Step 2: Fix Before-Value Passing in LevySlabDetailForm

In `LevySlabDetailForm.tsx`, when calling `updateMutation.mutateAsync`, pass the `detail` prop as `oldValues`:
```typescript
oldValues: {
  pay_period: detail.pay_period,
  over_amt: detail.over_amt,
  base_amt: detail.base_amt,
  tax_rate: detail.tax_rate,
  order_no: detail.order_no,
  is_active: detail.is_active
}
```

### Step 3: Fix Before-Value Capture in useLevySlabsManagement Hook

The `useUpdateLevySlabDetail` hook already accepts `oldValues` but the form never passes it. Additionally, the `useUpdateLevySlab` hook accepts `oldValues` — need to verify callers pass it too.

Search for all callers of `useUpdateLevySlab` to ensure they also pass `oldValues`.

### Step 4: Enhance the Audit Logging in the Hooks

In both `useUpdateLevySlab` and `useUpdateLevySlabDetail`, add a **pre-mutation fetch** as a fallback when `oldValues` is not provided:
```typescript
// If oldValues not provided, fetch current record before updating
if (!oldValues) {
  const { data: current } = await supabase
    .from('tb_levy_slab_details')
    .select('*')
    .eq('id', id)
    .single();
  oldValues = current;
}
```

This ensures before-values are always captured even if a caller forgets to pass them.

### Step 5: Add No-Change Detection

Before executing the update, compare `oldValues` with `newValues`. If identical, skip the update and show a toast: "No changes detected."

## Files to Modify

| File | Change |
|------|--------|
| **New migration SQL** | Add audit triggers to `tb_levy_slabs` and `tb_levy_slab_details` |
| `src/services/globalAuditInterceptor.ts` | Add both tables to `DB_TRIGGER_TABLES` set |
| `src/components/admin/levy-slabs/LevySlabDetailForm.tsx` | Pass `oldValues` from `detail` prop when calling update |
| `src/hooks/useLevySlabsManagement.ts` | Add pre-mutation fetch fallback for `oldValues` in both update hooks; add no-change detection |

