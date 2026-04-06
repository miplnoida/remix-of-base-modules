

## Plan: Fix Continuous Loading on Login and Error Logs Screens

### Root Cause Analysis

**Issue 1: Login stuck in loading state**

The Turnstile flow has a critical race condition. When the user clicks "Sign In" on the published URL:

1. `handleSubmit` sets `isLoading=true` and `pendingSubmit=true`, then calls `executeTurnstile()`
2. The `useEffect` on line 62 watches for `turnstileToken` or `turnstileError` to call `performLogin`
3. **Problem**: The Turnstile `execute()` function has a 100ms delay before calling the actual execute, plus a 3s safety timeout. But the `useEffect` dependency array is `[turnstileToken, turnstileError, pendingSubmit]` — it does NOT include `performLogin`. This means `performLogin` is a stale closure that may reference old `email`/`password` state
4. **Bigger problem**: If Turnstile's `error-callback` fires (setting `turnstileError` to a string), the `useEffect` catches it and calls `performLogin(null)`. But if `turnstileError` was already set from a previous attempt (e.g., timeout set it to `'turnstile-unavailable'`), the effect won't re-fire because the value hasn't changed. The login stays stuck in `isLoading=true` forever
5. Additionally, in the published URL path (`social-wellspring-app.lovable.app`), `isLovableEditorPreview()` returns `false` (it's not in an iframe, not localhost, not lovableproject.com), so Turnstile IS active. If the Turnstile widget fails to render or execute properly, the 3s timeout fires setting `error` to `'turnstile-unavailable'` — but if that error value is already set from a previous cycle, no state change occurs, no effect fires, and the UI hangs

**Issue 2: Error Logs continuously loading**

The `ErrorLogs` page query has no `enabled` gate on authentication readiness. The query fires immediately on mount. Since this page is behind `ProtectedRoute` (which waits for `isAuthReady`), the query should work. However:

1. The query uses `select('*', { count: 'exact' })` on 1274 rows — the `count: 'exact'` forces a full table scan
2. If the Supabase client's auth token isn't attached yet when the query fires (race between `onAuthStateChange` restoring the session and React Query executing), the query may fail silently or return empty results
3. The query has no error display — if it throws, `isLoading` stays true forever because `useQuery` enters error state but the UI only checks `isLoading`, not `isError`

### Fix Strategy

#### Step 1: Fix LoginScreen Turnstile race condition
**File**: `src/components/auth/LoginScreen.tsx`

- Remove the `pendingSubmit` state + `useEffect` pattern entirely — it's inherently racy
- Instead, use a simple approach: after calling `executeTurnstile()`, set a 3.5s timeout that force-calls `performLogin(null)` if Turnstile hasn't responded
- Add a ref to track whether `performLogin` has already been called to prevent double-invocation
- Add a global safety timeout: if `isLoading` has been true for more than 10s, force-reset it to false and show an error

#### Step 2: Fix Turnstile error value reuse
**File**: `src/hooks/useTurnstile.ts`

- In the `execute()` function, always reset `error` to `null` before starting (already done on line 160) — but ensure the timeout sets a unique error value each time (append timestamp) so the `useEffect` always detects the change
- **Better approach**: Since we're removing the `useEffect` pattern in Step 1, this becomes unnecessary

#### Step 3: Fix Error Logs loading state
**File**: `src/pages/system-logs/ErrorLogs.tsx`

- Add `isError` and `error` to the destructured `useQuery` return
- Show an error state in the UI when query fails (instead of infinite spinner)
- Add `enabled: !!supabase` guard (always true but future-proof)
- Add `staleTime` and `retry` config to prevent excessive refetching

### Files to Modify

| File | Change |
|------|--------|
| `src/components/auth/LoginScreen.tsx` | Replace `pendingSubmit` + `useEffect` pattern with direct callback approach; add safety timeout to prevent infinite loading |
| `src/pages/system-logs/ErrorLogs.tsx` | Add error state handling to prevent infinite spinner; show error message when query fails |

### Expected Result
- Login completes within 4s worst-case (3s Turnstile timeout + 1s auth call), never hangs indefinitely
- Error Logs shows data or an error message — never stays in infinite loading
- Both screens have maximum wait thresholds with forced fallback UI states

