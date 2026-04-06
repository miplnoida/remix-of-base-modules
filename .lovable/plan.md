
Goal: permanently remove indefinite loading by fixing the actual choke point first, then standardizing all data screens to use timeout-safe backend endpoints.

What I found

1. The main regression is still the auth bootstrap gate, not just individual pages.
- `src/components/auth/ProtectedRoute.tsx` blocks every protected screen until `isAuthReady === true`.
- `src/contexts/SupabaseAuthContext.tsx` only sets `isAuthReady` after session restore plus profile/roles/policy loading completes.
- The session replay for `/system-logs/errors` shows the app stuck on the route-level spinner, which means the page itself is often never reached.
- This explains why the issue appears “across multiple screens”: all `ProtectedLayout` routes are vulnerable.

2. The March 31 behavior was simpler and safer.
- Earlier flow effectively unlocked the app once auth session was known.
- Current flow added a second readiness gate, so any slow/hung profile, roles, or policy request can freeze the whole protected app.

3. The previous Error Logs fix was only local.
- `src/pages/system-logs/ErrorLogs.tsx` now has better query error handling.
- But it still sits behind `ProtectedRoute`, so if auth bootstrap stalls, the page never renders.
- Also, sibling system-log pages still use spinner-only queries with no error/timeout exit:
  - `TechnicalLogs.tsx`
  - `SecurityLogs.tsx`
  - `BusinessEvents.tsx`
  - `IntegrationLogs.tsx`
  - `WorkflowLogs.tsx`
  - `LoginSecurityLogs.tsx`
  - `UnauthorizedAccessLogs.tsx`
  - `IPBlocksManagement.tsx`

4. The system logs module still has a second class of performance issues.
- Most pages call client-side table queries directly.
- Many use `select('*', { count: 'exact' })` on large log tables, which is expensive.
- Most do not expose `isError`, timeout fallback, or degraded UI.
- So even after auth is fixed, several log screens can still appear stuck under slow/failing responses.

5. Login is still fragmented.
- The login flow spans:
  - `LoginScreen.tsx`
  - `useTurnstile.ts`
  - `turnstileService.ts`
  - `SupabaseAuthContext.tsx`
- There are multiple loading owners: local login loading, Turnstile timing, auth context bootstrap, and redirect logic.
- It is improved, but still too distributed to guarantee a clean exit in every failure mode.

Design approach

Use a two-layer stabilization strategy:

```text
Layer 1: unblock the app shell
session known -> route allowed
profile/roles/policy -> load in background with degraded fallback

Layer 2: make every data screen endpoint-driven and timeout-safe
request start -> success | empty | error | timeout
never spinner forever
```

Implementation plan

1. Redesign auth readiness into two separate states
Files:
- `src/contexts/SupabaseAuthContext.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/auth/LoginScreen.tsx`

Changes:
- Split current auth lifecycle into:
  - `isSessionReady`: session restore finished
  - `isUserDataReady`: profile/roles/policy fetch finished
- Protected routes should gate on session readiness, not on full profile hydration.
- If user is authenticated, allow route entry once session is known; keep profile/roles loading in the background.
- Add a hard timeout for bootstrap fetches so auth can enter a degraded-but-usable state instead of blocking forever.
- Keep login redirect driven by authenticated session, not by slow profile loading.

Expected result:
- Protected screens stop hanging behind the global auth spinner.
- `/system-logs/errors` and other protected routes can render even if profile/policy fetch is slow.

2. Replace direct client-side database reads in auth-critical flows with backend endpoints
Files/modules to refactor:
- `src/contexts/SupabaseAuthContext.tsx`
- `src/components/auth/LoginScreen.tsx`
- new backend endpoints/functions/RPCs

Changes:
- Move pre-login checks into a backend endpoint:
  - resolve login email
  - lockout status
  - account active status
- Move post-login bootstrap into a single backend endpoint:
  - profile
  - roles
  - session policy
  - optional lightweight permissions summary
- Remove client-side direct reads like `profiles` / `user_roles` from the login/bootstrap path.

Security model:
- Use backend endpoints with role validation only, matching the project rule to avoid RLS-based design.
- Do not rely on direct browser queries for auth bootstrap.

Expected result:
- Fewer round trips
- No fragmented auth state
- No client-side table dependency during login

3. Standardize a global endpoint client so no screen can spin forever
Files:
- shared API utility/hook layer
- system logs pages
- auth-related fetchers

Changes:
- Introduce one shared request contract for all backend calls:
  - `{ ok, data, error, timedOut }`
- Add default timeout handling and normalized error mapping.
- Ensure every screen has four explicit UI states:
  - loading
  - success
  - empty
  - error/timeout
- Prevent infinite loaders by forcing timeout exit and showing retry UI.

Expected result:
- No page remains in indefinite loading because of an unresolved promise.

4. Rebuild the System Logs screens on backend endpoints instead of direct table reads
Impacted screens:
- `/system-logs/errors`
- `/system-logs/technical`
- `/system-logs/business`
- `/system-logs/security`
- `/system-logs/integration`
- `/system-logs/workflow`
- `/system-logs/login-security`
- nested unauthorized/IP block tabs

Changes:
- Create paginated backend endpoints for each log category, or one unified logs endpoint with typed categories.
- Move filtering, pagination, and counting server-side.
- Replace client `select('*', { count: 'exact' })` patterns with backend-controlled pagination/count strategy.
- Add error state + retry state to every log screen, not just Error Logs.
- Ensure tabs like Security Logs do not fire hidden queries unnecessarily.

Expected result:
- Logs pages become stable under slow networks and large datasets.
- Admin monitoring pages stop looking “stuck” when a query fails or slows down.

5. Optimize the underlying log and auth queries
Backend/database work:
- Verify and add indexes where missing for high-volume filters:
  - log table timestamp columns
  - severity/status columns
  - user_id/user_email fields used in filters
  - `profiles.email`
  - `user_roles.user_id`
- Avoid exact full-count scans where not needed.
- Return lightweight page metadata from backend endpoints.
- Combine bootstrap fetches into one backend call instead of separate client queries.

Expected result:
- Faster first render
- Lower database load
- Better consistency under production traffic

6. Clean up remaining blocking/background patterns
Files to review during implementation:
- `src/hooks/useCloudflareConfig.ts`
- `src/services/turnstileService.ts`
- `src/providers/SystemLoggingProvider.tsx`
- any screen with spinner-only query rendering

Changes:
- Add timeout-safe wrappers for non-critical edge function calls.
- Keep technical/security logging fire-and-forget only.
- Ensure optional background checks never block route rendering or form completion.

Testing plan

1. Auth scenarios
- valid login
- invalid credentials
- locked account
- slow auth response
- Turnstile unavailable
- profile/roles/policy endpoint slow or failing

2. Protected route scenarios
- direct navigation to `/system-logs/errors`
- refresh on protected pages
- expired session
- token refresh
- degraded bootstrap mode

3. System logs scenarios
- empty dataset
- large dataset
- slow backend response
- backend error
- timeout
- filter changes + pagination

4. Cross-screen verification
- dashboard/menu
- system logs pages
- C3/IP/Employer protected pages
- confirm no route remains on the ProtectedRoute spinner indefinitely

Technical detail

Confirmed root-cause chain:

```text
Current:
auth.getSession()
 -> fetchProfile + fetchRoles + loadSessionPolicy
 -> setIsAuthReady(true)
 -> ProtectedRoute allows page

If any middle step is slow/hangs:
 -> ProtectedRoute spinner stays forever
 -> all protected screens appear broken
```

Target behavior:

```text
Target:
auth.getSession()
 -> setIsSessionReady(true)
 -> if authenticated, allow protected route
 -> fetch profile/roles/policy in background
 -> if slow/fails, mark degraded and show fallback UI, not app-wide spinner
```

Recommended delivery order

Phase 1
- fix auth bootstrap and ProtectedRoute
- unify login completion state

Phase 2
- move auth/bootstrap reads to backend endpoints
- add global request wrapper

Phase 3
- migrate all system log pages to endpoint-driven fetching
- add consistent error/timeout UI

Phase 4
- query/index tuning
- regression testing across protected modules

Expected outcome

- Login always exits loading state with either success, explicit error, or timeout fallback
- Protected pages no longer depend on slow profile/role hydration to render
- `/system-logs/errors` and sibling admin log pages stop hanging
- Endpoint behavior becomes consistent across the app
- The app returns to March 31-level responsiveness, but with stronger failure handling and a cleaner architecture
