## Constraint (locked)

> The main application (`SocialServe`) MUST NOT change. If `app_modules.base_url` for `internal_audit` is set to `NULL` or empty, every existing `/audit/*` route MUST continue to work exactly as it does today — same layout, same sidebar, same header, same components, same auth.

All work in this plan is **additive on the satellite side** plus **one data-only flag** on the host. Zero edits to host UI, routing, layout, guards, services, or sidebar code.

## Why no host code changes are needed

The current host already behaves correctly under both conditions:

```text
app_modules.base_url = 'https://internalaudit.secureserve.biz'
  └─ useDynamicNavigation builds absolute URLs
     └─ SidebarMenuLink sees http(s):// → navigateToSatellite() (SSO redirect)

app_modules.base_url = NULL or ''
  └─ useDynamicNavigation builds relative paths '/audit/...'
     └─ SidebarMenuLink sees relative URL → useNavigate()
        └─ existing AppRoutes render existing host components inside ProtectedLayout
```

Verified in code:
- `src/hooks/useDynamicNavigation.ts:175-186` — `effectiveBaseUrl = module.base_url || parentBaseUrl || null`; only prepends when truthy.
- `src/components/sidebar/SidebarMenuLink.tsx:21-30` — branches on `startsWith('http')`.
- `src/components/routing/AppRoutes.tsx` — 35 `/audit/*` routes already mounted under `ProtectedLayout`.

So the rollback story for the host is literally: set `base_url = NULL` and reload. Nothing else.

## What this plan delivers

1. **Satellite becomes the place where new audit work happens**, without touching the host.
2. **A documented switch** to flip a route between "host renders" and "satellite renders" without code edits.
3. **A safety net**: if the satellite is down/maintenance, the host keeps working because nothing in the host depends on it.

## Plan

### A. Host (data-only, no code edits)

A single migration to make the switch declarative and per-module-root:

```sql
-- Already-present column on app_modules: base_url text null
-- No schema change. Plan only documents the operational contract:
--   base_url IS NULL or ''  →  host renders /audit/* (current behaviour)
--   base_url = 'https://internalaudit.secureserve.biz'
--                          →  sidebar issues SSO and redirects to satellite
```

That's it on the host. We will:

- **Not** edit `SidebarMenuLink.tsx`.
- **Not** edit `SidebarMenuGroup.tsx`.
- **Not** edit `useDynamicNavigation.ts`.
- **Not** edit `AppRoutes.tsx`.
- **Not** edit `satelliteSso.ts`.
- **Not** edit any `/audit/*` page or service.

A short doc `docs/INTERNAL_AUDIT_ROLLBACK.md` will record the one-line SQL to flip back:

```sql
update public.app_modules set base_url = null where name = 'internal_audit';
```

and the inverse:

```sql
update public.app_modules
set base_url = 'https://internalaudit.secureserve.biz'
where name = 'internal_audit';
```

### B. Satellite (this is where the actual work goes)

All future audit features are built in project `7e98fc6b-…` ("SocialServe-Internal Audit"). The host is frozen for audit work.

1. **Mirror the route surface.** Re-create the same `/audit/*` paths in the satellite's React Router so deep links work after SSO. Start with the routes the org wants to migrate first; others stay served by the host until their satellite version is ready.
2. **Reuse the shared backend.** Both projects already point at the same Supabase project (`xynceskeiiisiefqlgxo`). The satellite imports the auto-generated client from `@/integrations/supabase/client` and queries the same tables. No data duplication, no cross-project API calls.
3. **Fix the SSO landing once.** Patch `src/pages/auth/AuthExchange.tsx` in the satellite to:
   - accept both `?code=` and legacy `?sso_code=`,
   - call `setSession`, then poll `getSession` until persisted,
   - then `navigate(redirect_path, { replace: true })`.
4. **Permissions.** Reuse the same `user_roles` / permission helpers via the shared DB. No second permission model.
5. **Audit trail.** Mutations from the satellite hit the same `system_audit_trail` because they go through the same Supabase project.

### C. Operating model — per-route migration without host edits

Because the host's switch is the single `base_url` column on the **root** `internal_audit` module, today the granularity is "all audit routes go to satellite, or none". To migrate route-by-route without ever touching host code, we use the existing `app_modules` tree:

```text
app_modules
└── internal_audit                base_url = NULL  (default: host serves)
    ├── audit_dashboard           base_url = NULL  → host
    ├── audit_audits              base_url = 'https://internalaudit.secureserve.biz'  → satellite
    └── audit_reports             base_url = NULL  → host
```

`useDynamicNavigation` already inherits `base_url` from parent only when the child has none, so setting `base_url` on a **specific child module** routes only that menu entry (and its sub-tree) to the satellite, while everything else under `internal_audit` keeps rendering in the host. No code change required — this is just how the existing inheritance rule works.

Migration pattern per route:

```text
1. Build the page in the satellite, mounted at the same path.
2. Smoke-test by navigating to the satellite URL directly (after SSO).
3. Set base_url on that child app_modules row → host sidebar starts SSO-routing it.
4. If anything goes wrong, clear base_url on that row → host serves it again immediately.
```

### D. Validation

```text
1. With base_url cleared on internal_audit:
   - sidebar item "Internal Audit > Dashboard" → href /audit/dashboard
   - click → useNavigate() → existing host AuditDashboard renders inside ProtectedLayout
   - regression: identical to today.

2. With base_url set on a single child (e.g. audit_audits):
   - that one item → absolute https URL → SSO exchange → satellite /audit/audits
   - all other audit items → still host.

3. Satellite outage simulation (block the host name in DevTools):
   - host items unaffected.
   - SSO-routed items show browser-level failure on click; clearing base_url restores them.
```

### E. Files touched

Host (`455cbbae-…`):

- `docs/INTERNAL_AUDIT_ROLLBACK.md` — one-page operator runbook (the two SQL statements above plus the per-child override pattern).
- No source changes. No migrations. No edge function changes.

Satellite (`7e98fc6b-…`, separate task once approved):

- `src/pages/auth/AuthExchange.tsx` — accept `code`/`sso_code`, await session persistence, replace-navigate.
- New pages under `src/pages/audit/*` mirroring host paths, one per route as it is migrated.
- Router entries for those paths.

### F. Explicitly out of scope

- No remote-module / federation runtime in the host.
- No new edge function called from the host on every page render.
- No iframe.
- No changes to `SidebarMenuLink`, `SidebarMenuGroup`, `useDynamicNavigation`, `AppRoutes`, `ProtectedLayout`, or any audit page in the host.
- No data migration on `app_modules` schema.
