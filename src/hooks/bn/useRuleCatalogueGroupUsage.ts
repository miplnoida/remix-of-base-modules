import { useQuery } from '@tanstack/react-query';
import { getGroupUsageMap } from '@/services/bn/ruleGroupItemService';

export function useRuleCatalogueGroupUsage() {
  return useQuery({
    queryKey: ['bn', 'rule-catalogue-group-usage'],
    queryFn: getGroupUsageMap,
    staleTime: 30_000,
  });
}
