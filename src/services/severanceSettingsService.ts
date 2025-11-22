import {
  SeveranceScheme,
  SeveranceRateRule,
  SeveranceEarningsComponent,
  SeveranceCeiling,
  SeveranceDueDateRule,
  SeverancePenaltyRule,
  SeveranceExemption,
  SeveranceSettingsAuditLog,
} from '@/types/severanceSettings';

// Mock Data Storage
let mockSchemes: SeveranceScheme[] = [
  {
    schemeId: 'SEV_001',
    schemeName: 'Severance Scheme 2020-2024',
    description: 'Standard severance contribution scheme',
    effectiveFrom: '2020-01-01',
    effectiveTo: '2024-12-31',
    isCurrent: false,
    status: 'Active',
    createdBy: 'Admin',
    createdDate: '2020-01-01',
  },
  {
    schemeId: 'SEV_002',
    schemeName: 'Severance Scheme 2025+',
    description: 'Updated severance scheme with revised rates',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    isCurrent: true,
    status: 'Active',
    createdBy: 'Admin',
    createdDate: '2024-11-01',
  },
];

let mockRateRules: SeveranceRateRule[] = [
  {
    ruleId: 'SEVRATE_001',
    schemeId: 'SEV_002',
    employeeType: 'PERM',
    tenureFromMonths: 12,
    tenureToMonths: null,
    employeeRatePercent: 0,
    employerRatePercent: 2.5,
    vestingCondition: 'Eligible after 1 year of continuous service',
    appliesToComponents: 'Base Salary + Regular Allowances',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
];

let mockEarningsComponents: SeveranceEarningsComponent[] = [
  {
    componentId: 'SEVEARN_001',
    schemeId: 'SEV_002',
    componentCode: 'BASIC',
    componentName: 'Basic Salary',
    includeInSeveranceBase: true,
    includeInAverageEarnings: true,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
  {
    componentId: 'SEVEARN_002',
    schemeId: 'SEV_002',
    componentCode: 'BONUS',
    componentName: 'Annual Bonus',
    includeInSeveranceBase: false,
    includeInAverageEarnings: false,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
];

let mockCeilings: SeveranceCeiling[] = [
  {
    ceilingId: 'SEVCEIL_001',
    schemeId: 'SEV_002',
    employeeType: 'ALL',
    minimumServiceMonths: 12,
    maxServiceYears: 20,
    maxSeveranceBase: 10000,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
];

let mockDueDateRules: SeveranceDueDateRule[] = [
  {
    ruleId: 'SEVDUE_001',
    schemeId: 'SEV_002',
    contributorType: 'Employer',
    periodType: 'Monthly',
    dueDateExpression: 'End of month',
    gracePeriodDays: 15,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
];

let mockPenaltyRules: SeverancePenaltyRule[] = [
  {
    ruleId: 'SEVPEN_001',
    schemeId: 'SEV_002',
    penaltyBase: 'Severance contributions due',
    penaltyRateType: 'PercentPerMonth',
    penaltyRateValue: 2,
    interestApplicable: false,
    interestRate: null,
    interestBase: null,
    startAfterDaysLate: 0,
    maxPenaltyCap: 50,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
];

let mockExemptions: SeveranceExemption[] = [];

let auditLog: SeveranceSettingsAuditLog[] = [];

// Service Functions
export const severanceSettingsService = {
  // Schemes
  getSchemes: async (): Promise<SeveranceScheme[]> => mockSchemes,
  getScheme: async (id: string): Promise<SeveranceScheme | undefined> =>
    mockSchemes.find((s) => s.schemeId === id),
  createScheme: async (scheme: Omit<SeveranceScheme, 'schemeId' | 'createdDate'>): Promise<SeveranceScheme> => {
    const newScheme = {
      ...scheme,
      schemeId: `SEV_${Date.now()}`,
      createdDate: new Date().toISOString(),
    };
    mockSchemes.push(newScheme);
    auditLog.push({
      auditId: `AUDIT_${Date.now()}`,
      entityType: 'SeveranceScheme',
      entityId: newScheme.schemeId,
      action: 'Create',
      oldValues: null,
      newValues: newScheme,
      userId: 'current-user',
      userName: 'Current User',
      timestamp: new Date().toISOString(),
    });
    return newScheme;
  },
  updateScheme: async (id: string, updates: Partial<SeveranceScheme>): Promise<SeveranceScheme> => {
    const index = mockSchemes.findIndex((s) => s.schemeId === id);
    if (index === -1) throw new Error('Scheme not found');
    const oldScheme = { ...mockSchemes[index] };
    mockSchemes[index] = { ...mockSchemes[index], ...updates, updatedDate: new Date().toISOString() };
    auditLog.push({
      auditId: `AUDIT_${Date.now()}`,
      entityType: 'SeveranceScheme',
      entityId: id,
      action: 'Update',
      oldValues: oldScheme,
      newValues: mockSchemes[index],
      userId: 'current-user',
      userName: 'Current User',
      timestamp: new Date().toISOString(),
    });
    return mockSchemes[index];
  },
  deleteScheme: async (id: string): Promise<void> => {
    const scheme = mockSchemes.find((s) => s.schemeId === id);
    mockSchemes = mockSchemes.filter((s) => s.schemeId !== id);
    auditLog.push({
      auditId: `AUDIT_${Date.now()}`,
      entityType: 'SeveranceScheme',
      entityId: id,
      action: 'Delete',
      oldValues: scheme,
      newValues: null,
      userId: 'current-user',
      userName: 'Current User',
      timestamp: new Date().toISOString(),
    });
  },

  // Rate Rules
  getRateRules: async (schemeId: string): Promise<SeveranceRateRule[]> =>
    mockRateRules.filter((r) => r.schemeId === schemeId),
  createRateRule: async (rule: Omit<SeveranceRateRule, 'ruleId'>): Promise<SeveranceRateRule> => {
    const newRule = { ...rule, ruleId: `SEVRATE_${Date.now()}` };
    mockRateRules.push(newRule);
    return newRule;
  },
  updateRateRule: async (id: string, updates: Partial<SeveranceRateRule>): Promise<SeveranceRateRule> => {
    const index = mockRateRules.findIndex((r) => r.ruleId === id);
    if (index === -1) throw new Error('Rate rule not found');
    mockRateRules[index] = { ...mockRateRules[index], ...updates };
    return mockRateRules[index];
  },
  deleteRateRule: async (id: string): Promise<void> => {
    mockRateRules = mockRateRules.filter((r) => r.ruleId !== id);
  },

  // Earnings Components
  getEarningsComponents: async (schemeId: string): Promise<SeveranceEarningsComponent[]> =>
    mockEarningsComponents.filter((c) => c.schemeId === schemeId),
  createEarningsComponent: async (
    component: Omit<SeveranceEarningsComponent, 'componentId'>
  ): Promise<SeveranceEarningsComponent> => {
    const newComponent = { ...component, componentId: `SEVEARN_${Date.now()}` };
    mockEarningsComponents.push(newComponent);
    return newComponent;
  },
  updateEarningsComponent: async (
    id: string,
    updates: Partial<SeveranceEarningsComponent>
  ): Promise<SeveranceEarningsComponent> => {
    const index = mockEarningsComponents.findIndex((c) => c.componentId === id);
    if (index === -1) throw new Error('Component not found');
    mockEarningsComponents[index] = { ...mockEarningsComponents[index], ...updates };
    return mockEarningsComponents[index];
  },
  deleteEarningsComponent: async (id: string): Promise<void> => {
    mockEarningsComponents = mockEarningsComponents.filter((c) => c.componentId !== id);
  },

  // Ceilings
  getCeilings: async (schemeId: string): Promise<SeveranceCeiling[]> =>
    mockCeilings.filter((c) => c.schemeId === schemeId),
  createCeiling: async (ceiling: Omit<SeveranceCeiling, 'ceilingId'>): Promise<SeveranceCeiling> => {
    const newCeiling = { ...ceiling, ceilingId: `SEVCEIL_${Date.now()}` };
    mockCeilings.push(newCeiling);
    return newCeiling;
  },
  updateCeiling: async (id: string, updates: Partial<SeveranceCeiling>): Promise<SeveranceCeiling> => {
    const index = mockCeilings.findIndex((c) => c.ceilingId === id);
    if (index === -1) throw new Error('Ceiling not found');
    mockCeilings[index] = { ...mockCeilings[index], ...updates };
    return mockCeilings[index];
  },
  deleteCeiling: async (id: string): Promise<void> => {
    mockCeilings = mockCeilings.filter((c) => c.ceilingId !== id);
  },

  // Due Date Rules
  getDueDateRules: async (schemeId: string): Promise<SeveranceDueDateRule[]> =>
    mockDueDateRules.filter((r) => r.schemeId === schemeId),
  createDueDateRule: async (rule: Omit<SeveranceDueDateRule, 'ruleId'>): Promise<SeveranceDueDateRule> => {
    const newRule = { ...rule, ruleId: `SEVDUE_${Date.now()}` };
    mockDueDateRules.push(newRule);
    return newRule;
  },
  updateDueDateRule: async (id: string, updates: Partial<SeveranceDueDateRule>): Promise<SeveranceDueDateRule> => {
    const index = mockDueDateRules.findIndex((r) => r.ruleId === id);
    if (index === -1) throw new Error('Due date rule not found');
    mockDueDateRules[index] = { ...mockDueDateRules[index], ...updates };
    return mockDueDateRules[index];
  },
  deleteDueDateRule: async (id: string): Promise<void> => {
    mockDueDateRules = mockDueDateRules.filter((r) => r.ruleId !== id);
  },

  // Penalty Rules
  getPenaltyRules: async (schemeId: string): Promise<SeverancePenaltyRule[]> =>
    mockPenaltyRules.filter((r) => r.schemeId === schemeId),
  createPenaltyRule: async (rule: Omit<SeverancePenaltyRule, 'ruleId'>): Promise<SeverancePenaltyRule> => {
    const newRule = { ...rule, ruleId: `SEVPEN_${Date.now()}` };
    mockPenaltyRules.push(newRule);
    return newRule;
  },
  updatePenaltyRule: async (id: string, updates: Partial<SeverancePenaltyRule>): Promise<SeverancePenaltyRule> => {
    const index = mockPenaltyRules.findIndex((r) => r.ruleId === id);
    if (index === -1) throw new Error('Penalty rule not found');
    mockPenaltyRules[index] = { ...mockPenaltyRules[index], ...updates };
    return mockPenaltyRules[index];
  },
  deletePenaltyRule: async (id: string): Promise<void> => {
    mockPenaltyRules = mockPenaltyRules.filter((r) => r.ruleId !== id);
  },

  // Exemptions
  getExemptions: async (schemeId: string): Promise<SeveranceExemption[]> =>
    mockExemptions.filter((e) => e.schemeId === schemeId),
  createExemption: async (exemption: Omit<SeveranceExemption, 'exemptionId'>): Promise<SeveranceExemption> => {
    const newExemption = { ...exemption, exemptionId: `SEVEXE_${Date.now()}` };
    mockExemptions.push(newExemption);
    return newExemption;
  },
  updateExemption: async (id: string, updates: Partial<SeveranceExemption>): Promise<SeveranceExemption> => {
    const index = mockExemptions.findIndex((e) => e.exemptionId === id);
    if (index === -1) throw new Error('Exemption not found');
    mockExemptions[index] = { ...mockExemptions[index], ...updates };
    return mockExemptions[index];
  },
  deleteExemption: async (id: string): Promise<void> => {
    mockExemptions = mockExemptions.filter((e) => e.exemptionId !== id);
  },

  // Audit Log
  getAuditLog: async (): Promise<SeveranceSettingsAuditLog[]> => auditLog,
};
