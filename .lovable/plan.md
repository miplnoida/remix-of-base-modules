# Fix: Satellite (Internal Audit) redirects to /login instead of accepting shared session

## Root cause

The central app (`admin.secureserve.biz`) already issues a one-time SSO code and sends the browser to `https://audit.secureserve.biz/auth/exchange?code=...`. That part works.

The satellite app `SocialServe-Internal Audit` (project `7e98fc6b-…`) does **not** implement the receiving half:

- It has **no `/auth/exchange` route** (verified — its `App.tsx` only has `/login` and `/audit/*` routes).
- It has **no code that calls `auth-redeem-exchange-code`**.
- It uses standard `supabase-js` with `localStorage` persistence. Because `audit.secureserve.biz` and `admin.secureserve.biz` are different origins, `localStorage` is **not shared**, so the satellite's `SupabaseAuthContext` boots with no session → `ProtectedRoute` → `/login`.

There is also a design issue in our existing edge functions: `auth-redeem-exchange-code` puts the access/refresh tokens into HttpOnly cookies. `supabase-js` does not read cookies — it reads `localStorage`. So even if cookies were set, the satellite would still show no session.

## Fix strategy

Implement the standard Supabase cross-app SSO pattern:

1. Central app (this repo) issues a one-time code (already works).
2. Satellite mounts an `/auth/exchange` page that POSTs the code to `auth-redeem-exchange-code`.
3. Edge function returns `access_token` + `refresh_token` in JSON over HTTPS (one-time, code already validated, UA/IP bound, single-use, 60s TTL).
4. Satellite calls `supabase.auth.setSession({ access_token, refresh_token })` which writes them into its own `localStorage`. From then on `supabase-js` handles refresh normally.
5. Page redirects to the original `redirect_path`.

Tokens in the JSON body are acceptable here because: the code is single-use and short-lived, the response is over TLS, the satellite immediately stores them via `supabase-js`, and the alternative (cookies) is incompatible with `supabase-js`.

## Changes in THIS project (central — `admin.secureserve.biz`)

### 1. `supabase/functions/auth-redeem-exchange-code/index.ts` — return tokens in JSON

Replace the cookie-setting response with a JSON response containing the freshly minted session:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "expires_at": 1735689600,
  "token_type": "bearer",
  "redirect_path": "/audit/dashboard",
  "user": { "id": "...", "email": "..." }
}
```

Keep all existing security checks (code hash lookup, single-use atomic update, expiry, UA/IP binding). Remove the `Set-Cookie` headers and the magic-link verify path — instead, generate the session via `admin.auth.admin.generateLink` + `anon.auth.verifyOtp` (already done) and return its tokens directly.

### 2. `supabase/functions/auth-refresh/index.ts` — no longer needed for this flow

Leave it in place but it is unused once the satellite uses `supabase-js`'s built-in refresh. Optional follow-up: delete it later.

### 3. `src/lib/satelliteSso.ts` — no changes needed

The issue/redirect flow is correct. Keep `SATELLITE_HOSTS = { 'audit.secureserve.biz': 'internal_audit' }`.

### 4. `supabase/functions/_shared/sso-cookies.ts` — relax CORS

Ensure `SSO_ALLOWED_ORIGINS` includes `https://audit.secureserve.biz` AND the satellite's lovable preview origin `https://nexus-guardian-sync.lovable.app` so the exchange page works before custom domain DNS resolves. Also add `https://*.lovable.app` handling by listing the specific preview host.

## Changes in the SATELLITE project (`SocialServe-Internal Audit`, id `7e98fc6b-f149-4e9f-9fd2-cbef90aba410`)

These cannot be made from this project — they must be applied in the satellite. After the user approves this plan, I will switch projects (or provide the exact patch) and apply:

### A. Add `src/pages/auth/AuthExchange.tsx`

```tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const REDEEM_URL =
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-redeem-exchange-code`;

export default function AuthExchange() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode guard — code is single-use
    ran.current = true;

    const code = params.get('code');
    if (!code) { setError('Missing SSO code'); return; }

    (async () => {
      try {
        const res = await fetch(REDEEM_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ code }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `redeem_failed_${res.status}`);
        }
        const data = await res.json();
        const { error: setErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (setErr) throw setErr;
        navigate(data.redirect_path ?? '/audit/dashboard', { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'SSO failed');
      }
    })();
  }, [params, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-sm">
        <div className="max-w-md text-center space-y-3">
          <p className="text-destructive font-medium">Sign-in handoff failed</p>
          <p className="text-muted-foreground">{error}</p>
          <a className="underline" href="/login">Continue to login</a>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Signing you in…
    </div>
  );
}
```

### B. Register the route in satellite `src/App.tsx`

Add **before** the `/login` route, **outside** `ProtectedRoute`:

```tsx
<Route path="/auth/exchange" element={<AuthExchange />} />
```

### C. (Optional) On `/login`, if `?sso_code=` present, also redirect to `/auth/exchange?code=…`

Defensive: in case any link uses the legacy `?sso_code` query param.

## Acceptance test

1. From `admin.secureserve.biz` (logged in), click the Internal Audit sidebar link.
2. Browser navigates to `https://audit.secureserve.biz/auth/exchange?code=…`.
3. Page shows "Signing you in…", then redirects to `/audit/dashboard` without ever showing `/login`.
4. Refreshing `/audit/dashboard` keeps the user signed in (session persisted in satellite's localStorage).
5. Reusing the same `code` URL fails with `code_already_used` (single-use enforced).

## Out of scope

- No changes to roles/permissions, sidebar, RLS, or any other module.
- No changes to the central app's login flow.
- `auth-refresh` edge function and the cookie helpers stay in place but become unused; safe to remove in a later cleanup.
