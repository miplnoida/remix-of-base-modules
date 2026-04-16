# C3 Wizard Settings Configuration — Revised Implementation Plan

## Answers to Your Two Questions

### 1. Module Placement — C3 Management, Not Admin

The new Settings Configuration screen will be placed **inside the C3 Management module** at route `/c3-management/settings-configuration`. The existing CyberSourceSettings page (`src/pages/c3Management/CyberSourceSettings.tsx`) will **not be removed** — it will be replaced by the new consolidated screen. The CyberSource tab currently embedded in C3ConfigurationPage will point to the new screen instead.

### 2. No Frontend Business Logic — Backend-Only via Edge Function

All business logic (sync orchestration, retry, dependency checks, payload construction, sync status updates) will live in a **new edge function** (`wiz-settings-sync`). The frontend will:

- Read/write local tables via Supabase client (simple CRUD, no logic)
- Call the edge function for Publish/Retry (POST with pack of IDs)
- The edge function handles: reading unsynced rows, building API payloads, calling `sync_site_settings` / `sync_email_config` on C3 Wizard, updating `is_synced` / `sync_error` / `last_synced_at` per row

This ensures all logic is portable to .NET Core later.

---

## Phase 1: Database Migration

**Migration 1 — Create tables** (exact schema from guide):

- `c3_site_settings`: 14 columns (id as uuid PK, setting_key, setting_value, setting_type, description, environment, is_deleted, is_synced, sync_error, last_synced_at, created_at, updated_at, created_by, updated_by)
- `c3_email_config`: 11 columns (id as uuid PK, config_key, config_value, description, config_group, is_active, is_synced, sync_error, last_synced_at, created_at, updated_at)
- Indexes per guide spec + partial indexes on `is_synced = false`

**Migration 2 — Seed data** (from guide sections 2.1–2.6):

- 2 PAYMENT_GATEWAY rows (Production + Sandbox)
- 6 PAYMENT_CONFIG rows
- 12 EXTERNAL_API rows (6 Dev + 6 Prod)
- 1 SYSTEM row (ACTIVE_ENVIRONMENT)
- 8 c3_email_config rows

## Phase 2: Edge Function — `wiz-settings-sync`

A new edge function that handles all sync logic:

**Actions:**

- `publish_all` — reads all `is_synced=false` rows from both tables, calls C3 Wizard APIs (`sync_site_settings`, `sync_email_config`), updates sync status per row
- `retry_setting` — re-syncs a single `c3_site_settings` row by ID
- `retry_email` — re-syncs a single `c3_email_config` row by ID

**Logic in edge function (not frontend):**

1. Query unsynced rows using service-role client
2. Build payload per guide spec (sections 3.1, 3.2)
3. Call `wiz-admin-api` with `sync_site_settings` / `sync_email_config`
4. Parse response, update each row's `is_synced`, `sync_error`, `last_synced_at`
5. Return summary to frontend

## Phase 3: Service Layer (Thin — No Logic)

**New file: `src/services/wizSettingsService.ts**`

Pure CRUD wrappers — no business logic:

- `fetchSiteSettings(settingType?)` — SELECT from `c3_site_settings`
- `saveSiteSetting(id, updates)` — UPDATE row, set `is_synced=false`, `updated_by=userCode`
- `fetchEmailConfig(configGroup?)` — SELECT from `c3_email_config`
- `saveEmailConfig(id, updates)` — UPDATE row, set `is_synced=false`
- `publishAll()` — calls `wiz-settings-sync` edge function with action `publish_all`
- `retrySync(table, id)` — calls edge function with `retry_setting` or `retry_email`

## Phase 4: React Query Hook

**New file: `src/hooks/useSettingsConfiguration.ts**`

- Queries for each setting type / email config group
- Mutations for save, publish, retry
- Computed `pendingCount` from `is_synced=false` rows

## Phase 5: UI — Settings Configuration Page

**New file: `src/pages/c3Management/SettingsConfiguration.tsx**`

**Route:** `/c3-management/settings-configuration`

**Layout:** 5 tabs + "Publish All" button in header with pending count badge


| Tab               | Data Source                      | UI                                                                                                            |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Payment Gateway   | `setting_type='PAYMENT_GATEWAY'` | Cards with parsed JSON fields (merchant_id, key_id, secret_key as password, base_url). Toggle active gateway. |
| Payment Defaults  | `setting_type='PAYMENT_CONFIG'`  | Editable table rows with value, environment badge, sync status                                                |
| API Configuration | `setting_type='EXTERNAL_API'`    | Grouped by environment (Dev/Prod). API keys masked (last 8 chars).                                            |
| Email Settings    | `c3_email_config`                | Grouped by config_group. IS_TEST_MODE as toggle.                                                              |
| System            | `setting_type='SYSTEM'`          | ACTIVE_ENVIRONMENT dropdown (Dev/Prod)                                                                        |


**Per-row indicators:** Synced (green badge), Pending (amber), Failed (red + Retry button)

## Phase 6: Route + Navigation Integration

- Add route in `AppRoutes.tsx` under C3 Management section
- Update CyberSource tab in `C3ConfigurationPage.tsx` to link/redirect to new screen
- Ensure sidebar `app_modules` entry exists for this screen

## Files Summary


| File                                               | Action                                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| DB Migration 1                                     | Create `c3_site_settings`, `c3_email_config`                                             |
| DB Migration 2                                     | Seed all rows from guide                                                                 |
| `supabase/functions/wiz-settings-sync/index.ts`    | New edge function — all sync logic                                                       |
| `src/services/wizSettingsService.ts`               | New — thin CRUD + edge function calls                                                    |
| `src/hooks/useSettingsConfiguration.ts`            | New — React Query wrappers                                                               |
| `src/pages/c3Management/SettingsConfiguration.tsx` | New — 5-tab settings page                                                                |
| `src/components/routing/AppRoutes.tsx`             | Add route                                                                                |
| `src/pages/admin/C3ConfigurationPage.tsx`          | Update CyberSource tab reference(Don't hamper with the existing screen or functionality) |
