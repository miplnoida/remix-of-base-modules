import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Employer application detail as returned from external API
 */
export interface EmployerApplicationDetail {
  // Core identifiers
  id: string;
  reference_number: string | null;
  registration_id: string | null;
  
  // Status
  status: string;
  current_step: number | null;
  created_at: string;
  submitted_at: string | null;
  updated_at: string;
  
  // Contact person details
  contact_name: string | null;
  contact_title: string | null;
  contact_position: string | null;
  email: string | null;
  mobile: string | null;
  mobile_country: string | null;
  mobile_dial_code: string | null;
  phone: string | null;
  phone_country: string | null;
  phone_dial_code: string | null;
  fax: string | null;
  fax_country: string | null;
  fax_dial_code: string | null;
  
  // Employer/Business details
  employer_name: string | null;
  trading_name: string | null;
  business_type: string | null;
  industry_type: string | null;
  tax_id: string | null;
  registration_date: string | null;
  
  // Address
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  parish: string | null;
  country: string | null;
  country_code: string | null;
  postal_code: string | null;
  
  // Mailing address
  mailing_address_line1: string | null;
  mailing_address_line2: string | null;
  mailing_city: string | null;
  mailing_parish: string | null;
  mailing_country: string | null;
  mailing_postal_code: string | null;
  same_as_physical: boolean | null;
  
  // Employment details
  employee_count: number | null;
  payroll_frequency: string | null;
  
  // Banking details
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_number: string | null;
  bank_account_type: string | null;
  
  // Documents
  documents?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    uploaded_at: string;
  }>;
  
  // Additional fields
  remarks: string | null;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

interface ApiResponse {
  data: EmployerApplicationDetail;
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
 * Hook to fetch a single employer application's full details by reference/ID
 */
export function useEmployerApplicationDetail(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['employer-application-detail', applicationId],
    queryFn: async (): Promise<EmployerApplicationDetail | null> => {
      if (!applicationId) return null;
      
      // The employer API uses the application ID directly in the path
      const endpoint = `/${applicationId}`;
      console.log(`Fetching employer application detail via proxy, endpoint: ${endpoint}`);
      
      const response = await callProxyApi('employer-applications', endpoint);
      
      // Handle wrapped response
      if (response && typeof response === 'object') {
        if ('data' in response) {
          return (response as ApiResponse).data;
        }
        return response as EmployerApplicationDetail;
      }
      
      return null;
    },
    enabled: !!applicationId,
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  });
}
