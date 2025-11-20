import { legalConfig } from "@/config/legalConfig";

import { ContributionComponent, ComponentBreakdown } from '@/types/contributionComponents';

export interface PeriodOwed {
  id: string;
  caseId: string;
  periodFrom: string; // YYYY-MM
  periodTo: string;   // YYYY-MM
  amount: number;
  type: 'current' | 'arrears';
  isEstimated: boolean;
  componentBreakdown: ComponentBreakdown[];
}

const mockPeriods: PeriodOwed[] = [];

export const complianceAdapter = {
  async listArrears(filters: { regNo?: string; caseId?: string }): Promise<PeriodOwed[]> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 100));
      let result = mockPeriods;
      if (filters.caseId) {
        result = result.filter(p => p.caseId === filters.caseId);
      }
      return result;
    }
    
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`/api/compliance/arrears?${params}`);
    if (!response.ok) return [];
    return response.json();
  },

  async importPeriodsOwed(data: {
    caseId: string;
    periods: Array<{
      periodFrom: string;
      periodTo: string;
      amount: number;
      type: 'current' | 'arrears';
      isEstimated: boolean;
      componentBreakdown?: ComponentBreakdown[];
    }>;
  }): Promise<PeriodOwed[]> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 150));
      const newPeriods = data.periods.map(p => ({
        id: `PERIOD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        caseId: data.caseId,
        ...p,
        componentBreakdown: p.componentBreakdown || []
      }));
      mockPeriods.push(...newPeriods);
      return newPeriods;
    }
    
    const response = await fetch('/api/compliance/import-periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to import periods');
    return response.json();
  }
};
