
## Plan: Permanent Fix for Intermittent Left Navigation Menu Failures

### Findings from the current code
Page load currently triggers these backend interactions before/alongside sidebar load:

```text
auth.getSession / onAuthStateChange
→ profiles
→ user_roles
→ system_settings
→ password_policies
→ app_lockdown_state
→ route_security_config
→ check-ip-access / check_ip_whitelist
→ get_user_accessible_modules
→ can_access_module (route checks)
```

The sidebar issue is not just a timeout problem. The current design has a brittle startup contract:

1. `useDynamicNavigation` starts as soon as `user?.id` exists, not when auth/session bootstrap is truly ready.
2. `SupabaseAuthContext` returns `roles: []` on failure, so the app cannot distinguish:
   - “roles still loading”
   - “roles query failed”
   - “user really has no roles”
3. `SecurityPolicyContext` treats `roles.length > 0` as readiness, which can leave route security in an unresolved state for users with empty/failed role loads.
4. `DynamicSidebarContent` treats dynamic navigation as all-or-nothing; one RPC failure replaces the whole dynamic sidebar with an error screen.
5. `get_user_accessible_modules` is a join-heavy RPC that only returns directly permitted modules; it does not explicitly hydrate parent menu groups for permitted children and gives no structured diagnostic signal back to the UI.

Recent fixes improved symptoms (timeouts, retry button, non-blocking logging), but not the root cause: auth readiness, role readiness, and navigation readiness are still not modeled separately.

---

## Production-grade implementation

### 1. Separate auth readiness from role/profile readiness
Refactor `SupabaseAuthContext` to expose explicit bootstrap state instead of only `isLoading`.

Add state such as:
- `isAuthReady` — initial session restoration complete
- `rolesLoaded` — roles request completed successfully or definitively empty
- `profileLoaded` — profile request completed
- `authBootstrapStatus` — `loading | ready | degraded`

This removes the current ambiguity where `roles = []` can mean either failure or legitimate empty access.

Files:
- `src/contexts/SupabaseAuthContext.tsx`

---

### 2. Gate sidebar loading on real auth readiness
Refactor `useDynamicNavigation` so it only calls the Supabase RPC when:
- auth bootstrap is complete
- session is present
- user id is present
- token context is ready

Change the query trigger from `enabled: !!user?.id` to something equivalent to:
- `enabled: isAuthReady && isAuthenticated && !!user?.id`

Also make the query key include a stable auth bootstrap version so a late-ready session automatically re-fetches instead of keeping the first failed result.

Files:
- `src/hooks/useDynamicNavigation.ts`
- `src/contexts/SupabaseAuthContext.tsx`

---

### 3. Harden the backend navigation RPC
Keep the sidebar on the Supabase RPC layer; do not fall back to direct client table reads.

Update `get_user_accessible_modules` so it:
- resolves permissions via a clearer CTE/`EXISTS` flow
- includes required parent menu nodes when a child is accessible
- returns an empty result, not an exception, for no-role/no-permission cases
- consistently filters `is_enabled` and `show_in_menu`
- is safe for slow/partial role states

Also review `can_access_module` so its logic matches the sidebar RPC exactly.

Likely migration work:
- replace the current join-only RPC with a parent-aware query
- add/confirm indexes supporting the permission path and menu tree path
- verify role name lookups are indexed and consistent

Files:
- new migration in `supabase/migrations/*`
- existing RPC definitions for `get_user_accessible_modules` and `can_access_module`

---

### 4. Make the sidebar resilient instead of all-or-nothing
Refactor `DynamicSidebarContent` so a failed dynamic RPC does not blank the navigation area.

Behavior:
- always render the default menu group
- render last-known-good dynamic menu if available
- show a compact inline warning for dynamic-menu failure
- show a proper “No modules assigned” state when the RPC succeeds with zero items
- keep retry available, but do not require retry for the sidebar to remain usable

Use cached dynamic navigation per user session as a resilience layer, not as the source of truth.

Files:
- `src/components/sidebar/DynamicSidebarContent.tsx`
- `src/hooks/useDynamicNavigation.ts`

---

### 5. Fix security/provider coupling
Refactor `SecurityPolicyContext` readiness so it does not depend on `roles.length > 0`.

Use explicit role-load completion instead. This prevents “no roles” or “role fetch failed” from being treated as “still loading forever,” which can create inconsistent startup behavior around protected routes and module access.

Files:
- `src/contexts/SecurityPolicyContext.tsx`
- `src/contexts/SupabaseAuthContext.tsx`

---

### 6. Add structured diagnostics for navigation bootstrap
Use existing logging tables, but log the right signals for this specific flow:

For navigation load attempts, capture:
- auth bootstrap state
- session present/not present
- roles loaded / role count
- user id
- RPC name
- duration
- timeout vs backend error vs empty result
- whether cached menu was used

This will make future failures diagnosable without relying on vague “Failed to load menu” reports.

Files:
- `src/hooks/useDynamicNavigation.ts`
- optionally shared logging helper if needed

---

## Expected file changes
- `src/contexts/SupabaseAuthContext.tsx`
- `src/hooks/useDynamicNavigation.ts`
- `src/components/sidebar/DynamicSidebarContent.tsx`
- `src/contexts/SecurityPolicyContext.tsx`
- `supabase/migrations/...` for hardened navigation RPC/index updates

---

## Verification checklist
Test after implementation in these scenarios:

1. Fresh login in preview
2. Existing restored session on hard refresh
3. Slow network / delayed auth restoration
4. Expired session then re-login
5. Token refresh while app is open
6. Concurrent tab login/logout
7. User with no assigned dynamic modules
8. User with child-module access only
9. Admin user
10. Simulated RPC failure / timeout

Success criteria:
- sidebar never stays stuck in skeleton/error-only mode
- default navigation always remains usable
- dynamic menu loads automatically when auth becomes ready
- no hard refresh is required
- route security and menu visibility stay consistent
- failures are logged with enough detail to diagnose quickly

---

## Technical notes
- Keep the solution on Supabase endpoints/RPCs; do not bypass with direct client reads from `app_modules`
- No new RLS work should be introduced
- Update the project knowledge/test coverage for auth bootstrap + dynamic sidebar behavior so this regression is tracked going forward
