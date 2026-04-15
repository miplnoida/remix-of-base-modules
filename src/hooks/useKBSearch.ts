import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KBSearchResult {
  content_type: string;
  id: string;
  title: string;
  summary: string | null;
  module_key: string;
  screen_key: string | null;
  rank: number;
}

export function useKBSearch(query: string, moduleKey?: string) {
  return useQuery({
    queryKey: ['kb-search', query, moduleKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('kb_search', {
        p_query: query,
        p_module: moduleKey ?? null,
      });
      if (error) throw error;
      return (data ?? []) as KBSearchResult[];
    },
    enabled: query.trim().length >= 2,
    staleTime: 30 * 1000,
  });
}
