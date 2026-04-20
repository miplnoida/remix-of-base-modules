## Verification Result: Cannot Confirm Yet — Cleanup Required First

### What the C3-Wizard team is asking us to confirm


| Claim                                                                                            | Reality on our side                                                                                                                                                                                                                                                                                                           | Status     |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1. Outbound base URL read from `C3_WIZARD_BASE_URL` (DB) — no hardcoded URLs                     | **3 frontend files still hardcode** `https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1/wiz-admin-api`                                                                                                                                                                                                                     | ❌ FAIL     |
| 2. Outbound keys read from `OUTBOUND_ADMIN_API_KEY` / `OUTBOUND_SYNC_API_KEY` — no env fallbacks | **3 frontend files still read** `VITE_WIZ_ADMIN_API_KEY` with hardcoded fallback `"uiop906754drd35fvg"`. **2 edge functions + 1 shared helper still read** `WIZ_ADMIN_API_KEY` / `C3_CONFIG_SYNC_API_KEY` / `C3_WIZARD_SYNC_URL` from `Deno.env`. **1 hook reads** `VITE_C3_WIZARD_SYNC_URL` & `VITE_C3_CONFIG_SYNC_API_KEY`. | ❌ FAIL     |
| 3. E2E tests pass Dev + Prod                                                                     | Cannot certify until #1 and #2 are clean                                                                                                                                                                                                                                                                                      | ⏸️ BLOCKED |


### DB state — verified good ✅

- `C3_WIZARD_BASE_URL`, `OUTBOUND_ADMIN_API_KEY`, `OUTBOUND_SYNC_API_KEY` all seeded for Dev + Prod + Production
- `ACTIVE_ENVIRONMENT = Dev` set
- `wizApiConfig.ts` (frontend) and `_shared/wizConfig.ts` (edge) helpers exist and work
- 6 services + 2 edge functions already migrated to use them

### Files requiring cleanup (8 occurrences)

**Frontend — replace hardcoded URL + `VITE_WIZ_ADMIN_API_KEY` with `getWizAdminConfig()`:**

1. `src/services/wizPaymentService.ts` (lines 6–7, 14–22)
2. `src/services/wizReportsService.ts` (lines 3–4, plus call site)
3. `src/services/wizAdminApiService.ts` (lines 1–2, 11–20)

**Frontend hook — replace direct env reads with edge-function proxy (already exists):**
4. `src/hooks/useC3ConfigPublish.ts` (lines 370–397) — drop the `VITE_C3_WIZARD_SYNC_URL` direct path, always go through `c3-config-sync-publish` edge function

**Edge functions — drop env-var fallbacks (DB is source of truth):**
5. `supabase/functions/_shared/wizConfig.ts` (lines 33–46) — remove `Deno.env.get("WIZ_API_URL")`, `C3_WIZARD_SYNC_URL`, `WIZ_ADMIN_API_KEY`, `C3_CONFIG_SYNC_API_KEY` fallbacks; keep only DB lookup + hard error if missing
6. `supabase/functions/c3-config-sync-publish/index.ts` (lines 17–21, 30) — drop `envSyncUrl` / `envSyncKey`
7. `supabase/functions/se-wages-sync-publish/index.ts` (lines 17–18, 23–26, 35) — same

**Also fallback strings in `src/lib/wizApiConfig.ts` (lines 16–18):** keep these as last-resort safety since they match current Dev URL — OR remove for full strictness. Recommend **keep** with a `console.warn` (already there) so a misconfigured DB doesn't brick the app instantly.

### Plan of action

1. **Edit 7 files** as above (1 PR-sized change set).
2. **Smoke-test** each touched surface in Dev:
  - Payment Details list, Reports, generic admin-API screen → wizPayment/Reports/AdminApi services
  - C3 Config Publish flow → `useC3ConfigPublish` + `c3-config-sync-publish` edge function
  - SE-Wages publish flow → `se-wages-sync-publish` edge function
  - Self-Employed list, Reconciliation, Manage Users, C3 Details (already migrated — regression check)
3. **Reply to C3-Wizard team** confirming all 3 points hold.
4. **Then** delete the 3 legacy secrets.

### Your secret-deletion question — answer

> Can I remove `C3_CONFIG_SYNC_API_KEY`, `C3_WIZARD_SYNC_URL`, `WIZ_ADMIN_API_KEY`?

**Not yet.** Today they are still actively read by:

- `_shared/wizConfig.ts` → `WIZ_ADMIN_API_KEY`, `C3_CONFIG_SYNC_API_KEY`, `C3_WIZARD_SYNC_URL`
- `c3-config-sync-publish/index.ts` → `C3_WIZARD_SYNC_URL`, `C3_CONFIG_SYNC_API_KEY`
- `se-wages-sync-publish/index.ts` → same

If you delete them right now, C3 publish + SE-wages publish keep working ONLY because the DB values exist — the env-var fallbacks would silently go missing. That's actually fine functionally, but **the cleaner sequence is**: ship the cleanup above → confirm with C3-Wizard team → delete secrets on both sides simultaneously.

**Safe-to-delete-now:** the frontend `VITE_*` envs are not Lovable secrets (they're build-time vars in `.env`); they don't appear in your secrets list and need no action.

### Backward compatibility & rollout

- Hard cutover, no flags. DB values are already live and verified.
- 5-minute in-memory cache on both sides → first request post-deploy may use stale config; subsequent requests pick up DB.
- Rollback = redeploy previous edge-function version (env vars still present until you delete them).

### Confirmation message to send (after cleanup ships)

> Confirmed on SSB-Admin side: outbound base URL + admin/sync keys now exclusively sourced from `c3_site_settings` (`C3_WIZARD_BASE_URL`, `OUTBOUND_ADMIN_API_KEY`, `OUTBOUND_SYNC_API_KEY`). All env-var and hardcoded-URL fallbacks removed across 3 services, 1 hook, and 3 edge functions. E2E verified for Dev. Proceed with deletion of `WIZ_ADMIN_API_KEY` and `C3_CONFIG_SYNC_API_KEY` on the C3-Wizard side; we will delete our copies in parallel.

Approve and I will ship the 7-file cleanup.  
  
  
Important note: Make sure, not other existing functionality should be impacted.