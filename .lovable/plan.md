

## Analysis: Changes After March 31st That Caused Slow/Intermittent Loading

### What Was Working on March 31st (commit `6bcdd96d`)

The March 31st code had a simple, fast auth + navigation flow:

```text
March 31st flow:
Login → setSession → setUser → fetchProfile + fetchRoles → setIsLoading(false)
                                                                    ↓
Navigation query: enabled: !!user?.id  ← fires immediately when user is set
                                                                    ↓
Sidebar: isLoading? → skeletons. isError? → retry. Otherwise → render menu.
```

No `isAuthReady`, no `authBootstrapVersion`, no `initializingRef`, no timeouts, no sessionStorage caching. Simple and fast.

### What Changed After March 31st (22+ commits to auth/nav files)

**Layer 1 — SupabaseAuthContext.tsx** (commits `8bd0b455`, `0cf1f094`, `287e7a22`, `1d4e2a82`, `fdc8fe54`, `f084b337`)

Added:
- `isAuthReady` state (starts `false`, must be explicitly set to `true`)
- `authBootstrapVersion` counter
- `rolesStatus` / `profileStatus` tracking
- `initializingRef` guard to prevent duplicate fetches
- 15-second safety timeout in `initializeAuth`
- `.then()` / `.catch()` in `onAuthStateChange` SIGNED_IN handler

**Impact**: Created a two-phase auth lifecycle where `isLoading=false` no longer means "ready to fetch data." Components must now also wait for `isAuthReady=true`. This is the core source of the regression — every component that only checked `isLoading` or `!!user?.id` became broken.

**Layer 2 — useDynamicNavigation.ts** (commits `a6010319`, `18f0ccb2`, `a194b184`)

Changed:
- `enabled: !!user?.id` → `enabled: isAuthReady && isAuthenticated && !!user?.id`
- Added `authBootstrapVersion` to `queryKey` (forces refetch on every bootstrap)
- Added 20-second `Promise.race` timeout wrapper around the RPC call
- Added `retry: 2` with exponential backoff
- Made logging fire-and-forget (good change, keeps)

**Impact**: The navigation query now waits for `isAuthReady` (correct), but when `isAuthReady` is delayed, the query stays disabled. React Query v5 returns `isLoading: false` for disabled queries, so the sidebar sees `menuItems: []` + `isLoading: false` = "No modules assigned" flash.

**Layer 3 — DynamicSidebarContent.tsx** (commits `e523b41c`, `1d306abf`, `6295a591`)

Changed from 132 lines to ~210 lines:
- Added sessionStorage caching with icon rehydration
- Added 15-second `loadingTimedOut` state
- Added "last known good" menu fallback
- Added "Refresh menu" button on timeout/error

**Impact**: Over-engineered for a problem that shouldn't exist. The caching/timeout logic adds complexity but masks the real issue (auth readiness delay). The 15s sidebar timeout races against the 15s auth safety timeout + 20s RPC timeout.

**Layer 4 — ProtectedRoute.tsx** (commit `8bd0b455`)

Changed from simple loading text to:
- 10-second warning timer
- 20-second retry/login buttons

**Impact**: This is fine as defensive UX, but it shouldn't be needed if auth bootstraps in <2 seconds.

### Root Cause Summary

| What broke it | Why |
|---|---|
| Adding `isAuthReady` to SupabaseAuthContext | Created a new gate that existing code didn't know about |
| Partial migration | Only navigation hook was updated to use `isAuthReady`; dozens of other hooks/pages weren't |
| `initializingRef` guard | Can cause `onAuthStateChange` to skip profile/roles fetch, leaving `isAuthReady` stuck until `initializeAuth` finishes |
| Stacked timeouts (15s auth + 20s RPC + 15s sidebar + 10s/20s ProtectedRoute) | On slow networks, these cascade and fight each other |
| `authBootstrapVersion` in queryKey | Forces a fresh RPC call on every bootstrap cycle, preventing React Query cache from helping |

### Fix Strategy: Simplify Back to Working State

The `isAuthReady` concept is correct in principle but was over-implemented. The fix should:

**Step 1: Simplify SupabaseAuthContext**
- Remove the 15-second safety timeout (unnecessary — `finally` block already handles this)
- Remove `authBootstrapVersion` (causes unnecessary refetches; `user?.id` in queryKey is sufficient)
- Keep `isAuthReady` but ensure it's set to `true` in ALL exit paths without complex branching
- Remove `initializingRef` — it creates a race where `onAuthStateChange` skips legitimate session events

**Step 2: Simplify useDynamicNavigation**
- Remove the 20-second `Promise.race` timeout (Supabase client already has its own timeout)
- Remove `authBootstrapVersion` from `queryKey`
- Keep `enabled: isAuthReady && isAuthenticated && !!user?.id` (this is correct)
- Keep fire-and-forget logging (good)

**Step 3: Restore simple DynamicSidebarContent**
- Remove sessionStorage caching and icon rehydration (unnecessary complexity)
- Remove the 15-second `loadingTimedOut` state
- Restore the original simple pattern: `isLoading → skeletons`, `isError → retry`, else → render
- Keep the default menu items section

**Step 4: Simplify ProtectedRoute**
- Remove the 10s/20s warning and retry timers
- Keep simple loading spinner — if auth takes >15s something is truly broken and a page refresh is the right action

### Files to Modify

| File | Change |
|------|--------|
| `src/contexts/SupabaseAuthContext.tsx` | Remove safety timeout, `initializingRef`, `authBootstrapVersion`. Keep `isAuthReady` set simply in `finally` and `.catch()` |
| `src/hooks/useDynamicNavigation.ts` | Remove `Promise.race` timeout, `authBootstrapVersion` from queryKey. Keep `isAuthReady` gate |
| `src/components/sidebar/DynamicSidebarContent.tsx` | Restore to March 31st simplicity (132 lines) while keeping `isAuthReady`-aware hook |
| `src/components/auth/ProtectedRoute.tsx` | Remove timer-based warnings, restore simple loading state |

### Expected Result
- Auth bootstrap completes in <2 seconds (as it did on March 31st)
- Navigation query fires immediately after auth is ready
- No cascading timeouts fighting each other
- Menu loads consistently on every login

