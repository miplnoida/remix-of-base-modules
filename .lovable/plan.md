
## Problem

All `app_modules.base_url` values for `internal_audit` (and `compliance`) are NULL/blank in the database, but the Internal Audit sidebar still routes to `/audit-hub/*` (an embedded satellite iframe). The user is currently sitting at `/audit-hub/risk-assessment`, confirming the rewrite is still happening.

Per `docs/INTERNAL_AUDIT_ROLLBACK.md`, the only switch that should decide host vs satellite is the `app_modules.base_url` column. Today, however, `isAuditRemoteEnabled()` / `isComplianceRemoteEnabled()` only consult the hard-coded `SATELLITE_CONFIG` in `src/config/satellites.ts` (both `enabled: true` with hard-coded URLs), so satellite mode is always on regardless of the DB. `useDynamicNavigation` then calls `applyAuditRemoteRouting` / `applyComplianceRemoteRouting`, which rewrites every `/audit/*` and `/compliance/*` menu URL to the `/audit-hub/*` / `/compliance-hub/*` host route — overriding the DB contract.

## Fix

Make remote-enabled state DB-driven, defaulting to **off** (host serves locally) when no module row has a non-blank `base_url`. Keep the existing hard-coded URLs as the satellite target, but only use them when the DB says so.

### Changes (frontend only)

1. **`src/lib/embed/satelliteRouting.ts`** — add a small runtime registry:
   - `setSatelliteRemoteEnabled({ compliance?: boolean; audit?: boolean })`
   - Internal module-level state initialized to `false` for both.
   - Update `isComplianceRemoteEnabled()` / `isAuditRemoteEnabled()` to require:
     `SATELLITE_CONFIG.<x>.enabled` **AND** the cached DB flag is true **AND** `pickSatelliteUrl(...).trim()` is non-blank.
   - Behavior: until the DB flag is set, both helpers return `false` → menu uses local `/audit/*` / `/compliance/*` URLs and `/audit-hub/*` routes redirect to local (already wired in `AppRoutes.tsx`).

2. **`src/hooks/useDynamicNavigation.ts`** — after the `app_modules` query resolves, derive remote flags from the DB rows and push them into the registry:
   - `audit = !!(modules.find(m => m.name === 'internal_audit')?.base_url || '').trim()`
   - `compliance = !!(modules.find(m => m.name === 'compliance')?.base_url || '').trim()`
   - Call `setSatelliteRemoteEnabled({ audit, compliance })` once per query result, then build the tree (so the same render uses the correct flags).
   - Inheritance still respected: if a child like `audit_audits` has its own non-blank `base_url`, the existing per-row prepend in `buildMenuItem` continues to point that one link at the satellite while the rest stay local. The bulk prefix rewrite only fires when the top-level module itself is configured for satellite.

3. **No changes** to `SATELLITE_CONFIG`, `AppRoutes.tsx`, `auditMenuItems.ts`, `complianceMenuItems.ts`, `SidebarMenuLink`, or `satelliteSso.ts`. This honors the runbook's "do not edit" list and preserves the rollback contract.

### Verification

1. With all `internal_audit` and `compliance` rows having blank `base_url` (current production state):
   - Sidebar Internal Audit links render as `/audit/...` (not `/audit-hub/...`).
   - Navigating directly to `/audit-hub/risk-assessment` redirects to `/audit/risk-assessment` (existing fallback).
   - Network tab shows no requests to `internalaudit.secureserve.biz` or the audit preview lovable.app domain.
2. Setting `app_modules.base_url = 'https://internalaudit.secureserve.biz'` on the `internal_audit` row and refreshing restores satellite embedding for `/audit-hub/*` and rewrites the sidebar — confirming the runbook contract still works in both directions.

### Out of scope

- No DB migrations. The runbook explicitly manages `base_url` as an operator action.
- No changes to satellite SSO, auth, or compliance/audit business logic.
- No edits to files listed under "Things that intentionally do not change in the host" in `docs/INTERNAL_AUDIT_ROLLBACK.md`.
