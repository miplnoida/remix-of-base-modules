import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Hook to check if the current user has row-level access to a specific table
 */
export function useRowAccess(tableName: string, action: 'view' | 'edit' | 'delete' = 'view') {
  const { user, isAdmin } = useSupabaseAuth();

  return useQuery({
    queryKey: ['row-access', user?.id, tableName, action],
    queryFn: async () => {
      if (!user?.id) return { allowed: false, reason: 'Not authenticated' };
      if (isAdmin) return { allowed: true, reason: 'Admin access' };

      const { data, error } = await (supabase.rpc as any)('check_row_access', {
        _user_id: user.id,
        _module_name: '',
        _table_name: tableName,
        _action: action
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
}

/**
 * Hook to get visible fields for the current user on a specific table
 */
export function useFieldVisibility(tableName: string, moduleName: string = '') {
  const { user, isAdmin } = useSupabaseAuth();

  return useQuery({
    queryKey: ['field-visibility', user?.id, tableName, moduleName],
    queryFn: async () => {
      if (!user?.id) return [];
      if (isAdmin) return []; // Admins see all fields, no restrictions

      const { data, error } = await (supabase.rpc as any)('get_visible_fields', {
        _user_id: user.id,
        _module_name: moduleName,
        _table_name: tableName
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });
}

/**
 * Utility to mask a field value based on masking type
 */
export function maskFieldValue(value: string | number | null, maskingType: 'none' | 'partial' | 'full'): string {
  if (value === null || value === undefined) return '';
  const strValue = String(value);
  
  switch (maskingType) {
    case 'full':
      return '****';
    case 'partial':
      if (strValue.length <= 4) return '****';
      return '***' + strValue.slice(-4);
    default:
      return strValue;
  }
}

/**
 * Hook to get user-specific data overrides
 */
export function useUserDataOverrides(userId?: string) {
  const { user } = useSupabaseAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['user-data-overrides', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('user_data_overrides')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!targetUserId
  });
}
