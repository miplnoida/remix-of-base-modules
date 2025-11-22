// Social Security Settings Service - Mock CRUD Operations

import {
  SSContributionScheme,
  SSAgeBandRate,
  SSInsurableComponent,
  SSCeiling,
  SSDueDateRule,
  SSPenaltyRule,
  SSExemption,
  SSSettingsAuditLog,
  SSSchemeStatus
} from '@/types/ssSettings';

// Mock data stores
let schemes: SSContributionScheme[] = [
  {
    schemeId: 'SS-2024-001',
    schemeName: 'SS Main Scheme 2024+',
    description: 'Current Social Security contribution rules effective from January 2024',
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    isCurrent: true,
    status: 'Active',
    createdBy: 'admin',
    createdDate: '2024-01-01T00:00:00Z',
    notes: 'Aligned with Social Security Act updates'
  },
  {
    schemeId: 'SS-2020-001',
    schemeName: 'SS Main Scheme 2020-2023',
    description: 'Historical Social Security contribution rules',
    effectiveFrom: '2020-01-01',
    effectiveTo: '2023-12-31',
    isCurrent: false,
    status: 'Inactive',
    createdBy: 'admin',
    createdDate: '2020-01-01T00:00:00Z'
  }
];

let ageBandRates: SSAgeBandRate[] = [
  {
    rateBandId: 'ABR-001',
    schemeId: 'SS-2024-001',
    contributorType: 'Employed',
    ageFrom: 16,
    ageTo: 62,
    employeeRatePercent: 5,
    employerRatePercent: 5,
    injuryRatePercent: 1,
    appliesTo: ['MainScheme', 'EmploymentInjury'],
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active',
    notes: 'Standard employed contribution rates for age 16-62'
  },
  {
    rateBandId: 'ABR-002',
    schemeId: 'SS-2024-001',
    contributorType: 'Employed',
    ageFrom: 0,
    ageTo: 15,
    employeeRatePercent: 0,
    employerRatePercent: 0,
    injuryRatePercent: 1,
    appliesTo: ['EmploymentInjury'],
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active',
    notes: 'Under 16: only employment injury contribution'
  },
  {
    rateBandId: 'ABR-003',
    schemeId: 'SS-2024-001',
    contributorType: 'Employed',
    ageFrom: 63,
    ageTo: null,
    employeeRatePercent: 0,
    employerRatePercent: 0,
    injuryRatePercent: 1,
    appliesTo: ['EmploymentInjury'],
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active',
    notes: 'Over 62: only employment injury contribution'
  }
];

let insurableComponents: SSInsurableComponent[] = [
  {
    componentRuleId: 'IC-001',
    schemeId: 'SS-2024-001',
    componentCode: 'BASIC',
    componentName: 'Basic Salary',
    includeInInsurableEarnings: true,
    includeForSelfEmployed: true,
    includeForVoluntary: true,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active'
  },
  {
    componentRuleId: 'IC-002',
    schemeId: 'SS-2024-001',
    componentCode: 'OT',
    componentName: 'Overtime',
    includeInInsurableEarnings: true,
    includeForSelfEmployed: false,
    includeForVoluntary: false,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active'
  },
  {
    componentRuleId: 'IC-003',
    schemeId: 'SS-2024-001',
    componentCode: 'HOLIDAY',
    componentName: 'Holiday Pay',
    includeInInsurableEarnings: true,
    includeForSelfEmployed: false,
    includeForVoluntary: false,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active'
  },
  {
    componentRuleId: 'IC-004',
    schemeId: 'SS-2024-001',
    componentCode: 'BONUS',
    componentName: 'Bonus',
    includeInInsurableEarnings: true,
    includeForSelfEmployed: false,
    includeForVoluntary: false,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active'
  }
];

let ceilings: SSCeiling[] = [
  {
    ceilingId: 'CEIL-001',
    schemeId: 'SS-2024-001',
    periodType: 'Monthly',
    appliesTo: 'All',
    ceilingAmount: 6500,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active',
    notes: 'EC$6,500 per month ceiling for all contributions'
  }
];

let dueDateRules: SSDueDateRule[] = [
  {
    dueDateRuleId: 'DDR-001',
    schemeId: 'SS-2024-001',
    contributorType: 'Employed',
    periodType: 'Monthly',
    dueDateExpression: 'EndOfMonth',
    gracePeriodDays: 30,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active',
    notes: 'Due at end of month with 30-day grace period'
  }
];

let penaltyRules: SSPenaltyRule[] = [
  {
    penaltyRuleId: 'PEN-001',
    schemeId: 'SS-2024-001',
    contributorType: 'Employed',
    penaltyType: 'PercentPerMonth',
    penaltyRateValue: 5,
    interestApplicable: false,
    interestRatePercent: null,
    interestBase: 'PrincipalOnly',
    startAfterDaysLate: 0,
    minimumPenalty: null,
    maximumPenaltyPercent: null,
    maximumPenaltyAmount: null,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    status: 'Active',
    notes: '5% penalty per month late as per Social Security Act'
  }
];

let exemptions: SSExemption[] = [];

let auditLog: SSSettingsAuditLog[] = [];

// CRUD Operations - Schemes
export const getAllSchemes = (): SSContributionScheme[] => schemes;

export const getSchemeById = (schemeId: string): SSContributionScheme | undefined =>
  schemes.find(s => s.schemeId === schemeId);

export const createScheme = (scheme: Omit<SSContributionScheme, 'schemeId' | 'createdDate'>): SSContributionScheme => {
  const newScheme: SSContributionScheme = {
    ...scheme,
    schemeId: `SS-${Date.now()}`,
    createdDate: new Date().toISOString()
  };
  schemes.push(newScheme);
  
  logAudit('SSContributionScheme', newScheme.schemeId, 'Create', null, newScheme, scheme.createdBy);
  return newScheme;
};

export const updateScheme = (schemeId: string, updates: Partial<SSContributionScheme>, userId: string): SSContributionScheme | null => {
  const index = schemes.findIndex(s => s.schemeId === schemeId);
  if (index === -1) return null;
  
  const oldScheme = { ...schemes[index] };
  schemes[index] = {
    ...schemes[index],
    ...updates,
    updatedBy: userId,
    updatedDate: new Date().toISOString()
  };
  
  logAudit('SSContributionScheme', schemeId, 'Update', oldScheme, schemes[index], userId);
  return schemes[index];
};

export const deleteScheme = (schemeId: string, userId: string): boolean => {
  const index = schemes.findIndex(s => s.schemeId === schemeId);
  if (index === -1) return false;
  
  const oldScheme = schemes[index];
  schemes[index] = { ...schemes[index], status: 'Inactive' };
  logAudit('SSContributionScheme', schemeId, 'Deactivate', oldScheme, schemes[index], userId);
  return true;
};

// CRUD Operations - Age Band Rates
export const getAgeBandRatesByScheme = (schemeId: string): SSAgeBandRate[] =>
  ageBandRates.filter(r => r.schemeId === schemeId);

export const createAgeBandRate = (rate: Omit<SSAgeBandRate, 'rateBandId'>, userId: string): SSAgeBandRate => {
  const newRate: SSAgeBandRate = {
    ...rate,
    rateBandId: `ABR-${Date.now()}`
  };
  ageBandRates.push(newRate);
  logAudit('SSAgeBandRate', newRate.rateBandId, 'Create', null, newRate, userId);
  return newRate;
};

export const updateAgeBandRate = (rateBandId: string, updates: Partial<SSAgeBandRate>, userId: string): SSAgeBandRate | null => {
  const index = ageBandRates.findIndex(r => r.rateBandId === rateBandId);
  if (index === -1) return null;
  
  const oldRate = { ...ageBandRates[index] };
  ageBandRates[index] = { ...ageBandRates[index], ...updates };
  logAudit('SSAgeBandRate', rateBandId, 'Update', oldRate, ageBandRates[index], userId);
  return ageBandRates[index];
};

export const deleteAgeBandRate = (rateBandId: string, userId: string): boolean => {
  const index = ageBandRates.findIndex(r => r.rateBandId === rateBandId);
  if (index === -1) return false;
  
  const oldRate = ageBandRates[index];
  ageBandRates.splice(index, 1);
  logAudit('SSAgeBandRate', rateBandId, 'Delete', oldRate, null, userId);
  return true;
};

// CRUD Operations - Insurable Components
export const getInsurableComponentsByScheme = (schemeId: string): SSInsurableComponent[] =>
  insurableComponents.filter(c => c.schemeId === schemeId);

export const createInsurableComponent = (component: Omit<SSInsurableComponent, 'componentRuleId'>, userId: string): SSInsurableComponent => {
  const newComponent: SSInsurableComponent = {
    ...component,
    componentRuleId: `IC-${Date.now()}`
  };
  insurableComponents.push(newComponent);
  logAudit('SSInsurableComponent', newComponent.componentRuleId, 'Create', null, newComponent, userId);
  return newComponent;
};

export const updateInsurableComponent = (componentRuleId: string, updates: Partial<SSInsurableComponent>, userId: string): SSInsurableComponent | null => {
  const index = insurableComponents.findIndex(c => c.componentRuleId === componentRuleId);
  if (index === -1) return null;
  
  const oldComponent = { ...insurableComponents[index] };
  insurableComponents[index] = { ...insurableComponents[index], ...updates };
  logAudit('SSInsurableComponent', componentRuleId, 'Update', oldComponent, insurableComponents[index], userId);
  return insurableComponents[index];
};

export const deleteInsurableComponent = (componentRuleId: string, userId: string): boolean => {
  const index = insurableComponents.findIndex(c => c.componentRuleId === componentRuleId);
  if (index === -1) return false;
  
  const oldComponent = insurableComponents[index];
  insurableComponents.splice(index, 1);
  logAudit('SSInsurableComponent', componentRuleId, 'Delete', oldComponent, null, userId);
  return true;
};

// CRUD Operations - Ceilings
export const getCeilingsByScheme = (schemeId: string): SSCeiling[] =>
  ceilings.filter(c => c.schemeId === schemeId);

export const createCeiling = (ceiling: Omit<SSCeiling, 'ceilingId'>, userId: string): SSCeiling => {
  const newCeiling: SSCeiling = {
    ...ceiling,
    ceilingId: `CEIL-${Date.now()}`
  };
  ceilings.push(newCeiling);
  logAudit('SSCeiling', newCeiling.ceilingId, 'Create', null, newCeiling, userId);
  return newCeiling;
};

export const updateCeiling = (ceilingId: string, updates: Partial<SSCeiling>, userId: string): SSCeiling | null => {
  const index = ceilings.findIndex(c => c.ceilingId === ceilingId);
  if (index === -1) return null;
  
  const oldCeiling = { ...ceilings[index] };
  ceilings[index] = { ...ceilings[index], ...updates };
  logAudit('SSCeiling', ceilingId, 'Update', oldCeiling, ceilings[index], userId);
  return ceilings[index];
};

export const deleteCeiling = (ceilingId: string, userId: string): boolean => {
  const index = ceilings.findIndex(c => c.ceilingId === ceilingId);
  if (index === -1) return false;
  
  const oldCeiling = ceilings[index];
  ceilings.splice(index, 1);
  logAudit('SSCeiling', ceilingId, 'Delete', oldCeiling, null, userId);
  return true;
};

// CRUD Operations - Due Date Rules
export const getDueDateRulesByScheme = (schemeId: string): SSDueDateRule[] =>
  dueDateRules.filter(r => r.schemeId === schemeId);

export const createDueDateRule = (rule: Omit<SSDueDateRule, 'dueDateRuleId'>, userId: string): SSDueDateRule => {
  const newRule: SSDueDateRule = {
    ...rule,
    dueDateRuleId: `DDR-${Date.now()}`
  };
  dueDateRules.push(newRule);
  logAudit('SSDueDateRule', newRule.dueDateRuleId, 'Create', null, newRule, userId);
  return newRule;
};

export const updateDueDateRule = (dueDateRuleId: string, updates: Partial<SSDueDateRule>, userId: string): SSDueDateRule | null => {
  const index = dueDateRules.findIndex(r => r.dueDateRuleId === dueDateRuleId);
  if (index === -1) return null;
  
  const oldRule = { ...dueDateRules[index] };
  dueDateRules[index] = { ...dueDateRules[index], ...updates };
  logAudit('SSDueDateRule', dueDateRuleId, 'Update', oldRule, dueDateRules[index], userId);
  return dueDateRules[index];
};

export const deleteDueDateRule = (dueDateRuleId: string, userId: string): boolean => {
  const index = dueDateRules.findIndex(r => r.dueDateRuleId === dueDateRuleId);
  if (index === -1) return false;
  
  const oldRule = dueDateRules[index];
  dueDateRules.splice(index, 1);
  logAudit('SSDueDateRule', dueDateRuleId, 'Delete', oldRule, null, userId);
  return true;
};

// CRUD Operations - Penalty Rules
export const getPenaltyRulesByScheme = (schemeId: string): SSPenaltyRule[] =>
  penaltyRules.filter(r => r.schemeId === schemeId);

export const createPenaltyRule = (rule: Omit<SSPenaltyRule, 'penaltyRuleId'>, userId: string): SSPenaltyRule => {
  const newRule: SSPenaltyRule = {
    ...rule,
    penaltyRuleId: `PEN-${Date.now()}`
  };
  penaltyRules.push(newRule);
  logAudit('SSPenaltyRule', newRule.penaltyRuleId, 'Create', null, newRule, userId);
  return newRule;
};

export const updatePenaltyRule = (penaltyRuleId: string, updates: Partial<SSPenaltyRule>, userId: string): SSPenaltyRule | null => {
  const index = penaltyRules.findIndex(r => r.penaltyRuleId === penaltyRuleId);
  if (index === -1) return null;
  
  const oldRule = { ...penaltyRules[index] };
  penaltyRules[index] = { ...penaltyRules[index], ...updates };
  logAudit('SSPenaltyRule', penaltyRuleId, 'Update', oldRule, penaltyRules[index], userId);
  return penaltyRules[index];
};

export const deletePenaltyRule = (penaltyRuleId: string, userId: string): boolean => {
  const index = penaltyRules.findIndex(r => r.penaltyRuleId === penaltyRuleId);
  if (index === -1) return false;
  
  const oldRule = penaltyRules[index];
  penaltyRules.splice(index, 1);
  logAudit('SSPenaltyRule', penaltyRuleId, 'Delete', oldRule, null, userId);
  return true;
};

// CRUD Operations - Exemptions
export const getExemptionsByScheme = (schemeId: string): SSExemption[] =>
  exemptions.filter(e => e.schemeId === schemeId);

export const createExemption = (exemption: Omit<SSExemption, 'exemptionId'>, userId: string): SSExemption => {
  const newExemption: SSExemption = {
    ...exemption,
    exemptionId: `EXE-${Date.now()}`
  };
  exemptions.push(newExemption);
  logAudit('SSExemption', newExemption.exemptionId, 'Create', null, newExemption, userId);
  return newExemption;
};

export const updateExemption = (exemptionId: string, updates: Partial<SSExemption>, userId: string): SSExemption | null => {
  const index = exemptions.findIndex(e => e.exemptionId === exemptionId);
  if (index === -1) return null;
  
  const oldExemption = { ...exemptions[index] };
  exemptions[index] = { ...exemptions[index], ...updates };
  logAudit('SSExemption', exemptionId, 'Update', oldExemption, exemptions[index], userId);
  return exemptions[index];
};

export const deleteExemption = (exemptionId: string, userId: string): boolean => {
  const index = exemptions.findIndex(e => e.exemptionId === exemptionId);
  if (index === -1) return false;
  
  const oldExemption = exemptions[index];
  exemptions.splice(index, 1);
  logAudit('SSExemption', exemptionId, 'Delete', oldExemption, null, userId);
  return true;
};

// Audit Logging
const logAudit = (
  entityType: string,
  entityId: string,
  action: 'Create' | 'Update' | 'Delete' | 'Activate' | 'Deactivate',
  oldValues: any,
  newValues: any,
  userId: string
) => {
  const auditEntry: SSSettingsAuditLog = {
    auditId: `AUD-${Date.now()}-${Math.random()}`,
    entityType,
    entityId,
    action,
    oldValues,
    newValues,
    userId,
    userName: userId, // In real app, fetch from user service
    timestamp: new Date().toISOString()
  };
  auditLog.push(auditEntry);
};

export const getAuditLog = (): SSSettingsAuditLog[] => auditLog;
