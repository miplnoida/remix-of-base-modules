// Reads the HttpOnly refresh-token cookie, asks Supabase for a fresh session,
// rotates both cookies, and returns ONLY the short-lived access token to JS.
// JS uses the access token in-memory for supabase-js requests and discards it
// before the next refresh. The refresh token never leaves the cookie jar.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import {
  corsHeadersFor,
  parseCookies,
  buildCookie,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
} from '../_shared/sso-cookies.ts';

const REFRESH_COOKIE_TTL = 60 * 60 * 8;
const ACCESS_COOKIE_TTL = 60 * 60;

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);

  // CSRF: double-submit. The cookie is JS-readable; the header must match it.
  const cookies = parseCookies(req);
  const csrfCookie = cookies[CSRF_COOKIE];
  const csrfHeader = req.headers.get('x-csrf-token');
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return json({ error: 'csrf_mismatch' }, 403, cors);
  }

  const refresh = cookies[REFRESH_COOKIE];
  if (!refresh) return json({ error: 'no_session' }, 401, cors);

  const anon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { data, error } = await anon.auth.refreshSession({ refresh_token: refresh });
  if (error || !data?.session) {
    return json({ error: 'refresh_failed' }, 401, cors);
  }
  const session = data.session;

  const headers = new Headers({ ...cors, 'Content-Type': 'application/json' });
  headers.append(
    'Set-Cookie',
    buildCookie({
      name: REFRESH_COOKIE,
      value: encodeURIComponent(session.refresh_token),
      maxAgeSeconds: REFRESH_COOKIE_TTL,
      httpOnly: true,
    }),
  );
  headers.append(
    'Set-Cookie',
    buildCookie({
      name: ACCESS_COOKIE,
      value: encodeURIComponent(session.access_token),
      maxAgeSeconds: ACCESS_COOKIE_TTL,
      httpOnly: true,
    }),
  );

  // Return access token to JS so supabase-js can attach it to API calls.
  // Short-lived; never persisted.
  return new Response(
    JSON.stringify({
      access_token: session.access_token,
      expires_at: session.expires_at,
      token_type: session.token_type,
      user: { id: session.user.id, email: session.user.email },
    }),
    { status: 200, headers },
  );
});

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
