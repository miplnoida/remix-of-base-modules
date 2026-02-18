import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ExternalApplicationListItem, 
  ApplicationListItem, 
  mapListItemFromApi 
} from '@/types/externalApplication';
import { useOnlineApplicationWorkflowBinding } from './useOnlineApplicationWorkflowBinding';

// Re-export types for backward compatibility
export type { ApplicationListItem as InsuredPersonApplication };

export interface ApplicationFilters {
  status?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export interface ApplicationActionPayload {
  remarks: string;
}

// Response type from external API
interface ApiResponse<T> {
  data?: T;
  records?: T;
  applications?: T;
  success?: boolean;
  message?: string;
}

/**
 * Normalize various API response formats to a consistent array
 */
function normalizeApiResponse<T>(response: T | T[] | ApiResponse<T[]>): T[] {
  if (Array.isArray(response)) {
    return response;
  }
  
  if (typeof response === 'object' && response !== null) {
    const obj = response as ApiResponse<T[]>;
    if (obj.data && Array.isArray(obj.data)) return obj.data;
    if (obj.records && Array.isArray(obj.records)) return obj.records;
    if (obj.applications && Array.isArray(obj.applications)) return obj.applications;
  }
  
  return [];
}

/**
 * Call the proxy-api edge function to fetch data from external APIs
 */
async function callProxyApi(moduleName: string, endpoint: string, method: string = 'GET', body?: unknown) {
  const { data, error } = await supabase.functions.invoke('proxy-api', {
    method: 'POST',
    body: {
      module: moduleName,
      endpoint,
      method,
      payload: body,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to call proxy API');
  }

  return data;
}

/**
 * Fetch reference numbers of applications that have been approved AND converted
 * by querying the local workflow_instances table (Supabase endpoint).
 * Returns a Set of reference numbers to exclude from the listing.
 */
async function fetchApprovedConvertedRefs(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('workflow_instances')
    .select('source_record_id')
    .eq('source_module', 'insured-person-applications')
    .eq('status', 'Approved');

  if (error) {
    console.error('[useInsuredPersonApplications] Failed to fetch approved refs:', error);
    return new Set();
  }

  const refs = new Set<string>(
    (data || [])
      .map((r: { source_record_id: string | null }) => r.source_record_id)
      .filter((ref): ref is string => !!ref)
  );

  console.log(`[useInsuredPersonApplications] Excluding ${refs.size} approved/converted applications from listing`);
  return refs;
}

/**
 * Hook to fetch insured person applications from external API via edge function proxy
 * Data is fetched DIRECTLY from the external API on each request (no local caching/syncing)
 * Applications that have been approved and converted are excluded via Supabase query.
 * Automatically binds workflow instances to each application
 */
export function useInsuredPersonApplications(filters?: ApplicationFilters) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['online-applications', 'insured-person', filters],
    queryFn: async (): Promise<ApplicationListItem[]> => {
      // Build query params for the endpoint
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.fromDate) params.append('fromDate', filters.fromDate);
      if (filters?.toDate) params.append('toDate', filters.toDate);
      if (filters?.search) params.append('search', filters.search);

      const queryString = params.toString();
      const endpoint = `/applications${queryString ? `?${queryString}` : ''}`;

      console.log(`Fetching insured person applications via proxy, endpoint: ${endpoint}`);

      // Run both fetches in parallel — external API data + local approved refs
      const [data, approvedRefs] = await Promise.all([
        callProxyApi('insured-person-applications', endpoint),
        fetchApprovedConvertedRefs(),
      ]);

      const rawApplications = normalizeApiResponse<ExternalApplicationListItem>(data);
      
      // Map external API format to internal format, then exclude approved+converted ones
      const applications = rawApplications
        .map(mapListItemFromApi)
        .filter(app => {
          const ref = app.referenceNumber || app.applicationId;
          if (ref && approvedRefs.has(ref)) {
            console.log(`[useInsuredPersonApplications] Excluding approved application: ${ref}`);
            return false;
          }
          return true;
        });
      
      console.log(`Fetched ${rawApplications.length} applications from external API, showing ${applications.length} after excluding approved/converted`);
      return applications;
    },
    // Stale time of 30 seconds - data is considered fresh for 30 seconds
    staleTime: 30 * 1000,
    // Refetch on window focus for real-time data
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Debug logging
  console.log('[useInsuredPersonApplications] Hook state:', {
    isSuccess: query.isSuccess,
    isFetching: query.isFetching,
    dataLength: query.data?.length,
    enabled: query.isSuccess && !query.isFetching
  });

  // Automatically bind workflows to applications when data is fetched
  useOnlineApplicationWorkflowBinding(
    query.data?.map(app => ({
      applicationId: app.applicationId,
      referenceNumber: app.referenceNumber,
      fullName: app.fullName,
      email: app.email,
      phone: app.phone,
      status: app.status,
      submittedAt: app.submittedAt,
    })),
    'insured-person',
    query.isSuccess && !query.isFetching
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['online-applications', 'insured-person'] });
  };

  return {
    ...query,
    refresh,
  };
}

/**
 * Hook to approve an insured person application
 */
export function useApproveApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, remarks }: { applicationId: string; remarks: string }) => {
      const endpoint = `/applications/${applicationId}/approve`;
      return await callProxyApi('insured-person-applications', endpoint, 'POST', { remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-applications', 'insured-person'] });
      toast.success('Application approved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve application: ${error.message}`);
    },
  });
}

/**
 * Hook to reject an insured person application
 */
export function useRejectApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, remarks }: { applicationId: string; remarks: string }) => {
      const endpoint = `/applications/${applicationId}/reject`;
      return await callProxyApi('insured-person-applications', endpoint, 'POST', { remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-applications', 'insured-person'] });
      toast.success('Application rejected successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject application: ${error.message}`);
    },
  });
}
