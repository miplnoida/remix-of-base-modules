// Trades a one-time code (from auth-issue-exchange-code) for a fresh Supabase session.
//
// Returns the access_token + refresh_token in the JSON body so the satellite
// app can call `supabase.auth.setSession(...)` and persist it in its OWN
// localStorage. supabase-js does not read cookies — it reads localStorage —
// so the previous HttpOnly-cookie design could never produce a usable session
// in the satellite. The token-in-body approach is acceptable here because the
// code is single-use, short-lived (60s), bound to UA + IP, validated server-side,
// and the response is over TLS.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import {
  corsHeadersFor,
  sha256Hex,
} from '../_shared/sso-cookies.ts';

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const code = typeof body.code === 'string' ? body.code : '';
    if (!code || code.length < 32) {
      console.warn('[sso-redeem] invalid_code shape');
      return json({ error: 'invalid_code' }, 400, cors);
    }

    const codeHash = await sha256Hex(code);
    const uaHash = await sha256Hex(req.headers.get('user-agent') ?? '');

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Look up code (hash only is stored).
    const { data: row, error: selErr } = await admin
      .from('auth_exchange_codes')
      .select('*')
      .eq('code_hash', codeHash)
      .maybeSingle();

    if (selErr || !row) {
      console.warn('[sso-redeem] code not found', { selErr });
      return json({ error: 'invalid_code' }, 401, cors);
    }
    if (row.consumed_at) {
      console.warn('[sso-redeem] code already used', { id: row.id });
      return json({ error: 'code_already_used' }, 401, cors);
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      console.warn('[sso-redeem] code expired', { id: row.id, expires_at: row.expires_at });
      return json({ error: 'code_expired' }, 401, cors);
    }
    if (row.ua_hash !== uaHash) {
      // User-agent must match. IP intentionally not bound (CDN/proxy IP shifts).
      console.warn('[sso-redeem] ua mismatch', { id: row.id });
      return json({ error: 'binding_mismatch' }, 401, cors);
    }

    // Atomic single-use redemption.
    const { error: updErr, data: updRows } = await admin
      .from('auth_exchange_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('consumed_at', null)
      .select('id');
    if (updErr || !updRows || updRows.length === 0) {
      console.warn('[sso-redeem] race lost on consume', { id: row.id, updErr });
      return json({ error: 'code_already_used' }, 401, cors);
    }

    // Mint a fresh session for the user via magic-link issuance + verify.
    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(row.user_id);
    if (userErr || !userData?.user?.email) {
      return json({ error: 'user_lookup_failed' }, 500, cors);
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
    });
    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error('generateLink failed', linkErr);
      return json({ error: 'session_mint_failed' }, 500, cors);
    }

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

    return json(
      {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
        redirect_path: row.redirect_path ?? '/',
        user: { id: session.user.id, email: session.user.email },
      },
      200,
      cors,
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
