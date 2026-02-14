import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolves a user_code to the profile's full_name.
 * Returns the full_name or the original code if not found.
 */
export function useProfileNameByUserCode(userCode?: string | null) {
  return useQuery({
    queryKey: ['profile-by-user-code', userCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, user_code')
        .eq('user_code', userCode!)
        .single();
      if (error) return userCode || null;
      return data?.full_name || userCode || null;
    },
    enabled: !!userCode,
    staleTime: 60000,
  });
}
