# Prompt to paste into the **Integrated Compliance Hub** project

> Project ID: `8471f73c-7659-4260-8d4d-c70dfbebe261`
> Domain: `compliance.secureserve.biz`
> Shared backend: `xynceskeiiisiefqlgxo.supabase.co`
>
> Paste **everything below the line** as the first message in that project.

---

You are bootstrapping a satellite app of the SocialServe project (`455cbbae-c40e-4f3f-af49-d9ed99089948`). It must share the SAME Lovable Cloud backend, the SAME login session, and run ONLY the "Compliance & Enforcement" module. Mirror the existing Internal Audit satellite pattern.

## Hard constraints

- DO NOT create or modify any database tables, RLS policies, RPCs, triggers, or auth settings. The shared backend already has everything.
- DO NOT add new auth providers or signup screens beyond reusing `LoginScreen`.
- DO NOT introduce mock data. All reads/writes go to the shared Supabase project.
- DO NOT edit `src/integrations/supabase/client.ts` or `src/integrations/supabase/types.ts` — Lovable Cloud regenerates them from the shared backend.
- Preserve `@/...` import aliases exactly as they appear in the source project.
- Audit fields (`created_by`, `updated_by`, etc.) MUST use `user_code` from `useAuditFields()` / `useUserCode()`.

## Step 1 — Backend env

Overwrite `.env` with:

```
SUPABASE_URL="https://xynceskeiiisiefqlgxo.supabase.co"
SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bmNlc2tlaWlpc2llZnFsZ3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTQxMDAsImV4cCI6MjA4ODczMDEwMH0.kVVysArl8ujrAHpHLtNx7xifYyq02ulIE5c4WKKSXCI"
VITE_SUPABASE_URL="https://xynceskeiiisiefqlgxo.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bmNlc2tlaWlpc2llZnFsZ3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTQxMDAsImV4cCI6MjA4ODczMDEwMH0.kVVysArl8ujrAHpHLtNx7xifYyq02ulIE5c4WKKSXCI"
VITE_SUPABASE_PROJECT_ID="xynceskeiiisiefqlgxo"
```

## Step 2 — Copy code from the SocialServe project (`455cbbae-c40e-4f3f-af49-d9ed99089948`)

Use `cross_project--copy_project_asset` (or equivalent) for each path below, preserving the same destination path inside this project.

**Compliance feature code (copy entire directories recursively):**
- `src/pages/compliance/**`
- `src/components/compliance/**`
- `src/services/compliance/**`
- `src/lib/compliance/**`
- `src/hooks/compliance/**`

**Compliance-related types (copy each file):**
- `src/types/violation.ts`
- `src/types/violationActions.ts`
- `src/types/violationNotes.ts`
- `src/types/complianceSettings.ts`
- `src/types/legal.ts`
- `src/types/legalEscalation.ts`
- `src/types/legalFinal.ts`
- `src/types/legalReferralTypes.ts`
- `src/types/inspectionTypes.ts`
- `src/types/notification.ts`
- `src/types/auth.ts`
- Any other `src/types/*.ts` referenced by the files above (resolve imports as you go).

**Sidebar (only the compliance menu):**
- `src/components/sidebar/menuItems/complianceMenuItems.ts`
- `src/components/sidebar/` shell components (Sidebar, SidebarMenuLink, etc.) — but the menu list passed in must be ONLY `complianceMenuItems`.

**Shared infrastructure (REQUIRED — same files, same paths):**
- `src/contexts/SupabaseAuthContext.tsx`
- `src/contexts/PIIMaskingContext.tsx`
- `src/contexts/GlobalBlockingContext.tsx`
- `src/contexts/SystemSettingsContext.tsx`
- `src/contexts/ThemeContext.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/auth/LoginScreen.tsx`
- `src/hooks/useAuditTrail.ts`
- `src/hooks/useUserCode.ts`
- `src/hooks/useBlockingMutation.ts`
- `src/hooks/useDynamicNavigation.ts`
- `src/hooks/useEmployerComplianceSummary.ts` (if referenced)
- `src/lib/satelliteSso.ts`
- `src/lib/utils.ts`
- `src/lib/format-config.ts`
- `src/lib/statusColors.ts`
- `src/lib/exportUtils.ts`
- `src/lib/htmlToPdf.ts`
- `src/lib/dateFormat.ts`
- `tailwind.config.ts`
- `src/index.css`
- `src/App.css`
- `components.json`
- `postcss.config.js`

**Auth exchange page (must exist for SSO):**
- `src/pages/auth/Exchange.tsx` (or whatever the SocialServe satellite-redeem page is named — search for `auth-redeem-exchange-code`).

After copying, run a missing-import sweep: read every copied file's imports and copy any additional `@/...` files that aren't yet present. Iterate until the project type-checks.

## Step 3 — App.tsx

Replace `src/App.tsx` with a minimal shell:

```tsx
// Providers (same order as SocialServe): QueryClientProvider → ThemeProvider →
// SystemSettingsProvider → SupabaseAuthProvider → PIIMaskingProvider →
// GlobalBlockingProvider → TooltipProvider → BrowserRouter
//
// Routes:
//   /auth/exchange  -> Exchange page (calls auth-redeem-exchange-code)
//   /login          -> LoginScreen
//   /               -> redirect to /compliance/workbench when authenticated, else /login
//   /compliance/*   -> all compliance routes wrapped in <ProtectedRoute>
//
// Sidebar: render ONLY complianceMenuItems.
```

Do not include any non-compliance routes, menu items, or pages.

## Step 4 — Custom domain

After the build succeeds, ask the user to publish and connect `compliance.secureserve.biz` (A 185.158.133.1 + TXT) so SSO cookies on `.secureserve.biz` are shared with SocialServe.

## Step 5 — Verification checklist

- Direct login on satellite lands on `/compliance/workbench`.
- Clicking "Compliance & Enforcement" tile inside SocialServe lands on satellite already authenticated (via `/auth/exchange?code=...`).
- A violation created on satellite appears in SocialServe lists.
- Audit trail rows show the same `user_code` regardless of which app wrote them.
- Disabling a user in SocialServe blocks the satellite session on next request.
