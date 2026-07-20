/**
 * BN Benefits — Secure Query Result envelope.
 *
 * Uniform shape for every read that crosses the query boundary. Callers
 * never see raw DB rows — they receive a DTO shaped by the server-side
 * registry.
 */
export type BnBenefitsQueryStatus =
  | 'OK'
  | 'DENIED'
  | 'INVALID'
  | 'NOT_FOUND'
  | 'FAILED';

export interface BnBenefitsQueryError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
}

export interface BnBenefitsQueryResult<TData> {
  readonly status: BnBenefitsQueryStatus;
  readonly correlationId: string;
  readonly queryCode: string;
  readonly queryVersion: number;
  readonly data: TData | null;
  readonly page?: {
    readonly pageSize: number;
    readonly nextPageToken: string | null;
    readonly totalCount: number | null;
  };
  readonly errors: readonly BnBenefitsQueryError[];
  readonly maskedFields: readonly string[];
  readonly warnings: readonly string[];
}
