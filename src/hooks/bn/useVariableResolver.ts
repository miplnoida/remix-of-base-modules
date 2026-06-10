/**
 * useVariableResolver — react-query wrapper around the Variable Resolver
 * service. Cached for 60s, shared across Formula Library, Calculation
 * Builder and any other consumer that needs to validate identifiers.
 */
import { useQuery } from '@tanstack/react-query';
import { loadResolverMap, type ResolverMap } from '@/services/bn/variableResolverService';

export function useVariableResolver() {
  return useQuery<ResolverMap>({
    queryKey: ['bn', 'variable-resolver'],
    queryFn: loadResolverMap,
    staleTime: 60_000,
  });
}
