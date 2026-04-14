

# Add City, State, Country Fields to Employer Application Detail & Database

## Summary

New API properties (`hq_city`, `hq_state`, `hq_country`, `mailing_city`, `mailing_state`, `mailing_country`, and `city`/`state`/`country` inside `locations[]`) need to be supported in the interface, displayed on the detail/edit pages, stored in the database, and passed through the conversion RPC. Country codes must resolve to names from `tb_country` for display, and use a dropdown bound to `tb_country` in edit mode.

## Database Changes (3 migrations)

### Migration 1: Add columns to `er_master`
```sql
ALTER TABLE er_master
  ADD COLUMN IF NOT EXISTS hq_city VARCHAR(50),
  ADD COLUMN IF NOT EXISTS hq_state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS hq_country VARCHAR(10),
  ADD COLUMN IF NOT EXISTS mailing_city VARCHAR(50),
  ADD COLUMN IF NOT EXISTS mailing_state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS mailing_country VARCHAR(10);
```

### Migration 2: Add columns to `er_locations`
```sql
ALTER TABLE er_locations
  ADD COLUMN IF NOT EXISTS city VARCHAR(50),
  ADD COLUMN IF NOT EXISTS state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS country VARCHAR(10);
```

### Migration 3: Update `convert_application_to_employer` RPC
- Add 6 new parameters: `p_hq_city`, `p_hq_state`, `p_hq_country`, `p_mailing_city`, `p_mailing_state`, `p_mailing_country`
- Include them in the `INSERT INTO er_master` statement
- Update location insert to read `city`, `state`, `country` from `v_location` JSON

## Code Changes

### 1. `src/hooks/useEmployerApplicationDetail.ts`
- **`EmployerApplicationDetail` interface**: Uncomment/add `hq_city`, `hq_state`, `mailing_city`, `mailing_state`, `mailing_country` fields
- **`EmployerLocation` interface**: Add `city?`, `state?`, `country?` fields
- **`normalizeEmployerDetail()`**: Map `hq_city`, `hq_state`, `hq_country`, `mailing_city`, `mailing_state`, `mailing_country` from raw API
- **`normalizeLocations()`**: Map `city`, `state`, `country` from each location

### 2. `src/pages/online-applications/EmployerApplicationDetailPage.tsx`
- **HQ Address section** (~line 533): Add `DetailField` for City, State; resolve Country code to name using `tb_country` lookup
- **Mailing Address section** (~line 544): Uncomment and add City, State, Country fields; resolve country code to name
- **Locations table** (~line 728): Add City, State, Country columns; resolve country code to name
- Import and use `useCountries` from `useIPMasterLookups` to resolve country codes to descriptions

### 3. `src/components/meetings/EmployerApplicationEditForm.tsx`
- **HQ Address section** (~line 526): Add City, State edit fields; replace Country text input with `SearchableSelect` bound to `tb_country`
- **Mailing Address section** (~line 536): Add City, State, Country edit fields (Country as `SearchableSelect`)
- **Locations edit** (if editable): Add City, State, Country fields to location rows
- Import `useCountries` and `SearchableSelect`

### 4. `src/hooks/useConvertToEmployerRegistration.ts`
- **Locations JSON builder** (~line 193): Include `city`, `state`, `country` from location data
- **RPC call** (~line 214): Pass `p_hq_city`, `p_hq_state`, `p_hq_country`, `p_mailing_city`, `p_mailing_state`, `p_mailing_country`

### 5. `src/types/employerRegistration.ts`
- Add `hq_city`, `hq_state`, `hq_country`, `mailing_city`, `mailing_state`, `mailing_country` to `ERMasterFormData`
- Add `city`, `state`, `country` to `ERLocationData`
- Update initial data objects

## Country Resolution Pattern
- Use the existing `useCountries()` hook from `src/hooks/useIPMasterLookups.ts` which queries `tb_country`
- Create a helper: `resolveCountryName(code, countries)` that finds the `description` for a given `code`
- Display: Show country name (description)
- Edit: Use `SearchableSelect` populated from `tb_country` with `code` as value and `description` as label

## Files to modify
| File | Change |
|------|--------|
| `src/hooks/useEmployerApplicationDetail.ts` | Add fields to interfaces + normalize functions |
| `src/pages/online-applications/EmployerApplicationDetailPage.tsx` | Display city/state/country in HQ, Mailing, Locations sections |
| `src/components/meetings/EmployerApplicationEditForm.tsx` | Add edit fields with country dropdown |
| `src/hooks/useConvertToEmployerRegistration.ts` | Pass new fields to RPC |
| `src/types/employerRegistration.ts` | Add fields to type definitions |
| DB migration: `er_master` | Add 6 columns |
| DB migration: `er_locations` | Add 3 columns |
| DB migration: `convert_application_to_employer` | Add parameters and insert logic |

