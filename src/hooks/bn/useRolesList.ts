import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RoleOption {
  id: string;
  role_name: string;
  description: string | null;
}

export const useActiveRoles = () =>
  useQuery({
    queryKey: ['roles', 'active'],
    queryFn: async (): Promise<RoleOption[]> => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, role_name, description')
        .eq('is_active', true)
        .order('role_name');
      if (error) throw error;
      return (data ?? []) as RoleOption[];
    },
    staleTime: 5 * 60 * 1000,
  });
