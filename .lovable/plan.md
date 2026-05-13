
## Root cause

The DB-driven sidebar (`useDynamicNavigation`) prepends each module's `base_url` to its route. The two root modules are currently configured as:

| display_name | base_url | example child route | resulting menu URL |
|---|---|---|---|
| Internal Audit | `https://internalaudit.secureserve.biz` | `/audit/dashboard` | `https://internalaudit.secureserve.biz/audit/dashboard` |
| Compliance & Enforcement | `https://compliance.secureserve.biz` | `/compliance/workbench` | `https://compliance.secureserve.biz/compliance/workbench` |

Because the menu URLs are absolute external URLs, clicking them does a **top-level browser navigation** away from SocialServe to the satellite domain. That's why:

1. **Compliance** appears full-screen with no host sidebar/header — the user is now on `compliance.secureserve.biz` (the satellite's own standalone shell), not inside SocialServe.
2. **Internal Audit** shows only a "Loading…" message — same thing, but the satellite at `internalaudit.secureserve.biz` is still showing its own loading state (the embed/satellite shell isn't fully wired or auth isn't shared).

The `SatelliteFrame` route (`/compliance-hub/*`, `/audit-hub/*`) we added is correct and is wrapped in `ProtectedLayout` (sidebar + header), but **no menu link ever points to it** because the static `complianceMenuItems` / `auditMenuItems` files we updated aren't imported by anything — the real sidebar is built from DB rows.

## Fix

Two coordinated changes — one DB, one code — so DB-driven menu clicks land on the in-app `SatelliteFrame` host route instead of leaving the app.

### 1. DB migration — clear `base_url` on the two satellite root modules

```sql
update public.app_modules
   set base_url = null
 where id in (
   '014f0c8f-7388-4bf9-9de0-28d122b6d3bf', -- Internal Audit
   'ca000000-0000-0000-0000-000000000001'  -- Compliance & Enforcement
 );
```

This stops `useDynamicNavigation` from producing absolute external URLs. After this, child menu URLs become plain local paths like `/audit/dashboard` and `/compliance/workbench`.

### 2. Code — rewrite local prefixes to satellite-host prefixes when remote enabled

Edit `src/hooks/useDynamicNavigation.ts` `buildMenuItem()` so that, after computing `menuItem.url`, it rewrites:

- `/compliance` → `/compliance-hub` when `isComplianceRemoteEnabled()` is true
- `/audit` → `/audit-hub`        when `isAuditRemoteEnabled()`     is true

Use the same `swapPrefix` helper logic from `src/lib/embed/satelliteRouting.ts` (export it, or import the existing `applyComplianceRemoteRouting` / `applyAuditRemoteRouting` and apply them to the final `rootModules.map(buildMenuItem…)` output — simplest).

After this:
- Click "Compliance Dashboard" → URL `/compliance-hub/dashboard` → `<ProtectedLayout><SatelliteFrame app="compliance" …/></ProtectedLayout>` renders → host sidebar + header stay visible, satellite content loads in iframe.
- Click "Audit Dashboard" → URL `/audit-hub/dashboard` → same for audit.

To toggle either satellite off later, set `SATELLITE_CONFIG.compliance.enabled` / `.audit.enabled` to `false` in `src/config/satellites.ts` — the rewrite is skipped and clicks go to the existing local pages.

### 3. Sanity check after the fix

- Reload the host preview, click any Compliance and any Audit menu item.
- Confirm host sidebar + header remain visible and the iframe area shows the satellite content (or its standalone shell if the satellite isn't yet running the embed shell — that's the satellite team's follow-up).
- The "Loading…" state should now come from inside the iframe, not from a hard browser redirect.

## Out of scope (do not touch)

- `src/integrations/supabase/client.ts`, `types.ts`, `.env`, `supabase/config.toml`.
- The unused static menu files (`complianceMenuItems.ts`, `auditMenuItems.ts`) — left alone; they remain dormant.
- Any auth / RLS / edge-function changes.
- Satellite repos — the host fix is independent of any satellite-side update.
