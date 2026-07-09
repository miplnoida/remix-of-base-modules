/**
 * Communication Hub — retry/backoff helper (Phase 1C-B3-A).
 *
 * Pure calculation only — does NOT update the database. The dispatcher (or
 * whichever caller) is responsible for applying the returned decision to
 * `communication_message.attempt_count` / `next_attempt_at` / status.
 *
 * Column contract (must match Phase 1C-B1 schema):
 *   - attempt_count   integer  — 0-based count of prior attempts
 *   - next_attempt_at timestamptz — when the dispatcher may claim again
 *
 * Guardrails:
 *   - Do NOT call from frontend.
 *   - Do NOT read/write DB here.
 *   - Do NOT hardcode module-specific retry logic.
 *   - Prefer `communication_retry_policy` row when present; fall back to
 *     safe defaults documented below.
 */

export interface CommHubRetryPolicy {
  /** Max total attempts (including the first). Default: 3. */
  maxAttempts: number;
  /** Base delay in seconds before first retry. Default: 60. */
  baseDelaySeconds: number;
  /** Exponential factor. Default: 2 (60s, 120s, 240s, ...). */
  backoffFactor: number;
  /** Cap on delay in seconds. Default: 3600 (1h). */
  maxDelaySeconds: number;
}

export const DEFAULT_COMM_HUB_RETRY_POLICY: CommHubRetryPolicy = {
  maxAttempts: 3,
  baseDelaySeconds: 60,
  backoffFactor: 2,
  maxDelaySeconds: 3600,
};

export interface RetryDecisionInput {
  /** Current stored `attempt_count` BEFORE this attempt. */
  attemptCount: number;
  /** Whether the failure is classified retryable by transport helper. */
  retryable: boolean;
  policy?: Partial<CommHubRetryPolicy>;
  /** Optional deterministic clock injection for tests. */
  now?: Date;
}

export interface RetryDecision {
  /** Whether the message should be re-queued for another attempt. */
  shouldRetry: boolean;
  /** New value to write to `attempt_count` after this attempt. */
  nextAttemptCount: number;
  /** New value to write to `next_attempt_at`, or null when giving up. */
  nextAttemptAt: string | null;
  /** Terminal status when `shouldRetry=false`. */
  terminalStatus: "failed" | "sent" | null;
  reason: string;
}

/**
 * Decide whether/when to retry a failed send.
 *
 * Caller is responsible for:
 *   - Loading the row's current `attempt_count`.
 *   - Calling this ONLY on transport failure (success paths don't retry).
 *   - Writing the decision back to the DB atomically.
 */
export function decideRetry(input: RetryDecisionInput): RetryDecision {
  const policy: CommHubRetryPolicy = {
    ...DEFAULT_COMM_HUB_RETRY_POLICY,
    ...(input.policy ?? {}),
  };
  const now = input.now ?? new Date();
  const nextAttemptCount = input.attemptCount + 1;

  if (!input.retryable) {
    return {
      shouldRetry: false,
      nextAttemptCount,
      nextAttemptAt: null,
      terminalStatus: "failed",
      reason: "non_retryable_error",
    };
  }

  if (nextAttemptCount >= policy.maxAttempts) {
    return {
      shouldRetry: false,
      nextAttemptCount,
      nextAttemptAt: null,
      terminalStatus: "failed",
      reason: "max_attempts_exceeded",
    };
  }

  const delaySeconds = Math.min(
    policy.maxDelaySeconds,
    policy.baseDelaySeconds * Math.pow(policy.backoffFactor, input.attemptCount),
  );
  const nextAt = new Date(now.getTime() + delaySeconds * 1000).toISOString();

  return {
    shouldRetry: true,
    nextAttemptCount,
    nextAttemptAt: nextAt,
    terminalStatus: null,
    reason: `retry_scheduled_in_${delaySeconds}s`,
  };
}

/**
 * Load a policy row from `communication_retry_policy` if the table exists,
 * else fall back to defaults. Pure lookup — no writes.
 *
 * NOTE — Phase 1C-B3-B may extend this to key by (module_code, event_code,
 * channel). For now we return defaults; wiring in the real policy row will
 * happen when the dispatcher starts using it.
 */
// deno-lint-ignore no-explicit-any
export async function loadRetryPolicy(_supabase: any, _key?: {
  moduleCode?: string; eventCode?: string; channel?: string;
}): Promise<CommHubRetryPolicy> {
  // Intentionally minimal in Phase 1C-B3-A — see NEEDS_REVIEW in report.
  return { ...DEFAULT_COMM_HUB_RETRY_POLICY };
}
