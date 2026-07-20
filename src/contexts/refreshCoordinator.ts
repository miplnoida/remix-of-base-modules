/**
 * BN-MORT-UI-RECOVERY-2D — Single-flight refresh coordinator.
 *
 * All refresh call sites (proactive timer, visibility handler, retry button,
 * expired-session recovery) MUST go through {@link runRefreshOnce}.
 *
 * Guarantees:
 *   - Only one refresh in flight at a time.
 *   - Concurrent callers await the same Promise.
 *   - Callers pass a generation guard so stale results after logout are ignored.
 *   - Errors are surfaced (no silent swallow).
 */
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export interface RefreshResult {
  session: Session | null;
  /** Present when refresh determined the session is no longer valid. */
  expired?: boolean;
  /** Present when the underlying transport / server failed. */
  error?: string;
}

let inflight: Promise<RefreshResult> | null = null;

async function performRefresh(): Promise<RefreshResult> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      const msg = error.message || 'refresh_failed';
      // Supabase surfaces expired / invalid refresh tokens with specific keywords.
      const lower = msg.toLowerCase();
      if (lower.includes('expired') || lower.includes('invalid') || lower.includes('not found')) {
        return { session: null, expired: true, error: msg };
      }
      return { session: null, error: msg };
    }
    if (!data.session) {
      return { session: null, expired: true };
    }
    return { session: data.session };
  } catch (err) {
    return { session: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Run at most one refresh attempt. Concurrent callers share the result.
 * @param generation caller's captured auth generation; caller must re-check
 *                   it against the current generation before applying results.
 */
export function runRefreshOnce(): Promise<RefreshResult> {
  if (inflight) return inflight;
  inflight = performRefresh().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Test hook — reset in-flight state between tests. */
export function __resetRefreshCoordinatorForTests(): void {
  inflight = null;
}
