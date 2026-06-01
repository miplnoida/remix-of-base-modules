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
