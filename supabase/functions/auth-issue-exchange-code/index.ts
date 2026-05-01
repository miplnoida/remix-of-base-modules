// Issues a short-lived single-use code that the satellite app trades for a session.
// Caller MUST be authenticated (Supabase JWT in Authorization header).
// Returns the raw code only ONCE in the response body. Only the SHA-256 hash is stored.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import {
  corsHeadersFor,
  sha256Hex,
  randomToken,
  clientIp,
  ALLOWED_ORIGINS,
} from '../_shared/sso-cookies.ts';

const CODE_TTL_SECONDS = 60;
const ALLOWED_APPS = new Set(['internal_audit']);

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401, cors);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );

    const token = auth.slice('Bearer '.length);
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: 'Unauthorized' }, 401, cors);
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const issuedForApp = String(body.app ?? '');
    const redirectPath = typeof body.redirect_path === 'string' ? body.redirect_path : null;

    if (!ALLOWED_APPS.has(issuedForApp)) {
      return json({ error: 'invalid_app' }, 400, cors);
    }
    if (redirectPath && !redirectPath.startsWith('/')) {
      return json({ error: 'invalid_redirect_path' }, 400, cors);
    }

    const code = randomToken(32);
    const codeHash = await sha256Hex(code);
    const ua = req.headers.get('user-agent') ?? '';
    const uaHash = await sha256Hex(ua);
    const ipHash = await sha256Hex(clientIp(req));
    const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error: insErr } = await admin.from('auth_exchange_codes').insert({
      code_hash: codeHash,
      user_id: userId,
      ua_hash: uaHash,
      ip_hash: ipHash,
      issued_for_app: issuedForApp,
      redirect_path: redirectPath,
      expires_at: expiresAt,
    });
    if (insErr) {
      console.error('insert exchange code failed', insErr);
      return json({ error: 'server_error' }, 500, cors);
    }

    return json({ code, expires_at: expiresAt, ttl_seconds: CODE_TTL_SECONDS }, 200, cors);
  } catch (e) {
    console.error('auth-issue-exchange-code fatal', e);
    return json({ error: 'server_error' }, 500, cors);
  }
});

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
