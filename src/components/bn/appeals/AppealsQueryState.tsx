/**
 * BN-AP-01 Turn 2.2a §D — Shared Appeals query-state component.
 *
 * Centralises how every Appeals read screen renders:
 *   - loading (with contextual skeletons)
 *   - successful empty state (contextual message, distinct from failures)
 *   - typed failures classified by BenefitsQueryExecutionError:
 *       DENIED, INVALID, NOT_FOUND, FAILED (with correlation ID + Retry),
 *       TRANSPORT_FAILURE, MALFORMED_RESPONSE,
 *       QUERY_CODE_NOT_REGISTERED / service version mismatch
 *
 * Retry is offered ONLY for retryable failures. DENIED never gets a
 * Retry button, and never falls back to a zero/empty successful state.
 */
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, LockKeyhole, ServerCrash, RefreshCw, WifiOff } from 'lucide-react';
import {
  BenefitsQueryExecutionError,
  isBenefitsQueryExecutionError,
} from '@/services/bn/queries/benefitsQueryExecutionError';

export interface AppealsQueryLike<T> {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error?: unknown;
  data?: { data?: T | null } | null | undefined;
  refetch?: () => unknown;
}

export interface AppealsQueryStateProps<T> {
  /** The React Query result to inspect. */
  query: AppealsQueryLike<T>;
  /** Optional predicate to decide when success data represents an empty result. */
  isEmpty?: (data: T | null | undefined) => boolean;
  /** Contextual copy for the empty state (e.g., "No appeals in this view."). */
  emptyTitle?: string;
  emptyMessage?: string;
  /** Custom loading node — defaults to skeleton rows. */
  loading?: React.ReactNode;
  /** Number of skeleton rows to render in the default loading state. */
  loadingRows?: number;
  /** Optional wrapper class for the state block. */
  className?: string;
  /** Rendered when the query resolves with non-empty data. */
  children: (data: T) => React.ReactNode;
}

/**
 * Classified error copy so pages don't hand-roll generic "Failed to load"
 * banners. Callers can override by inspecting the error themselves if a
 * screen needs bespoke messaging.
 */
export function classifyAppealsQueryError(error: unknown): {
  kind:
    | 'DENIED'
    | 'INVALID'
    | 'NOT_FOUND'
    | 'FAILED'
    | 'TRANSPORT_FAILURE'
    | 'MALFORMED_RESPONSE'
    | 'QUERY_CODE_NOT_REGISTERED'
    | 'VERSION_MISMATCH'
    | 'UNKNOWN';
  title: string;
  message: string;
  correlationId: string | null;
  retryable: boolean;
} {
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
    if (primary === 'QUERY_CODE_NOT_REGISTERED') {
      return {
        kind: 'QUERY_CODE_NOT_REGISTERED',
        title: 'Service version mismatch',
        message:
          'This screen is calling a query the backend has not published yet. A deployment is likely in progress — try again shortly.',
        correlationId,
        retryable: true,
      };
    }
    if (primary === 'MALFORMED_RESPONSE') {
      return {
        kind: 'MALFORMED_RESPONSE',
        title: 'Service version mismatch',
        message:
          'The backend returned an unexpected response shape. This usually clears once the latest edge function is live.',
        correlationId,
        retryable: true,
      };
    }
    if (primary === 'TRANSPORT_FAILURE') {
      return {
        kind: 'TRANSPORT_FAILURE',
        title: 'Service temporarily unreachable',
        message: 'We could not reach the Benefits service. Please retry.',
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

export function AppealsQueryState<T>({
  query,
  isEmpty,
  emptyTitle = 'No records',
  emptyMessage = 'There are no records to display in this view.',
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

  if (query.isError) {
    const info = classifyAppealsQueryError(query.error);
    const Icon =
      info.kind === 'DENIED'
        ? LockKeyhole
        : info.kind === 'TRANSPORT_FAILURE'
          ? WifiOff
          : info.kind === 'QUERY_CODE_NOT_REGISTERED' || info.kind === 'MALFORMED_RESPONSE'
            ? ServerCrash
            : AlertCircle;
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
