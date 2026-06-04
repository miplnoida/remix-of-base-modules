## Problem

Clicking a leaf submenu item in the sidebar triggers a full browser reload instead of a client-side route change. Symptoms in the preview confirm this: after each click the auth provider re-runs (`[Auth] getSession() timed out — proceeding as unauthenticated` repeats on every navigation, which only happens on a fresh app boot).

## Root cause

The dynamic (DB-driven) sidebar renders leaf items through `src/components/sidebar/SidebarMenuLink.tsx`. That component does **not** use react-router-dom's `Link`. Instead it renders:

```tsx
<a href={item.url} onClick={handleInternalClick}>...</a>
```

where `handleInternalClick` is:

```ts
if (e.defaultPrevented) return;   // <-- bail-out
if (e.button !== 0) return;
if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
e.preventDefault();
navigate(item.url);
```

The `<a>` sits inside `SidebarMenuButton asChild` (Radix `Slot`) and, when collapsed, additionally inside `TooltipTrigger asChild`. Radix composes click handlers along that chain. Whenever any ancestor handler (Tooltip open/close, Sheet close on mobile, Slot prop-merge edge cases) marks the event with `defaultPrevented`, the `if (e.defaultPrevented) return;` guard fires, `navigate()` is **never called**, and the browser then follows the `<a href>` → full page reload, which re-mounts the whole app (explaining the repeated auth re-initialisation in the logs).

The sibling component `SidebarGroupMenu.tsx` already uses `<Link to=…>` for its leaves and does not exhibit the problem, which confirms the diagnosis.

## Fix

Replace the manual anchor + `useNavigate` pattern in `SidebarMenuLink` with react-router-dom's `<Link to=…>` for internal URLs. `Link` always performs SPA navigation, ignores modifier/middle-click correctly out of the box, and is immune to ancestor `preventDefault` quirks. Keep the existing external/satellite handling for absolute URLs.

### Files to change

1. **`src/components/sidebar/SidebarMenuLink.tsx`**
   - Import `Link` from `react-router-dom`; remove `useNavigate` and `handleInternalClick`.
   - For internal `item.url`, render `<Link to={item.url} className={linkClass}>{inner}</Link>` inside `SidebarMenuButton asChild`.
   - Keep the external branch (`isExternal`) as-is, including `navigateToSatellite` handling and `onClick` with `preventDefault`.
   - Preserve all existing class names, active styling, tooltip-when-collapsed behaviour, and the `description` tooltip.

No other files need changes. `SidebarGroupMenu.tsx` already uses `Link` for its own leaves and is unaffected.

## Verification

1. From `/compliance/violations`, click any sidebar leaf (e.g. Person 360, BN Product Catalog, Compliance submenus). The URL should change and the page should swap **without** a full reload.
2. Console should no longer print `[Auth] getSession() timed out` on every sidebar click (auth provider stays mounted).
3. Ctrl/Cmd/middle-click on a leaf should still open in a new tab (native `<Link>` behaviour).
4. External / satellite links continue to work (still routed through `navigateToSatellite`).
5. Active highlighting and the collapsed-state tooltip still render correctly.
6. TypeScript build passes.

## Out of scope

- No changes to permissions, routing config, or menu data.
- No changes to `SidebarGroupMenu` leaf rendering (already correct).
- No changes to the auth timeout warning itself — it will simply stop firing on every click once SPA navigation is restored.
