## Plan

1. **Restore safe route loading boundaries**
   - Keep the application shell mounted for protected pages.
   - Add a local `<Suspense>` boundary around public lazy pages that are currently outside the protected layout, such as login/setup/password/inspector/public routes.
   - Keep protected content loading inside `ProtectedLayout`, so header/sidebar do not blank out during menu navigation.

2. **Fix left-menu navigation to avoid browser reloads**
   - Replace the sidebar’s anchor-based internal navigation with React Router navigation semantics.
   - Use a router link for internal URLs and keep normal external redirect behavior only for true external/satellite links.
   - This prevents full document navigation when users click left-side menu items.

3. **Remove full-screen loaders from protected content routes**
   - Replace remaining protected-route nested fallbacks using `min-h-screen` with content-only fallbacks where needed, especially DB diagram/audit routes.
   - This ensures only the content panel shows loading, not the full page shell.

4. **Validate the behavior**
   - Check the preview after the change.
   - Confirm public pages still load.
   - Confirm protected navigation keeps sidebar/header mounted and only swaps content.
   - Review console/network signals for page-load errors.