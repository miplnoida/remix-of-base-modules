import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns whether the Legal Advanced module is enabled via `feature_flags`.
 * Falls back to false on any error so the module stays hidden when in doubt.
 */
export function useLegalAdvancedEnabled() {
  const q = useQuery({
    queryKey: ['feature-flag', 'legal_advanced_enabled'],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('is_enabled')
        .eq('flag_key', 'legal_advanced_enabled')
        .maybeSingle();
      if (error) return false;
      return !!data?.is_enabled;
    },
  });
  return { enabled: !!q.data, isLoading: q.isLoading, refetch: q.refetch };
}
