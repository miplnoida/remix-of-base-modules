## Goal

Spin up a **separate satellite Lovable application** that hosts the entire **Compliance & Enforcement** module, while:

- Sharing the **same Lovable Cloud database** as SocialServe (no schema changes, no data copy).
- Sharing the **same logged-in user session** (single sign-on through the existing exchange-code flow already used for Internal Audit).
- Making **zero changes to the main SocialServe app** beyond one optional sidebar entry that opens the satellite via SSO.

The pattern mirrors what is already in production for `nexus-guardian-sync` (Internal Audit). No business logic is rewritten — code is copied verbatim.

---

## Part A — What we will do in SocialServe (main app)

The user explicitly said nothing should change. The only safe, optional touch (only if you want the sidebar tile to open the satellite) is:

1. Update the existing `app_modules` row whose `name = 'compliance'` (or the parent module key already used by `complianceMenuItems`) and set its `base_url` to the satellite's URL, e.g. `https://compliance.secureserve.biz`.
2. Add the satellite host to `SATELLITE_HOSTS` in `src/lib/satelliteSso.ts` so the sidebar issues an SSO exchange code instead of a plain redirect:
   ```ts
   'compliance.secureserve.biz': 'compliance',
   '<lovable-preview-host>.lovable.app': 'compliance',
   ```
3. In the `auth-issue-exchange-code` edge function add `'compliance'` to its `ALLOWED_APPS` list.

If you prefer truly zero changes today, skip steps 1–3 — the satellite is fully usable by typing its URL; it will just prompt for login the first time on its own domain.

No source files, components, routes, RPCs, RLS, tables, or business rules in SocialServe are modified.

---

## Part B — Create the satellite project

1. In Lovable, create a new project named e.g. **SocialServe — Compliance**.
2. Enable **Lovable Cloud** on the new project, then **disable its auto-provisioned Supabase** and point it at the **SocialServe Supabase** by setting:
   ```
   VITE_SUPABASE_URL=https://xynceskeiiisiefqlgxo.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<same anon key as main app>
   VITE_SUPABASE_PROJECT_ID=xynceskeiiisiefqlgxo
   ```
   This is exactly how the Internal Audit satellite is wired (see `docs/SHARED_AUTH_SETUP.md`).
3. Configure the satellite's published URL / custom domain (e.g. `compliance.secureserve.biz`) so it sits on the same parent domain as `admin.secureserve.biz`. Same parent domain = the SSO exchange-code cookies set by `auth-redeem-exchange-code` are visible to both apps.

---

## Part C — What gets copied from SocialServe into the satellite

Scope (verified against the current repo):

| Area | Path | Files |
|---|---|---|
| Pages | `src/pages/compliance/**` | 117 |
| Components | `src/components/compliance/**` | 139 |
| Services | `src/services/compliance/**` | 6 |
| Lib | `src/lib/compliance/**` | 5 |
| Types | `src/types/violation*.ts`, `src/types/complianceSettings.ts`, `src/types/legal*.ts`, `src/types/paymentArrangement.ts`, `src/types/centralPaymentArrangement.ts`, `src/types/feeWaiver.ts`, `src/types/feeConfiguration.ts`, `src/types/contributionComponents.ts`, `src/types/inspectionTypes.ts`, `src/types/fieldStageMapping.ts`, `src/types/commTriggerRule.ts`, `src/types/riskPolicy.ts` | as-is |
| Sidebar entry | `src/components/sidebar/menuItems/complianceMenuItems.ts` | 1 |
| Compliance route table | `src/pages/compliance/Routes.tsx` | 1 |
| Cross-cutting infra also required | `src/contexts/SupabaseAuthContext.tsx`, `src/components/auth/ProtectedRoute.tsx`, `src/components/auth/LoginScreen.tsx`, `src/contexts/PIIMaskingContext.tsx`, `src/contexts/GlobalBlockingContext.tsx`, `src/contexts/SystemSettingsContext.tsx`, `src/contexts/ThemeContext.tsx`, `src/components/sidebar/**` (+ `useDynamicNavigation`), shared UI in `src/components/common/**` and `src/components/ui/**`, `src/lib/utils.ts`, `src/lib/format-config.ts`, `src/lib/statusColors.ts`, `src/lib/exportUtils.ts`, `src/lib/htmlToPdf.ts`, `src/hooks/useAuditTrail.ts`, `src/hooks/useUserCode.ts`, `src/hooks/useDynamicNavigation.ts`, `src/integrations/supabase/types.ts`, `tailwind.config.ts`, `src/index.css`, `components.json`, `.env` template, `src/lib/satelliteSso.ts` (renamed/inverted to point back to main if needed). | as-is |
| Edge functions | Any `supabase/functions/*` that compliance pages invoke (e.g. `document-proxy`, compliance reporting fns). They live on the shared backend and are **already deployed** — do **not** redeploy from the satellite. | none copied |
| RLS / migrations | None. Per project rule, RLS is off; auth is role-based and lives in shared tables (`user_roles`, `role_permissions`, `app_modules`). | none |

The `auth-exchange` page (`/auth/exchange`) used by SSO must also be copied — same code as Internal Audit's satellite.

---

## Part D — Wiring inside the satellite

1. `src/App.tsx` becomes minimal: providers (`SupabaseAuthContext`, `ThemeContext`, `SystemSettingsContext`, `PIIMaskingContext`, `GlobalBlockingContext`, `QueryClientProvider`, `Toaster`) → `BrowserRouter` → routes.
2. Routes:
   - `/auth/exchange` → SSO redeem page.
   - `/login` → `LoginScreen` (fallback when no SSO code).
   - `/*` → `ProtectedRoute` + the **copied `ComplianceRoutes`** mounted at `/compliance/*`, with a default redirect from `/` to `/compliance/workbench` (or whatever the current default is).
3. Sidebar shows only `complianceMenuItems` (drop the other `menuItems/*` files). Header/topbar reuses the shared components.
4. Permissions: continue to call the same `has_permission` / `can_access_module` RPCs and the `manage_compliance` permission plus the new capability bundles in `src/lib/compliance/capabilities.ts`. No code change required — they hit the shared DB.
5. Audit trail (`useAuditTrail` / `useUserCode`) keeps writing the same `user_code` to the same tables, so SocialServe sees compliance activity transparently.

---

## Part E — Prompt to run inside the satellite project

Paste this verbatim into the new Lovable project's chat after Part B is done:

```
Create this project as the "Compliance & Enforcement" satellite of the SocialServe app.

Backend:
- Use the same Lovable Cloud / Supabase project as SocialServe.
  VITE_SUPABASE_URL=https://xynceskeiiisiefqlgxo.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY=<paste anon key from main .env>
- Do NOT create new tables, migrations, RLS, or edge functions.
- Do NOT enable RLS — this project follows the "No RLS" architectural rule.

Auth & SSO:
- Implement shared auth exactly like docs/SHARED_AUTH_SETUP.md from the main project.
- Add a public route /auth/exchange that calls the existing edge function
  `auth-redeem-exchange-code` with the `code` query param, then redirects to
  `redirect_path` (default /compliance/workbench).
- Use the existing SupabaseAuthContext, ProtectedRoute, and LoginScreen from
  the main project (copied as-is).

Code to copy from project @SocialServe (project id 455cbbae-c40e-4f3f-af49-d9ed99089948),
preserving the exact same paths so imports keep working:
- src/pages/compliance/**            (all 117 files incl. Routes.tsx)
- src/components/compliance/**       (all 139 files)
- src/services/compliance/**
- src/lib/compliance/**
- src/components/sidebar/**          (then strip menuItems to compliance only)
- src/components/sidebar/menuItems/complianceMenuItems.ts
- src/components/common/**, src/components/ui/**, src/components/auth/**
- src/contexts/SupabaseAuthContext.tsx, PIIMaskingContext.tsx,
  GlobalBlockingContext.tsx, SystemSettingsContext.tsx, ThemeContext.tsx
- src/hooks/useAuditTrail.ts, useUserCode.ts, useDynamicNavigation.ts,
  and every other hook imported by the pages above (resolve transitively).
- src/lib/utils.ts, format-config.ts, statusColors.ts, exportUtils.ts,
  htmlToPdf.ts, runtimeEnvironment.ts, globalErrorHandler.ts.
- src/types/violation*.ts, complianceSettings.ts, legal*.ts,
  paymentArrangement.ts, centralPaymentArrangement.ts, feeWaiver.ts,
  feeConfiguration.ts, contributionComponents.ts, inspectionTypes.ts,
  fieldStageMapping.ts, commTriggerRule.ts, riskPolicy.ts,
  and every other type imported transitively.
- tailwind.config.ts, src/index.css, components.json so the design tokens
  match exactly.

Routing:
- Mount `ComplianceRoutes` (from src/pages/compliance/Routes.tsx) at
  `/compliance/*`.
- Redirect `/` to `/compliance/workbench`.
- All other routes 404.

Sidebar:
- Show only complianceMenuItems. No employer/BN/admin/master-data items.

Verification:
1. Login on the satellite as an existing compliance user → lands on Workbench.
2. Open a violation → data identical to main app.
3. Edit/save a record → reflected in the main app.
4. Confirm no migrations were created and no tables touched.
```

---

## Verification checklist (after both apps are deployed)

1. From SocialServe sidebar, click the Compliance tile → should land on the satellite already authenticated (no second login).
2. Records created/edited in the satellite show up in SocialServe immediately.
3. `useAuditTrail` writes the same `user_code` in both apps.
4. Disabling a user / changing role in SocialServe instantly affects the satellite (shared `user_roles`).
5. No new tables, no migrations, no RLS, no edge function changes in the shared backend.

---

## Technical notes

- **Why import paths are preserved:** the compliance code uses absolute aliases (`@/...`). Keeping the same folder structure in the satellite means zero find/replace and no import drift.
- **Edge functions:** they live on the shared Supabase project and are already deployed. The satellite invokes them via `supabase.functions.invoke(...)` exactly like the main app.
- **`src/integrations/supabase/types.ts`:** auto-generated from the same DB; will regenerate identically inside the satellite.
- **PWA / OAuth:** if the satellite ever adds a service worker, deny `/~oauth` and `/auth/exchange` from the cache (per `cloud-oauth-providers` rule).
- **No RLS:** consistent with `docs/ARCHITECTURE-NO-RLS-RULE.md`. Authorization is enforced via `has_permission` / `can_access_module` RPCs the satellite already calls.
