import { api } from './apis';

/**
 * Dashboard API response types
 */
interface DashboardData {
  id: string;
  title: string;
  value: number;
  change: number;
  type: 'metric' | 'chart' | 'table';
}

/**
 * Dashboard service class
 */
export class DashboardService {
  /**
   * Get dashboard data
   */
  static async getDashboardData(): Promise<DashboardData[]> {
    const response = await api.get<DashboardData[]>('/api/dashboard');
    return response.data;
  }

  /**
   * Get dashboard metrics
   */
  static async getDashboardMetrics(): Promise<DashboardData[]> {
    const response = await api.get<DashboardData[]>('/api/dashboard/metrics');
    return response.data;
  }

  /**
   * Get dashboard charts
   */
  static async getDashboardCharts(): Promise<DashboardData[]> {
    const response = await api.get<DashboardData[]>('/api/dashboard/charts');
    return response.data;
  }
}

// Export types for external use
export type { DashboardData }; 