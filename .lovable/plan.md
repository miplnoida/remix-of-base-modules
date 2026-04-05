

## Plan: Fix Infinite Loading State in Preview Mode

### Root Cause Analysis

The application gets stuck on "Loading..." indefinitely due to **three distinct failure modes** in the authentication initialization flow (`SupabaseAuthContext.tsx`):

**Bug 1 — Missing `.catch()` on `Promise.all` in `onAuthStateChange` (line 403)**
When a user logs in, the `onAuthStateChange` handler fires and calls `Promise.all([fetchProfile(), fetchRoles()])`. This chain has `.then()` but **no `.catch()`**. If either query fails (network timeout, RLS issue, table error), `setIsLoading(false)` is never called, and the UI stays on "Loading..." forever.

**Bug 2 — No loading timeout / fallback**
There is no maximum wait time for the loading state. If any initialization promise hangs (e.g., `supabase.auth.getSession()` is slow, or `loadSessionPolicy()` query blocks), the user sees "Loading..." indefinitely with no way to recover.

**Bug 3 — ProtectedRoute provides no feedback on extended loading**
The `ProtectedRoute` component (line 18-26) shows a bare "Loading..." text with no spinner, no timeout message, and no retry mechanism. If auth initialization fails silently, users have no indication of what went wrong or what to do next.

### Implementation

#### 1. Fix `SupabaseAuthContext.tsx` — Add error handling and loading timeout

**a) Add `.catch()` to the `Promise.all` in `onAuthStateChange` (line 403)**
```typescript
Promise.all([fetchProfile(userId), fetchRoles(userId)])
  .then(([profileData, rolesData]) => {
    setProfile(profileData);
    setRoles(rolesData);
    setIsLoading(false);
  })
  .catch((err) => {
    console.error('Failed to load user data after auth change:', err);
    setIsLoading(false); // Always unblock the UI
  });
```

**b) Add a safety timeout in `initializeAuth`**
If `getSession()` or `Promise.all` hangs for more than 15 seconds, force `isLoading` to `false` so the UI isn't stuck forever. Use a `setTimeout` that gets cleared on successful completion.

**c) Wrap `loadSessionPolicy` query failures gracefully**
The `loadSessionPolicy` already has try/catch, but ensure the `password_policies` and `system_settings` queries have individual timeouts via `AbortController` or `.catch()` to prevent hanging on slow DB responses.

#### 2. Improve `ProtectedRoute.tsx` — Add spinner and timeout UX

Replace the bare "Loading..." text with:
- A proper spinner component (Loader2 from lucide-react)
- A timeout message after 10 seconds: "Taking longer than expected..."
- After 20 seconds: show a "Retry" button and a "Go to Login" link so users aren't permanently stuck

#### 3. Add resilient error boundaries to provider chain

In `App.tsx`, the deeply nested provider tree means one failed provider blocks everything below it. Add `.catch()` guards inside `SystemSettingsProvider`, `SecurityPolicyProvider`, and `PIIMaskingProvider` queries to ensure they never block rendering if their data fetch fails. These already use `useQuery` (which handles errors), but verify `staleTime` and `retry` configs don't cause excessive re-fetches on failure.

### Files Modified

| File | Change |
|------|--------|
| `src/contexts/SupabaseAuthContext.tsx` | Add `.catch()` to Promise.all, add 15s loading timeout in initializeAuth |
| `src/components/auth/ProtectedRoute.tsx` | Add spinner, timeout message, and retry/login fallback |

### Technical Notes
- No database migrations needed
- No new dependencies — uses existing `Loader2` icon
- Backward compatible — only adds error recovery paths
- Follows existing "shielded error" pattern from project conventions
