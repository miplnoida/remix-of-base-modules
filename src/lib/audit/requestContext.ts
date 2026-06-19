/**
 * Shared request-context helper for BN audit writes.
 *
 * Captures values that are *available* in the browser and should be
 * persisted on every `system_audit_trail` row alongside the mutation:
 *
 *   - session_id      → Supabase access-token suffix (stable per session)
 *   - device_info     → navigator.userAgent
 *   - route           → window.location.pathname + search
 *   - ip_address      → set by an outer setter (server-issued header,
 *                       edge proxy, or login response). null if unknown.
 *   - correlation_id  → per-mutation UUID
 *
 * No IP/session/device columns are added to config tables — these stay
 * inside `system_audit_trail` only.
 */
import { supabase } from '@/integrations/supabase/client';

export interface AuditRequestContext {
  ipAddress?: string | null;
  sessionId?: string | null;
  deviceInfo?: string | null;
  route?: string | null;
  correlationId?: string | null;
}

let _ip: string | null = null;
/** Set once after login (or whenever the resolved client IP is known). */
export function setAuditIpAddress(ip: string | null) {
  _ip = ip && ip.trim() ? ip.trim() : null;
}
export function getAuditIpAddress(): string | null {
  return _ip;
}

let _cachedSession: string | null = null;
async function resolveSessionId(): Promise<string | null> {
  if (_cachedSession) return _cachedSession;
  try {
    const { data } = await supabase.auth.getSession();
    const tok = data?.session?.access_token;
    if (!tok) return null;
    // Use last 12 chars of the JWT — opaque, stable per session, never the full token.
    _cachedSession = tok.slice(-12);
    return _cachedSession;
  } catch {
    return null;
  }
}

/** Resolve the current request context. Safe in both SSR (no window) and CSR. */
export async function getAuditRequestContext(
  overrides?: AuditRequestContext,
): Promise<AuditRequestContext> {
  const route =
    overrides?.route ??
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search ?? ''}`
      : null);
  const deviceInfo =
    overrides?.deviceInfo ??
    (typeof navigator !== 'undefined' ? navigator.userAgent : null);
  const sessionId = overrides?.sessionId ?? (await resolveSessionId());
  const correlationId =
    overrides?.correlationId ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : null);

  return {
    ipAddress: overrides?.ipAddress ?? _ip,
    sessionId,
    deviceInfo,
    route,
    correlationId,
  };
}

export function clearAuditSessionCache() {
  _cachedSession = null;
}
