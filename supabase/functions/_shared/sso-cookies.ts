// Shared helpers for the cross-app SSO cookie flow.
// All cookies use HttpOnly + Secure + SameSite=Lax and are scoped to the
// shared parent domain so both apps see them automatically.

export const COOKIE_DOMAIN = Deno.env.get('SSO_COOKIE_DOMAIN') ?? '.secureserve.biz';
export const ALLOWED_ORIGINS_RAW =
  Deno.env.get('SSO_ALLOWED_ORIGINS') ??
  [
    'https://admin.secureserve.biz',
    'https://audit.secureserve.biz',
    'https://internalaudit.secureserve.biz',
    // Lovable preview hosts (used before custom domain is live):
    'https://social-wellspring-app.lovable.app',
    'https://nexus-guardian-sync.lovable.app',
    'https://id-preview--455cbbae-c40e-4f3f-af49-d9ed99089948.lovable.app',
    'https://id-preview--7e98fc6b-f149-4e9f-9fd2-cbef90aba410.lovable.app',
  ].join(',');
export const ALLOWED_ORIGINS = ALLOWED_ORIGINS_RAW.split(',').map((s) => s.trim()).filter(Boolean);

export const ACCESS_COOKIE = 'sb-access-token';
export const REFRESH_COOKIE = 'sb-refresh-token';
export const CSRF_COOKIE = 'sb-csrf';

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-csrf-token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

interface CookieOpts {
  name: string;
  value: string;
  maxAgeSeconds: number;
  httpOnly?: boolean;
  path?: string;
}

export function buildCookie({ name, value, maxAgeSeconds, httpOnly = true, path = '/' }: CookieOpts): string {
  const parts = [
    `${name}=${value}`,
    `Domain=${COOKIE_DOMAIN}`,
    `Path=${path}`,
    `Max-Age=${maxAgeSeconds}`,
    'Secure',
    'SameSite=Lax',
  ];
  if (httpOnly) parts.push('HttpOnly');
  return parts.join('; ');
}

export function clearCookie(name: string, path = '/'): string {
  return `${name}=; Domain=${COOKIE_DOMAIN}; Path=${path}; Max-Age=0; Secure; SameSite=Lax; HttpOnly`;
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.get('cookie') ?? '';
  const out: Record<string, string> = {};
  header.split(';').forEach((p) => {
    const idx = p.indexOf('=');
    if (idx === -1) return;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}
