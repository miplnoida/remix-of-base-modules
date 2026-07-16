/**
 * BN-AWARD360-B4A-C1 — Real denied-query test.
 *
 * Uses renderHook + a fresh QueryClient to prove that when `enabled=false`
 * is passed to useAwardMedicalReviewsPaged / useAwardMedicalReviewDetail,
 * the underlying service function is NEVER invoked. No source-text
 * inspection — this exercises real React Query behaviour.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Spy on the service module BEFORE importing the hooks.
vi.mock('@/services/bn/awards/award360Service', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    listAwardMedicalReviewsPaged: vi.fn(() =>
      Promise.resolve({ rows: [], total: 0, page: 1, pageSize: 25, summary: {}, warnings: [] }),
    ),
    getAwardMedicalReviewDetail: vi.fn(() =>
      Promise.resolve({ row: null, warnings: [] }),
    ),
  };
});

import {
  useAwardMedicalReviewsPaged,
  useAwardMedicalReviewDetail,
} from '@/pages/bn/awards/award-360/useAward360Queries';
import {
  listAwardMedicalReviewsPaged,
  getAwardMedicalReviewDetail,
} from '@/services/bn/awards/award360Service';

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

describe('BN-AWARD360-B4A-C1 medical review hooks — denied-query behaviour', () => {
  it('useAwardMedicalReviewsPaged with enabled=false never calls the service', async () => {
    (listAwardMedicalReviewsPaged as any).mockClear();
    const wrapper = makeWrapper();
    const { result } = renderHook(
      () =>
        useAwardMedicalReviewsPaged(
          { awardId: 'a1', page: 1, pageSize: 25 },
          { canViewSensitive: false },
          false, // enabled=false
        ),
      { wrapper },
    );
    // Give react-query a tick to attempt any scheduled fetches.
    await new Promise((r) => setTimeout(r, 20));
    expect(listAwardMedicalReviewsPaged).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useAwardMedicalReviewDetail with non-null id but enabled=false never calls the service', async () => {
    (getAwardMedicalReviewDetail as any).mockClear();
    const wrapper = makeWrapper();
    const { result } = renderHook(
      () =>
        useAwardMedicalReviewDetail(
          'mr-123', // non-null selected id
          { canViewSensitive: false },
          false, // enabled=false
        ),
      { wrapper },
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(getAwardMedicalReviewDetail).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useAwardMedicalReviewsPaged with enabled=true DOES call the service (sanity check)', async () => {
    (listAwardMedicalReviewsPaged as any).mockClear();
    const wrapper = makeWrapper();
    renderHook(
      () =>
        useAwardMedicalReviewsPaged(
          { awardId: 'a1', page: 1, pageSize: 25 },
          { canViewSensitive: true },
          true,
        ),
      { wrapper },
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(listAwardMedicalReviewsPaged).toHaveBeenCalledTimes(1);
  });
});
