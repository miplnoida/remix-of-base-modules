# Compliance & Enforcement — Satellite Application Plan

Spin up the existing satellite project **Integrated Compliance Hub** (`8471f73c-7659-4260-8d4d-c70dfbebe261`, served at `https://compliance.secureserve.biz`) so it hosts ONLY the Compliance & Enforcement module of SocialServe, sharing SocialServe's Lovable Cloud database and login session. **Zero changes to SocialServe business logic.** Mirrors the Internal Audit satellite pattern.

---

## Part A — SocialServe (main app) registration changes

Only registration entries — no business logic touched.

1. **`src/lib/satelliteSso.ts`** — add to `SATELLITE_HOSTS`:
   ```ts
   'compliance.secureserve.biz': 'compliance',
   // (optional, for early Lovable preview testing)
   // '<satellite-preview-id>.lovable.app': 'compliance',
   ```
2. **Edge function `auth-issue-exchange-code`** — add `'compliance'` to `ALLOWED_APPS`.
3. **`app_modules` row for Compliance** — set `base_url = 'https://compliance.secureserve.biz'` so the SocialServe sidebar tile launches the satellite via SSO.

No tables, RLS, RPCs, routes, services, or UI logic are modified.

---

## Part B — Satellite project (Integrated Compliance Hub) wiring

1. Open project `8471f73c-7659-4260-8d4d-c70dfbebe261`.
2. Enable Lovable Cloud, then overwrite `.env` to point at SocialServe's backend:
   - `VITE_SUPABASE_URL=https://xynceskeiiisiefqlgxo.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bmNlc2tlaWlpc2llZnFsZ3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTQxMDAsImV4cCI6MjA4ODczMDEwMH0.kVVysArl8ujrAHpHLtNx7xifYyq02ulIE5c4WKKSXCI`
   - `VITE_SUPABASE_PROJECT_ID=xynceskeiiisiefqlgxo`
3. Custom domain `compliance.secureserve.biz` (same parent as `admin.secureserve.biz`) — required so SSO HttpOnly cookies on `.secureserve.biz` are shared.

---

## Part C — Files copied from SocialServe (exact paths, preserve structure)

Compliance module:
- `src/pages/compliance/**`
- `src/components/compliance/**`
- `src/services/compliance/**`
- `src/lib/compliance/**`
- `src/hooks/compliance/**`
- `src/components/sidebar/menuItems/complianceMenuItems.ts`

Compliance-related types:
- `src/types/complianceSettings.ts`
- `src/types/violation.ts`, `violationActions.ts`, `violationNotes.ts`
- `src/types/legal.ts`, `legalEscalation.ts`, `legalFinal.ts`, `legalReferralTypes.ts`
- `src/types/inspectionTypes.ts`, `feeWaiver.ts`
- `src/types/paymentArrangement.ts`, `centralPaymentArrangement.ts`
- `src/types/commTriggerRule.ts`, `notification.ts`, `notifications.ts`
- `src/types/auth.ts`, `systemAdmin.ts`, `workflow.ts`
- `src/types/employerObservation.ts`, `employerHistory.ts`, `employerRegistration.ts`
- `src/types/meetings.ts`, `scheduler.ts`

Shared infrastructure (must come along):
- `src/contexts/SupabaseAuthContext.tsx`, `PIIMaskingContext.tsx`, `GlobalBlockingContext.tsx`, `SystemSettingsContext.tsx`, `ThemeContext.tsx`
- `src/components/auth/**` (ProtectedRoute, LoginScreen, `/auth/exchange` page)
- `src/components/common/**`
- `src/components/ui/**` (only custom variants beyond shadcn defaults)
- `src/hooks/useAuditTrail.ts`, `useUserCode.ts`, `useBlockingMutation.ts`, `useDynamicNavigation.ts`, `useEmployerComplianceSummary.ts`
- `src/lib/satelliteSso.ts`, `utils.ts`, `format-config.ts`, `statusColors.ts`, `exportUtils.ts`, `htmlToPdf.ts`, `dateFormat.ts`, `runtimeEnvironment.ts`, `globalErrorHandler.ts`, `chartColors.ts`, `fieldValidationRegistry.ts`
- `src/services/piiMaskingService.ts`, `systemLoggerService.ts`, `correlationIdService.ts`, `entityResolver.ts`, `resolveReportingManager.ts`
- `tailwind.config.ts`, `index.css`, `components.json`, `postcss.config.js`

**Do NOT copy** `src/integrations/supabase/client.ts` or `types.ts` — they auto-regenerate against the shared backend after `.env` is set.

Edge functions and DB migrations: **none copied** — they live on the shared backend and are invoked over the network.

---

## Part D — Satellite App.tsx structure

```
ThemeProvider
  → QueryClientProvider
    → SupabaseAuthProvider
      → SystemSettingsProvider
        → PIIMaskingProvider
          → GlobalBlockingProvider
            → BrowserRouter
                ├── /auth/exchange   → ExchangeCodePage
                ├── /login           → LoginScreen
                ├── /                → <Navigate to="/compliance/workbench" />
                └── /compliance/*    → <ProtectedRoute> + Compliance routes
            + <Toaster />
```

Sidebar renders ONLY `complianceMenuItems`. Audit trail and permissions reuse shared `has_role` RPC and `useAuditFields()`.

---

## Part E — Prompt to paste into "Integrated Compliance Hub"

Open project `8471f73c-7659-4260-8d4d-c70dfbebe261` and paste this as the first message:

---
```
Build this project as a satellite of the SocialServe app (project id 455cbbae-c40e-4f3f-af49-d9ed99089948, mention it as @SocialServe). It must host ONLY the Compliance & Enforcement module and share the SAME Lovable Cloud backend and the SAME logged-in session as SocialServe via SSO exchange-code cookies on the parent domain `secureserve.biz`. Do NOT create new tables, new RLS, new edge functions, new auth providers, or any mock data — reuse everything from the shared backend.

STEP 1 — Backend wiring. Overwrite `.env` with:
  VITE_SUPABASE_URL=https://xynceskeiiisiefqlgxo.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bmNlc2tlaWlpc2llZnFsZ3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTQxMDAsImV4cCI6MjA4ODczMDEwMH0.kVVysArl8ujrAHpHLtNx7xifYyq02ulIE5c4WKKSXCI
  VITE_SUPABASE_PROJECT_ID=xynceskeiiisiefqlgxo
Then let `src/integrations/supabase/client.ts` and `types.ts` regenerate against this project. Never edit those two files manually.

STEP 2 — Use the cross_project tools to copy these paths VERBATIM from @SocialServe (project 455cbbae-c40e-4f3f-af49-d9ed99089948), preserving directory structure and `@/...` import aliases:

Compliance module (entire trees):
  src/pages/compliance/**
  src/components/compliance/**
  src/services/compliance/**
  src/lib/compliance/**
  src/hooks/compliance/**
  src/components/sidebar/menuItems/complianceMenuItems.ts

Compliance-related types (each file):
  src/types/complianceSettings.ts
  src/types/violation.ts
  src/types/violationActions.ts
  src/types/violationNotes.ts
  src/types/legal.ts
  src/types/legalEscalation.ts
  src/types/legalFinal.ts
  src/types/legalReferralTypes.ts
  src/types/inspectionTypes.ts
  src/types/feeWaiver.ts
  src/types/paymentArrangement.ts
  src/types/centralPaymentArrangement.ts
  src/types/commTriggerRule.ts
  src/types/notification.ts
  src/types/notifications.ts
  src/types/auth.ts
  src/types/systemAdmin.ts
  src/types/workflow.ts
  src/types/employerObservation.ts
  src/types/employerHistory.ts
  src/types/employerRegistration.ts
  src/types/meetings.ts
  src/types/scheduler.ts

Shared infrastructure (verbatim):
  src/contexts/SupabaseAuthContext.tsx
  src/contexts/PIIMaskingContext.tsx
  src/contexts/GlobalBlockingContext.tsx
  src/contexts/SystemSettingsContext.tsx
  src/contexts/ThemeContext.tsx
  src/components/auth/**
  src/components/common/**
  src/hooks/useAuditTrail.ts
  src/hooks/useUserCode.ts
  src/hooks/useBlockingMutation.ts
  src/hooks/useDynamicNavigation.ts
  src/hooks/useEmployerComplianceSummary.ts
  src/lib/satelliteSso.ts
  src/lib/utils.ts
  src/lib/format-config.ts
  src/lib/statusColors.ts
  src/lib/exportUtils.ts
  src/lib/htmlToPdf.ts
  src/lib/dateFormat.ts
  src/lib/runtimeEnvironment.ts
  src/lib/globalErrorHandler.ts
  src/lib/chartColors.ts
  src/lib/fieldValidationRegistry.ts
  src/services/piiMaskingService.ts
  src/services/systemLoggerService.ts
  src/services/correlationIdService.ts
  src/services/entityResolver.ts
  src/services/resolveReportingManager.ts
  tailwind.config.ts
  index.css
  components.json
  postcss.config.js

Do NOT copy `src/integrations/supabase/client.ts` or `src/integrations/supabase/types.ts`.

STEP 3 — Create `src/App.tsx`:
  Providers (outer → inner): ThemeProvider, QueryClientProvider, SupabaseAuthProvider, SystemSettingsProvider, PIIMaskingProvider, GlobalBlockingProvider, BrowserRouter, Toaster.
  Routes:
    /auth/exchange → ExchangeCodePage (calls `auth-redeem-exchange-code` edge function with `?code=...`, then router.replace() to `redirect_path` or `/compliance/workbench`)
    /login → LoginScreen
    /  → <Navigate to="/compliance/workbench" replace />
    /compliance/* → wrap in <ProtectedRoute> and mount the compliance routes copied from SocialServe's Routes.tsx

STEP 4 — Sidebar: render ONLY `complianceMenuItems`. No other modules.

STEP 5 — Custom domain: `compliance.secureserve.biz`.

Constraints (strict):
- Do NOT modify any tables, RLS policies, RPCs, or edge functions on the shared backend.
- Do NOT add signup or password-reset UI; login goes through the shared backend's existing flow.
- Do NOT add mock/seed data; the database is the source of truth.
- All audit trail writes must use `useAuditFields()` and the shared `user_code` (VARCHAR(50)).
- Permissions: keep using `has_role` RPC and `manage_compliance` capability checks exactly as in SocialServe.
- Follow the existing memory/index Core rules (route gating with `isAuthReady && isAuthenticated`, pagination, blocking mutations, etc.).

After scaffolding is complete, confirm the satellite preview opens at `/compliance/workbench` after login, and that the SSO exchange page redeems a one-time `sso_code` correctly when invoked from SocialServe.
```
---

## Part F — Verification checklist

1. Log in directly on `compliance.secureserve.biz` → lands on `/compliance/workbench`.
2. From SocialServe sidebar (`admin.secureserve.biz`) click the Compliance tile → SSO exchange → satellite opens already authenticated; no second login.
3. Create / edit a violation in satellite → visible in SocialServe (shared DB).
4. Audit trail rows show the same `user_code` regardless of which app wrote them.
5. Disable a user in SocialServe → satellite session blocked on next protected request.

## Technical notes

- SSO uses HttpOnly cookies scoped to `.secureserve.biz`. Both subdomains MUST be served over HTTPS on the same parent domain.
- `src/integrations/supabase/client.ts` and `types.ts` are auto-managed by Lovable Cloud — never hand-edit in either project.
- Edge functions live on the shared Supabase project; the satellite invokes them with its own (shared) anon key.
- During preview-only testing (before DNS), temporarily add the satellite's `*.lovable.app` host to `SATELLITE_HOSTS` and `app_modules.base_url` in SocialServe.
