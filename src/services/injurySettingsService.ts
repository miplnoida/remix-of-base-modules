import {
  InjuryScheme,
  InjuryRateRule,
  InjuryEarningsComponent,
  InjuryCeiling,
  InjuryDueDateRule,
  InjuryPenaltyRule,
  InjuryBenefitParameter,
  InjurySettingsAuditLog,
} from '@/types/injurySettings';

// Mock Data Storage
let mockSchemes: InjuryScheme[] = [
  {
    schemeId: 'INJ_001',
    schemeName: 'Employment Injury Branch 2018-2024',
    description: 'Standard injury contribution scheme',
    effectiveFrom: '2018-01-01',
    effectiveTo: '2024-12-31',
    isCurrent: false,
    status: 'Active',
    createdBy: 'Admin',
    createdDate: '2018-01-01',
  },
  {
    schemeId: 'INJ_002',
    schemeName: 'Employment Injury Branch 2025+',
    description: 'Updated injury scheme with risk-based rates',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    isCurrent: true,
    status: 'Active',
    createdBy: 'Admin',
    createdDate: '2024-11-01',
  },
];

let mockRateRules: InjuryRateRule[] = [
  {
    ruleId: 'INJRATE_001',
    schemeId: 'INJ_002',
    employerCategory: 'Standard',
    industryCode: null,
    occupationClass: null,
    employeeRatePercent: 0,
    employerInjuryRatePercent: 1,
    minAge: 16,
    maxAge: null,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
    notes: 'Standard 1% employer contribution for all ages',
  },
  {
    ruleId: 'INJRATE_002',
    schemeId: 'INJ_002',
    employerCategory: 'HighRisk',
    industryCode: 'CONSTRUCTION',
    occupationClass: null,
    employeeRatePercent: 0,
    employerInjuryRatePercent: 2,
    minAge: null,
    maxAge: null,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
    notes: 'Higher rate for high-risk construction industry',
  },
];

let mockEarningsComponents: InjuryEarningsComponent[] = [
  {
    componentId: 'INJEARN_001',
    schemeId: 'INJ_002',
    componentCode: 'BASIC',
    componentName: 'Basic Salary',
    includeInInjuryBase: true,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
  {
    componentId: 'INJEARN_002',
    schemeId: 'INJ_002',
    componentCode: 'OVERTIME',
    componentName: 'Overtime Pay',
    includeInInjuryBase: true,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
];

let mockCeilings: InjuryCeiling[] = [
  {
    ceilingId: 'INJCEIL_001',
    schemeId: 'INJ_002',
    periodType: 'Monthly',
    ceilingAmount: 6500,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
    notes: 'Same as Social Security ceiling',
  },
];

let mockDueDateRules: InjuryDueDateRule[] = [
  {
    ruleId: 'INJDUE_001',
    schemeId: 'INJ_002',
    contributorType: 'Employer',
    periodType: 'Monthly',
    dueDateExpression: 'End of month',
    gracePeriodDays: 30,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
];

let mockPenaltyRules: InjuryPenaltyRule[] = [
  {
    ruleId: 'INJPEN_001',
    schemeId: 'INJ_002',
    penaltyBase: 'Injury contributions due',
    penaltyRateType: 'PercentPerMonth',
    penaltyRateValue: 5,
    interestApplicable: false,
    interestRate: null,
    interestBase: null,
    startAfterDaysLate: 0,
    maxPenaltyCap: 50,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
    notes: 'Aligned with Social Security penalty structure',
  },
];

let mockBenefitParameters: InjuryBenefitParameter[] = [
  {
    parameterId: 'INJBEN_001',
    schemeId: 'INJ_002',
    benefitType: 'TemporaryDisablement',
    parameterName: 'Wage Replacement Rate',
    parameterValue: '{"rate": 66.67, "maxDuration": 52, "unit": "weeks"}',
    description: '66.67% of average weekly earnings for up to 52 weeks',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
  {
    parameterId: 'INJBEN_002',
    schemeId: 'INJ_002',
    benefitType: 'MedicalExpenses',
    parameterName: 'Maximum Per Treatment',
    parameterValue: '{"maxAmount": 10000, "currency": "XCD"}',
    description: 'Maximum XCD 10,000 per approved medical treatment',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
];

let auditLog: InjurySettingsAuditLog[] = [];

// Service Functions
export const injurySettingsService = {
  // Schemes
  getSchemes: async (): Promise<InjuryScheme[]> => mockSchemes,
  getScheme: async (id: string): Promise<InjuryScheme | undefined> => mockSchemes.find((s) => s.schemeId === id),
  createScheme: async (scheme: Omit<InjuryScheme, 'schemeId' | 'createdDate'>): Promise<InjuryScheme> => {
    const newScheme = {
      ...scheme,
      schemeId: `INJ_${Date.now()}`,
      createdDate: new Date().toISOString(),
    };
    mockSchemes.push(newScheme);
    auditLog.push({
      auditId: `AUDIT_${Date.now()}`,
      entityType: 'InjuryScheme',
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
  updateScheme: async (id: string, updates: Partial<InjuryScheme>): Promise<InjuryScheme> => {
    const index = mockSchemes.findIndex((s) => s.schemeId === id);
    if (index === -1) throw new Error('Scheme not found');
    const oldScheme = { ...mockSchemes[index] };
    mockSchemes[index] = { ...mockSchemes[index], ...updates, updatedDate: new Date().toISOString() };
    auditLog.push({
      auditId: `AUDIT_${Date.now()}`,
      entityType: 'InjuryScheme',
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
      entityType: 'InjuryScheme',
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
  getRateRules: async (schemeId: string): Promise<InjuryRateRule[]> =>
    mockRateRules.filter((r) => r.schemeId === schemeId),
  createRateRule: async (rule: Omit<InjuryRateRule, 'ruleId'>): Promise<InjuryRateRule> => {
    const newRule = { ...rule, ruleId: `INJRATE_${Date.now()}` };
    mockRateRules.push(newRule);
    return newRule;
  },
  updateRateRule: async (id: string, updates: Partial<InjuryRateRule>): Promise<InjuryRateRule> => {
    const index = mockRateRules.findIndex((r) => r.ruleId === id);
    if (index === -1) throw new Error('Rate rule not found');
    mockRateRules[index] = { ...mockRateRules[index], ...updates };
    return mockRateRules[index];
  },
  deleteRateRule: async (id: string): Promise<void> => {
    mockRateRules = mockRateRules.filter((r) => r.ruleId !== id);
  },

  // Earnings Components
  getEarningsComponents: async (schemeId: string): Promise<InjuryEarningsComponent[]> =>
    mockEarningsComponents.filter((c) => c.schemeId === schemeId),
  createEarningsComponent: async (
    component: Omit<InjuryEarningsComponent, 'componentId'>
  ): Promise<InjuryEarningsComponent> => {
    const newComponent = { ...component, componentId: `INJEARN_${Date.now()}` };
    mockEarningsComponents.push(newComponent);
    return newComponent;
  },
  updateEarningsComponent: async (
    id: string,
    updates: Partial<InjuryEarningsComponent>
  ): Promise<InjuryEarningsComponent> => {
    const index = mockEarningsComponents.findIndex((c) => c.componentId === id);
    if (index === -1) throw new Error('Component not found');
    mockEarningsComponents[index] = { ...mockEarningsComponents[index], ...updates };
    return mockEarningsComponents[index];
  },
  deleteEarningsComponent: async (id: string): Promise<void> => {
    mockEarningsComponents = mockEarningsComponents.filter((c) => c.componentId !== id);
  },

  // Ceilings
  getCeilings: async (schemeId: string): Promise<InjuryCeiling[]> => mockCeilings.filter((c) => c.schemeId === schemeId),
  createCeiling: async (ceiling: Omit<InjuryCeiling, 'ceilingId'>): Promise<InjuryCeiling> => {
    const newCeiling = { ...ceiling, ceilingId: `INJCEIL_${Date.now()}` };
    mockCeilings.push(newCeiling);
    return newCeiling;
  },
  updateCeiling: async (id: string, updates: Partial<InjuryCeiling>): Promise<InjuryCeiling> => {
    const index = mockCeilings.findIndex((c) => c.ceilingId === id);
    if (index === -1) throw new Error('Ceiling not found');
    mockCeilings[index] = { ...mockCeilings[index], ...updates };
    return mockCeilings[index];
  },
  deleteCeiling: async (id: string): Promise<void> => {
    mockCeilings = mockCeilings.filter((c) => c.ceilingId !== id);
  },

  // Due Date Rules
  getDueDateRules: async (schemeId: string): Promise<InjuryDueDateRule[]> =>
    mockDueDateRules.filter((r) => r.schemeId === schemeId),
  createDueDateRule: async (rule: Omit<InjuryDueDateRule, 'ruleId'>): Promise<InjuryDueDateRule> => {
    const newRule = { ...rule, ruleId: `INJDUE_${Date.now()}` };
    mockDueDateRules.push(newRule);
    return newRule;
  },
  updateDueDateRule: async (id: string, updates: Partial<InjuryDueDateRule>): Promise<InjuryDueDateRule> => {
    const index = mockDueDateRules.findIndex((r) => r.ruleId === id);
    if (index === -1) throw new Error('Due date rule not found');
    mockDueDateRules[index] = { ...mockDueDateRules[index], ...updates };
    return mockDueDateRules[index];
  },
  deleteDueDateRule: async (id: string): Promise<void> => {
    mockDueDateRules = mockDueDateRules.filter((r) => r.ruleId !== id);
  },

  // Penalty Rules
  getPenaltyRules: async (schemeId: string): Promise<InjuryPenaltyRule[]> =>
    mockPenaltyRules.filter((r) => r.schemeId === schemeId),
  createPenaltyRule: async (rule: Omit<InjuryPenaltyRule, 'ruleId'>): Promise<InjuryPenaltyRule> => {
    const newRule = { ...rule, ruleId: `INJPEN_${Date.now()}` };
    mockPenaltyRules.push(newRule);
    return newRule;
  },
  updatePenaltyRule: async (id: string, updates: Partial<InjuryPenaltyRule>): Promise<InjuryPenaltyRule> => {
    const index = mockPenaltyRules.findIndex((r) => r.ruleId === id);
    if (index === -1) throw new Error('Penalty rule not found');
    mockPenaltyRules[index] = { ...mockPenaltyRules[index], ...updates };
    return mockPenaltyRules[index];
  },
  deletePenaltyRule: async (id: string): Promise<void> => {
    mockPenaltyRules = mockPenaltyRules.filter((r) => r.ruleId !== id);
  },

  // Benefit Parameters
  getBenefitParameters: async (schemeId: string): Promise<InjuryBenefitParameter[]> =>
    mockBenefitParameters.filter((p) => p.schemeId === schemeId),
  createBenefitParameter: async (
    param: Omit<InjuryBenefitParameter, 'parameterId'>
  ): Promise<InjuryBenefitParameter> => {
    const newParam = { ...param, parameterId: `INJBEN_${Date.now()}` };
    mockBenefitParameters.push(newParam);
    return newParam;
  },
  updateBenefitParameter: async (
    id: string,
    updates: Partial<InjuryBenefitParameter>
  ): Promise<InjuryBenefitParameter> => {
    const index = mockBenefitParameters.findIndex((p) => p.parameterId === id);
    if (index === -1) throw new Error('Benefit parameter not found');
    mockBenefitParameters[index] = { ...mockBenefitParameters[index], ...updates };
    return mockBenefitParameters[index];
  },
  deleteBenefitParameter: async (id: string): Promise<void> => {
    mockBenefitParameters = mockBenefitParameters.filter((p) => p.parameterId !== id);
  },

  // Audit Log
  getAuditLog: async (): Promise<InjurySettingsAuditLog[]> => auditLog,
};
