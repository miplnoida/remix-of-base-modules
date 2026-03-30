

# Create Pay Periods Master Data Table & Bind to Levy Slab Detail

## Finding

The Pay Period select box in `LevySlabDetailForm.tsx` (line 35-40) is **hardcoded**:
```
W = Weekly, B = Bi-Weekly, S = Semi-Monthly, M = Monthly
```
A second hardcoded list exists in `WizEmployeeList.tsx` (line 24-29) with different values:
```
M = Monthly, 2M = 2x Monthly, W = Weekly, 2W = Bi-Weekly
```
No database table exists. Both need to be driven from a single `tb_pay_periods` table.

## Steps

### Step 1: Create `tb_pay_periods` Table + Seed Data

Migration SQL:
```sql
CREATE TABLE public.tb_pay_periods (
  code VARCHAR(5) PRIMARY KEY,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  entered_by VARCHAR(50),
  entered_on TIMESTAMPTZ DEFAULT now(),
  modified_by VARCHAR(50),
  modified_on TIMESTAMPTZ
);

INSERT INTO public.tb_pay_periods (code, description, sort_order) VALUES
  ('W', 'Weekly', 1),
  ('2W', 'Bi-Weekly', 2),
  ('S', 'Semi-Monthly', 3),
  ('M', 'Monthly', 4),
  ('2M', '2x Monthly', 5);
```

Add audit trigger (`fn_audit_row_change`) to this table. Add to `DB_TRIGGER_TABLES` set.

### Step 2: Create Master Data Screen

New file: `src/pages/admin/master-data/PayPeriodManagement.tsx`

Follow the exact pattern from `BatchStatusManagement.tsx` — CRUD with code/description/is_active, `PermissionWrapper` gating on `md_pay_periods`, audit fields via `useUserCode()`.

### Step 3: Register Route, Menu Item, Module

| File | Change |
|------|--------|
| `src/components/routing/AppRoutes.tsx` | Import `PayPeriodManagement`, add route `/admin/master-data/pay-periods` |
| `src/components/sidebar/menuItems/masterDataMenuItems.ts` | Add "Pay Periods" entry under C3 & Contributions group |

Insert `app_modules` row for `md_pay_periods` via Supabase insert tool.

### Step 4: Bind Levy Slab Detail Form

In `src/components/admin/levy-slabs/LevySlabDetailForm.tsx`:
- Remove hardcoded `PAY_PERIODS` array
- Add `useQuery` to fetch from `tb_pay_periods` (active only, ordered by `sort_order`)
- Populate the Select dropdown from the query result

### Step 5: Bind WizEmployeeList

In `src/pages/c3Management/employers/WizEmployeeList.tsx`:
- Remove hardcoded `PAY_PERIODS` record
- Add `useQuery` to fetch from `tb_pay_periods`
- Build the lookup map and Select options from query result

### Step 6: Update `DB_TRIGGER_TABLES`

Add `tb_pay_periods` to the set in `globalAuditInterceptor.ts` to prevent duplicate audit entries.

## Files to Create/Modify

| File | Action |
|------|--------|
| **Migration SQL** | Create `tb_pay_periods` + seed + audit trigger |
| `src/pages/admin/master-data/PayPeriodManagement.tsx` | **New** — CRUD screen |
| `src/components/routing/AppRoutes.tsx` | Add import + route |
| `src/components/sidebar/menuItems/masterDataMenuItems.ts` | Add menu entry |
| `src/components/admin/levy-slabs/LevySlabDetailForm.tsx` | Replace hardcoded array with DB query |
| `src/pages/c3Management/employers/WizEmployeeList.tsx` | Replace hardcoded record with DB query |
| `src/services/globalAuditInterceptor.ts` | Add `tb_pay_periods` to `DB_TRIGGER_TABLES` |
| **Supabase insert** | `app_modules` row for `md_pay_periods` |

