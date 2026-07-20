/**
 * BN-MORT-UI-RECOVERY-2E §2 §10 — BenefitsQueryLifecycle unit tests.
 *
 * Verifies cache cancellation and removal on identity or authGeneration
 * change, and that unrelated caches are preserved.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Mock the auth hook so we can drive identity/generation transitions.
const useSupabaseAuthMock = vi.fn();
vi.mock('@/contexts/SupabaseAuthContext', () => ({
  useSupabaseAuth: () => useSupabaseAuthMock(),
}));

import { BenefitsQueryLifecycle } from '../BenefitsQueryLifecycle';

const BENEFITS_KEY = ['bn-benefits-query', 'BN_MORTALITY_LIST_EVENTS'];
const OTHER_KEY = ['some-other-feature'];

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
    },
  });
}

function wrapWith(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('BenefitsQueryLifecycle', () => {
  beforeEach(() => {
    useSupabaseAuthMock.mockReset();
  });

  it('does nothing on first render when identity is stable', () => {
    useSupabaseAuthMock.mockReturnValue({ user: { id: 'user-a' }, authGeneration: 1 });
    const qc = makeClient();
    qc.setQueryData(BENEFITS_KEY, { ok: true });
    qc.setQueryData(OTHER_KEY, { keep: true });

    render(<BenefitsQueryLifecycle />, { wrapper: wrapWith(qc) });

    expect(qc.getQueryData(BENEFITS_KEY)).toEqual({ ok: true });
    expect(qc.getQueryData(OTHER_KEY)).toEqual({ keep: true });
  });

  it('removes bn-benefits-query entries when user identity changes', () => {
    useSupabaseAuthMock.mockReturnValue({ user: { id: 'user-a' }, authGeneration: 1 });
    const qc = makeClient();
    qc.setQueryData(BENEFITS_KEY, { user: 'a' });
    qc.setQueryData(OTHER_KEY, { keep: true });

    const { rerender } = render(<BenefitsQueryLifecycle />, { wrapper: wrapWith(qc) });

    // User B signs in.
    useSupabaseAuthMock.mockReturnValue({ user: { id: 'user-b' }, authGeneration: 2 });
    rerender(<BenefitsQueryLifecycle />);

    expect(qc.getQueryData(BENEFITS_KEY)).toBeUndefined();
    // Unrelated cache is preserved.
    expect(qc.getQueryData(OTHER_KEY)).toEqual({ keep: true });
  });

  it('removes bn-benefits-query entries when authGeneration changes (sign-out)', () => {
    useSupabaseAuthMock.mockReturnValue({ user: { id: 'user-a' }, authGeneration: 1 });
    const qc = makeClient();
    qc.setQueryData(BENEFITS_KEY, { user: 'a' });

    const { rerender } = render(<BenefitsQueryLifecycle />, { wrapper: wrapWith(qc) });

    // Sign out — user becomes null, generation bumps.
    useSupabaseAuthMock.mockReturnValue({ user: null, authGeneration: 2 });
    rerender(<BenefitsQueryLifecycle />);

    expect(qc.getQueryData(BENEFITS_KEY)).toBeUndefined();
  });

  it('calls cancelQueries with the benefits root key on identity change', () => {
    useSupabaseAuthMock.mockReturnValue({ user: { id: 'user-a' }, authGeneration: 1 });
    const qc = makeClient();
    const cancelSpy = vi.spyOn(qc, 'cancelQueries');
    const removeSpy = vi.spyOn(qc, 'removeQueries');

    const { rerender } = render(<BenefitsQueryLifecycle />, { wrapper: wrapWith(qc) });

    useSupabaseAuthMock.mockReturnValue({ user: { id: 'user-b' }, authGeneration: 2 });
    rerender(<BenefitsQueryLifecycle />);

    expect(cancelSpy).toHaveBeenCalledWith({ queryKey: ['bn-benefits-query'], exact: false });
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['bn-benefits-query'], exact: false });
  });
});
