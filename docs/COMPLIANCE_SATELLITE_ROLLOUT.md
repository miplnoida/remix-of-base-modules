# Compliance & Enforcement → Satellite App Rollout Plan

Target satellite project: **Integrated Compliance Hub** (`8471f73c-7659-4260-8d4d-c70dfbebe261`)
Domain: `compliance.secureserve.biz`
Shared backend: `xynceskeiiisiefqlgxo.supabase.co` (no DB / auth changes)
Pattern: identical to Internal Audit satellite.

---

## Where the work happens

| Step | Where to run | What happens |
|---|---|---|
| 1 | **SocialServe (this project)** | Save plan to `docs/COMPLIANCE_SATELLITE_ROLLOUT.md` |
| 2 | **SocialServe** | Register satellite host + app id (3 tiny edits) |
| 3 | **SocialServe** | DB migration: set `app_modules.base_url` for Compliance parent |
| 4 | **Integrated Compliance Hub** ⬅️ switch project here | Paste the satellite prompt (Part E from `.lovable/plan.md`) |
| 5 | **Integrated Compliance Hub** | Connect custom domain `compliance.secureserve.biz` |
| 6 | Both | End-to-end verification |

The **only** moment you switch over and prompt the satellite is **Step 4**, after Steps 1–3 are merged in SocialServe. Doing it earlier means the SSO exchange will reject the satellite host.

---

## Step 1 — Save the plan (SocialServe)

Persist this plan as `docs/COMPLIANCE_SATELLITE_ROLLOUT.md` (separate from the working `.lovable/plan.md`, which can be cleared anytime). Includes Parts A–F so the rollout is reproducible.

## Step 2 — Register satellite in SocialServe

Three minimal edits — **no business logic touched**:

1. `src/lib/satelliteSso.ts` → add to `SATELLITE_HOSTS`:
   ```ts
   'compliance.secureserve.biz': 'compliance',
   // optional preview alias once known:
   // '<satellite-preview>.lovable.app': 'compliance',
   ```
2. `supabase/functions/auth-issue-exchange-code/index.ts` → add `'compliance'` to `ALLOWED_APPS`.
3. `supabase/functions/auth-redeem-exchange-code/index.ts` → confirm same `ALLOWED_APPS` list includes `'compliance'`.

No changes to: routes, sidebar items in SocialServe (Compliance link already exists), components, services, hooks, RLS, or business tables.

## Step 3 — Point sidebar tile at the satellite (SocialServe migration)

```sql
UPDATE app_modules
SET base_url = 'https://compliance.secureserve.biz'
WHERE name = 'compliance_enforcement'; -- verify exact module name first
```

After this, clicking the Compliance tile in SocialServe goes through `navigateToSatellite()` → `/auth/exchange` on the satellite.

## Step 4 — ⬅️ SWITCH TO SATELLITE PROJECT and prompt it

Open project `Integrated Compliance Hub` and paste **Part E** from `.lovable/plan.md` (already prepared) as the first prompt. Part E instructs the satellite to:

- Overwrite `.env` with shared backend URL + anon key + `VITE_SUPABASE_PROJECT_ID=xynceskeiiisiefqlgxo`.
- Copy from SocialServe (preserving `@/...` aliases):
  - `src/pages/compliance/**` (all)
  - `src/components/compliance/**` (all)
  - `src/services/compliance/**`, `src/lib/compliance/**`, `src/hooks/compliance/**`
  - All `src/types/*compliance*` and related types (`violation*`, `legal*`, `ce_*`)
  - `src/components/sidebar/menuItems/complianceMenuItems.ts`
  - Shared infra: `SupabaseAuthContext`, `PIIMaskingContext`, `GlobalBlockingContext`, `SystemSettingsContext`, `ThemeContext`, `ProtectedRoute`, `LoginScreen`, `useAuditTrail`, `useUserCode`, `useBlockingMutation`, `useDynamicNavigation`, `useEmployerComplianceSummary`, `satelliteSso.ts`, `lib/utils.ts`, `lib/format-config.ts`, `lib/statusColors.ts`, `lib/exportUtils.ts`, `lib/htmlToPdf.ts`, `tailwind.config.ts`, `index.css`, `components.json`, `postcss.config.js`.
  - **Do NOT copy** `src/integrations/supabase/client.ts` or `types.ts` — Lovable Cloud regenerates them.
- Build a minimal `App.tsx`: shared providers → `BrowserRouter` → routes `/auth/exchange`, `/login`, `/`, `/compliance/*` (under `ProtectedRoute`). Sidebar shows only `complianceMenuItems`. Default landing for authenticated users → `/compliance/workbench`.
- Constraints baked in: no DB changes, no new auth, no mock data, all audit writes use `user_code` from shared backend, `has_role` RPC reused as-is.

## Step 5 — Custom domain on satellite

In Integrated Compliance Hub project → Settings → Domains → connect `compliance.secureserve.biz` (A 185.158.133.1 + TXT). Required so SSO cookies on `.secureserve.biz` are visible to both apps. Until DNS is live, the SSO redirect from SocialServe will fall back to the satellite's login screen — same credentials still work.

## Step 6 — Verification

- Direct login on `compliance.secureserve.biz` → lands on `/compliance/workbench`.
- From SocialServe sidebar click Compliance tile → `/auth/exchange?code=…` → satellite opens already authenticated.
- Create a violation in satellite → row visible in SocialServe Compliance list.
- Audit trail shows same `user_code` regardless of which app wrote it.
- Disable user in SocialServe → satellite session blocked on next request.

---

## Recommendation on prompt timing

> **Give the satellite prompt only at Step 4**, after Steps 1–3 are deployed to SocialServe. If the satellite is built first, its `/auth/exchange` calls will be rejected (`compliance` not in `ALLOWED_APPS`) and you'll waste a debug cycle.

Once you approve, I will execute Steps 1–3 in SocialServe and then hand you the exact prompt to paste into the Integrated Compliance Hub project.
