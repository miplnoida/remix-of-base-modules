import { getApiConfig, getApiConfigByModule } from '@/hooks/useApiSettings';

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
  documents?: ApplicationDocument[];
}

export interface ApplicationDocument {
  id: string;
  name: string;
  type: string;
  url?: string;
  uploadedAt: string;
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

/**
 * Service for managing online applications from external APIs
 */
class OnlineApplicationsService {
  private settingKey: string;
  private moduleName: string;

  constructor(settingKey: string, moduleName: string) {
    this.settingKey = settingKey;
    this.moduleName = moduleName;
  }

  /**
   * Get API configuration - tries module-based first, falls back to setting key
   */
  private async getConfig() {
    // Try to get config by linked module first
    let config = await getApiConfigByModule(this.moduleName);
    
    // Fall back to setting key if not found
    if (!config) {
      const legacyConfig = await getApiConfig(this.settingKey);
      if (legacyConfig) {
        config = {
          ...legacyConfig,
          settingKey: this.settingKey,
          settingName: this.settingKey,
        };
      }
    }
    
    if (!config) {
      throw new Error(`API configuration not found for module "${this.moduleName}". Please configure the API settings and link it to this module.`);
    }
    if (!config.isActive) {
      throw new Error(`API is currently disabled for module "${this.moduleName}". Please enable it in the API configuration settings.`);
    }
    return config;
  }

  /**
   * Fetch list of applications
   */
  async fetchApplications(filters?: ApplicationFilters): Promise<InsuredPersonApplication[]> {
    const config = await this.getConfig();
    
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = `${config.baseUrl}/insured-person/applications${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: config.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch applications: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch single application details
   */
  async fetchApplicationById(applicationId: string): Promise<InsuredPersonApplication> {
    const config = await this.getConfig();
    
    const url = `${config.baseUrl}/insured-person/applications/${applicationId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: config.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch application: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Approve an application
   */
  async approveApplication(applicationId: string, payload: ApplicationActionPayload): Promise<void> {
    const config = await this.getConfig();
    
    const url = `${config.baseUrl}/insured-person/applications/${applicationId}/approve`;

    const response = await fetch(url, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to approve application: ${response.statusText}`);
    }
  }

  /**
   * Reject an application
   */
  async rejectApplication(applicationId: string, payload: ApplicationActionPayload): Promise<void> {
    const config = await this.getConfig();
    
    const url = `${config.baseUrl}/insured-person/applications/${applicationId}/reject`;

    const response = await fetch(url, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to reject application: ${response.statusText}`);
    }
  }
}

// Export singleton instances for different application types
export const insuredPersonApplicationsService = new OnlineApplicationsService(
  'insured_person_api', 
  'insured-person-applications'
);

export const employerApplicationsService = new OnlineApplicationsService(
  'employer_api',
  'employer-applications'
);

export const doctorApplicationsService = new OnlineApplicationsService(
  'doctor_api',
  'doctor-applications'
);
