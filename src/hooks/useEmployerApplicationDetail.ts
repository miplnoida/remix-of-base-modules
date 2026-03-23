import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Official/Key Person in the employer organization
 */
export interface EmployerOfficial {
  id: string;
  name: string;
  title: string;
  phone: string;
  phoneCountry?: string;
  email?: string;
  ssn?: string;
}

/**
 * Owner/Partner/Director of the employer
 */
export interface EmployerOwner {
  id: string;
  name: string;
  title: string;
  phone: string;
  phone_country?: string;
  phone_dial_code?: string;
  email: string;
  ssn?: string;
}

/**
 * Business location
 */
export interface EmployerLocation {
  id: string;
  trade_name?: string;
  address1: string;
  address2?: string;
  activity_type?: string;
}

/**
 * Uploaded document
 */
export interface EmployerDocument {
  id: string;
  document_type?: string;
  file_name?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  notes?: string;
  signed_url?: string;
  download_url?: string;  // Primary URL from API
  // Legacy fields for backwards compatibility
  name?: string;
  type?: string;
  url?: string;
  uploaded_at?: string;
}

/**
 * Employer application detail as returned from external API (normalized)
 */
export interface EmployerApplicationDetail {
  // Core identifiers
  id: string;
  //reference_number: string | null;
  registration_id: string | null;
  
  // Status
  status: string;
  current_step: number | null;
  created_at: string;
  submitted_at: string | null;
  updated_at: string;
  
  // Pre-Registration: Contact person details
  contact_name: string | null;
  //contact_title: string | null;
  //contact_position: string | null;
  email: string | null;
  mobile: string | null;
  mobile_country: string | null;
  mobile_dial_code: string | null;
  country: string | null;
  country_code: string | null;
  
  // Step 1: Employer Profile
  incorporated_date: string | null;
  is_acquired: boolean | null;
  date_acquired: string | null;
  previous_owner: string | null;
  //previous_owner_reg_no: string | null;
  prev_owner_address1: string | null;
  prev_owner_address2: string | null;
  ownership_code: string | null;
  //ownership_name: string | null;
  sector_code: string | null;
  //sector_name: string | null;
  parent_reg_no: string | null;
  office_code: string | null;
  //office_name: string | null;
  industry_code: string | null;
  //industry_name: string | null;
  
  // Step 2: Basic Details - Business Identity
  employer_name: string | null;  // Mapped from employer_name
  //legal_name: string | null;
  trade_name: string | null;   // Mapped from trade_name
  business_email: string | null;
  //business_type: string | null;  // Mapped from ownership_name
  //industry_type: string | null;  // Mapped from industry_name
  //tax_id: string | null;
  acquisition_date: string | null;  // Mapped from date_incorporated
  
  // Step 2: HQ Address
  hq_address1: string | null;  // Mapped from hq_address1
  hq_address2: string | null;  // Mapped from hq_address2
  hq_country: string | null;
  hq_country_code: string | null;
  city: string | null;
  parish: string | null;
  postal_code: string | null;
  
  // Step 2: Mailing Address
  mailing_address1: string | null;  // Mapped from mailing_address1
  mailing_address2: string | null;  // Mapped from mailing_address2
  //mailing_city: string | null;
  //mailing_parish: string | null;
  //mailing_country: string | null;
  //mailing_postal_code: string | null;
  //same_as_physical: boolean | null;
  
  // Step 2: Workforce / Employment Details
  application_date: string | null;
  wages_first_paid_date: string | null;
  male_count: number | null;
  female_count: number | null;
  total_employees: number | null;  // Mapped from total_employees
  //payroll_frequency: string | null;
  
  // Step 3: Contact & Reach - Location
  activity_type: string | null;
  //activity_type_name: string | null;
  village_code: string | null;
  //village_name: string | null;
  //inspector_code: string | null;
  //inspector_name: string | null;
  
  // Tech & Finance
  computer_payroll: boolean | null;
  make_model: string | null;
  //disk_tape: string | null;

  // Key Officials
  officials: EmployerOfficial[];
  
  // Step 4: Contact & Reach
  contact_telephone: string | null;           // Mapped from contact_telephone
  contact_telephone_country: string | null;   // Mapped from contact_telephone_country
  contact_telephone_dial_code: string | null; // Mapped from contact_telephone_dial_code
  contact_fax: string | null;             // Mapped from contact_fax
  contact_fax_country: string | null;     // Mapped from contact_fax_country
  contact_fax_dial_code: string | null;   // Mapped from contact_fax_dial_code
  
  // Step 5: Owners/Partners/Directors
  owners: EmployerOwner[];
  total_owners: number | null;
  
  // Step 6: Locations
  locations: EmployerLocation[];
  total_locations: number | null;
  
  // Step 7: Documents
  documents: EmployerDocument[];
  total_documents: number | null;
  
  // Step 8: Notes
  remarks: string | null;  // Mapped from notes
  
  // // Step 9: Declaration
  // declaration_accepted: boolean | null;
  // declaration_date: string | null;
  // signatory_name: string | null;
  // signatory_title: string | null;
  
  // Banking details (if available)
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_number: string | null;
  bank_account_type: string | null;
  
  // Additional metadata
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  is_deleted: boolean | null;
}

interface ApiResponse {
  data: Record<string, unknown>;
  success: boolean;
}

/**
 * Normalize documents array from API response
 */
function normalizeDocuments(docs: unknown): EmployerDocument[] {
  if (!Array.isArray(docs)) return [];
  return docs.map((doc: Record<string, unknown>) => ({
    id: (doc.id as string) || '',
    document_type: (doc.document_type as string) || undefined,
    file_name: (doc.file_name as string) || undefined,
    file_path: (doc.file_path as string) || undefined,
    file_size: (doc.file_size as number) || undefined,
    mime_type: (doc.mime_type as string) || undefined,
    notes: (doc.notes as string) || undefined,
    signed_url: (doc.signed_url as string) || undefined,
    download_url: (doc.download_url as string) || undefined,  // Primary URL from API
    // Legacy fields - prioritize download_url
    name: (doc.name as string) || (doc.file_name as string) || undefined,
    type: (doc.type as string) || (doc.document_type as string) || undefined,
    url: (doc.download_url as string) || (doc.url as string) || (doc.signed_url as string) || undefined,
    uploaded_at: (doc.updated_at as string) || (doc.created_at as string) || undefined,
  }));
}

/**
 * Normalize officials array from API response
 */
function normalizeOfficials(officials: unknown): EmployerOfficial[] {
  if (!Array.isArray(officials)) return [];
  return officials.map((official: Record<string, unknown>) => ({
    id: (official.id as string) || '',
    name: (official.name as string) || (official.fullName as string) || '',
    title: (official.title as string) || (official.position as string) || '',
    phone: (official.phone as string) || (official.telephone as string) || '',
    phoneCountry: (official.phoneCountry as string) || (official.phone_country as string) || undefined,
    email: (official.email as string) || undefined,
    ssn: (official.ssn as string) || undefined,
  }));
}

/**
 * Normalize owners array from API response
 */
function normalizeOwners(owners: unknown): EmployerOwner[] {
  if (!Array.isArray(owners)) return [];
  return owners.map((owner: Record<string, unknown>) => ({
    id: (owner.id as string) || '',
    name: (owner.name as string) || '',
    title: (owner.title as string) || '',
    phone: (owner.phone as string) || '',
    phone_country: (owner.phone_country as string) || undefined,
    phone_dial_code: (owner.phone_dial_code as string) || undefined,
    email: (owner.email as string) || '',
    ssn: (owner.ssn as string) || undefined,
  }));
}

/**
 * Normalize locations array from API response
 */
function normalizeLocations(locations: unknown): EmployerLocation[] {
  if (!Array.isArray(locations)) return [];
  return locations.map((location: Record<string, unknown>) => ({
    id: (location.id as string) || '',
    trade_name: (location.trade_name as string) || undefined,
    address1: (location.address1 as string) || '',
    address2: (location.address2 as string) || undefined,
    activity_type: (location.activity_type as string) || undefined,
  }));
}

/**
 * Normalize raw API response to EmployerApplicationDetail interface
 * Maps external API field names to expected UI field names
 */
function normalizeEmployerDetail(raw: Record<string, unknown>): EmployerApplicationDetail {
  return {
    // Core identifiers
    id: (raw.id as string) || '',
    //reference_number: (raw.reference_number as string) || (raw.id as string) || null,
    registration_id: (raw.registration_id as string) || null,
    
    // Status
    status: (raw.status as string) || '',
    current_step: (raw.current_step as number) || null,
    created_at: (raw.created_at as string) || '',
    submitted_at: (raw.submitted_at as string) || null,
    updated_at: (raw.updated_at as string) || '',
    
    // Pre-Registration: Contact person
    contact_name: (raw.contact_name as string) || null,
    //contact_title: (raw.signatory_title as string) || null,
    //contact_position: (raw.contact_position as string) || null,
    email: (raw.email as string) || null,
    mobile: (raw.mobile as string) || null,
    mobile_country: (raw.mobile_country as string) || null,
    mobile_dial_code: (raw.mobile_dial_code as string) || null,
    country: (raw.country as string) || null,
    country_code: (raw.country_code as string) || null,
    
    // Step 1: Employer Profile
    incorporated_date: (raw.incorporated_date as string) || null,
    is_acquired: (raw.is_acquired as boolean) ?? null,
    date_acquired: (raw.date_acquired as string) || null,
    previous_owner: (raw.previous_owner as string) || null,
    //previous_owner_reg_no: (raw.previous_owner_reg_no as string) || null,
    prev_owner_address1: (raw.previous_owner_address1 as string) || (raw.prev_owner_addr1 as string)  || (raw.prev_owner_address1 as string) || null,
    prev_owner_address2: (raw.previous_owner_address2 as string) || (raw.prev_owner_addr2 as string)  || (raw.prev_owner_address2 as string) || null,
    ownership_code: (raw.ownership_code as string) || null,
    //ownership_name: (raw.ownership_name as string) || null,
    sector_code: (raw.sector_code as string) || null,
    //sector_name: (raw.sector_name as string) || null,
    parent_reg_no: (raw.parent_reg_no as string) || null,
    office_code: (raw.office_code as string) || null,
    //office_name: (raw.office_name as string) || null,
    industry_code: (raw.industry_code as string) || null,
    //industry_name: (raw.industry_name as string) || null,
    
    // Step 2: Business Identity - Map to expected UI fields
    employer_name: (raw.employer_name as string) || null,
    //legal_name: (raw.legal_name as string) || null,
    trade_name: (raw.trade_name as string) || null,
    business_email: (raw.business_email as string) || null,
    //business_type: (raw.ownership_name as string) || (raw.ownership_code as string) || null,
    //industry_type: (raw.activity_type_name as string) || null,
    //tax_id: (raw.tax_id as string) || null,
    acquisition_date: (raw.acquisition_date as string) || null,
    
    // Step 2: HQ Address - Map hq_address1 to address_line1
    hq_address1: (raw.hq_address1 as string) || null,
    hq_address2: (raw.hq_address2 as string) || null,
    hq_country: (raw.hq_country as string) || null,
    hq_country_code: (raw.hq_country_code as string) || null,
    city: (raw.city as string) || null,
    parish: (raw.parish as string) || null,
    postal_code: (raw.postal_code as string) || null,
    
    // Step 2: Mailing Address - Map mailing_address1 to mailing_address_line1
    mailing_address1: (raw.mailing_address1 as string) || null,
    mailing_address2: (raw.mailing_address2 as string) || null,
    //mailing_city: (raw.mailing_city as string) || null,
    //mailing_parish: (raw.mailing_parish as string) || null,
    //mailing_country: (raw.mailing_country as string) || null,
    //mailing_postal_code: (raw.mailing_postal_code as string) || null,
    //same_as_physical: (raw.same_as_physical as boolean) ?? null,
    
    // Step 2: Workforce - Map total_employees to employee_count
    application_date: (raw.application_date as string) || null,
    wages_first_paid_date: (raw.wages_first_paid_date as string) || null,
    male_count: (raw.male_count as number) ?? null,
    female_count: (raw.female_count as number) ?? null,
    total_employees: (raw.total_employees as number) ?? null,
    //payroll_frequency: (raw.payroll_frequency as string) || null,
    
    // Step 3: Contact & Reach - Location
    activity_type: (raw.activity_type as string) || null,
    //activity_type_name: (raw.activity_type_name as string) || null,
    village_code: (raw.village_code as string) || null,
    //village_name: (raw.village_name as string) || null,
    //inspector_code: (raw.inspector_code as string) || null,
    //inspector_name: (raw.inspector_name as string) || null,
    
    // Tech & Finance
    computer_payroll: (raw.computer_payroll as boolean) ?? (raw.computerised_payroll as boolean) ?? null,
    make_model: (raw.make_model as string) || null,
    //disk_tape: (raw.disk_tape as string) || null,

    // Key Officials
    officials: normalizeOfficials(raw.officials),
    
    // Step 4: Contact & Reach - Map contact_telephone to phone
    contact_telephone: (raw.contact_telephone as string) || null,
    contact_telephone_country: (raw.contact_telephone_country as string) || null,
    contact_telephone_dial_code: (raw.contact_telephone_dial_code as string) || null,
    contact_fax: (raw.contact_fax as string) || null,
    contact_fax_country: (raw.contact_fax_country as string) || null,
    contact_fax_dial_code: (raw.contact_fax_dial_code as string) || null,
    
    // Step 5: Owners
    owners: normalizeOwners(raw.owners),
    total_owners: (raw.total_owners as number) ?? null,
    
    // Step 6: Locations
    locations: normalizeLocations(raw.locations),
    total_locations: (raw.total_locations as number) ?? null,
    
    // Step 7: Documents
    documents: normalizeDocuments(raw.documents),
    total_documents: (raw.total_documents as number) ?? null,
    
    // Step 8: Notes - Map notes to remarks
    remarks: (raw.remarks as string) || (raw.notes as string) || null,
    
    // // Step 9: Declaration
    // declaration_accepted: (raw.declaration_accepted as boolean) ?? null,
    // declaration_date: (raw.declaration_date as string) || null,
    // signatory_name: (raw.signatory_name as string) || null,
    // signatory_title: (raw.signatory_title as string) || null,
    
    // Banking (if available)
    bank_name: (raw.bank_name as string) || null,
    bank_branch: (raw.bank_branch as string) || null,
    bank_account_number: (raw.bank_account_number as string) || null,
    bank_account_type: (raw.bank_account_type as string) || null,
    
    // Additional metadata
    rejection_reason: (raw.rejection_reason as string) || null,
    approved_by: (raw.approved_by as string) || null,
    approved_at: (raw.approved_at as string) || null,
    is_deleted: (raw.is_deleted as boolean) ?? null,
  };
}

/**
 * Call the proxy-api edge function to fetch data from external APIs
 * The proxy always returns 200 with _proxyStatus and _proxyOk fields
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
 * Hook to fetch a single employer application's full details by reference/ID
 * 
 * NOTE: Since the external employer API may not support individual record fetching,
 * this hook first tries the direct endpoint, and if that fails with 404, it falls back
 * to fetching the list and finding the record there.
 */
export function useEmployerApplicationDetail(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['employer-application-detail', applicationId],
    queryFn: async (): Promise<EmployerApplicationDetail | null> => {
      if (!applicationId) return null;
      
      // Try to fetch directly first (some APIs support /{id} endpoint)
      try {
        const endpoint = `/${applicationId}`;
        console.log(`Fetching employer application detail via proxy, endpoint: ${endpoint}`);
        
        const response = await callProxyApi('employer-applications', endpoint);
        
        // Check if it's an error response from the external API
        if (response && typeof response === 'object') {
          if ('success' in response && response.success === false) {
            console.log('Direct fetch failed, trying list fallback');
            throw new Error('Direct endpoint not available');
          }
          // Extract data from response wrapper if present
          if ('data' in response && response.data) {
            console.log('Normalizing employer detail from response.data');
            return normalizeEmployerDetail(response.data as Record<string, unknown>);
          }
          // Otherwise normalize the response directly
          console.log('Normalizing employer detail from response');
          return normalizeEmployerDetail(response as Record<string, unknown>);
        }
      } catch (directError) {
        console.log('Direct fetch error, using list fallback:', directError);
      }
      
      // Fallback: Fetch the list and find the matching record
      try {
        const listEndpoint = '/';
        console.log('Falling back to list endpoint to find application');
        const listResponse = await callProxyApi('employer-applications', listEndpoint);
        
        // Normalize the list response
        let applications: Record<string, unknown>[] = [];
        if (Array.isArray(listResponse)) {
          applications = listResponse;
        } else if (listResponse && typeof listResponse === 'object') {
          if ('data' in listResponse && Array.isArray(listResponse.data)) {
            applications = listResponse.data;
          } else if ('records' in listResponse && Array.isArray(listResponse.records)) {
            applications = listResponse.records;
          } else if ('applications' in listResponse && Array.isArray(listResponse.applications)) {
            applications = listResponse.applications;
          }
        }
        
        // Find the matching record by ID or reference_number
        const match = applications.find(
          (app: Record<string, unknown>) => 
            app.id === applicationId || 
            app.reference_number === applicationId
        );
        
        if (match) {
          console.log('Found application in list fallback:', match.id);
          return normalizeEmployerDetail(match);
        }
        
        console.log('Application not found in list either');
        return null;
      } catch (listError) {
        console.error('List fallback also failed:', listError);
        throw listError;
      }
    },
    enabled: !!applicationId,
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  });
}
