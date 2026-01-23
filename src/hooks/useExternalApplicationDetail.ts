import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExternalApplicationDetail } from '@/types/externalApplication';

interface ApiResponse {
  data: ExternalApplicationDetail;
  success: boolean;
}

/**
 * Call the proxy-api edge function to fetch data from external APIs
 */
async function callProxyApi(moduleName: string, endpoint: string) {
  const { data, error } = await supabase.functions.invoke('proxy-api', {
    method: 'POST',
    body: {
      module: moduleName,
      endpoint,
      method: 'GET',
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to call proxy API');
  }

  return data;
}

/**
 * Hook to fetch a single application's full details by reference number
 */
export function useExternalApplicationDetail(referenceNumber: string | undefined) {
  return useQuery({
    queryKey: ['external-application-detail', referenceNumber],
    queryFn: async (): Promise<ExternalApplicationDetail | null> => {
      if (!referenceNumber) return null;
      
      const endpoint = `/applications/${referenceNumber}`;
      console.log(`Fetching application detail via proxy, endpoint: ${endpoint}`);
      
      const response = await callProxyApi('insured-person-applications', endpoint);
      
      // Handle wrapped response
      if (response && typeof response === 'object') {
        if ('data' in response) {
          return (response as ApiResponse).data;
        }
        return response as ExternalApplicationDetail;
      }
      
      return null;
    },
    enabled: !!referenceNumber,
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  });
}
