## Root cause found

There are two separate issues being perceived as “blank Preview pages”:

1. **The app is not truly blank anymore, but it can remain stuck on the generic `Loading…` screen.**
   - Browser inspection shows the editor sandbox eventually renders the login page.
   - During startup, the app still imports and evaluates the full `AppRoutes.tsx` file before `/login` can render.
   - `AppRoutes.tsx` contains ~2,000 lines and **743 lazy route declarations**, so even public routes like `/login` depend on a very large route module.

2. **The `id-preview--…lovable.app` URL is currently redirecting to Lovable’s auth bridge/login page, not your application.**
   - This is outside the app code path.
   - It explains why that specific share/static Preview URL may show a Lovable login or blank auth bridge.
   - The editor sandbox URL does load the app, but slowly/stuck behind app startup gates.

## Fix plan

### 1. Split public routes into a lightweight boot router
Create a small route boundary that handles public/auth routes immediately:

- `/login`
- `/forgot-password`
- `/reset-password`
- `/change-password`
- `/mfa-verify`
- `/setup`
- `/maintenance`
- `/unauthorized`
- `/inspector/login`
- `/public/api-docs`
- `/acknowledge-audit/:token`
- `/demo-login`

This prevents the login screen from waiting for the full protected module graph.

### 2. Move the large protected route table behind authentication
Keep the current large `AppRoutes.tsx` route table for protected app pages, but load it only after:

- auth bootstrap has completed, and
- the user is authenticated, or the current route is not a public route.

This means `/login` can paint quickly and reliably in Preview.

### 3. Add a route-loader timeout with a visible recovery message
Replace indefinite `Loading…` fallbacks with a fallback that changes after a short timeout, for example:

- initially: `Loading…`
- after timeout: `Still loading. Refresh Preview or open the published app.`

This makes future stuck states diagnosable instead of looking blank.

### 4. Add a hard timeout around initial auth session restore
`SupabaseAuthProvider` already handles errors, but `supabase.auth.getSession()` is awaited without a race timeout. If the preview/backend request hangs, protected routes can wait forever.

Add a small hard timeout for initial session restore so the app fails open to an unauthenticated-ready state and renders `/login`.

### 5. Validate the fix
After implementation:

- Open editor Preview `/` and confirm it redirects/renders `/login` without an indefinite spinner.
- Open `/login` directly and confirm the login form appears quickly.
- Check console/network for unresolved startup errors.
- Re-check the `id-preview--…lovable.app` URL and report clearly if it still goes to Lovable’s auth bridge, because that part is access/preview configuration rather than app code.