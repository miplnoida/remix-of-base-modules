import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// External API endpoint for fetching additional pending applications
const EXTERNAL_API_URL = 'https://hekgiuycrjncxalcapfz.supabase.co/functions/v1/applications';

// Interface for external application data
export interface ExternalApplication {
  id: string;
  unique_uuid: string;
  application_id: string;
  ssn: string | null;
  firstname: string | null;
  first_name: string | null;
  middle_name: string | null;
  surname: string | null;
  last_name: string | null;
  dob: string | null;
  date_of_birth: string | null;
  sex: string | null;
  gender: string | null;
  nationality_code: string | null;
  nationality: string | null;
  phone: string | null;
  telephone: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  registration_date: string | null;
  // Source flag to identify external records
  _source: 'external';
  _externalId?: string;
}

interface UseExternalApplicationsResult {
  externalApplications: ExternalApplication[];
  isLoading: boolean;
  error: string | null;
  fetchExternalApplications: () => Promise<ExternalApplication[]>;
  hasWarning: boolean;
  warningMessage: string | null;
}

/**
 * Hook to fetch applications from the external API
 * Returns merged-ready data with source flags
 */
export function useExternalApplications(): UseExternalApplicationsResult {
  const [externalApplications, setExternalApplications] = useState<ExternalApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const fetchExternalApplications = useCallback(async (): Promise<ExternalApplication[]> => {
    setIsLoading(true);
    setError(null);
    setWarningMessage(null);

    try {
      const response = await fetch(EXTERNAL_API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`External API returned status ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let applications: any[] = [];
      
      if (Array.isArray(data)) {
        applications = data;
      } else if (data && typeof data === 'object') {
        // Handle wrapped response (e.g., { data: [...] } or { applications: [...] })
        applications = data.data || data.applications || data.records || [];
      }

      // Map external data to our format with source flag
      const mappedApplications: ExternalApplication[] = applications.map((app: any, index: number) => ({
        // Generate a unique ID if not present
        id: app.id || `external-${app.application_id || app.reference || index}`,
        unique_uuid: app.unique_uuid || app.uuid || `ext-${app.id || app.application_id || index}`,
        application_id: app.application_id || app.applicationId || app.reference || app.ref_number || `EXT-${index + 1}`,
        ssn: app.ssn || app.social_security_number || null,
        firstname: app.firstname || app.first_name || app.firstName || null,
        first_name: app.first_name || app.firstname || app.firstName || null,
        middle_name: app.middle_name || app.middleName || null,
        surname: app.surname || app.last_name || app.lastName || null,
        last_name: app.last_name || app.surname || app.lastName || null,
        dob: app.dob || app.date_of_birth || app.dateOfBirth || null,
        date_of_birth: app.date_of_birth || app.dob || app.dateOfBirth || null,
        sex: app.sex || app.gender || null,
        gender: app.gender || app.sex || null,
        nationality_code: app.nationality_code || app.nationalityCode || app.nationality || null,
        nationality: app.nationality || app.nationality_code || null,
        phone: app.phone || app.telephone || app.phoneNumber || null,
        telephone: app.telephone || app.phone || app.phoneNumber || null,
        status: app.status || 'P', // Default to Pending for external records
        created_by: app.created_by || app.createdBy || null,
        created_at: app.created_at || app.createdAt || new Date().toISOString(),
        registration_date: app.registration_date || app.registrationDate || null,
        // Source identification
        _source: 'external' as const,
        _externalId: app.id || app.application_id || `ext-${index}`,
      }));

      setExternalApplications(mappedApplications);
      return mappedApplications;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch external applications';
      console.error('External API error:', errorMessage);
      setError(errorMessage);
      setWarningMessage('External applications could not be loaded. Showing local data only.');
      setExternalApplications([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    externalApplications,
    isLoading,
    error,
    fetchExternalApplications,
    hasWarning: !!warningMessage,
    warningMessage,
  };
}

/**
 * Utility function to deduplicate records
 * Uses application_id and ssn for matching
 */
export function deduplicateApplications<T extends { application_id?: string; ssn?: string | null; _source?: string }>(
  localRecords: T[],
  externalRecords: T[]
): T[] {
  // Create a Set of identifiers from local records
  const localIdentifiers = new Set<string>();
  
  localRecords.forEach(record => {
    if (record.application_id) {
      localIdentifiers.add(record.application_id.toLowerCase());
    }
    if (record.ssn) {
      localIdentifiers.add(record.ssn.toLowerCase());
    }
  });

  // Filter external records that don't match local identifiers
  const uniqueExternalRecords = externalRecords.filter(record => {
    const appIdMatch = record.application_id && localIdentifiers.has(record.application_id.toLowerCase());
    const ssnMatch = record.ssn && localIdentifiers.has(record.ssn.toLowerCase());
    return !appIdMatch && !ssnMatch;
  });

  // Return combined list with local records first
  return [...localRecords, ...uniqueExternalRecords];
}

/**
 * Check if a record is from an external source
 */
export function isExternalRecord(record: { _source?: string }): boolean {
  return record._source === 'external';
}
