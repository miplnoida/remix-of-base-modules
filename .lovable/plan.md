

# Implementation Plan: C3 Wizard Settings Configuration Screen

## Summary

Build a new **Settings Configuration** screen that manages two local tables (`c3_site_settings` and `c3_email_config`) with a Publish-to-C3-Wizard sync mechanism. The admin edits settings locally and syncs them to the C3 Wizard via two existing API actions (`sync_site_settings`, `sync_email_config`).

## What Exists Today

- **CyberSourceSettings page** already reads/writes CyberSource config via the C3 Wizard API (`getCyberSourceSettings`, `updateCyberSourceSettings`). The new approach replaces this with local-first storage.
- **7 `wiz*Service.ts` files** already use the `wiz-admin-api` endpoint pattern with `WIZ_API_URL` and `WIZ_ADMIN_API_KEY`. The sync calls will follow the same pattern.
- **No `c3_site_settings` or `c3_email_config` tables** exist in the SSB-Admin database yet.

## What Needs to Be Built

### Phase 1: Database Tables + Seed Data

**Migration 1** — Create both tables:
- `c3_site_settings` (14 columns: id, setting_key, setting_value, setting_type, description, environment, is_deleted, is_synced, sync_error, last_synced_at, created_at, updated_at, created_by, updated_by)
- `c3_email_config` (11 columns: id, config_key, config_value, description, config_group, is_active, is_synced, sync_error, last_synced_at, created_at, updated_at)
- Indexes on setting_type, setting_key, config_group, and partial indexes on is_synced=false

**Migration 2** — Seed data:
- 2 PAYMENT_GATEWAY rows (Production + Sandbox)
- 6 PAYMENT_CONFIG rows (currency, country, city, postal, email, phone)
- 12 EXTERNAL_API rows (6 Dev + 6 Prod for SSB APIs)
- 1 SYSTEM row (ACTIVE_ENVIRONMENT)
- 8 c3_email_config rows (test mode, recipients, senders)

### Phase 2: Service Layer

**New file: `src/services/wizSettingsService.ts`**
- `fetchSiteSettings(settingType?: string)` — local Supabase query
- `updateSiteSetting(id, updates)` — local update, sets `is_synced=false`
- `fetchEmailConfig(configGroup?: string)` — local Supabase query
- `updateEmailConfig(id, updates)` — local update, sets `is_synced=false`
- `publishSettings()` — fetches all `is_synced=false` rows, calls `sync_site_settings` and `sync_email_config` via `wiz-admin-api`, updates local sync status per row
- `retrySync(table, key, environment?)` — single-row retry for failed items

### Phase 3: UI — Settings Configuration Page

**New file: `src/pages/admin/SettingsConfiguration.tsx`**

Route: `/admin/settings-configuration` (add to AppRoutes.tsx)

**Layout**: 5 tabs + Publish All button in header

| Tab | Source | Content |
|-----|--------|---------|
| Payment Gateway | `c3_site_settings` WHERE setting_type='PAYMENT_GATEWAY' | Card-based view with parsed JSON fields (merchant_id, key_id, secret_key as password input, base_url). Toggle active/inactive. Only one gateway active at a time. |
| Payment Defaults | `c3_site_settings` WHERE setting_type='PAYMENT_CONFIG' | Simple editable table with value, environment badge, sync status |
| API Configuration | `c3_site_settings` WHERE setting_type='EXTERNAL_API' | Grouped by environment (Dev/Prod). JSON fields parsed into columns. API keys masked (last 8 chars). |
| Email Settings | `c3_email_config` | Grouped by config_group (test, recipients, senders). IS_TEST_MODE as toggle. |
| System | `c3_site_settings` WHERE setting_type='SYSTEM' | ACTIVE_ENVIRONMENT as dropdown (Dev/Prod) |

**Key UI behaviors**:
- Each row shows sync status badge: Synced (green), Pending (amber), Failed (red)
- Failed rows show Retry button
- Footer shows "Pending changes: N" count + Publish button
- Publish calls `publishSettings()`, updates row-level sync status based on API response
- API keys/secrets displayed with partial masking (show last 8 chars)
- `created_by`/`updated_by` populated with logged-in user's `user_code`

### Phase 4: Hook + Route Integration

**New file: `src/hooks/useSettingsConfiguration.ts`**
- React Query hooks for fetching settings by type/group
- Mutation hooks for update + publish + retry
- Pending count computed from `is_synced=false` rows

**Modify: `src/components/routing/AppRoutes.tsx`**
- Add route `/admin/settings-configuration` → SettingsConfiguration page

**Modify: `src/pages/admin/C3ConfigurationPage.tsx`**
- Optionally redirect CyberSource tab to new Settings Configuration page, or embed it

## Files to Create/Modify

| File | Action |
|------|--------|
| DB Migration (tables) | Create `c3_site_settings`, `c3_email_config` |
| DB Migration (seed) | Insert all seed rows from guide sections 2.1–2.6 |
| `src/services/wizSettingsService.ts` | New — CRUD + publish + retry |
| `src/hooks/useSettingsConfiguration.ts` | New — React Query wrappers |
| `src/pages/admin/SettingsConfiguration.tsx` | New — 5-tab settings page |
| `src/components/routing/AppRoutes.tsx` | Add route |

## Security Notes

- Secret keys sent as plain text in sync payload — C3 Wizard encrypts server-side (AES-256-GCM)
- API keys masked in UI (last 8 chars visible)
- No RLS (per project constraint) — role-based access only
- Audit fields (`created_by`, `updated_by`) use logged-in user's `user_code`

