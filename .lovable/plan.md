# Plan: Independent Internal Audit Project with Secure Shared SSO

## Goals

1. Move the entire Internal Audit module out of **SocialServe** into the standalone **SocialServe-Internal Audit** project.
2. Both apps share the same Lovable Cloud backend (project ref `xynceskeiiisiefqlgxo`) — no data duplication.
3. **SocialServe is not modified** in user-visible behavior. Its sidebar still shows the Internal Audit menu, but the menu links jump to the satellite app.
4. **Single sign-on via secure cookies**: a user logged into SocialServe is automatically authenticated in SocialServe-Internal Audit with no second login, and the session token is **never exposed** in URLs, `localStorage`, browser storage that JS can read on either app's origin, or any client-readable place.

---

## Security model (this is the core of the request)

### Threat model addressed
- Token theft via XSS (cannot read cookie because it's `HttpOnly`).
- Token leakage via URL/referrer/history (no token ever placed in URL).
- Token interception in transit (`Secure` + HTTPS only).
- CSRF on the satellite (`SameSite=None` cookies require strict CSRF defenses → we use a short-lived **single-use exchange code** + double-submit CSRF token).
- Replay (exchange code is one-time-use, ≤ 60 s TTL, bound to user agent + IP hash).
- Privilege escalation (satellite re-validates roles server-side on every protected call; never trusts client claims).

### Authentication flow

```text
[User] -- logged in -->  SocialServe (admin.secureserve.biz)
   |
   | clicks "Internal Audit" menu item
   v
SocialServe browser:
   1. Calls edge function `auth-issue-exchange-code`
      - Requires valid Supabase session JWT in Authorization header
      - Returns: { code: <opaque 32-byte random>, expires_at }
      - Stores code server-side in table `auth_exchange_codes`
        (hashed, single-use, TTL 60s, bound to user_id + UA hash + IP hash)
   2. Browser redirects to:
        https://audit.secureserve.biz/auth/exchange?code=<opaque-code>
      - Code is opaque, single-use, short-lived → safe even if logged
      - NO JWT, refresh token, or PII in URL
   v
Audit satellite app:
   3. /auth/exchange page calls edge function `auth-redeem-exchange-code`
      with: { code }, plus a CSRF token (cookie + header double-submit)
   4. Edge function:
      - Validates code (single-use, not expired, UA/IP match)
      - Marks code consumed
      - Issues a fresh Supabase session for the same user
        via `supabase.auth.admin.generateLink` or
        `signInWithIdToken` pattern (server-side only)
      - Sets the session as a SECURE COOKIE on
        .secureserve.biz domain:
           HttpOnly; Secure; SameSite=Lax; Path=/;
           Max-Age=<idle timeout>; Domain=.secureserve.biz
      - Returns 200 + sets cookie; body contains no token
   5. Audit app reads session via `supabase.auth.getSession()`
      which is rehydrated from the cookie by a small
      `cookieStorageAdapter` configured on the supabase client.
   6. /auth/exchange redirects to original target route.
```

### Why cookies (not localStorage)
- `localStorage` is JS-readable → vulnerable to XSS exfiltration.
- `HttpOnly` cookies cannot be read by any script on either origin.
- `Secure` flag forbids transmission over HTTP.
- `SameSite=Lax` is sufficient because both apps share the registrable parent domain `secureserve.biz`; cross-site POSTs from third parties cannot attach the cookie. We add a CSRF double-submit token for defense-in-depth on state-changing endpoints.

### Cookie storage adapter (replaces `localStorage`)
A custom `Storage` adapter is plugged into `createClient({ auth: { storage } })` on **both** apps. The adapter:
- Reads the access token from a non-HttpOnly companion cookie used only by the supabase-js client (`sb-access-token`), kept short-lived.
- Refresh token lives **only** in the `HttpOnly` cookie set by an edge function `auth-refresh`. supabase-js cannot read or steal it.
- On token refresh the client calls `auth-refresh` (cookies sent automatically); the edge function rotates tokens and re-sets HttpOnly cookies.

This means:
- The long-lived **refresh token is never exposed to JS** on either app.
- The short-lived access token is the only thing JS sees, and it expires in minutes.
- XSS on either app cannot steal a usable long-term credential.

### Domain requirement
For cookie sharing to work, **both apps must live under the same registrable parent domain**, e.g.:
- SocialServe → `admin.secureserve.biz` (already configured)
- Internal Audit → `audit.secureserve.biz` (new custom domain on the satellite)

Cookies set on `.secureserve.biz` are automatically attached to both. If the user keeps the satellite on `*.lovable.app`, **same-domain cookie sharing is impossible** and we fall back to the exchange-code flow on every visit (still secure, just a 200 ms redirect on first load).

---

## Database changes (shared backend, applied once)

1. New table `auth_exchange_codes`:
   ```text
   id uuid PK
   code_hash text  -- SHA-256(code), never store raw
   user_id uuid    -- FK auth.users
   ua_hash text    -- SHA-256(user-agent)
   ip_hash text    -- SHA-256(client IP)
   issued_for_app text   -- 'internal_audit'
   expires_at timestamptz   -- now() + 60s
   consumed_at timestamptz
   created_at timestamptz
   ```
   No RLS policy needed — only edge functions (service role) touch it.

2. Update `app_modules` for the Internal Audit parent row:
   ```sql
   UPDATE app_modules
   SET base_url = 'https://audit.secureserve.biz'
   WHERE name = 'internal_audit';
   ```
   The existing sidebar code already handles `base_url` and routes children through it.

3. Cron cleanup: scheduled SQL job deletes expired `auth_exchange_codes` rows hourly.

---

## Edge functions (deployed to the shared backend)

| Function | Purpose | verify_jwt |
|---|---|---|
| `auth-issue-exchange-code` | Authenticated user requests a one-time code | true |
| `auth-redeem-exchange-code` | Satellite app trades code for cookie session | false |
| `auth-refresh` | Rotates access/refresh tokens via HttpOnly cookies | false |
| `auth-logout` | Clears HttpOnly cookies on `.secureserve.biz` | false |

All functions:
- Use rate limiting (per-IP, per-user).
- Log success/failure to `system_audit_trail` with no token material.
- Return generic errors to the client; detailed errors go to logs only.

---

## Code migration

### Satellite project (SocialServe-Internal Audit) — files to add/replace

1. `src/integrations/supabase/client.ts` — add the **cookie storage adapter**.
2. `src/contexts/SupabaseAuthContext.tsx` — copied from SocialServe, adapted to use the cookie adapter and the `auth-refresh` edge function.
3. `src/pages/auth/Exchange.tsx` — handles `/auth/exchange?code=…` redemption.
4. **All 27 audit pages** from `src/pages/audit/**` → copied 1:1.
5. **All audit components** from `src/components/audit/**` → copied 1:1.
6. **All audit hooks** from `src/hooks/audit/**`, `src/hooks/ia*` → copied.
7. **All audit services**: `src/services/audit*`, `src/services/iaNotificationService.ts`, `src/services/auditPlan*`, `src/services/auditCommunication*`, etc.
8. **Audit lib utilities** from `src/lib/audit/**`.
9. **Audit types** from `src/types/audit*.ts`.
10. **Audit menu items** from `src/components/sidebar/menuItems/auditMenuItems.ts` (so the satellite shows its own audit-only sidebar).
11. `src/components/routing/AppRoutes.tsx` — wire all audit routes; only show audit + auth routes.
12. Shared dependencies that audit code transitively uses (date utils, format-config, error handler, global blocking overlay, audit interceptor, Supabase types) — copied as needed.

### Source project (SocialServe) — minimal changes

1. **Sidebar menu items remain visible.** Already supported by `app_modules.base_url`; no code change needed beyond the SQL update above.
2. Add a tiny helper to the menu link click path: when navigating to a module whose `base_url` is set, first call `auth-issue-exchange-code` and append `?code=…` to the redirect URL. (One small edit in `useDynamicNavigation` / `SidebarMenuLink`.)
3. **No audit code is deleted from SocialServe in this change.** That keeps the source project a safe fallback. A follow-up cleanup PR can prune the audit files later, once the satellite is verified in production.

### Files NOT migrated
Anything that belongs to other modules (compliance, payments, c3, benefits, employers, etc.) stays only in SocialServe. The satellite contains audit + the minimum shared infrastructure (auth context, supabase client, UI primitives, error handler, blocking overlay).

---

## Custom domain & deployment

1. User publishes the satellite project in Lovable.
2. User adds custom domain `audit.secureserve.biz` (CNAME to the Lovable-provided host) in the satellite's project settings.
3. Once live, run the `app_modules.base_url` SQL update.
4. Both apps now share `.secureserve.biz` cookies → SSO works seamlessly.

If the user does not want a custom domain yet, the system still works via the exchange-code flow on each visit, but cookie persistence across apps requires the shared parent domain.

---

## What the user will experience

- Logs into SocialServe as today.
- Clicks **Internal Audit → Risk Register** (or any audit submenu).
- Browser briefly visits `audit.secureserve.biz/auth/exchange?code=…` (≤ 200 ms) and lands on the audit page, fully authenticated.
- Closes the audit tab and reopens later: still logged in (cookie-backed session), no re-login required, until idle/absolute timeout expires.
- Clicks logout in either app: HttpOnly cookies are cleared on `.secureserve.biz` → both apps log out together.

---

## Out of scope for this plan

- Removing audit code from SocialServe (deferred to a later cleanup once satellite is verified).
- Migrating other modules.
- Changing existing RLS posture (project rule: role-based security only).

---

## Approval needed

Please confirm before I proceed:
1. Custom domain `audit.secureserve.biz` (or another subdomain of `secureserve.biz`) will be used for the satellite. **Required for true cookie SSO.**
2. OK to add the `auth_exchange_codes` table and the four `auth-*` edge functions to the shared backend.
3. OK to leave audit code in SocialServe untouched for now (no regression risk) and prune later.
