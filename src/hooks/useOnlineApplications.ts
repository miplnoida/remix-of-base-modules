import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiConfigByModule, getApiConfig } from './useApiSettings';
import { toast } from 'sonner';

// Types for Online Applications
export interface InsuredPersonApplication {
  applicationId: string;
  ssn?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality?: string;
  email?: string;
  phone?: string;
  address?: string;
  registrationDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'UnderReview';
  remarks?: string;
}

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
 * Hook to fetch insured person applications from external API
 * Data is fetched DIRECTLY from the external API on each request (no local caching/syncing)
 */
export function useInsuredPersonApplications(filters?: ApplicationFilters) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['online-applications', 'insured-person', filters],
    queryFn: async (): Promise<InsuredPersonApplication[]> => {
      // First try to get config by linked module
      let config = await getApiConfigByModule('insured-person-applications');
      
      // Fallback to legacy setting key
      if (!config) {
        const legacyConfig = await getApiConfig('insured_person_api');
        if (legacyConfig) {
          config = {
            ...legacyConfig,
            settingKey: 'insured_person_api',
            settingName: 'Insured Person API',
          };
        }
      }
      
      if (!config) {
        throw new Error('API not configured. Please configure the API in Administration → API Configuration and link it to "Insured Person Applications" module.');
      }
      
      if (!config.isActive) {
        throw new Error('API is disabled. Please enable it in API Configuration settings.');
      }

      if (!config.baseUrl) {
        throw new Error('API Base URL is not configured. Please set the Base URL in API Configuration.');
      }

      // Build query params
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.fromDate) params.append('fromDate', filters.fromDate);
      if (filters?.toDate) params.append('toDate', filters.toDate);
      if (filters?.search) params.append('search', filters.search);

      const queryString = params.toString();
      const url = `${config.baseUrl}/applications${queryString ? `?${queryString}` : ''}`;

      console.log(`Fetching insured person applications from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: config.headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const applications = normalizeApiResponse<InsuredPersonApplication>(data);
      
      console.log(`Fetched ${applications.length} applications from external API`);
      return applications;
    },
    // Stale time of 30 seconds - data is considered fresh for 30 seconds
    staleTime: 30 * 1000,
    // Refetch on window focus for real-time data
    refetchOnWindowFocus: true,
    retry: 1,
  });

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
      let config = await getApiConfigByModule('insured-person-applications');
      
      if (!config) {
        const legacyConfig = await getApiConfig('insured_person_api');
        if (legacyConfig) {
          config = {
            ...legacyConfig,
            settingKey: 'insured_person_api',
            settingName: 'Insured Person API',
          };
        }
      }
      
      if (!config || !config.isActive) {
        throw new Error('API not configured or inactive');
      }

      const url = `${config.baseUrl}/applications/${applicationId}/approve`;
      const response = await fetch(url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify({ remarks }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to approve: ${errorText || response.statusText}`);
      }

      return response.json();
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
      let config = await getApiConfigByModule('insured-person-applications');
      
      if (!config) {
        const legacyConfig = await getApiConfig('insured_person_api');
        if (legacyConfig) {
          config = {
            ...legacyConfig,
            settingKey: 'insured_person_api',
            settingName: 'Insured Person API',
          };
        }
      }
      
      if (!config || !config.isActive) {
        throw new Error('API not configured or inactive');
      }

      const url = `${config.baseUrl}/applications/${applicationId}/reject`;
      const response = await fetch(url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify({ remarks }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to reject: ${errorText || response.statusText}`);
      }

      return response.json();
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
