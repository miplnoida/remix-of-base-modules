/**
 * BN-AP-01 / BN-AP-CONFIG-1a §B–C — Shared Appeals query-state component.
 *
 * Centralises how every Appeals read screen renders:
 *   - loading (with contextual skeletons)
 *   - successful empty state (contextual message, distinct from failures)
 *   - resolved NOT_FOUND envelopes (data.status === 'NOT_FOUND')
 *   - typed failures classified by BenefitsQueryExecutionError:
 *       DENIED, INVALID, FAILED (with correlation ID + Retry),
 *       TRANSPORT_FAILURE, MALFORMED_RESPONSE,
 *       QUERY_CODE_NOT_REGISTERED / service version mismatch,
 *       FUNCTION_NOT_DEPLOYED, FUNCTION_STARTUP_FAILED,
 *       DATABASE_UNAVAILABLE, QUERY_FAILED, INTERNAL_ERROR
 *
 * Retry is offered ONLY for retryable failures. DENIED / INVALID / NOT_FOUND
 * never get a Retry button, and never fall back to a zero/empty successful
 * state.
 *
 * IMPORTANT: This component is the ONLY sanctioned surface for Appeals
 * loading/error/empty UX. Do not hand-roll `isError`/`isLoading` blocks in
 * new Appeals code — extend the classifier here instead.
 */
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, LockKeyhole, ServerCrash, RefreshCw, WifiOff, FileQuestion } from 'lucide-react';
import {
  BenefitsQueryExecutionError,
  isBenefitsQueryExecutionError,
} from '@/services/bn/queries/benefitsQueryExecutionError';

export interface AppealsQueryLike<T> {
  isLoading: boolean;
  isError: boolean;
  isSuccess?: boolean;
  error?: unknown;
  data?: { data?: T | null; status?: string; correlationId?: string } | null | undefined;
  refetch?: () => unknown;
}

export type AppealsQueryStateKind =
  | 'DENIED'
  | 'INVALID'
  | 'NOT_FOUND'
  | 'FAILED'
  | 'TRANSPORT_FAILURE'
  | 'MALFORMED_RESPONSE'
  | 'QUERY_CODE_NOT_REGISTERED'
  | 'VERSION_MISMATCH'
  | 'FUNCTION_NOT_DEPLOYED'
  | 'FUNCTION_STARTUP_FAILED'
  | 'DATABASE_UNAVAILABLE'
  | 'QUERY_FAILED'
  | 'INTERNAL_ERROR'
  | 'UNKNOWN';

export interface AppealsQueryClassification {
  kind: AppealsQueryStateKind;
  title: string;
  message: string;
  correlationId: string | null;
  retryable: boolean;
}

export interface AppealsQueryStateProps<T> {
  query: AppealsQueryLike<T>;
  /** Predicate to decide when success data represents an empty result. */
  isEmpty?: (data: T | null | undefined) => boolean;
  /** Contextual copy for the empty state (e.g., "No appeals in this view."). */
  emptyTitle?: string;
  emptyMessage?: string;
  /** Contextual copy for a resolved NOT_FOUND envelope. */
  notFoundTitle?: string;
  notFoundMessage?: string;
  /** Custom loading node — defaults to skeleton rows. */
  loading?: React.ReactNode;
  loadingRows?: number;
  className?: string;
  children: (data: T) => React.ReactNode;
}

/**
 * Version-mismatch codes surface when the edge function build lags the
 * frontend registry. They must never render as generic "Failed to load".
 */
const VERSION_MISMATCH_CODES = new Set(['QUERY_CODE_NOT_REGISTERED', 'MALFORMED_RESPONSE']);

/**
 * Transient service-availability codes. Retry is always safe.
 */
const TRANSPORT_CODES = new Set([
  'TRANSPORT_FAILURE',
  'FUNCTION_NOT_DEPLOYED',
  'FUNCTION_STARTUP_FAILED',
]);

/**
 * Server-side transient failures where retry is offered but with a clear
 * "we tried the query and it failed" message.
 */
const SERVER_FAILURE_CODES = new Set([
  'DATABASE_UNAVAILABLE',
  'QUERY_FAILED',
  'INTERNAL_ERROR',
]);

export function classifyAppealsQueryError(error: unknown): AppealsQueryClassification {
  if (isBenefitsQueryExecutionError(error)) {
    const err = error as BenefitsQueryExecutionError;
    const primary = err.primaryCode;
    const correlationId = err.correlationId ?? null;

    if (err.status === 'DENIED') {
      return {
        kind: 'DENIED',
        title: 'Access denied',
        message:
          'Your account does not have permission to view this information. Contact an administrator if you believe this is incorrect.',
        correlationId,
        retryable: false,
      };
    }
    if (err.status === 'INVALID') {
      return {
        kind: 'INVALID',
        title: 'Invalid request',
        message: err.message || 'The request could not be validated.',
        correlationId,
        retryable: false,
      };
    }
    if (VERSION_MISMATCH_CODES.has(primary)) {
      return {
        kind: primary === 'QUERY_CODE_NOT_REGISTERED' ? 'QUERY_CODE_NOT_REGISTERED' : 'MALFORMED_RESPONSE',
        title: 'Service version mismatch',
        message:
          primary === 'QUERY_CODE_NOT_REGISTERED'
            ? 'This screen is calling a query the backend has not published yet. A deployment is likely in progress — try again shortly.'
            : 'The backend returned an unexpected response shape. This usually clears once the latest edge function is live.',
        correlationId,
        retryable: true,
      };
    }
    if (TRANSPORT_CODES.has(primary)) {
      return {
        kind: primary as AppealsQueryStateKind,
        title: 'Service temporarily unreachable',
        message:
          primary === 'FUNCTION_NOT_DEPLOYED'
            ? 'The Appeals service edge function is not yet deployed. Please retry shortly.'
            : primary === 'FUNCTION_STARTUP_FAILED'
              ? 'The Appeals service failed to start. Please retry shortly.'
              : 'We could not reach the Benefits service. Please retry.',
        correlationId,
        retryable: true,
      };
    }
    if (SERVER_FAILURE_CODES.has(primary)) {
      return {
        kind: primary as AppealsQueryStateKind,
        title: primary === 'DATABASE_UNAVAILABLE' ? 'Database unavailable' : 'Query failed',
        message:
          primary === 'DATABASE_UNAVAILABLE'
            ? 'The database is temporarily unavailable. Please retry shortly.'
            : err.message || 'The Benefits service reported a server error.',
        correlationId,
        retryable: true,
      };
    }
    return {
      kind: 'FAILED',
      title: 'Something went wrong',
      message: err.message || 'The Benefits service reported an error.',
      correlationId,
      retryable: err.isRetryable,
    };
  }
  return {
    kind: 'UNKNOWN',
    title: 'Something went wrong',
    message: 'An unexpected error occurred while loading this screen.',
    correlationId: null,
    retryable: true,
  };
}

function iconForKind(kind: AppealsQueryStateKind): React.ComponentType<{ className?: string }> {
  if (kind === 'DENIED') return LockKeyhole;
  if (kind === 'NOT_FOUND') return FileQuestion;
  if (TRANSPORT_CODES.has(kind)) return WifiOff;
  if (VERSION_MISMATCH_CODES.has(kind) || SERVER_FAILURE_CODES.has(kind)) return ServerCrash;
  return AlertCircle;
}

export function AppealsQueryState<T>({
  query,
  isEmpty,
  emptyTitle = 'No records',
  emptyMessage = 'There are no records to display in this view.',
  notFoundTitle = 'Not found',
  notFoundMessage = 'The record you requested no longer exists.',
  loading,
  loadingRows = 5,
  className,
  children,
}: AppealsQueryStateProps<T>): React.ReactElement {
  if (query.isLoading) {
    return (
      <div className={className}>
        {loading ?? (
          <div className="space-y-2">
            {Array.from({ length: loadingRows }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Thrown-error path (DENIED / INVALID / FAILED / TRANSPORT / VERSION MISMATCH).
  if (query.isError) {
    const info = classifyAppealsQueryError(query.error);
    const Icon = iconForKind(info.kind);
    return (
      <div className={className}>
        <Alert variant={info.kind === 'DENIED' ? 'destructive' : 'default'}>
          <Icon className="h-4 w-4" />
          <AlertTitle>{info.title}</AlertTitle>
          <AlertDescription>
            <div>{info.message}</div>
            {info.correlationId && (
              <div className="mt-2 font-mono text-xs text-muted-foreground">
                Correlation ID: {info.correlationId}
              </div>
            )}
            {info.retryable && query.refetch && (
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={() => query.refetch?.()}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Resolved-envelope NOT_FOUND: the adapter returns these as a resolved
  // value (not a throw) so callers can distinguish "no such resource" from
  // "cannot access resource". Render an explicit not-found state — never a
  // successful empty list.
  const envelopeStatus = query.data?.status;
  if (envelopeStatus === 'NOT_FOUND') {
    return (
      <div className={className}>
        <Alert>
          <FileQuestion className="h-4 w-4" />
          <AlertTitle>{notFoundTitle}</AlertTitle>
          <AlertDescription>
            <div>{notFoundMessage}</div>
            {query.data?.correlationId && (
              <div className="mt-2 font-mono text-xs text-muted-foreground">
                Correlation ID: {query.data.correlationId}
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const payload = (query.data?.data ?? null) as T | null;
  const empty = isEmpty
    ? isEmpty(payload)
    : payload == null || (Array.isArray(payload) && payload.length === 0);

  if (empty) {
    return (
      <div className={className}>
        <div className="text-sm text-muted-foreground text-center py-8">
          <div className="font-medium text-foreground">{emptyTitle}</div>
          <div className="mt-1">{emptyMessage}</div>
        </div>
      </div>
    );
  }

  return <div className={className}>{children(payload as T)}</div>;
}

export default AppealsQueryState;
