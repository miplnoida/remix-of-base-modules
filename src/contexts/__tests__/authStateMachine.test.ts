/**
 * BN-MORT-UI-RECOVERY-2E §10 — Auth reducer tests.
 *
 * Pure reducer coverage: bootstrap paths, sign-in/out, refresh outcomes,
 * stale-event protection, generation increments.
 */
import { describe, it, expect } from 'vitest';
import type { Session, User } from '@supabase/supabase-js';
import {
  authReducer,
  initialAuthState,
  canRunAuthenticatedQueriesFor,
  type AuthMachineState,
} from '../authStateMachine';

const userA = { id: 'user-a', email: 'a@example.com' } as unknown as User;
const userB = { id: 'user-b', email: 'b@example.com' } as unknown as User;

const sessionA = { access_token: 'a', refresh_token: 'ra', user: userA } as unknown as Session;
const sessionB = { access_token: 'b', refresh_token: 'rb', user: userB } as unknown as Session;

describe('authReducer — bootstrap paths', () => {
  it('BOOTSTRAP_SESSION with a session moves INITIALISING → AUTHENTICATED', () => {
    const s = authReducer(initialAuthState, { type: 'BOOTSTRAP_SESSION', session: sessionA });
    expect(s.status).toBe('AUTHENTICATED');
    expect(s.user?.id).toBe('user-a');
    expect(canRunAuthenticatedQueriesFor(s)).toBe(true);
  });

  it('BOOTSTRAP_SESSION with null moves INITIALISING → UNAUTHENTICATED', () => {
    const s = authReducer(initialAuthState, { type: 'BOOTSTRAP_SESSION', session: null });
    expect(s.status).toBe('UNAUTHENTICATED');
    expect(canRunAuthenticatedQueriesFor(s)).toBe(false);
  });

  it('BOOTSTRAP_TIMEOUT moves INITIALISING → SESSION_TIMEOUT with error code', () => {
    const s = authReducer(initialAuthState, { type: 'BOOTSTRAP_TIMEOUT' });
    expect(s.status).toBe('SESSION_TIMEOUT');
    expect(s.errorCode).toBe('BOOTSTRAP_TIMEOUT');
  });

  it('BOOTSTRAP_ERROR moves INITIALISING → REFRESH_FAILED', () => {
    const s = authReducer(initialAuthState, { type: 'BOOTSTRAP_ERROR' });
    expect(s.status).toBe('REFRESH_FAILED');
    expect(s.errorCode).toBe('BOOTSTRAP_ERROR');
  });

  it('stale BOOTSTRAP_SESSION cannot overwrite an already-authenticated state', () => {
    const signedIn = authReducer(initialAuthState, {
      type: 'AUTH_EVENT',
      event: 'SIGNED_IN',
      session: sessionA,
    });
    // A late bootstrap resolution with null should NOT log the user out.
    const staleBootstrap = authReducer(signedIn, { type: 'BOOTSTRAP_SESSION', session: null });
    expect(staleBootstrap.status).toBe('AUTHENTICATED');
    expect(staleBootstrap.user?.id).toBe('user-a');
  });

  it('BOOTSTRAP_TIMEOUT is ignored after the state left INITIALISING', () => {
    const signedIn = authReducer(initialAuthState, {
      type: 'AUTH_EVENT',
      event: 'SIGNED_IN',
      session: sessionA,
    });
    const s = authReducer(signedIn, { type: 'BOOTSTRAP_TIMEOUT' });
    expect(s.status).toBe('AUTHENTICATED');
  });
});

describe('authReducer — sign-in / sign-out and generation', () => {
  it('SIGNED_IN bumps generation, SIGNED_OUT bumps generation', () => {
    const s1 = authReducer(initialAuthState, {
      type: 'AUTH_EVENT',
      event: 'SIGNED_IN',
      session: sessionA,
    });
    const s2 = authReducer(s1, { type: 'AUTH_EVENT', event: 'SIGNED_OUT', session: null });
    expect(s1.generation).toBe(initialAuthState.generation + 1);
    expect(s2.generation).toBe(s1.generation + 1);
    expect(s2.status).toBe('UNAUTHENTICATED');
    expect(s2.user).toBeNull();
  });

  it('SIGNED_IN with different user replaces identity and bumps generation', () => {
    const s1 = authReducer(initialAuthState, {
      type: 'AUTH_EVENT',
      event: 'SIGNED_IN',
      session: sessionA,
    });
    const s2 = authReducer(s1, { type: 'AUTH_EVENT', event: 'SIGNED_IN', session: sessionB });
    expect(s2.user?.id).toBe('user-b');
    expect(s2.generation).toBeGreaterThan(s1.generation);
  });

  it('TOKEN_REFRESHED updates session but does not bump generation', () => {
    const s1 = authReducer(initialAuthState, {
      type: 'AUTH_EVENT',
      event: 'SIGNED_IN',
      session: sessionA,
    });
    const refreshed = { ...sessionA, access_token: 'a2' } as unknown as Session;
    const s2 = authReducer(s1, { type: 'AUTH_EVENT', event: 'TOKEN_REFRESHED', session: refreshed });
    expect(s2.status).toBe('AUTHENTICATED');
    expect(s2.session?.access_token).toBe('a2');
    expect(s2.generation).toBe(s1.generation);
  });

  it('LOGOUT clears identity and bumps generation', () => {
    const s1 = authReducer(initialAuthState, {
      type: 'AUTH_EVENT',
      event: 'SIGNED_IN',
      session: sessionA,
    });
    const s2 = authReducer(s1, { type: 'LOGOUT' });
    expect(s2.status).toBe('UNAUTHENTICATED');
    expect(s2.user).toBeNull();
    expect(s2.session).toBeNull();
    expect(s2.generation).toBeGreaterThan(s1.generation);
  });
});

describe('authReducer — refresh outcomes', () => {
  const authed: AuthMachineState = {
    ...initialAuthState,
    status: 'AUTHENTICATED',
    session: sessionA,
    user: userA,
  };

  it('REFRESH_START from AUTHENTICATED → REFRESHING', () => {
    const s = authReducer(authed, { type: 'REFRESH_START' });
    expect(s.status).toBe('REFRESHING');
  });

  it('REFRESH_SUCCESS returns to AUTHENTICATED and clears error', () => {
    const refreshing = authReducer(authed, { type: 'REFRESH_START' });
    const s = authReducer(refreshing, { type: 'REFRESH_SUCCESS', session: sessionA });
    expect(s.status).toBe('AUTHENTICATED');
    expect(s.errorCode).toBeNull();
  });

  it('REFRESH_EXPIRED → SESSION_EXPIRED, clears session', () => {
    const refreshing = authReducer(authed, { type: 'REFRESH_START' });
    const s = authReducer(refreshing, { type: 'REFRESH_EXPIRED' });
    expect(s.status).toBe('SESSION_EXPIRED');
    expect(s.session).toBeNull();
    expect(s.errorCode).toBe('SESSION_EXPIRED');
  });

  it('REFRESH_ERROR → REFRESH_FAILED', () => {
    const refreshing = authReducer(authed, { type: 'REFRESH_START' });
    const s = authReducer(refreshing, { type: 'REFRESH_ERROR' });
    expect(s.status).toBe('REFRESH_FAILED');
    expect(s.errorCode).toBe('REFRESH_ERROR');
  });

  it('REFRESH_START from UNAUTHENTICATED is a no-op', () => {
    const s = authReducer(initialAuthState, {
      type: 'AUTH_EVENT',
      event: 'SIGNED_OUT',
      session: null,
    });
    const s2 = authReducer(s, { type: 'REFRESH_START' });
    expect(s2.status).toBe('UNAUTHENTICATED');
  });

  it('late SIGNED_IN can recover from SESSION_TIMEOUT', () => {
    const timeout = authReducer(initialAuthState, { type: 'BOOTSTRAP_TIMEOUT' });
    expect(timeout.status).toBe('SESSION_TIMEOUT');
    const recovered = authReducer(timeout, {
      type: 'AUTH_EVENT',
      event: 'SIGNED_IN',
      session: sessionA,
    });
    expect(recovered.status).toBe('AUTHENTICATED');
    expect(recovered.user?.id).toBe('user-a');
  });
});

describe('authReducer — canRunAuthenticatedQueriesFor', () => {
  it('only true when AUTHENTICATED with session and user', () => {
    expect(canRunAuthenticatedQueriesFor(initialAuthState)).toBe(false);
    const authed = authReducer(initialAuthState, {
      type: 'AUTH_EVENT',
      event: 'SIGNED_IN',
      session: sessionA,
    });
    expect(canRunAuthenticatedQueriesFor(authed)).toBe(true);

    const refreshing = authReducer(authed, { type: 'REFRESH_START' });
    expect(canRunAuthenticatedQueriesFor(refreshing)).toBe(false);

    const expired = authReducer(refreshing, { type: 'REFRESH_EXPIRED' });
    expect(canRunAuthenticatedQueriesFor(expired)).toBe(false);
  });
});
