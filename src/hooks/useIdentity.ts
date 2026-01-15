import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  AspNetUser, 
  AspNetRole, 
  IdentityUser, 
  IdentityRole,
  UserIdentityMap 
} from '@/types/identity';

/**
 * Hook for working with Microsoft Identity compatible tables
 */
export const useIdentity = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get identity user by Supabase auth ID
   */
  const getIdentityByAuthId = useCallback(async (authId: string): Promise<IdentityUser | null> => {
    setLoading(true);
    setError(null);
    try {
      // First get the mapping
      const { data: mapping, error: mapError } = await supabase
        .from('user_identity_map')
        .select('*')
        .eq('supabase_auth_id', authId)
        .single();

      if (mapError || !mapping) {
        return null;
      }

      // Then get the AspNetUsers record
      const { data: userData, error: userError } = await supabase
        .from('AspNetUsers')
        .select('*')
        .eq('Id', mapping.identity_user_id)
        .single();

      if (userError || !userData) {
        return null;
      }

      return mapAspNetUserToIdentity(userData as unknown as AspNetUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get identity');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get identity user by user_code
   */
  const getIdentityByUserCode = useCallback(async (userCode: string): Promise<IdentityUser | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('AspNetUsers')
        .select('*')
        .eq('user_code', userCode)
        .single();

      if (fetchError || !data) {
        return null;
      }

      return mapAspNetUserToIdentity(data as unknown as AspNetUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get identity');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get user roles from AspNetUserRoles
   */
  const getUserRoles = useCallback(async (userId: string): Promise<IdentityRole[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('AspNetUserRoles')
        .select(`
          RoleId,
          expires_at,
          AspNetRoles:RoleId (
            Id,
            Name,
            description,
            is_privileged,
            require_mfa,
            session_timeout_minutes
          )
        `)
        .eq('UserId', userId)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (fetchError) {
        throw fetchError;
      }

      return (data || []).map((ur: any) => ({
        id: ur.AspNetRoles.Id,
        name: ur.AspNetRoles.Name,
        description: ur.AspNetRoles.description,
        isPrivileged: ur.AspNetRoles.is_privileged,
        requireMfa: ur.AspNetRoles.require_mfa,
        sessionTimeoutMinutes: ur.AspNetRoles.session_timeout_minutes,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get roles');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get all available roles
   */
  const getAllRoles = useCallback(async (): Promise<IdentityRole[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('AspNetRoles')
        .select('*')
        .eq('is_active', true)
        .order('Name');

      if (fetchError) {
        throw fetchError;
      }

      return (data || []).map((r: any) => ({
        id: r.Id,
        name: r.Name,
        description: r.description,
        isPrivileged: r.is_privileged,
        requireMfa: r.require_mfa,
        sessionTimeoutMinutes: r.session_timeout_minutes,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get roles');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback(async (userId: string, roleName: string): Promise<boolean> => {
    try {
      const { data, error: fetchError } = await supabase
        .rpc('identity_has_role', {
          _user_id: userId,
          _role_name: roleName
        });

      if (fetchError) {
        throw fetchError;
      }

      return data ?? false;
    } catch (err) {
      console.error('Error checking role:', err);
      return false;
    }
  }, []);

  /**
   * Get user_code for a Supabase auth ID
   */
  const getUserCode = useCallback(async (authId: string): Promise<string | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('user_identity_map')
        .select('generated_user_code')
        .eq('supabase_auth_id', authId)
        .single();

      if (fetchError || !data) {
        return null;
      }

      return data.generated_user_code;
    } catch (err) {
      console.error('Error getting user code:', err);
      return null;
    }
  }, []);

  /**
   * Generate user code for new user (calls database function)
   */
  const generateUserCode = useCallback(async (
    firstName: string,
    middleName: string | null,
    lastName: string
  ): Promise<string | null> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('generate_user_code', {
          p_first_name: firstName,
          p_middle_name: middleName,
          p_last_name: lastName
        });

      if (rpcError) {
        throw rpcError;
      }

      return data;
    } catch (err) {
      console.error('Error generating user code:', err);
      return null;
    }
  }, []);

  return {
    loading,
    error,
    getIdentityByAuthId,
    getIdentityByUserCode,
    getUserRoles,
    getAllRoles,
    hasRole,
    getUserCode,
    generateUserCode,
  };
};

/**
 * Map AspNetUser to IdentityUser
 */
function mapAspNetUserToIdentity(user: AspNetUser): IdentityUser {
  return {
    id: user.Id,
    user_code: user.user_code || '',
    email: user.Email || '',
    userName: user.UserName || '',
    firstName: user.first_name,
    middleName: user.middle_name,
    lastName: user.last_name,
    fullName: user.full_name,
    title: user.title,
    phoneNumber: user.PhoneNumber,
    isActive: user.is_active,
    emailConfirmed: user.EmailConfirmed,
    twoFactorEnabled: user.TwoFactorEnabled,
    forcePasswordChange: user.force_password_change,
    mfaMethod: user.mfa_method,
    departmentId: user.department_id,
    designationId: user.designation_id,
    officeId: user.office_id,
    employeeCode: user.employee_code,
    lastLogin: user.last_login,
    createdAt: user.created_at,
  };
}

export default useIdentity;
