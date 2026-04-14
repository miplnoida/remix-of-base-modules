# Centralize All C3 Wizard API Configurations

## Problem Summary

C3 Wizard API configurations are scattered across three storage mechanisms:


| API / Integration                                                                      | Current Source                                                | Location                               |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| **wiz-admin-api** (Employer, SE, Users, Payments, Reports, Reconciliation, C3 Details) | Hardcoded URL + VITE env fallback with plaintext key          | 7 frontend service files               |
| **C3 Config Sync Publish**                                                             | Deno secrets (`C3_WIZARD_SYNC_URL`, `C3_CONFIG_SYNC_API_KEY`) | Edge function + frontend VITE fallback |
| **SE Wages Sync Publish**                                                              | Same Deno secrets                                             | Edge function                          |
| **C3 Received Payment Sync**                                                           | DB (`api_settings` table)                                     | Edge function `sync-c3-payment`        |


Only the "C3 Received Payment Sync" is properly DB-driven. Everything else is hardcoded or secret-based.

**Security issue**: The wiz-admin-api key (`uiop906754drd35fvg`) is hardcoded in plaintext in 7 frontend files and exposed to the browser.

---

## Full C3 Wizard API Inventory

1. **wiz-admin-api** — Multi-action proxy endpoint (Employer CRUD, SE management, User management, Payment details, Reports, Reconciliation, C3 Details, Config change history, Company mapping)
2. **c3-config-sync** — Push C3 configuration changes to Wizard
3. **sync-se-wages** — Push SE wages to Wizard (derived from c3-config-sync URL)
4. **c3-received-payment-sync** — Notify Wizard of received payments (already DB-driven)

---

## Implementation Plan

### Step 1: Extend `api_settings` Table Schema

Add columns to support environment separation:

- `environment` — `TEXT DEFAULT 'PROD'` (values: `DEV`, `PROD`)
- `api_group` — `TEXT DEFAULT 'general'` (values: `c3-wizard`, `dms`, `online-applications`, etc.)

Add a unique constraint on `(setting_key, environment)`.

### Step 2: Seed C3 Wizard API Rows

Insert DB rows for the three missing C3 Wizard APIs:


| setting_key        | setting_name        | api_group | base_url                                                              | header_name       | environment |
| ------------------ | ------------------- | --------- | --------------------------------------------------------------------- | ----------------- | ----------- |
| `c3_wiz_admin_api` | C3 Wizard Admin API | c3-wizard | `https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api` | `x-admin-api-key` | production  |
| `c3_config_sync`   | C3 Config Sync      | c3-wizard | (current C3_WIZARD_SYNC_URL value)                                    | `x-sync-api-key`  | production  |
| `c3_se_wages_sync` | C3 SE Wages Sync    | c3-wizard | (derived from config sync URL)                                        | `x-sync-api-key`  | production  |


Update existing `c3_received_payment_sync` row to include `api_group = 'c3-wizard'`.

### Step 3: Create a Shared API Config Resolver

Create `src/lib/apiConfigResolver.ts`:

- `getWizApiConfig()` — Fetches `c3_wiz_admin_api` config from `api_settings` with short TTL cache
- Returns `{ baseUrl, apiKey, headerName, isActive }` 
- Falls back gracefully if DB is unreachable (log warning, use cached value)
- For edge functions: create equivalent `getApiConfigFromDb()` helper that reads from `api_settings` using service role client

### Step 4: Refactor Frontend wiz* Services (7 files)

Remove hardcoded `WIZ_API_URL` and `WIZ_ADMIN_API_KEY` from:

- `wizAdminApiService.ts`
- `wizPaymentService.ts`
- `wizReportsService.ts`
- `wizReconciliationService.ts`
- `wizManageUsersService.ts`
- `wizC3DetailsService.ts`
- `wizSelfEmployedService.ts`

Replace with a shared `callWizApi()` function that:

1. Calls `getWizApiConfig()` to get URL + key from DB
2. Uses the returned config for `fetch()` headers
3. Throws a clear error if the API is inactive or not configured

### Step 5: Refactor Edge Functions to Use DB Config

Update `c3-config-sync-publish` and `se-wages-sync-publish`:

- Replace `Deno.env.get('C3_WIZARD_SYNC_URL')` / `Deno.env.get('C3_CONFIG_SYNC_API_KEY')` with DB lookups from `api_settings`
- Fall back to env secrets if DB row not found (backward compatibility during migration)

Update `useC3ConfigPublish.ts`:

- Remove `VITE_C3_WIZARD_SYNC_URL` / `VITE_C3_CONFIG_SYNC_API_KEY` usage
- Route all sync calls through edge functions (which now read config from DB)

### Step 6: Enhance Admin UI (ApiConfiguration.tsx)

- Add `api_group` filter/grouping — show APIs grouped by: **C3 Wizard**, **DMS**, **Online Applications**, **Other**
- Add `environment` column and badge (Test / Production)
- Expand `LINKABLE_MODULES` to include C3 Wizard modules
- Add a "Test Connection" button that pings the configured URL
- Keep existing CRUD operations unchanged

### Step 7: Environment Toggle

- Add a global environment selector (stored in `api_settings` or a separate `system_settings` row)
- When resolving API config, filter by the active environment
- Default to `production` if no toggle is set
- Show active environment badge in the admin header

### Step 8: Security Hardening

- API keys in `api_settings` are already masked in the UI — keep this
- Remove the hardcoded plaintext fallback key `"uiop906754drd35fvg"` from all 7 service files
- Edge functions use service role to read `api_settings` — keys never reach the browser
- For the frontend wiz-admin-api calls (which currently go direct from browser): route through a new edge function `wiz-api-proxy` that reads the key server-side, eliminating browser key exposure

---

## Migration Strategy

1. Deploy DB migration (new columns + seed rows) — no breaking change
2. Deploy edge function updates with fallback to env secrets
3. Deploy frontend service refactor — reads from DB, no fallback to hardcoded
4. Deploy UI enhancements
5. Remove deprecated `VITE_WIZ_ADMIN_API_KEY`, `VITE_C3_WIZARD_SYNC_URL` env vars after validation

Each step is independently deployable and backward-compatible.

---

## Files Changed (Estimated)


| File                                                 | Change                                        |
| ---------------------------------------------------- | --------------------------------------------- |
| Migration SQL                                        | Add columns, seed C3 Wizard rows              |
| `src/lib/apiConfigResolver.ts`                       | New — shared config resolver                  |
| `src/services/wizAdminApiService.ts`                 | Remove hardcoded URL/key, use resolver        |
| `src/services/wizPaymentService.ts`                  | Same                                          |
| `src/services/wizReportsService.ts`                  | Same                                          |
| `src/services/wizReconciliationService.ts`           | Same                                          |
| `src/services/wizManageUsersService.ts`              | Same                                          |
| `src/services/wizC3DetailsService.ts`                | Same                                          |
| `src/services/wizSelfEmployedService.ts`             | Same                                          |
| `src/hooks/useC3ConfigPublish.ts`                    | Remove VITE env usage, use edge function only |
| `supabase/functions/c3-config-sync-publish/index.ts` | Add DB fallback                               |
| `supabase/functions/se-wages-sync-publish/index.ts`  | Add DB fallback                               |
| `src/pages/admin/settings/ApiConfiguration.tsx`      | Add grouping, environment column              |
| `src/hooks/useApiSettings.ts`                        | Add environment/group filter support          |


---

## Dependencies / Risks

- **Existing `c3_received_payment_sync**` row already works — no change needed
- **Deno secrets** remain as fallback during transition — no outage risk
- **Browser key exposure** is the biggest security win — moving wiz-admin-api calls server-side via proxy eliminates this  
  
Must read:- This plan needs to rewrite again as it is not what I want.  
basically when admin will call the c3-wizard api it will have only the single key and single baseurl based on the Live and the TEst so as you know we have the external apis screen in which theres all the apis that is exposed from this system and all the c3-wizard api consuming these apis using one base url and keys.  
so same i want for the admin consumed apis so basically all the c3-wizard apis use same ksys and url based on the live and test.  
Also, you have to prepare a guide for the c3-wizard how c3-wizard will handle this because c3-wizard also validating the apis keys from the secret or some hardoced so you have to share the same api key and url that you are using for the recieve apis.  
No need to have diffrent different apis keys and url per apis.  
all the c3-wizard apis called from the single configured keys and url and that should be update properly in the c3-wizard side as well because that is using that for validating it.