/**
 * Resolve the current authenticated user's user_code from the active
 * Supabase session. Used by service-layer code that needs to stamp
 * audit rows but isn't running inside a React hook.
 *
 * Returns null if no session is available — callers MUST then decide
 * whether to throw (critical mutations) or skip the audit (read-only).
 */
import { supabase } from '@/integrations/supabase/client';

let cache: { uid: string; userCode: string } | null = null;

export async function getCurrentUserCode(): Promise<string | null> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess?.session?.user?.id;
  if (!uid) return null;
  if (cache && cache.uid === uid) return cache.userCode;

  const { data } = await (supabase as any)
    .from('profiles')
    .select('user_code')
    .eq('id', uid)
    .maybeSingle();
  const userCode = (data?.user_code ?? '').trim();
  if (!userCode) return null;
  cache = { uid, userCode };
  return userCode;
}

export function clearUserCodeCache() {
  cache = null;
}
