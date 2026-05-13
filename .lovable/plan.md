## Goal

Make SocialServe (host) embed two satellites — **Integrated Compliance Hub** and **SocialServe-Internal Audit** — inside its existing AppLayout. Header, sidebar, theme, and session stay owned by the host. Each satellite renders only its page content via iframe + postMessage bridge.

Same pattern applied twice. One reusable host component, one reusable embed kit per satellite.

---

## Architecture

```text
SocialServe (host)
┌──────────────────────────────────────────────┐
│ AppLayout (Header + Sidebar)                 │
│  └ <main>                                    │
│      ├ /compliance-hub/*  → <SatelliteFrame  │
│      │                       app="compliance"│
│      │                       src=HUB_URL/>   │
│      └ /audit-hub/*       → <SatelliteFrame  │
│                              app="audit"     │
│                              src=AUDIT_URL/> │
└──────────────────────────────────────────────┘
         │ iframe + postMessage (per app)
         ▼                          ▼
  Compliance Hub (embed=1)    Internal Audit (embed=1)
  no Sidebar/Header           no Sidebar/Header
  MemoryRouter                MemoryRouter
  hostBridge listener         hostBridge listener
```

---

## 1. Host changes (SocialServe) — minimal, reusable

**One reusable component:** `src/components/integrations/SatelliteFrame.tsx`
- Props: `app: 'compliance' | 'audit'`, `srcEnvVar`, `basePath`, `title`.
- Resolves URL from `import.meta.env[srcEnvVar]`.
- Renders full-height iframe inside an `<ErrorBoundary>` with a "Module unavailable" fallback panel.
- 15s readiness timeout → shows controlled fallback.
- Hook `useSatelliteBridge(iframeRef, app)`:
  - Posts `INIT { accessToken, refreshToken, user, roles, permissions, theme, language, tenant }` on `READY`.
  - Re-posts `TOKEN_REFRESH` on `supabase.auth.onAuthStateChange`.
  - Re-posts `THEME_CHANGE`, `LANG_CHANGE` on context changes.
  - Listens for `NAVIGATE` from satellite → `history.replaceState` to `/{basePath}${path}`.
  - Listens for `LOGOUT`, `SESSION_EXPIRED` → host's existing logout flow.
  - Listens for `NOTIFY` → forwards to host `sonner` toaster.
  - Listens for `LOADING`, `BREADCRUMB`, `ERROR` → optional UI sync.
  - Origin-locked allow-list per `VITE_*_HUB_ORIGIN`.

**Two new routes** in `src/components/routing/AppRoutes.tsx`:
```
<Route path="/compliance-hub/*" element={
  <ProtectedLayout>
    <SatelliteFrame app="compliance" srcEnvVar="VITE_COMPLIANCE_HUB_URL" basePath="compliance-hub" title="Compliance & Enforcement" />
  </ProtectedLayout>
} />
<Route path="/audit-hub/*" element={
  <ProtectedLayout>
    <SatelliteFrame app="audit" srcEnvVar="VITE_AUDIT_HUB_URL" basePath="audit-hub" title="Internal Audit" />
  </ProtectedLayout>
} />
```

**Menu updates:**
- `src/components/sidebar/menuItems/complianceMenuItems.ts` — point Compliance entries at `/compliance-hub/...` (behind `VITE_USE_COMPLIANCE_HUB_REMOTE` flag; local `/compliance/*` retained as fallback).
- `src/components/sidebar/menuItems/auditMenuItems.ts` — point Audit entries at `/audit-hub/...` (behind `VITE_USE_AUDIT_HUB_REMOTE` flag; local `/audit/*` retained as fallback).

**No DB, no auth, no edge function changes.** No edits to `src/integrations/supabase/*`, generated types, `supabase/config.toml`.

---

## 2. Satellite changes (same pattern in BOTH satellites)

Apply identically to **Integrated Compliance Hub** and **SocialServe-Internal Audit**.

### 2a. Dual-mode shell

`src/App.tsx` reads `?embed=1` (or `window.self !== window.top`) into an `EmbedModeProvider`:

- **Standalone mode** (unchanged): full sidebar, header, login, IP gate. Used by satellite dev teams.
- **Embedded mode**: stripped shell:
  - No `AppSidebar`, no `Header`, no `IPAccessGate`, no `LoginScreen`.
  - `BrowserRouter` swapped for `MemoryRouter` (or `HashRouter`) so iframe URL doesn't fight the host URL bar.
  - Default redirects: Compliance → `/compliance/workbench/manager`; Audit → `/audit/dashboard`.
  - Body classes neutralized (transparent background) so host container is the visible frame.

### 2b. Reusable embed kit

New module `src/lib/embed/hostBridge.ts` (identical contract in both repos):
- `useHostBridge()` — singleton listener for `INIT`, `TOKEN_REFRESH`, `THEME_CHANGE`, `LANG_CHANGE`, `NAVIGATE`, `LOGOUT_REQUEST`.
- On `INIT`: calls `supabase.auth.setSession({ access_token, refresh_token })` once, signals ready. In-memory only — no localStorage write.
- `postToHost(type, payload)` for `READY`, `NAVIGATE`, `NOTIFY`, `LOGOUT`, `SESSION_EXPIRED`, `ERROR`, `BREADCRUMB`, `LOADING`.
- Origin-locked to `VITE_HOST_ORIGIN` allow-list.
- `<RouterReporter />` posts `NAVIGATE { path }` on every location change.
- `<EmbedErrorBoundary />` posts `ERROR` and renders local fallback.

`SupabaseAuthContext` adapter: when `embedMode === true`, skip own login UI; wait for `INIT` instead of running fresh `getSession()`.

### 2c. Single Supabase client guarantee

Each satellite already has one client in `src/integrations/supabase/client.ts`. Bridge uses that singleton — no second client constructed. Auth state mutations all go through it.

### 2d. Theme

`ThemeProvider` in embedded mode subscribes to `THEME_CHANGE` from host instead of localStorage. Add `:root[data-embed="1"] body { background: transparent; }`.

---

## 3. postMessage protocol (shared contract, identical for both satellites)

Documented in all three repos as `docs/SATELLITE_EMBED_PROTOCOL.md`:

| Direction | Type | Payload |
|---|---|---|
| host→sat | `INIT` | `{ accessToken, refreshToken, user, roles, permissions, theme, language, tenant }` |
| host→sat | `TOKEN_REFRESH` | `{ accessToken, refreshToken }` |
| host→sat | `THEME_CHANGE` | `{ theme }` |
| host→sat | `LANG_CHANGE` | `{ language }` |
| host→sat | `NAVIGATE` | `{ path }` |
| host→sat | `LOGOUT_REQUEST` | `{}` |
| sat→host | `READY` | `{ app, version }` |
| sat→host | `NAVIGATE` | `{ path }` |
| sat→host | `NOTIFY` | `{ level, title, message }` |
| sat→host | `BREADCRUMB` | `{ items }` |
| sat→host | `LOADING` | `{ active }` |
| sat→host | `LOGOUT` | `{ reason }` |
| sat→host | `SESSION_EXPIRED` | `{}` |
| sat→host | `ERROR` | `{ message, stack? }` |

Envelope: `{ source: 'satellite', app: 'compliance' | 'audit', v: 1, type, payload }`. Origin verification mandatory both sides.

---

## 4. Configuration

Host (SocialServe):
- `VITE_COMPLIANCE_HUB_URL`, `VITE_COMPLIANCE_HUB_ORIGIN`
- `VITE_AUDIT_HUB_URL`, `VITE_AUDIT_HUB_ORIGIN`
- Feature flags: `VITE_USE_COMPLIANCE_HUB_REMOTE`, `VITE_USE_AUDIT_HUB_REMOTE`

Each satellite:
- `VITE_HOST_ORIGIN` (CSV allow-list)

All env-driven; no rebuild to switch dev/staging/prod URLs.

---

## 5. Test scenarios (run for each satellite)

1. Host login → click satellite menu → no second login; satellite content renders inside `<main>`; host header/sidebar visible.
2. Theme toggle on host → satellite restyles via `THEME_CHANGE`.
3. Browser refresh on `/compliance-hub/cases/123` and `/audit-hub/audit-plans` → host re-renders frame, posts `INIT` + `NAVIGATE`, satellite mounts that route.
4. Browser back/forward across deep links works.
5. Host logout → both satellites end session.
6. Satellite session expiry → `SESSION_EXPIRED` → host logout flow.
7. Kill satellite URL → host shows controlled "unavailable" panel; rest of host works.
8. Switch host → another module → iframe unmounts cleanly; no memory leak.
9. Standalone satellite URL still loads with full sidebar/header/login for dev teams.
10. Role-based menu filtering on host respected; satellite respects permissions sent in `INIT`.

---

## 6. Documentation deliverables

- `docs/SATELLITE_EMBED_PROTOCOL.md` (host + both satellites) — message contract.
- `docs/SATELLITE_HOST_INTEGRATION.md` (host) — adding a new satellite using `<SatelliteFrame />`.
- `docs/EMBED_MODE.md` (each satellite) — embed vs standalone behavior, dev/test instructions.
- Memory updates: extend `mem://architecture/multi-project-interoperability` with iframe + postMessage embed pattern and the reusable `<SatelliteFrame />` host component.

---

## Guardrails

- No database changes. No edge function changes. No edits to any `src/integrations/supabase/client.ts` or generated types in any of the three projects.
- Standalone mode of each satellite preserved bit-for-bit; embedded mode is purely additive.
- Host changes limited to: one reusable component, two new routes, two menu URL swaps behind feature flags, env vars. No layout, auth, or provider edits.
- Iframe is host↔satellite boundary only; not used inside any satellite.

---

## Out of scope (future)

- Vite Module Federation (invasive build config in three apps).
- Adding a third satellite — same `<SatelliteFrame />` pattern; documented in host integration guide.
- Replacing iframe with Web Components / Shadow DOM.
