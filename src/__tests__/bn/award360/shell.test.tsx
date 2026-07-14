/**
 * BN-AWARD360-V2 — Shell rendering / tab navigation.
 * Mocks React Query hooks so the shell can render without touching Supabase.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/pages/bn/awards/award-360/useAward360Queries', () => {
  const q = <T,>(data: T) => ({ data, isLoading: false, error: null, refetch: vi.fn() }) as any;
  return {
    useAward360Header: () =>
      q({
        awardId: 'a-1',
        awardNumber: 'AWD-001',
        payeeName: 'Jane Doe',
        ssnMasked: '***-**-999',
        benefitName: 'Old Age',
        benefitCode: 'OA',
        awardType: 'PENSION',
        status: 'ACTIVE',
        baseAmount: 500,
        currentRate: 500,
        currency: 'XCD',
        frequency: 'MONTHLY',
        startDate: '2024-01-01',
        endDate: null,
        productVersion: '1',
        lastRefreshedAt: new Date().toISOString(),
      }),
    useAward360Overview: () =>
      q({
        beneficiaries: [],
        schedules: [],
        payments: [],
        lifeCertificates: [],
        medicalReviews: [],
        suspensions: [],
        overpayments: [],
        communications: [],
        warnings: [],
      }),
    useAwardClaim: () => q(null),
    useAwardPensioner: () => q(null),
    useAwardBeneficiaries: () => q([]),
    useAwardSchedules: () => q([]),
    useAwardPayments: () => q([]),
    useAwardLifeCertificates: () => q([]),
    useAwardMedicalReviews: () => q([]),
    useAwardSuspensions: () => q([]),
    useAwardOverpayments: () => q([]),
    useAwardCommunications: () => q([]),
    useAwardProduct: () => q(null),
    useAwardAudit: () => q([]),
  };
});

vi.mock('@/pages/bn/awards/award-360/useAwardPermissions', () => ({
  useAward360Permissions: () => ({
    canViewAward: true,
    canViewCentralAudit: false,
    canPropose: false,
    canApprove: false,
    canServiceLifeCert: true,
    canServiceMedical: true,
    canServiceOverpayment: true,
    canServiceSuspension: true,
    canServicePayments: true,
    canServiceCommunications: true,
    canViewSensitiveMedical: true,
    isLoading: false,
  }),
  useAward360FeatureFlags: () => ({
    lifeCert: true, medicalReview: true, overpayment: true, awardSuspension: true, payments: true,
  }),
}));

import Award360Page from '@/pages/bn/awards/award-360/Award360Page';

function renderAt(initialUrl: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route path="/bn/awards/:id" element={<Award360Page />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BN-AWARD360-V2 · shell', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the header and all 13 tabs', () => {
    renderAt('/bn/awards/a-1');
    expect(screen.getByText(/Award AWD-001/i)).toBeInTheDocument();
    const expectedTabs = ['Overview', 'Pensioner', 'Claim', 'Product', 'Beneficiaries', 'Schedule', 'Payments', 'Life Certs', 'Medical', 'Suspensions', 'Overpayments', 'Communications', 'Audit'];
    for (const label of expectedTabs) {
      expect(screen.getByRole('tab', { name: new RegExp(`^${label}$`) })).toBeInTheDocument();
    }
  });

  it('selects tab from ?tab= query param', () => {
    renderAt('/bn/awards/a-1?tab=payments');
    const paymentsTab = screen.getByRole('tab', { name: /^Payments$/ });
    expect(paymentsTab).toHaveAttribute('aria-selected', 'true');
  });

  it('changes tab on click', () => {
    renderAt('/bn/awards/a-1');
    fireEvent.click(screen.getByRole('tab', { name: /^Suspensions$/ }));
    expect(screen.getByRole('tab', { name: /^Suspensions$/ })).toHaveAttribute('aria-selected', 'true');
  });
});
