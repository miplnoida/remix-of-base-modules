/**
 * comm-hub-dry-run-contract/v1
 * ----------------------------------------------------------------------------
 * Single normalised envelope shared by SQL RPCs, the `comm-hub-dry-run` Edge
 * Function, and the frontend `dryRunService`. Introduced by Phase 4B3 Slice 1
 * (Section B) to eliminate the pre-mutation `CORRELATION_ID_MISMATCH` class of
 * defects and to make retry safety server-authoritative.
 *
 * PURELY TYPES + CONSTANTS. No runtime behaviour, no side effects. Safe to
 * import from anywhere.
 *
 * Rules the contract enforces on callers/producers:
 *  - Missing mutation or retry evidence MUST be encoded as `"UNKNOWN"` — never
 *    silently defaulted to `false`.
 *  - `passed` MUST equal `status === "BEGIN_OK" | "BEGIN_REPLAY" | "PROCESSED"
 *    | "CERTIFIED" | "IDEMPOTENT"`.
 *  - `state` MUST reflect the last authoritative execution state observed by
 *    the server (never the browser's expectation).
 *  - `correlation_id` in a successful envelope is the AUTHORITATIVE Preview
 *    correlation — never a caller-supplied UUID.
 */

export const DRY_RUN_CONTRACT_VERSION = "comm-hub-dry-run-contract/v1" as const;

// ---------------------------------------------------------------------------
// Status + state enumerations
// ---------------------------------------------------------------------------

export type DryRunStatus =
  | "PREFLIGHT_READY"
  | "BEGIN_OK"
  | "BEGIN_REPLAY"
  | "PROCESSING"
  | "PROCESSED"
  | "CERTIFIED"
  | "IDEMPOTENT"
  | "BLOCKED"
  | "FAILED";

export type DryRunState =
  | "PREFLIGHT"
  | "REQUEST_CREATED"
  | "PROCESSING"
  | "PROCESSED"
  | "CERTIFIED"
  | "FAILED"
  | "BLOCKED"
  | "UNKNOWN";

export const DRY_RUN_SUCCESS_STATUSES: readonly DryRunStatus[] = [
  "PREFLIGHT_READY",
  "BEGIN_OK",
  "BEGIN_REPLAY",
  "PROCESSED",
  "CERTIFIED",
  "IDEMPOTENT",
] as const;

// ---------------------------------------------------------------------------
// Tri-state evidence flag ----------------------------------------------------
// UNKNOWN is REQUIRED whenever the server has not proven the fact. It MUST
// NOT be collapsed to `false` in either direction of the wire.
// ---------------------------------------------------------------------------

export type TriState = true | false | "UNKNOWN";

// ---------------------------------------------------------------------------
// Blockers and warnings
// ---------------------------------------------------------------------------

export interface DryRunBlocker {
  code: string;
  stage?: string;
  severity?: "critical" | "high" | "medium" | "low";
  message?: string;
  detail?: Record<string, unknown>;
}

export interface DryRunWarning {
  code: string;
  stage?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Retry classification (Section Q)
// ---------------------------------------------------------------------------

export type DryRunRetryReason =
  | "PRE_MUTATION_CORRELATION_MISMATCH"
  | "PRE_MUTATION_VALIDATION_FAILURE"
  | "PRE_MUTATION_AUTH_FAILURE"
  | "POST_MUTATION_AMBIGUOUS"
  | "IDEMPOTENCY_KEY_SCOPE_MISMATCH"
  | "EXECUTION_COMPLETION_DEADLINE_EXCEEDED"
  | "REPLAY_SAFE"
  | "SUCCESS"
  | "UNKNOWN";

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export interface DryRunContractV1Envelope {
  contract_version: typeof DRY_RUN_CONTRACT_VERSION;

  status: DryRunStatus;
  state: DryRunState;
  passed: boolean;

  // Authoritative Preview-chain correlation. Populated on every successful or
  // replay response, and on blocked responses whenever the server can safely
  // reveal it (i.e. after Preview + approval have been loaded and matched).
  correlation_id: string | null;

  // Identifiers ------------------------------------------------------------
  preview_snapshot_id: string | null;
  preview_approval_id: string | null;
  dry_run_execution_id: string | null;
  execution_no: string | null;
  request_id: string | null;
  request_number: string | null;
  message_id: string | null;
  trace_id: string | null;
  dry_run_certification_id: string | null;
  certification_expires_at: string | null;

  // Frozen recipient evidence ---------------------------------------------
  recipient_count: number | null;

  // Diagnostics ------------------------------------------------------------
  blockers: DryRunBlocker[];
  warnings: DryRunWarning[];
  transition_log_ids: string[];

  // Mutation evidence (Section Q) — never default missing values to false.
  mutation_started: TriState;
  execution_created: TriState;
  request_created: TriState;
  message_created: TriState;
  cleanup_proven: TriState;
  provider_call_attempted: TriState;
  simulator_call_attempted: TriState;
  ambiguous_outcome: TriState;

  // Retry safety
  retry_safe: TriState;
  retry_reason: DryRunRetryReason;
}

// ---------------------------------------------------------------------------
// Helper contract envelope (Section C) --------------------------------------
// Every readiness/gate/binding helper (SQL or TS) returns this exact shape.
// `allowed` and `ok` MUST be identical; callers may check either without
// creating drift.
// ---------------------------------------------------------------------------

export interface HelperContractResult<TEvidence = Record<string, unknown>> {
  allowed: boolean;
  ok: boolean;
  blockers: DryRunBlocker[];
  evidence: TEvidence;
  evaluator_version: string;
}

// ---------------------------------------------------------------------------
// Recipient snapshot contract (Section H) -----------------------------------
// ---------------------------------------------------------------------------

export const RECIPIENT_SNAPSHOT_VERSION =
  "comm-hub-recipient-snapshot/v1" as const;

export type RecipientRole = "TO" | "CC" | "BCC";

export interface FrozenRecipient {
  role: RecipientRole;
  address_normalized: string;
  display_name?: string | null;
  order_index: number;
  source_ref?: string | null;
}

export interface FrozenRecipientSnapshot {
  snapshot_version: typeof RECIPIENT_SNAPSHOT_VERSION;
  recipient_count: number;
  recipient_set_hash: string;
  recipients: FrozenRecipient[];
}

// ---------------------------------------------------------------------------
// Type guards + factories ---------------------------------------------------
// ---------------------------------------------------------------------------

export function isDryRunSuccess(status: DryRunStatus): boolean {
  return (DRY_RUN_SUCCESS_STATUSES as readonly DryRunStatus[]).includes(status);
}

export function emptyDryRunEnvelope(
  status: DryRunStatus,
  overrides: Partial<DryRunContractV1Envelope> = {},
): DryRunContractV1Envelope {
  return {
    contract_version: DRY_RUN_CONTRACT_VERSION,
    status,
    state: "UNKNOWN",
    passed: isDryRunSuccess(status),
    correlation_id: null,
    preview_snapshot_id: null,
    preview_approval_id: null,
    dry_run_execution_id: null,
    execution_no: null,
    request_id: null,
    request_number: null,
    message_id: null,
    trace_id: null,
    dry_run_certification_id: null,
    certification_expires_at: null,
    recipient_count: null,
    blockers: [],
    warnings: [],
    transition_log_ids: [],
    mutation_started: "UNKNOWN",
    execution_created: "UNKNOWN",
    request_created: "UNKNOWN",
    message_created: "UNKNOWN",
    cleanup_proven: "UNKNOWN",
    provider_call_attempted: "UNKNOWN",
    simulator_call_attempted: "UNKNOWN",
    ambiguous_outcome: "UNKNOWN",
    retry_safe: "UNKNOWN",
    retry_reason: "UNKNOWN",
    ...overrides,
  };
}

/**
 * Assert an envelope produced by the SQL/Edge layer is well-formed.
 * Throws with a precise reason so contract-test regressions are localised.
 */
export function assertDryRunContractV1(
  input: unknown,
): asserts input is DryRunContractV1Envelope {
  const e = input as Partial<DryRunContractV1Envelope> | null;
  if (!e || typeof e !== "object") throw new Error("envelope: not an object");
  if (e.contract_version !== DRY_RUN_CONTRACT_VERSION) {
    throw new Error(`envelope: contract_version must be ${DRY_RUN_CONTRACT_VERSION}`);
  }
  if (typeof e.status !== "string") throw new Error("envelope: status missing");
  if (typeof e.state !== "string") throw new Error("envelope: state missing");
  if (typeof e.passed !== "boolean") throw new Error("envelope: passed missing");
  const tri = (v: unknown, field: string) => {
    if (v !== true && v !== false && v !== "UNKNOWN") {
      throw new Error(`envelope: ${field} must be true|false|"UNKNOWN"`);
    }
  };
  tri(e.mutation_started, "mutation_started");
  tri(e.execution_created, "execution_created");
  tri(e.request_created, "request_created");
  tri(e.message_created, "message_created");
  tri(e.cleanup_proven, "cleanup_proven");
  tri(e.provider_call_attempted, "provider_call_attempted");
  tri(e.simulator_call_attempted, "simulator_call_attempted");
  tri(e.ambiguous_outcome, "ambiguous_outcome");
  tri(e.retry_safe, "retry_safe");
  if (!Array.isArray(e.blockers)) throw new Error("envelope: blockers must be array");
  if (!Array.isArray(e.warnings)) throw new Error("envelope: warnings must be array");
  if (!Array.isArray(e.transition_log_ids)) {
    throw new Error("envelope: transition_log_ids must be array");
  }
}
