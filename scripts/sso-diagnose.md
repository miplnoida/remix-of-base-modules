# SSO Diagnostics — pinpoint which failure mode is firing

Open the satellite app in a browser, open DevTools → Console, and paste:

```js
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bmNlc2tlaWlpc2llZnFsZ3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTQxMDAsImV4cCI6MjA4ODczMDEwMH0.kVVysArl8ujrAHpHLtNx7xifYyq02ulIE5c4WKKSXCI';
const r = await fetch('https://xynceskeiiisiefqlgxo.supabase.co/functions/v1/auth-redeem-exchange-code', {
  method: 'POST',
  headers: { 'content-type': 'application/json', apikey: ANON, authorization: 'Bearer ' + ANON },
  body: JSON.stringify({ code: 'diagnostic-ping-'.padEnd(40, 'x') }),
});
console.log('status', r.status);
console.log('cors-origin', r.headers.get('access-control-allow-origin'));
console.log('body', await r.json());
```

Also run the healthcheck to confirm app id + origin are wired:

```js
const ANON = '<same as above>';
const h = await fetch('https://xynceskeiiisiefqlgxo.supabase.co/functions/v1/auth-sso-healthcheck?app=compliance', {
  headers: { apikey: ANON, authorization: 'Bearer ' + ANON },
});
console.log('health', h.status, await h.json());
```

## Result interpretation

| status | cors-origin | body              | Meaning                                                 | Fix |
|--------|-------------|-------------------|---------------------------------------------------------|-----|
| 401    | satellite origin echoed back | `{error:"invalid_code"}` | All wired correctly; real failure is elsewhere (Exchange.tsx, ProtectedRoute, env) | See playbook step 5/6/7 |
| (network error / opaque) | — | — | Browser blocked CORS preflight                          | Add satellite origin to `ALLOWED_ORIGINS_RAW` in `supabase/functions/_shared/sso-cookies.ts` and redeploy |
| 401    | empty / different origin | `{error:"invalid_code"}` | Origin not in allow-list — old cached deploy            | Redeploy `auth-redeem-exchange-code` after origin add |
| 404    | —           | —                 | Function not deployed                                   | Deploy `auth-redeem-exchange-code` |
| 200 from healthcheck `{ok:false,reason:"unknown_app"}` | — | — | App id missing in `ALLOWED_APPS` | Add `<app>` to BOTH `auth-issue-exchange-code` and `auth-redeem-exchange-code` |
| 500    | —           | `{error:"server_error"}` | Edge function crashed                                   | Check `supabase--edge_function_logs` for the function |

If status is 401 with the satellite origin echoed and `{error:"invalid_code"}`,
SSO infrastructure is healthy. The failure is on the satellite (`Exchange.tsx`
not calling `setSession`, route registered behind `ProtectedRoute`, or wrong
env). Apply playbook items 5–7 in order.
