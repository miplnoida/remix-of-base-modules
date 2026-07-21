import { CommHubAuthError } from "./authSession";

/**
 * Canonical, operator-friendly messages for Communication Hub authentication
 * blocker codes. The server returns machine codes on the stable envelope; the
 * client renders these strings so the UI never shows the raw code.
 */
const AUTH_MESSAGES: Record<string, string> = {
  authentication_header_missing:
    "Your login session was not sent with the request. Please refresh and sign in again.",
  authentication_token_expired:
    "Your login session has expired. Please sign in again to continue.",
  authentication_token_invalid:
    "Your login session could not be verified. Please sign in again.",
  authentication_user_missing:
    "We could not identify your account. Please sign in again.",
  authentication_service_unavailable:
    "The authentication service is temporarily unavailable. Please retry in a moment.",
  authentication_required:
    "You must be signed in to run this test. Please sign in and try again.",
  session_lookup_failed:
    "We could not read your current session. Please refresh and try again.",
};

export interface EnvelopeLike {
  status?: string;
  failure_stage?: string | null;
  failureStage?: string | null;
  message?: string | null;
  blockers?: Array<{ code?: string; stage?: string; message?: string }>;
  retry_safe?: boolean;
}

/**
 * Resolve an auth blocker (either a thrown `CommHubAuthError` from the client
 * helper or an envelope returned by the edge function) to a friendly message.
 * Returns `null` when the input is not an auth failure.
 */
export function resolveAuthErrorMessage(input: unknown): string | null {
  if (input instanceof CommHubAuthError) {
    return AUTH_MESSAGES[input.code] ?? AUTH_MESSAGES.authentication_required;
  }
  if (input && typeof input === "object") {
    const env = input as EnvelopeLike;
    if (env.failure_stage === "auth" && Array.isArray(env.blockers)) {
      const b = env.blockers.find((x) => x?.stage === "auth" && x?.code);
      if (b?.code && AUTH_MESSAGES[b.code]) return AUTH_MESSAGES[b.code];
      if (b?.message) return b.message;
    }
  }
  return null;
}
