/**
 * Centralized hooks for fetching all engagement-scoped data.
 * Used by the EngagementDetail workspace.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function useEngagementTable(table: string, queryKey: string, engagementId?: string, orderBy = 'created_at') {
  return useQuery({
    queryKey: [queryKey, engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .eq('engagement_id', engagementId!)
        .order(orderBy, { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}

export const useEngagementActivities = (id?: string) => useEngagementTable('ia_activities', 'eng_activities', id);
export const useEngagementFindings = (id?: string) => useEngagementTable('ia_findings', 'eng_findings', id);
export const useEngagementControlTests = (id?: string) => useEngagementTable('ia_control_tests', 'eng_control_tests', id);
export const useEngagementTimeLogs = (id?: string) => useEngagementTable('ia_time_logs', 'eng_time_logs', id, 'work_date');
export const useEngagementQualityReviews = (id?: string) => useEngagementTable('ia_quality_reviews', 'eng_quality_reviews', id);
export const useEngagementFollowUps = (id?: string) => useEngagementTable('ia_follow_ups', 'eng_follow_ups', id);
export const useEngagementEvidence = (id?: string) => useEngagementTable('ia_evidence', 'eng_evidence', id);
export const useEngagementWorkingPapers = (id?: string) => useEngagementTable('ia_working_papers', 'eng_working_papers', id);
export const useEngagementActions = (id?: string) => useEngagementTable('ia_action_tracking', 'eng_actions', id);
export const useEngagementReports = (id?: string) => useEngagementTable('ia_audit_reports', 'eng_reports', id);
export const useEngagementCommunications = (id?: string) => useEngagementTable('ia_communications', 'eng_communications', id);

export function useEngagementManagementResponses(engagementId?: string, findingIds?: string[]) {
  return useQuery({
    queryKey: ['eng_mgmt_responses', engagementId, findingIds],
    queryFn: async () => {
      let { data, error } = await supabase
        .from('ia_management_responses' as any)
        .select('*')
        .eq('engagement_id', engagementId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (findingIds && findingIds.length > 0) {
        const { data: indirect, error: err2 } = await supabase
          .from('ia_management_responses' as any)
          .select('*')
          .in('finding_id', findingIds);
        if (!err2 && indirect) {
          const ids = new Set((data || []).map((d: any) => d.id));
          data = [...(data || []), ...indirect.filter((d: any) => !ids.has(d.id))];
        }
      }
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}
