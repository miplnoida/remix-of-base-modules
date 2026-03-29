

# Fix Audit Trail: Complete Row Display + Empty C3 Config Entries

## Problem Analysis

**Screenshot 1 (DB trigger entry)**: The DB trigger (`fn_audit_row_change`) only stores the **changed fields** in `before_value`/`after_value` (e.g., `base_amt`, `modified_on`). User wants to see the **complete row** with changed fields visually highlighted, so reviewers can understand the context (which slab, what pay period, etc.) without needing just the entity ID.

**Screenshot 2 (Empty C3 Configuration entry)**: This is a duplicate app-level entry that should have been suppressed. The `parseMutationKey` for `['Admin', 'levy_slabs', 'update']` returns `entityType: 'levy_slabs'` which IS in `DB_TRIGGER_TABLES` — so the `logAuditEntry` skips it. However, the `logC3ConfigChange` RPC in the hook writes to `c3_unified_audit_log` (a **separate** table), not `system_audit_trail`. The empty entry in `system_audit_trail` likely comes from a different code path or a timing issue. Need to verify and ensure no empty entries are created.

## Implementation Steps

### Step 1: Modify DB Trigger to Store Complete Row

Update `fn_audit_row_change()` to store the **full row** in `before_value` and `after_value` for UPDATE operations (instead of only changed fields). Add a new `changed_fields` key inside `payload_json` that lists which fields actually changed. This way the UI has both the complete context AND knows what to highlight.

**Migration SQL** — `CREATE OR REPLACE FUNCTION fn_audit_row_change()`:
- For UPDATE: set `v_before_value := v_old_json` and `v_after_value := v_new_json` (full rows)
- Compute diff keys into a JSONB array stored in `payload_json.changed_fields`
- Still skip the audit entry entirely if no real changes detected

### Step 2: Update Audit Trail UI to Highlight Changed Fields

In `AuditTrail.tsx`, modify the detail dialog to:
- Show **all fields** from the complete row (from `before_value` / `after_value`)
- Read `payload_json.changed_fields` array to determine which rows to highlight
- If `changed_fields` is available, show the full table but only color-highlight rows where the field is in `changed_fields`
- If `changed_fields` is not available (legacy entries), fall back to current diff-only behavior

### Step 3: Fix Empty C3 Configuration Entries

Investigate and fix the source of the empty "C3 Configuration" entry (Screenshot 2). The `logAuditEntry` should already skip `levy_slabs` tables. Add a guard in `logAuditEntry` to also skip entries where both `beforeValue` and `afterValue` are empty/null for `update` actions — these are noise.

## Files to Modify

| File | Change |
|------|--------|
| **New migration SQL** | `CREATE OR REPLACE FUNCTION fn_audit_row_change()` — store full rows + `changed_fields` in payload |
| `src/pages/system-logs/AuditTrail.tsx` | Show all fields with changed ones highlighted; skip empty update entries |
| `src/services/globalAuditInterceptor.ts` | Add guard to skip empty update entries |

