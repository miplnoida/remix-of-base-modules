
## Root cause

Investigation of the active routing, menu, permission, and gate stack uncovered three distinct defects, not one:

### 1. `/compliance/admin/feature-toggles` — wrong module-name constant

`src/pages/compliance/admin/FeatureTogglesPage.tsx` (line 17) and `FeatureToggleDiagnosticsPage.tsx` use:

```
const MODULE_NAME = 'compliance_admin_feature_toggles';
```

The actual DB row in `app_modules` is `ce_admin_feature_toggles`. `useActionPermissions` filters `get_user_permissions` rows by exact `module_name` match, so for every non-admin role the result is `[]` → `PermissionWrapper` → **Access Denied**, even though `role_permissions` already grants `ComplianceAdmin` the `view`/`edit`/`configure` actions on `ce_admin_feature_toggles`. Admin works only because `useActionPermissions` short-circuits on `isAdmin`.

The diagnostics page uses the correct string `ce_admin_feature_toggles` and works for ComplianceAdmin — that confirms the diagnosis.

### 2. Compliance routes have **no permission guard at all** — only a feature gate

`src/components/routing/AppRoutes.tsx` wraps every gated compliance route with `<ComplianceFeatureGate>` and nothing else. `ProtectedLayout` only checks authentication. There is no `PermissionWrapper` / `PermissionProtectedRoute` on these routes, so:

- Any logged-in user (including the Restricted role) can hit `/compliance/enforcement/waivers` or `/compliance/enforcement/legal-referral` directly.
- When the flag is OFF they see `FeatureDisabled`; when ON they see the page.

The precedence the spec demands (auth → permission → feature flag → render) is not enforced at the route layer.

### 3. Menu visibility for Legal Referral — missing role grant

`role_permissions` for `ce_legal_referral` only has rows for the `Admin` role. `ComplianceAdmin`, `ComplianceHead`, `SeniorInspector`, `ComplianceInspector` all have **zero** rows. Since the sidebar is DB-driven (`get_user_accessible_modules` filters by permission), Legal Referral never appears in the menu for Compliance Admin (UAT) even when the flag is ON, while Waiver Requests appears because `ce_waiver_requests` is fully granted.

(For contrast: `ce_admin_feature_toggles` *is* granted to ComplianceAdmin in the DB, but Issue #1 above blocks rendering. Both must be fixed.)

## Implementation plan

### Step 1 — Fix module-name constants

In both files set `MODULE_NAME = 'ce_admin_feature_toggles'`:

- `src/pages/compliance/admin/FeatureTogglesPage.tsx`
- `src/pages/compliance/admin/FeatureToggleDiagnosticsPage.tsx` (verify; already correct but double-check)

### Step 2 — New combined guard: `ComplianceRouteGuard`

Create `src/components/compliance/ComplianceRouteGuard.tsx`:

- Props: `moduleName: string`, `flagKey?: string`, `title: string`, `children`.
- Order of checks (returns at first failure):
  1. `useActionPermissions(moduleName)` loading → spinner.
  2. Not `isAdmin` and not `canView()` → `<AccessDenied />` (with Go Back).
  3. If `flagKey` provided → delegate to `<ComplianceFeatureGate flagKey title>` so the existing FeatureDisabled UX, error boundary, and live re-render via `useSyncExternalStore` are reused.
  4. Otherwise render children.

This guarantees the precedence: **auth (already by ProtectedLayout) → permission → feature flag → page**.

### Step 3 — Apply guard to the three reported routes

In `src/components/routing/AppRoutes.tsx`:

- `/compliance/admin/feature-toggles` — wrap with `<ComplianceRouteGuard moduleName="ce_admin_feature_toggles" title="Feature Toggles">` (no flagKey, per spec).
- `/compliance/enforcement/legal-referral` — replace `ComplianceFeatureGate` with `ComplianceRouteGuard moduleName="ce_legal_referral" flagKey="compliance.legal.handoff" title="Legal Referral"`.
- `/compliance/enforcement/waivers` — replace with `ComplianceRouteGuard moduleName="ce_waiver_requests" flagKey="compliance.payment.waiver_requests" title="Waiver Requests"`.

Other compliance routes are left for a follow-up sweep (out of scope; called out in the gap list).

### Step 4 — Grant `view` permission on `ce_legal_referral`

Migration that inserts `role_permissions` rows for the appropriate non-admin compliance roles on the `view` action of module `ce_legal_referral`:

- `ComplianceAdmin` — view (plus create/edit/approve/reject to keep parity with `ce_waiver_requests` so the page is usable).
- `ComplianceHead` — view + workflow actions.
- `SeniorInspector` — view + create/submit.
- `ComplianceInspector` — view only.

Use `ON CONFLICT DO NOTHING` against the existing `(role_id, module_id, action_id)` unique index. No grant added to Restricted-User-type roles. Module actions are read from `module_actions` for `ce_legal_referral`; create any missing standard actions only if absent.

### Step 5 — Verification

After build:

| Scenario | Admin | ComplianceAdmin (UAT) | Restricted User |
|---|---|---|---|
| A. `/compliance/admin/feature-toggles` | opens | opens | Access Denied |
| B. Legal Handoff ON — menu + route | visible + opens | visible + opens | hidden + Access Denied |
| C. Legal Handoff OFF — menu + route | hidden + FeatureDisabled | hidden + FeatureDisabled | hidden + Access Denied |
| D. Waiver Requests ON — menu + route | visible + opens | visible + opens | hidden + Access Denied |
| E. Waiver Requests OFF — menu + route | hidden + FeatureDisabled | hidden + FeatureDisabled | hidden + Access Denied |

Regression: diagnostics page, Verification Queue, Payment Arrangement, Automation Jobs, Risk Scoring, Rule Simulator unchanged because their routes are untouched and continue to use `ComplianceFeatureGate`.

Verified via:
- `psql` reads on `role_permissions` for the four modules.
- Manual browser navigation as each of the three role accounts (Admin / ComplianceAdmin / Restricted) against ON and OFF flag states.
- `useActionPermissions('ce_admin_feature_toggles')` returning `view` for ComplianceAdmin after the constant fix.

## Technical reference

- Files inspected: `src/components/routing/AppRoutes.tsx`, `src/components/layout/ProtectedLayout.tsx`, `src/components/auth/ProtectedRoute.tsx`, `src/components/auth/AccessDenied.tsx`, `src/components/auth/PermissionProtectedRoute.tsx`, `src/components/ui/permission-wrapper.tsx`, `src/components/compliance/ComplianceFeatureGate.tsx`, `src/pages/compliance/admin/FeatureTogglesPage.tsx`, `src/pages/compliance/admin/FeatureToggleDiagnosticsPage.tsx`, `src/hooks/useActionPermission.ts`, `src/lib/compliance/menuFeatureFilter.ts`, `src/components/sidebar/menuItems/complianceMenuItems.ts`.
- DB inspected: `app_modules`, `module_actions`, `role_permissions`, `roles` rows for `ce_admin_feature_toggles`, `ce_legal_referral`, `ce_waiver_requests`, `ce_waivers`.
- Files to change: `FeatureTogglesPage.tsx` (constant), `FeatureToggleDiagnosticsPage.tsx` (verify constant), new `ComplianceRouteGuard.tsx`, 3 routes in `AppRoutes.tsx`.
- DB migration: insert `role_permissions` rows for non-admin compliance roles on `ce_legal_referral`.

## Known gaps / assumptions

- Only the three reported routes are wrapped with `ComplianceRouteGuard`. Other compliance routes (cases, arrangements, inspections, risk, etc.) still rely on `ComplianceFeatureGate` alone, so a Restricted User could still reach them directly. A future sweep should migrate them all to the new guard — flagged for a follow-up.
- "Compliance Admin (UAT)" is assumed to map to the DB role `ComplianceAdmin`. If UAT uses a different role row, the Step 4 grants must be re-targeted; please confirm the exact `roles.role_name` if it isn't `ComplianceAdmin`.
- "Restricted User" is assumed to be any role without `ce_legal_referral.view` / `ce_waiver_requests.view` / `ce_admin_feature_toggles.view`. No new grants are added for it.
