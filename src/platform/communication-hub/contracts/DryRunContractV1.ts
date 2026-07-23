/**
 * comm-hub-dry-run-contract/v1
 * ----------------------------------------------------------------------------
 * Single normalised envelope shared by SQL RPCs, the `comm-hub-dry-run` Edge
 * Function, and the frontend `dryRunService`.
 *
 * Checkpoint 2 (Section A) tightens semantics:
 *   - `passed` MUST be true only for terminal, successful stages
 *     (CERTIFIED). Intermediate stages (BEGIN_OK, BEGIN_REPLAY, PROCESSED,
 *     PREFLIGHT_READY, PROCESSING) MUST return passed=false.
 *   - Idempotency is expressed via `idempotent_replay=true` together with the
 *     stage-appropriate status (e.g. BEGIN_REPLAY or CERTIFIED).
 *   - The ambiguous `IDEMPOTENT` status is removed.
 *   - `stage_succeeded`, `terminal`, `failure_stage`, `message`,
 *     `validated_at`, and `execution_deadline_at` are first-class fields.
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

/** Statuses for which `passed` MUST be true (terminal + fully successful). */
export const DRY_RUN_PASSED_STATUSES: readonly DryRunStatus[] = [
  "CERTIFIED",
] as const;

/** Statuses that indicate the stage itself completed without error. */
export const DRY_RUN_STAGE_SUCCESS_STATUSES: readonly DryRunStatus[] = [
  "PREFLIGHT_READY",
  "BEGIN_OK",
  "BEGIN_REPLAY",
  "PROCESSING",
  "PROCESSED",
  "CERTIFIED",
] as const;

/**
 * Terminal statuses for the CURRENT invocation.
 *
 * Checkpoint 2A: `BLOCKED` is terminal for this call. A corrected new
 * invocation may still be permitted — that is expressed via `retry_safe`
 * independently of `terminal`.
 */
export const DRY_RUN_TERMINAL_STATUSES: readonly DryRunStatus[] = [
  "CERTIFIED",
  "FAILED",
  "BLOCKED",
] as const;

/**
 * Statuses whose stage did NOT succeed. `BLOCKED` and `FAILED` are the only
 * stage-failure statuses; every other status implies the stage completed.
 */
export const DRY_RUN_STAGE_FAILURE_STATUSES: readonly DryRunStatus[] = [
  "BLOCKED",
  "FAILED",
] as const;

// ---------------------------------------------------------------------------
// Tri-state evidence flag ----------------------------------------------------
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
// Retry classification
// ---------------------------------------------------------------------------

export type DryRunRetryReason =
  | "SAFE_TO_PROCEED"
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

  /** True only when the stage completed AND the run is fully certified. */
  passed: boolean;
  /** True when the stage itself completed without error (may not be terminal). */
  stage_succeeded: boolean;
  /** True when no further stage will be attempted against this envelope. */
  terminal: boolean;
  /** True when this response returned the pre-existing chain unchanged. */
  idempotent_replay: boolean;

  failure_stage: string | null;
  message: string;
  validated_at: string | null;
  execution_deadline_at: string | null;

  correlation_id: string | null;

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

  recipient_count: number | null;

  blockers: DryRunBlocker[];
  warnings: DryRunWarning[];
  transition_log_ids: string[];

  mutation_started: TriState;
  execution_created: TriState;
  request_created: TriState;
  message_created: TriState;
  /**
   * Checkpoint 2A: whether THIS invocation created (or would create) the
   * begin-chain. `false` for BEGIN_REPLAY / re-observed CERTIFIED / any
   * preflight-only response.
   */
  created_this_call: TriState;
  cleanup_proven: TriState;
  provider_call_attempted: TriState;
  simulator_call_attempted: TriState;
  ambiguous_outcome: TriState;

  retry_safe: TriState;
  retry_reason: DryRunRetryReason;

  /**
   * Checkpoint 2A: opaque structured evidence bag. Preflight/begin-v1 MUST
   * populate it with the fields they gated on (approval canonical hash
   * present/valid, scanner counts, dependency-hash drift, frozen-recipient
   * check outcomes, etc.). Never `undefined`.
   */
  evidence: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helper contract envelope --------------------------------------------------
// Every readiness/gate/binding helper (SQL or TS) returns this exact shape.
// `allowed` and `ok` MUST be identical.
// ---------------------------------------------------------------------------

export interface HelperContractResult<TEvidence = Record<string, unknown>> {
  allowed: boolean;
  ok: boolean;
  blockers: DryRunBlocker[];
  evidence: TEvidence;
  evaluator_version: string;
}

// ---------------------------------------------------------------------------
// Recipient snapshot contract -----------------------------------------------
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

export function isDryRunPassed(status: DryRunStatus): boolean {
  return (DRY_RUN_PASSED_STATUSES as readonly DryRunStatus[]).includes(status);
}

export function isDryRunStageSuccess(status: DryRunStatus): boolean {
  return (DRY_RUN_STAGE_SUCCESS_STATUSES as readonly DryRunStatus[]).includes(
    status,
  );
}

export function isDryRunTerminal(status: DryRunStatus): boolean {
  return (DRY_RUN_TERMINAL_STATUSES as readonly DryRunStatus[]).includes(status);
}

export function emptyDryRunEnvelope(
  status: DryRunStatus,
  overrides: Partial<DryRunContractV1Envelope> = {},
): DryRunContractV1Envelope {
  return {
    contract_version: DRY_RUN_CONTRACT_VERSION,
    status,
    state: "UNKNOWN",
    passed: isDryRunPassed(status),
    stage_succeeded: isDryRunStageSuccess(status),
    terminal: isDryRunTerminal(status),
    idempotent_replay: false,
    failure_stage: null,
    message: "",
    validated_at: null,
    execution_deadline_at: null,
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
 * Assert an envelope produced by the SQL/Edge layer is well-formed AND that
 * `passed`/`stage_succeeded`/`terminal` obey the checkpoint-2 semantics.
 */
export function assertDryRunContractV1(
  input: unknown,
): asserts input is DryRunContractV1Envelope {
  const e = input as Partial<DryRunContractV1Envelope> | null;
  if (!e || typeof e !== "object") throw new Error("envelope: not an object");
  if (e.contract_version !== DRY_RUN_CONTRACT_VERSION) {
    throw new Error(
      `envelope: contract_version must be ${DRY_RUN_CONTRACT_VERSION}`,
    );
  }
  if (typeof e.status !== "string") throw new Error("envelope: status missing");
  if ((e.status as string) === "IDEMPOTENT") {
    throw new Error(
      'envelope: generic "IDEMPOTENT" status is rejected — use stage status + idempotent_replay=true',
    );
  }
  const status = e.status as DryRunStatus;
  if (typeof e.state !== "string") throw new Error("envelope: state missing");
  if (typeof e.passed !== "boolean") throw new Error("envelope: passed missing");
  if (typeof e.stage_succeeded !== "boolean") {
    throw new Error("envelope: stage_succeeded missing");
  }
  if (typeof e.terminal !== "boolean") throw new Error("envelope: terminal missing");
  if (typeof e.idempotent_replay !== "boolean") {
    throw new Error("envelope: idempotent_replay missing");
  }
  if (typeof e.message !== "string") throw new Error("envelope: message missing");

  // Invariants -----------------------------------------------------------
  const expectedPassed = isDryRunPassed(status);
  if (e.passed !== expectedPassed) {
    throw new Error(
      `envelope: passed=${e.passed} but status=${status} requires passed=${expectedPassed}`,
    );
  }
  const expectedStageSuccess = isDryRunStageSuccess(status);
  if (e.stage_succeeded !== expectedStageSuccess) {
    throw new Error(
      `envelope: stage_succeeded=${e.stage_succeeded} but status=${status} requires stage_succeeded=${expectedStageSuccess}`,
    );
  }
  if (status === "FAILED" && !e.terminal) {
    throw new Error("envelope: FAILED must be terminal");
  }
  if (status === "CERTIFIED" && !e.terminal) {
    throw new Error("envelope: CERTIFIED must be terminal");
  }

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
