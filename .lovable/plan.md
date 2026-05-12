
# Satellite SSO Integration Playbook (apply per satellite)

The SSO flow has many small parts that all must agree. The previous attempts kept failing because we fixed one part (CORS) without enforcing the full contract on the satellite side. This plan delivers a **single source of truth** — a checklist + a standardized `/auth/exchange` reference implementation + a diagnostics script — so every future satellite is wired up correctly in one pass.

## What this plan delivers

1. `docs/SATELLITE_SSO_PLAYBOOK.md` — the only document a future satellite project needs. Covers env, host registration, app id, exchange page, verification.
2. `docs/satellite-templates/Exchange.tsx` — drop-in reference implementation of `/auth/exchange` that the satellite copies verbatim. This is the file most likely to be wrong.
3. `docs/satellite-templates/satellite-app-shell.tsx` — minimal `App.tsx` showing the required provider order + route registration so the satellite cannot forget `/auth/exchange`.
4. `docs/satellite-templates/satellite-env.example` — exact env values (URL, anon key, project id) — anything else means the satellite is on the wrong backend.
5. `scripts/sso-diagnose.md` — copy-paste curl/console steps that pinpoint **which** of the 10 failure modes is firing in under 60 seconds.
6. SocialServe-side hardening:
   - `auth-issue-exchange-code` and `auth-redeem-exchange-code`: log the caller's origin + app on every call so failures are traceable from the edge logs.
   - `sso-cookies.ts`: when `Origin` is not in the allow-list, return `Access-Control-Allow-Origin: ''` (instead of falling back to the first allowed origin) so CORS fails loudly with a clear browser error instead of silently mis-routing.
   - Add a tiny `auth-sso-healthcheck` edge function the satellite can hit to confirm the shared backend, app id, and CORS are wired correctly before users ever click a tile.

No DB migration. No auth/RLS change. No business-logic change.

## The 10 failure modes the playbook eliminates

```text
1. Satellite on a different Supabase project              -> env file check
2. Satellite host not in SATELLITE_HOSTS                  -> playbook step 2
3. App id not in ALLOWED_APPS (issue + redeem)            -> playbook step 3
4. Satellite origin not in ALLOWED_ORIGINS                -> playbook step 4
5. /auth/exchange route missing                           -> reference App.tsx
6. Exchange page doesn't call supabase.auth.setSession    -> reference Exchange.tsx
7. Satellite has a custom storageKey -> session invisible -> client.ts must be regenerated, never edited
8. ProtectedRoute redirects before setSession resolves    -> reference Exchange.tsx awaits setSession + reload
9. UA mismatch (link opened in different browser)         -> playbook tells user to keep same tab
10. Email not confirmed -> generateLink fails             -> healthcheck surfaces this per user
```

## Standardized `/auth/exchange` (the part that's probably wrong now)

```tsx
// src/pages/auth/Exchange.tsx — copy verbatim into every satellite
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function Exchange() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;            // guard React StrictMode double-invoke
    ran.current = true;
    const code = params.get('code');
    const fallback = params.get('redirect_path') || '/';
    if (!code) { navigate('/login', { replace: true }); return; }

    (async () => {
      const { data, error } = await supabase.functions.invoke(
        'auth-redeem-exchange-code',
        { body: { code } },
      );
      if (error || !data?.access_token) {
        navigate('/login?sso_error=1', { replace: true });
        return;
      }
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (setErr) { navigate('/login?sso_error=2', { replace: true }); return; }
      // Hard reload so every provider re-reads the new session.
      window.location.replace(data.redirect_path || fallback);
    })();
  }, [params, navigate]);

  return <div className="p-8 text-sm text-muted-foreground">Signing you in…</div>;
}
```

The previous symptom (“login screen still appears on satellite”) almost always traces to this file — either it never called `setSession`, or it navigated with React Router instead of a hard reload, so `SupabaseAuthContext` kept its old `null` user.

## Per-satellite checklist (the playbook's heart)

```text
[ ] 1. .env on satellite matches docs/satellite-templates/satellite-env.example exactly
[ ] 2. SATELLITE_HOSTS in src/lib/satelliteSso.ts (SocialServe) includes
       the satellite's custom domain AND its preview host, both mapped to <app_id>
[ ] 3. ALLOWED_APPS in BOTH auth-issue-exchange-code and auth-redeem-exchange-code
       includes <app_id>
[ ] 4. ALLOWED_ORIGINS_RAW in supabase/functions/_shared/sso-cookies.ts includes
       https://<custom-domain> AND https://<preview-host>
[ ] 5. Satellite has src/pages/auth/Exchange.tsx copied verbatim from the template
[ ] 6. Satellite App.tsx registers route /auth/exchange BEFORE the catch-all and
       OUTSIDE <ProtectedRoute>
[ ] 7. Satellite never overrode src/integrations/supabase/client.ts (must be the
       Lovable-Cloud-generated file pointing at xynceskeiiisiefqlgxo)
[ ] 8. Healthcheck: open https://<satellite>/auth/exchange?code=ping in browser
       devtools and confirm the redeem call hits the edge function and gets back
       {error:'invalid_code'} with the correct CORS header for the satellite origin.
       Anything else (network error, opaque CORS error, 404) means step 1-4 failed.
[ ] 9. End-to-end: SocialServe sidebar tile -> satellite lands authed on
       /<app>/workbench, reload still authed, log out from SocialServe -> satellite
       blocked on next request.
```

## Diagnostics script (`scripts/sso-diagnose.md`)

A short, copy-pasteable browser-console snippet the user runs in the satellite tab:
```js
const r = await fetch('https://xynceskeiiisiefqlgxo.supabase.co/functions/v1/auth-redeem-exchange-code', {
  method: 'POST',
  headers: { 'content-type': 'application/json',
             apikey: '<anon key>', authorization: 'Bearer <anon key>' },
  body: JSON.stringify({ code: 'diagnostic-ping-'.padEnd(40, 'x') })
});
console.log(r.status, r.headers.get('access-control-allow-origin'), await r.json());
```
Expected: `401 https://<satellite-origin> {error:"invalid_code"}`. Any other shape maps to a specific checklist item.

## Files this plan will create / modify

```text
docs/SATELLITE_SSO_PLAYBOOK.md                        (new)
docs/satellite-templates/Exchange.tsx                 (new)
docs/satellite-templates/satellite-app-shell.tsx      (new)
docs/satellite-templates/satellite-env.example        (new)
scripts/sso-diagnose.md                               (new)
supabase/functions/_shared/sso-cookies.ts             (edit: stricter CORS)
supabase/functions/auth-issue-exchange-code/index.ts  (edit: better logs)
supabase/functions/auth-redeem-exchange-code/index.ts (edit: better logs)
supabase/functions/auth-sso-healthcheck/index.ts      (new, tiny)
```

## What you do after I implement

1. Open the Integrated Compliance Hub project.
2. Replace its `src/pages/auth/Exchange.tsx` with `docs/satellite-templates/Exchange.tsx` from this repo.
3. Verify its `App.tsx` matches `docs/satellite-templates/satellite-app-shell.tsx` (route order + provider order).
4. Run the diagnostics snippet from step 8 above in the satellite browser tab. Tell me the exact 3-tuple it prints and I'll close out the remaining gap in one shot — no more guesswork.

Approve and I will implement the files above.
