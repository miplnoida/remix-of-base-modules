import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

const db = supabase as any;

export interface EffectiveRole {
  user_id: string;
  role_name: string;
  source: 'DIRECT' | 'BUNDLE' | 'DELEGATION';
}

/** All roles for a given user, expanded via bundles and active delegations. */
export function useEffectiveRoles(userId?: string) {
  return useQuery({
    queryKey: ['bn', 'effective-roles', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<EffectiveRole[]> => {
      const { data, error } = await db
        .from('v_bn_user_effective_roles')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return (data || []) as EffectiveRole[];
    },
  });
}

/** Effective roles for the currently logged-in user. */
export function useMyEffectiveRoles() {
  const { user, isAuthReady, isAuthenticated } = useSupabaseAuth();
  const enabled = isAuthReady && isAuthenticated && !!user?.id;
  return useQuery({
    queryKey: ['bn', 'effective-roles', 'me', user?.id],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<EffectiveRole[]> => {
      const { data, error } = await db
        .from('v_bn_user_effective_roles')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data || []) as EffectiveRole[];
    },
  });
}
