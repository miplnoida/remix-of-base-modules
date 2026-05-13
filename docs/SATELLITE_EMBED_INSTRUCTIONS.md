# Paste-in prompt for embedded satellite mode

Use this single prompt **inside each satellite project** to add embedded-mode
support. The SocialServe host already exposes the iframe + postMessage bridge
(`<SatelliteFrame />`) at `/compliance-hub/*` and `/audit-hub/*`.

The same prompt body works for both satellites — change only the `APP_ID` and
default redirect path noted at the top.

---

## Prompt to paste into the satellite project

> Implement embedded-mode support so this app can run inside the SocialServe
> host iframe without changing any standalone behavior, database, edge
> functions, or `src/integrations/supabase/*`.
>
> **APP_ID**:
> - Integrated Compliance Hub → `compliance`, default route
>   `/compliance/workbench/manager`
> - SocialServe-Internal Audit → `audit`, default route `/audit/dashboard`
>
> **1. Protocol module** — create `src/lib/embed/satelliteProtocol.ts` as an
> exact copy of the same file in the SocialServe host repo (envelope,
> message types, payload interfaces). Do not edit the contract.
>
> **2. Host bridge** — create `src/lib/embed/hostBridge.ts`:
> - `isEmbedded()` returns true when `?embed=1` is present OR
>   `window.self !== window.top`.
> - `getAllowedHostOrigins()` parses `VITE_HOST_ORIGIN` (CSV).
> - `useHostBridge()` React hook installs ONE `message` listener:
>   - Verifies `event.origin` against the allow-list.
>   - Verifies envelope `source==='host'`, `app===APP_ID`, `v===1`.
>   - On `INIT`: calls `supabase.auth.setSession({ access_token, refresh_token })`
>     ONCE, stores user/roles/permissions/theme/language/tenant in a context,
>     marks bridge ready. Never writes tokens to localStorage.
>   - On `TOKEN_REFRESH`: calls `setSession` again with new tokens.
>   - On `THEME_CHANGE`: updates ThemeContext directly (do NOT touch
>     localStorage when embedded).
>   - On `LANG_CHANGE`: updates i18n.
>   - On `NAVIGATE`: calls react-router `navigate(path)`.
>   - On `LOGOUT_REQUEST`: clears in-memory state and calls
>     `supabase.auth.signOut({ scope: 'local' })`.
> - `postToHost(type, payload)` sends an envelope with
>   `source:'satellite', app: APP_ID, v: 1`.
> - On mount the bridge posts `READY { app: APP_ID, version }` to
>   `window.parent` using `'*'` (host then locks origin in its allow-list).
>
> **3. Dual-mode shell** — modify `src/App.tsx`:
> - Read `isEmbedded()` once into an `EmbedModeProvider` context.
> - In **standalone mode**: render existing tree unchanged (BrowserRouter,
>   AppSidebar, Header, LoginScreen, IPAccessGate).
> - In **embedded mode**:
>   - No `AppSidebar`, no `Header`, no `LoginScreen`, no `IPAccessGate`.
>   - Use `MemoryRouter` (initialEntries set from `?initialPath=`, default to
>     APP_ID's default route).
>   - Mount `<HostBridgeBoot />` at the top of the tree to install the listener
>     and post `READY`.
>   - Wrap children in `<EmbedErrorBoundary />` (posts `ERROR` to host then
>     renders local fallback).
>   - Add `<RouterReporter />` that calls `useLocation` and posts
>     `NAVIGATE { path: location.pathname + location.search }` on every change.
>   - Add CSS rule `:root[data-embed="1"] body { background: transparent; }`
>     and set `document.documentElement.dataset.embed = '1'` on mount.
>
> **4. Auth context adapter** — in `SupabaseAuthContext` (or equivalent):
> - When `isEmbedded()`, skip the initial `getSession()` race and the
>   localStorage-driven login UI; mark `isAuthReady=false` until `INIT`
>   completes, then derive `user`/`roles` from the bridge payload AND from
>   the now-set Supabase session. Existing standalone path stays intact.
>
> **5. Theme adapter** — `ThemeProvider` in embedded mode:
> - Skip the localStorage read and the `loadPreference` query.
> - Subscribe to bridge `THEME_CHANGE` events to set `currentTheme` and
>   `isDark`. `setTheme`/`toggleDark` become no-ops (host owns theme).
>
> **6. Notifications & navigation helpers** — provide thin wrappers:
> - `notifyHost(level, message, title?)` → `postToHost('NOTIFY', ...)`.
> - `requestHostLogout()` → `postToHost('LOGOUT', { reason })`.
> - `reportSessionExpired()` → `postToHost('SESSION_EXPIRED')`.
> - On uncaught render error in `EmbedErrorBoundary` →
>   `postToHost('ERROR', { message, stack })`.
>
> **7. Single Supabase client guarantee** — confirm there is exactly one
>   `createClient` call in `src/integrations/supabase/client.ts` and that the
>   bridge imports the same singleton. Do not construct a second client.
>
> **8. Env vars** — read from Vite env:
> - `VITE_HOST_ORIGIN` — comma-separated allow-list of host origins
>   (e.g. `https://id-preview--<host>.lovable.app,https://admin.secureserve.biz`).
>
> **9. Documentation** — add `docs/EMBED_MODE.md` describing standalone vs
>   embedded behavior, env vars, and dev/test steps. Mirror the
>   `docs/SATELLITE_EMBED_PROTOCOL.md` from the host repo.
>
> **10. Verification** — manually test:
> 1. Open standalone URL → full sidebar/header/login as before.
> 2. Open `<URL>?embed=1` directly in a tab → no shell, just content,
>    posts READY (visible in console) but stays unauthenticated.
> 3. Open SocialServe host, navigate to the satellite menu → no second
>    login, content renders, theme matches host.
> 4. Toggle host theme → satellite restyles.
> 5. Click around inside satellite → host URL bar updates.
> 6. Refresh host on a deep link → satellite remounts at the same path.
> 7. Logout on host → satellite clears.
>
> **Out of scope:** DB changes, edge functions, `src/integrations/supabase/*`
> edits, `.env`, `supabase/config.toml`, Module Federation, replacing the
> iframe with Web Components.

---

## Host-side configuration

In SocialServe `.env` (or via secrets), set:

```
VITE_COMPLIANCE_HUB_URL=https://<compliance-hub>.lovable.app
VITE_COMPLIANCE_HUB_ORIGIN=https://<compliance-hub>.lovable.app
VITE_USE_COMPLIANCE_HUB_REMOTE=true

VITE_AUDIT_HUB_URL=https://<internal-audit>.lovable.app
VITE_AUDIT_HUB_ORIGIN=https://<internal-audit>.lovable.app
VITE_USE_AUDIT_HUB_REMOTE=true
```

When the flags are off the existing local `/compliance/*` and `/audit/*`
routes are used and the iframe routes are simply unreachable from the menu.
