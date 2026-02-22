import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches applicant names from workflow_instances metadata
 * keyed by application_reference (stored in metadata->reference_number).
 */
export function useApplicationNames(applicationReferences: string[]) {
  return useQuery({
    queryKey: ['application-names', applicationReferences],
    queryFn: async (): Promise<Record<string, string>> => {
      if (!applicationReferences.length) return {};

      // Query workflow_instances that have metadata containing our references
      const { data, error } = await supabase
        .from('workflow_instances')
        .select('metadata')
        .in('metadata->>reference_number', applicationReferences);

      if (error) throw error;

      const nameMap: Record<string, string> = {};
      for (const row of data || []) {
        const meta = row.metadata as Record<string, any> | null;
        if (meta?.reference_number && meta?.applicant_name) {
          nameMap[meta.reference_number] = meta.applicant_name;
        }
      }
      return nameMap;
    },
    enabled: applicationReferences.length > 0,
    staleTime: 60000,
  });
}
