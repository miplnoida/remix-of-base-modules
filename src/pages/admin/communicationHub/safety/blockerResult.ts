/**
 * EPIC CH-SAFE-3 — Standardised blocker result normalisation.
 *
 * Runtime responses from pilot / policy evaluators / RPCs use a mix of
 * shapes to expose blockers:
 *   - result.blockers
 *   - result.reasons
 *   - result.policy_guard.blockers
 *   - result.review_policy_result.blockers
 *   - result.context.policy_guard.blockers
 *   - result.context.review_policy_result.blockers
 *   - error/message fallback
 *
 * `normalizeBlockerResult` merges them into a single, safe shape the UI can
 * feed into <BlockersList /> without any additional plumbing.
 */

export interface CommunicationBlockerResult {
  blockers: string[];
  warnings: string[];
  required_action?: string | null;
  blocker_source?: string;
  policy_guard?: any;
  review_policy_result?: any;
  duplicate_match?: any;
}

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => (x == null ? "" : String(x))).filter(Boolean);
  }
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

export function normalizeBlockerResult(input: any): CommunicationBlockerResult {
  const r = input ?? {};
  const ctx = r.context ?? {};
  const policyGuard =
    r.policy_guard ?? ctx.policy_guard ?? ctx.send_policy_guard ?? null;
  const reviewPolicy =
    r.review_policy_result ?? ctx.review_policy_result ?? null;

  const blockers = Array.from(
    new Set([
      ...asArray(r.blockers),
      ...asArray(r.reasons),
      ...asArray(policyGuard?.blockers),
      ...asArray(policyGuard?.reasons),
      ...asArray(reviewPolicy?.blockers),
      ...asArray(reviewPolicy?.reasons),
    ]),
  );

  const warnings = Array.from(
    new Set([
      ...asArray(r.warnings),
      ...asArray(policyGuard?.warnings),
      ...asArray(reviewPolicy?.warnings),
    ]),
  );

  // Error-payload fallback: expose the shielded error code so at least
  // one blocker chip renders instead of a bare toast.
  if (blockers.length === 0 && r.error) {
    blockers.push(String(r.error));
  }

  return {
    blockers,
    warnings,
    required_action:
      r.required_action ??
      policyGuard?.required_action ??
      reviewPolicy?.required_action ??
      null,
    blocker_source: r.blocker_source ?? (policyGuard ? "policy_guard" : reviewPolicy ? "review_policy" : undefined),
    policy_guard: policyGuard ?? undefined,
    review_policy_result: reviewPolicy ?? undefined,
    duplicate_match: r.duplicate_match ?? policyGuard?.duplicate_match ?? undefined,
  };
}

/** Compact toast summary for the first N blockers. */
export function summarizeBlockersForToast(input: any, limit = 2): string {
  const { blockers } = normalizeBlockerResult(input);
  if (blockers.length === 0) return "Blocked by Communication Hub.";
  const head = blockers.slice(0, limit).join(", ");
  const rest = blockers.length > limit ? ` +${blockers.length - limit} more` : "";
  return `Blocked: ${head}${rest}`;
}
