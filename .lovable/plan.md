

# Fix: Settings Configuration Sync Errors

## Root Cause

The `wiz-settings-sync` edge function sends individual flat objects to the C3-Wizard API (`callWizApi("sync_site_settings", { setting_key, setting_value, ... })`), but the **Wizard API expects arrays** — it requires a `settings` array for site settings and a `configs` array for email configs. The Wizard responds with: `"settings array is required and must not be empty"` / `"configs array is required and must not be empty"`.

### Affected rows currently in DB:
- `CYBERSOURCE_Production` — `is_synced=false`, `sync_error="settings array is required and must not be empty"` (toggled active, which set `is_synced=false`, then retry failed)
- `CYBERSOURCE_Test (Sandbox)` — same error
- `TEST_RECIPIENT` (email) — `sync_error="configs array is required and must not be empty"`

## Fix Plan

### 1. Fix Edge Function (`supabase/functions/wiz-settings-sync/index.ts`)

Change `callWizApi` payload format to wrap items in arrays:

**For site settings sync** — send `{ action: "sync_site_settings", params: { settings: [{ setting_key, ... }] } }` instead of `{ action: "sync_site_settings", params: { setting_key, ... } }`

**For email config sync** — send `{ action: "sync_email_config", params: { configs: [{ config_key, ... }] } }` instead of `{ action: "sync_email_config", params: { config_key, ... } }`

This applies to:
- `syncSiteSettings()` — batch all unsynced rows into one `settings` array call
- `syncEmailConfig()` — batch all unsynced rows into one `configs` array call  
- `retrySiteSetting()` — wrap single item in `settings: [payload]`
- `retryEmailConfig()` — wrap single item in `configs: [payload]`

### 2. Clear existing sync errors (DB fix)

Reset the 3 affected rows to `is_synced=true, sync_error=null` since these were originally synced from the CSV export and the errors are artifacts of the broken edge function format.

### 3. Include `is_active` in sync payload

The `syncSiteSettings` payload currently omits `is_active`. Add it so the Wizard receives the active/inactive status when syncing.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/wiz-settings-sync/index.ts` | Fix payload format to use `settings[]` / `configs[]` arrays; add `is_active` to payload |
| DB fix (migration) | Reset sync_error and is_synced on 3 affected rows |

## Query to C3-Wizard Team

**Not needed** — the error messages clearly indicate the expected format (`settings array`, `configs array`). The fix is entirely on our side.

