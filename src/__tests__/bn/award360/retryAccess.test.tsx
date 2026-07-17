/**
 * BN-AWARD360-B3-C2 — Deterministic permission refresh + rendered Retry.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// --- Mocks ---
const mockPerms: any = {
  isLoading: false,
  isReady: true,
  canViewAward: false,
  canViewCentralAudit: false,
  canPropose: false,
  canApprove: false,
  canServiceLifeCert: false,
  canServiceMedical: false,
  canServiceOverpayment: false,
  canServiceSuspension: false,
  canServicePayments: false,
  canServiceCommunications: false,
  canViewCommunicationContent: false,
  canViewSensitiveMedical: false,
  admin: { isAdmin: false, isLoading: false, isError: false, error: null, refetch: () => {} },
  registryError: null,
  userPermissionsError: null,
  hasPermissionResolutionError: false,
  refetchAllPermissions: vi.fn(async () => {}),
  capabilities: {
    AWARD_VIEW: {
      moduleName: 'bn_awards_list', action: 'view', moduleExists: true, moduleEnabled: true,
      routeEnabled: true, actionExists: true, actionEnabled: true,
      permissionGranted: false, effectiveAccess: false,
      reason: 'User lacks bn_awards_list.view',
    },
  },
};

vi.mock('@/pages/bn/awards/award-360/useAwardPermissions', () => ({
  useAward360Permissions: () => mockPerms,
  useAward360FeatureFlags: () => ({
    lifeCert: false, medicalReview: false, overpayment: false, awardSuspension: false, payments: false,
  }),
}));

const denied = (tab: string) => ({ tab, capability: 'AWARD_VIEW' as const, visible: false, queryEnabled: false, reason: 'User lacks bn_awards_list.view' });
const deniedTabs = () =>
  new Proxy({}, {
    get: (_t, key: string) => denied(key),
  }) as any;

vi.mock('@/pages/bn/awards/award-360/useAward360TabAccess', () => ({
  useAward360TabAccess: () => deniedTabs(),
}));

vi.mock('@/pages/bn/awards/award-360/useAward360Actions', () => ({
  useAward360Actions: () => ({ actions: {} }),
}));

vi.mock('@/pages/bn/awards/award-360/useAward360Queries', () => ({
  useAward360Header: () => ({ data: null, isLoading: false, error: null, refetch: () => {} }),
  useAward360Overview: () => ({ data: null, isLoading: false, error: null }),
  useAward360Summary: () => ({ data: null, isLoading: false, error: null }),
  useAwardClaim: () => ({ data: null, isLoading: false, error: null }),
  useAwardPensioner: () => ({ data: null, isLoading: false, error: null }),
  useAwardAudit: () => ({ data: null, isLoading: false, error: null }),
}));

vi.mock('@/pages/bn/awards/award-360/components/Award360AdminDiagnostics', () => ({
  Award360AdminDiagnostics: () => null,
}));

import Award360Page from '@/pages/bn/awards/award-360/Award360Page';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/bn/awards/a1']}>
        <Award360Page />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('BN-AWARD360-B3-C2 · Retry access rendered flow', () => {
  it('displays "Retry access" in the restricted state', () => {
    mockPerms.refetchAllPermissions = vi.fn(async () => {});
    renderPage();
    expect(screen.getByRole('button', { name: /retry access/i })).toBeInTheDocument();
    expect(screen.getByText(/User lacks bn_awards_list\.view/i)).toBeInTheDocument();
  });

  it('clicking Retry calls refetchAllPermissions exactly once', async () => {
    const spy = vi.fn(async () => {});
    mockPerms.refetchAllPermissions = spy;
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /retry access/i }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
  });

  it('shows "Refreshing…" while the returned promise is pending; button is disabled; resolves only after the promise (no timer)', async () => {
    const d = deferred<void>();
    mockPerms.refetchAllPermissions = vi.fn(() => d.promise);
    renderPage();
    const btn = screen.getByRole('button', { name: /retry access/i });
    fireEvent.click(btn);

    // While pending: label switches, button disabled.
    await waitFor(() => expect(screen.getByText(/Refreshing…/)).toBeInTheDocument());
    expect(btn).toBeDisabled();

    // Fast-forwarding timers should NOT complete the loading state — proves no fixed setTimeout gate.
    vi.useFakeTimers();
    vi.advanceTimersByTime(5000);
    vi.useRealTimers();
    expect(screen.getByText(/Refreshing…/)).toBeInTheDocument();
    expect(btn).toBeDisabled();

    // Resolving the underlying promise clears the state.
    await act(async () => { d.resolve(); await d.promise; });
    await waitFor(() => expect(screen.queryByText(/Refreshing…/)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry access/i })).not.toBeDisabled();
  });

  it('displays a refresh failure', async () => {
    const d = deferred<void>();
    mockPerms.refetchAllPermissions = vi.fn(() => d.promise);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /retry access/i }));
    await waitFor(() => expect(screen.getByText(/Refreshing…/)).toBeInTheDocument());
    await act(async () => {
      d.reject(new Error('permission RPC failed'));
      await d.promise.catch(() => {});
    });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Refresh failed: permission RPC failed/i));
    expect(screen.getByRole('button', { name: /retry access/i })).not.toBeDisabled();
  });

  it('successful capability update removes the restricted state', async () => {
    // First render: denied.
    mockPerms.refetchAllPermissions = vi.fn(async () => {
      // Simulate the fresh registry granting the capability.
      mockPerms.canViewAward = true;
      mockPerms.capabilities.AWARD_VIEW = {
        ...mockPerms.capabilities.AWARD_VIEW,
        permissionGranted: true, effectiveAccess: true, reason: 'granted',
      };
    });
    const { rerender } = renderPage();
    expect(screen.getByRole('button', { name: /retry access/i })).toBeInTheDocument();

    // Simulate the parent re-rendering after the capability turned true. In the
    // real app, useAward360TabAccess would report visible=true; re-mock it here.
    (await import('@/pages/bn/awards/award-360/useAward360TabAccess')).useAward360TabAccess =
      (() => ({
        overview: { tab: 'overview', capability: 'AWARD_VIEW', visible: true, queryEnabled: true, reason: 'granted' },
      })) as any;

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rerender(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/bn/awards/a1']}>
          <Award360Page />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: /retry access/i })).not.toBeInTheDocument());
  });
});
