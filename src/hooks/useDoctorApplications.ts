import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOnlineApplicationWorkflowBinding } from './useOnlineApplicationWorkflowBinding';

/**
 * Doctor applications API (external)
 * Fetches doctor registration applications from external portal
 */

// Raw doctor list item returned by external API
export interface ExternalDoctorApplicationListItem {
  id: string;
  reference_number: string | null;
  registration_id: string | null;
  registration_number: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  mobile_number: string | null;
  mobile_country: string | null;
  mobile_dial_code: string | null;
  phone: string | null;
  phone_dial_code: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  specialty: string | null;
  main_speciality: string | null;
  license_number: string | null;
  current_step: number | null;
  status: string;
  created_at: string;
  submitted_at: string | null;
  updated_at: string;
}

// Mapped type for UI display
export interface DoctorApplication {
  applicationId: string;
  referenceNumber: string | null;
  registrationId: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  fullName: string;
  email: string | null;
  mobile: string | null;
  mobileDialCode: string | null;
  mobileFormatted: string;
  phone: string | null;
  phoneDialCode: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string | null;
  specialty: string | null;
  licenseNumber: string | null;
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
    const obj = response as Record<string, unknown>;
    // Handle nested data.applications pattern (e.g., { data: { applications: [...] } })
    if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      const nested = obj.data as Record<string, unknown>;
      if (nested.applications && Array.isArray(nested.applications)) return nested.applications as T[];
      if (nested.records && Array.isArray(nested.records)) return nested.records as T[];
      if (nested.data && Array.isArray(nested.data)) return nested.data as T[];
    }
    if (obj.data && Array.isArray(obj.data)) return obj.data as T[];
    if (obj.records && Array.isArray(obj.records)) return obj.records as T[];
    if (obj.applications && Array.isArray(obj.applications)) return obj.applications as T[];
  }
  
  return [];
}

/**
 * Map external API doctor application to internal format
 */
function mapDoctorFromApi(item: ExternalDoctorApplicationListItem): DoctorApplication {
  const dial = item.mobile_dial_code || '';
  const mobile = item.mobile || item.mobile_number || '';
  const mobileFormatted = dial ? `(${dial}) ${mobile}` : mobile;

  const fullName = item.full_name || 
    [item.first_name, item.middle_name, item.last_name].filter(Boolean).join(' ') ||
    'Unknown';

  return {
    applicationId: item.id,
    referenceNumber: item.reference_number,
    registrationId: item.registration_id || item.registration_number,
    firstName: item.first_name,
    middleName: item.middle_name,
    lastName: item.last_name,
    fullName,
    email: item.email,
    mobile: item.mobile || item.mobile_number,
    mobileDialCode: item.mobile_dial_code,
    mobileFormatted,
    phone: item.phone,
    phoneDialCode: item.phone_dial_code,
    dateOfBirth: item.date_of_birth,
    gender: item.gender,
    nationality: item.nationality,
    specialty: item.specialty || item.main_speciality,
    licenseNumber: item.license_number || item.registration_number,
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
    under_review: 'Under Review',
  };
  
  return statusMap[status?.toLowerCase()] || status;
}

/**
 * Get status variant for Badge component
 */
export function getDoctorStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const lowerStatus = status?.toLowerCase();
  
  if (lowerStatus === 'approved') return 'default';
  if (lowerStatus === 'rejected') return 'destructive';
  if (lowerStatus === 'pending' || lowerStatus === 'submitted') return 'outline';
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

  // Check if the proxied request was successful
  if (data && typeof data === 'object' && '_proxyOk' in data) {
    if (!data._proxyOk) {
      const errorMsg = data.error || data.message || 'Request failed';
      throw new Error(errorMsg);
    }
  }

  return data;
}

/**
 * Hook to fetch doctor applications from external API via edge function proxy
 * Automatically binds workflow instances to each application
 */
export function useDoctorApplications(filters?: ApplicationFilters) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['online-applications', 'doctor', filters],
    queryFn: async (): Promise<DoctorApplication[]> => {
      // Build query params for the endpoint
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.fromDate) params.append('fromDate', filters.fromDate);
      if (filters?.toDate) params.append('toDate', filters.toDate);
      if (filters?.search) params.append('search', filters.search);

      const queryString = params.toString();
      const endpoint = `/${queryString ? `?${queryString}` : ''}`;

      console.log(`Fetching doctor applications via proxy, endpoint: ${endpoint}`);

      const data = await callProxyApi('doctor-applications', endpoint);
      const rawApplications = normalizeApiResponse<ExternalDoctorApplicationListItem>(data);
      
      // Map external API format to internal format
      const applications = rawApplications.map(mapDoctorFromApi);
      
      console.log(`Fetched ${applications.length} doctor applications from external API`);
      return applications;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Debug logging
  console.log('[useDoctorApplications] Hook state:', {
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
      mobile: app.mobile,
      phone: app.phone,
      status: app.status,
      submittedAt: app.submittedAt,
    })),
    'doctor',
    query.isSuccess && !query.isFetching
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['online-applications', 'doctor'] });
  };

  return {
    ...query,
    refresh,
  };
}

/**
 * Hook to fetch a single doctor application detail
 */
export function useDoctorApplicationDetail(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['online-applications', 'doctor', 'detail', applicationId],
    queryFn: async () => {
      if (!applicationId) throw new Error('Application ID is required');
      
      const endpoint = `/${applicationId}`;
      console.log(`Fetching doctor application detail via proxy, endpoint: ${endpoint}`);
      
      const data = await callProxyApi('doctor-applications', endpoint);
      
      // Handle case where detail endpoint returns single item or array
      if (Array.isArray(data)) {
        return data[0] || null;
      }
      
      // Handle wrapped response
      if (data && typeof data === 'object') {
        if ('data' in data && !Array.isArray(data.data)) return data.data;
        if ('application' in data) return data.application;
      }
      
      return data;
    },
    enabled: !!applicationId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Hook to approve a doctor application
 */
export function useApproveDoctorApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Registration', 'doctor_applications', 'approve'],
    mutationFn: async ({ applicationId, remarks }: { applicationId: string; remarks: string }) => {
      const endpoint = `/${applicationId}/approve`;
      return await callProxyApi('doctor-applications', endpoint, 'POST', { remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-applications', 'doctor'] });
      toast.success('Doctor application approved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve application: ${error.message}`);
    },
  });
}

/**
 * Hook to reject a doctor application
 */
export function useRejectDoctorApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Registration', 'doctor_applications', 'reject'],
    mutationFn: async ({ applicationId, remarks }: { applicationId: string; remarks: string }) => {
      const endpoint = `/${applicationId}/reject`;
      return await callProxyApi('doctor-applications', endpoint, 'POST', { remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-applications', 'doctor'] });
      toast.success('Doctor application rejected successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject application: ${error.message}`);
    },
  });
}
