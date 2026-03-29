

# Audit Trail Redesign — Architecture Plan

## Problem Summary

The audit trail is broken in three ways:
1. **Generic "Mutation" labels**: ~70 mutation hooks lack `mutationKey`, so the global `MutationCache` interceptor falls back to `{ action: 'mutation' }`.
2. **No before-values on updates**: The global interceptor only logs `variables` as `afterValue`. The `beforeValue` is always null unless using the rarely-adopted `useAuditedMutation` wrapper.
3. **No field-level diff in UI**: The detail dialog shows raw JSON blobs for before/after, with no visual diff highlighting.

## Architecture

```text
┌─────────────────────────────────────────────────────┐
│                  DATABASE LAYER                      │
│  audit_table_changes TRIGGER (INSERT/UPDATE/DELETE) │
│  → Captures OLD/NEW rows automatically              │
│  → Computes field-level diff                        │
│  → Classifies action (create/update/delete)         │
│  → Writes to system_audit_trail                     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│              APPLICATION LAYER                       │
│  MutationCache interceptor (App.tsx)                │
│  → Improved action classification                   │
│  → Smarter entity/module resolution                 │
│  → Deduplication with DB trigger entries            │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│                   UI LAYER                           │
│  AuditTrail.tsx — Enhanced detail dialog            │
│  → Visual field-level diff                          │
│  → Action type dropdown filter                      │
│  → Suppress empty/redundant entries                 │
└─────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Database Trigger for Automatic Change Capture

Create a **generic audit trigger function** that can be attached to key tables. This is the most impactful change — it captures real before/after values at the database level, eliminating reliance on the application layer for data accuracy.

**Migration SQL:**
- Create `fn_audit_row_change()` trigger function that:
  - Detects operation type (INSERT → `create`, UPDATE → `update`, DELETE → `delete`)
  - Computes field-level diff (only changed fields in before/after)
  - Skips meta fields (`updated_at`, `modified_by`, etc.)
  - Resolves entity_id from dynamic PK columns (`id`, `receipt_id`, etc.)
  - Writes to `system_audit_trail` with `source: 'db_trigger'`
- Attach trigger to the top ~20 business-critical tables: `cn_receipt`, `cn_batch`, `er_master`, `ia_engagements`, `ia_findings`, `bema_c3_submissions`, `payment_module_config`, `system_settings`, `security_policy_config`, `ip_access_rules`, etc.

### Step 2: Improve MutationCache Global Interceptor

Refactor `globalAuditInterceptor.ts` and `App.tsx`:

- **Smart action classification** in `parseMutationKey`: When no `mutationKey` exists, infer the action from the mutation's `mutationFn` string or from variables:
  - If variables contain `id` + other fields → `update`
  - If variables have no `id` but have entity fields → `create`  
  - If the mutation result is void/empty → `delete`
- **Deduplicate with DB triggers**: Add `source: 'app_interceptor'` tag. When DB triggers are active on a table, the interceptor marks its entry as `supplementary` to avoid double-counting.
- **Richer entity type inference**: Expand `inferEntityTypeFromVariables` to cover more table patterns from the 70 hook files.

### Step 3: Add `mutationKey` to All Mutation Hooks

Systematically add `mutationKey: ['Module', 'entity_table', 'action']` to every `useMutation` call across the ~70 hook files. This is the bulk of the work. Examples:

| Hook File | mutationKey |
|-----------|-------------|
| `useAuditDataExtended2.ts` (create finding) | `['InternalAudit', 'ia_findings', 'create']` |
| `useAuditDataExtended2.ts` (update finding) | `['InternalAudit', 'ia_findings', 'update']` |
| `useC3CalculationConfig.ts` | `['C3Config', 'c3_calculation_config', 'update']` |
| `useSystemSettings.ts` | `['Admin', 'system_settings', 'update']` |
| `useWorkflowMeetingDepartments.ts` (add) | `['Workflow', 'meeting_departments', 'create']` |

### Step 4: Enhance Before-Value Capture in Global Interceptor

For the global `MutationCache.onSuccess`:
- When action is `update` and variables contain an `id`, perform a **post-hoc fetch** of the record from `system_audit_trail` (DB trigger entry) to link the before/after values, rather than trying to fetch before the mutation (which is architecturally impossible in a global interceptor).
- For explicit `logAuditTrail()` calls already in the codebase (13 files), verify they pass correct `beforeValue` and `afterValue`.

### Step 5: Enhance Audit Trail UI

**`AuditTrail.tsx` changes:**

1. **Action Filter Dropdown**: Replace the free-text Action filter with a `<Select>` dropdown populated with: `Create`, `Update`, `Delete`, `Status Change`, `Approve`, `Reject`, `Enable`, `Disable`, `Login`, `Logout`, `File Upload`, `Export`, `Page View`.

2. **Field-Level Diff in Detail Dialog**: Replace the raw JSON before/after panels with a structured diff table:
   ```text
   ┌──────────────┬─────────────┬─────────────┐
   │ Field        │ Before      │ After       │
   ├──────────────┼─────────────┼─────────────┤
   │ status       │ Draft       │ Approved    │
   │ approved_by  │ —           │ JBarry      │
   └──────────────┴─────────────┴─────────────┘
   ```
   - Color-code: red for removed values, green for added, yellow for changed.
   - Hide fields where before === after.
   - For `create` actions, show only "After" column.
   - For `delete` actions, show only "Before" column.

3. **Suppress empty entries**: Filter out entries where both `before_value` and `after_value` are null and action is `update`.

4. **Source indicator**: Show a small badge (`DB` / `App` / `Manual`) based on `payload_json.source`.

### Step 6: Add Business Workflow Action Logging

For domain-specific actions that aren't simple CRUD, add explicit `logAuditTrail()` or `logAuditEntry()` calls:
- **Status changes**: Log as `status_change` with before/after status values
- **Approvals/Rejections**: Log as `approve` / `reject`
- **File operations**: Log as `file_upload` / `file_download`
- **Auth events**: Already handled by `logSecurity`, ensure they also appear in audit trail

## Files to Create/Modify

| File | Change |
|------|--------|
| **New migration** | `fn_audit_row_change()` trigger + attach to 20 tables |
| `src/services/globalAuditInterceptor.ts` | Enhanced action classification, dedup logic |
| `src/App.tsx` | Minor: pass `_data` (result) to afterValue instead of just variables |
| `src/pages/system-logs/AuditTrail.tsx` | Diff table UI, dropdown filter, source badge |
| ~30 hook files in `src/hooks/` | Add `mutationKey` arrays |
| `src/services/auditService.ts` | Add `computeFieldDiff` export for manual callers |

## Technical Notes

- The DB trigger approach is the most reliable because it captures the true OLD/NEW row values within the transaction. The application layer interceptor serves as supplementary context (route, screen, tab info).
- No RLS will be added (per architectural rule).
- The trigger function uses `SECURITY DEFINER` to write to `system_audit_trail` regardless of caller privileges.
- Estimated scope: ~35 files modified, 1 migration, ~2-3 implementation cycles.

