

# C3 Configuration Lifecycle Management Enhancement

## Overview
Enhance the C3 Configuration screen with full create/edit capabilities for Period Configuration, backend-enforced overlap validation, date-boundary split logic, and audit logging across all tabs.

## Current State Analysis

**Period Config tab**: Currently only supports clone and edit-details (rates/parameters) via dialogs. No direct create or inline edit of period dates. No overlap or split validation.

**Filing & Penalties tab**: Already has the full pattern — `analyze_filing_config_change` RPC for overlap/split detection, `upsert_filing_config_period` RPC for atomic save with split support, inline create/edit form, and split confirmation dialog. This is the reference implementation.

**Bonus Policy, Holiday Pay Policy, Income Code Policy tabs**: Have client-side-only `checkDateOverlap()` utility. No backend enforcement. No split logic for historical edits.

**Levy Slabs tab**: Has create/edit/clone/delete. No overlap or split validation.

## Implementation Plan

### 1. Database: Centralized Config Lifecycle RPC
**New migration** creating two generic RPCs that serve all config tabs:

**`analyze_c3_config_change(p_table_name, p_id, p_date_from, p_date_to, p_values_json)`**
- Validates against the specified table (allowlisted: `c3_config_periods`, `c3_bonus_policy_default`, `c3_holiday_pay_policy_default`, `c3_income_code_policy_default`, `tb_levy_slabs`)
- Checks overlap with existing active records (excluding self on edit)
- If editing a record whose `date_from` < first of current month → returns `split` action with before/after details
- If creating with `date_from` < first of current month → returns `error`
- Otherwise returns `normal`
- Returns the conflicting record's date range in error messages

**`upsert_c3_config_with_split(p_table_name, p_id, p_date_from, p_date_to, p_values_json, p_user_code, p_force_split)`**
- Allowlisted tables only (same set)
- SPLIT mode: closes old record at last day of previous month, inserts new record from 1st of current month with provided values
- NORMAL mode: insert or update as appropriate
- Logs to `system_audit_trail` with action, entity_type, user info
- All within a single transaction

**`create_c3_config_period(p_start_date, p_end_date, p_description, p_details_json, p_user_code)`**
- Creates a new period in `c3_config_periods` with details in `c3_config_details` in one transaction
- Validates overlap against existing periods
- Logs audit

### 2. Period Configuration Tab — Create & Edit
**Modified files**: `C3PeriodConfigTab.tsx`, `C3ConfigDetailsDialog.tsx`

- Add "Create New Period" button next to the heading
- New `C3ConfigCreateDialog.tsx` component: full form with date range + all detail fields (reusing the tab structure from `C3ConfigDetailsDialog`)
- On save: calls `analyze_c3_config_change` first; if `normal` → calls create RPC; if `error` → shows validation message; if `split` → shows split confirmation
- Edit flow in `C3ConfigDetailsDialog`: when saving, run analyze first. If the period's start_date is historical, trigger split confirmation before applying changes
- Add split confirmation `AlertDialog` (same pattern as Filing tab's `showSplitConfirm`)

### 3. Backend Overlap Validation for All Tabs
**Modified files**: `BonusPolicyDefaultTab.tsx`, `HolidayPayPolicyDefaultTab.tsx`, `IncomeCodePolicyDefaultTab.tsx`, `LevySlabsConfigTab.tsx`, and their hooks

For each tab's create/save flow:
- Before saving, call `analyze_c3_config_change` with the appropriate table name
- If `error` → show toast with the conflicting record's date range
- If `split` → show split confirmation dialog explaining the truncation
- If `normal` → proceed with save
- Keep existing client-side `checkDateOverlap` as a fast pre-check; backend is the authoritative enforcer

### 4. Split Confirmation Dialog (Shared Component)
**New file**: `src/components/admin/c3-configuration/C3SplitConfirmDialog.tsx`

A reusable confirmation dialog that:
- Shows original record's date range
- Shows where it will be truncated (last day of previous month)
- Shows the new record's start date (1st of current month)
- Shows before/after parameter values
- Has Confirm and Cancel buttons
- Used by Period Config, Bonus, Holiday, Income Code, Levy, and Filing tabs

### 5. Audit Trail
All RPCs log to `system_audit_trail` using the correct schema columns (`action`, `entity_type`, `entity_id`, `module`, `user_id`, `user_name`, `after_value`, `payload_json`).

Split operations log two entries: one for the truncated record, one for the newly created record.

### Files Summary

| Action | File |
|--------|------|
| Create | Migration SQL (RPCs: analyze, upsert-with-split, create-period) |
| Create | `src/components/admin/c3-configuration/C3SplitConfirmDialog.tsx` |
| Create | `src/components/admin/c3-period-config/C3ConfigCreateDialog.tsx` |
| Modify | `src/components/admin/c3-configuration/C3PeriodConfigTab.tsx` — add Create button + split flow |
| Modify | `src/components/admin/c3-period-config/C3ConfigDetailsDialog.tsx` — add split check on save |
| Modify | `src/hooks/useC3ConfigManagement.ts` — add create mutation, analyze hook |
| Modify | `src/components/admin/c3-configuration/BonusPolicyDefaultTab.tsx` — backend overlap + split |
| Modify | `src/hooks/useBonusPolicy.ts` — integrate analyze RPC |
| Modify | `src/components/admin/c3-configuration/HolidayPayPolicyDefaultTab.tsx` — backend overlap + split |
| Modify | `src/hooks/useHolidayPayPolicy.ts` — integrate analyze RPC |
| Modify | `src/components/admin/c3-configuration/IncomeCodePolicyDefaultTab.tsx` — backend overlap + split |
| Modify | `src/hooks/useIncomeCodePolicy.ts` — integrate analyze RPC |
| Modify | `src/components/admin/c3-configuration/LevySlabsConfigTab.tsx` — backend overlap + split |
| Modify | `src/hooks/useLevySlabsManagement.ts` — integrate analyze RPC |

### Validation Rules (enforced at backend)
1. `date_from` is required
2. `date_to >= date_from` when provided
3. No overlapping active date ranges within the same config table
4. Only one open-ended record per table (where `date_to IS NULL`)
5. Cannot create records starting before 1st of current month
6. Editing historical records triggers split: old record closes at last day of previous month, new record starts at 1st of current month
7. Error messages include the conflicting record's date range for clarity

