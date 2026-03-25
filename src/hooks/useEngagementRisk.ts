import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ResolvedRisk {
  risk_rating: string;
  risk_score: number | null;
  source: string;
  source_id: string | null;
}

export function useResolvedEngagementRisk(departmentId?: string, functionId?: string) {
  return useQuery({
    queryKey: ['ia_resolve_engagement_risk', departmentId, functionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ia_resolve_engagement_risk' as any, {
        p_department_id: departmentId || null,
        p_function_id: functionId || null,
      });
      if (error) throw error;
      return data as unknown as ResolvedRisk;
    },
    enabled: !!(departmentId || functionId),
  });
}
