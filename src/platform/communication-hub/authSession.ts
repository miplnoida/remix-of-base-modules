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

export async function getFreshAuthenticatedSession(): Promise<Session> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new CommHubAuthError("session_lookup_failed", error.message);
  }

  const current = data?.session ?? null;
  const expiresAtMs = (current?.expires_at ?? 0) * 1000;
  const msUntilExpiry = expiresAtMs ? expiresAtMs - Date.now() : 0;
  const isNearExpiry = !expiresAtMs || msUntilExpiry < 60_000;

  // Fast path: token is not near expiry AND passes server-side validation.
  // We validate against the Auth server because a local session can look
  // valid while the server-side session was invalidated (key rotation,
  // sign-out elsewhere, session pruning).
  if (current?.access_token && !isNearExpiry) {
    const { data: userData, error: userErr } = await supabase.auth.getUser(current.access_token);
    if (!userErr && userData?.user?.id) {
      return current;
    }
    // getUser failed — fall through to refresh attempt below.
  }

  // Try to refresh. If the refresh token is missing/invalid but the current
  // access token is still valid on the server, we MUST NOT sign the user
  // out — that's what previously destroyed a working session and produced
  // the misleading "Your session has expired" screen while the user was
  // actively using the app. Refresh-token loss is common in preview iframes
  // and multi-tab environments; the access token can still have many
  // minutes of life left, which is enough for a dry run.
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshed?.session?.access_token) {
    return refreshed.session;
  }

  // Refresh failed. Last-chance fallback: if we still hold an access token
  // that the Auth server accepts, use it. Only when the server rejects the
  // token do we treat the session as truly gone.
  if (current?.access_token) {
    const { data: userData, error: userErr } = await supabase.auth.getUser(current.access_token);
    if (!userErr && userData?.user?.id) {
      return current;
    }
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
