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
  // Simple hash
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
 * Verify a Turnstile token via the edge function
 */
export async function verifyTurnstileToken(
  token: string,
  email?: string
): Promise<{ success: boolean; error?: string; riskLevel?: string }> {
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
      console.error('Turnstile verification error:', error);
      return { success: false, error: 'Verification service unavailable' };
    }

    return data as { success: boolean; error?: string; riskLevel?: string };
  } catch (err) {
    console.error('Turnstile service error:', err);
    return { success: false, error: 'Verification service error' };
  }
}
