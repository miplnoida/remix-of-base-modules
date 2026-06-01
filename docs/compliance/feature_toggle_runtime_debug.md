# Compliance Feature Toggle — Runtime Debug (Phase 1)

**Date:** 2026-06-01  
**Scope:** Evidence-first audit of why Phase 1 toggle enforcement was not
visible at runtime, and the minimal repair that followed.

---

## 1. Active sidebar / menu source

| Source | Status |
| --- | --- |
| **DB `app_modules` via `useDynamicNavigation`** | ✅ **Active** — rendered by `src/components/sidebar/DynamicSidebarContent.tsx` |
| Static `complianceMenuItems.ts` | ❌ **Not mounted** — `complianceMenuItems` export has zero importers (verified with `rg`) |

Implication: any `isComplianceFeatureEnabled(...)` calls inside the static
menu file have **no effect** on the visible sidebar. That is why "menu
behavior changed: No" — the file edited in earlier work isn't rendered.

## 2. Active route file

| File | Status |
| --- | --- |
| **`src/components/routing/AppRoutes.tsx`** | ✅ **Active** — mounted by `PublicRoutes.tsx` |
| `src/pages/compliance/Routes.tsx` | ❌ **Not mounted** — no importer found |

Implication: `ComplianceRouteGate` (defined in `src/pages/compliance/ComplianceRouteGate.tsx`
and only referenced from the unmounted `Routes.tsx`) was wrapping zero
real navigations. All Phase 1 route gating done there was dead code.

## 3. Components rendered for the Phase 1 URLs (active routes)

| URL | Component (in `AppRoutes.tsx`) |
| --- | --- |
| `/compliance/violations/verification-queue` | `<VerificationQueue />` |
| `/compliance/arrangements/new` | `<NewArrangementPage />` |
| `/compliance/arrangements/active` | `<ActiveArrangementsPage />` |
| `/compliance/arrangements/payment-allocation` | `<PaymentAllocationPage />` |
| `/compliance/admin/automation/jobs` | `<ComplianceJobConfiguration />` |
| `/compliance/reports/automation-jobs` | `<AutomationJobReports />` |

None of these were wrapped by `ComplianceRouteGate` or any feature-flag
gate before this repair.

## 4. Feature flag helper actually called by these components

- `NewArrangementPage` → `isComplianceFeatureEnabled('arrangements.new')`
  (this call exists, but always returned `true` — see §5).
- `ActiveArrangementsPage` → passes `featureKey="arrangements.active"` to
  `ArrangementListPage` which then calls `isComplianceFeatureEnabled`.
- `VerificationQueue` / `ComplianceJobConfiguration` / `AutomationJobReports` /
  `PaymentAllocationPage` → **no in-page feature flag call** prior to fix
  (they rely on a route-level gate).
- Services (`arrangementWorkflowService`, `centralPaymentArrangementService`,
  `verificationQueueService`) and the `run-compliance-job` edge function
  already call `isComplianceDbFlagEnabled(...)`. Their guards were
  inert at runtime for the same reason (§5).

## 5. Were the DB feature_flags loaded before pages render?

**No.** The bootstrap hook `useComplianceFeatureFlagsBootstrap()` was
only mounted inside `ComplianceRouteGate`. Because that gate is not in
the active route tree, the hook never ran, the cache stayed `null`, and
every call to `isComplianceFeatureEnabled` / `isComplianceDbFlagEnabled`
returned the **fail-open default (`true`)**.

This single cause explains every "No change" observation in the manual
report.

## 6. How flags are propagated

- Storage: `public.feature_flags` rows (`compliance.*` keys).
- Loader: `useComplianceFeatureFlagsBootstrap` (react-query).
- Runtime cache: module-level map in `src/lib/compliance/featureFlagCache.ts`.
- Read API: `isComplianceFeatureEnabled(helperKey)` (mapped via
  `COMPLIANCE_HELPER_TO_DB_FLAG`) and `isComplianceDbFlagEnabled(dbKey)`.
- No context, no props.

## 7. Could `isComplianceFeatureEnabled` ever return the DB value?

Before the fix: **no** — cache never populated in the active tree.  
After the fix: **yes** — `useComplianceFeatureFlagsBootstrap()` is now
mounted at the top of `AppRoutes` so the cache is populated on first
authenticated render.

## 8. Where the Phase 1 changes lived

| Edit location | Mounted? |
| --- | --- |
| `src/pages/compliance/ComplianceRouteGate.tsx` (feature flag map) | ❌ |
| `src/pages/compliance/Routes.tsx` (route definitions wrapped by the gate) | ❌ |
| `src/lib/compliance/featureFlagCache.ts` | ✅ (utility, but no caller until bootstrap mounts) |
| `src/hooks/compliance/useComplianceFeatureFlags.ts` | ✅ (hook, but only called from the unmounted gate) |
| Service guards (`arrangementWorkflowService`, etc.) | ✅ (always called, but cache empty → fail-open) |
| `supabase/functions/run-compliance-job/index.ts` | ✅ (server reads DB directly — already correct) |

---

## Repair (minimal, scope-controlled)

1. **Bootstrap globally** — `useComplianceFeatureFlagsBootstrap()` mounted at
   the top of `AppRoutes()`. Cache is now populated for every page.
2. **Route-level gate** — new `src/components/compliance/ComplianceFeatureGate.tsx`
   wraps the six Phase 1 routes in `AppRoutes.tsx`, rendering
   `<FeatureDisabled />` when the DB flag is OFF.
3. **Service guards** — unchanged; now actually fire because the cache is
   populated.
4. **Edge function** — unchanged (already authoritative server-side).
5. **Diagnostics page** — `/compliance/admin/feature-toggle-diagnostics`,
   gated by the existing `ce_admin_feature_toggles` permission.

No new toggle system introduced. No Phase 2/3 keys touched. The unmounted
`src/pages/compliance/Routes.tsx` / `ComplianceRouteGate.tsx` remain in
place as dead code — left untouched to avoid widening scope.

---

## Update 2026-06-01 — Menu visibility filter

Direct-URL gating (FeatureDisabled) was working, but normal users still saw
sidebar links pointing to disabled features. We now also hide those links at
runtime.

- New helper: `src/lib/compliance/menuFeatureFilter.ts` — pure function that
  walks the menu tree and drops items whose route is gated by an OFF DB
  feature flag. Empty parent groups (no surviving children, no own URL) are
  collapsed away.
- Applied in `src/components/sidebar/DynamicSidebarContent.tsx`. The component
  subscribes to `subscribeComplianceDbFlags` so toggling a flag re-renders
  the sidebar immediately (the navigation react-query cache is keyed on
  `user.id` only and would not otherwise refresh).
- Phase 1 rules (route prefix → DB flag):
  - `/compliance/violations/verification-queue` → `compliance.core.verification_queue`
  - `/compliance/arrangements*` → `compliance.payment.arrangement`
  - `/compliance/admin/automation/jobs` → `compliance.risk.automation_jobs`
  - `/compliance/reports/automation-jobs` → `compliance.risk.automation_jobs`
- Fail-open: if the DB cache hasn't loaded yet, no filtering happens — the
  UI never disappears on a transient flag-load failure.
- Setup control-plane pages remain visible regardless of feature state:
  Feature Toggles, Feature Toggle Diagnostics, automation **history**,
  employer-jobs reference, and every unrelated Setup page (no rule matches).
- `app_modules` rows are **never** mutated; this is a render-time filter.
- Permissions are unchanged — a user must still pass both the permission
  check (RPC `get_user_accessible_modules`) AND the feature-toggle filter.

### Acceptance after this change

- Verification Queue OFF → sidebar link hidden; direct URL → `<FeatureDisabled />`.
- Payment Arrangement OFF → entire Payment Arrangements group hidden (all
  child links removed; parent collapses); direct URLs → `<FeatureDisabled />`;
  service-layer writes still blocked.
- Automation Jobs OFF → Setup → Automation Jobs and Reports → Automation
  Jobs Report hidden; direct URLs → `<FeatureDisabled />`; Run Now/Dry Run
  still blocked server-side.
- Toggling any flag back ON restores the sidebar entry without a refresh.

---

## Feature Toggles control-plane crash fix (post-Phase 1)

**Symptom:** `/compliance/admin/feature-toggles` rendered the global ErrorBoundary
("Something went wrong"). `/compliance/admin/feature-toggle-diagnostics` was at
risk of the same failure mode.

**Root cause:** React Query cache key collision.
- `useComplianceFeatureFlagsBootstrap` (mounted globally in `AppRoutes`) uses
  `queryKey: ['compliance-feature-flags']` and returns
  `Record<string, boolean>`.
- `FeatureTogglesPage` previously used the **same** key but expected
  `FlagRow[]`. Because the bootstrap query mounts first and is fresh
  (`staleTime: 30s`), the page subscribed to the cached object and ran
  `flagRows.forEach(...)` on a non-array → `TypeError` → ErrorBoundary.

**Fix (single file change):** `src/pages/compliance/admin/FeatureTogglesPage.tsx`
1. Page now uses a unique key `['compliance-feature-flags-admin']`.
2. Defensive `Array.isArray` guard so any unexpected cache shape renders as
   "no rows" instead of crashing.
3. Toggle mutation invalidates **both** keys so the runtime gate cache
   (`compliance-feature-flags`) refreshes immediately after a flip.

**Not changed:** routing, `ComplianceFeatureGate`, sidebar filter,
`featureToggles.ts`, bootstrap hook, edge function. The Feature Toggles route
was already NOT wrapped by `ComplianceFeatureGate` and remains protected only
by `PermissionWrapper`.

**Verification:**
- `/compliance/admin/feature-toggles` renders the catalog (8 groups).
- `/compliance/admin/feature-toggle-diagnostics` renders (unchanged file).
- Search for "Payment Arrangement" filters correctly.
- Toggling Payment Arrangement ON/OFF persists across refresh and is
  reflected in `getComplianceDbFlag('compliance.payment.arrangement')`
  via the invalidated bootstrap query.
- Phase 1 direct route gates (`/compliance/violations/verification-queue`,
  `/compliance/arrangements/new`, `/compliance/admin/automation/jobs`)
  continue to honour the DB flag.
- TypeScript build passes.
