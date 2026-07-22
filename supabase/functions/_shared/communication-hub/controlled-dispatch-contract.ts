/**
 * PHASE_4B3 Slice 1 — Canonical Targeted Controlled-Live Dispatcher Contract.
 *
 * Single source of truth for the response envelope returned by the
 * `comm-hub-dispatch` function when handling `operation ==
 * "targeted_controlled_live"`, and for the typed action union that both
 * the orchestrator (`comm-hub-controlled-live-test`) and the dispatcher
 * MUST agree on.
 *
 * This module intentionally has no runtime dependencies so it can be
 * imported by Deno edge functions and vitest suites alike without
 * pulling in Supabase clients or environment variables.
 */

export const CONTROLLED_DISPATCH_SCHEMA_VERSION = "controlled-dispatch.v1" as const;

export type ControlledDispatchAction =
  | "RUN_CONTROLLED_STUB"
  | "SEND_ONE_REAL_EMAIL";

export const CONTROLLED_DISPATCH_ACTIONS: ReadonlyArray<ControlledDispatchAction> = [
  "RUN_CONTROLLED_STUB",
  "SEND_ONE_REAL_EMAIL",
];

export type ControlledDispatchOperation = "targeted_controlled_live";

export type ControlledDispatchStatus =
  | "BLOCKED"
  | "DISPATCH_FAILED"
  | "PROVIDER_REJECTED"
  | "PROVIDER_ACCEPTED"
  | "DELIVERY_PENDING"
  | "DELIVERED";

/**
 * Canonical blocker structure. Deduplicated by `code + stage` at the
 * envelope layer. Only the primary operator blocker for a given failure
 * should carry `recommended_action` — generic transport codes should
 * remain as safe metadata only.
 */
export interface ControlledDispatchBlocker {
  code: string;
  stage?: string | null;
  message?: string | null;
  retry_safe?: boolean | null;
  recommended_action?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ControlledDispatchEnvelope {
  schema_version: typeof CONTROLLED_DISPATCH_SCHEMA_VERSION;
  operation: ControlledDispatchOperation;
  action: ControlledDispatchAction | null;
  status: ControlledDispatchStatus;
  passed: boolean;
  idempotent_replay: boolean;
  retry_safe: boolean;
  automatic_retry_allowed: boolean;
  existing_message_dispatchable: boolean;
  requires_new_execution: boolean;
  requires_new_grant: boolean;
  requires_new_preview: boolean;
  requires_new_dry_run: boolean;
  reconciliation_required: boolean;
  request_id: string | null;
  message_id: string | null;
  execution_id: string | null;
  grant_id: string | null;
  grant_status: string | null;
  delivery_attempt_id: string | null;
  trace_id: string | null;
  original_decision_id: string | null;
  revalidation_decision_id: string | null;
  provider_adapter_invoked: boolean;
  provider_call_attempted: boolean;
  external_provider_call_attempted: boolean;
  simulated: boolean;
  provider_name: string | null;
  provider_message_id: string | null;
  provider_status: string | null;
  provider_response_safe: unknown;
  recipient_set_hash: string | null;
  subject_hash: string | null;
  body_html_hash: string | null;
  body_text_hash: string | null;
  body_hash: string | null;
  content_hash: string | null;
  blockers: ControlledDispatchBlocker[];
  warnings: unknown[];
  failure_stage: string | null;
  started_at: string;
  completed_at: string;
}

/** Build an empty envelope with safe defaults. */
export function emptyControlledDispatchEnvelope(startedAt: string): ControlledDispatchEnvelope {
  return {
    schema_version: CONTROLLED_DISPATCH_SCHEMA_VERSION,
    operation: "targeted_controlled_live",
    action: null,
    status: "BLOCKED",
    passed: false,
    idempotent_replay: false,
    retry_safe: false,
    automatic_retry_allowed: false,
    existing_message_dispatchable: false,
    requires_new_execution: false,
    requires_new_grant: false,
    requires_new_preview: false,
    requires_new_dry_run: false,
    reconciliation_required: false,
    request_id: null,
    message_id: null,
    execution_id: null,
    grant_id: null,
    grant_status: null,
    delivery_attempt_id: null,
    trace_id: null,
    original_decision_id: null,
    revalidation_decision_id: null,
    provider_adapter_invoked: false,
    provider_call_attempted: false,
    external_provider_call_attempted: false,
    simulated: false,
    provider_name: null,
    provider_message_id: null,
    provider_status: null,
    provider_response_safe: null,
    recipient_set_hash: null,
    subject_hash: null,
    body_html_hash: null,
    body_text_hash: null,
    body_hash: null,
    content_hash: null,
    blockers: [],
    warnings: [],
    failure_stage: null,
    started_at: startedAt,
    completed_at: startedAt,
  };
}

/** Minimum required fields for an object to be treated as a canonical envelope. */
const REQUIRED_ENVELOPE_KEYS: ReadonlyArray<keyof ControlledDispatchEnvelope> = [
  "schema_version",
  "operation",
  "status",
  "blockers",
  "warnings",
];

export function isControlledDispatchEnvelope(value: unknown): value is ControlledDispatchEnvelope {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.schema_version !== CONTROLLED_DISPATCH_SCHEMA_VERSION) return false;
  if (v.operation !== "targeted_controlled_live") return false;
  for (const k of REQUIRED_ENVELOPE_KEYS) {
    if (!(k in v)) return false;
  }
  if (!Array.isArray(v.blockers)) return false;
  if (!Array.isArray(v.warnings)) return false;
  return true;
}

/**
 * Add a blocker to an envelope, deduplicated by `code + stage`. If a
 * blocker with the same key already exists, its message/metadata are
 * left untouched — the first precise blocker wins.
 */
export function appendBlocker(env: ControlledDispatchEnvelope, blocker: ControlledDispatchBlocker): void {
  const key = `${blocker.code}::${blocker.stage ?? ""}`;
  const exists = env.blockers.some((b) => `${b.code}::${b.stage ?? ""}` === key);
  if (!exists) env.blockers.push(blocker);
}

/** Blocker codes that describe transport/shape failures, not business rules. */
export const TRANSPORT_BLOCKER_CODES = {
  DISPATCHER_UNREACHABLE: "dispatcher_unreachable",
  DISPATCHER_TIMEOUT: "dispatcher_timeout",
  DISPATCHER_RESPONSE_EMPTY: "dispatcher_response_empty",
  DISPATCHER_RESPONSE_NOT_JSON: "dispatcher_response_not_json",
  DISPATCHER_RESPONSE_CONTRACT_INVALID: "dispatcher_response_contract_invalid",
  /** Legacy fallback — only for truly unrecognised transport failures. */
  DISPATCHER_HTTP_ERROR: "dispatcher_http_error",
} as const;

/** Blocker codes for action-contract violations. */
export const ACTION_BLOCKER_CODES = {
  TARGETED_ACTION_MISSING: "targeted_action_missing",
  TARGETED_ACTION_INVALID: "targeted_action_invalid",
  TARGETED_OPERATION_ACTION_MISMATCH: "targeted_operation_action_mismatch",
  REAL_EMAIL_ACTION_NOT_ENABLED: "real_email_action_not_enabled",
  TARGETED_OPERATION_NOT_SUPPORTED: "targeted_operation_not_supported",
} as const;
