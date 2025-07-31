import { api } from './apis';

/**
 * Employer API response types
 */
interface Employer {
  id: string;
  name: string;
  registrationNumber: string;
  status: 'active' | 'inactive' | 'pending';
  registrationDate: string;
  contactPerson: string;
  email: string;
  phone: string;
}

/**
 * Employers management service class
 */
export class EmployersManagementService {
  /**
   * Get employers management data
   */
  static async getEmployersManagementData(): Promise<Employer[]> {
    const response = await api.get<Employer[]>('/api/employers');
    return response.data;
  }

  /**
   * Get employer by ID
   */
  static async getEmployerById(id: string): Promise<Employer> {
    const response = await api.get<Employer>(`/api/employers/${id}`);
    return response.data;
  }

  /**
   * Create new employer
   */
  static async createEmployer(data: Partial<Employer>): Promise<Employer> {
    const response = await api.post<Employer>('/api/employers', data);
    return response.data;
  }

  /**
   * Update employer
   */
  static async updateEmployer(id: string, data: Partial<Employer>): Promise<Employer> {
    const response = await api.put<Employer>(`/api/employers/${id}`, data);
    return response.data;
  }

  /**
   * Delete employer
   */
  static async deleteEmployer(id: string): Promise<void> {
    await api.delete(`/api/employers/${id}`);
  }
}

// Export types for external use
export type { Employer }; 