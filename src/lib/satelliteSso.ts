/**
 * Cross-app SSO redirect helper.
 *
 * When a sidebar link points to a satellite app (different host on the same
 * organisation domain), we DO NOT just `window.location.href = url`.
 * Instead we:
 *   1. Ask `auth-issue-exchange-code` for a one-time, 60-second, single-use code.
 *   2. Append it to the satellite URL as `?sso_code=...&redirect_to=<original path>`.
 *   3. The satellite app's `/auth/exchange` page calls `auth-redeem-exchange-code`
 *      which sets HttpOnly cookies on the shared parent domain and redirects.
 *
 * Tokens are NEVER placed in the URL. The exchange code is opaque, single-use,
 * short-lived, and bound to user-agent + IP.
 *
 * If the SSO call fails (network, expired session) we fall back to a plain
 * redirect — the satellite will then show its own login screen.
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Hosts that are recognised as our satellite apps. Anything else uses a plain
 * redirect (treated as a generic external link).
 */
const SATELLITE_HOSTS: Record<string, string> = {
  // satellite host -> app identifier (must match ALLOWED_APPS in the edge function)
  'audit.secureserve.biz': 'internal_audit',
};

function getAppIdForUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return SATELLITE_HOSTS[u.host] ?? null;
  } catch {
    return null;
  }
}

export function isSatelliteUrl(url: string): boolean {
  return getAppIdForUrl(url) !== null;
}

/**
 * Issue a one-time SSO code and navigate to the satellite app with it.
 * Falls back to a plain redirect on any failure.
 */
export async function navigateToSatellite(url: string): Promise<void> {
  const appId = getAppIdForUrl(url);
  if (!appId) {
    window.location.href = url;
    return;
  }

  try {
    const target = new URL(url);
    const redirectPath = target.pathname + target.search + target.hash;

    const { data, error } = await supabase.functions.invoke('auth-issue-exchange-code', {
      body: { app: appId, redirect_path: redirectPath },
    });

    if (error || !data?.code) {
      // Not authenticated, network problem, etc. — fall back; satellite will challenge.
      window.location.href = url;
      return;
    }

    // Land on the satellite's exchange page; do NOT include the original deep
    // link in window.history beyond the exchange URL. The exchange page itself
    // does a server-side cookie set, then router.replace() to the final route.
    const exchangeUrl = new URL('/auth/exchange', target.origin);
    exchangeUrl.searchParams.set('code', data.code);
    window.location.href = exchangeUrl.toString();
  } catch {
    window.location.href = url;
  }
}
