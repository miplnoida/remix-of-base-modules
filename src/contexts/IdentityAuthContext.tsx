import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { logSecurity, startNewCorrelation } from '@/services/systemLoggerService';
import { getDeviceInfo } from '@/services/correlationIdService';
import { IdentityUser, IdentityRole } from '@/types/identity';

interface IdentityAuthContextType {
  // Supabase auth state
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Identity layer state
  identity: IdentityUser | null;
  roles: IdentityRole[];
  userCode: string | null;
  
  // Role checks
  isAdmin: boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  hasPrivilegedRole: boolean;
  requiresMfa: boolean;
  
  // Auth methods
  login: (email: string, password: string) => Promise<{ 
    success: boolean; 
    error?: string; 
    requiresPasswordChange?: boolean;
    requiresMfa?: boolean;
  }>;
  logout: () => Promise<void>;
  refreshIdentity: () => Promise<void>;
  
  // Permission check (using existing module-action system)
  hasPermission: (moduleName: string, actionName: string) => Promise<boolean>;
}

const IdentityAuthContext = createContext<IdentityAuthContextType | null>(null);

export const useIdentityAuth = () => {
  const context = useContext(IdentityAuthContext);
  if (!context) {
    throw new Error('useIdentityAuth must be used within an IdentityAuthProvider');
  }
  return context;
};

const SESSION_TIMEOUT_MINUTES = 30;
const IDLE_TIMEOUT_MINUTES = 15;

export const IdentityAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [identity, setIdentity] = useState<IdentityUser | null>(null);
  const [roles, setRoles] = useState<IdentityRole[]>([]);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Fetch identity from AspNetUsers via user_identity_map
  const fetchIdentity = useCallback(async (authId: string): Promise<IdentityUser | null> => {
    try {
      // Get mapping first
      const { data: mapping, error: mapError } = await supabase
        .from('user_identity_map')
        .select('identity_user_id, generated_user_code')
        .eq('supabase_auth_id', authId)
        .single();

      if (mapError || !mapping) {
        console.log('No identity mapping found for user:', authId);
        // Fall back to legacy profiles for backward compatibility
        return await fetchLegacyProfile(authId);
      }

      setUserCode(mapping.generated_user_code);

      // Fetch AspNetUsers record
      const { data: userData, error: userError } = await supabase
        .from('AspNetUsers')
        .select('*')
        .eq('Id', mapping.identity_user_id)
        .single();

      if (userError || !userData) {
        console.error('Error fetching AspNetUsers:', userError);
        return null;
      }

      const aspNetUser = userData as any;
      return {
        id: aspNetUser.Id,
        user_code: aspNetUser.user_code || mapping.generated_user_code,
        email: aspNetUser.Email || '',
        userName: aspNetUser.UserName || '',
        firstName: aspNetUser.first_name,
        middleName: aspNetUser.middle_name,
        lastName: aspNetUser.last_name,
        fullName: aspNetUser.full_name,
        title: aspNetUser.title,
        phoneNumber: aspNetUser.PhoneNumber,
        isActive: aspNetUser.is_active,
        emailConfirmed: aspNetUser.EmailConfirmed,
        twoFactorEnabled: aspNetUser.TwoFactorEnabled,
        forcePasswordChange: aspNetUser.force_password_change,
        mfaMethod: aspNetUser.mfa_method,
        departmentId: aspNetUser.department_id,
        designationId: aspNetUser.designation_id,
        officeId: aspNetUser.office_id,
        employeeCode: aspNetUser.employee_code,
        lastLogin: aspNetUser.last_login,
        createdAt: aspNetUser.created_at,
      };
    } catch (error) {
      console.error('Error fetching identity:', error);
      return null;
    }
  }, []);

  // Fallback to legacy profiles table for backward compatibility
  const fetchLegacyProfile = useCallback(async (authId: string): Promise<IdentityUser | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authId)
        .single();

      if (error || !data) {
        return null;
      }

      // Map legacy profile to IdentityUser format
      return {
        id: data.id,
        user_code: data.employee_code || data.id.substring(0, 5).toUpperCase(),
        email: data.email || '',
        userName: data.email || '',
        firstName: data.first_name,
        middleName: data.middle_name,
        lastName: data.last_name,
        fullName: data.full_name,
        title: data.title,
        phoneNumber: data.phone,
        isActive: data.is_active,
        emailConfirmed: true,
        twoFactorEnabled: data.mfa_enabled || false,
        forcePasswordChange: data.force_password_change || false,
        mfaMethod: data.mfa_method,
        departmentId: data.department_id,
        designationId: data.designation_id,
        officeId: data.office_id,
        employeeCode: data.employee_code,
        lastLogin: data.last_login,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Error fetching legacy profile:', error);
      return null;
    }
  }, []);

  // Fetch roles from AspNetUserRoles
  const fetchRoles = useCallback(async (identityUserId: string): Promise<IdentityRole[]> => {
    try {
      const { data, error } = await supabase
        .from('AspNetUserRoles')
        .select(`
          RoleId,
          expires_at,
          AspNetRoles (
            Id,
            Name,
            description,
            is_privileged,
            require_mfa,
            session_timeout_minutes
          )
        `)
        .eq('UserId', identityUserId);

      if (error) {
        console.error('Error fetching roles from AspNetUserRoles:', error);
        // Fall back to legacy user_roles
        return await fetchLegacyRoles(identityUserId);
      }

      if (!data || data.length === 0) {
        // Fall back to legacy user_roles
        return await fetchLegacyRoles(identityUserId);
      }

      return data
        .filter((ur: any) => !ur.expires_at || new Date(ur.expires_at) > new Date())
        .map((ur: any) => ({
          id: ur.AspNetRoles?.Id || ur.RoleId,
          name: ur.AspNetRoles?.Name || 'Unknown',
          description: ur.AspNetRoles?.description || null,
          isPrivileged: ur.AspNetRoles?.is_privileged || false,
          requireMfa: ur.AspNetRoles?.require_mfa || false,
          sessionTimeoutMinutes: ur.AspNetRoles?.session_timeout_minutes || 30,
        }));
    } catch (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
  }, []);

  // Fallback to legacy user_roles table
  const fetchLegacyRoles = useCallback(async (userId: string): Promise<IdentityRole[]> => {
    try {
      // First try with the identity user id, then with supabase auth id
      let { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error || !data || data.length === 0) {
        // Try with supabase auth id (legacy user_id)
        const { data: mapping } = await supabase
          .from('user_identity_map')
          .select('legacy_user_id')
          .eq('identity_user_id', userId)
          .single();

        if (mapping?.legacy_user_id) {
          const result = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', mapping.legacy_user_id);
          data = result.data;
        }
      }

      return (data || []).map((r: any) => ({
        id: r.role,
        name: r.role,
        description: null,
        isPrivileged: r.role === 'Admin',
        requireMfa: r.role === 'Admin',
        sessionTimeoutMinutes: 30,
      }));
    } catch (error) {
      console.error('Error fetching legacy roles:', error);
      return [];
    }
  }, []);

  // Refresh identity data
  const refreshIdentity = useCallback(async () => {
    if (user) {
      const identityData = await fetchIdentity(user.id);
      setIdentity(identityData);
      
      if (identityData) {
        const rolesData = await fetchRoles(identityData.id);
        setRoles(rolesData);
        setUserCode(identityData.user_code);
      }
    }
  }, [user, fetchIdentity, fetchRoles]);

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Idle timeout check
  useEffect(() => {
    if (!session) return;

    const checkIdleTimeout = () => {
      const idleTime = (Date.now() - lastActivity) / 1000 / 60;
      if (idleTime >= IDLE_TIMEOUT_MINUTES) {
        toast.warning('Session expired due to inactivity');
        logout();
      }
    };

    const interval = setInterval(checkIdleTimeout, 60000);
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    return () => {
      clearInterval(interval);
      events.forEach(event => window.removeEventListener(event, updateActivity));
    };
  }, [session, lastActivity, updateActivity]);

  // Initialize auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          setTimeout(async () => {
            const identityData = await fetchIdentity(currentSession.user.id);
            setIdentity(identityData);
            
            if (identityData) {
              const rolesData = await fetchRoles(identityData.id);
              setRoles(rolesData);
              setUserCode(identityData.user_code);
            }
          }, 0);
        } else {
          setIdentity(null);
          setRoles([]);
          setUserCode(null);
        }
        
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchIdentity(currentSession.user.id).then(identityData => {
          setIdentity(identityData);
          if (identityData) {
            fetchRoles(identityData.id).then(setRoles);
            setUserCode(identityData.user_code);
          }
        });
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchIdentity, fetchRoles]);

  // Login function
  const login = async (email: string, password: string): Promise<{ 
    success: boolean; 
    error?: string; 
    requiresPasswordChange?: boolean;
    requiresMfa?: boolean;
  }> => {
    try {
      // Check account status via AspNetUsers or profiles
      let accountLocked = false;
      let accountInactive = false;
      let forcePasswordChange = false;
      let lockoutEnd: Date | null = null;

      // Try AspNetUsers first
      const { data: aspNetUser } = await supabase
        .from('AspNetUsers')
        .select('Id, is_active, LockoutEnd, AccessFailedCount, force_password_change, TwoFactorEnabled')
        .eq('NormalizedEmail', email.toUpperCase())
        .single();

      if (aspNetUser) {
        accountInactive = !aspNetUser.is_active;
        forcePasswordChange = aspNetUser.force_password_change;
        if (aspNetUser.LockoutEnd) {
          lockoutEnd = new Date(aspNetUser.LockoutEnd);
          accountLocked = lockoutEnd > new Date();
        }
      } else {
        // Fall back to profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, is_active, locked_until, failed_login_attempts, force_password_change')
          .eq('email', email)
          .single();

        if (profile) {
          accountInactive = !profile.is_active;
          forcePasswordChange = profile.force_password_change || false;
          if (profile.locked_until) {
            lockoutEnd = new Date(profile.locked_until);
            accountLocked = lockoutEnd > new Date();
          }
        }
      }

      if (accountInactive) {
        return { success: false, error: 'Account is deactivated. Please contact administrator.' };
      }

      if (accountLocked && lockoutEnd) {
        const minutesRemaining = Math.ceil((lockoutEnd.getTime() - Date.now()) / 60000);
        return { success: false, error: `Account is locked. Try again in ${minutesRemaining} minutes.` };
      }

      // Attempt login via Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // Increment failed attempts
        if (aspNetUser) {
          const newAttempts = (aspNetUser.AccessFailedCount || 0) + 1;
          const updateData: Record<string, any> = { AccessFailedCount: newAttempts };
          
          if (newAttempts >= 5) {
            updateData.LockoutEnd = new Date(Date.now() + 30 * 60000).toISOString();
          }

          await supabase
            .from('AspNetUsers')
            .update(updateData)
            .eq('Id', aspNetUser.Id);
        }

        return { success: false, error: error.message };
      }

      // Reset failed attempts and update last login
      if (data.user && aspNetUser) {
        await supabase
          .from('AspNetUsers')
          .update({ 
            AccessFailedCount: 0, 
            LockoutEnd: null,
            last_login: new Date().toISOString()
          })
          .eq('Id', aspNetUser.Id);
      }

      // Also update legacy profiles for backward compatibility
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ 
            failed_login_attempts: 0, 
            locked_until: null,
            last_login: new Date().toISOString()
          })
          .eq('id', data.user.id);
      }

      // Log successful login
      if (data.user) {
        await logSecurity({
          event_type: 'login',
          user_name: email,
          success: true,
          module: 'Authentication',
          api_name: 'login',
          severity: 'info',
          payload_json: {
            device: getDeviceInfo(),
            timestamp: new Date().toISOString(),
            user_code: userCode,
          },
        }, data.user.id);
      }

      return { 
        success: true, 
        requiresPasswordChange: forcePasswordChange,
        requiresMfa: aspNetUser?.TwoFactorEnabled 
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      startNewCorrelation();
      
      if (user) {
        await logSecurity({
          event_type: 'logout',
          user_name: user.email || identity?.fullName || 'Unknown',
          success: true,
          module: 'Authentication',
          api_name: 'logout',
          severity: 'info',
          payload_json: {
            device: getDeviceInfo(),
            timestamp: new Date().toISOString(),
            user_code: userCode,
          },
        }, user.id);

        // Log to audit_logs for backward compatibility
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
      setSession(null);
      setIdentity(null);
      setRoles([]);
      setUserCode(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Role checking helpers
  const hasRole = (roleName: string): boolean => {
    return roles.some(r => r.name.toLowerCase() === roleName.toLowerCase());
  };

  const hasAnyRole = (roleNames: string[]): boolean => {
    return roleNames.some(roleName => hasRole(roleName));
  };

  const isAdmin = roles.some(r => r.name.toLowerCase() === 'admin');
  const hasPrivilegedRole = roles.some(r => r.isPrivileged);
  const requiresMfa = roles.some(r => r.requireMfa);

  // Permission check using existing module-action system
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

  const value: IdentityAuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!session && !!user,
    identity,
    roles,
    userCode,
    isAdmin,
    hasRole,
    hasAnyRole,
    hasPrivilegedRole,
    requiresMfa,
    login,
    logout,
    refreshIdentity,
    hasPermission,
  };

  return (
    <IdentityAuthContext.Provider value={value}>
      {children}
    </IdentityAuthContext.Provider>
  );
};
