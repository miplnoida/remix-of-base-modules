

# Comprehensive Audit Trail Unification — Global Policy

## Problem Summary

The system has **three competing audit write paths** that create duplicate and inconsistent entries:

1. **Old trigger** (`audit_table_changes`) — 17 tables use this. Stores full rows but no `changed_fields` metadata, no `source` tag. Uses `trg_audit_*` trigger names.
2. **New trigger** (`fn_audit_row_change`) — 17 tables use this. Stores full rows + `changed_fields` in `payload_json`. Uses `audit_table_changes` trigger names (confusingly).
3. **App-level** — `logAuditTrail()` (13 files, ~95 calls), `logAuditEntry()` (global interceptor + `useAuditedMutation`), and `useLoggedMutation`.

Tables like `cn_receipt`, `cn_batch`, `er_master`, `profiles`, `system_settings`, `bema_*` have **BOTH** the old and new triggers — creating 2 DB-level entries per change. Tables like `tb_currencies`, `ip_self_employ`, `cn_cash_count`, `api_settings`, `api_registry`, `workflow_instances`, `cn_card_machine`, `cn_batch_card_transaction`, `cn_batch_cheque_verification`, `tb_self_emp_contrib_rate` only have the old trigger. Then the global MutationCache interceptor adds a third entry (which gets suppressed for tables in `DB_TRIGGER_TABLES`, but that set is incomplete).

## Fix Strategy

### Step 1: Database Migration — Consolidate to Single Trigger Function

One migration that:
- **Drops ALL old `trg_audit_*` triggers** (the ones using `audit_table_changes`)
- **Creates new `fn_audit_row_change` triggers** on tables that currently only have the old trigger (`tb_currencies`, `ip_self_employ`, `ip_master`, `cn_cash_count`, `api_settings`, `api_registry`, `workflow_instances`, `cn_card_machine`, `cn_batch_card_transaction`, `cn_batch_cheque_verification`, `tb_self_emp_contrib_rate`)
- **Drops the old `audit_table_changes` function** entirely (replaced by `fn_audit_row_change`)

This eliminates all duplicate DB-level entries and standardizes every audited table on the new function with `changed_fields` support.

### Step 2: Expand `DB_TRIGGER_TABLES` in `globalAuditInterceptor.ts`

Add every table that now has the `fn_audit_row_change` trigger, plus their mutation key aliases:
- `ip_master`, `ip_self_employ`, `cn_cash_count`, `api_settings`, `api_registry`, `workflow_instances`, `cn_card_machine`, `cn_batch_card_transaction`, `cn_batch_cheque_verification`, `tb_self_emp_contrib_rate`, `tb_currencies`

This ensures the global MutationCache interceptor skips app-level logging for all DB-triggered tables.

### Step 3: Update `auditService.ts` — Strengthen Guards

The `logAuditTrail()` function already checks `DB_TRIGGER_TABLES`. With the expanded set, all manual calls in `PaymentModuleConfig.tsx`, `SecurityPolicySettings.tsx`, `IPAccessRulesManagement.tsx`, `useSystemSettings.ts`, `usePaymentModuleConfig.ts`, etc. will be automatically suppressed for DB-triggered tables — no need to edit each caller.

For entity types NOT in `DB_TRIGGER_TABLES` (e.g., `cybersource_settings`, `cloudflare`, `system_setting` used as alias), the manual calls continue to work. Add an additional guard: skip any entry where `action` contains `update` and both `beforeValue` and `afterValue` are empty/null.

### Step 4: Update `useAuditedMutation` — Add DB Trigger Guard

Import `DB_TRIGGER_TABLES` and skip `logAuditEntry` call when the `entityType` is in the set, same as the other two paths.

### Step 5: Provide Live SQL Script

Output a standalone SQL script the user can execute on the Live database containing:
- The consolidated `fn_audit_row_change()` function
- All `DROP TRIGGER` statements for old triggers  
- All `CREATE TRIGGER` statements for new triggers
- Drop of the old function

## Files to Modify

| File | Change |
|------|--------|
| **New migration SQL** | Drop old triggers, create new ones on all tables, drop `audit_table_changes` function |
| `src/services/globalAuditInterceptor.ts` | Expand `DB_TRIGGER_TABLES` with all audited table names + aliases |
| `src/services/auditService.ts` | Add empty before/after guard for all actions (not just update) |
| `src/hooks/useAuditedMutation.ts` | Add `DB_TRIGGER_TABLES` guard to skip logging for triggered tables |

## Technical Detail

After this change, the audit trail has exactly **one entry per data change** — from the DB trigger. The three app-level paths (MutationCache, `logAuditTrail`, `useAuditedMutation`) all check `DB_TRIGGER_TABLES` and silently skip. For tables without triggers (rare, non-critical), app-level logging still works as a fallback. This is enforced as a reusable standard: any new table added to `DB_TRIGGER_TABLES` is automatically protected from duplicates across all three paths.

