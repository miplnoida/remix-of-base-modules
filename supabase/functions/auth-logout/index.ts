// Clears all SSO cookies on the shared parent domain.
// Best-effort revokes the refresh token via Supabase as well.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import {
  corsHeadersFor,
  parseCookies,
  clearCookie,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
} from '../_shared/sso-cookies.ts';

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const cookies = parseCookies(req);
  const refresh = cookies[REFRESH_COOKIE];

  if (refresh) {
    try {
      const anon = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
      );
      // refreshSession then signOut to invalidate at the source
      const { data } = await anon.auth.refreshSession({ refresh_token: refresh });
      if (data?.session) {
        await anon.auth.signOut();
      }
    } catch {
      // best-effort; cookies are still cleared
    }
  }

  const headers = new Headers({ ...cors, 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', clearCookie(ACCESS_COOKIE));
  headers.append('Set-Cookie', clearCookie(REFRESH_COOKIE));
  headers.append('Set-Cookie', clearCookie(CSRF_COOKIE));

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
});
