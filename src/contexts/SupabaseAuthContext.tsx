import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useReducer } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { logSecurity, logBusinessEvent, startNewCorrelation } from '@/services/systemLoggerService';
import { getDeviceInfo } from '@/services/correlationIdService';
import {
  authReducer,
  initialAuthState,
  canRunAuthenticatedQueriesFor,
  isAuthReadyFor,
  type AuthRuntimeStatus,
  type AuthErrorCode,
  type SupabaseAuthEvent as SbAuthEvent,
} from '@/contexts/authStateMachine';
import { runRefreshOnce } from '@/contexts/refreshCoordinator';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  force_password_change: boolean;
  mfa_enabled: boolean;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login: string | null;
  user_code: string | null;
}

interface UserRole {
  role: string;
}

interface SessionPolicy {
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  autoRefreshEnabled: boolean;
}

// Industry-standard defaults — overridden at runtime by password_policies row.
const DEFAULT_SESSION_TIMEOUT_MINUTES = 480; // absolute ceiling (8h)
const DEFAULT_IDLE_TIMEOUT_MINUTES = 120;    // sliding idle window (2h)
const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;
const SESSION_CHECK_INTERVAL_MS = 30_000;
const IDLE_WARNING_BEFORE_MINUTES = 2;
const ACTIVITY_THROTTLE_MS = 10_000;
const ACTIVITY_BROADCAST_CHANNEL = 'auth-activity';
const ACTIVITY_STORAGE_KEY = '__auth_last_activity__';

type AuthBootstrapStatus = 'loading' | 'ready' | 'degraded';
type DataLoadStatus = 'pending' | 'loaded' | 'failed';

interface SupabaseAuthContextType {
  user: User | null;
  profile: UserProfile | null;
  roles: string[];
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAuthReady: boolean;
  rolesStatus: DataLoadStatus;
  profileStatus: DataLoadStatus;
  authBootstrapStatus: AuthBootstrapStatus;
  /** @deprecated No longer incremented. Use user?.id in queryKeys instead. */
  authBootstrapVersion: number;
  /** BN-MORT-UI-RECOVERY-2D — canonical auth runtime status. */
  authRuntimeStatus: AuthRuntimeStatus;
  /** BN-MORT-UI-RECOVERY-2D — true only during AUTHENTICATED with valid session/user. */
  canRunAuthenticatedQueries: boolean;
  /** BN-MORT-UI-RECOVERY-2D — non-null while auth is in a failure/timeout state. */
  authErrorCode: AuthErrorCode;
  /** BN-MORT-UI-RECOVERY-2D — auth generation, increments on identity change. */
  authGeneration: number;
  /** BN-MORT-UI-RECOVERY-2D — retry the bootstrap after SESSION_TIMEOUT/REFRESH_FAILED. */
  retrySessionBootstrap: () => Promise<void>;
  /** BN-MORT-UI-RECOVERY-2D — force one coordinated refresh via the single-flight coordinator. */
  refreshSessionOnce: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresPasswordChange?: boolean }>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasPermission: (moduleName: string, actionName: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  getSessionDiagnostics: () => {
    sessionExpiresAt: number | null;
    lastActivityAt: number;
    idleMinutes: number;
    idleLimitMinutes: number;
    idleRemainingMinutes: number;
    sessionAgeMinutes: number;
    sessionLimitMinutes: number;
    autoRefreshEnabled: boolean;
    nextRefreshScheduled: boolean;
  };
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | null>(null);

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};

export const SupabaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [rolesStatus, setRolesStatus] = useState<DataLoadStatus>('pending');
  const [profileStatus, setProfileStatus] = useState<DataLoadStatus>('pending');

  // Session policy from DB
  const policyRef = useRef<SessionPolicy>({
    sessionTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
    idleTimeoutMinutes: DEFAULT_IDLE_TIMEOUT_MINUTES,
    autoRefreshEnabled: true,
  });

  const policyLoadedRef = useRef(false);

  const lastActivityRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());
  const isLoggingOutRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutRef = useRef<() => Promise<void>>(async () => {});
  const idleWarningShownRef = useRef(false);
  const lastActivityUpdateRef = useRef<number>(0);
  const activityChannelRef = useRef<BroadcastChannel | null>(null);

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_active, force_password_change, mfa_enabled, failed_login_attempts, locked_until, last_login, user_code')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data as UserProfile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  // Fetch user roles
  const fetchRoles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) throw error;
      return (data as UserRole[]).map(r => r.role);
    } catch (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
  }, []);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      const rolesData = await fetchRoles(user.id);
      setProfile(profileData);
      setRoles(rolesData);
    }
  }, [user, fetchProfile, fetchRoles]);

  // Apply an activity timestamp without re-broadcasting (used by inbound cross-tab pings)
  const applyActivityTs = useCallback((ts: number) => {
    if (ts > lastActivityRef.current) {
      lastActivityRef.current = ts;
      lastActivityUpdateRef.current = ts;
      idleWarningShownRef.current = false;
    }
  }, []);

  // Throttled activity update — local DOM/network activity. Broadcasts to other tabs.
  const updateActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityUpdateRef.current >= ACTIVITY_THROTTLE_MS) {
      lastActivityRef.current = now;
      lastActivityUpdateRef.current = now;
      idleWarningShownRef.current = false;
      // Cross-tab sync
      try {
        activityChannelRef.current?.postMessage({ type: 'activity', ts: now });
      } catch {
        // ignore
      }
      try {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
      } catch {
        // ignore (private mode etc.)
      }
    }
  }, []);

  // Graceful logout
  const logout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      startNewCorrelation();
      
      if (user) {
        await logSecurity({
          event_type: 'logout',
          user_name: user.email || profile?.full_name || 'Unknown',
          success: true,
          module: 'Authentication',
          api_name: 'logout',
          severity: 'info',
          payload_json: {
            device: getDeviceInfo(),
            timestamp: new Date().toISOString(),
          },
        }, user.id);

        await supabase.from('audit_logs').insert({
          action_type: 'LOGOUT',
          module_name: 'Authentication',
          entity_type: 'user',
          user_id: user.id,
          user_email: user.email,
        });
      }
      
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setRoles([]);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      isLoggingOutRef.current = false;
    }
  }, [user, profile]);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // Schedule proactive token refresh before expiry
  const scheduleTokenRefresh = useCallback((currentSession: Session | null) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!currentSession || !policyRef.current.autoRefreshEnabled) return;

    const expiresAt = currentSession.expires_at;
    if (!expiresAt) return;

    const expiresAtMs = expiresAt * 1000;
    const now = Date.now();
    const msUntilExpiry = expiresAtMs - now;
    const refreshIn = Math.max(msUntilExpiry - TOKEN_REFRESH_BUFFER_MS, 5000);

    if (refreshIn > 0 && refreshIn < 60 * 60 * 1000) {
      refreshTimerRef.current = setTimeout(async () => {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error) {
            console.warn('Proactive token refresh failed:', error.message);
          } else if (data.session) {
            console.info('Token refreshed proactively');
          }
        } catch (err) {
          console.warn('Token refresh error:', err);
        }
      }, refreshIn);
    }
  }, []);

  // Load timeout settings — single source of truth: password_policies (active row)
  const loadSessionPolicy = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('password_policies')
        .select('session_timeout_minutes, idle_timeout_minutes, auto_refresh_enabled')
        .eq('is_active', true)
        .single();

      if (error) return; // keep defaults

      policyRef.current = {
        sessionTimeoutMinutes: typeof data?.session_timeout_minutes === 'number'
          ? data.session_timeout_minutes
          : DEFAULT_SESSION_TIMEOUT_MINUTES,
        idleTimeoutMinutes: typeof data?.idle_timeout_minutes === 'number'
          ? data.idle_timeout_minutes
          : DEFAULT_IDLE_TIMEOUT_MINUTES,
        autoRefreshEnabled: data?.auto_refresh_enabled !== false,
      };

      policyLoadedRef.current = true;
    } catch {
      // Fall back to defaults
    }
  }, []);

  // Idle & session timeout checker
  useEffect(() => {
    if (!session) return;

    if (!policyLoadedRef.current) {
      loadSessionPolicy();
    }

    const checkTimeouts = () => {
      if (isLoggingOutRef.current) return;
      if (!policyLoadedRef.current) return;

      const now = Date.now();
      const idleMinutes = (now - lastActivityRef.current) / 60_000;
      const sessionMinutes = (now - sessionStartRef.current) / 60_000;

      const idleLimit = policyRef.current.idleTimeoutMinutes;
      const warningThreshold = idleLimit - IDLE_WARNING_BEFORE_MINUTES;

      if (idleMinutes >= warningThreshold && idleMinutes < idleLimit && !idleWarningShownRef.current) {
        idleWarningShownRef.current = true;
        const remainingSeconds = Math.ceil((idleLimit - idleMinutes) * 60);
        toast.warning(
          `Your session will expire in ${remainingSeconds > 60 ? Math.ceil(remainingSeconds / 60) + ' minute(s)' : remainingSeconds + ' seconds'} due to inactivity. Move your mouse or press any key to stay logged in.`,
          { duration: 10000 }
        );
      }

      if (idleMinutes >= idleLimit) {
        toast.warning('Session expired due to inactivity');
        if (user) {
          void logSecurity({
            event_type: 'logout',
            user_name: user.email || profile?.full_name || 'Unknown',
            success: true,
            module: 'Authentication',
            api_name: 'idle_timeout_logout',
            severity: 'info',
            payload_json: { idle_minutes: Math.round(idleMinutes), idle_limit: idleLimit },
          }, user.id).catch(() => {});
        }
        void logoutRef.current();
        return;
      }

      if (sessionMinutes >= policyRef.current.sessionTimeoutMinutes) {
        toast.warning('Session expired (maximum duration reached)');
        if (user) {
          void logSecurity({
            event_type: 'logout',
            user_name: user.email || profile?.full_name || 'Unknown',
            success: true,
            module: 'Authentication',
            api_name: 'absolute_timeout_logout',
            severity: 'info',
            payload_json: { session_minutes: Math.round(sessionMinutes), session_limit: policyRef.current.sessionTimeoutMinutes },
          }, user.id).catch(() => {});
        }
        void logoutRef.current();
        return;
      }
    };

    const interval = setInterval(checkTimeouts, SESSION_CHECK_INTERVAL_MS);

    // Broad activity surface: typing, editing, scrolling, touching, focusing — all count.
    const events = [
      'click', 'mousedown', 'mousemove',
      'keydown', 'keyup', 'input', 'change',
      'focus', 'focusin',
      'scroll', 'wheel',
      'touchstart', 'pointerdown',
    ];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true, capture: true }));

    return () => {
      clearInterval(interval);
      events.forEach(event => window.removeEventListener(event, updateActivity, { capture: true } as any));
    };
  }, [session, updateActivity, loadSessionPolicy]);

  // Handle tab visibility change — resilient to transient failures
  useEffect(() => {
    if (!session) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !isLoggingOutRef.current) {
        lastActivityRef.current = Date.now();
        lastActivityUpdateRef.current = Date.now();
        idleWarningShownRef.current = false;

        try {
          const { data, error } = await supabase.auth.getSession();
          if (error || !data.session) {
            // Don't immediately logout — try refreshing first
            console.warn('Session missing after tab switch, attempting refresh…');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshData.session) {
              console.warn('Session refresh failed after tab switch — logging out');
              toast.warning('Session expired. Please log in again.');
              void logoutRef.current();
            } else {
              console.info('Session recovered via refresh after tab switch');
              scheduleTokenRefresh(refreshData.session);
            }
          } else {
            // Session is valid — refresh policy & token schedule in background
            void loadSessionPolicy().catch(() => {});
            scheduleTokenRefresh(data.session);
          }
        } catch (err) {
          console.warn('Error checking session on visibility change:', err);
          // Don't logout on transient network errors
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, loadSessionPolicy, scheduleTokenRefresh]);

  // Cross-tab activity sync (BroadcastChannel + localStorage fallback)
  useEffect(() => {
    if (!session) return;

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(ACTIVITY_BROADCAST_CHANNEL);
        channel.onmessage = (ev) => {
          if (ev.data?.type === 'activity' && typeof ev.data.ts === 'number') {
            applyActivityTs(ev.data.ts);
          }
        };
        activityChannelRef.current = channel;
      } catch {
        channel = null;
      }
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVITY_STORAGE_KEY && e.newValue) {
        const ts = parseInt(e.newValue, 10);
        if (!Number.isNaN(ts)) applyActivityTs(ts);
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      if (channel) {
        try { channel.close(); } catch { /* noop */ }
      }
      activityChannelRef.current = null;
    };
  }, [session, applyActivityTs]);

  // Global fetch wrapper — count successful network activity (React-Query, supabase-js,
  // axios-via-fetch) as user activity so background data refresh extends the idle window.
  useEffect(() => {
    if (!session) return;
    if (typeof window === 'undefined' || !window.fetch) return;

    const originalFetch = window.fetch.bind(window);
    const wrappedFetch: typeof window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res && res.ok) updateActivity();
      return res;
    };
    window.fetch = wrappedFetch;

    return () => {
      if (window.fetch === wrappedFetch) {
        window.fetch = originalFetch;
      }
    };
  }, [session, updateActivity]);

  // Initialize auth state — two-phase: session-ready first, then user data in background
  useEffect(() => {
    let initDone = false;

    // Background-load profile/roles with a hard timeout to prevent hanging
    const BOOTSTRAP_TIMEOUT_MS = 5_000;

    const loadUserDataInBackground = (userId: string) => {
      const dataPromise = Promise.all([fetchProfile(userId), fetchRoles(userId)])
        .then(([profileData, rolesData]) => {
          setProfile(profileData);
          setProfileStatus(profileData ? 'loaded' : 'failed');
          setRoles(rolesData);
          setRolesStatus('loaded');
        })
        .catch((err) => {
          console.error('Failed to load user data:', err);
          setProfileStatus('failed');
          setRolesStatus('failed');
        });

      // Hard timeout: if profile/roles don't load in time, mark as failed but don't block
      const timeoutPromise = new Promise<void>((resolve) =>
        setTimeout(() => {
          setProfileStatus((prev) => (prev === 'pending' ? 'failed' : prev));
          setRolesStatus((prev) => (prev === 'pending' ? 'failed' : prev));
          resolve();
        }, BOOTSTRAP_TIMEOUT_MS)
      );

      // Fire-and-forget: whichever finishes first wins
      void Promise.race([dataPromise, timeoutPromise]);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (isLoggingOutRef.current && event === 'SIGNED_OUT') {
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_IN' && currentSession) {
          sessionStartRef.current = Date.now();
          lastActivityRef.current = Date.now();
          lastActivityUpdateRef.current = Date.now();
          idleWarningShownRef.current = false;
          scheduleTokenRefresh(currentSession);
        }

        if (event === 'TOKEN_REFRESHED' && currentSession) {
          // NOTE: do NOT reset sessionStartRef — the absolute ceiling must be honored
          // regardless of token refreshes (industry standard).
          lastActivityRef.current = Date.now();
          lastActivityUpdateRef.current = Date.now();
          scheduleTokenRefresh(currentSession);
          console.info('Auth token refreshed successfully');
          if (currentSession.user) {
            void logSecurity({
              event_type: 'login',
              user_name: currentSession.user.email || 'Unknown',
              success: true,
              module: 'Authentication',
              api_name: 'token_refreshed',
              severity: 'info',
              payload_json: { ts: new Date().toISOString() },
            }, currentSession.user.id).catch(() => {});
          }
        }

        // After initializeAuth completes, handle profile/roles for auth changes
        if (initDone && currentSession?.user) {
          // isAuthReady is already true from init — just refresh data in background
          loadUserDataInBackground(currentSession.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRoles([]);
          setProfileStatus('pending');
          setRolesStatus('pending');
          // Keep isAuthReady true after sign-out so the login page renders properly
          setIsLoading(false);
        } else if (initDone) {
          setIsLoading(false);
        }
      }
    );

    // INITIAL load — Phase 1: session restore → isAuthReady=true immediately
    // Phase 2: profile/roles load in background (non-blocking)
    const initializeAuth = async () => {
      // Hard timeout — never let session restore hang the app shell.
      // If Supabase is slow/unreachable in Preview, fail open to unauthenticated
      // so the login page can render.
      const SESSION_RESTORE_TIMEOUT_MS = 4_000;

      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: Session | null } }>((resolve) =>
            setTimeout(() => {
              console.warn('[Auth] getSession() timed out — proceeding as unauthenticated');
              resolve({ data: { session: null } });
            }, SESSION_RESTORE_TIMEOUT_MS)
          ),
        ]);

        const currentSession = sessionResult?.data?.session ?? null;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession) {
          sessionStartRef.current = Date.now();
          lastActivityRef.current = Date.now();
          lastActivityUpdateRef.current = Date.now();
          scheduleTokenRefresh(currentSession);
        }

        initDone = true;
        setIsAuthReady(true);
        setIsLoading(false);

        if (currentSession?.user) {
          loadUserDataInBackground(currentSession.user.id);
          void loadSessionPolicy().catch(() => {});
        } else {
          setProfileStatus('loaded');
          setRolesStatus('loaded');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setProfileStatus('failed');
        setRolesStatus('failed');
        initDone = true;
        setIsAuthReady(true);
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [fetchProfile, fetchRoles, scheduleTokenRefresh, loadSessionPolicy]);

  // Login function with lockout check
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; requiresPasswordChange?: boolean }> => {
    try {
      const RESOLVE_EMAIL_TIMEOUT_MS = 500;

      const fetchProfileByEmail = async (lookupEmail: string) => {
        const { data } = await supabase
          .from('profiles')
          .select('id, locked_until, failed_login_attempts, is_active, force_password_change, email, lockout_exempt')
          .eq('email', lookupEmail)
          .limit(1)
          .maybeSingle();

        return data;
      };

      const validateProfileAccess = (existingProfile: Awaited<ReturnType<typeof fetchProfileByEmail>>) => {
        if (!existingProfile) return null;

        if (!existingProfile.is_active) {
          return 'Account is deactivated. Please contact administrator.';
        }

        if (existingProfile.locked_until && !(existingProfile as any).lockout_exempt) {
          const lockUntil = new Date(existingProfile.locked_until);
          if (lockUntil > new Date()) {
            const minutesRemaining = Math.ceil((lockUntil.getTime() - Date.now()) / 60000);
            return `Account is locked. Try again in ${minutesRemaining} minutes.`;
          }
        }

        return null;
      };

      const hasInvalidCredentialsMessage = (message?: string) => {
        const normalized = message?.toLowerCase() ?? '';
        return normalized.includes('invalid') || normalized.includes('credential');
      };

      const resolveAuthEmailPromise = Promise.race<string | null>([
        supabase.functions.invoke('resolve-auth-email', { body: { email } })
          .then(({ data }) => data?.auth_email ?? null)
          .catch(err => {
            console.warn('Email resolution failed, using provided email:', err);
            return null;
          }),
        new Promise<string | null>((resolve) =>
          setTimeout(() => {
            console.warn('[Login] resolve-auth-email timed out after 500ms — using provided email unless retry is needed');
            resolve(null);
          }, RESOLVE_EMAIL_TIMEOUT_MS)
        ),
      ]);

      let existingProfile = await fetchProfileByEmail(email);
      let loginEmail = email;

      if (!existingProfile) {
        const resolvedEmail = await resolveAuthEmailPromise;
        if (resolvedEmail && resolvedEmail !== email) {
          loginEmail = resolvedEmail;
          existingProfile = await fetchProfileByEmail(resolvedEmail);
        }
      }

      const profileAccessError = validateProfileAccess(existingProfile);
      if (profileAccessError) {
        return { success: false, error: profileAccessError };
      }

      const SIGN_IN_TIMEOUT_MS = 8_000;

      const signInWithTimeout = (signInEmail: string, signInPassword: string) =>
        Promise.race([
          supabase.auth.signInWithPassword({ email: signInEmail, password: signInPassword }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Authentication service is not responding. Please use the Share Preview link or published URL.')),
              SIGN_IN_TIMEOUT_MS
            )
          ),
        ]);

      let { data, error } = await signInWithTimeout(loginEmail, password);

      if (error && loginEmail === email && hasInvalidCredentialsMessage(error.message)) {
        const resolvedEmail = await resolveAuthEmailPromise;

        if (resolvedEmail && resolvedEmail !== email) {
          const resolvedProfile = existingProfile ?? await fetchProfileByEmail(resolvedEmail);
          const resolvedProfileAccessError = validateProfileAccess(resolvedProfile);

          if (resolvedProfileAccessError) {
            return { success: false, error: resolvedProfileAccessError };
          }

          existingProfile = resolvedProfile;
          loginEmail = resolvedEmail;

          const retryResult = await signInWithTimeout(resolvedEmail, password);
          data = retryResult.data;
          error = retryResult.error;
        }
      }

      if (error) {
        if (existingProfile) {
          const newAttempts = (existingProfile.failed_login_attempts || 0) + 1;
          const lockoutThreshold = 5;
          const isExempt = !!(existingProfile as any).lockout_exempt;

          const updateData: Record<string, unknown> = {
            failed_login_attempts: newAttempts
          };

          if (!isExempt && newAttempts >= lockoutThreshold) {
            const lockDuration = 30;
            updateData.locked_until = new Date(Date.now() + lockDuration * 60000).toISOString();
          }

          await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', existingProfile.id);
        }

        return { success: false, error: error.message };
      }

      if (data.user) {
        sessionStartRef.current = Date.now();
        lastActivityRef.current = Date.now();
        lastActivityUpdateRef.current = Date.now();
        isLoggingOutRef.current = false;
        idleWarningShownRef.current = false;

        // Fire-and-forget: reset failed attempts and update last_login
        void supabase
          .from('profiles')
          .update({ 
            failed_login_attempts: 0, 
            locked_until: null,
            last_login: new Date().toISOString()
          })
          .eq('id', data.user.id);

        // Fire-and-forget: load session policy in background
        void loadSessionPolicy().catch(() => {});

        // Check force_password_change with a quick lightweight query
        // Profile/roles will be loaded by onAuthStateChange -> loadUserDataInBackground
        if (existingProfile?.force_password_change) {
          return { success: true, requiresPasswordChange: true };
        } else if (!existingProfile) {
          // No pre-fetched profile — do a quick single-field check
          const { data: fpData } = await supabase
            .from('profiles')
            .select('force_password_change')
            .eq('id', data.user.id)
            .single();
          if (fpData?.force_password_change) {
            return { success: true, requiresPasswordChange: true };
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      return { success: false, error: message };
    }
  };

  const hasRole = (role: string): boolean => roles.includes(role);
  const hasAnyRole = (checkRoles: string[]): boolean => checkRoles.some(role => roles.includes(role));
  const isAdmin = roles.includes('Admin');

  const hasPermission = async (moduleName: string, actionName: string): Promise<boolean> => {
    if (!user) return false;
    if (isAdmin) return true;
    
    try {
      const { data, error } = await supabase
        .rpc('has_permission', {
          _user_id: user.id,
          _module_name: moduleName,
          _action_name: actionName
        });
      
      if (error) throw error;
      return data ?? false;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  };

  const authBootstrapStatus: AuthBootstrapStatus = !isAuthReady
    ? 'loading'
    : (profileStatus === 'failed' || rolesStatus === 'failed')
      ? 'degraded'
      : 'ready';

  const getSessionDiagnostics = useCallback(() => {
    const now = Date.now();
    const idleMs = now - lastActivityRef.current;
    const sessionMs = now - sessionStartRef.current;
    const idleLimit = policyRef.current.idleTimeoutMinutes;
    const sessionLimit = policyRef.current.sessionTimeoutMinutes;
    return {
      sessionExpiresAt: session?.expires_at ? session.expires_at * 1000 : null,
      lastActivityAt: lastActivityRef.current,
      idleMinutes: idleMs / 60_000,
      idleLimitMinutes: idleLimit,
      idleRemainingMinutes: Math.max(0, idleLimit - idleMs / 60_000),
      sessionAgeMinutes: sessionMs / 60_000,
      sessionLimitMinutes: sessionLimit,
      autoRefreshEnabled: policyRef.current.autoRefreshEnabled,
      nextRefreshScheduled: !!refreshTimerRef.current,
    };
  }, [session]);

  const value: SupabaseAuthContextType = {
    user,
    profile,
    roles,
    session,
    isLoading,
    isAuthenticated: !!session && !!user,
    isAdmin,
    isAuthReady,
    rolesStatus,
    profileStatus,
    authBootstrapStatus,
    authBootstrapVersion: 0, // Deprecated — kept for interface compat
    login,
    logout,
    hasRole,
    hasAnyRole,
    hasPermission,
    refreshProfile,
    getSessionDiagnostics,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};
