/**
 * BN-MORT-UI-RECOVERY-2F §3 — BnMortalityAuthState RTL coverage.
 *
 * Uses a shallow mock of useSupabaseAuth so we can drive the component
 * through every canonical AuthRuntimeStatus without spinning a real
 * provider or Supabase client.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { AuthRuntimeStatus } from '@/contexts/authStateMachine';

const retrySessionBootstrap = vi.fn();
const refreshSessionOnce = vi.fn();
const logout = vi.fn();

const authMock: {
  authRuntimeStatus: AuthRuntimeStatus;
  canRunAuthenticatedQueries: boolean;
  retrySessionBootstrap: typeof retrySessionBootstrap;
  refreshSessionOnce: typeof refreshSessionOnce;
  logout: typeof logout;
} = {
  authRuntimeStatus: 'INITIALISING',
  canRunAuthenticatedQueries: false,
  retrySessionBootstrap,
  refreshSessionOnce,
  logout,
};

vi.mock('@/contexts/SupabaseAuthContext', () => ({
  useSupabaseAuth: () => authMock,
}));

import { BnMortalityAuthState } from '@/pages/bn/mortality/components/BnMortalityAuthState';

const setAuth = (patch: Partial<typeof authMock>) => Object.assign(authMock, patch);
const Frame = () => <div data-testid="frame">FRAME</div>;
const Child = () => <div data-testid="child">CHILD</div>;

beforeEach(() => {
  retrySessionBootstrap.mockReset();
  refreshSessionOnce.mockReset();
  logout.mockReset();
  Object.assign(authMock, {
    authRuntimeStatus: 'INITIALISING' as AuthRuntimeStatus,
    canRunAuthenticatedQueries: false,
  });
});

describe('BnMortalityAuthState', () => {
  it('INITIALISING renders confirming-session and preserves page frame', () => {
    setAuth({ authRuntimeStatus: 'INITIALISING', canRunAuthenticatedQueries: false });
    render(<BnMortalityAuthState frame={<Frame />}><Child /></BnMortalityAuthState>);
    expect(screen.getByText(/Confirming your session/i)).toBeInTheDocument();
    expect(screen.getByTestId('frame')).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    expect(screen.queryByText(/Access Denied/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/query service unreachable/i)).not.toBeInTheDocument();
  });

  it('REFRESHING renders refreshing-session and hides children', () => {
    setAuth({ authRuntimeStatus: 'REFRESHING', canRunAuthenticatedQueries: false });
    render(<BnMortalityAuthState frame={<Frame />}><Child /></BnMortalityAuthState>);
    expect(screen.getByText(/Refreshing your session/i)).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('SESSION_TIMEOUT: Retry invokes retrySessionBootstrap and Sign-in invokes logout', () => {
    setAuth({ authRuntimeStatus: 'SESSION_TIMEOUT', canRunAuthenticatedQueries: false });
    render(<BnMortalityAuthState><Child /></BnMortalityAuthState>);
    expect(screen.getByText(/could not be confirmed/i)).toBeInTheDocument();
    expect(screen.queryByText(/query service unreachable/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry session/i }));
    expect(retrySessionBootstrap).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Sign in again/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('SESSION_EXPIRED offers only Sign in again — no automatic retry loop', () => {
    setAuth({ authRuntimeStatus: 'SESSION_EXPIRED', canRunAuthenticatedQueries: false });
    render(<BnMortalityAuthState><Child /></BnMortalityAuthState>);
    expect(screen.getByText(/session has expired/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in again/i })).toBeInTheDocument();
    expect(refreshSessionOnce).not.toHaveBeenCalled();
  });

  it('REFRESH_FAILED: Retry invokes refreshSessionOnce, not classified as query failure', () => {
    setAuth({ authRuntimeStatus: 'REFRESH_FAILED', canRunAuthenticatedQueries: false });
    render(<BnMortalityAuthState><Child /></BnMortalityAuthState>);
    expect(screen.getByText(/could not refresh your session/i)).toBeInTheDocument();
    // Copy explicitly disclaims a query/database classification.
    expect(screen.getByText(/not a query or database error/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(refreshSessionOnce).toHaveBeenCalledTimes(1);
  });

  it('UNAUTHENTICATED renders signed-out state without invoking authenticated child content', () => {
    setAuth({ authRuntimeStatus: 'UNAUTHENTICATED', canRunAuthenticatedQueries: false });
    render(<BnMortalityAuthState><Child /></BnMortalityAuthState>);
    expect(screen.getByText(/signed out/i)).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('AUTHENTICATED + canRunAuthenticatedQueries=true renders children exactly once', () => {
    setAuth({ authRuntimeStatus: 'AUTHENTICATED', canRunAuthenticatedQueries: true });
    render(<BnMortalityAuthState><Child /></BnMortalityAuthState>);
    expect(screen.getAllByTestId('child')).toHaveLength(1);
  });

  it('AUTHENTICATED but canRunAuthenticatedQueries=false shows preparing-workspace, no children', () => {
    setAuth({ authRuntimeStatus: 'AUTHENTICATED', canRunAuthenticatedQueries: false });
    render(<BnMortalityAuthState><Child /></BnMortalityAuthState>);
    expect(screen.getByText(/Preparing your workspace/i)).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });
});
