

# Performance Analysis: Why Most Screens Load Slowly

## Root Cause: Waterfall of Sequential Blocking Operations at Startup

The app wraps content in **10+ nested context providers**, several of which perform **blocking async operations** that must complete sequentially before any screen renders. Here is the critical path:

```text
App renders
 └─ SupabaseAuthProvider
     ├─ getSession()                         ~200-500ms
     ├─ fetchProfile()                       ~200-400ms
     ├─ fetchRoles()                         ~200-400ms
     ├─ loadSessionPolicy() (system_settings + password_policies)  ~400-800ms
     └─ resolve-auth-email edge function     (on login)
 └─ IPAccessGate  ← BLOCKS ALL CHILDREN
     ├─ getClientIP() → fetch ipify.org      ~300-800ms (external API)
     ├─ check-ip-access edge function        ~500-1500ms (cold start)
     └─ Fallback: check_ip_whitelist RPC     ~200-400ms (if edge fn fails)
 └─ SystemSettingsProvider
     └─ useSystemSettings() query            ~200-400ms
 └─ LegalAuthProvider
     ├─ getSession() (DUPLICATE)             ~200-400ms
     └─ fetchUserRoles() (DUPLICATE)         ~200-400ms
 └─ SecurityPolicyProvider
     ├─ getAppLockdownState()                ~200-400ms
     ├─ route_security_config query          ~200-400ms
     └─ can_access_module RPC (per route)    ~200-400ms
 └─ PIIMaskingProvider
     └─ getSecurityConfig()                  ~200-400ms
 └─ SystemLoggingProvider
     └─ logBusinessEvent + logAudit (per navigation) ~200ms each
```

**Total estimated startup waterfall: 3-6+ seconds** before the user sees any content.

## Key Problems Identified

### Problem 1: IPAccessGate Blocks Entire App (~1-2 seconds)
The `IPAccessGate` component calls an external API (`api.ipify.org`) and then an edge function (`check-ip-access`), both of which are slow. During this time, the user sees only a spinner. The edge function also has cold-start latency (~1-2s on first call).

### Problem 2: Duplicate Auth State Initialization
`SupabaseAuthProvider`, `LegalAuthProvider`, and `AuthProvider` each independently call `supabase.auth.getSession()` and set up `onAuthStateChange` listeners. `LegalAuthProvider` also re-fetches user roles that `SupabaseAuthProvider` already fetched.

### Problem 3: Sequential Policy Loads Block Auth Resolution
`SupabaseAuthProvider.initializeAuth()` awaits `loadSessionPolicy()` which makes 2 sequential DB queries (`system_settings` + `password_policies`) before setting `isLoading = false`. This delays the entire app.

### Problem 4: Navigation Logging on Every Route Change
`SystemLoggingProvider` fires 3 database writes (business event, audit trail, performance metric) on every route change — synchronously in the render cycle.

### Problem 5: SecurityPolicyProvider RPC Per Route
Each route change triggers a `can_access_module` RPC call to the database, adding 200-400ms latency.

### Problem 6: No Query Deduplication
Several providers and hooks query the same tables (`system_settings`, `profiles`, `user_roles`) independently without sharing results via React Query's cache effectively.

## Proposed Fixes

### Fix 1: Make IPAccessGate Non-Blocking
Render children immediately while IP check runs in background. Only block/redirect if check returns `false`. This alone saves 1-2 seconds on every page load.

### Fix 2: Parallelize Auth Initialization
In `SupabaseAuthProvider.initializeAuth()`, run `fetchProfile`, `fetchRoles`, and `loadSessionPolicy` in parallel using `Promise.all` instead of sequentially. The session policy load should not block `isLoading`.

### Fix 3: Remove Duplicate Auth Providers
`LegalAuthProvider` duplicates `SupabaseAuthProvider`. Refactor it to consume `useSupabaseAuth()` instead of independently calling `getSession()` and fetching roles again.

### Fix 4: Debounce Navigation Logging
Move navigation logging to fire-and-forget with `queueMicrotask` or `requestIdleCallback` so it doesn't block rendering.

### Fix 5: Cache Module Permissions Client-Side
Batch-fetch all module permissions on login and cache them, instead of making an RPC call per route change.

### Fix 6: Lazy-Load Session Policy
Don't await `loadSessionPolicy()` during auth init. Load it in background after `isLoading` is set to `false` — it's only needed for timeout checks that happen 30s later.

## Files Changed

| File | Change |
|------|--------|
| `src/components/security/IPAccessGate.tsx` | Render children immediately, check IP in background |
| `src/contexts/SupabaseAuthContext.tsx` | Parallelize init; don't block on policy load |
| `src/contexts/LegalAuthContext.tsx` | Remove duplicate auth calls, consume SupabaseAuthContext |
| `src/contexts/SecurityPolicyContext.tsx` | Batch-cache module permissions instead of per-route RPC |
| `src/providers/SystemLoggingProvider.tsx` | Use `requestIdleCallback` for navigation logs |
| `src/hooks/useIPAccessCheck.ts` | Add result caching to `sessionStorage` to skip recheck on navigation |

## Expected Impact

| Before | After |
|--------|-------|
| 3-6s spinner on initial load | < 1s to first meaningful content |
| 1-2s spinner on IP check | Instant render, background check |
| Duplicate DB calls on every auth init | Single set of parallel calls |
| RPC per route change | Cached permission lookup |

