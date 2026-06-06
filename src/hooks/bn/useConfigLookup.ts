import { useQuery } from '@tanstack/react-query';
import { configLookupLoaders, type ConfigLookupKey } from '@/services/bn/registries/configLookupService';

/**
 * useConfigLookup — react-query wrapper around the lookup service.
 * Cached for 60s and shared across all consumers of the same key.
 */
export function useConfigLookup(key: ConfigLookupKey) {
  return useQuery({
    queryKey: ['bn-config-lookup', key],
    queryFn: configLookupLoaders[key],
    staleTime: 60_000,
  });
}
