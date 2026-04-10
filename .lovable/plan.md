

# Cross-App Auth Sharing + Sidebar URL Mapping

## Overview

Three deliverables to enable this project as a central shell for satellite Lovable apps:

1. **Database: Add `base_url` column to `app_modules`** — allows each top-level module to point to an external app host
2. **Sidebar: Cross-app navigation** — `SidebarMenuLink` detects external URLs and uses `window.location.href` instead of React Router
3. **Documentation: Shared auth setup guide** — a markdown file with step-by-step instructions for connecting satellite projects

---

## Technical Details

### 1. Database Migration

Add an optional `base_url` column to `app_modules`:

```sql
ALTER TABLE public.app_modules
  ADD COLUMN IF NOT EXISTS base_url text DEFAULT NULL;

COMMENT ON COLUMN public.app_modules.base_url IS
  'External host URL for cross-app modules (e.g. https://other-app.lovable.app). NULL = local route.';
```

When set on a parent module, all its child routes will be prefixed with this URL. Example: if "Internal Audit" has `base_url = 'https://audit-app.lovable.app'`, then a child with `route = '/audit/dashboard'` resolves to `https://audit-app.lovable.app/audit/dashboard`.

### 2. Sidebar Navigation Changes

**File: `src/hooks/useDynamicNavigation.ts`**
- Extend `ModuleRow` interface to include `base_url: string | null`
- In `buildMenuTree`, propagate `base_url` from parent to children
- Add `base_url` prefix to `menuItem.url` when present (producing full external URLs like `https://audit-app.lovable.app/audit/dashboard`)

**File: `src/components/sidebar/SidebarMenuLink.tsx`**
- Detect if `item.url` starts with `http://` or `https://`
- If external: use `window.location.href = item.url` (same tab, preserves auth cookie) instead of `navigate()`
- If local: keep existing React Router navigation

**File: `src/components/sidebar/SidebarMenuGroup.tsx`**
- Update `isAnyChildActive` to skip external URLs when matching against `currentPath`

### 3. Shared Auth Documentation

**File: `docs/SHARED_AUTH_SETUP.md`**

A step-by-step guide for satellite projects covering:
- Copy the Supabase URL and anon key into the satellite project's env
- Copy `src/integrations/supabase/client.ts` pattern (same credentials)
- Copy `src/contexts/SupabaseAuthContext.tsx` and supporting files
- Copy `src/components/auth/ProtectedRoute.tsx`
- Copy sidebar components + `useDynamicNavigation` hook (menus come from the shared DB)
- Note: same-origin cookies ensure session sharing works automatically since all apps use the same Supabase auth endpoint

---

## Summary of Changes

| Item | Type | Purpose |
|---|---|---|
| `app_modules.base_url` column | Migration | Store external host URL per module |
| `useDynamicNavigation.ts` | Edit | Propagate `base_url` into menu URLs |
| `SidebarMenuLink.tsx` | Edit | External vs local navigation logic |
| `SidebarMenuGroup.tsx` | Edit | Skip external URLs in active-child check |
| `docs/SHARED_AUTH_SETUP.md` | New file | Integration guide for satellite projects |

