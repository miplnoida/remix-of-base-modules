

## Plan: Permanently Fix Slow Login and Stuck Loading Screens

### Problem Summary

Login takes 5-10+ seconds and pages hang after login. This is caused by **sequential network bottlenecks** during login and **duplicate auth state management** across multiple hooks.

### Root Causes (Ordered by Impact)

**1. Login function makes 3 sequential network calls BEFORE authentication**

In `SupabaseAuthContext.tsx` lines 467-505, the `login()` function does:
1. Edge function call `resolve-auth-email` (cold start = 1-3s)
2. Profile query to check lockout (200-500ms)
3. THEN `signInWithPassword` (200-500ms)
4. THEN `loadSessionPolicy` (200ms)
5. THEN profile update (200ms)
6. THEN `fetchProfile` again (200ms)

That's 6 sequential calls. Total: 2-5 seconds minimum.

**2. Duplicate profile/roles fetching after login**

After `signInWithPassword` succeeds, `onAuthStateChange` fires `SIGNED_IN`. Since `initDone` is `true` by then, lines 380-397 trigger ANOTHER `Promise.all([fetchProfile, fetchRoles])`. This duplicates work the login function already did, adding 400ms+ of wasted time.

**3. `useOnlineApplicationWorkflowBinding` creates its own auth listener**

Lines 276-288 call `supabase.auth.getUser()` (network call) and set up a SEPARATE `onAuthStateChange` subscription — on every mount of employer/IP/doctor application pages. This is completely redundant since the user is already available from `useSupabaseAuth()`.

**4. Console.log fires on every render (not in useEffect)**

Lines 291-296 of `useOnlineApplicationWorkflowBinding` log on every render cycle, not inside a useEffect. This is a performance anti-pattern that clutters output and wastes CPU.

**5. `ProtectedRoute` checks `isLoading` but not `isAuthReady`**

`ProtectedRoute` uses only `isLoading` to gate rendering. After the recent changes, `isLoading` can become `false` before `isAuthReady` is `true`, causing child components to mount and fire queries before auth data (profile, roles) is available.

### Fix Plan

#### Step 1: Speed up the login function
**File:** `src/contexts/SupabaseAuthContext.tsx`

- Move `resolve-auth-email` to run in PARALLEL with the lockout profile check (both are pre-auth validation)
- Remove the duplicate `fetchProfile` call at line 548 — it's already triggered by `onAuthStateChange` SIGNED_IN handler
- Move `loadSessionPolicy()` to fire-and-forget (non-blocking) after login succeeds

This reduces login from 6 sequential calls to: 1 parallel pre-check + signInWithPassword + 1 profile update = ~3 calls.

#### Step 2: Prevent duplicate profile/roles fetch after login
**File:** `src/contexts/SupabaseAuthContext.tsx`

- In the `onAuthStateChange` SIGNED_IN handler, skip the `fetchProfile + fetchRoles` call if the data was already loaded by the `login()` function in the same session
- Use a ref (`loginJustCompletedRef`) that the login function sets to `true`, and the SIGNED_IN handler checks and resets

#### Step 3: Fix ProtectedRoute to gate on `isAuthReady`
**File:** `src/components/auth/ProtectedRoute.tsx`

- Change the loading condition from `isLoading` to `isLoading || !isAuthReady` when user is authenticated
- This prevents child pages from mounting before profile/roles are loaded

#### Step 4: Remove redundant auth in `useOnlineApplicationWorkflowBinding`
**File:** `src/hooks/useOnlineApplicationWorkflowBinding.ts`

- Remove the internal `getUser()` call and `onAuthStateChange` subscription (lines 276-288)
- Accept `userId` as a parameter or use `useSupabaseAuth()` directly
- Move debug `console.log` from render body into the useEffect
- This eliminates 1 network call + 1 auth listener per application page mount

#### Step 5: Remove verbose render-time logging
**File:** `src/hooks/useOnlineApplicationWorkflowBinding.ts`

- Move the `console.log` at line 291-296 inside the useEffect or remove it
- Keep only meaningful logs inside the async workflow binding function

### Files to Modify

| File | Change |
|------|--------|
| `src/contexts/SupabaseAuthContext.tsx` | Parallelize pre-login checks, prevent duplicate fetch, fire-and-forget policy load |
| `src/components/auth/ProtectedRoute.tsx` | Gate on `isAuthReady` for authenticated users |
| `src/hooks/useOnlineApplicationWorkflowBinding.ts` | Use `useSupabaseAuth()` instead of own auth listener, fix render-time logging |

### Expected Result
- Login: from 5-10s down to 1-2s
- Page data loading: immediate after auth ready (no more "stuck" screens)
- Fewer network calls: eliminated ~4 redundant calls per login + page load cycle
- No more duplicate auth subscriptions competing with each other

### What Is NOT Changed
- The `isAuthReady` gating pattern in navigation and data hooks — this is correct
- The `AuthContext` shim — it's working as intended
- The `SecurityPolicyContext` — it already gates on `isAuthReady`
- Edge function implementations — the proxy-api pattern is fine

