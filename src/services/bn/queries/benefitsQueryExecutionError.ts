/**
 * BN Benefits — Typed query execution error.
 *
 * The {@link SupabaseBenefitsQueryAdapter} throws this error for every
 * non-OK, non-NOT_FOUND envelope so React Query correctly sets
 * `isError=true` and hooks/pages never render `DENIED`/`INVALID`/`FAILED`
 * responses as successful empty datasets.
 *
 * `OK` and `NOT_FOUND` are returned as resolved values so callers can
 * distinguish "no such resource" from "cannot access resource".
 */
import type {
  BnBenefitsQueryError,
  BnBenefitsQueryStatus,
} from '@/types/bn/queries';

export type BenefitsQueryExecutionStatus = Exclude<BnBenefitsQueryStatus, 'OK' | 'NOT_FOUND'>;

/**
 * BN-MORT-UI-RECOVERY-2D.1 §5 — Category classifier.
 *
 * Distinguishes AUTH runtime failures (session lifecycle) from QUERY
 * service failures (edge-fn transport, RPC, deny/invalid). AUTH failures
 * must never be surfaced to the user as "query service unreachable" and
 * must not be wrapped inside {@link BenefitsQueryExecutionError} — the
 * auth-state boundary handles them page-level.
 */
export type BenefitsErrorCategory = 'AUTH' | 'QUERY';

const AUTH_ERROR_CODES = new Set([
  'AUTH_INITIALISING',
  'SESSION_TIMEOUT',
  'SESSION_EXPIRED',
  'REFRESH_FAILED',
  'UNAUTHENTICATED',
]);

const QUERY_ERROR_CODES = new Set([
  'DENIED',
  'INVALID',
  'TRANSPORT_FAILURE',
  'FUNCTION_NOT_DEPLOYED',
  'FUNCTION_STARTUP_FAILED',
  'DATABASE_UNAVAILABLE',
  'QUERY_FAILED',
  'MALFORMED_RESPONSE',
]);

export function classifyBenefitsError(code: string | null | undefined): BenefitsErrorCategory {
  if (!code) return 'QUERY';
  if (AUTH_ERROR_CODES.has(code)) return 'AUTH';
  if (QUERY_ERROR_CODES.has(code)) return 'QUERY';
  return 'QUERY';
}


export interface BenefitsQueryExecutionErrorInit {
  readonly status: BenefitsQueryExecutionStatus;
  readonly correlationId: string;
  readonly queryCode: string;
  readonly queryVersion: number;
  readonly errors: readonly BnBenefitsQueryError[];
  readonly maskedFields?: readonly string[];
  readonly warnings?: readonly string[];
}

/**
 * Thrown from the query adapter when the edge function reports a
 * non-successful envelope. Retains the correlation id and structured
 * error list so the UI can render an accurate access-denied /
 * validation / service-error state and offer retry only where safe.
 */
export class BenefitsQueryExecutionError extends Error {
  readonly name = 'BenefitsQueryExecutionError';
  readonly status: BenefitsQueryExecutionStatus;
  readonly correlationId: string;
  readonly queryCode: string;
  readonly queryVersion: number;
  readonly errors: readonly BnBenefitsQueryError[];
  readonly maskedFields: readonly string[];
  readonly warnings: readonly string[];

  constructor(init: BenefitsQueryExecutionErrorInit) {
    const first = init.errors[0];
    super(first?.message ?? `Benefits query ${init.status.toLowerCase()}.`);
    this.status = init.status;
    this.correlationId = init.correlationId;
    this.queryCode = init.queryCode;
    this.queryVersion = init.queryVersion;
    this.errors = init.errors;
    this.maskedFields = init.maskedFields ?? [];
    this.warnings = init.warnings ?? [];
  }

  /** True when the failure is a transient service/transport issue. */
  get isRetryable(): boolean {
    if (this.status !== 'FAILED') return false;
    const code = this.errors[0]?.code;
    return code === 'TRANSPORT_FAILURE' || code === 'INTERNAL_ERROR';
  }

  /** Primary error code, or a sensible fallback if the envelope was empty. */
  get primaryCode(): string {
    return this.errors[0]?.code ?? this.status;
  }
}

export function isBenefitsQueryExecutionError(
  err: unknown,
): err is BenefitsQueryExecutionError {
  return err instanceof BenefitsQueryExecutionError;
}
