import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOnlineApplicationWorkflowBinding } from './useOnlineApplicationWorkflowBinding';

/**
 * Employer applications API (external)
 * NOTE: The configured base_url for this module points to the employer applications function.
 * The list endpoint is the root path ("/") rather than "/applications".
 */

// Raw employer list item returned by external API
export interface ExternalEmployerApplicationListItem {
  id: string; // e.g. "ER-2026-835294" (used for detail fetching)
  reference_number: string | null;
  registration_id: string | null;
  contact_name: string | null;
  email: string | null;
  mobile: string | null;
  mobile_country: string | null;
  mobile_dial_code: string | null;
  country: string | null;
  country_code: string | null;
  current_step: number | null;
  status: string;
  created_at: string;
  submitted_at: string | null;
  updated_at: string;
}

// Mapped type for UI display
export interface EmployerApplication {
  applicationId: string;
  referenceNumber: string | null;
  registrationId: string | null;
  contactName: string | null;
  email: string | null;
  mobile: string | null;
  mobileDialCode: string | null;
  mobileFormatted: string;
  currentStep: number | null;
  status: string;
  statusDisplay: string;
  submittedAt: string | null;
  createdAt: string;
}

export interface ApplicationFilters {
  status?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
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
 * Map external API employer application to internal format
 */
function mapEmployerFromApi(item: ExternalEmployerApplicationListItem): EmployerApplication {
  const dial = item.mobile_dial_code || '';
  const mobile = item.mobile || '';
  const mobileFormatted = dial ? `(${dial}) ${mobile}` : mobile;

  return {
    applicationId: item.id,
    referenceNumber: item.reference_number,
    registrationId: item.registration_id,
    contactName: item.contact_name,
    email: item.email,
    mobile: item.mobile,
    mobileDialCode: item.mobile_dial_code,
    mobileFormatted,
    currentStep: item.current_step,
    status: item.status,
    statusDisplay: formatStatusDisplay(item.status),
    submittedAt: item.submitted_at,
    createdAt: item.created_at,
  };
}

/**
 * Format status for display
 */
function formatStatusDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    submitted: 'Submitted',
    in_progress: 'In Progress',
  };
  
  return statusMap[status?.toLowerCase()] || status;
}

/**
 * Get status variant for Badge component
 */
export function getEmployerStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const lowerStatus = status?.toLowerCase();
  
  if (lowerStatus === 'approved') return 'default';
  if (lowerStatus === 'rejected') return 'destructive';
  if (lowerStatus === 'pending' || lowerStatus === 'submitted') return 'outline';
  return 'secondary';
}

/**
 * Call the proxy-api edge function to fetch data from external APIs
 * The proxy always returns 200 with _proxyStatus and _proxyOk fields
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

  // Check if the proxied request was successful
  if (data && typeof data === 'object' && '_proxyOk' in data) {
    if (!data._proxyOk) {
      // External API returned an error (e.g., 404)
      const errorMsg = data.error || data.message || 'Request failed';
      throw new Error(errorMsg);
    }
  }

  return data;
}

/**
 * Fetch reference numbers of employer applications that have been approved AND converted
 * by querying the local workflow_instances table.
 * Returns a Set of reference numbers to exclude from the listing.
 */
async function fetchApprovedConvertedEmployerRefs(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('workflow_instances')
    .select('source_record_id')
    .eq('source_module', 'online-employer-applications')
    .eq('status', 'Approved');

  if (error) {
    console.error('[useEmployerApplications] Failed to fetch approved refs:', error);
    return new Set();
  }

  const refs = new Set<string>(
    (data || [])
      .map((r: { source_record_id: string | null }) => r.source_record_id)
      .filter((ref): ref is string => !!ref)
  );

  console.log(`[useEmployerApplications] Excluding ${refs.size} approved/converted employer applications from listing`);
  return refs;
}

/**
 * Hook to fetch employer applications from external API via edge function proxy
 * Automatically binds workflow instances to each application
 * Excludes approved/converted applications from the listing
 */
export function useEmployerApplications(filters?: ApplicationFilters) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['online-applications', 'employer', filters],
    queryFn: async (): Promise<EmployerApplication[]> => {
      // Build query params for the endpoint (list endpoint is root path)
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.fromDate) params.append('fromDate', filters.fromDate);
      if (filters?.toDate) params.append('toDate', filters.toDate);
      if (filters?.search) params.append('search', filters.search);

      const queryString = params.toString();
      const endpoint = `/${queryString ? `?${queryString}` : ''}`;

      console.log(`Fetching employer applications via proxy, endpoint: ${endpoint}`);

      // Run both fetches in parallel — external API data + local approved refs
      const [data, approvedRefs] = await Promise.all([
        callProxyApi('employer-applications', endpoint),
        fetchApprovedConvertedEmployerRefs(),
      ]);

      const rawApplications = normalizeApiResponse<ExternalEmployerApplicationListItem>(data);
      
      // Map external API format to internal format, then exclude approved+converted ones
      const applications = rawApplications
        .map(mapEmployerFromApi)
        .filter(app => {
          const ref = app.referenceNumber || app.applicationId;
          if (ref && approvedRefs.has(ref)) {
            console.log(`[useEmployerApplications] Excluding approved application: ${ref}`);
            return false;
          }
          return true;
        });
      
      console.log(`Fetched ${rawApplications.length} employer applications from external API, showing ${applications.length} after excluding approved/converted`);
      return applications;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Debug logging
  console.log('[useEmployerApplications] Hook state:', {
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
      contactName: app.contactName,
      email: app.email,
      mobile: app.mobile,
      status: app.status,
      submittedAt: app.submittedAt,
    })),
    'employer',
    query.isSuccess && !query.isFetching
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['online-applications', 'employer'] });
  };

  return {
    ...query,
    refresh,
  };
}

/**
 * Hook to approve an employer application
 */
export function useApproveEmployerApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, remarks }: { applicationId: string; remarks: string }) => {
      // Employer API uses applicationId path (e.g. /ER-2026-xxxxxx)
      const endpoint = `/${applicationId}/approve`;
      return await callProxyApi('employer-applications', endpoint, 'POST', { remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-applications', 'employer'] });
      toast.success('Employer application approved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve application: ${error.message}`);
    },
  });
}

/**
 * Hook to reject an employer application
 */
export function useRejectEmployerApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, remarks }: { applicationId: string; remarks: string }) => {
      // Employer API uses applicationId path (e.g. /ER-2026-xxxxxx)
      const endpoint = `/${applicationId}/reject`;
      return await callProxyApi('employer-applications', endpoint, 'POST', { remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-applications', 'employer'] });
      toast.success('Employer application rejected successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject application: ${error.message}`);
    },
  });
}
