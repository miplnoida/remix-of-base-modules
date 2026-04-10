# Shared Auth & Navigation Setup for Satellite Projects

This guide explains how to connect a new Lovable project (satellite app) to the central SSB Portal backend so it shares the same authentication, user roles, and sidebar navigation.

---

## 1. Prerequisites

- The satellite project must be a Lovable project (React + Vite + TypeScript).
- You need the shared backend credentials (see below).

## 2. Environment Variables

Add these to the satellite project's `.env` (or configure via Lovable Cloud settings):

```env
VITE_SUPABASE_URL=https://xynceskeiiisiefqlgxo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bmNlc2tlaWlpc2llZnFsZ3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTQxMDAsImV4cCI6MjA4ODczMDEwMH0.kVVysArl8ujrAHpHLtNx7xifYyq02ulIE5c4WKKSXCI
```

> These point to the same backend used by the central SSB Portal.

## 3. Supabase Client

Create `src/integrations/supabase/client.ts` in the satellite project:

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

## 4. Authentication Context

Copy these files from the central project into the satellite project:

| Source file | Purpose |
|---|---|
| `src/contexts/SupabaseAuthContext.tsx` | Session management, profile loading, role checks |
| `src/components/auth/ProtectedRoute.tsx` | Route guard that redirects unauthenticated users |
| `src/components/auth/LoginScreen.tsx` | Login form (optional — users may already be logged in) |

### Session sharing

Because both apps use the same Supabase URL, they share the same `localStorage` auth token domain when published under the same parent domain. If the user is already logged into the central portal, the satellite app will pick up the existing session automatically.

> **Cross-domain note:** If the satellite app is on a completely different domain, the user will need to log in once in each domain. The same credentials work because they share the same user database.

## 5. Sidebar Navigation (Optional)

To show the same dynamic sidebar in the satellite app:

1. Copy `src/hooks/useDynamicNavigation.ts` and its icon map.
2. Copy `src/components/sidebar/` directory.
3. The sidebar reads from the shared `app_modules` table via the `get_user_accessible_modules` RPC.

### Cross-app routing

The `app_modules` table has a `base_url` column. When a parent module has `base_url` set (e.g., `https://audit-app.lovable.app`), all its child routes automatically resolve to full external URLs. The sidebar handles this by using `window.location.href` for external links instead of React Router.

## 6. Database Modules Setup

To make the satellite app's routes appear in the central sidebar, insert its modules into `app_modules` with `base_url` pointing to the satellite's published URL:

```sql
-- Example: register a satellite module
UPDATE app_modules
SET base_url = 'https://audit-app.lovable.app'
WHERE name = 'internal_audit';
```

All child modules under this parent will automatically get their routes prefixed with the base URL.

## 7. Role-Based Access

The satellite app inherits the same role and permission system:

- `user_roles` table defines user roles
- `role_permissions` table controls module access
- `get_user_accessible_modules` RPC filters navigation by role
- `has_permission` / `can_access_module` RPCs for programmatic checks

No additional role setup is needed — the satellite app queries the same tables.

---

## Summary

| What | How |
|---|---|
| Same users & sessions | Shared Supabase URL + anon key |
| Same roles & permissions | Shared `user_roles` / `role_permissions` tables |
| Unified sidebar | Shared `app_modules` table with `base_url` for cross-app links |
| Cross-app navigation | `SidebarMenuLink` uses `window.location.href` for external URLs |
