import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { logSecurity, logBusinessEvent, startNewCorrelation } from '@/services/systemLoggerService';
import { getDeviceInfo } from '@/services/correlationIdService';

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

const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;
const DEFAULT_IDLE_TIMEOUT_MINUTES = 15;
const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000; // Refresh 2 minutes before expiry
const SESSION_CHECK_INTERVAL_MS = 30_000; // Check every 30 seconds
const IDLE_WARNING_BEFORE_MINUTES = 2; // Warn 2 minutes before idle logout
const ACTIVITY_THROTTLE_MS = 10_000; // Throttle activity updates to once per 10 seconds

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
  /** True once the initial session restoration is complete (regardless of success) */
  isAuthReady: boolean;
  /** Status of roles data: pending (still loading), loaded (success/empty), failed */
  rolesStatus: DataLoadStatus;
  /** Status of profile data */
  profileStatus: DataLoadStatus;
  /** Overall bootstrap status: loading, ready, or degraded (partial failure) */
  authBootstrapStatus: AuthBootstrapStatus;
  /** Incremented on each successful bootstrap to trigger dependent re-fetches */
  authBootstrapVersion: number;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresPasswordChange?: boolean }>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasPermission: (moduleName: string, actionName: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
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
  const [authBootstrapVersion, setAuthBootstrapVersion] = useState(0);

  // Session policy from DB
  const policyRef = useRef<SessionPolicy>({
    sessionTimeoutMinutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
    idleTimeoutMinutes: DEFAULT_IDLE_TIMEOUT_MINUTES,
    autoRefreshEnabled: true,
  });

  // Flag to track if policy has been loaded from DB at least once
  const policyLoadedRef = useRef(false);

  // Track activity and session start without triggering rerenders
  const lastActivityRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());
  const isLoggingOutRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref-based logout so the timeout useEffect doesn't depend on the logout callback
  const logoutRef = useRef<() => Promise<void>>(async () => {});

  // Track whether idle warning has been shown (to avoid spamming)
  const idleWarningShownRef = useRef(false);

  // Throttle tracking for activity updates
  const lastActivityUpdateRef = useRef<number>(0);

  // Guard to prevent onAuthStateChange from duplicating initializeAuth fetches
  const initializingRef = useRef(false);

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

  // Throttled activity update — only updates ref at most once per ACTIVITY_THROTTLE_MS
  const updateActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityUpdateRef.current >= ACTIVITY_THROTTLE_MS) {
      lastActivityRef.current = now;
      lastActivityUpdateRef.current = now;
      // Reset warning flag when user becomes active again
      idleWarningShownRef.current = false;
    }
  }, []);

  // Graceful logout (prevents duplicate logouts)
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

  // Keep logoutRef in sync with the latest logout callback
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // Schedule proactive token refresh before expiry
  const scheduleTokenRefresh = useCallback((currentSession: Session | null) => {
    // Clear any existing refresh timer
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
    const refreshIn = Math.max(msUntilExpiry - TOKEN_REFRESH_BUFFER_MS, 5000); // At least 5s from now

    if (refreshIn > 0 && refreshIn < 60 * 60 * 1000) { // Only schedule if < 1 hour
      refreshTimerRef.current = setTimeout(async () => {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error) {
            console.warn('Proactive token refresh failed:', error.message);
            // Don't logout here - Supabase's autoRefreshToken may still recover
          } else if (data.session) {
            console.info('Token refreshed proactively');
          }
        } catch (err) {
          console.warn('Token refresh error:', err);
        }
      }, refreshIn);
    }
  }, []);

  // Load timeout settings from active policy AND system_settings override
  const loadSessionPolicy = useCallback(async () => {
    try {
      // First check system_settings for session_timeout_minutes (admin-configurable)
      const { data: sysData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'session_timeout_minutes')
        .single();

      const systemTimeout = sysData?.setting_value ? parseInt(sysData.setting_value) : null;

      const { data, error } = await supabase
        .from('password_policies')
        .select('session_timeout_minutes, idle_timeout_minutes, auto_refresh_enabled')
        .eq('is_active', true)
        .single();

      if (error && !systemTimeout) return;

      // system_settings takes priority over password_policies
      const effectiveTimeout = (systemTimeout && systemTimeout >= 15) 
        ? systemTimeout 
        : (typeof data?.session_timeout_minutes === 'number' ? data.session_timeout_minutes : DEFAULT_SESSION_TIMEOUT_MINUTES);

      policyRef.current = {
        sessionTimeoutMinutes: effectiveTimeout,
        idleTimeoutMinutes: typeof data?.idle_timeout_minutes === 'number' ? data.idle_timeout_minutes : DEFAULT_IDLE_TIMEOUT_MINUTES,
        autoRefreshEnabled: data?.auto_refresh_enabled !== false,
      };

      // Mark policy as loaded
      policyLoadedRef.current = true;
    } catch {
      // Fall back to defaults
    }
  }, []);

  // Idle & session timeout checker — depends only on [session], NOT on logout
  useEffect(() => {
    if (!session) return;

    // Policy is already loaded by initializeAuth — only load here if it wasn't
    if (!policyLoadedRef.current) {
      loadSessionPolicy();
    }

    const checkTimeouts = () => {
      if (isLoggingOutRef.current) return;

      // Don't check timeouts until policy has been loaded from DB
      if (!policyLoadedRef.current) return;

      const now = Date.now();
      const idleMinutes = (now - lastActivityRef.current) / 60_000;
      const sessionMinutes = (now - sessionStartRef.current) / 60_000;

      const idleLimit = policyRef.current.idleTimeoutMinutes;
      const warningThreshold = idleLimit - IDLE_WARNING_BEFORE_MINUTES;

      // Show idle warning before logout
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
        void logoutRef.current();
        return;
      }

      if (sessionMinutes >= policyRef.current.sessionTimeoutMinutes) {
        toast.warning('Session expired');
        void logoutRef.current();
        return;
      }
    };

    const interval = setInterval(checkTimeouts, SESSION_CHECK_INTERVAL_MS);

    // Activity listeners — mousemove is throttled via updateActivity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

    return () => {
      clearInterval(interval);
      events.forEach(event => window.removeEventListener(event, updateActivity));
    };
    // IMPORTANT: removed `logout` from deps — uses logoutRef instead
  }, [session, updateActivity, loadSessionPolicy]);

  // Handle tab visibility change - refresh session when tab becomes visible
  useEffect(() => {
    if (!session) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !isLoggingOutRef.current) {
        // Update activity on return
        lastActivityRef.current = Date.now();
        lastActivityUpdateRef.current = Date.now();
        idleWarningShownRef.current = false;

        // Check if session is still valid by refreshing
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error || !data.session) {
            console.warn('Session invalid after tab switch');
            toast.warning('Session expired. Please log in again.');
            void logoutRef.current();
          } else {
            // Reload policy in case admin changed it
            await loadSessionPolicy();
            // Re-schedule refresh timer
            scheduleTokenRefresh(data.session);
          }
        } catch (err) {
          console.warn('Error checking session on visibility change:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // Uses logoutRef — no need for logout in deps
  }, [session, loadSessionPolicy, scheduleTokenRefresh]);

  // Initialize auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Ignore events during intentional logout
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
          lastActivityRef.current = Date.now();
          lastActivityUpdateRef.current = Date.now();
          // Also reset session start so active users aren't hit by absolute timeout
          sessionStartRef.current = Date.now();
          scheduleTokenRefresh(currentSession);
          console.info('Auth token refreshed successfully');
        }

        if (currentSession?.user) {
          // Skip if initializeAuth is already handling this (prevents duplicate fetches)
          if (initializingRef.current) {
            return;
          }
          const userId = currentSession.user.id;
          // Parallelize profile + roles fetch
          Promise.all([fetchProfile(userId), fetchRoles(userId)])
            .then(([profileData, rolesData]) => {
              setProfile(profileData);
              setProfileStatus(profileData ? 'loaded' : 'failed');
              setRoles(rolesData);
              setRolesStatus('loaded');
              setIsAuthReady(true);
              setIsLoading(false);
              setAuthBootstrapVersion(v => v + 1);
            })
            .catch((err) => {
              console.error('Failed to load user data after auth change:', err);
              setProfileStatus('failed');
              setRolesStatus('failed');
              setIsAuthReady(true);
              setIsLoading(false); // Always unblock the UI
              setAuthBootstrapVersion(v => v + 1);
            });
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRoles([]);
          setProfileStatus('pending');
          setRolesStatus('pending');
          setIsAuthReady(false);
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      }
    );

    // INITIAL load — fetch profile before setting loading false
    const initializeAuth = async () => {
      initializingRef.current = true;

      // Safety timeout — force unblock UI if init hangs for 15s
      const safetyTimeout = setTimeout(() => {
        console.warn('Auth initialization timed out after 15 seconds — unblocking UI.');
        initializingRef.current = false;
        setIsAuthReady(true);
        setRolesStatus(prev => prev === 'pending' ? 'failed' : prev);
        setProfileStatus(prev => prev === 'pending' ? 'failed' : prev);
        setIsLoading(false);
        setAuthBootstrapVersion(v => v + 1);
      }, 15_000);

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession) {
          sessionStartRef.current = Date.now();
          lastActivityRef.current = Date.now();
          lastActivityUpdateRef.current = Date.now();
          scheduleTokenRefresh(currentSession);
        }

        if (currentSession?.user) {
          let profileOk = false;
          let rolesOk = false;
          try {
            const [profileData, rolesData] = await Promise.all([
              fetchProfile(currentSession.user.id),
              fetchRoles(currentSession.user.id),
              loadSessionPolicy().catch(() => {}),
            ]);
            setProfile(profileData);
            setProfileStatus(profileData ? 'loaded' : 'failed');
            profileOk = !!profileData;
            setRoles(rolesData);
            setRolesStatus('loaded');
            rolesOk = true;
          } catch (dataErr) {
            console.error('Error loading user data during init:', dataErr);
            setProfileStatus('failed');
            setRolesStatus('failed');
          }
        } else {
          // No session — mark data as loaded (nothing to load)
          setProfileStatus('loaded');
          setRolesStatus('loaded');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setProfileStatus('failed');
        setRolesStatus('failed');
      } finally {
        clearTimeout(safetyTimeout);
        initializingRef.current = false;
        setIsAuthReady(true);
        setIsLoading(false);
        setAuthBootstrapVersion(v => v + 1);
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
      // Resolve the actual auth email (handles profile/auth email mismatches)
      let loginEmail = email;
      try {
        const { data: resolveData } = await supabase.functions.invoke('resolve-auth-email', {
          body: { email },
        });
        if (resolveData?.auth_email) {
          loginEmail = resolveData.auth_email;
        }
      } catch (resolveErr) {
        console.warn('Email resolution failed, using provided email:', resolveErr);
      }

      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, locked_until, failed_login_attempts, is_active, force_password_change')
        .or(`email.eq.${email},email.eq.${loginEmail}`)
        .limit(1)
        .maybeSingle();

      if (existingProfile) {
        if (!existingProfile.is_active) {
          return { success: false, error: 'Account is deactivated. Please contact administrator.' };
        }

        if (existingProfile.locked_until) {
          const lockUntil = new Date(existingProfile.locked_until);
          if (lockUntil > new Date()) {
            const minutesRemaining = Math.ceil((lockUntil.getTime() - Date.now()) / 60000);
            return { success: false, error: `Account is locked. Try again in ${minutesRemaining} minutes.` };
          }
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        if (existingProfile) {
          const newAttempts = (existingProfile.failed_login_attempts || 0) + 1;
          const lockoutThreshold = 5;
          
          const updateData: Record<string, unknown> = { 
            failed_login_attempts: newAttempts 
          };
          
          if (newAttempts >= lockoutThreshold) {
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
        // Reset timers on fresh login
        sessionStartRef.current = Date.now();
        lastActivityRef.current = Date.now();
        lastActivityUpdateRef.current = Date.now();
        isLoggingOutRef.current = false;
        idleWarningShownRef.current = false;

        // Load session policy for the new session
        await loadSessionPolicy();

        await supabase
          .from('profiles')
          .update({ 
            failed_login_attempts: 0, 
            locked_until: null,
            last_login: new Date().toISOString()
          })
          .eq('id', data.user.id);

        const profile = await fetchProfile(data.user.id);
        if (profile?.force_password_change) {
          return { success: true, requiresPasswordChange: true };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Check if user has a specific role
  const hasRole = (role: string): boolean => roles.includes(role);

  // Check if user has any of the specified roles
  const hasAnyRole = (checkRoles: string[]): boolean => checkRoles.some(role => roles.includes(role));

  // Check if user is Admin
  const isAdmin = roles.includes('Admin');

  // Check permission
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

  // Compute bootstrap status
  const authBootstrapStatus: AuthBootstrapStatus = !isAuthReady
    ? 'loading'
    : (profileStatus === 'failed' || rolesStatus === 'failed')
      ? 'degraded'
      : 'ready';

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
    authBootstrapVersion,
    login,
    logout,
    hasRole,
    hasAnyRole,
    hasPermission,
    refreshProfile,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};
