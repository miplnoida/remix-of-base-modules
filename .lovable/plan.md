## Problem
The app itself can render `/login`, but Preview intermittently appears blank because the first paint is delayed by a very large eager route/module graph and the preview dev server is also showing Vite connection/ping failures. When this happens, the user sees an empty root before the login screen has a chance to paint.

## Plan
1. **Add a visible boot fallback at the root**
   - Wrap `<App />` in `src/main.tsx` with React `Suspense` and a minimal full-screen loading UI.
   - This ensures Preview never shows an empty white page while app modules are loading.

2. **Lazy-load the route table instead of importing it eagerly**
   - Change `src/App.tsx` so `AppRoutes` is loaded with `React.lazy()`.
   - Keep the existing app providers intact, but defer the huge route graph until after the shell is mounted.

3. **Keep public login route lightweight**
   - Update `src/components/routing/AppRoutes.tsx` to keep `/login`, password reset, maintenance, unauthorized, and not-found routes available inside the same route boundary, with a stable semantic fallback.
   - Preserve all existing protected routes and authentication behavior.

4. **Make loading/error states user-visible**
   - Reuse the existing `ErrorBoundary` for import/runtime failures.
   - Ensure route loading fallback uses visible text/spinner instead of a blank screen.

5. **Validate after implementation**
   - Open `/login` and `/` in Preview.
   - Confirm the login screen appears, the app has a visible fallback during loading, and there are no blank-root states in console/network signals.

## Files to change
- `src/main.tsx`
- `src/App.tsx`
- `src/components/routing/AppRoutes.tsx`