/**
 * EPIC CH-TRACE-2 — Universal trace stage model (client mirror).
 *
 * Keep this list in sync with `supabase/functions/_shared/commHubTraceStages.ts`.
 * The order matters — Trace Center UI uses it to compute "last passed stage"
 * and "next expected stage".
 */

export const TRACE_STAGES = [
  "EVENT_INITIATED",
  "SOURCE_CONTEXT_CAPTURED",
  "RECIPIENT_RESOLUTION_STARTED",
  "RECIPIENT_RESOLVED",
  "AUTOMATION_CHECKED",
  "DUPLICATE_CHECKED",
  "TYPED_CONFIRMATION_CHECKED",
  "ENQUEUE_RECEIVED",
  "PAYLOAD_VALIDATED",
  "LIVE_SEND_ENTERED",
  "LIVE_PREFLIGHT_CHECKED",
  "SEND_POLICY_CHECKED",
  "REVIEW_POLICY_CHECKED",
  "DB_POLICY_GUARD_CHECKED",
  "TEMPLATE_MAPPING_CHECKED",
  "TEMPLATE_RESOLVED",
  "TEMPLATE_RENDERED",
  "SENDER_RESOLUTION_STARTED",
  "SENDER_RESOLVED",
  "REQUEST_CREATE_ATTEMPTED",
  "REQUEST_CREATED",
  "RECIPIENT_CREATE_ATTEMPTED",
  "RECIPIENT_CREATED",
  "MESSAGE_CREATE_ATTEMPTED",
  "MESSAGE_CREATED",
  "MESSAGE_QUEUED",
  "DISPATCH_INVOKED",
  "DISPATCH_CLAIM_ATTEMPTED",
  "DISPATCH_CLAIMED",
  "CONTROL_GATES_CHECKED",
  "LIVE_WINDOW_CHECKED",
  "EVENT_LIVE_STATUS_CHECKED",
  "RECIPIENT_ALLOWLIST_CHECKED",
  "ENV_ALLOWLIST_CHECKED",
  "PROVIDER_LOOKUP_STARTED",
  "PROVIDER_SELECTED",
  "PROVIDER_SEND_ATTEMPTED",
  "PROVIDER_ACCEPTED",
  "PROVIDER_FAILED",
  "DELIVERY_ATTEMPT_RECORDED",
  "REQUEST_STATUS_RECOMPUTED",
  "COMPLETED",
  "BLOCKED",
  "SUPPRESSED",
  "FAILED",
] as const;

export type TraceStage = (typeof TRACE_STAGES)[number];

export type TraceStepStatus =
  | "passed"
  | "warning"
  | "blocked"
  | "skipped"
  | "failed"
  | "info";

export function stageIndex(stage: string | null | undefined): number {
  if (!stage) return -1;
  return TRACE_STAGES.indexOf(stage as TraceStage);
}

/** Given the ordered set of passed steps, return the last passed stage. */
export function computeLastPassedStage(steps: Array<{ stage_code: string; status: string }> | null | undefined): string | null {
  if (!steps || steps.length === 0) return null;
  let last: string | null = null;
  for (const s of steps) {
    if (s.status === "passed" || s.status === "info") last = s.stage_code;
  }
  return last;
}

/** Given a current stage, return the next expected stage in the canonical order. */
export function computeNextExpectedStage(currentStage: string | null | undefined): string | null {
  const idx = stageIndex(currentStage);
  if (idx < 0 || idx >= TRACE_STAGES.length - 1) return null;
  const next = TRACE_STAGES[idx + 1];
  // Skip terminal marker stages when computing "expected next"
  if (next === "BLOCKED" || next === "SUPPRESSED" || next === "FAILED") return null;
  return next;
}

/**
 * Derive the "last passed" stage from a trace row when a step list is not available.
 * For successful/in-flight rows, current_stage IS the last completed stage.
 * For blocked/failed rows, the last passed stage is the one immediately before
 * the blocked_stage in the canonical ordering.
 */
export function deriveLastPassedFromTrace(
  currentStage: string | null | undefined,
  blockedStage: string | null | undefined,
  status: string,
): string | null {
  if (blockedStage && (status === "blocked" || status === "suppressed" || status === "failed")) {
    const idx = stageIndex(blockedStage);
    if (idx > 0) return TRACE_STAGES[idx - 1];
    return null;
  }
  return currentStage ?? null;
}

/**
 * Provider called = provider send was attempted, accepted, or failed.
 * True when:
 *  - provider_message_id is present (accepted), OR
 *  - current/blocked stage is at/after PROVIDER_SEND_ATTEMPTED, OR
 *  - any trace step reached a PROVIDER_* stage (or later).
 */
const PROVIDER_CALLED_STAGES = new Set<string>([
  "PROVIDER_SEND_ATTEMPTED",
  "PROVIDER_ACCEPTED",
  "PROVIDER_FAILED",
  "DELIVERY_ATTEMPT_RECORDED",
  "REQUEST_STATUS_RECOMPUTED",
  "COMPLETED",
]);

const PROVIDER_ATTEMPT_INDEX = TRACE_STAGES.indexOf("PROVIDER_SEND_ATTEMPTED");

export function deriveProviderCalled(input: {
  provider_message_id?: string | null;
  current_stage?: string | null;
  blocked_stage?: string | null;
  steps?: Array<{ stage_code: string; status?: string }> | null;
  attempts?: Array<unknown> | null;
}): boolean {
  if (input.provider_message_id) return true;
  if (input.attempts && input.attempts.length > 0) return true;
  const cur = stageIndex(input.current_stage);
  if (cur >= PROVIDER_ATTEMPT_INDEX && cur >= 0) return true;
  const blk = stageIndex(input.blocked_stage);
  if (blk >= PROVIDER_ATTEMPT_INDEX && blk >= 0) return true;
  if (input.steps) {
    for (const s of input.steps) {
      if (PROVIDER_CALLED_STAGES.has(s.stage_code)) return true;
      if (stageIndex(s.stage_code) >= PROVIDER_ATTEMPT_INDEX) return true;
    }
  }
  return false;
}

