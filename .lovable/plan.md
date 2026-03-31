

# Replace `office_locations` with `tb_office` in Office Management

## Summary

The `office_locations` table is a legacy table that is only used in one place: the **Office Management** admin page (`src/pages/admin/OfficeManagement.tsx`) and its hooks in `useAdminData.ts`. The rest of the system (profiles, departments, payments, audit, etc.) already uses `tb_office` with `code` as the identifier. This plan eliminates the last references to `office_locations`.

## Analysis Results

| Where `office_locations` is used | Action |
|---|---|
| `src/hooks/useAdminData.ts` — `OfficeLocation` type, `useOfficeLocations`, `useCreateOfficeLocation`, `useUpdateOfficeLocation` | Remove all four. Already has `useTbOffices` which queries `tb_office`. |
| `src/pages/admin/OfficeManagement.tsx` — entire page uses `OfficeLocation` type and the three hooks above | Rewrite to use `tb_office` via `useTbOffices` + new create/update mutations |
| `src/pages/admin/system-cleanup/DependencyScan.tsx` — lists `office_locations` in known tables array | Remove from list |
| `docs/rls-policies-backup.sql` — reference doc only | No code change needed |

**Not affected** (already use `tb_office`):
- `UserManagementAdmin.tsx`, `UserEdit.tsx` — use `useTbOffices` + `office_code`
- `profiles` table — uses `office_code` referencing `tb_office.code`
- `tb_office_departments` — uses `office_code` FK to `tb_office`
- Payment batch, SEP lookups, ER forms — all use `tb_office.code`
- Edge functions (`create-user`, `public-api`) — use `tb_office`

## Changes

### 1. `src/hooks/useAdminData.ts`

- **Remove**: `OfficeLocation` interface, `useOfficeLocations()`, `useCreateOfficeLocation()`, `useUpdateOfficeLocation()`
- **Add**: `useCreateTbOffice()` mutation — inserts into `tb_office` (code, description, address1, address2, office_email, office_phone)
- **Add**: `useUpdateTbOffice()` mutation — updates `tb_office` by `code`
- Keep existing `useTbOffices()` as-is

### 2. `src/pages/admin/OfficeManagement.tsx`

- Replace all `OfficeLocation` references with `TbOffice` type
- Use `useTbOffices()` instead of `useOfficeLocations()`
- Use new `useCreateTbOffice()` / `useUpdateTbOffice()` mutations
- Update form fields to match `tb_office` columns:
  - `branch_name` → `description` (office name)
  - `address` → `address1`
  - `city`/`state`/`country` → `address2` (combined)
  - `is_active` — `tb_office` doesn't have this; remove toggle or add column via migration
  - Add `code` field (read-only on edit, required on create)
  - Add `office_email` and `office_phone` fields
- Update table columns to show Code, Description, Address, Email, Phone
- Remove accordion department display (departments are managed on their own page)
- Remove `useOfficeDepartments` import (no longer needed here)

### 3. `src/pages/admin/system-cleanup/DependencyScan.tsx`

- Remove `'office_locations'` from the known tables array

### 4. Database Migration (optional but recommended)

Add `is_active BOOLEAN DEFAULT TRUE` to `tb_office` so office activation/deactivation is supported. Without this, the Active/Inactive toggle must be removed from the UI.

```sql
ALTER TABLE public.tb_office
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
```

## Technical Details

```text
tb_office schema (current):
  code        VARCHAR  (PK)
  description VARCHAR
  address1    VARCHAR
  address2    VARCHAR
  office_email VARCHAR
  office_phone VARCHAR
  office_start_time TIME
  office_end_time   TIME

office_locations schema (to be retired):
  id          UUID (PK)
  branch_name TEXT
  address     TEXT
  city        TEXT
  state       TEXT
  country     TEXT
  is_active   BOOLEAN
  created_at  TIMESTAMPTZ
  ...

Key difference: tb_office uses short string `code` as PK
               office_locations uses UUID `id` as PK
```

## Files Changed

| File | Change |
|---|---|
| `ia_department_functions` (migration) | Add `is_active` to `tb_office` |
| `src/hooks/useAdminData.ts` | Remove `OfficeLocation` hooks, add `tb_office` create/update mutations |
| `src/pages/admin/OfficeManagement.tsx` | Full rewrite to use `tb_office` |
| `src/pages/admin/system-cleanup/DependencyScan.tsx` | Remove `office_locations` from list |

