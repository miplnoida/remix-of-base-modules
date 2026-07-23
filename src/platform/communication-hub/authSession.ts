/**
 * Communication Hub — shared authenticated-session helper.
 *
 * Every operator-invoked test orchestrator (dry-run, controlled-live) must
 * ensure a fresh JWT is attached to the edge-function call. `supabase.auth`
 * normally does this transparently, but in long-lived Go Live sessions the
 * access token can silently expire between prerequisite polling and the
 * final "send" click, causing the Functions client to POST without a
 * valid Authorization header. That produces the misleading
 * `Failed to send a request to the Edge Function` toast.
 *
 * `getFreshAuthenticatedSession()` returns a guaranteed-valid session or
 * throws a stable, typed error (`authentication_required` /
 * `session_lookup_failed`) that callers can surface as a blocker.
 *
 * This helper must be the ONLY authentication entry point for the
 * dry-run and controlled-live test services.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export class CommHubAuthError extends Error {
  constructor(public readonly code: "session_lookup_failed" | "authentication_required", message?: string) {
    super(message ?? code);
    this.name = "CommHubAuthError";
  }
}

/**
 * Read the persisted auth session without invoking auth-js refresh logic.
 * auth.getSession() may proactively refresh inside its expiry margin; on an
 * invalid refresh token that path can remove a still-valid access token and
 * emit SIGNED_OUT. The persisted token is untrusted until getUser(token)
 * validates it below.
 */
export function getPersistedSessionSnapshot(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const configuredKey = (supabase.auth as typeof supabase.auth & { storageKey?: string }).storageKey;
    const backendUrl = import.meta.env.VITE_SUPABASE_URL;
    const backendRef = backendUrl ? new URL(backendUrl).hostname.split(".")[0] : null;
    const storageKey = configuredKey ?? (backendRef ? `sb-${backendRef}-auth-token` : null);
    if (!storageKey) return null;

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session | { currentSession?: Session; session?: Session };
    const candidate = "access_token" in parsed
      ? parsed
      : parsed.currentSession ?? parsed.session ?? null;
    return candidate?.access_token ? candidate : null;
  } catch {
    return null;
  }
}

export async function getFreshAuthenticatedSession(): Promise<Session> {
  let current = getPersistedSessionSnapshot();
  if (!current) {
    // No persisted token exists to preserve, so the regular lookup cannot
    // destroy the valid-token case this helper protects.
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new CommHubAuthError("session_lookup_failed", error.message);
    }
    current = data?.session ?? null;
  }

  // Validate the current token before attempting a refresh, even when it is
  // near its nominal expiry. refreshSession() may emit SIGNED_OUT and clear a
  // still-usable local session when a restored/embedded browser has lost only
  // its refresh token. That caused readiness to pass and the immediately
  // following Dry Run to report a false "session expired" error.
  if (current?.access_token) {
    const { data: userData, error: userErr } = await supabase.auth.getUser(current.access_token);
    if (!userErr && userData?.user?.id) {
      return current;
    }
    // The Auth server rejected the current token; only now is refresh safe.
  }

  // The current token is absent or server-rejected. Try the refresh token.
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshed?.session?.access_token) {
    return refreshed.session;
  }

  // Do NOT call signOut here. Leave the local session untouched so other
  // parts of the app that can still function (or a subsequent refresh
  // attempt after the user pastes a link, changes network, etc.) are not
  // torn down by our helper. The caller surfaces a "Refresh Session"
  // action that will retry this path.
  throw new CommHubAuthError(
    "authentication_required",
    refreshError?.message ?? "no active session",
  );
}
