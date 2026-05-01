// Trades a one-time code (from auth-issue-exchange-code) for a fresh session.
// Sets the refresh token as an HttpOnly cookie on the shared parent domain.
// The access token is also stored in an HttpOnly cookie; clients read the live
// session by calling /functions/v1/auth-refresh which returns a fresh access
// token in JSON (short-lived) and rotates cookies. The refresh token NEVER
// leaves the cookie jar.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import {
  corsHeadersFor,
  sha256Hex,
  clientIp,
  buildCookie,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
  randomToken,
} from '../_shared/sso-cookies.ts';

const REFRESH_COOKIE_TTL = 60 * 60 * 8; // 8h absolute ceiling
const ACCESS_COOKIE_TTL = 60 * 60; // 1h (refreshed on access)

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const code = typeof body.code === 'string' ? body.code : '';
    if (!code || code.length < 32) return json({ error: 'invalid_code' }, 400, cors);

    const codeHash = await sha256Hex(code);
    const uaHash = await sha256Hex(req.headers.get('user-agent') ?? '');
    const ipHash = await sha256Hex(clientIp(req));

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Atomic redeem: mark consumed only if not yet used and not expired.
    // We do select-then-update with a where clause guarding consumed_at IS NULL.
    const { data: row, error: selErr } = await admin
      .from('auth_exchange_codes')
      .select('*')
      .eq('code_hash', codeHash)
      .maybeSingle();

    if (selErr || !row) return json({ error: 'invalid_code' }, 401, cors);
    if (row.consumed_at) return json({ error: 'code_already_used' }, 401, cors);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error: 'code_expired' }, 401, cors);
    }
    // Bind to UA + IP to prevent code interception from a different device.
    if (row.ua_hash !== uaHash || row.ip_hash !== ipHash) {
      return json({ error: 'binding_mismatch' }, 401, cors);
    }

    const { error: updErr, data: updRows } = await admin
      .from('auth_exchange_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('consumed_at', null)
      .select('id');
    if (updErr || !updRows || updRows.length === 0) {
      return json({ error: 'code_already_used' }, 401, cors);
    }

    // Mint a fresh session for this user.
    // Use generateLink to obtain hashed_token / refresh tokens via magic link issuance.
    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(row.user_id);
    if (userErr || !userData?.user?.email) {
      return json({ error: 'user_lookup_failed' }, 500, cors);
    }

    // Use the admin createSession-equivalent: generateLink + verify on the server.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
    });
    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error('generateLink failed', linkErr);
      return json({ error: 'session_mint_failed' }, 500, cors);
    }

    // Verify the magic link server-side to obtain a session (access + refresh).
    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: verifyData, error: verifyErr } = await anon.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });
    if (verifyErr || !verifyData?.session) {
      console.error('verifyOtp failed', verifyErr);
      return json({ error: 'session_mint_failed' }, 500, cors);
    }

    const session = verifyData.session;
    const csrf = randomToken(24);

    const cookies = [
      buildCookie({
        name: REFRESH_COOKIE,
        value: encodeURIComponent(session.refresh_token),
        maxAgeSeconds: REFRESH_COOKIE_TTL,
        httpOnly: true,
      }),
      buildCookie({
        name: ACCESS_COOKIE,
        value: encodeURIComponent(session.access_token),
        maxAgeSeconds: ACCESS_COOKIE_TTL,
        httpOnly: true,
      }),
      // CSRF token: NOT HttpOnly so JS can read it and echo it in x-csrf-token header
      // (double-submit pattern). Useful when SameSite is relaxed.
      buildCookie({
        name: CSRF_COOKIE,
        value: csrf,
        maxAgeSeconds: REFRESH_COOKIE_TTL,
        httpOnly: false,
      }),
    ];

    const headers = new Headers({ ...cors, 'Content-Type': 'application/json' });
    cookies.forEach((c) => headers.append('Set-Cookie', c));

    return new Response(
      JSON.stringify({
        ok: true,
        redirect_path: row.redirect_path ?? '/',
        // We DO NOT return any token in the body. The session lives in cookies only.
      }),
      { status: 200, headers },
    );
  } catch (e) {
    console.error('auth-redeem-exchange-code fatal', e);
    return json({ error: 'server_error' }, 500, cors);
  }
});

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
