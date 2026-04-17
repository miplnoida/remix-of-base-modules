
## Plan: Migrate C3-Wizard API keys/URL to `c3_site_settings` (DB-driven, environment-aware)

### Current state (audit)

**Hardcoded URL + API key in 4 client services** (`x-admin-api-key`, browser-side — security smell flagged in `mem://integrations/c3-wizard-api-centralization`):
- `src/services/wizSelfEmployedService.ts`
- `src/services/wizManageUsersService.ts`
- `src/services/wizC3DetailsService.ts`
- `src/services/wizReconciliationService.ts`

**Edge functions reading env-only secrets:**
- `wiz-settings-sync` → `WIZ_API_URL`, `WIZ_ADMIN_API_KEY`
- `c3-config-sync-publish` → `C3_WIZARD_SYNC_URL`, `C3_CONFIG_SYNC_API_KEY`
- `se-wages-sync-publish` → `C3_WIZARD_SYNC_URL`, `C3_CONFIG_SYNC_API_KEY`

**Existing `c3_site_settings` types in DB:** `EXTERNAL_API`, `PAYMENT_CONFIG`, `PAYMENT_GATEWAY`, `SYSTEM` — `ACTIVE_ENVIRONMENT='Dev'` row exists.

**Settings & Configuration UI** uses `useSiteSettings('PAYMENT_GATEWAY' | 'PAYMENT_CONFIG' | 'EXTERNAL_API' | 'SYSTEM')` — adding new types **does not affect existing tabs** (filtered by type).

---

### Proposed implementation

**1. Seed migration — add 6 rows to `c3_site_settings`** (Dev + Prod for each):
| setting_key | environment | setting_type | description |
|---|---|---|---|
| `C3_WIZARD_BASE_URL` | Dev / Prod | `URL` | Base URL for all C3-Wizard edge functions |
| `OUTBOUND_ADMIN_API_KEY` | Dev / Prod | `OUTBOUND_AUTH` | Sent as `x-admin-api-key` to `wiz-admin-api` |
| `OUTBOUND_SYNC_API_KEY` | Dev / Prod | `OUTBOUND_AUTH` | Sent as `x-sync-api-key` to `c3-config-sync` & `sync-se-wages` |

Initial values: copy current secrets so cutover is zero-impact. `is_synced=false` so they appear in Publish queue.

**Also add 4 mirror INBOUND rows** (`INBOUND_ADMIN_API_KEY`, `INBOUND_SYNC_API_KEY` × Dev/Prod, `setting_type='INBOUND_AUTH'`) — these get pushed to Wizard via existing `sync_site_settings` action on Publish. (Per Wizard guide §5 step 1–2.)

**2. Settings & Configuration UI** — add a new tab **"C3-Wizard Integration"** that shows rows where `setting_type IN ('URL','INBOUND_AUTH','OUTBOUND_AUTH')`, grouped by environment. Reuses existing `useSiteSettings` + save/publish/sync-badge flow. Mask secret values (show/hide toggle, masked by default). **No change to other tabs.**

**3. New helper `src/lib/wizApiConfig.ts`** — single source for resolving Wizard URL + admin key from `c3_site_settings`:
```ts
export async function getWizAdminConfig(): Promise<{ baseUrl: string; apiKey: string }>
```
Reads `ACTIVE_ENVIRONMENT`, then matching `C3_WIZARD_BASE_URL` + `OUTBOUND_ADMIN_API_KEY` rows. In-memory 5-min cache. Falls back to existing hardcoded values if rows missing (zero-downtime).

**4. Refactor 4 client services** to use the helper:
```ts
const { baseUrl, apiKey } = await getWizAdminConfig();
const res = await fetch(`${baseUrl}/wiz-admin-api`, { headers: { 'x-admin-api-key': apiKey, ... } });
```
**Behavior identical** — just credential source changes.

**5. Update 3 edge functions** — `wiz-settings-sync`, `c3-config-sync-publish`, `se-wages-sync-publish`:
- Read URL + key from `c3_site_settings` (env-aware) using service-role Supabase client.
- **Fall back to existing `Deno.env.get(...)` if DB row missing** (preserves current behavior during cutover).
- 5-min in-process cache.

**6. Memory update** — refresh `mem://integrations/c3-wizard-api-centralization` and `mem://integrations/environment-and-api-configuration-management` to reflect: `c3_site_settings` is now SoT for Wizard URL + keys, `INBOUND_*` rows are pushed via `sync_site_settings` Publish, env selected by `ACTIVE_ENVIRONMENT`.

---

### Cutover sequence (matches Wizard guide §5)
1. Apply migration → rows seeded with current secret values.
2. Deploy code (services + edge functions) — DB rows preferred, env vars fallback → no breakage.
3. Open new "C3-Wizard Integration" tab → click **Publish All** → `INBOUND_*` rows land in Wizard's `c3_site_settings`.
4. Notify Wizard team (per their §contact). After they confirm, secrets can be rotated by editing rows + Publish (no redeploy).

---

### Out of scope (no change)
- `LEGACY_ENCRYPTION_KEY`, `RESEND_API_KEY`, `LOVABLE_API_KEY`, `SUPABASE_*`, `CYBERSOURCE_*` — left as-is per guide §8.
- Email Templates sync, sandbox test-send, all other existing features — untouched.

---

### Verification checklist
1. Existing screens (Manage Users, Self-Employed, C3 Details, Reconciliation) still load and call `wiz-admin-api` successfully.
2. "Publish All" on Site Settings still pushes settings, Email Config, and Templates without regression.
3. SE wages publish + C3 config publish still work (env fallback confirmed if DB row absent).
4. New "C3-Wizard Integration" tab lists all 7 rows (3 keys × 2 envs + URL × 2 = actually 6 outbound + 4 inbound; `ACTIVE_ENVIRONMENT` row stays in SYSTEM tab), edits + publish works, sync badge identical to other tabs.
5. After Publish, the 4 `INBOUND_*` rows show synced; Wizard team confirms they landed.
6. Rotation test: change a key value → Publish → next call uses new key within 5 min (cache TTL).

---

### Questions for the C3-Wizard team (before/during implementation)

> **To: C3-Wizard team — Re: Inbound API Keys Migration Guide**
>
> A few clarifications before we implement:
>
> 1. **Per-environment routing on your side.** Your guide says C3-Wizard reads `INBOUND_*` rows by `ACTIVE_ENVIRONMENT`. Our Admin's `ACTIVE_ENVIRONMENT` is independent of yours — please confirm: when we Publish `INBOUND_ADMIN_API_KEY` rows for both `Dev` and `Prod`, your `wiz-admin-api` validates the incoming `x-admin-api-key` against **the row whose `environment` matches *your* `ACTIVE_ENVIRONMENT`** (not ours)? i.e. we send the same physical secret regardless of which side is Dev/Prod, as long as both sides' active-env rows hold matching values.
>
> 2. **`sync_site_settings` row shape.** Our existing payload sends `setting_key`, `setting_value`, `setting_type`, `environment`, `is_active`, `is_deleted`. Your guide adds `INBOUND_AUTH` as a new `setting_type`. Confirm your handler upserts unknown `setting_type` values verbatim (no allowlist that would reject `INBOUND_AUTH`)?
>
> 3. **Initial cutover values.** To avoid a brief auth gap, can you share (via secure channel) the *current* values your env vars `WIZ_ADMIN_API_KEY` and `C3_CONFIG_SYNC_API_KEY` hold, so we seed them identically before the first Publish? Or should we rotate to fresh values during cutover?
>
> 4. **`URL` setting_type.** The guide lists `URL` as the type for `C3_WIZARD_BASE_URL`. We don't currently have that type in our schema — confirming this is purely a tag for our side (you don't read it; you only consume `INBOUND_AUTH` rows)?
>
> 5. **Verification handshake.** After step 2 (Publish), which endpoint should we hit to verify the cache picked up the new key? Any lightweight `ping` action on `wiz-admin-api`?
