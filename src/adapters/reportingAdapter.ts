import { legalConfig } from "@/config/legalConfig";

export interface ReportMetrics {
  caseVolumeByType: Array<{ type: string; count: number }>;
  durationByStage: Array<{ stage: string; avgDays: number }>;
  slaCompliance: { compliant: number; breached: number; percentage: number };
  outcomesByType: Array<{ type: string; outcome: string; count: number }>;
  penaltiesAssessedVsCollected: Array<{ month: string; assessed: number; collected: number }>;
  enforcementFunnel: Array<{ stage: string; count: number }>;
  workloadByOfficer: Array<{ officer: string; activeCases: number; completedThisMonth: number }>;
}

const mockMetrics: ReportMetrics = {
  caseVolumeByType: [
    { type: "Prosecution", count: 45 },
    { type: "Compliance", count: 32 },
    { type: "Recovery", count: 28 },
    { type: "Appeal", count: 12 }
  ],
  durationByStage: [
    { stage: "Intake", avgDays: 3 },
    { stage: "Under Review", avgDays: 14 },
    { stage: "Hearing Scheduled", avgDays: 21 },
    { stage: "Decision Pending", avgDays: 10 }
  ],
  slaCompliance: { compliant: 89, breached: 11, percentage: 89 },
  outcomesByType: [
    { type: "Prosecution", outcome: "Closed – Compliant", count: 25 },
    { type: "Prosecution", outcome: "Closed – Non-Compliant", count: 8 },
    { type: "Compliance", outcome: "Closed – Compliant", count: 18 },
    { type: "Recovery", outcome: "Order Issued", count: 15 }
  ],
  penaltiesAssessedVsCollected: [
    { month: "Jan", assessed: 125000, collected: 98000 },
    { month: "Feb", assessed: 145000, collected: 112000 },
    { month: "Mar", assessed: 135000, collected: 105000 },
    { month: "Apr", assessed: 150000, collected: 118000 }
  ],
  enforcementFunnel: [
    { stage: "Summons", count: 85 },
    { stage: "Judgment Summons", count: 42 },
    { stage: "Warrant", count: 18 },
    { stage: "Writ", count: 7 }
  ],
  workloadByOfficer: [
    { officer: "J. Smith", activeCases: 12, completedThisMonth: 5 },
    { officer: "M. Davis", activeCases: 15, completedThisMonth: 7 },
    { officer: "R. Johnson", activeCases: 10, completedThisMonth: 4 }
  ]
};

export const reportingAdapter = {
  async getMetrics(filters?: { startDate?: string; endDate?: string }): Promise<ReportMetrics> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockMetrics;
    }
    
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`/api/reports/metrics?${params}`);
    if (!response.ok) throw new Error('Failed to fetch metrics');
    return response.json();
  },

  emit(eventName: string, payload: any) {
    if (legalConfig.dataMode === "mock") {
      console.log(`[Reporting Event] ${eventName}:`, payload);
      // In a real implementation, this would update aggregates
    } else {
      // Legacy: send to analytics endpoint
      fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventName, data: payload })
      }).catch(console.error);
    }
  }
};
