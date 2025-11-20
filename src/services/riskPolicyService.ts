import { RiskPolicy, RiskPolicyHistory, RiskBand, RiskBandName, AuditFrequency } from '@/types/riskPolicy';

// Mock Risk Policies
const MOCK_RISK_POLICIES: RiskPolicy[] = [
  {
    id: 'rp-001',
    policyId: 'RP-2024-001',
    policyName: '2024 Standard Risk Assessment Policy',
    description: 'Comprehensive risk assessment combining financial, compliance, and behavioral factors',
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'ACTIVE',
    isActive: true,
    applicableEmployerTypes: ['All Types'],
    applicableZones: ['All Zones'],
    updateFrequency: 'WEEKLY',
    factors: [
      {
        factorId: 'rf-001',
        factorCode: 'RF01',
        factorName: 'SSC Arrears Age',
        defaultWeight: 10,
        overrideWeight: 10,
        active: true
      },
      {
        factorId: 'rf-002',
        factorCode: 'RF02',
        factorName: 'LVC Arrears',
        defaultWeight: 7,
        overrideWeight: 9,
        active: true
      },
      {
        factorId: 'rf-003',
        factorCode: 'RF03',
        factorName: 'Penalty Overload',
        defaultWeight: 5,
        overrideWeight: 6,
        active: true
      },
      {
        factorId: 'rf-004',
        factorCode: 'RF04',
        factorName: 'Under-Reported Employees',
        defaultWeight: 8,
        overrideWeight: 8,
        active: true
      },
      {
        factorId: 'rf-005',
        factorCode: 'RF05',
        factorName: 'Payment Plan Breaches',
        defaultWeight: 6,
        overrideWeight: 7,
        active: true
      },
      {
        factorId: 'rf-006',
        factorCode: 'RF06',
        factorName: 'High-Risk Industry',
        defaultWeight: 4,
        overrideWeight: 4,
        active: true
      },
      {
        factorId: 'rf-009',
        factorCode: 'RF09',
        factorName: 'C3 Submission Delays',
        defaultWeight: 7,
        overrideWeight: 8,
        active: true
      },
      {
        factorId: 'rf-010',
        factorCode: 'RF10',
        factorName: 'Arrears Trend (Increasing)',
        defaultWeight: 9,
        overrideWeight: 10,
        active: true
      }
    ],
    createdDate: '2024-01-10T09:00:00Z',
    createdBy: 'admin.user',
    lastModified: '2024-01-10T09:00:00Z',
    lastModifiedBy: 'admin.user',
    activatedBy: 'admin.user',
    activatedDate: '2024-01-15T00:00:00Z'
  },
  {
    id: 'rp-002',
    policyId: 'RP-2023-001',
    policyName: '2023 Risk Assessment Policy',
    description: 'Previous year risk assessment policy (retired)',
    effectiveFrom: '2023-01-01',
    effectiveTo: '2023-12-31',
    status: 'RETIRED',
    isActive: false,
    applicableEmployerTypes: ['All Types'],
    applicableZones: ['All Zones'],
    updateFrequency: 'MONTHLY',
    factors: [
      {
        factorId: 'rf-001',
        factorCode: 'RF01',
        factorName: 'SSC Arrears Age',
        defaultWeight: 10,
        overrideWeight: 8,
        active: true
      },
      {
        factorId: 'rf-002',
        factorCode: 'RF02',
        factorName: 'LVC Arrears',
        defaultWeight: 7,
        overrideWeight: 7,
        active: true
      }
    ],
    createdDate: '2023-01-05T09:00:00Z',
    createdBy: 'admin.user',
    lastModified: '2023-12-31T23:59:59Z',
    lastModifiedBy: 'system',
    activatedBy: 'admin.user',
    activatedDate: '2023-01-15T00:00:00Z'
  }
];

// Mock Risk Bands
const MOCK_RISK_BANDS: RiskBand[] = [
  {
    id: 'rb-001',
    policyId: 'rp-001',
    bandName: RiskBandName.LOW,
    scoreRangeMin: 0,
    scoreRangeMax: 100,
    color: '#10B981', // green
    auditFrequency: AuditFrequency.RANDOM_3_YEAR,
    mandatoryAudit: false,
    autoSelectRule: {
      enabled: true,
      selectionType: 'RANDOM_PERCENTAGE',
      randomPercentage: 5
    },
    followUpIntensity: 'NORMAL',
    escalationRule: {
      enabled: false,
      monthsInBand: 0,
      action: 'MARK_READY_FOR_LEGAL'
    },
    createdDate: '2024-01-10T09:00:00Z',
    lastModified: '2024-01-10T09:00:00Z'
  },
  {
    id: 'rb-002',
    policyId: 'rp-001',
    bandName: RiskBandName.MEDIUM,
    scoreRangeMin: 101,
    scoreRangeMax: 250,
    color: '#F59E0B', // amber
    auditFrequency: AuditFrequency.EVERY_2_YEARS,
    mandatoryAudit: false,
    autoSelectRule: {
      enabled: true,
      selectionType: 'RANDOM_PERCENTAGE',
      randomPercentage: 15
    },
    followUpIntensity: 'MONITOR',
    escalationRule: {
      enabled: false,
      monthsInBand: 0,
      action: 'NOTIFY_SUPERVISOR'
    },
    createdDate: '2024-01-10T09:00:00Z',
    lastModified: '2024-01-10T09:00:00Z'
  },
  {
    id: 'rb-003',
    policyId: 'rp-001',
    bandName: RiskBandName.HIGH,
    scoreRangeMin: 251,
    scoreRangeMax: 400,
    color: '#EF4444', // red
    auditFrequency: AuditFrequency.YEARLY,
    mandatoryAudit: true,
    autoSelectRule: {
      enabled: true,
      selectionType: 'TOP_X_PER_ZONE',
      topCount: 10
    },
    followUpIntensity: 'ENFORCEMENT',
    escalationRule: {
      enabled: true,
      monthsInBand: 6,
      action: 'MANDATORY_AUDIT'
    },
    createdDate: '2024-01-10T09:00:00Z',
    lastModified: '2024-01-10T09:00:00Z'
  },
  {
    id: 'rb-004',
    policyId: 'rp-001',
    bandName: RiskBandName.CRITICAL,
    scoreRangeMin: 401,
    scoreRangeMax: 9999,
    color: '#DC2626', // dark red
    auditFrequency: AuditFrequency.SEMI_ANNUALLY,
    mandatoryAudit: true,
    autoSelectRule: {
      enabled: true,
      selectionType: 'ALL',
    },
    followUpIntensity: 'IMMEDIATE_REVIEW',
    escalationRule: {
      enabled: true,
      monthsInBand: 3,
      action: 'MARK_READY_FOR_LEGAL'
    },
    createdDate: '2024-01-10T09:00:00Z',
    lastModified: '2024-01-10T09:00:00Z'
  }
];

export const riskPolicyService = {
  async getPolicyHistory(): Promise<RiskPolicyHistory> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const activePolicy = MOCK_RISK_POLICIES.find(p => p.isActive) || null;
    
    return {
      policies: [...MOCK_RISK_POLICIES].sort((a, b) => 
        new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
      ),
      activePolicy
    };
  },

  async getActivePolicy(): Promise<RiskPolicy | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_RISK_POLICIES.find(p => p.isActive) || null;
  },

  async getPolicyById(id: string): Promise<RiskPolicy | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_RISK_POLICIES.find(p => p.id === id) || null;
  },

  async createPolicy(policy: Omit<RiskPolicy, 'id' | 'policyId' | 'createdDate' | 'lastModified' | 'isActive'>): Promise<RiskPolicy> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newPolicy: RiskPolicy = {
      ...policy,
      id: `rp-${Date.now()}`,
      policyId: `RP-${Date.now()}`,
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      isActive: false
    };
    
    MOCK_RISK_POLICIES.push(newPolicy);
    return newPolicy;
  },

  async updatePolicy(id: string, updates: Partial<RiskPolicy>): Promise<RiskPolicy> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const index = MOCK_RISK_POLICIES.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Policy not found');
    }
    
    MOCK_RISK_POLICIES[index] = {
      ...MOCK_RISK_POLICIES[index],
      ...updates,
      lastModified: new Date().toISOString()
    };
    
    return MOCK_RISK_POLICIES[index];
  },

  async activatePolicy(id: string, activatedBy: string): Promise<RiskPolicy> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Deactivate current active policy
    const currentActive = MOCK_RISK_POLICIES.find(p => p.isActive);
    if (currentActive) {
      currentActive.isActive = false;
      currentActive.status = 'RETIRED';
      currentActive.effectiveTo = new Date().toISOString();
    }
    
    // Activate new policy
    const index = MOCK_RISK_POLICIES.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Policy not found');
    }
    
    MOCK_RISK_POLICIES[index].isActive = true;
    MOCK_RISK_POLICIES[index].status = 'ACTIVE';
    MOCK_RISK_POLICIES[index].activatedBy = activatedBy;
    MOCK_RISK_POLICIES[index].activatedDate = new Date().toISOString();
    MOCK_RISK_POLICIES[index].lastModified = new Date().toISOString();
    
    return MOCK_RISK_POLICIES[index];
  },

  async getBandsForPolicy(policyId: string): Promise<RiskBand[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_RISK_BANDS.filter(b => b.policyId === policyId);
  },

  async updateBand(id: string, updates: Partial<RiskBand>): Promise<RiskBand> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = MOCK_RISK_BANDS.findIndex(b => b.id === id);
    if (index === -1) {
      throw new Error('Risk band not found');
    }
    
    MOCK_RISK_BANDS[index] = {
      ...MOCK_RISK_BANDS[index],
      ...updates,
      lastModified: new Date().toISOString()
    };
    
    return MOCK_RISK_BANDS[index];
  }
};
