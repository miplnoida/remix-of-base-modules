import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOnlineApplicationWorkflowBinding } from './useOnlineApplicationWorkflowBinding';

/**
 * Employer applications API (external)
 * The configured base_url for this module points to the employer applications function.
 * The list endpoint is the root path ("/") with query parameters for filtering, pagination, sorting.
 */

// Raw employer list item returned by external API
export interface ExternalEmployerApplicationListItem {
  id: string;
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

/**
 * All supported API filter/pagination/sort parameters
 */
export interface EmployerApplicationApiParams {
  page: number;
  limit: number;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  email?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const EMPLOYER_APP_DEFAULT_PARAMS: EmployerApplicationApiParams = {
  page: 1,
  limit: 20,
  status: 'active',
  sortBy: 'created_at',
  sortOrder: 'desc',
};

export const EMPLOYER_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'appointment_scheduled', label: 'Appointment Scheduled' },
];

export const EMPLOYER_SORT_BY_OPTIONS = [
  { value: 'created_at', label: 'Created Date' },
  { value: 'updated_at', label: 'Updated Date' },
  { value: 'submitted_at', label: 'Submitted Date' },
  { value: 'email', label: 'Email' },
  { value: 'status', label: 'Status' },
];

export const EMPLOYER_SORT_ORDER_OPTIONS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

// Response type from external API (may include pagination metadata)
interface ApiResponse<T> {
  data?: T;
  records?: T;
  applications?: T;
  success?: boolean;
  message?: string;
  total?: number;
  totalPages?: number;
  page?: number;
  limit?: number;
}

export interface EmployerApplicationsResult {
  applications: EmployerApplication[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

/**
 * Normalize various API response formats to a consistent array + pagination metadata
 */
function normalizeApiResponse(response: unknown): { items: ExternalEmployerApplicationListItem[]; total: number; totalPages: number; page: number; limit: number } {
  let items: ExternalEmployerApplicationListItem[] = [];
  let total = 0;
  let totalPages = 1;
  let page = 1;
  let limit = 20;

  if (Array.isArray(response)) {
    items = response;
    total = items.length;
  } else if (typeof response === 'object' && response !== null) {
    const obj = response as ApiResponse<ExternalEmployerApplicationListItem[]>;
    if (obj.data && Array.isArray(obj.data)) items = obj.data;
    else if (obj.records && Array.isArray(obj.records)) items = obj.records;
    else if (obj.applications && Array.isArray(obj.applications)) items = obj.applications;
    
    if (typeof obj.total === 'number') total = obj.total;
    else total = items.length;
    
    if (typeof obj.totalPages === 'number') totalPages = obj.totalPages;
    if (typeof obj.page === 'number') page = obj.page;
    if (typeof obj.limit === 'number') limit = obj.limit;
  }

  if (totalPages <= 0 && total > 0 && limit > 0) {
    totalPages = Math.ceil(total / limit);
  }

  return { items, total, totalPages, page, limit };
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
    active: 'Active',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    submitted: 'Submitted',
    in_progress: 'In Progress',
    under_review: 'Under Review',
    cancelled: 'Cancelled',
    appointment_scheduled: 'Appointment Scheduled',
  };
  
  return statusMap[status?.toLowerCase()] || status;
}

/**
 * Get status variant for Badge component
 */
export function getEmployerStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const lowerStatus = status?.toLowerCase();
  
  if (lowerStatus === 'approved') return 'default';
  if (lowerStatus === 'rejected' || lowerStatus === 'cancelled') return 'destructive';
  if (lowerStatus === 'pending' || lowerStatus === 'submitted' || lowerStatus === 'active') return 'outline';
  return 'secondary';
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

  if (data && typeof data === 'object' && '_proxyOk' in data) {
    if (!data._proxyOk) {
      const errorMsg = data.error || data.message || 'Request failed';
      throw new Error(errorMsg);
    }
  }

  return data;
}

/**
 * Build query string from API params
 */
function buildEndpoint(params: EmployerApplicationApiParams): string {
  const qs = new URLSearchParams();
  
  qs.append('page', String(params.page));
  qs.append('limit', String(Math.min(params.limit, 100)));
  qs.append('status', params.status);
  qs.append('sortBy', params.sortBy);
  qs.append('sortOrder', params.sortOrder);
  
  if (params.search?.trim()) qs.append('search', params.search.trim());
  if (params.email?.trim()) qs.append('email', params.email.trim());
  if (params.dateFrom) qs.append('dateFrom', params.dateFrom);
  if (params.dateTo) qs.append('dateTo', params.dateTo);
  
  return `/?${qs.toString()}`;
}

/**
 * Hook to fetch employer applications with full API-driven filtering, pagination, sorting
 */
export function useEmployerApplications(params: EmployerApplicationApiParams = EMPLOYER_APP_DEFAULT_PARAMS) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['online-applications', 'employer', params],
    queryFn: async (): Promise<EmployerApplicationsResult> => {
      const endpoint = buildEndpoint(params);
      console.log(`[useEmployerApplications] Fetching employer applications, endpoint: ${endpoint}`);

      const data = await callProxyApi('employer-applications', endpoint);
      const { items, total, totalPages, page, limit } = normalizeApiResponse(data);
      const applications = items.map(mapEmployerFromApi);

      console.log(`[useEmployerApplications] Fetched ${applications.length} applications (total: ${total}, page: ${page}/${totalPages})`);

      return { applications, total, totalPages, page, limit };
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Automatically bind workflows to applications when data is fetched
  useOnlineApplicationWorkflowBinding(
    query.data?.applications?.map(app => ({
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
    mutationKey: ['Registration', 'er_master', 'approve'],
    mutationFn: async ({ applicationId, remarks }: { applicationId: string; remarks: string }) => {
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
    mutationKey: ['Registration', 'er_master', 'reject'],
    mutationFn: async ({ applicationId, remarks }: { applicationId: string; remarks: string }) => {
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
