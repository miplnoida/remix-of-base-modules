import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Employer application list item from external API
export interface EmployerApplicationListItem {
  id: string;
  referenceNumber: string;
  registrationNumber: string | null;
  employerName: string;
  tradeName?: string;
  email: string;
  phone: string;
  phoneDialCode?: string;
  businessType?: string;
  status: string;
  createdAt: string;
  submittedAt: string;
  updatedAt: string;
}

// Mapped type for UI display
export interface EmployerApplication {
  applicationId: string;
  referenceNumber: string;
  employerName: string;
  tradeName?: string;
  email: string;
  phone: string;
  phoneFormatted: string;
  businessType?: string;
  status: string;
  statusDisplay: string;
  submittedAt: string;
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
function mapEmployerFromApi(item: EmployerApplicationListItem): EmployerApplication {
  const phoneFormatted = item.phoneDialCode 
    ? `(${item.phoneDialCode}) ${item.phone}`
    : item.phone;
  
  return {
    applicationId: item.id,
    referenceNumber: item.referenceNumber,
    employerName: item.employerName,
    tradeName: item.tradeName,
    email: item.email,
    phone: item.phone,
    phoneFormatted,
    businessType: item.businessType,
    status: item.status,
    statusDisplay: formatStatusDisplay(item.status),
    submittedAt: item.submittedAt,
    createdAt: item.createdAt,
  };
}

/**
 * Format status for display
 */
function formatStatusDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Pending',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'in-office - in progress': 'Under Review',
    'In-Office - In Progress': 'Under Review',
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
  if (lowerStatus === 'pending') return 'outline';
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

  return data;
}

/**
 * Hook to fetch employer applications from external API via edge function proxy
 */
export function useEmployerApplications(filters?: ApplicationFilters) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['online-applications', 'employer', filters],
    queryFn: async (): Promise<EmployerApplication[]> => {
      // Build query params for the endpoint
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.fromDate) params.append('fromDate', filters.fromDate);
      if (filters?.toDate) params.append('toDate', filters.toDate);
      if (filters?.search) params.append('search', filters.search);

      const queryString = params.toString();
      const endpoint = `/applications${queryString ? `?${queryString}` : ''}`;

      console.log(`Fetching employer applications via proxy, endpoint: ${endpoint}`);

      const data = await callProxyApi('employer-applications', endpoint);
      const rawApplications = normalizeApiResponse<EmployerApplicationListItem>(data);
      
      // Map external API format to internal format
      const applications = rawApplications.map(mapEmployerFromApi);
      
      console.log(`Fetched ${applications.length} employer applications from external API`);
      return applications;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

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
      const endpoint = `/applications/${applicationId}/approve`;
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
      const endpoint = `/applications/${applicationId}/reject`;
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
