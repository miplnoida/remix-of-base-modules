import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

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
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_active, force_password_change, mfa_enabled, failed_login_attempts, locked_until, last_login')
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
    setLastActivity(Date.now());
  }, []);

  // Check for idle timeout
  useEffect(() => {
    if (!session) return;

    const checkIdleTimeout = () => {
      const idleTime = (Date.now() - lastActivity) / 1000 / 60; // minutes
      if (idleTime >= IDLE_TIMEOUT_MINUTES) {
        toast.warning('Session expired due to inactivity');
        logout();
      }
    };

    const interval = setInterval(checkIdleTimeout, 60000); // Check every minute

    // Add activity listeners
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    return () => {
      clearInterval(interval);
      events.forEach(event => window.removeEventListener(event, updateActivity));
    };
  }, [session, lastActivity, updateActivity]);

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
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

  // Logout function
  const logout = async () => {
    try {
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

  // Check if user has permission for a specific module action
  const hasPermission = async (moduleName: string, actionName: string): Promise<boolean> => {
    if (!user) return false;
    
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
