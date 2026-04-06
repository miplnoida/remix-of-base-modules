
Plan: Stabilize intermittent loading across menu, C3, IP, Employer, and similar screens

What is actually happening

This is an application-level auth/state regression, not a Lovable platform issue.

The repo currently has two different auth systems running at the same time:

1. Real auth: `src/contexts/SupabaseAuthContext.tsx`
2. Legacy mock auth: `src/contexts/AuthContext.tsx`

`src/App.tsx` mounts both providers together. After login, protected routing uses the real auth context, but many pages/hooks still read the legacy mock context or use incomplete query gating.

Why it only fails sometimes

The app is now in a mixed state:
- Newer code waits for `isAuthReady`
- Older code still assumes `isAuthenticated` or `user?.id` is enough
- Some screens still read `useAuth()` from the mock provider, which has no real logged-in user after Supabase login

That makes loading timing-dependent:

```text
Login succeeds
→ ProtectedRoute allows entry using Supabase auth
→ Some screens/hooks wait correctly for isAuthReady
→ Other screens/hooks start too early or read the wrong auth context
→ Depending on timing, they either work, return empty/error, or stay loading
```

Exact code responsible

1. Dual auth providers
- `src/App.tsx`
  - mounts both `SupabaseAuthProvider` and legacy `AuthProvider`

2. Legacy/mock auth still active
- `src/contexts/AuthContext.tsx`
  - mock users only
  - not connected to real backend auth

3. New auth contract introduced
- `src/contexts/SupabaseAuthContext.tsx`
  - adds `isAuthReady`, bootstrap states, async profile/roles loading

4. Menu uses new contract correctly
- `src/hooks/useDynamicNavigation.ts`
  - gated by `isAuthReady && isAuthenticated && !!user?.id`

5. Other shared auth hooks still use old/incomplete contract
- `src/hooks/useNavigationMenu.ts`
  - uses only `isAuthenticated` / `!!user?.id`, not `isAuthReady`
- `src/hooks/useWorkflowActions.ts`
  - mixes `useSupabaseAuth()` with fallback `useAuth()`

6. Operational pages still partially depend on legacy auth
- `src/pages/ip-registration/IPRegistrationList.tsx`
  - mixes `useAuth()` and `useSupabaseAuth()`
- `src/pages/employer-registration/EmployerRegistrationList.tsx`
  - still uses `useAuth()` for current user actions
- many other files found via search still import `useAuth()` in protected modules

Why this started in the last 1–2 days

The recent auth bootstrap refactor introduced `isAuthReady` and made some modules wait for a fully restored session. That change itself is correct.

The regression happened because the migration was partial:
- some modules were updated to the new auth lifecycle
- many others were left on the old lifecycle (`useAuth`, `isAuthenticated`, or `!!user?.id` only)

That widened the race window and exposed screens that now load before auth bootstrap is fully complete.

Fix strategy

Step 1: Choose one auth source for protected app code
- Treat `SupabaseAuthContext` as the only runtime auth source
- Stop using `AuthContext` in protected business modules

Step 2: Remove mixed auth usage from shared hooks first
Priority files:
- `src/hooks/useNavigationMenu.ts`
- `src/hooks/useWorkflowActions.ts`
- any shared permission/admin hooks still depending on `useAuth`

Step 3: Standardize all auth-dependent fetching
Apply one rule everywhere:
- React Query: `enabled: isAuthReady && isAuthenticated && ...`
- `useEffect` fetches: early-return until `isAuthReady && isAuthenticated`

Step 4: Migrate operational screens off legacy auth
Priority examples already visible:
- `src/pages/ip-registration/IPRegistrationList.tsx`
- `src/pages/employer-registration/EmployerRegistrationList.tsx`
- remaining IP/Employer/C3/workflow pages that still import `useAuth()`

Step 5: Keep the recent page gates
The recent `isAuthReady` gates added to menu/IP/Employer/C3 should stay. They are not the bug; they exposed the real inconsistency.

Code cleanup to remove

Remove or isolate these from protected runtime flows:
- legacy `AuthContext` usage in protected app pages/hooks
- fallback role/user logic that reads from mock auth when Supabase auth should be authoritative
- shared hooks that gate only on `isAuthenticated` or `!!user?.id` but not `isAuthReady`

Technical implementation approach

```text
Bad pattern:
useAuth()
enabled: isAuthenticated
enabled: !!user?.id

Correct pattern:
const { user, isAuthenticated, isAuthReady, profile } = useSupabaseAuth()
enabled: isAuthReady && isAuthenticated && !!user?.id
```

Expected result after cleanup

- Menu loads consistently after login
- C3/IP/Employer screens stop randomly hanging
- No more “works sometimes” behavior based on timing
- Retry/skeleton fallbacks become true error states instead of auth-race symptoms
