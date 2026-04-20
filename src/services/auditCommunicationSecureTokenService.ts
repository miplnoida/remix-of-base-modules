/**
 * Secure token generator/validator for the audit communication module.
 * The existing employer portal will consume the URL `<portal>/audit-comm/<token>`
 * and call `validate(token)` to authorise an employer-facing action.
 */
import { supabase } from '@/integrations/supabase/client';

const TOK = 'ce_audit_communication_secure_tokens' as any;

function randomToken(bytes = 24) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const auditCommunicationSecureTokenService = {
  async issue(communicationId: string, opts: { ttlHours?: number; scope?: Record<string, unknown> } = {}) {
    const ttl = opts.ttlHours ?? 24 * 14; // 14 days default
    const token = randomToken(32);
    const expires = new Date(Date.now() + ttl * 3600 * 1000).toISOString();
    const { data, error } = await (supabase.from(TOK) as any)
      .insert({
        communication_id: communicationId,
        token,
        scope_json: opts.scope || {},
        expires_at: expires,
      })
      .select()
      .single();
    if (error) throw error;
    return data as { id: string; token: string; expires_at: string };
  },

  async validate(token: string): Promise<{ valid: boolean; reason?: string; row?: any }> {
    const { data } = await (supabase.from(TOK) as any).select('*').eq('token', token).maybeSingle();
    if (!data) return { valid: false, reason: 'not_found' };
    if ((data as any).used_at) return { valid: false, reason: 'already_used', row: data };
    if (new Date((data as any).expires_at).getTime() < Date.now()) return { valid: false, reason: 'expired', row: data };
    return { valid: true, row: data };
  },

  async markUsed(tokenId: string, ip?: string) {
    await (supabase.from(TOK) as any)
      .update({ used_at: new Date().toISOString(), used_ip: ip ?? null })
      .eq('id', tokenId);
  },

  buildPortalUrl(token: string) {
    // The employer portal is hosted separately; this is a relative-safe URL stub
    // the portal team can rewrite. We export the token verbatim — portal owns the route.
    return `/employer-portal/audit-comm/${token}`;
  },
};
