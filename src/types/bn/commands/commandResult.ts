/**
 * BN Gap Modules — Portable Command Result
 *
 * Uniform envelope for every server-authorised command outcome. Never leaks
 * server internals: `businessErrors` and `validationErrors` are safe to
 * surface to end users; raw SQL / stack traces are never included.
 *
 * See docs/bn/contracts/error-codes.md for the code catalogue.
 */

export type BnGapCommandStatus =
  /** Handler ran, state persisted, audit written. */
  | 'EXECUTED'
  /** Idempotency replay — this is the previously-stored result. */
  | 'REPLAYED'
  /** Blocked by capability/permission/rollout/module-registration. */
  | 'DENIED'
  /** Handler ran, business rules refused the transition. */
  | 'REJECTED'
  /** Optimistic concurrency conflict — client must reload the entity. */
  | 'CONFLICT'
  /** Envelope or payload failed structural validation. */
  | 'INVALID'
  /** Handler crashed; transaction rolled back. */
  | 'FAILED';

/** Stable error-code shape carried by every non-EXECUTED outcome. */
export interface BnGapCommandError {
  /** Machine-stable code (see error-codes.md). */
  readonly code: string;
  /** Human-readable, end-user-safe message. */
  readonly message: string;
  /** Optional dotted path locating the offending field within payload. */
  readonly field?: string;
}

export interface BnGapCommandWarning {
  readonly code: string;
  readonly message: string;
}

export interface BnGapCommandResult<TData = Record<string, unknown>> {
  readonly success: boolean;
  /** Server-assigned UUID for this execution. */
  readonly commandId: string;
  /** Echoed back from the envelope. */
  readonly correlationId: string;
  /** UUID of the affected entity (post-execute). */
  readonly entityId: string | null;
  /**
   * Row-version *after* the command. Present on EXECUTED / REPLAYED /
   * REJECTED-with-persisted-side-effects. Portable string.
   */
  readonly entityVersion: string | null;
  readonly status: BnGapCommandStatus;
  readonly warnings: readonly BnGapCommandWarning[];
  readonly validationErrors: readonly BnGapCommandError[];
  readonly businessErrors: readonly BnGapCommandError[];
  /** UUID of the row written to system_audit_trail (or equivalent). */
  readonly auditEventId: string | null;
  /**
   * Handler-shaped data. Omitted for DENIED/INVALID/FAILED. Always JSON-safe.
   */
  readonly data: TData | null;
}
