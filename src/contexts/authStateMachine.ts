/**
 * BN-MORT-UI-RECOVERY-2D — Canonical Auth Runtime state machine.
 *
 * Pure reducer used by SupabaseAuthContext. Decoupled to keep transitions
 * deterministic and testable without a rendered React tree.
 *
 * Transition table:
 *
 * ┌───────────────────────┬────────────────────────────────────────────────┐
 * │ Event                 │ Effect                                         │
 * ├───────────────────────┼────────────────────────────────────────────────┤
 * │ BOOTSTRAP_START       │ * → INITIALISING                               │
 * │ BOOTSTRAP_SESSION     │ INITIALISING → AUTHENTICATED (with session)   │
 * │                       │ INITIALISING → UNAUTHENTICATED (no session)   │
 * │ BOOTSTRAP_TIMEOUT     │ INITIALISING → SESSION_TIMEOUT                │
 * │ BOOTSTRAP_ERROR       │ INITIALISING → REFRESH_FAILED                 │
 * │ AUTH_EVENT SIGNED_IN  │ * → AUTHENTICATED                             │
 * │ AUTH_EVENT SIGNED_OUT │ * → UNAUTHENTICATED                           │
 * │ AUTH_EVENT INITIAL_S. │ INITIALISING/TIMEOUT → AUTHENTICATED/UN-      │
 * │ AUTH_EVENT TOKEN_REF. │ AUTHENTICATED → AUTHENTICATED (session upd.)  │
 * │ AUTH_EVENT USER_UPD.  │ → AUTHENTICATED                               │
 * │ AUTH_EVENT PASSWORD_R │ preserve authenticated state                  │
 * │ REFRESH_START         │ AUTHENTICATED/SESSION_TIMEOUT → REFRESHING    │
 * │ REFRESH_SUCCESS       │ REFRESHING → AUTHENTICATED                    │
 * │ REFRESH_EXPIRED       │ REFRESHING → SESSION_EXPIRED                  │
 * │ REFRESH_ERROR         │ REFRESHING → REFRESH_FAILED                   │
 * │ LOGOUT                │ * → UNAUTHENTICATED                           │
 * └───────────────────────┴────────────────────────────────────────────────┘
 *
 * Stale-result protection is layered on top via {@link AuthGeneration}.
 */
import type { Session, User } from '@supabase/supabase-js';

export type AuthRuntimeStatus =
  | 'INITIALISING'
  | 'AUTHENTICATED'
  | 'UNAUTHENTICATED'
  | 'REFRESHING'
  | 'SESSION_EXPIRED'
  | 'SESSION_TIMEOUT'
  | 'REFRESH_FAILED';

export type AuthErrorCode =
  | null
  | 'BOOTSTRAP_TIMEOUT'
  | 'BOOTSTRAP_ERROR'
  | 'REFRESH_EXPIRED'
  | 'REFRESH_ERROR'
  | 'SESSION_EXPIRED';

export interface AuthMachineState {
  status: AuthRuntimeStatus;
  session: Session | null;
  user: User | null;
  errorCode: AuthErrorCode;
  /** Monotonic counter — used to reject stale async results. */
  generation: number;
}

export type SupabaseAuthEvent =
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY';

export type AuthAction =
  | { type: 'BOOTSTRAP_START' }
  | { type: 'BOOTSTRAP_SESSION'; session: Session | null }
  | { type: 'BOOTSTRAP_TIMEOUT' }
  | { type: 'BOOTSTRAP_ERROR'; message?: string }
  | { type: 'AUTH_EVENT'; event: SupabaseAuthEvent; session: Session | null }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS'; session: Session }
  | { type: 'REFRESH_EXPIRED' }
  | { type: 'REFRESH_ERROR'; message?: string }
  | { type: 'LOGOUT' };

export const initialAuthState: AuthMachineState = {
  status: 'INITIALISING',
  session: null,
  user: null,
  errorCode: null,
  generation: 0,
};

function withSession(base: AuthMachineState, session: Session | null): AuthMachineState {
  return {
    ...base,
    session,
    user: session?.user ?? null,
  };
}

export function authReducer(state: AuthMachineState, action: AuthAction): AuthMachineState {
  switch (action.type) {
    case 'BOOTSTRAP_START':
      return { ...initialAuthState, generation: state.generation + 1 };

    case 'BOOTSTRAP_SESSION': {
      // Stale bootstrap must not overwrite a newer SIGNED_IN/SIGNED_OUT/timeout
      if (state.status !== 'INITIALISING') return state;
      if (action.session) {
        return withSession({ ...state, status: 'AUTHENTICATED', errorCode: null }, action.session);
      }
      return withSession({ ...state, status: 'UNAUTHENTICATED', errorCode: null }, null);
    }

    case 'BOOTSTRAP_TIMEOUT':
      if (state.status !== 'INITIALISING') return state;
      return { ...state, status: 'SESSION_TIMEOUT', errorCode: 'BOOTSTRAP_TIMEOUT' };

    case 'BOOTSTRAP_ERROR':
      if (state.status !== 'INITIALISING') return state;
      return { ...state, status: 'REFRESH_FAILED', errorCode: 'BOOTSTRAP_ERROR' };

    case 'AUTH_EVENT': {
      const { event, session } = action;
      const nextGen = event === 'SIGNED_IN' || event === 'SIGNED_OUT'
        ? state.generation + 1
        : state.generation;

      switch (event) {
        case 'INITIAL_SESSION':
          if (session) {
            return withSession({ ...state, status: 'AUTHENTICATED', errorCode: null, generation: nextGen }, session);
          }
          // INITIAL_SESSION with no session — treat as UNAUTHENTICATED unless we
          // are already in a distinct terminal state we want to preserve.
          if (state.status === 'REFRESHING') return state;
          return withSession({ ...state, status: 'UNAUTHENTICATED', errorCode: null, generation: nextGen }, null);

        case 'SIGNED_IN':
          if (!session) return state;
          return withSession({ ...state, status: 'AUTHENTICATED', errorCode: null, generation: nextGen }, session);

        case 'SIGNED_OUT':
          return withSession({ ...state, status: 'UNAUTHENTICATED', errorCode: null, generation: nextGen }, null);

        case 'TOKEN_REFRESHED':
          if (!session) return state;
          return withSession({ ...state, status: 'AUTHENTICATED', errorCode: null }, session);

        case 'USER_UPDATED':
          if (session) return withSession({ ...state, status: 'AUTHENTICATED', errorCode: null }, session);
          return state;

        case 'PASSWORD_RECOVERY':
          // Preserve authenticated state; recovery pages handle their own guard.
          if (session) return withSession({ ...state, status: 'AUTHENTICATED', errorCode: null }, session);
          return state;

        default:
          return state;
      }
    }

    case 'REFRESH_START':
      if (state.status === 'UNAUTHENTICATED' || state.status === 'SESSION_EXPIRED') return state;
      return { ...state, status: 'REFRESHING' };

    case 'REFRESH_SUCCESS':
      return withSession({ ...state, status: 'AUTHENTICATED', errorCode: null }, action.session);

    case 'REFRESH_EXPIRED':
      return withSession({ ...state, status: 'SESSION_EXPIRED', errorCode: 'SESSION_EXPIRED' }, null);

    case 'REFRESH_ERROR':
      return { ...state, status: 'REFRESH_FAILED', errorCode: 'REFRESH_ERROR' };

    case 'LOGOUT':
      return withSession({
        ...state,
        status: 'UNAUTHENTICATED',
        errorCode: null,
        generation: state.generation + 1,
      }, null);

    default:
      return state;
  }
}

/** True only when the user may run authenticated Benefits queries. */
export function canRunAuthenticatedQueriesFor(state: AuthMachineState): boolean {
  return state.status === 'AUTHENTICATED' && !!state.session && !!state.user;
}

/** True while the app is still deciding whether it has a session. */
export function isAuthReadyFor(state: AuthMachineState): boolean {
  return state.status !== 'INITIALISING';
}
