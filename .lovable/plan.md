

# Performance Fix: Remaining Slow-Loading Issues

## Root Causes Still Present

After reviewing the current code against the session replay (user stuck on "Loading..." for extended periods on /login) and network logs (duplicate `api.ipify.org` calls), these issues remain:

### Issue 1: Race Condition in `getClientIP()` — Duplicate External API Calls
The network logs show 2 calls to `api.ipify.org` at the same millisecond on every page load. `getClientIP()` in `securityPolicyService.ts` uses a module-level `cachedIP` variable, but when `IPAccessGate` and `SecurityPolicyContext` both call it simultaneously on mount, neither finds the cache populated yet. Both make the external fetch.

**Fix**: Add a promise-deduplication pattern — store the in-flight promise so concurrent callers share a single network request.

### Issue 2: `SupabaseAuthContext` — `onAuthStateChange` handler uses `setTimeout` with sequential awaits
Lines 394-400: When `SIGNED_IN` fires, the handler wraps profile/roles fetch in `setTimeout(() => { await fetchProfile(); await fetchRoles(); }, 0)` — these run **sequentially**. But `initializeAuth()` (lines 427-432) already runs them in parallel via `Promise.all`. So on initial load, the `onAuthStateChange` callback fires AND `initializeAuth` runs — causing **duplicate** profile+roles fetches.

**Fix**: In `onAuthStateChange`, skip fetching if `initializeAuth` is already handling it (use a ref flag). Also parallelize the `onAuthStateChange` handler's fetches.

### Issue 3: Login screen shows full-screen "Loading..." during auth init
`LoginScreen.tsx` line 210 returns a loading spinner while `authLoading` is true. The login page is a **public route** — it doesn't need to wait for auth to resolve before showing the form. It only needs to redirect if the user is already authenticated.

**Fix**: On login/public routes, render the form immediately and only redirect after auth resolves. Don't block the form behind `authLoading`.

### Issue 4: `SecurityPolicyContext` calls `getClientIP()` eagerly on mount
Line 104-106: Even for public routes (like `/login`), `SecurityPolicyContext` calls `getClientIP()` on mount. This is unnecessary for unauthenticated users.

**Fix**: Only fetch client IP when user is authenticated.

### Issue 5: `loadSessionPolicy()` called from **two places** on session init
Both `initializeAuth()` (line 431) and the `useEffect` at line 276 call `loadSessionPolicy()` when a session exists — that's 2 extra DB queries (system_settings + password_policies) duplicated.

**Fix**: Remove the `loadSessionPolicy()` from the session timeout `useEffect` since `initializeAuth` already calls it. Use a ref to track if it's already been loaded.

## Files Changed

| File | Change |
|------|--------|
| `src/services/securityPolicyService.ts` | Promise-dedup `getClientIP()` to prevent duplicate `ipify.org` calls |
| `src/contexts/SupabaseAuthContext.tsx` | (1) Skip duplicate fetch in `onAuthStateChange` during init. (2) Parallelize `onAuthStateChange` fetches. (3) Remove duplicate `loadSessionPolicy()` call |
| `src/components/auth/LoginScreen.tsx` | Show login form immediately instead of blocking on `authLoading` |
| `src/components/auth/SupabaseLoginScreen.tsx` | Same — show form immediately |
| `src/contexts/SecurityPolicyContext.tsx` | Only call `getClientIP()` when user is authenticated |

## Expected Impact

| Issue | Savings |
|-------|---------|
| Deduplicated `getClientIP()` | Eliminates 1 redundant external API call (~300-800ms) |
| No duplicate profile/roles fetch | Eliminates 2 redundant DB queries (~400-800ms) |
| Login form renders instantly | User sees form in < 200ms instead of 2-4s |
| Lazy IP fetch for SecurityPolicy | Saves ~300ms on public routes |
| Single `loadSessionPolicy()` | Eliminates 2 duplicate DB queries (~400-800ms) |

