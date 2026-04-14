

# Enhance Employer Registration View: Separate HQ/Mailing Address Sections + Country Resolution

## Summary

The Entity Overview step currently displays HQ and Mailing address fields in a single combined grid. This plan separates them into two visually distinct sections with the new city/state/country fields, and resolves country codes to names from `tb_country`. The same country resolution is applied to the Locations tab table and Add Location dialog.

## Changes

### 1. `src/pages/employer-registration/tabs/EntityOverviewStep.tsx`
- Import `useCountries` from `@/hooks/useIPMasterLookups`
- Split the current "General Information" section into three sub-sections:
  - **General Information**: Name, Trade Name, Email
  - **Head Quarter Address**: HQ Addr1, HQ Addr2, HQ City, HQ State, HQ Country (as `LookupSelect` bound to `tb_country` in edit mode, resolved name in view mode)
  - **Mailing Address**: Mailing Addr1, Mailing Addr2, Mailing City, Mailing State, Mailing Country (same pattern)
- Add `InputWithCounter` fields for `hq_city`, `hq_state`, `mailing_city`, `mailing_state` (max 50 chars)
- In view mode: display country name resolved from `useCountries()` data
- In edit mode: render `LookupSelect` with country items mapped from `tb_country` (`code` → `description`)
- Gracefully handle null/empty values with fallback to empty string

### 2. `src/pages/employer-registration/EmployerRegistrationForm.tsx`
**Locations table** (~line 307):
- Add City, State, Country columns to the table header and rows
- Import `useCountries` hook
- Create a `resolveCountryName` helper to map code → description
- Display resolved country name in each location row
- Handle null values gracefully with `|| '—'`

**Add Location dialog** (~line 451):
- Add City (`Input`, max 50), State (`Input`, max 50), Country (`Select` from `tb_country`) fields
- Update `locationForm` state initialization (already has city/state/country)
- Pass city/state/country to `addLocation()` call

### 3. `src/hooks/useEmployerRegistration.ts`
- Verify `addLocation` function passes city/state/country fields — the `select('*')` already fetches them since columns were added in the prior migration
- No changes needed here as `select('*')` already includes the new columns and the insert spreads the full location object

## No Database Changes Required
The columns `hq_city`, `hq_state`, `hq_country`, `mailing_city`, `mailing_state`, `mailing_country` on `er_master` and `city`, `state`, `country` on `er_locations` were already added in the previous migration.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/employer-registration/tabs/EntityOverviewStep.tsx` | Separate HQ/Mailing into distinct sections; add city/state/country fields with country name resolution |
| `src/pages/employer-registration/EmployerRegistrationForm.tsx` | Add city/state/country columns to locations table; add fields to Add Location dialog |

