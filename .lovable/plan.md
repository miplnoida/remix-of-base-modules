

# Payment Module Enhancements — Implementation Plan

## Overview
This plan introduces Head Cashier management, batch behavior configuration, default opening balances, office location overrides, and C3 payment component locking across the Payment module.

---

## 1. Database Schema Changes (Migrations)

### New Tables

**`cn_head_cashier_assignment`** — Daily Head Cashier assignment
- `id` UUID PK default gen_random_uuid()
- `assignment_date` DATE NOT NULL (unique constraint)
- `user_id` UUID NOT NULL (references profiles)
- `user_code` VARCHAR(50) NOT NULL
- `assigned_by` VARCHAR(50) NOT NULL
- `assigned_at` TIMESTAMPTZ DEFAULT now()
- `is_active` BOOLEAN DEFAULT true
- UNIQUE(assignment_date) — only one Head Cashier per date

**`cn_cashier_office_override`** — Daily office location override by Head Cashier
- `id` UUID PK default gen_random_uuid()
- `override_date` DATE NOT NULL
- `cashier_user_id` UUID NOT NULL
- `cashier_user_code` VARCHAR(50) NOT NULL
- `office_code` VARCHAR(3) NOT NULL
- `assigned_by` VARCHAR(50) NOT NULL
- `assigned_at` TIMESTAMPTZ DEFAULT now()
- UNIQUE(override_date, cashier_user_id)

### New Config Keys in `payment_module_config`

Insert these rows:
- `allow_new_batch_with_previous_open` — JSONB `{ "enabled": false }` — Whether a cashier can create a new-date batch while a previous-date batch is still open
- `allow_current_date_payment_in_old_batch` — JSONB `{ "enabled": false }` — Whether current-date payments can be recorded in a previous-date batch
- `default_opening_balance` — JSONB `{ "head_cashier": 0, "cashier": 0 }` — Default opening balances by role type

### Role Addition
Insert `Head-Cashier` into the `roles` table as a system role. This role will be dynamically assigned/revoked via `user_roles` based on `cn_head_cashier_assignment`.

---

## 2. Backend RPC Functions

### `assign_head_cashier(p_user_id UUID, p_date TEXT, p_assigned_by TEXT)`
- Validates date is today or future
- Deactivates any existing assignment for that date
- Inserts new assignment into `cn_head_cashier_assignment`
- Removes `Head-Cashier` role from previous assignee's `user_roles`
- Adds `Head-Cashier` role to new assignee's `user_roles`
- Logs to `system_audit_trail`

### `get_active_head_cashier(p_date TEXT)`
- Returns the active Head Cashier for the given date
- Returns NULL if no assignment exists or the date has passed without assignment

### `revoke_expired_head_cashier()`
- Called on each batch-creation or login: checks if today's date has no active assignment and revokes any stale `Head-Cashier` role from `user_roles` where the assignment_date < today
- Runtime validation approach (no cron needed)

### `validate_batch_creation(p_cashier_user_code TEXT, p_batch_date TEXT)`
- Checks `allow_new_batch_with_previous_open` config
- If disabled: queries `cn_batch` for any open batch with `batch_date < p_batch_date` for this cashier → returns error if found
- Returns validation result with message

### `get_cashier_office_for_date(p_cashier_user_id UUID, p_date TEXT)`
- Checks `cn_cashier_office_override` for the date
- Falls back to `profiles.office_code`
- Returns resolved office_code and office_description

### `assign_cashier_office_override(p_cashier_user_id UUID, p_date TEXT, p_office_code TEXT, p_assigned_by TEXT)`
- Validates caller is today's Head Cashier
- Validates date is today or future
- Upserts `cn_cashier_office_override`
- Audit logged

---

## 3. UI Changes — Payment Module Config

### Roles & Permissions Tab Enhancements (`PaymentModuleConfig.tsx`)

**New Section: Head Cashier Assignment**
- Date picker (default today, past dates disabled)
- List of eligible cashier users (from `useCashierUsers`)
- Current assignment shown with badge
- "Assign" button to call `assign_head_cashier` RPC
- Past-date rows shown as read-only with lock icon
- Audit-logged on every assignment

**New Section: Batch Behavior Configuration**
- Toggle: "Allow new batch when previous-date batch is still open" — saves to `allow_new_batch_with_previous_open`
- Toggle: "Allow current-date payments in previous-date batches" — saves to `allow_current_date_payment_in_old_batch`
- Each toggle with description and Save button

### New Tab: Default Opening Balances
- Two numeric inputs: Head Cashier balance, Regular Cashier balance
- Read from/save to `default_opening_balance` config key
- Description explaining how these are applied during batch creation

---

## 4. New Screen — Cashier Office Assignment

### Route: `/cashier/head-cashier-office-assignment`

- Only accessible if current user is today's Head Cashier
- Shows date (today, read-only)
- Lists all cashier users with:
  - Name, User Code
  - Default Office (from profile)
  - Today's Override (from `cn_cashier_office_override`)
  - Action: Assign/Change office via dropdown of `tb_office`
- Editable only for current/future dates
- Audit-logged

---

## 5. Batch Management Changes (`BatchManagement.tsx`)

### Open New Batch Dialog Updates

1. **Office Location**: Call `get_cashier_office_for_date` RPC → auto-populate and make read-only. Shows "(Override by Head Cashier)" label if overridden.

2. **Opening Balance**: Read `default_opening_balance` config. Check if selected cashier is Head Cashier for today → use head_cashier or cashier amount. Field becomes read-only (non-editable).

3. **Previous-open-batch validation**: Before creation, call `validate_batch_creation` RPC. If config blocks it, show destructive toast with message like "Cannot create batch: you have an open batch from [date]. Please close it first." and prevent creation.

4. **Head Cashier role cleanup**: On dialog open, trigger `revoke_expired_head_cashier` to ensure stale roles are cleaned up.

---

## 6. Batch Selection Changes (`useBatchSelection.ts`)

### Date-restricted batch filtering
- Read `allow_current_date_payment_in_old_batch` config
- If disabled: filter `openBatches` to only include batches where `batch_date` matches today
- **Exception**: When called from routes `/cashier/cash-details` or `/cashier/batch-closing`, skip this filter (use a route parameter or a flag)

### Implementation
- Add an optional `skipDateFilter` parameter to `useBatchSelection()`
- In `CashDetails.tsx` and `BatchClosing.tsx`, pass `{ skipDateFilter: true }`
- All other screens (PaymentDataEntry, C3Payments, SearchPayInvoices, VCPaymentUpdate) use default filtering

---

## 7. C3 Payments Changes (`C3Payments.tsx`)

### Component Locking for Preloaded Data
When navigated from C3 detail screens (navState has regNo, schedule, month, year, payerType):

1. **Track preloaded state**: Add `isPreloaded` flag set when components auto-load from `get_c3_payment_components`
2. **Store max amounts**: Keep a `maxAmounts` map: `Record<string, number>` populated from the RPC response
3. **Lock components**: When `isPreloaded`:
   - Hide "Remove" button on preloaded components
   - Disable "Add Component" for codes already loaded
   - Prevent adding duplicate payment codes
4. **Cap amounts**: In `updateComponentAmount`, clamp value to `maxAmounts[code]`. Show inline warning if user attempts to exceed.
5. **Reload on parameter change**: If user changes payerType, payerId, period, or sequence, reset `c3ComponentsLoaded` to false and clear `selectedComponents` → triggers re-fetch with new params. Add a `useEffect` watching these fields.

### Receipt Status
In `handleProcessPayment`, after the RPC returns, the receipt is already created by `create_c3_payment_with_receipt`. Update the RPC to set `cn_receipt.status = 'A'` (Verified) instead of `'O'` (Original). This is a single-line change in the existing RPC function.

---

## 8. Hooks — New & Updated

### `useHeadCashier(date?: string)` — New hook
- Queries `cn_head_cashier_assignment` for given date
- Returns `{ headCashier, isCurrentUserHeadCashier, isLoading }`

### `useDefaultOpeningBalance()` — New hook  
- Reads `default_opening_balance` from `payment_module_config`
- Returns `{ headCashierBalance: number, cashierBalance: number, isLoading }`

### `useBatchBehaviorConfig()` — New hook
- Reads `allow_new_batch_with_previous_open` and `allow_current_date_payment_in_old_batch`
- Returns `{ allowNewBatchWithPreviousOpen, allowCurrentDatePaymentInOldBatch, isLoading }`

---

## 9. Sidebar Navigation Update

Add new menu item under Cashier:
- "Head Cashier Office Assignment" → `/cashier/head-cashier-office-assignment`

---

## 10. Files to Create/Modify

### New Files
- `src/hooks/useHeadCashier.ts`
- `src/hooks/useBatchBehaviorConfig.ts`
- `src/pages/cashier/HeadCashierOfficeAssignment.tsx`
- `src/components/payments/HeadCashierAssignmentSection.tsx`
- `src/components/payments/BatchBehaviorConfigSection.tsx`
- `src/components/payments/DefaultOpeningBalanceTab.tsx`
- Migration SQL for tables, RPCs, and config inserts

### Modified Files
- `src/pages/cashier/PaymentModuleConfig.tsx` — Add new sections to Roles tab + new Opening Balances tab
- `src/pages/cashier/BatchManagement.tsx` — Enforce office override, opening balance, and previous-batch validation
- `src/pages/cashier/C3Payments.tsx` — Component locking, amount capping, reload on param change
- `src/hooks/useBatchSelection.ts` — Add date-based batch filtering with skip option
- `src/components/routing/AppRoutes.tsx` — Register new route
- `src/components/sidebar/menuItems/cashierMenuItems.ts` — Add new menu item
- Migration for `create_c3_payment_with_receipt` RPC to set receipt status = 'A'

---

## 11. Validation & Audit Summary

| Feature | Backend Validation | Audit Log |
|---|---|---|
| Head Cashier assignment | Date ≥ today, one per date | Yes |
| Office override | Caller = Head Cashier, date ≥ today | Yes |
| Batch creation block | RPC checks previous open batches | Yes |
| Batch date restriction | Config-driven filter in batch selection | N/A (filter) |
| Opening balance | Config-driven, read-only on UI | Logged with batch |
| C3 component locking | Amount ≤ max from C3 record | Part of payment log |
| Receipt status = 'A' | Set in RPC atomically | Part of receipt creation |

