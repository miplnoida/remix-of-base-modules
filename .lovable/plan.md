## Plan

1. **Move the lazy-loading boundary inside the content area**
   - Remove the top-level `<Suspense fallback={routeFallback}>` that currently wraps the entire `<Routes>` tree.
   - This top-level fallback can replace the whole app shell with `<div className="min-h-screen bg-background" />` whenever a clicked route is still lazy-loading, which looks like the sidebar/header/content all reload.

2. **Keep Sidebar/Header mounted while only routed content suspends**
   - Update `ProtectedLayout` so its `<Outlet />` is wrapped in a local `<Suspense>` inside `AppLayout`.
   - Use a content-only loading fallback, not `min-h-screen`, so only the main content section shows loading while Sidebar/Header remain visible and mounted.
   - Preserve backward compatibility for any existing `<ProtectedLayout>{children}</ProtectedLayout>` usage.

3. **Remove or avoid full-screen route fallbacks inside protected routes**
   - Replace protected-route nested fallbacks like `Loading...` or `min-h-screen` where they affect normal menu navigation, especially audit/db routes.
   - Keep public/inspector-specific behavior unchanged unless it is outside the protected layout.

4. **Fix sidebar submenu identity instability**
   - Change submenu keys from `subItem.title` to a stable unique key using `id || url || title`.
   - This addresses the duplicate key warning (`Compliance (STK)`) and prevents React from dropping/recreating sidebar items unexpectedly during route changes.

## Expected result

- Clicking left menu items no longer blanks/rebuilds the whole application shell.
- Sidebar, expanded menu state, collapse state, and header stay mounted.
- Only the content panel changes or shows a content-level loader while the next page loads.
- Existing public routes, login routes, inspector routes, and satellite fallback behavior remain unchanged.