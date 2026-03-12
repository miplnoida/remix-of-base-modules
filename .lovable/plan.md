

## Department Master Integration with Central System

### Problem
The Department Master (`/audit/departments`) currently uses its own isolated `ia_departments` table with free-text fields for name, head, email, phone, and location. It should instead pull from the existing central system tables: `tb_office`, `tb_office_departments`, and `profiles`.

### Database Changes

**Add columns to `ia_departments`:**
- `office_code TEXT` — links to `tb_office.code`
- `source_department_id UUID` — links to `tb_office_departments.id` (null when "Other" is selected)
- `head_profile_id UUID` — links to `profiles.id` (null when "Other" is selected)

These are nullable so that "Other" (manually-entered) values still work via the existing `name`, `head`, `email`, `phone`, `location` text fields.

### UI Changes — `DepartmentMaster.tsx` Form

Replace the current free-text form with a cascading selection flow:

1. **Office Location** — `<Select>` populated from `useTbOffices()` (`tb_office`). Displays `description`. Stores `code` as `office_code`.

2. **Department Name** — `<Select>` populated from `useDepartments(selectedOfficeCode)` (`tb_office_departments` filtered by `office_code`), plus an **"Other"** option at the end. When "Other" is chosen, show a free-text `<Input>` for a custom department name. Otherwise, auto-set `name` from the selected department and store `source_department_id`.

3. **Department Head** — `<Select>` populated from `profiles` (query all active profiles), plus an **"Other"** option. When a profile is selected, auto-populate **Email** and **Phone** from `profiles.email` and `profiles.phone`. When "Other" is chosen, show a free-text `<Input>` for head name and keep email/phone editable.

4. **Email / Phone** — Auto-filled from selected profile, but remain editable. Fully manual when "Other" head is chosen.

5. **Location** — Auto-filled from `tb_office.description` (or `address1`) when office is selected, remain editable.

6. **Risk Rating** — Unchanged.

### Deactivation Rule

When rendering department dropdowns, check `tb_office_departments.is_active`:
- Active departments render normally
- Inactive departments render with `(Inactive)` suffix and are disabled for new records
- If editing an existing `ia_departments` record whose `source_department_id` points to a now-inactive department, show it but mark it as inactive

In `FunctionMaster.tsx`, when creating new functions, filter out `ia_departments` whose linked source department is inactive.

### Hook Changes

**New hook: `useProfiles()`** in `useAuditData.ts` — fetches `profiles` with `id, full_name, email, phone` where `is_active = true`, ordered by `full_name`.

**Update `useIADepartmentMutations`** — `create` mutation accepts the new optional fields (`office_code`, `source_department_id`, `head_profile_id`).

### Files to Modify
1. **Database migration** — Add 3 columns to `ia_departments`
2. **`src/hooks/useAuditData.ts`** — Add `useProfiles()` hook
3. **`src/pages/audit/DepartmentMaster.tsx`** — Replace form with cascading selects + "Other" logic + auto-populate
4. **`src/pages/audit/DepartmentView.tsx`** — Display office/department source info
5. **`src/config/moduleFieldSchemas.ts`** — Add `office_location` field to `DEPARTMENT_SCHEMA`

### What stays unchanged
- `ia_departments` table structure (additive only — existing `name`, `head`, `email`, `phone`, `location` columns preserved)
- All downstream references to `ia_departments` (functions, plans, activities, findings) continue working via `ia_departments.id`
- No styling changes
- Bulk upload continues to work (will accept office code and department name for matching)

