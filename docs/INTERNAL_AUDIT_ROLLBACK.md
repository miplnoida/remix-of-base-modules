# Internal Audit — Host vs Satellite Switch (Operator Runbook)

This document describes the **only** supported way to move the Internal Audit
module between the host application (`SocialServe`, project `455cbbae-…`) and
the satellite application (`SocialServe-Internal Audit`, project `7e98fc6b-…`).

**No code in the host application needs to change.** The switch is a single
column on a single row in the `app_modules` table.

---

## Contract

| `app_modules.base_url` value | Sidebar behaviour | Page renders from |
| --- | --- | --- |
| `NULL` or `''` | `useNavigate('/audit/...')` | Host (`SocialServe`) — existing components |
| `https://internalaudit.secureserve.biz` | `navigateToSatellite(...)` → `/auth/exchange?code=…` | Satellite (`SocialServe-Internal Audit`) |

This is enforced by code that already exists in the host:

- `src/hooks/useDynamicNavigation.ts` — only prepends `base_url` when truthy.
- `src/components/sidebar/SidebarMenuLink.tsx` — branches on `http(s)://`.

Therefore the host needs **zero edits** to honour either mode.

---

## Default state (host serves Internal Audit)

To make Internal Audit behave exactly as it always has — host layout, host
sidebar, host header, host components, host auth — clear the `base_url`:

```sql
update public.app_modules
set    base_url = null
where  name = 'internal_audit';
```

After the next page load, every `/audit/*` route is served by the host's
existing `AppRoutes` inside `ProtectedLayout`. No SSO redirect occurs.

---

## Migrate the entire Internal Audit module to the satellite

Only do this once the satellite has parity for **every** `/audit/*` page that
users currently reach from the sidebar.

```sql
update public.app_modules
set    base_url = 'https://internalaudit.secureserve.biz'
where  name = 'internal_audit';
```

The host sidebar will then mint a one-time SSO code and redirect each click
to the satellite's `/auth/exchange` endpoint.

---

## Migrate one route at a time (recommended)

`useDynamicNavigation` inherits `base_url` from a parent module **only when
the child has none**. That gives per-route control with no host code changes.

```text
app_modules
└── internal_audit                       base_url = NULL
    ├── audit_dashboard                  base_url = NULL                                          → host
    ├── audit_audits                     base_url = 'https://internalaudit.secureserve.biz'      → satellite
    └── audit_reports                    base_url = NULL                                          → host
```

Per-route migration procedure:

1. Build the page in the satellite at the **same path** (e.g. `/audit/audits`).
2. Verify by signing in to the host and using the sidebar with the override
   set on a non-prod environment first.
3. Production cut-over for that one route:

   ```sql
   update public.app_modules
   set    base_url = 'https://internalaudit.secureserve.biz'
   where  name = 'audit_audits';   -- replace with the actual child module name
   ```

4. Instant rollback for that one route:

   ```sql
   update public.app_modules
   set    base_url = null
   where  name = 'audit_audits';
   ```

All other audit routes are unaffected by either step.

---

## Outage / maintenance handling

If the satellite is unavailable, set `base_url = null` on the affected module
row(s). The host immediately resumes serving its own components for those
routes. No deploy, no code change, no cache flush is required — only a page
refresh in the user's browser.

---

## Things that intentionally do **not** change in the host

To keep this contract trivially safe, the host project will not be modified
to support this switch. Specifically, none of the following will be edited as
part of any host/satellite migration step:

- `src/components/sidebar/SidebarMenuLink.tsx`
- `src/components/sidebar/SidebarMenuGroup.tsx`
- `src/hooks/useDynamicNavigation.ts`
- `src/components/routing/AppRoutes.tsx`
- `src/lib/satelliteSso.ts`
- Any page or service under `src/pages/audit/*` or `src/services/audit*`

If a future change requires editing any of the above, treat it as a separate
proposal — not part of the satellite migration.
