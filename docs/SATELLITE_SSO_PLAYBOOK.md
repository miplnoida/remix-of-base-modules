# Satellite SSO Integration Playbook

This is the **single source of truth** for wiring a new satellite Lovable project to the SocialServe shared backend with working Single Sign-On. Follow it top to bottom; do not skip steps. The previous integrations failed because parts were done out of order or with custom variations of the exchange page.

---

## Architecture

```text
SocialServe (admin.secureserve.biz)                  Satellite (e.g. compliance.secureserve.biz)
  user clicks sidebar tile                              receives /auth/exchange?code=XXX
        │                                                       │
        ▼                                                       ▼
  navigateToSatellite()  ──► auth-issue-exchange-code     auth-redeem-exchange-code
                                  (returns 1-use code)         (returns access+refresh tokens)
                                                                │
                                                                ▼
                                                       supabase.auth.setSession(...)
                                                                │
                                                                ▼
                                                       window.location.replace(redirect_path)
```

Tokens travel inside JSON over TLS, never in the URL. The code is single-use, 60 s TTL, UA-bound.

---

## The 10 failure modes (read once, then refer back)

| # | Failure | Detected by | Fix |
|---|---------|-------------|-----|
| 1 | Satellite on a different Supabase project | `.env` mismatch | Step 1 |
| 2 | Satellite host not in `SATELLITE_HOSTS` | sidebar tile reloads SocialServe instead of redirecting | Step 2 |
| 3 | App id missing in `ALLOWED_APPS` (issue or redeem) | `auth-sso-healthcheck` returns `unknown_app` | Step 3 |
| 4 | Satellite origin not in `ALLOWED_ORIGINS` | browser CORS error on redeem | Step 4 |
| 5 | `/auth/exchange` route missing | satellite shows 404 then login | Step 5 |
| 6 | `/auth/exchange` does not call `setSession` | redeem call succeeds but satellite still shows login | Step 5 (use template) |
| 7 | `/auth/exchange` uses `navigate()` instead of hard reload | brief flash of authed UI then bounce to login | Step 5 (use template) |
| 8 | `/auth/exchange` is wrapped in `<ProtectedRoute>` | bounces to /login before redeem runs | Step 5 |
| 9 | Satellite has custom `client.ts` storageKey | session written but providers can't read it | Step 6 |
| 10 | Magic-link mint fails (email unconfirmed) | redeem returns `session_mint_failed` | Confirm user's email in backend |

---

## Per-satellite checklist

Use this verbatim. Tick every box before declaring SSO done.

```text
[ ] 1. .env on satellite matches docs/satellite-templates/satellite-env.example exactly.
[ ] 2. SATELLITE_HOSTS in src/lib/satelliteSso.ts (this repo) maps:
       <custom-domain>     -> <app_id>
       <preview-host>      -> <app_id>
[ ] 3. ALLOWED_APPS in BOTH supabase/functions/auth-issue-exchange-code/index.ts
       AND supabase/functions/auth-redeem-exchange-code/index.ts contains <app_id>.
       AND ALLOWED_APPS in supabase/functions/auth-sso-healthcheck/index.ts contains it.
[ ] 4. ALLOWED_ORIGINS_RAW in supabase/functions/_shared/sso-cookies.ts contains
       https://<custom-domain> AND https://<preview-host>.
[ ] 5. Redeploy auth-issue-exchange-code, auth-redeem-exchange-code, auth-sso-healthcheck.
[ ] 6. On the satellite project:
       a. src/pages/auth/Exchange.tsx is COPIED VERBATIM from
          docs/satellite-templates/Exchange.tsx (this repo).
       b. App.tsx route order matches docs/satellite-templates/satellite-app-shell.tsx:
          /auth/exchange is registered before the catch-all and OUTSIDE <ProtectedRoute>.
       c. src/integrations/supabase/client.ts is the Lovable-Cloud-generated file
          (do NOT hand-edit; do NOT set a custom storageKey).
[ ] 7. Run scripts/sso-diagnose.md from the satellite browser tab. Both calls
       must return the expected shape.
[ ] 8. End-to-end smoke test:
       - Direct login on satellite -> lands on /<app>/workbench, reload still authed.
       - SocialServe sidebar tile -> satellite already authed.
       - Logout in SocialServe -> satellite blocked on next request.
```

---

## Currently-registered satellites

| App id          | Custom domain                | Preview host                                                    |
|-----------------|------------------------------|-----------------------------------------------------------------|
| internal_audit  | internalaudit.secureserve.biz | id-preview--7e98fc6b-f149-4e9f-9fd2-cbef90aba410.lovable.app    |
| compliance      | compliance.secureserve.biz    | id-preview--8471f73c-7659-4260-8d4d-c70dfbebe261.lovable.app    |

When adding a new satellite, append a row above and update steps 2–5.

---

## Why the Compliance satellite kept failing

The previous attempts only adjusted CORS in this repo. The satellite project's own `Exchange.tsx` was either missing, did not call `supabase.auth.setSession`, or used React Router `navigate` instead of `window.location.replace`. When the satellite re-mounted the app via SPA navigation, `SupabaseAuthContext`'s in-memory state was still `null` and `ProtectedRoute` immediately bounced the user back to `/login` — even though the session was sitting in localStorage.

The fix is non-negotiable: the satellite MUST use `docs/satellite-templates/Exchange.tsx` verbatim.

---

## Diagnostics

See `scripts/sso-diagnose.md`. Two console snippets, one decision table — under 60 seconds to localize the failure.
