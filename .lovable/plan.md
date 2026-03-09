

# Fix: Company Mapping — Load Existing Child Companies on Parent Selection

## Problem
When a parent employer is selected in the Mapping dialog, existing child companies are **not fetched or displayed**. The `parentId` state change triggers no lookup. The `get_companies_dropdown` API only returns `id, company_name, registration_number` — no `parent_company_id` field.

## Solution

### 1. Add `parent_company_id` to `get_companies_dropdown` response (edge function)
In `supabase/functions/wiz-admin-api/index.ts`, update the `get_companies_dropdown` select to include `parent_company_id`:
```sql
select("id, company_name, registration_number, parent_company_id")
```

Update `WizCompanyDropdown` interface in `wizAdminApiService.ts` to include `parent_company_id: number | null`.

### 2. Auto-populate child companies when parent is selected (UI)
In `WizEmployerList.tsx`, add a `useEffect` on `parentId` change:
- Filter `companies` where `parent_company_id === Number(parentId)`
- Set those IDs into `childIds` state
- This gives immediate display of existing mappings, matching the legacy behavior

### 3. Clear children when parent changes
When `parentId` changes, reset `childIds` to only the fetched existing children (not carry over from a previous selection).

## Files to Change

| File | Change |
|---|---|
| `supabase/functions/wiz-admin-api/index.ts` | Add `parent_company_id` to `get_companies_dropdown` select |
| `src/services/wizAdminApiService.ts` | Add `parent_company_id` to `WizCompanyDropdown` interface |
| `src/pages/c3Management/employers/WizEmployerList.tsx` | Add `useEffect` on `parentId` to auto-populate existing children |

No new API needed from C3-Wizard team — the data is already in the `c3_companies` table, just not included in the dropdown response.

