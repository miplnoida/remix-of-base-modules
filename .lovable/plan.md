
Root cause summary

The current timeout is a symptom, not the cause. The most likely auth failure chain is:

```text
LoginScreen.submit
-> SupabaseAuthContext.login()
-> supabase.auth.signInWithPassword()
-> SIGNED_IN auth event fires
-> multiple auth listeners react
-> ThemeContext listener performs awaited Supabase query inside onAuthStateChange
-> auth event processing becomes unstable / delayed
-> isAuthenticated never settles in time
-> LoginScreen 10s safety timer fires
-> user stays on /login with "Sign-in is taking too long"
```

Confirmed problems in the codebase:
1. `src/contexts/ThemeContext.tsx` has `supabase.auth.onAuthStateChange(async (...) => { await supabase.from(...)... })`. Awaiting Supabase work inside auth listeners is a known bad pattern and matches the deadlock/race symptom.
2. Auth ownership is fragmented: `SupabaseAuthContext`, `ThemeContext`, `useUserCode`, `SystemLoggingProvider`, and `App.tsx` all subscribe to auth changes independently.
3. `src/lib/runtimeEnvironment.ts` incorrectly treats share preview URLs (`id-preview--...lovable.app`) as editor preview. That activates preview-only auth behavior in the wrong environment.
4. `LoginScreen.tsx` still has a UI-owned 10s kill switch that can surface a false failure while auth state is still resolving.
5. Session validation is too eager in places like visibility-change handling; a transient miss can cause logout instead of retry/refresh.

Implementation plan

1. Make `SupabaseAuthContext` the only auth event owner
- Keep one authoritative `getSession()` bootstrap + one `onAuthStateChange()` subscription in `src/contexts/SupabaseAuthContext.tsx`.
- Expose stable states:
  - `isSessionReady`
  - `isAuthenticated`
  - `isUserDataReady`
  - `authBootstrapStatus`
- Move all post-login hydration to fire-and-forget effects triggered from context state, never from awaited auth callbacks.

2. Remove awaited Supabase work from auth listeners
- Refactor `src/contexts/ThemeContext.tsx` so `onAuthStateChange` only updates local IDs/flags.
- Move theme preference loading into a separate effect that runs after `userId` changes.
- Audit and simplify other auth listeners in:
  - `src/hooks/useUserCode.ts`
  - `src/providers/SystemLoggingProvider.tsx`
  - `src/App.tsx`
- Any listener outside the auth context should be passive and non-blocking only.

3. Fix environment detection
- Correct `src/lib/runtimeEnvironment.ts` so only the actual editor iframe is treated as editor preview.
- Share Preview in its own tab must follow the normal authentication path.
- Keep preview limitations documented, but do not apply editor-only bypass logic to share preview.

4. Rebuild the login flow around real auth completion
- In `src/components/auth/LoginScreen.tsx`, stop using the 10s UI timer as the source of truth for login failure.
- The screen should react to:
  - explicit auth success from Supabase
  - explicit auth error from Supabase
  - explicit timeout only for auxiliary services, not for session state itself
- Keep redirect logic driven by `isAuthenticated`, then branch to change-password or MFA once profile flags are available.
- Do not reset the user back into a fake failed state if a valid session has already been created.

5. Move login prechecks and bootstrap reads to backend endpoints
- Replace browser-side profile lookups in the login path with backend endpoints/functions:
  - pre-login check: resolve auth email, account active, lockout state
  - post-login bootstrap: profile, roles, session policy, MFA/password-change flags
- This removes fragile direct table reads from the browser during auth-critical steps.
- Use role-based backend validation only; do not introduce new RLS work.

6. Harden session persistence and refresh behavior
- Keep the existing singleton client configuration in `src/integrations/supabase/client.ts`.
- In `SupabaseAuthContext`, ensure token refresh and visibility recovery do this order:
  - retry `getSession()`
  - if needed, try refresh
  - only then sign out
- Do not logout on a single transient `getSession()` miss during tab focus or slow network conditions.

7. Standardize authenticated query gating
- All protected data queries must use `enabled: isSessionReady && isAuthenticated`.
- Queries that need profile/roles must additionally wait for `isUserDataReady` or tolerate degraded state.
- This prevents false unauthorized states during initial restore and page refresh.

Files/modules to change

Frontend
- `src/contexts/SupabaseAuthContext.tsx`
- `src/components/auth/LoginScreen.tsx`
- `src/lib/runtimeEnvironment.ts`
- `src/contexts/ThemeContext.tsx`
- `src/hooks/useUserCode.ts`
- `src/providers/SystemLoggingProvider.tsx`
- `src/App.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/auth/PermissionProtectedRoute.tsx`

Backend endpoints/functions
- existing: `supabase/functions/resolve-auth-email/index.ts`
- add/refactor auth-focused endpoint(s) for login precheck and post-login bootstrap

Technical details

```text
Current unstable pattern:
signInWithPassword
-> auth callback A updates session
-> auth callback B awaits Supabase query
-> auth callback C also reacts
-> login screen timer expires before state converges

Target pattern:
getSession once
-> one auth owner updates session/user
-> passive listeners only set flags
-> separate effects fetch theme/profile/roles
-> login UI redirects on confirmed session
```

Testing and validation

1. Login scenarios
- valid credentials
- invalid credentials
- locked account
- deactivated account
- forced password change
- MFA-enabled account

2. Session stability scenarios
- page refresh after login
- navigation across protected modules
- tab hide/show
- token refresh cycle
- idle timeout warning
- long-running session

3. Environment scenarios
- editor preview: confirm clear limitation messaging only
- share preview: confirm successful login
- published app: confirm successful login

4. Failure scenarios
- slow network
- delayed auth response
- delayed bootstrap endpoint
- temporary backend error
- concurrent login attempts

Expected outcome

- Successful sign-in creates a stable session and redirects correctly.
- Share Preview and published URL use the proper auth flow.
- No valid login is cancelled by a frontend timer.
- Users are only redirected to `/login` when the session is truly absent, expired, or invalidated.
- Auth behavior becomes deterministic because one context owns session state and all other modules become passive consumers.
