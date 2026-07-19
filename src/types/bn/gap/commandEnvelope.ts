/**
 * BN Gap Modules — Portable Command Envelope
 *
 * Every state-changing gap-module command MUST arrive at the server-side
 * command boundary wearing this envelope. It is designed to map cleanly onto
 * either a Supabase Edge Function invocation *today* or an ASP.NET Core
 * Web API `POST /commands/{commandName}` *tomorrow* — without React screens
 * or hooks changing.
 *
 * See docs/bn/contracts/command-envelope.md for the field contract.
 */

/** Canonical gap-module codes registered in app_modules. */
export type BnGapModuleCode =
  | 'bn_mortality'
  | 'bn_overpayments'
  | 'bn_appeals'
  | 'bn_means_tests'
  | 'bn_risk_management'
  | 'bn_uprating';

/**
 * Envelope carried by every command request. All properties are transport-
 * neutral and safe to serialise as JSON over HTTP.
 */
export interface BnGapCommandEnvelope<TPayload = unknown> {
  /** Stable command name, e.g. "BN_GAP_PING". SCREAMING_SNAKE_CASE. */
  readonly commandName: string;
  /** Semver-major command contract version. */
  readonly commandVersion: number;
  /** Client-generated UUID; replaying with the same key returns the prior result. */
  readonly idempotencyKey: string;
  /** UUID for cross-service tracing; propagates into logs and audit rows. */
  readonly correlationId: string;
  /** Optional UUID of the command/event that caused this command. */
  readonly causationId?: string;
  /** Owning module registration name (must match app_modules.name). */
  readonly moduleCode: BnGapModuleCode;
  /** Domain entity type ("bn_overpayment", "bn_appeal", ...). Free-form but stable. */
  readonly entityType: string;
  /** Entity UUID when acting on an existing row; null for creation commands. */
  readonly entityId: string | null;
  /** Authenticated principal — server MUST re-validate; never trust the wire. */
  readonly actorUserId: string;
  /** BN audit user_code (`requireUserCode`). Never "SYSTEM". */
  readonly actorUserCode: string;
  /** Roles asserted by the caller; server treats as a HINT only. */
  readonly actorRoles: readonly string[];
  /** Stable business reason code (e.g. "APPEAL_UPHELD"). */
  readonly reasonCode?: string;
  /** Free-text justification (audited). */
  readonly justification?: string;
  /**
   * Optimistic-concurrency token from the row the caller believes it is
   * mutating. Compared against the current row_version at execution time.
   * PostgreSQL: bigint; SQL Server: rowversion (base64 string). Kept as
   * string for portability.
   */
  readonly expectedRowVersion?: string;
  /** UTC ISO-8601 timestamp of client-side request creation. */
  readonly requestedAtUtc: string;
  /** Command-specific payload; typed per command handler. */
  readonly payload: TPayload;
}
