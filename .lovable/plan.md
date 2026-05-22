## Plan to fix blank preview pages

1. **Restore a safe app-level loading boundary**
   - Replace the current route-level Suspense setup with a stable wrapper that always renders a visible fallback if any lazy page suspends.
   - This prevents React from rendering a blank root while lazy public pages or initial routes load.

2. **Keep protected navigation content-only**
   - Preserve the `ProtectedLayout` Suspense boundary around only the routed content area.
   - Avoid full-page/min-screen loaders inside protected child routes so the sidebar and header stay mounted after login.

3. **Fix internal sidebar navigation behavior**
   - Ensure internal menu clicks use React Router navigation instead of browser reloads.
   - Keep external/satellite links using the existing redirect behavior.

4. **Add route-level error visibility for lazy import failures**
   - Keep the global `ErrorBoundary` around the app and ensure route loading failures show the existing friendly error UI instead of a blank screen.

5. **Validate in preview**
   - Re-check `/` and a protected route in the sandbox.
   - Confirm the login page appears, menu clicks do not reload the whole shell, and console/dev-server logs have no route/render errors.

## Technical notes

- Primary files to update: `src/components/routing/AppRoutes.tsx`, possibly `src/components/layout/ProtectedLayout.tsx` and `src/components/sidebar/SidebarMenuLink.tsx` if their current changes need tightening.
- No database/backend changes are needed.
- The fix will not change authentication rules or route definitions beyond loading/error handling.