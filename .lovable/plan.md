

# Fix: NW Director Dropdown — Show Only NWD Employers

## Problem
The "Select Non Working Director" dropdown currently calls `get_companies_dropdown`, which returns **all** employers. It should only show employers that have a Non-Working Director (NWD).

## Solution
The C3-Wizard team has already implemented a dedicated API action `get_nw_companies` that returns only NWD-relevant companies. We need to:

### 1. Add `getNwCompanies` function to `wizAdminApiService.ts`
Add a new service function that calls `{ action: "get_nw_companies" }` and returns `{ companies: [{ id, company_name, registration_number }], total_records }`.

### 2. Update `NwDirectorList.tsx`
Replace the `getCompaniesDropdown()` call on line 56 with the new `getNwCompanies()` function. The response shape is identical (`companies` array with `id`, `company_name`, `registration_number`), so no other changes are needed in the component.

## Files Changed
- `src/services/wizAdminApiService.ts` — add `getNwCompanies()` export
- `src/pages/c3Management/c3Details/NwDirectorList.tsx` — swap import and usage from `getCompaniesDropdown` to `getNwCompanies`

