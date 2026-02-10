import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a simple device fingerprint from browser properties
 */
function getDeviceFingerprint(): string {
  const nav = navigator;
  const screen = window.screen;
  const parts = [
    nav.userAgent,
    nav.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    nav.hardwareConcurrency,
  ];
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Verify a Turnstile token via the edge function.
 * Returns eventId for later outcome update.
 */
export async function verifyTurnstileToken(
  token: string,
  email?: string
): Promise<{ success: boolean; error?: string; riskLevel?: string; eventId?: string; skipped?: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-turnstile', {
      body: {
        token,
        email,
        deviceFingerprint: getDeviceFingerprint(),
        userAgent: navigator.userAgent,
      },
    });

    if (error) {
      console.error('[TurnstileService] Verification error:', error);
      return { success: false, error: 'Verification service unavailable' };
    }

    return data as { success: boolean; error?: string; riskLevel?: string; eventId?: string; skipped?: boolean };
  } catch (err) {
    console.error('[TurnstileService] Service error:', err);
    return { success: false, error: 'Verification service error' };
  }
}

/**
 * Update the login outcome on an existing security event.
 * Called after credential verification completes.
 */
export async function updateLoginOutcome(
  eventId: string,
  loginSuccess: boolean,
  failureReason?: string,
  userId?: string
): Promise<void> {
  try {
    await supabase.functions.invoke('verify-turnstile', {
      body: {
        action: 'update-outcome',
        eventId,
        loginSuccess,
        failureReason,
        userId,
      },
    });
  } catch (err) {
    console.error('[TurnstileService] Failed to update login outcome:', err);
  }
}
