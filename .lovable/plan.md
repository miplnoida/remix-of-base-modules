# Fix: Sidebar and Header remount on every navigation

## Problem

Currently every protected route in `src/components/routing/AppRoutes.tsx` is wired like:

```tsx
<Route path="/c3-management/dashboard" element={<ProtectedLayout><C3Dashboard /></ProtectedLayout>} />
<Route path="/c3-management/manage"    element={<ProtectedLayout><C3Management /></ProtectedLayout>} />
...
```

There are ~765 routes each wrapping their own `<ProtectedLayout>` (which renders `ProtectedRoute` → `AppLayout` → `SidebarProvider` + `AppSidebar` + `Header` + page).

Because each route's `element` is a **new React element tree**, React Router treats the layout as a different component instance on every navigation. Result: on every menu click, `SidebarProvider`, `AppSidebar`, `Header`, `TooltipProvider`, and `DeveloperInfoFAB` all unmount and remount. The user perceives this as the "whole page" reloading (sidebar collapses/flashes, header re-renders, scroll resets, sidebar state and queries re-fetched), even though it is a SPA navigation.

The standard React Router v6 fix is a single **parent layout route** that renders `ProtectedLayout` once with an `<Outlet />`, and children that render only the page.

## Fix

### 1. `src/components/layout/ProtectedLayout.tsx`
Add support for using as a layout route via `<Outlet />` while keeping the existing `children` prop for backward compatibility (so we don't have to touch unrelated callers).

```tsx
import { Outlet } from 'react-router-dom';
...
export const ProtectedLayout = ({ children }: { children?: ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>
      {children ?? <Outlet />}
    </AppLayout>
  </ProtectedRoute>
);
```

### 2. `src/components/routing/AppRoutes.tsx`
Group all `<Route path="..." element={<ProtectedLayout><X/></ProtectedLayout>} />` entries under a single parent layout route:

```tsx
<Route element={<ProtectedLayout />}>
  <Route path="/" element={<Index />} />
  <Route path="/c3-management/dashboard" element={<C3Dashboard />} />
  <Route path="/c3-management/manage"    element={<C3Management />} />
  ...
  {/* all other protected routes */}
</Route>
```

This way `ProtectedLayout` (and therefore `SidebarProvider`, `AppSidebar`, `Header`) mounts **once** and only the `<Outlet />` content swaps on navigation. Only the content area re-renders — sidebar + header stay mounted, preserving state, scroll, open submenus, and the sidebar collapsed/expanded cookie state.

### Special cases inside that file

- `/compliance-hub/*` and `/audit-hub/*` use a conditional `isXRemoteEnabled() ? <ProtectedLayout>...</ProtectedLayout> : <Navigate .../>`. Convert these to live under the same parent layout route, and use a small inline component that returns `<SatelliteFrame/>` or `<Navigate/>`. The `<Navigate/>` branch must stay inside the layout group so the redirect itself doesn't try to render outside the layout (Navigate renders no DOM, so this is safe).
- `/inspector/*` already uses its own `InspectorLayout` layout-route pattern — leave untouched.
- Public routes (`/login`, `/setup`, `/forgot-password`, `/reset-password`, `/change-password`, `/mfa-verify`, `/inspector/login`, `/public/api-docs`, `/acknowledge-audit/:token`, `/demo-login`) stay outside the parent layout route.
- The `NotFound` catch-all (`path="*"`) should also remain outside the layout (404 page typically has its own chrome) — verify by reading the bottom of the file and keep current behavior.

### 3. No other files change
- `AppLayout.tsx`, `AppSidebar`, `Header`, `SidebarMenuLink`, satellite routing helpers, auth context, and all page components stay untouched.
- No DB, RLS, business-logic, or styling changes.

## Verification

1. Navigate between several sidebar items (e.g. `/c3-management/dashboard` → `/employers-management/manage` → `/c3-management/manage`). Sidebar should NOT flash/collapse/re-animate; only the main content area swaps.
2. Open a sidebar submenu, then navigate to a sibling — the submenu stays open.
3. Toggle sidebar collapse, navigate — collapsed state persists without re-reading the cookie.
4. `/audit-hub/*` and `/compliance-hub/*` still redirect to local `/audit` / `/compliance` when `base_url` is blank (existing behavior preserved).
5. `/login` and other public routes still render without sidebar/header.
6. Browser back/forward still works; React Query caches no longer get torn down on every route change.

## Risk / scope

- Single mechanical refactor of one file (~765 route lines re-grouped under one parent `<Route>`).
- Backward-compatible `ProtectedLayout` change (still accepts `children`) means nothing else in the codebase breaks.
- No behavioral change for unauthenticated users — `ProtectedRoute` still guards the whole group.
