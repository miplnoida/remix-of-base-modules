export interface DashboardFilters {
  dateRange: { start: string; end: string };
  caseTypes: string[];
  statuses: string[];
  officers: string[];
  searchTerm: string;
  year: number;
  month: number;
}

export interface KPIData {
  activeCases: number;
  newThisPeriod: { count: number; sparkline: number[] };
  financial: { owed: number; collected: number; outstanding: number };
  enforcementStage: { summons: number; jds: number; warrant: number; writ: number };
  postJudgmentRisk: number;
  hearingsThisMonth: number;
}

export interface CollectionsData {
  month: string;
  owed: number;
  collected: number;
  outstanding: number;
}

export interface ArrearsHeatmapCell {
  period: string;
  type: string;
  amount: number;
  topEmployers: string[];
}

export interface EnforcementFunnelData {
  stage: string;
  count: number;
  conversionRate: number;
  delta: number;
}

export interface WorkloadData {
  officer: string;
  openCases: number;
  hearingsAssigned: number;
  ordersPending: number;
}

export interface HearingCalendarDay {
  day: number;
  count: number;
  hearings: Array<{
    id: string;
    caseNumber: string;
    time: string;
    type: string;
    description: string;
    panel: string;
  }>;
}

export interface PostJudgmentCase {
  caseNumber: string;
  judgmentDate: string;
  dueBy: string;
  daysLeft: number;
  amountDue: number;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  type: 'doc' | 'status' | 'hearing' | 'note' | 'payment' | 'order';
  action: string;
  caseId: string;
  caseNumber: string;
}

const dataMode: 'mock' | 'legacy' = 'mock';

// Mock data generators
const generateMockKPIs = (filters: DashboardFilters): KPIData => {
  // Generate consistent financial data
  // Outstanding should always be higher than collected (collections reduce outstanding)
  const totalOwed = 4250000;
  const collectionRate = 0.51; // 51% collected
  const totalCollected = Math.round(totalOwed * collectionRate);
  const totalOutstanding = totalOwed - totalCollected;

  return {
    activeCases: 847,
    newThisPeriod: {
      count: 42,
      sparkline: [28, 35, 31, 38, 45, 42, 39, 44, 41, 38, 42, 42]
    },
    financial: {
      owed: totalOwed,
      collected: totalCollected,
      outstanding: totalOutstanding
    },
    enforcementStage: {
      summons: 124,
      jds: 87,
      warrant: 45,
      writ: 23
    },
    postJudgmentRisk: 17,
    hearingsThisMonth: 34
  };
};

const generateMockCollections = (): CollectionsData[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map((month, i) => {
    // Generate realistic legal case collection data
    // Outstanding should be higher than collected since collected comes from reducing outstanding
    const owed = 300000 + Math.random() * 150000;
    const collectionRate = 0.25 + Math.random() * 0.20; // 25-45% collection rate
    const collected = owed * collectionRate;
    const outstanding = owed - collected;
    
    return {
      month,
      owed: Math.round(owed),
      collected: Math.round(collected),
      outstanding: Math.round(outstanding)
    };
  });
};

const generateMockArrearsHeatmap = (): ArrearsHeatmapCell[] => {
  const periods = ['2024-09', '2024-10', '2024-11', '2024-12', '2025-01'];
  const types = ['Non-Payment', 'Late Filing', 'Under-Reporting', 'Administrative'];
  const cells: ArrearsHeatmapCell[] = [];
  
  periods.forEach(period => {
    types.forEach(type => {
      cells.push({
        period,
        type,
        amount: Math.random() * 500000,
        topEmployers: ['ABC Corp', 'XYZ Ltd', 'TechCo Inc']
      });
    });
  });
  
  return cells;
};

const generateMockEnforcementFunnel = (): EnforcementFunnelData[] => [
  { stage: 'Summons', count: 124, conversionRate: 100, delta: 5 },
  { stage: 'JDS', count: 87, conversionRate: 70, delta: -2 },
  { stage: 'Warrant', count: 45, conversionRate: 52, delta: 3 },
  { stage: 'Writ', count: 23, conversionRate: 51, delta: 1 }
];

const generateMockWorkload = (): WorkloadData[] => [
  { officer: 'J. Williams', openCases: 45, hearingsAssigned: 12, ordersPending: 8 },
  { officer: 'M. Thompson', openCases: 38, hearingsAssigned: 15, ordersPending: 5 },
  { officer: 'R. Martinez', openCases: 52, hearingsAssigned: 10, ordersPending: 12 },
  { officer: 'S. Johnson', openCases: 41, hearingsAssigned: 14, ordersPending: 6 },
  { officer: 'K. Davis', openCases: 35, hearingsAssigned: 9, ordersPending: 4 }
];

const generateMockHearingCalendar = (year: number, month: number): HearingCalendarDay[] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: HearingCalendarDay[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const count = Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0;
    const hearings = Array.from({ length: count }, (_, i) => ({
      id: `hearing-${day}-${i}`,
      caseNumber: `SSB-2025-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
      time: `${9 + Math.floor(Math.random() * 6)}:00 AM`,
      type: ['Status', 'Pre-Trial', 'Trial', 'Judgment'][Math.floor(Math.random() * 4)],
      description: 'Non-payment of contributions',
      panel: ['Panel A', 'Panel B', 'Panel C'][Math.floor(Math.random() * 3)]
    }));
    
    days.push({ day, count, hearings });
  }
  
  return days;
};

const generateMockPostJudgmentCases = (): PostJudgmentCase[] => {
  return Array.from({ length: 17 }, (_, i) => {
    const judgmentDate = new Date();
    judgmentDate.setDate(judgmentDate.getDate() - (14 - i - 3));
    const dueBy = new Date(judgmentDate);
    dueBy.setDate(dueBy.getDate() + 14);
    const daysLeft = Math.ceil((dueBy.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    return {
      caseNumber: `SSB-2025-${String(1000 + i).padStart(4, '0')}`,
      judgmentDate: judgmentDate.toISOString().split('T')[0],
      dueBy: dueBy.toISOString().split('T')[0],
      daysLeft,
      amountDue: 50000 + Math.random() * 200000
    };
  }).sort((a, b) => a.daysLeft - b.daysLeft);
};

const generateMockActivity = (): ActivityItem[] => {
  const types: ActivityItem['type'][] = ['doc', 'status', 'hearing', 'note', 'payment', 'order'];
  const actions = {
    doc: 'uploaded C3 statement',
    status: 'changed status to Warrant Issued',
    hearing: 'scheduled pre-trial hearing',
    note: 'added case note',
    payment: 'recorded payment of $12,500',
    order: 'published court order'
  };
  
  return Array.from({ length: 15 }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)];
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - (i * 30));
    
    return {
      id: `activity-${i}`,
      timestamp: timestamp.toISOString(),
      type,
      action: actions[type],
      caseId: `case-${i}`,
      caseNumber: `SSB-2025-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`
    };
  });
};

export const legalDashboardAdapter = {
  getKPIs: async (filters: DashboardFilters): Promise<KPIData> => {
    if (dataMode === 'mock') {
      return new Promise(resolve => setTimeout(() => resolve(generateMockKPIs(filters)), 500));
    }
    // Legacy API call would go here
    return generateMockKPIs(filters);
  },

  getCollectionsData: async (filters: DashboardFilters): Promise<CollectionsData[]> => {
    if (dataMode === 'mock') {
      return new Promise(resolve => setTimeout(() => resolve(generateMockCollections()), 500));
    }
    return generateMockCollections();
  },

  getArrearsHeatmap: async (filters: DashboardFilters): Promise<ArrearsHeatmapCell[]> => {
    if (dataMode === 'mock') {
      return new Promise(resolve => setTimeout(() => resolve(generateMockArrearsHeatmap()), 500));
    }
    return generateMockArrearsHeatmap();
  },

  getEnforcementFunnel: async (filters: DashboardFilters): Promise<EnforcementFunnelData[]> => {
    if (dataMode === 'mock') {
      return new Promise(resolve => setTimeout(() => resolve(generateMockEnforcementFunnel()), 500));
    }
    return generateMockEnforcementFunnel();
  },

  getWorkloadData: async (filters: DashboardFilters): Promise<WorkloadData[]> => {
    if (dataMode === 'mock') {
      return new Promise(resolve => setTimeout(() => resolve(generateMockWorkload()), 500));
    }
    return generateMockWorkload();
  },

  getHearingCalendar: async (filters: DashboardFilters): Promise<HearingCalendarDay[]> => {
    if (dataMode === 'mock') {
      return new Promise(resolve => 
        setTimeout(() => resolve(generateMockHearingCalendar(filters.year, filters.month)), 500)
      );
    }
    return generateMockHearingCalendar(filters.year, filters.month);
  },

  getPostJudgmentCases: async (filters: DashboardFilters): Promise<PostJudgmentCase[]> => {
    if (dataMode === 'mock') {
      return new Promise(resolve => setTimeout(() => resolve(generateMockPostJudgmentCases()), 500));
    }
    return generateMockPostJudgmentCases();
  },

  getRecentActivity: async (filters: DashboardFilters): Promise<ActivityItem[]> => {
    if (dataMode === 'mock') {
      return new Promise(resolve => setTimeout(() => resolve(generateMockActivity()), 500));
    }
    return generateMockActivity();
  },

  exportData: async (type: string, format: 'csv' | 'xlsx' | 'pdf', filters: DashboardFilters): Promise<void> => {
    // In mock mode, just show a toast
    return new Promise(resolve => setTimeout(() => {
      console.log(`Exporting ${type} as ${format} with filters:`, filters);
      resolve();
    }, 1000));
  }
};
