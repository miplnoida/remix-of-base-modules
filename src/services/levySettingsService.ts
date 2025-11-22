import {
  LevyScheme,
  PeriodThreshold,
  LevySlab,
  EmployeeCategory,
  EmployeeCategoryRule,
  PayComponentRule,
  BonusRule,
  LevyExemption,
  LevySimulatorInput,
  LevySimulatorOutput,
  LevySettingsAuditLog
} from '@/types/levySettings';

// Mock Data Storage
let levySchemes: LevyScheme[] = [
  {
    schemeId: 'SCH-2024-001',
    schemeName: 'HSDL 2024-2025',
    description: 'Housing & Social Development Levy - Current Policy',
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    isCurrent: true,
    status: 'Active',
    createdBy: 'admin.user',
    createdDate: '2023-12-15T10:00:00Z'
  },
  {
    schemeId: 'SCH-2023-001',
    schemeName: 'HSDL 2023',
    description: 'Housing & Social Development Levy - 2023 Policy',
    effectiveFrom: '2023-01-01',
    effectiveTo: '2023-12-31',
    isCurrent: false,
    status: 'Inactive',
    createdBy: 'admin.user',
    createdDate: '2022-12-10T10:00:00Z'
  }
];

let periodThresholds: PeriodThreshold[] = [
  {
    thresholdId: 'THR-2024-001',
    schemeId: 'SCH-2024-001',
    periodType: 'Weekly',
    employeeExemptionThreshold: 500,
    employerExemptBelowThreshold: true,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active'
  },
  {
    thresholdId: 'THR-2024-002',
    schemeId: 'SCH-2024-001',
    periodType: 'Monthly',
    employeeExemptionThreshold: 2000,
    employerExemptBelowThreshold: true,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active'
  }
];

let levySlabs: LevySlab[] = [
  {
    slabId: 'SLB-2024-001',
    schemeId: 'SCH-2024-001',
    periodType: 'Weekly',
    employeeCategory: null,
    minEarnings: 0,
    maxEarnings: 1000,
    employeeRatePercent: 2.5,
    employerRatePercent: 2.5,
    applyTo: 'EntireBase',
    priority: 1,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active'
  },
  {
    slabId: 'SLB-2024-002',
    schemeId: 'SCH-2024-001',
    periodType: 'Weekly',
    employeeCategory: null,
    minEarnings: 1000,
    maxEarnings: 5000,
    employeeRatePercent: 3.0,
    employerRatePercent: 3.0,
    applyTo: 'PortionAboveMin',
    priority: 2,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active'
  }
];

let employeeCategories: EmployeeCategory[] = [
  {
    categoryCode: 'STANDARD',
    categoryName: 'Standard Employee',
    description: 'Regular employees with standard levy rates',
    isDefault: true,
    status: 'Active'
  },
  {
    categoryCode: 'MIN_WAGE',
    categoryName: 'Minimum Wage',
    description: 'Employees earning minimum wage',
    isDefault: false,
    status: 'Active'
  },
  {
    categoryCode: 'GOVT',
    categoryName: 'Government Employee',
    description: 'Government sector employees',
    isDefault: false,
    status: 'Active'
  }
];

let employeeCategoryRules: EmployeeCategoryRule[] = [
  {
    ruleId: 'CAT-RULE-001',
    categoryCode: 'MIN_WAGE',
    minAge: null,
    maxAge: null,
    maritalStatus: 'Any',
    employmentType: ['MIN_WAGE'],
    customCondition: null,
    priority: 1,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active'
  },
  {
    ruleId: 'CAT-RULE-002',
    categoryCode: 'GOVT',
    minAge: null,
    maxAge: null,
    maritalStatus: 'Any',
    employmentType: ['GOVT'],
    customCondition: null,
    priority: 2,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active'
  }
];

let payComponentRules: PayComponentRule[] = [
  {
    componentRuleId: 'COMP-2024-001',
    schemeId: 'SCH-2024-001',
    componentCode: 'BASIC',
    componentName: 'Basic Salary',
    includeInLevyBase: true,
    employerOnly: false,
    specialCategory: 'Standard',
    baseAdjustmentType: 'None',
    separateEmployeeRate: null,
    separateEmployerRate: null,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active'
  },
  {
    componentRuleId: 'COMP-2024-002',
    schemeId: 'SCH-2024-001',
    componentCode: 'OT',
    componentName: 'Overtime',
    includeInLevyBase: true,
    employerOnly: false,
    specialCategory: 'Standard',
    baseAdjustmentType: 'None',
    separateEmployeeRate: null,
    separateEmployerRate: null,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active'
  },
  {
    componentRuleId: 'COMP-2024-003',
    schemeId: 'SCH-2024-001',
    componentCode: 'DEC_BONUS',
    componentName: 'December Bonus',
    includeInLevyBase: false,
    employerOnly: false,
    specialCategory: 'DecemberBonus',
    baseAdjustmentType: 'SeparateRateOverride',
    separateEmployeeRate: 8.0,
    separateEmployerRate: 0.0,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active'
  }
];

let bonusRules: BonusRule[] = [
  {
    bonusRuleId: 'BONUS-2024-001',
    schemeId: 'SCH-2024-001',
    appliesToComponentCode: 'DEC_BONUS',
    bonusMonth: 12,
    calendarYearFrom: 2024,
    calendarYearTo: null,
    averageWageThreshold: 1500,
    averageWagePeriod: 'YTD',
    employeeTreatment: 'RateOverride',
    employeeRateOverride: 8.0,
    employerTreatment: 'Exempt',
    employerRateOverride: null,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active',
    notes: 'Employee pays 8% levy on December bonus if average wage >= 1500'
  }
];

let levyExemptions: LevyExemption[] = [
  {
    exemptionId: 'EXE-2024-001',
    schemeId: 'SCH-2024-001',
    ruleName: 'Minimum Wage Employee Exemption',
    description: 'Employees earning below minimum wage threshold are exempt',
    appliesTo: 'EmployeeAndEmployer',
    minEarnings: null,
    maxEarnings: 500,
    employeeCategoryCode: 'MIN_WAGE',
    minimumWageFlag: true,
    conditionJson: null,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active'
  }
];

let auditLogs: LevySettingsAuditLog[] = [];

// Helper to generate audit log
const logAudit = (
  entityType: string,
  entityId: string,
  action: 'Create' | 'Update' | 'Delete' | 'Activate' | 'Deactivate',
  oldValues: any,
  newValues: any
) => {
  const log: LevySettingsAuditLog = {
    auditId: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    entityType,
    entityId,
    action,
    oldValues,
    newValues,
    userId: 'current-user',
    userName: 'Admin User',
    timestamp: new Date().toISOString()
  };
  auditLogs.push(log);
};

// ===== Levy Schemes CRUD =====
export const levySettingsService = {
  // Levy Schemes
  async getLevySchemes(filter?: { status?: string; dateRange?: [string, string] }): Promise<LevyScheme[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    let filtered = [...levySchemes];
    
    if (filter?.status && filter.status !== 'All') {
      if (filter.status === 'Current') {
        filtered = filtered.filter(s => s.isCurrent);
      } else {
        filtered = filtered.filter(s => s.status === filter.status);
      }
    }
    
    return filtered.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
  },

  async getLevyScheme(schemeId: string): Promise<LevyScheme | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return levySchemes.find(s => s.schemeId === schemeId) || null;
  },

  async createLevyScheme(scheme: Omit<LevyScheme, 'schemeId' | 'createdDate'>): Promise<LevyScheme> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newScheme: LevyScheme = {
      ...scheme,
      schemeId: `SCH-${Date.now()}`,
      createdDate: new Date().toISOString()
    };
    levySchemes.push(newScheme);
    logAudit('LevyScheme', newScheme.schemeId, 'Create', null, newScheme);
    return newScheme;
  },

  async updateLevyScheme(schemeId: string, updates: Partial<LevyScheme>): Promise<LevyScheme> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = levySchemes.findIndex(s => s.schemeId === schemeId);
    if (index === -1) throw new Error('Scheme not found');
    
    const oldScheme = { ...levySchemes[index] };
    levySchemes[index] = { 
      ...levySchemes[index], 
      ...updates,
      updatedDate: new Date().toISOString()
    };
    logAudit('LevyScheme', schemeId, 'Update', oldScheme, levySchemes[index]);
    return levySchemes[index];
  },

  async deleteLevyScheme(schemeId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const scheme = levySchemes.find(s => s.schemeId === schemeId);
    if (scheme) {
      logAudit('LevyScheme', schemeId, 'Delete', scheme, null);
      levySchemes = levySchemes.filter(s => s.schemeId !== schemeId);
    }
  },

  async cloneLevyScheme(schemeId: string, newName: string, newEffectiveFrom: string): Promise<LevyScheme> {
    await new Promise(resolve => setTimeout(resolve, 800));
    const original = levySchemes.find(s => s.schemeId === schemeId);
    if (!original) throw new Error('Scheme not found');
    
    const cloned: LevyScheme = {
      ...original,
      schemeId: `SCH-${Date.now()}`,
      schemeName: newName,
      effectiveFrom: newEffectiveFrom,
      effectiveTo: null,
      isCurrent: false,
      createdDate: new Date().toISOString()
    };
    levySchemes.push(cloned);
    logAudit('LevyScheme', cloned.schemeId, 'Create', null, cloned);
    return cloned;
  },

  // Period Thresholds
  async getPeriodThresholds(schemeId: string): Promise<PeriodThreshold[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return periodThresholds.filter(t => t.schemeId === schemeId);
  },

  async createPeriodThreshold(threshold: Omit<PeriodThreshold, 'thresholdId'>): Promise<PeriodThreshold> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newThreshold: PeriodThreshold = {
      ...threshold,
      thresholdId: `THR-${Date.now()}`
    };
    periodThresholds.push(newThreshold);
    logAudit('PeriodThreshold', newThreshold.thresholdId, 'Create', null, newThreshold);
    return newThreshold;
  },

  async updatePeriodThreshold(thresholdId: string, updates: Partial<PeriodThreshold>): Promise<PeriodThreshold> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = periodThresholds.findIndex(t => t.thresholdId === thresholdId);
    if (index === -1) throw new Error('Threshold not found');
    
    const old = { ...periodThresholds[index] };
    periodThresholds[index] = { ...periodThresholds[index], ...updates };
    logAudit('PeriodThreshold', thresholdId, 'Update', old, periodThresholds[index]);
    return periodThresholds[index];
  },

  async deletePeriodThreshold(thresholdId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const threshold = periodThresholds.find(t => t.thresholdId === thresholdId);
    if (threshold) {
      logAudit('PeriodThreshold', thresholdId, 'Delete', threshold, null);
      periodThresholds = periodThresholds.filter(t => t.thresholdId !== thresholdId);
    }
  },

  // Levy Slabs
  async getLevySlabs(schemeId: string): Promise<LevySlab[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return levySlabs.filter(s => s.schemeId === schemeId);
  },

  async createLevySlab(slab: Omit<LevySlab, 'slabId'>): Promise<LevySlab> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newSlab: LevySlab = {
      ...slab,
      slabId: `SLB-${Date.now()}`
    };
    levySlabs.push(newSlab);
    logAudit('LevySlab', newSlab.slabId, 'Create', null, newSlab);
    return newSlab;
  },

  async updateLevySlab(slabId: string, updates: Partial<LevySlab>): Promise<LevySlab> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = levySlabs.findIndex(s => s.slabId === slabId);
    if (index === -1) throw new Error('Slab not found');
    
    const old = { ...levySlabs[index] };
    levySlabs[index] = { ...levySlabs[index], ...updates };
    logAudit('LevySlab', slabId, 'Update', old, levySlabs[index]);
    return levySlabs[index];
  },

  async deleteLevySlab(slabId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const slab = levySlabs.find(s => s.slabId === slabId);
    if (slab) {
      logAudit('LevySlab', slabId, 'Delete', slab, null);
      levySlabs = levySlabs.filter(s => s.slabId !== slabId);
    }
  },

  // Employee Categories
  async getEmployeeCategories(): Promise<EmployeeCategory[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...employeeCategories];
  },

  async createEmployeeCategory(category: EmployeeCategory): Promise<EmployeeCategory> {
    await new Promise(resolve => setTimeout(resolve, 400));
    employeeCategories.push(category);
    logAudit('EmployeeCategory', category.categoryCode, 'Create', null, category);
    return category;
  },

  async updateEmployeeCategory(categoryCode: string, updates: Partial<EmployeeCategory>): Promise<EmployeeCategory> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = employeeCategories.findIndex(c => c.categoryCode === categoryCode);
    if (index === -1) throw new Error('Category not found');
    
    const old = { ...employeeCategories[index] };
    employeeCategories[index] = { ...employeeCategories[index], ...updates };
    logAudit('EmployeeCategory', categoryCode, 'Update', old, employeeCategories[index]);
    return employeeCategories[index];
  },

  async deleteEmployeeCategory(categoryCode: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const category = employeeCategories.find(c => c.categoryCode === categoryCode);
    if (category) {
      logAudit('EmployeeCategory', categoryCode, 'Delete', category, null);
      employeeCategories = employeeCategories.filter(c => c.categoryCode !== categoryCode);
    }
  },

  // Employee Category Rules
  async getEmployeeCategoryRules(categoryCode?: string): Promise<EmployeeCategoryRule[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (categoryCode) {
      return employeeCategoryRules.filter(r => r.categoryCode === categoryCode);
    }
    return [...employeeCategoryRules];
  },

  async createEmployeeCategoryRule(rule: Omit<EmployeeCategoryRule, 'ruleId'>): Promise<EmployeeCategoryRule> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newRule: EmployeeCategoryRule = {
      ...rule,
      ruleId: `CAT-RULE-${Date.now()}`
    };
    employeeCategoryRules.push(newRule);
    logAudit('EmployeeCategoryRule', newRule.ruleId, 'Create', null, newRule);
    return newRule;
  },

  async updateEmployeeCategoryRule(ruleId: string, updates: Partial<EmployeeCategoryRule>): Promise<EmployeeCategoryRule> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = employeeCategoryRules.findIndex(r => r.ruleId === ruleId);
    if (index === -1) throw new Error('Rule not found');
    
    const old = { ...employeeCategoryRules[index] };
    employeeCategoryRules[index] = { ...employeeCategoryRules[index], ...updates };
    logAudit('EmployeeCategoryRule', ruleId, 'Update', old, employeeCategoryRules[index]);
    return employeeCategoryRules[index];
  },

  async deleteEmployeeCategoryRule(ruleId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const rule = employeeCategoryRules.find(r => r.ruleId === ruleId);
    if (rule) {
      logAudit('EmployeeCategoryRule', ruleId, 'Delete', rule, null);
      employeeCategoryRules = employeeCategoryRules.filter(r => r.ruleId !== ruleId);
    }
  },

  // Pay Component Rules
  async getPayComponentRules(schemeId: string): Promise<PayComponentRule[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return payComponentRules.filter(r => r.schemeId === schemeId);
  },

  async createPayComponentRule(rule: Omit<PayComponentRule, 'componentRuleId'>): Promise<PayComponentRule> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newRule: PayComponentRule = {
      ...rule,
      componentRuleId: `COMP-${Date.now()}`
    };
    payComponentRules.push(newRule);
    logAudit('PayComponentRule', newRule.componentRuleId, 'Create', null, newRule);
    return newRule;
  },

  async updatePayComponentRule(ruleId: string, updates: Partial<PayComponentRule>): Promise<PayComponentRule> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = payComponentRules.findIndex(r => r.componentRuleId === ruleId);
    if (index === -1) throw new Error('Rule not found');
    
    const old = { ...payComponentRules[index] };
    payComponentRules[index] = { ...payComponentRules[index], ...updates };
    logAudit('PayComponentRule', ruleId, 'Update', old, payComponentRules[index]);
    return payComponentRules[index];
  },

  async deletePayComponentRule(ruleId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const rule = payComponentRules.find(r => r.componentRuleId === ruleId);
    if (rule) {
      logAudit('PayComponentRule', ruleId, 'Delete', rule, null);
      payComponentRules = payComponentRules.filter(r => r.componentRuleId !== ruleId);
    }
  },

  // Bonus Rules
  async getBonusRules(schemeId: string): Promise<BonusRule[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return bonusRules.filter(r => r.schemeId === schemeId);
  },

  async createBonusRule(rule: Omit<BonusRule, 'bonusRuleId'>): Promise<BonusRule> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newRule: BonusRule = {
      ...rule,
      bonusRuleId: `BONUS-${Date.now()}`
    };
    bonusRules.push(newRule);
    logAudit('BonusRule', newRule.bonusRuleId, 'Create', null, newRule);
    return newRule;
  },

  async updateBonusRule(ruleId: string, updates: Partial<BonusRule>): Promise<BonusRule> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = bonusRules.findIndex(r => r.bonusRuleId === ruleId);
    if (index === -1) throw new Error('Rule not found');
    
    const old = { ...bonusRules[index] };
    bonusRules[index] = { ...bonusRules[index], ...updates };
    logAudit('BonusRule', ruleId, 'Update', old, bonusRules[index]);
    return bonusRules[index];
  },

  async deleteBonusRule(ruleId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const rule = bonusRules.find(r => r.bonusRuleId === ruleId);
    if (rule) {
      logAudit('BonusRule', ruleId, 'Delete', rule, null);
      bonusRules = bonusRules.filter(r => r.bonusRuleId !== ruleId);
    }
  },

  // Levy Exemptions
  async getLevyExemptions(schemeId: string): Promise<LevyExemption[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return levyExemptions.filter(e => e.schemeId === schemeId);
  },

  async createLevyExemption(exemption: Omit<LevyExemption, 'exemptionId'>): Promise<LevyExemption> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newExemption: LevyExemption = {
      ...exemption,
      exemptionId: `EXE-${Date.now()}`
    };
    levyExemptions.push(newExemption);
    logAudit('LevyExemption', newExemption.exemptionId, 'Create', null, newExemption);
    return newExemption;
  },

  async updateLevyExemption(exemptionId: string, updates: Partial<LevyExemption>): Promise<LevyExemption> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = levyExemptions.findIndex(e => e.exemptionId === exemptionId);
    if (index === -1) throw new Error('Exemption not found');
    
    const old = { ...levyExemptions[index] };
    levyExemptions[index] = { ...levyExemptions[index], ...updates };
    logAudit('LevyExemption', exemptionId, 'Update', old, levyExemptions[index]);
    return levyExemptions[index];
  },

  async deleteLevyExemption(exemptionId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const exemption = levyExemptions.find(e => e.exemptionId === exemptionId);
    if (exemption) {
      logAudit('LevyExemption', exemptionId, 'Delete', exemption, null);
      levyExemptions = levyExemptions.filter(e => e.exemptionId !== exemptionId);
    }
  },

  // Levy Simulator
  async runLevySimulation(input: LevySimulatorInput): Promise<LevySimulatorOutput> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Get scheme (current if not specified)
    let scheme: LevyScheme;
    if (input.schemeId) {
      scheme = levySchemes.find(s => s.schemeId === input.schemeId)!;
    } else {
      scheme = levySchemes.find(s => s.isCurrent)!;
    }
    
    // Mock calculation logic
    const totalEarnings = input.earningsComponents.reduce((sum, c) => sum + c.amount, 0);
    
    return {
      schemeUsed: scheme,
      rulesApplied: {
        slabs: levySlabs.filter(s => s.schemeId === scheme.schemeId && s.periodType === input.periodType)
      },
      levyBaseBreakdown: input.earningsComponents.map(c => ({
        componentCode: c.componentCode,
        componentName: c.componentName,
        amount: c.amount,
        includedInBase: true,
        reason: 'Included in levy base per component rules'
      })),
      employeeCategoryResolved: 'STANDARD',
      categoryMatchReason: 'Default category applied',
      slabCalculations: [
        {
          slabId: 'SLB-2024-001',
          minEarnings: 0,
          maxEarnings: 1000,
          applicableEarnings: Math.min(totalEarnings, 1000),
          employeeRate: 2.5,
          employerRate: 2.5,
          employeeLevy: Math.min(totalEarnings, 1000) * 0.025,
          employerLevy: Math.min(totalEarnings, 1000) * 0.025
        }
      ],
      finalEmployeeLevy: totalEarnings * 0.025,
      finalEmployerLevy: totalEarnings * 0.025,
      totalLevy: totalEarnings * 0.05,
      exemptionsApplied: [],
      warnings: []
    };
  },

  // Audit Logs
  async getAuditLogs(filter?: { entityType?: string; dateRange?: [string, string] }): Promise<LevySettingsAuditLog[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    let filtered = [...auditLogs];
    
    if (filter?.entityType) {
      filtered = filtered.filter(log => log.entityType === filter.entityType);
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
};
