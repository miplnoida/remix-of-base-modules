/**
 * BN-AP-CONFIG-1a §F — Executable tests for AppealsQueryState classifier
 * and adoption invariants.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AppealsQueryState,
  classifyAppealsQueryError,
} from '@/components/bn/appeals/AppealsQueryState';
import { BenefitsQueryExecutionError } from '@/services/bn/queries/benefitsQueryExecutionError';

function makeErr(status: any, code: string, message = 'test', correlationId = 'CID-123') {
  return new BenefitsQueryExecutionError({
    status,
    correlationId,
    queryCode: 'BN_TEST',
    queryVersion: 1,
    errors: [{ code, message }],
  });
}

describe('classifyAppealsQueryError', () => {
  it('classifies DENIED without Retry', () => {
    const c = classifyAppealsQueryError(makeErr('DENIED', 'DENIED'));
    expect(c.kind).toBe('DENIED');
    expect(c.retryable).toBe(false);
    expect(c.correlationId).toBe('CID-123');
  });

  it('classifies INVALID without Retry', () => {
    const c = classifyAppealsQueryError(makeErr('INVALID', 'INVALID'));
    expect(c.kind).toBe('INVALID');
    expect(c.retryable).toBe(false);
  });

  it('classifies TRANSPORT_FAILURE as retryable', () => {
    const c = classifyAppealsQueryError(makeErr('FAILED', 'TRANSPORT_FAILURE'));
    expect(c.kind).toBe('TRANSPORT_FAILURE');
    expect(c.retryable).toBe(true);
  });

  it('classifies FUNCTION_NOT_DEPLOYED explicitly, not generic FAILED', () => {
    const c = classifyAppealsQueryError(makeErr('FAILED', 'FUNCTION_NOT_DEPLOYED'));
    expect(c.kind).toBe('FUNCTION_NOT_DEPLOYED');
    expect(c.retryable).toBe(true);
    expect(c.title).toMatch(/unreachable/i);
  });

  it('classifies FUNCTION_STARTUP_FAILED explicitly', () => {
    const c = classifyAppealsQueryError(makeErr('FAILED', 'FUNCTION_STARTUP_FAILED'));
    expect(c.kind).toBe('FUNCTION_STARTUP_FAILED');
    expect(c.retryable).toBe(true);
  });

  it('classifies DATABASE_UNAVAILABLE explicitly', () => {
    const c = classifyAppealsQueryError(makeErr('FAILED', 'DATABASE_UNAVAILABLE'));
    expect(c.kind).toBe('DATABASE_UNAVAILABLE');
    expect(c.retryable).toBe(true);
  });

  it('classifies QUERY_CODE_NOT_REGISTERED as service-version mismatch', () => {
    const c = classifyAppealsQueryError(makeErr('FAILED', 'QUERY_CODE_NOT_REGISTERED'));
    expect(c.kind).toBe('QUERY_CODE_NOT_REGISTERED');
    expect(c.title).toMatch(/version mismatch/i);
    expect(c.retryable).toBe(true);
  });

  it('classifies MALFORMED_RESPONSE as service-version mismatch', () => {
    const c = classifyAppealsQueryError(makeErr('FAILED', 'MALFORMED_RESPONSE'));
    expect(c.kind).toBe('MALFORMED_RESPONSE');
    expect(c.title).toMatch(/version mismatch/i);
    expect(c.retryable).toBe(true);
  });

  it('classifies INTERNAL_ERROR as retryable server failure', () => {
    const c = classifyAppealsQueryError(makeErr('FAILED', 'INTERNAL_ERROR'));
    expect(c.kind).toBe('INTERNAL_ERROR');
    expect(c.retryable).toBe(true);
  });

  it('classifies unknown non-Benefits errors as UNKNOWN', () => {
    const c = classifyAppealsQueryError(new Error('random'));
    expect(c.kind).toBe('UNKNOWN');
    expect(c.correlationId).toBeNull();
  });
});

describe('AppealsQueryState rendering', () => {
  const noop = () => {};

  it('renders skeleton loading', () => {
    const { container } = render(
      <AppealsQueryState query={{ isLoading: true, isError: false }}>
        {() => <div>content</div>}
      </AppealsQueryState>,
    );
    // skeleton uses aria-hidden divs; simplest signal is absence of "content"
    expect(container.textContent).not.toContain('content');
  });

  it('renders contextual empty state when array is empty', () => {
    render(
      <AppealsQueryState<any[]>
        query={{ isLoading: false, isError: false, data: { data: [] } }}
        emptyTitle="No hearings"
        emptyMessage="No hearings are scheduled."
      >
        {() => <div>content</div>}
      </AppealsQueryState>,
    );
    expect(screen.getByText('No hearings')).toBeInTheDocument();
    expect(screen.getByText('No hearings are scheduled.')).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('renders NOT_FOUND from resolved data.status without Retry', () => {
    render(
      <AppealsQueryState
        query={{ isLoading: false, isError: false, data: { status: 'NOT_FOUND', data: null, correlationId: 'X-9' }, refetch: noop }}
        notFoundTitle="Appeal not found"
        notFoundMessage="No appeal with that ID."
      >
        {() => <div>content</div>}
      </AppealsQueryState>,
    );
    expect(screen.getByText('Appeal not found')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    expect(screen.getByText(/X-9/)).toBeInTheDocument();
  });

  it('DENIED shows correlation ID and no Retry, even when refetch is supplied', () => {
    const refetch = vi.fn();
    render(
      <AppealsQueryState
        query={{ isLoading: false, isError: true, error: makeErr('DENIED', 'DENIED', 'nope'), refetch }}
      >
        {() => <div>content</div>}
      </AppealsQueryState>,
    );
    expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
    expect(screen.getByText(/CID-123/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    expect(refetch).not.toHaveBeenCalled();
  });

  it('TRANSPORT_FAILURE shows Retry and never renders children', () => {
    render(
      <AppealsQueryState
        query={{ isLoading: false, isError: true, error: makeErr('FAILED', 'TRANSPORT_FAILURE'), refetch: noop }}
      >
        {() => <div>content</div>}
      </AppealsQueryState>,
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('VERSION_MISMATCH (QUERY_CODE_NOT_REGISTERED) surfaces distinct title', () => {
    render(
      <AppealsQueryState
        query={{ isLoading: false, isError: true, error: makeErr('FAILED', 'QUERY_CODE_NOT_REGISTERED'), refetch: noop }}
      >
        {() => <div>content</div>}
      </AppealsQueryState>,
    );
    expect(screen.getByText(/version mismatch/i)).toBeInTheDocument();
  });

  it('renders children on successful non-empty data', () => {
    render(
      <AppealsQueryState<{ items: number[] }>
        query={{ isLoading: false, isError: false, data: { status: 'OK', data: { items: [1, 2] } } }}
        isEmpty={(d) => !d || d.items.length === 0}
      >
        {(d) => <div>rows:{d.items.length}</div>}
      </AppealsQueryState>,
    );
    expect(screen.getByText('rows:2')).toBeInTheDocument();
  });

  it('failure never renders zero-valued content (regression against zero-card summary)', () => {
    render(
      <AppealsQueryState
        query={{ isLoading: false, isError: true, error: makeErr('FAILED', 'INTERNAL_ERROR'), refetch: noop }}
        isEmpty={() => true}
        emptyTitle="EMPTY-SHOULD-NOT-APPEAR"
      >
        {() => <div>content</div>}
      </AppealsQueryState>,
    );
    expect(screen.queryByText('EMPTY-SHOULD-NOT-APPEAR')).not.toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
