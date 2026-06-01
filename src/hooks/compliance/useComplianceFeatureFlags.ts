/**
 * Loads `feature_flags` rows with `compliance.*` keys into the runtime
 * cache used by `isComplianceFeatureEnabled`. Single source of truth.
 *
 * Mounted by ComplianceRouteGate so any /compliance/* navigation keeps
 * the cache fresh. Safe to call from anywhere — react-query dedupes.
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  setComplianceDbFlags,
  hasComplianceDbFlagsLoaded,
} from '@/lib/compliance/featureFlagCache';

const FLAG_PREFIX = 'compliance.';

export function useComplianceFeatureFlagsBootstrap() {
  const query = useQuery({
    queryKey: ['compliance-feature-flags'],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('flag_key, is_enabled')
        .like('flag_key', `${FLAG_PREFIX}%`);
      if (error) throw error;
      const map: Record<string, boolean> = {};
      (data || []).forEach((r: any) => {
        map[r.flag_key] = !!r.is_enabled;
      });
      return map;
    },
  });

  useEffect(() => {
    if (query.data) {
      setComplianceDbFlags(query.data);
    }
  }, [query.data]);

  return {
    isLoading: query.isLoading && !hasComplianceDbFlagsLoaded(),
    isError: query.isError,
    refetch: query.refetch,
  };
}
