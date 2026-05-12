// Tiny diagnostic endpoint used by the SSO playbook. Returns whether the
// caller's origin and the requested app id are configured correctly.
// No secrets, no DB writes. Safe to call from any browser.

import { corsHeadersFor, ALLOWED_ORIGINS } from '../_shared/sso-cookies.ts';

const ALLOWED_APPS = ['internal_audit', 'compliance'];

Deno.serve((req) => {
  const cors = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(req.url);
  const app = url.searchParams.get('app') ?? '';
  const origin = req.headers.get('origin') ?? '';

  const originOk = ALLOWED_ORIGINS.includes(origin);
  const appOk = ALLOWED_APPS.includes(app);

  const body = {
    ok: originOk && appOk,
    origin,
    origin_allowed: originOk,
    app,
    app_allowed: appOk,
    allowed_apps: ALLOWED_APPS,
    reason: !originOk ? 'origin_not_allowed' : !appOk ? 'unknown_app' : 'ok',
  };

  console.log('[sso-healthcheck]', body);

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
