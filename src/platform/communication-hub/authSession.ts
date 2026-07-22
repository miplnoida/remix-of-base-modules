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
  const isNearExpiry = !expiresAtMs || expiresAtMs - Date.now() < 60_000;

  // If we have a non-expiring token, validate it against the Auth server.
  // The local session can look valid while the server-side session was
  // invalidated (key rotation, sign-out elsewhere, session pruning) — in
  // that case getUser() returns an error and we must refresh before
  // handing the token to any edge function.
  if (current?.access_token && !isNearExpiry) {
    const { data: userData, error: userErr } = await supabase.auth.getUser(current.access_token);
    if (!userErr && userData?.user?.id) {
      return current;
    }
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshed?.session?.access_token) {
    // Clear the stale local session so the app stops replaying an
    // invalid token on subsequent calls and the user is prompted to
    // sign in again.
    try { await supabase.auth.signOut({ scope: "local" } as any); } catch { /* noop */ }
    throw new CommHubAuthError(
      "authentication_required",
      refreshError?.message ?? "no active session",
    );
  }
  return refreshed.session;
}
