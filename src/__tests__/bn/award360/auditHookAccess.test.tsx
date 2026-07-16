/**
 * BN-AWARD360-B4B — Audit hook denied-query gate.
 * Separate file so the service mock does not affect the loader tests in
 * auditTimeline.test.tsx.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/services/bn/awards/award360Service', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    listAwardAuditPaged: vi.fn(() =>
      Promise.resolve({ rows: [], total: 0, page: 1, pageSize: 25, summary: {}, warnings: [], sources: [] }),
    ),
  };
});

import { useAwardAuditPaged } from '@/pages/bn/awards/award-360/useAward360Queries';
import { listAwardAuditPaged as mockedPaged } from '@/services/bn/awards/award360Service';

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

describe('BN-AWARD360-B4B audit hook — denied query gate', () => {
  it('useAwardAuditPaged with enabled=false never calls the service', async () => {
    (mockedPaged as any).mockClear();
    const wrapper = makeWrapper();
    renderHook(
      () =>
        useAwardAuditPaged(
          { awardId: 'a1', page: 1, pageSize: 25 },
          { includeCentralAudit: false },
          false,
        ),
      { wrapper },
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(mockedPaged).not.toHaveBeenCalled();
  });

  it('useAwardAuditPaged with enabled=true DOES call the service (sanity)', async () => {
    (mockedPaged as any).mockClear();
    const wrapper = makeWrapper();
    renderHook(
      () =>
        useAwardAuditPaged(
          { awardId: 'a1', page: 1, pageSize: 25 },
          { includeCentralAudit: true },
          true,
        ),
      { wrapper },
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(mockedPaged).toHaveBeenCalledTimes(1);
  });
});
