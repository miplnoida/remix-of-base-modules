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

interface SupabaseAuthContextType {
  user: User | null;
  profile: UserProfile | null;
  roles: string[];
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
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

const SESSION_TIMEOUT_MINUTES = 30;
const IDLE_TIMEOUT_MINUTES = 15;

export const SupabaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Timeouts (configurable via Password & Security Policy)
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number>(IDLE_TIMEOUT_MINUTES);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(SESSION_TIMEOUT_MINUTES);

  // Track activity without triggering rerenders
  const lastActivityRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());

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

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Load timeout settings from active policy (if available)
  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('password_policies')
          .select('session_timeout_minutes, idle_timeout_minutes')
          .eq('is_active', true)
          .single();

        if (cancelled) return;
        if (error) return;

        const idle = typeof data?.idle_timeout_minutes === 'number' ? data.idle_timeout_minutes : IDLE_TIMEOUT_MINUTES;
        const sess = typeof data?.session_timeout_minutes === 'number' ? data.session_timeout_minutes : SESSION_TIMEOUT_MINUTES;
        setIdleTimeoutMinutes(idle);
        setSessionTimeoutMinutes(sess);
      } catch {
        // If policy can't be loaded due to permissions or missing row, fall back to defaults.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  // Check for idle timeout
  useEffect(() => {
    if (!session) return;

    const checkIdleTimeout = () => {
      const idleTime = (Date.now() - lastActivityRef.current) / 1000 / 60; // minutes
      if (idleTime >= idleTimeoutMinutes) {
        toast.warning('Session expired due to inactivity');
        void logout();
      }
    };

    const checkSessionTimeout = () => {
      const sessionAge = (Date.now() - sessionStartRef.current) / 1000 / 60; // minutes
      if (sessionAge >= sessionTimeoutMinutes) {
        toast.warning('Session expired');
        void logout();
      }
    };

    const interval = setInterval(() => {
      checkIdleTimeout();
      checkSessionTimeout();
    }, 60000); // Check every minute

    // Add activity listeners
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    return () => {
      clearInterval(interval);
      events.forEach(event => window.removeEventListener(event, updateActivity));
    };
  }, [session, idleTimeoutMinutes, sessionTimeoutMinutes, updateActivity]);

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_IN' && currentSession) {
          sessionStartRef.current = Date.now();
          lastActivityRef.current = Date.now();
        }
        
        if (currentSession?.user) {
          // Use setTimeout to prevent Supabase deadlock
          setTimeout(async () => {
            const profileData = await fetchProfile(currentSession.user.id);
            const rolesData = await fetchRoles(currentSession.user.id);
            setProfile(profileData);
            setRoles(rolesData);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        
        setIsLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession) {
        sessionStartRef.current = Date.now();
        lastActivityRef.current = Date.now();
      }
      
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id).then(setProfile);
        fetchRoles(currentSession.user.id).then(setRoles);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRoles]);

  // Login function with lockout check
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; requiresPasswordChange?: boolean }> => {
    try {
      // First check if account is locked (query by email in profiles)
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, locked_until, failed_login_attempts, is_active, force_password_change')
        .eq('email', email)
        .single();

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

      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Increment failed login attempts
        if (existingProfile) {
          const newAttempts = (existingProfile.failed_login_attempts || 0) + 1;
          const lockoutThreshold = 5; // TODO: Get from password_policies table
          
          const updateData: Record<string, unknown> = { 
            failed_login_attempts: newAttempts 
          };
          
          if (newAttempts >= lockoutThreshold) {
            const lockDuration = 30; // TODO: Get from password_policies table
            updateData.locked_until = new Date(Date.now() + lockDuration * 60000).toISOString();
          }

          await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', existingProfile.id);
        }

        return { success: false, error: error.message };
      }

      // Reset failed attempts and update last login on success
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ 
            failed_login_attempts: 0, 
            locked_until: null,
            last_login: new Date().toISOString()
          })
          .eq('id', data.user.id);

        // Check if password change is required
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

  // Logout function with audit logging
  const logout = async () => {
    try {
      startNewCorrelation();
      
      // Log logout event to system security logs
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

        // Also log to legacy audit_logs for backwards compatibility
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
    }
  };

  // Check if user has a specific role
  const hasRole = (role: string): boolean => {
    return roles.includes(role);
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (checkRoles: string[]): boolean => {
    return checkRoles.some(role => roles.includes(role));
  };

  // Check if user is Admin
  const isAdmin = roles.includes('Admin');

  // Check if user has permission for a specific module action
  const hasPermission = async (moduleName: string, actionName: string): Promise<boolean> => {
    if (!user) return false;
    
    // Admin role always has permission
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

  const value: SupabaseAuthContextType = {
    user,
    profile,
    roles,
    session,
    isLoading,
    isAuthenticated: !!session && !!user,
    isAdmin,
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
