# Plan: Fix Settings Configuration Menu, Data Seeding, and `is_active` Column

## Issues Identified

1. **Missing menu entry**: No `app_modules` row exists for `/c3-management/settings-configuration`. The route exists in `AppRoutes.tsx` but is invisible in the sidebar.
2. **Wrong data**: Local tables have 21 generic seed rows in `c3_site_settings` and 8 generic rows in `c3_email_config`. The real C3-Wizard data (from CSVs) has 22 site settings and 8 email configs with different keys, values, and structure.
3. **Missing `is_active` column on `c3_site_settings**`: The C3-Wizard team added `is_active` to their side. Our local table lacks this column.
4. `**is_synced` = false for all rows**: Since data is already synced from the C3-Wizard export, all rows should have `is_synced = true`.
5. `**legacy_id` column missing**: The CSV has a `legacy_id` column (integer IDs from the C3-Wizard DB) that our local table doesn't have. This is needed for sync correlation.  (Skip this - no need for this)

---

## Implementation Steps

### Step 1: Database Migration — Add missing columns to `c3_site_settings`

```sql
ALTER TABLE c3_site_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
```

### Step 2: Seed correct data — Replace all rows in both tables

**Delete existing seed data** and insert the 22 real rows from the CSV for `c3_site_settings` and 8 real rows for `c3_email_config`, all with `is_synced = true` since they come from the live C3-Wizard export.

The CSV uses semicolon delimiters. Key mappings from CSV:

- `c3_site_settings`: 22 rows across types PAYMENT_GATEWAY, EXTERNAL_API, PAYMENT_CONFIG, SYSTEM
- `c3_email_config`: 8 rows across groups test, recipients, senders

### Step 3: Add `app_modules` entry

Insert a menu entry under C3 Management (parent `aa1a72a6-308c-4689-9ca1-9d732c0d6198`) with route `/c3-management/settings-configuration`, sort order 25 (between Configure E-C3 at 20 and C3 Details at 30).

### Step 4: Update service layer — Add `is_active` support

`**src/services/wizSettingsService.ts**`:

- `fetchSiteSettings`: No filter change needed (already filters `is_deleted = false`).
- `saveSiteSetting`: Accept `is_active` in updates parameter.

`**src/hooks/useSettingsConfiguration.ts**`:

- `useSaveSiteSetting`: Add `is_active` to the updates type.

### Step 5: Update UI — SettingsConfiguration.tsx

- **SyncBadge**: Already correct (shows Synced/Pending/Failed).
- **Payment Gateway tab**: Add `is_active` toggle per gateway row. When toggling active, update locally. Show Active/Inactive badge. (both payment can't be active at one time , when admin tries to chnage the status of one payment other should be updated vice versa of it)
- **All tabs**: Since data is pre-synced, rows will show "Synced" badge correctly. (Dont show the synced , show the icon only)
- **API Config tab**: Map the real API keys from CSV (SSB_C3_REPORTED_API, SSB_C3_WAGES_API, etc.) instead of generic placeholders.

### Step 6: Update `useSettingsConfiguration.ts` pending count

Currently counts ALL `is_synced = false` rows. Since seeded data will be `is_synced = true`, the pending count will correctly show 0 on initial load.

---

## Query to C3-Wizard Team

No query needed — the uploaded CSV and markdown file provide all required information.

---

## Files Changed


| File                                               | Change                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Migration SQL                                      | Add `is_active` columns to `c3_site_settings`                                           |
| Data insert (via insert tool)                      | Delete old seed data, insert 22 + 8 real rows with `is_synced = true`                   |
| Data insert (via insert tool)                      | Add `app_modules` entry for settings-configuration                                      |
| `src/services/wizSettingsService.ts`               | Add `is_active` to saveSiteSetting updates type                                         |
| `src/hooks/useSettingsConfiguration.ts`            | Add `is_active` to mutation type                                                        |
| `src/pages/c3Management/SettingsConfiguration.tsx` | Add `is_active` toggle to Payment Gateway tab, display `is_active` status on other tabs |
