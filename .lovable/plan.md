

# Batch Management — Implementation Plan

## Overview

Replace the current mock `BatchManagement.tsx` with a fully functional screen backed by `cn_batch`, plus a new **Payment Module Configuration** screen to store configurable rules (cashier roles, all-batch access, duplicate-batch handling).

## Database Changes

### New Table: `payment_module_config`

Stores module-level configuration as key-value pairs, following the same pattern as `system_settings`:

```sql
CREATE TABLE payment_module_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(50)
);
```

Seed with 3 configuration records:

| config_key | config_value | description |
|---|---|---|
| `cashier_roles` | `["Clerk", "FinanceOfficer"]` | Roles eligible to be selected as cashier when opening a batch |
| `manage_all_batches_roles` | `["Admin"]` | Roles that can view/manage ALL batches (not just their own) |
| `duplicate_open_batch` | `{"mode": "warning"}` | `"warning"` = allow with warning, `"restriction"` = block creation |

No RLS (per architecture rules). No additional user tables needed — `profiles` already has `office_code` and `user_code`, `user_roles` has role assignments, `roles` has role names.

## Files to Create/Update

### 1. Payment Module Configuration Screen
**New file:** `src/pages/cashier/PaymentModuleConfig.tsx`

Admin-only configuration page with 3 sections:
- **Cashier Roles** — multi-select from active roles in `roles` table; saves to `cashier_roles` config
- **All-Batch Access Roles** — multi-select for roles that can manage all batches; saves to `manage_all_batches_roles` config
- **Duplicate Open Batch** — radio/select: "Warning" vs "Restriction"; saves to `duplicate_open_batch` config

Uses `supabase.from('payment_module_config')` for CRUD. Reads `roles` table for dropdown options.

### 2. Configuration Hook
**New file:** `src/hooks/usePaymentModuleConfig.ts`

- `usePaymentModuleConfig()` — fetches all config rows
- `usePaymentConfig(key)` — fetches single config by key
- `useUpdatePaymentConfig()` — mutation to update a config value
- `useCashierUsers()` — fetches `profiles` joined with `user_roles` where role is in `cashier_roles` config, returning `id, full_name, user_code, office_code` + office description from `tb_office`
- `useCanManageAllBatches()` — checks if current user's roles intersect with `manage_all_batches_roles`

### 3. Rewrite BatchManagement.tsx
**Replace:** `src/pages/cashier/BatchManagement.tsx`

**Layout:**
- Page header with title + "Open New Batch" button
- Batch list table from `cn_batch` ordered by `date_entered DESC`
- Columns: Batch Number, Status badge (O/V/P), Cashier (entered_by), Office, Batch Date, Date Entered, Balance Forward, Offset Amount
- "View" action per row opens detail dialog with all batch fields read-only

**Data filtering:**
- If `canManageAllBatches` → fetch all batches
- Else → fetch only where `entered_by = currentUser.user_code`

**Open New Batch Dialog** (replaces old mock):
1. **Cashier Selection:**
   - If `canManageAllBatches` → searchable dropdown populated from `useCashierUsers()` (profiles filtered by cashier roles)
   - If NOT `canManageAllBatches`:
     - Check if current user's role is in configured cashier roles
     - If yes → auto-select current user, dropdown disabled
     - If no → show validation message, disable Create button
2. **Office Location:** read-only, auto-populated from selected cashier's `office_code` → `tb_office.description`
3. **Batch Date:** date picker, defaults to today
4. **Opening Balance:** numeric input → maps to `offset_amount`
5. **On Create:**
   - Duplicate check: query `cn_batch` for `entered_by = selectedCashier.user_code AND batch_date = selectedDate AND batch_status = 'O'`
   - If duplicate found:
     - If config `duplicate_open_batch.mode === 'warning'` → show warning dialog, allow proceed
     - If `'restriction'` → block with error message
   - Insert into `cn_batch`: `batch_number` = `{office_code}-{YYYYMMDD}-{HHmmss}`, `batch_status = 'O'`, `entered_by = cashier.user_code`, `offset_amount = openingBalance`, `office_code = cashier.office_code`, `date_entered = now()`, `balance_status = 'N'`, `balance_forward` from last batch
6. After successful creation → close dialog, invalidate query, new batch appears in list

### 4. Routing & Menu Updates

- Add route `/cashier/payment-module-config` → `PaymentModuleConfig.tsx` in `AppRoutes.tsx`
- Add "Payment Module Configuration" menu item under "Sage Integrations Settings" group (admin-only) in `cashierMenuItems.ts`

## Key Technical Decisions

- **`entered_by` stores `user_code`** (VARCHAR(5)) from `profiles`, matching `cn_batch.entered_by` column width
- **All permission checks are data-driven** from `payment_module_config`, not hardcoded
- **Admin always has manage-all access** by default (seeded in config), but this is configurable
- **Auth context** via `useSupabaseAuth()` provides `user`, `profile` (with `user_code`, `office_code`), `roles[]`, `isAdmin`

