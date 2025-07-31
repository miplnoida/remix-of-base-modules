import { api } from './apis';

/**
 * Insured person API response types
 */
interface InsuredPerson {
  id: string;
  name: string;
  registrationNumber: string;
  status: 'active' | 'inactive' | 'pending';
  registrationDate: string;
  employerId?: string;
}

/**
 * Insured persons service class
 */
export class InsuredPersonsService {
  /**
   * Get insured persons data
   */
  static async getInsuredPersonsData(): Promise<InsuredPerson[]> {
    const response = await api.get<InsuredPerson[]>('/api/insured-persons');
    return response.data;
  }

  /**
   * Get insured person by ID
   */
  static async getInsuredPersonById(id: string): Promise<InsuredPerson> {
    const response = await api.get<InsuredPerson>(`/api/insured-persons/${id}`);
    return response.data;
  }

  /**
   * Create new insured person
   */
  static async createInsuredPerson(data: Partial<InsuredPerson>): Promise<InsuredPerson> {
    const response = await api.post<InsuredPerson>('/api/insured-persons', data);
    return response.data;
  }

  /**
   * Update insured person
   */
  static async updateInsuredPerson(id: string, data: Partial<InsuredPerson>): Promise<InsuredPerson> {
    const response = await api.put<InsuredPerson>(`/api/insured-persons/${id}`, data);
    return response.data;
  }
}

// Export types for external use
export type { InsuredPerson }; 