import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GroupLinkStat { rule_group_id: string; linked_count: number; }

/** Lightweight counts of linked catalogue rules per Rule Group (M2M). */
export function useRuleGroupLinkCounts() {
  return useQuery({
    queryKey: ['bn', 'rule-group-link-counts'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await (supabase as any)
        .from('bn_rule_group_item')
        .select('rule_group_id');
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of (data as any[]) ?? []) {
        map[row.rule_group_id] = (map[row.rule_group_id] || 0) + 1;
      }
      return map;
    },
    staleTime: 30_000,
  });
}
