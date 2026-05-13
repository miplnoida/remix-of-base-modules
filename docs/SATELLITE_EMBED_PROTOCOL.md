# Satellite Embed Protocol (host ↔ satellite)

This document defines the postMessage contract used between **SocialServe**
(host) and any embedded satellite micro-frontend:

- Integrated Compliance Hub  → mounted at `/compliance-hub/*`
- SocialServe-Internal Audit → mounted at `/audit-hub/*`

The same contract is mirrored verbatim in each satellite's repo as
`src/lib/embed/satelliteProtocol.ts`. Keep all three copies in sync.

## Envelope

```ts
{
  source: 'host' | 'satellite',
  app:    'compliance' | 'audit',
  v:      1,
  type:   string,
  payload?: unknown,
}
```

Both sides MUST verify `event.origin` against their allow-list before acting.

## Host → satellite

| Type            | Payload                                                                                                  | When |
|-----------------|----------------------------------------------------------------------------------------------------------|------|
| `INIT`          | `{ accessToken, refreshToken, user, roles, permissions, theme, language, tenant, initialPath }`           | Once after `READY` |
| `TOKEN_REFRESH` | `{ accessToken, refreshToken }`                                                                          | On every Supabase auth state change |
| `THEME_CHANGE`  | `{ theme: { key, isDark } }`                                                                             | On host theme toggle |
| `LANG_CHANGE`   | `{ language }`                                                                                           | On host language change |
| `NAVIGATE`      | `{ path }`                                                                                               | On host URL change inside the satellite base path |
| `LOGOUT_REQUEST`| `{}`                                                                                                     | On host logout |

## Satellite → host

| Type             | Payload                                       | When |
|------------------|-----------------------------------------------|------|
| `READY`          | `{ app, version? }`                           | Once mounted, before INIT is needed |
| `NAVIGATE`       | `{ path }`                                    | On every internal route change |
| `NOTIFY`         | `{ level, title?, message }`                  | When satellite wants host toast |
| `BREADCRUMB`     | `{ items: [{ label, href? }] }`               | Optional breadcrumb sync |
| `LOADING`        | `{ active }`                                  | Optional global loader sync |
| `LOGOUT`         | `{ reason? }`                                 | When satellite triggers logout |
| `SESSION_EXPIRED`| `{}`                                          | When satellite detects expiry |
| `ERROR`          | `{ message, stack? }`                         | On uncaught render error |

## Embed flag

The host appends to the iframe `src`:

```
?embed=1&theme=light|dark&themeKey=<key>&lang=<code>&initialPath=<path>
```

Each satellite reads `embed=1` and switches into its embedded shell:

- No own `AppSidebar` / `Header` / `LoginScreen` / `IPAccessGate`
- `MemoryRouter` instead of `BrowserRouter`
- Listens for `INIT`; calls `supabase.auth.setSession({ access_token, refresh_token })`
- Posts `READY` immediately on mount

## Standalone mode

If `embed=1` is absent the satellite renders its full standalone shell (login,
sidebar, header) for satellite-team development. The protocol code is dormant.
